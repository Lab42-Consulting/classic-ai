import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

// Pricing for subscription extensions
const SUBSCRIPTION_PRICES: Record<number, number> = {
  1: 5,   // 1 month = 5€
  3: 15,  // 3 months = 15€
  6: 30,  // 6 months = 30€
  12: 60, // 12 months = 60€
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: memberId } = await params;
    const body = await request.json();
    const { months, extendUntil } = body;

    // Validate input
    if (!months && !extendUntil) {
      return NextResponse.json(
        { error: "Morate navesti broj meseci ili datum" },
        { status: 400 }
      );
    }

    // Get current member
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        gymId: true,
        name: true,
        subscribedAt: true,
        subscribedUntil: true,
        subscriptionStatus: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Član nije pronađen" }, { status: 404 });
    }

    // Check that member belongs to same gym
    if (member.gymId !== session.gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Calculate new end date
    let newEndDate: Date;
    let monthsToAdd = months || 0;

    if (extendUntil) {
      // Use custom date
      newEndDate = new Date(extendUntil);
      if (newEndDate <= new Date()) {
        return NextResponse.json(
          { error: "Datum mora biti u budućnosti" },
          { status: 400 }
        );
      }
    } else {
      // Calculate based on months
      const baseDate = member.subscribedUntil && member.subscribedUntil > new Date()
        ? new Date(member.subscribedUntil)
        : new Date();

      newEndDate = new Date(baseDate);
      newEndDate.setMonth(newEndDate.getMonth() + monthsToAdd);
    }

    const previousEndDate = member.subscribedUntil;
    const isFirstActivation = !member.subscribedAt;
    const amount = SUBSCRIPTION_PRICES[monthsToAdd] || 0;

    // Update member subscription
    const updatedMember = await prisma.$transaction(async (tx) => {
      // Update member
      const updated = await tx.member.update({
        where: { id: memberId },
        data: {
          subscribedAt: isFirstActivation ? new Date() : member.subscribedAt,
          subscribedUntil: newEndDate,
          subscriptionStatus: "active",
        },
        select: {
          id: true,
          name: true,
          memberId: true,
          subscribedAt: true,
          subscribedUntil: true,
          subscriptionStatus: true,
        },
      });

      // Log the subscription change
      await tx.subscriptionLog.create({
        data: {
          entityType: "member",
          entityId: memberId,
          action: isFirstActivation ? "activated" : "extended",
          previousEndDate,
          newEndDate,
          months: monthsToAdd || null,
          amount,
          notes: isFirstActivation
            ? `Članarina aktivirana${monthsToAdd ? ` za ${monthsToAdd} meseci` : ""}`
            : `Članarina produžena${monthsToAdd ? ` za ${monthsToAdd} meseci` : ""}`,
          performedBy: session.userId,
          performedByType: "staff",
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      member: {
        ...updatedMember,
        subscribedAt: updatedMember.subscribedAt?.toISOString(),
        subscribedUntil: updatedMember.subscribedUntil?.toISOString(),
      },
      message: isFirstActivation
        ? "Članarina uspešno aktivirana"
        : "Članarina uspešno produžena",
    });
  } catch (error) {
    console.error("Extend subscription error:", error);
    return NextResponse.json(
      { error: "Greška pri produženju članarine" },
      { status: 500 }
    );
  }
}

// GET subscription history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: memberId } = await params;

    // Get subscription logs for this member
    const logs = await prisma.subscriptionLog.findMany({
      where: {
        entityType: "member",
        entityId: memberId,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Get subscription history error:", error);
    return NextResponse.json(
      { error: "Failed to get subscription history" },
      { status: 500 }
    );
  }
}
