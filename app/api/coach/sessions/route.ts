import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import {
  isValidSessionType,
  isValidSessionLocation,
  isValidSessionDuration,
  isValidProposedTime,
} from "@/lib/types/sessions";
import { checkFeatureAccess } from "@/lib/subscription/guards";

// GET /api/coach/sessions - Get coach's session requests and confirmed sessions
export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify this is a coach
    const coach = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true },
    });

    if (!coach || coach.role.toLowerCase() !== "coach") {
      return NextResponse.json(
        { error: "Samo treneri mogu pristupiti terminima" },
        { status: 403 }
      );
    }

    // Check tier access for session scheduling feature
    const featureCheck = await checkFeatureAccess(session.gymId, "sessionScheduling");
    if (!featureCheck.allowed) {
      return NextResponse.json(
        {
          error: featureCheck.error,
          code: "TIER_REQUIRED",
          requiredTier: featureCheck.requiredTier,
          currentTier: featureCheck.tier,
        },
        { status: 403 }
      );
    }

    // Get assigned members
    const assignments = await prisma.coachAssignment.findMany({
      where: { staffId: session.userId },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Get all session requests for coach (both initiated by coach and member)
    const allRequests = await prisma.sessionRequest.findMany({
      where: {
        staffId: session.userId,
        status: { in: ["pending", "countered"] },
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            memberId: true,
          },
        },
        proposalHistory: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { lastActionAt: "desc" },
    });

    // Get upcoming confirmed sessions
    const upcomingSessions = await prisma.scheduledSession.findMany({
      where: {
        staffId: session.userId,
        status: "confirmed",
        scheduledAt: { gte: new Date() },
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            memberId: true,
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    // Get past sessions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const pastSessions = await prisma.scheduledSession.findMany({
      where: {
        staffId: session.userId,
        OR: [
          { status: "completed" },
          { status: "cancelled" },
          { status: "confirmed", scheduledAt: { lt: new Date() } },
        ],
        scheduledAt: { gte: thirtyDaysAgo },
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            memberId: true,
          },
        },
      },
      orderBy: { scheduledAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      requests: allRequests,
      upcoming: upcomingSessions,
      past: pastSessions,
      members: assignments.map((a) => a.member),
    });
  } catch (error) {
    console.error("Get coach sessions error:", error);
    return NextResponse.json(
      { error: "Failed to get sessions" },
      { status: 500 }
    );
  }
}

// POST /api/coach/sessions - Create a new session request for a member
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify this is a coach
    const coach = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, name: true },
    });

    if (!coach || coach.role.toLowerCase() !== "coach") {
      return NextResponse.json(
        { error: "Samo treneri mogu zakazivati termine" },
        { status: 403 }
      );
    }

    // Check tier access for session scheduling feature
    const featureCheck = await checkFeatureAccess(session.gymId, "sessionScheduling");
    if (!featureCheck.allowed) {
      return NextResponse.json(
        {
          error: featureCheck.error,
          code: "TIER_REQUIRED",
          requiredTier: featureCheck.requiredTier,
          currentTier: featureCheck.tier,
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { memberId, sessionType, proposedAt, duration, location, note } = body;

    // Validate required fields
    if (!memberId || !sessionType || !proposedAt || !duration || !location) {
      return NextResponse.json(
        { error: "Nedostaju obavezna polja" },
        { status: 400 }
      );
    }

    // Validate session type
    if (!isValidSessionType(sessionType)) {
      return NextResponse.json(
        { error: "Nevažeći tip termina" },
        { status: 400 }
      );
    }

    // Validate location
    if (!isValidSessionLocation(location)) {
      return NextResponse.json(
        { error: "Nevažeća lokacija" },
        { status: 400 }
      );
    }

    // Validate duration
    if (!isValidSessionDuration(duration)) {
      return NextResponse.json(
        { error: "Nevažeće trajanje. Izaberite 30, 45, 60 ili 90 minuta" },
        { status: 400 }
      );
    }

    // Validate proposed time (must be at least 24 hours in future)
    const proposedDate = new Date(proposedAt);
    if (!isValidProposedTime(proposedDate)) {
      return NextResponse.json(
        { error: "Termin mora biti zakazan najmanje 24 sata unapred" },
        { status: 400 }
      );
    }

    // Verify coach is assigned to this member
    const assignment = await prisma.coachAssignment.findFirst({
      where: {
        staffId: session.userId,
        memberId,
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Možete zakazivati termine samo sa dodeljenim članovima" },
        { status: 403 }
      );
    }

    // Check for existing pending request with this member
    const existingRequest = await prisma.sessionRequest.findFirst({
      where: {
        staffId: session.userId,
        memberId,
        status: { in: ["pending", "countered"] },
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: "Već imate aktivan zahtev za termin sa ovim članom" },
        { status: 400 }
      );
    }

    // Create session request and initial proposal in transaction
    const sessionRequest = await prisma.$transaction(async (tx) => {
      const request = await tx.sessionRequest.create({
        data: {
          staffId: session.userId,
          memberId,
          sessionType,
          proposedAt: proposedDate,
          duration,
          location,
          note: note || null,
          initiatedBy: "coach",
          status: "pending",
          lastActionBy: "coach",
          lastActionAt: new Date(),
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              memberId: true,
            },
          },
        },
      });

      // Create initial proposal in history
      await tx.sessionProposal.create({
        data: {
          sessionRequestId: request.id,
          proposedBy: "coach",
          proposedAt: proposedDate,
          duration,
          location,
          note: note || null,
        },
      });

      return request;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Zahtev za termin je poslat",
        request: sessionRequest,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create session request error:", error);
    return NextResponse.json(
      { error: "Greška pri kreiranju zahteva za termin" },
      { status: 500 }
    );
  }
}
