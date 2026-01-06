import { NextRequest, NextResponse } from "next/server";
import { getMemberFromSession, getMemberAuthErrorMessage } from "@/lib/auth";
import prisma from "@/lib/db";
import {
  isValidSessionType,
  isValidSessionLocation,
  isValidSessionDuration,
  isValidProposedTime,
  MIN_ADVANCE_NOTICE_MS,
} from "@/lib/types/sessions";

// GET /api/member/sessions - Get member's session requests and confirmed sessions
export async function GET() {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    // Get assigned coach info
    const coachAssignment = await prisma.coachAssignment.findUnique({
      where: { memberId: authResult.memberId },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Get all session requests for member (both initiated by member and coach)
    const allRequests = await prisma.sessionRequest.findMany({
      where: {
        memberId: authResult.memberId,
        status: { in: ["pending", "countered"] },
      },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
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
        memberId: authResult.memberId,
        status: "confirmed",
        scheduledAt: { gte: new Date() },
      },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
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
        memberId: authResult.memberId,
        OR: [
          { status: "completed" },
          { status: "cancelled" },
          { status: "confirmed", scheduledAt: { lt: new Date() } },
        ],
        scheduledAt: { gte: thirtyDaysAgo },
      },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { scheduledAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      requests: allRequests,
      upcoming: upcomingSessions,
      past: pastSessions,
      coach: coachAssignment?.staff || null,
    });
  } catch (error) {
    console.error("Get member sessions error:", error);
    return NextResponse.json(
      { error: "Failed to get sessions" },
      { status: 500 }
    );
  }
}

// POST /api/member/sessions - Create a new session request
export async function POST(request: NextRequest) {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sessionType, proposedAt, duration, location, note } = body;

    // Validate required fields
    if (!sessionType || !proposedAt || !duration || !location) {
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

    // Check if member has an assigned coach
    const coachAssignment = await prisma.coachAssignment.findUnique({
      where: { memberId: authResult.memberId },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!coachAssignment) {
      return NextResponse.json(
        { error: "Morate imati dodeljenog trenera da biste zakazali termin" },
        { status: 400 }
      );
    }

    // Check for existing pending request with this coach
    const existingRequest = await prisma.sessionRequest.findFirst({
      where: {
        memberId: authResult.memberId,
        staffId: coachAssignment.staffId,
        status: { in: ["pending", "countered"] },
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: "Već imate aktivan zahtev za termin sa ovim trenerom" },
        { status: 400 }
      );
    }

    // Create session request and initial proposal in transaction
    const sessionRequest = await prisma.$transaction(async (tx) => {
      const request = await tx.sessionRequest.create({
        data: {
          staffId: coachAssignment.staffId,
          memberId: authResult.memberId,
          sessionType,
          proposedAt: proposedDate,
          duration,
          location,
          note: note || null,
          initiatedBy: "member",
          status: "pending",
          lastActionBy: "member",
          lastActionAt: new Date(),
        },
        include: {
          staff: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });

      // Create initial proposal in history
      await tx.sessionProposal.create({
        data: {
          sessionRequestId: request.id,
          proposedBy: "member",
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
