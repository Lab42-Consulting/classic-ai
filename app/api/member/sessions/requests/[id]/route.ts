import { NextRequest, NextResponse } from "next/server";
import { getMemberFromSession, getMemberAuthErrorMessage } from "@/lib/auth";
import prisma from "@/lib/db";
import {
  isValidSessionLocation,
  isValidSessionDuration,
  isValidProposedTime,
} from "@/lib/types/sessions";

// POST /api/member/sessions/requests/[id] - Accept, counter, or decline a session request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { action, proposedAt, duration, location, note } = body;

    // Validate action
    if (!action || !["accept", "counter", "decline"].includes(action)) {
      return NextResponse.json(
        { error: "Nevažeća akcija. Koristite 'accept', 'counter' ili 'decline'" },
        { status: 400 }
      );
    }

    // Get the session request
    const sessionRequest = await prisma.sessionRequest.findFirst({
      where: {
        id,
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
          take: 1,
        },
      },
    });

    if (!sessionRequest) {
      return NextResponse.json(
        { error: "Zahtev za termin nije pronađen ili je već obrađen" },
        { status: 404 }
      );
    }

    // Check if it's member's turn to respond
    if (sessionRequest.lastActionBy === "member") {
      return NextResponse.json(
        { error: "Čeka se odgovor trenera" },
        { status: 400 }
      );
    }

    // Handle decline
    if (action === "decline") {
      await prisma.$transaction(async (tx) => {
        // Update request status
        await tx.sessionRequest.update({
          where: { id },
          data: {
            status: "declined",
            lastActionBy: "member",
            lastActionAt: new Date(),
          },
        });

        // Update last proposal response
        if (sessionRequest.proposalHistory[0]) {
          await tx.sessionProposal.update({
            where: { id: sessionRequest.proposalHistory[0].id },
            data: {
              response: "declined",
              responseAt: new Date(),
            },
          });
        }
      });

      return NextResponse.json({
        success: true,
        action: "declined",
        message: "Zahtev za termin je odbijen",
      });
    }

    // Handle accept
    if (action === "accept") {
      const result = await prisma.$transaction(async (tx) => {
        // Update request status
        await tx.sessionRequest.update({
          where: { id },
          data: {
            status: "accepted",
            lastActionBy: "member",
            lastActionAt: new Date(),
          },
        });

        // Update last proposal response
        if (sessionRequest.proposalHistory[0]) {
          await tx.sessionProposal.update({
            where: { id: sessionRequest.proposalHistory[0].id },
            data: {
              response: "accepted",
              responseAt: new Date(),
            },
          });
        }

        // Create confirmed session
        const session = await tx.scheduledSession.create({
          data: {
            staffId: sessionRequest.staffId,
            memberId: sessionRequest.memberId,
            sessionType: sessionRequest.sessionType,
            scheduledAt: sessionRequest.proposedAt,
            duration: sessionRequest.duration,
            location: sessionRequest.location,
            note: sessionRequest.note,
            originalRequestId: sessionRequest.id,
            status: "confirmed",
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

        return session;
      });

      return NextResponse.json({
        success: true,
        action: "accepted",
        message: "Termin je potvrđen",
        session: result,
      });
    }

    // Handle counter-proposal
    if (action === "counter") {
      // Validate counter-proposal fields
      if (!proposedAt || !duration || !location) {
        return NextResponse.json(
          { error: "Nedostaju podaci za predlog novog termina" },
          { status: 400 }
        );
      }

      if (!isValidSessionLocation(location)) {
        return NextResponse.json(
          { error: "Nevažeća lokacija" },
          { status: 400 }
        );
      }

      if (!isValidSessionDuration(duration)) {
        return NextResponse.json(
          { error: "Nevažeće trajanje" },
          { status: 400 }
        );
      }

      const proposedDate = new Date(proposedAt);
      if (!isValidProposedTime(proposedDate)) {
        return NextResponse.json(
          { error: "Termin mora biti zakazan najmanje 24 sata unapred" },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        // Update request with new proposal
        await tx.sessionRequest.update({
          where: { id },
          data: {
            proposedAt: proposedDate,
            duration,
            location,
            note: note || sessionRequest.note,
            status: "countered",
            counterCount: { increment: 1 },
            lastActionBy: "member",
            lastActionAt: new Date(),
          },
        });

        // Update previous proposal response
        if (sessionRequest.proposalHistory[0]) {
          await tx.sessionProposal.update({
            where: { id: sessionRequest.proposalHistory[0].id },
            data: {
              response: "countered",
              responseAt: new Date(),
            },
          });
        }

        // Create new proposal in history
        await tx.sessionProposal.create({
          data: {
            sessionRequestId: id,
            proposedBy: "member",
            proposedAt: proposedDate,
            duration,
            location,
            note: note || null,
          },
        });
      });

      return NextResponse.json({
        success: true,
        action: "countered",
        message: "Predlog novog termina je poslat",
      });
    }

    return NextResponse.json(
      { error: "Nepoznata akcija" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Process session request error:", error);
    return NextResponse.json(
      { error: "Greška pri obradi zahteva za termin" },
      { status: 500 }
    );
  }
}
