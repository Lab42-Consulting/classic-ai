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
        subscribedAt: true,
        subscribedUntil: true,
        subscriptionStatus: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Check if subscription has expired and update status if needed
    let subscriptionStatus = member.subscriptionStatus;
    const now = new Date();

    if (subscriptionStatus === "active" && member.subscribedUntil && now > member.subscribedUntil) {
      subscriptionStatus = "expired";
      await prisma.member.update({
        where: { id: session.userId },
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
