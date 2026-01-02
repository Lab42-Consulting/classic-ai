import { NextRequest, NextResponse } from "next/server";
import { getSession, generateMemberId, generatePin, hashPin } from "@/lib/auth";
import prisma from "@/lib/db";
import QRCode from "qrcode";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, height, weight, gender, goal } = body;

    if (!name || !goal) {
      return NextResponse.json(
        { error: "Name and goal are required" },
        { status: 400 }
      );
    }

    if (!["fat_loss", "muscle_gain", "recomposition"].includes(goal)) {
      return NextResponse.json(
        { error: "Invalid goal" },
        { status: 400 }
      );
    }

    let memberId = generateMemberId();
    let existing = await prisma.member.findFirst({
      where: { memberId, gymId: session.gymId }
    });
    while (existing) {
      memberId = generateMemberId();
      existing = await prisma.member.findFirst({
        where: { memberId, gymId: session.gymId }
      });
    }

    const pin = generatePin();
    const hashedPin = await hashPin(pin);

    const qrData = JSON.stringify({ memberId, gym: session.gymId });
    const qrCode = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });

    const member = await prisma.member.create({
      data: {
        memberId,
        pin: hashedPin,
        qrCode,
        name,
        height: height ? parseFloat(height) : null,
        weight: weight ? parseFloat(weight) : null,
        gender: gender || null,
        goal,
        gymId: session.gymId,
      },
    });

    return NextResponse.json({
      success: true,
      member: {
        id: member.id,
        memberId: member.memberId,
        name: member.name,
        goal: member.goal,
      },
      credentials: {
        memberId,
        pin,
        qrCode,
      },
    });
  } catch (error) {
    console.error("Member creation error:", error);
    return NextResponse.json(
      { error: "Failed to create member" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const members = await prisma.member.findMany({
      where: { gymId: session.gymId },
      select: {
        id: true,
        memberId: true,
        name: true,
        avatarUrl: true,
        goal: true,
        status: true,
        subscriptionStatus: true,
        subscribedUntil: true,
        createdAt: true,
        coachAssignment: {
          select: {
            staff: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            dailyLogs: true,
            weeklyCheckins: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const membersWithActivity = await Promise.all(
      members.map(async (member) => {
        const recentLogs = await prisma.dailyLog.findMany({
          where: {
            memberId: member.id,
            createdAt: { gte: thirtyDaysAgo },
          },
          select: { createdAt: true },
        });

        const lastWeekLogs = recentLogs.filter(
          (log) => log.createdAt >= sevenDaysAgo
        );

        let activityStatus: "active" | "slipping" | "inactive";

        if (lastWeekLogs.length >= 3) {
          activityStatus = "active";
        } else if (recentLogs.length > 0) {
          activityStatus = "slipping";
        } else {
          activityStatus = "inactive";
        }

        return {
          ...member,
          activityStatus,
          lastActivity: recentLogs[0]?.createdAt || null,
          coach: member.coachAssignment?.staff || null,
        };
      })
    );

    return NextResponse.json({ members: membersWithActivity });
  } catch (error) {
    console.error("Get members error:", error);
    return NextResponse.json(
      { error: "Failed to get members" },
      { status: 500 }
    );
  }
}
