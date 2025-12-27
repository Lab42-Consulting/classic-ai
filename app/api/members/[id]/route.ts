import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { calculateDailyTargets, calculateStreak, Goal } from "@/lib/calculations";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const member = await prisma.member.findUnique({
      where: { id, gymId: session.gymId },
      include: {
        weeklyCheckins: {
          orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
          take: 8,
        },
        aiSummaries: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentLogs = await prisma.dailyLog.findMany({
      where: {
        memberId: id,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true, type: true },
    });

    const targets = calculateDailyTargets(
      member.weight || 70,
      member.goal as Goal
    );

    const streak = calculateStreak(recentLogs.map((l) => l.createdAt));

    const activitySummary = {
      totalLogs: recentLogs.length,
      mealLogs: recentLogs.filter((l) => l.type === "meal").length,
      trainingLogs: recentLogs.filter((l) => l.type === "training").length,
      waterLogs: recentLogs.filter((l) => l.type === "water").length,
    };

    const notes = await prisma.staffNote.findMany({
      where: { memberId: id },
      include: { staff: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      member: {
        id: member.id,
        memberId: member.memberId,
        name: member.name,
        goal: member.goal,
        weight: member.weight,
        height: member.height,
        status: member.status,
        createdAt: member.createdAt,
      },
      targets,
      streak,
      activitySummary,
      weeklyCheckins: member.weeklyCheckins,
      aiSummaries: member.aiSummaries,
      notes,
    });
  } catch (error) {
    console.error("Get member error:", error);
    return NextResponse.json(
      { error: "Failed to get member" },
      { status: 500 }
    );
  }
}
