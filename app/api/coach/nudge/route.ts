import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

// Pre-defined nudge templates (coach can also write custom)
export const NUDGE_TEMPLATES = [
  {
    id: "comeback",
    label: "Povratak",
    message: "Vidim da si malo ispao iz ritma — javi ako treba pomoć! 💪",
  },
  {
    id: "great_week",
    label: "Odlična nedelja",
    message: "Super nedelja! 👏 Nastavi ovako.",
  },
  {
    id: "focus_training",
    label: "Fokus na trening",
    message: "Hajde da se fokusiramo na trening sledećih par dana. 🏋️",
  },
  {
    id: "checkin_reminder",
    label: "Podsetnik za pregled",
    message: "Nemoj zaboraviti nedeljni pregled — važno je za praćenje napretka! 📊",
  },
  {
    id: "protein_focus",
    label: "Proteini",
    message: "Pokušaj da uneseš više proteina ove nedelje — ključno je za tvoj cilj. 🥩",
  },
];

// POST - Send a nudge
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { memberId, message, templateId } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 }
      );
    }

    // Get message from template or custom
    let nudgeMessage = message;
    if (templateId && !message) {
      const template = NUDGE_TEMPLATES.find(t => t.id === templateId);
      if (template) {
        nudgeMessage = template.message;
      }
    }

    if (!nudgeMessage) {
      return NextResponse.json(
        { error: "Message or template is required" },
        { status: 400 }
      );
    }

    // Verify member exists and belongs to same gym
    const member = await prisma.member.findFirst({
      where: {
        id: memberId,
        gymId: session.gymId,
      },
      select: { id: true, name: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // For coaches, verify they're assigned to this member
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (staff?.role.toLowerCase() === "coach") {
      const assignment = await prisma.coachAssignment.findUnique({
        where: { memberId },
      });

      if (!assignment || assignment.staffId !== session.userId) {
        return NextResponse.json(
          { error: "Not assigned to this member" },
          { status: 403 }
        );
      }
    }

    // Create the nudge
    const nudge = await prisma.coachNudge.create({
      data: {
        staffId: session.userId,
        memberId,
        message: nudgeMessage,
      },
      select: {
        id: true,
        message: true,
        createdAt: true,
        member: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      nudge: {
        id: nudge.id,
        message: nudge.message,
        memberName: nudge.member.name,
        createdAt: nudge.createdAt,
      },
    });
  } catch (error) {
    console.error("Send nudge error:", error);
    return NextResponse.json(
      { error: "Failed to send nudge" },
      { status: 500 }
    );
  }
}

// GET - Get sent nudges (for coach) or templates
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    // If requesting templates only
    if (searchParams.get("templates") === "true") {
      return NextResponse.json({ templates: NUDGE_TEMPLATES });
    }

    // Get nudges sent by this staff member
    const nudges = await prisma.coachNudge.findMany({
      where: {
        staffId: session.userId,
        ...(memberId ? { memberId } : {}),
      },
      select: {
        id: true,
        message: true,
        createdAt: true,
        seenAt: true,
        member: {
          select: {
            id: true,
            name: true,
            memberId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ nudges, templates: NUDGE_TEMPLATES });
  } catch (error) {
    console.error("Get nudges error:", error);
    return NextResponse.json(
      { error: "Failed to get nudges" },
      { status: 500 }
    );
  }
}
