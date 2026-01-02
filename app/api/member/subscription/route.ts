import { NextResponse } from "next/server";
import { getMemberFromSession, getMemberAuthErrorMessage } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    // Fetch member with their gym's subscription status
    const member = await prisma.member.findUnique({
      where: { id: authResult.memberId },
      select: {
        goal: true,
        subscribedAt: true,
        subscribedUntil: true,
        subscriptionStatus: true,
        gym: {
          select: {
            subscriptionStatus: true,
            subscribedUntil: true,
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Check gym subscription status first
    // If gym is expired, members cannot access the app
    if (member.gym) {
      const gymStatus = member.gym.subscriptionStatus;
      if (gymStatus === "expired") {
        return NextResponse.json({
          status: "gym_expired",
          message: "Gym subscription has expired",
        });
      }
    }

    // Check if member subscription has expired and update status if needed
    let subscriptionStatus = member.subscriptionStatus;
    const now = new Date();

    if (subscriptionStatus === "active" && member.subscribedUntil && now > member.subscribedUntil) {
      subscriptionStatus = "expired";
      await prisma.member.update({
        where: { id: authResult.memberId },
        data: { subscriptionStatus: "expired" },
      });
    }

    return NextResponse.json({
      status: subscriptionStatus,
      subscribedAt: member.subscribedAt?.toISOString() || null,
      subscribedUntil: member.subscribedUntil?.toISOString() || null,
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
