import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.userType !== "member") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const member = await prisma.member.findUnique({
      where: { id: session.userId },
      select: {
        goal: true,
        trialStartDate: true,
        trialEndDate: true,
        subscriptionStatus: true,
        subscriptionEndDate: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Calculate trial end date if not set (7 days from trial start)
    let trialEndDate = member.trialEndDate;
    if (!trialEndDate && member.trialStartDate) {
      const trialStart = new Date(member.trialStartDate);
      trialEndDate = new Date(trialStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    // Check if trial has expired and update status if needed
    let subscriptionStatus = member.subscriptionStatus;
    const now = new Date();

    if (subscriptionStatus === "trial" && trialEndDate && now > trialEndDate) {
      subscriptionStatus = "expired";
      // Update in database
      await prisma.member.update({
        where: { id: session.userId },
        data: { subscriptionStatus: "expired" },
      });
    } else if (subscriptionStatus === "active" && member.subscriptionEndDate && now > member.subscriptionEndDate) {
      subscriptionStatus = "expired";
      await prisma.member.update({
        where: { id: session.userId },
        data: { subscriptionStatus: "expired" },
      });
    }

    return NextResponse.json({
      status: subscriptionStatus,
      trialStartDate: member.trialStartDate?.toISOString() || null,
      trialEndDate: trialEndDate?.toISOString() || null,
      subscriptionEndDate: member.subscriptionEndDate?.toISOString() || null,
      goal: member.goal,
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    return NextResponse.json(
      { error: "Failed to get subscription status" },
      { status: 500 }
    );
  }
}
