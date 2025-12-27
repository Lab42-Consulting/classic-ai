import { NextRequest, NextResponse } from "next/server";
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
        id: true,
        memberId: true,
        name: true,
        height: true,
        weight: true,
        gender: true,
        goal: true,
        status: true,
        subscriptionStatus: true,
        locale: true,
        createdAt: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json(member);
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: "Failed to get profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "member") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { goal, weight, height, locale } = body;

    // Validate goal if provided
    if (goal && !["fat_loss", "muscle_gain", "recomposition"].includes(goal)) {
      return NextResponse.json(
        { error: "Invalid goal" },
        { status: 400 }
      );
    }

    // Validate locale if provided
    if (locale && !["sr", "en"].includes(locale)) {
      return NextResponse.json(
        { error: "Invalid locale" },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: {
      goal?: string;
      weight?: number;
      height?: number;
      locale?: string;
    } = {};

    if (goal) updateData.goal = goal;
    if (weight !== undefined) updateData.weight = parseFloat(weight);
    if (height !== undefined) updateData.height = parseFloat(height);
    if (locale) updateData.locale = locale;

    const member = await prisma.member.update({
      where: { id: session.userId },
      data: updateData,
      select: {
        id: true,
        goal: true,
        weight: true,
        height: true,
        locale: true,
      },
    });

    return NextResponse.json({ success: true, member });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
