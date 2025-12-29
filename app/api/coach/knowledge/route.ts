import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { isValidAgentType, AGENT_DEFAULT_TEMPLATES } from "@/lib/ai/agents";

// GET - Get coach's knowledge for a specific member
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get memberId from query params
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId is required" },
        { status: 400 }
      );
    }

    // Verify this coach is assigned to this member
    const assignment = await prisma.coachAssignment.findFirst({
      where: {
        staffId: session.userId,
        memberId,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Not assigned to this member" },
        { status: 403 }
      );
    }

    // Get all coach knowledge entries for this member
    const knowledge = await prisma.coachKnowledge.findMany({
      where: {
        staffId: session.userId,
        memberId,
      },
    });

    // Transform to object keyed by agent type
    const result = {
      nutrition: knowledge.find((k) => k.agentType === "nutrition")?.content || null,
      supplements: knowledge.find((k) => k.agentType === "supplements")?.content || null,
      training: knowledge.find((k) => k.agentType === "training")?.content || null,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get coach knowledge error:", error);
    return NextResponse.json(
      { error: "Failed to get coach knowledge" },
      { status: 500 }
    );
  }
}

// POST - Create or update knowledge for a specific member and agent type
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { memberId, agentType, content } = body;

    // Validate memberId
    if (!memberId) {
      return NextResponse.json(
        { error: "memberId is required" },
        { status: 400 }
      );
    }

    // Validate agent type
    if (!agentType || !isValidAgentType(agentType)) {
      return NextResponse.json(
        { error: "Invalid agent type" },
        { status: 400 }
      );
    }

    // Validate content (max 2000 characters)
    if (typeof content !== "string" || content.length > 2000) {
      return NextResponse.json(
        { error: "Content must be a string with max 2000 characters" },
        { status: 400 }
      );
    }

    // Verify this coach is assigned to this member
    const assignment = await prisma.coachAssignment.findFirst({
      where: {
        staffId: session.userId,
        memberId,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Not assigned to this member" },
        { status: 403 }
      );
    }

    // If content is empty, delete the entry
    if (!content.trim()) {
      await prisma.coachKnowledge.deleteMany({
        where: {
          staffId: session.userId,
          memberId,
          agentType,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Knowledge deleted",
      });
    }

    // Upsert the knowledge entry
    const knowledge = await prisma.coachKnowledge.upsert({
      where: {
        staffId_memberId_agentType: {
          staffId: session.userId,
          memberId,
          agentType,
        },
      },
      create: {
        staffId: session.userId,
        memberId,
        agentType,
        content: content.trim(),
      },
      update: {
        content: content.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      knowledge,
    });
  } catch (error) {
    console.error("Update coach knowledge error:", error);
    return NextResponse.json(
      { error: "Failed to update coach knowledge" },
      { status: 500 }
    );
  }
}

// GET default templates endpoint
export async function OPTIONS() {
  return NextResponse.json({
    templates: AGENT_DEFAULT_TEMPLATES,
  });
}
