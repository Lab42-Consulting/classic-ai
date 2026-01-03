import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

// GET - Get all pending share requests (meals waiting for admin approval)
export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify this is an admin
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, gymId: true },
    });

    if (!staff || staff.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can manage share requests" },
        { status: 403 }
      );
    }

    // Get all meals pending approval in this gym
    const pendingMeals = await prisma.customMeal.findMany({
      where: {
        gymId: staff.gymId,
        isShared: true,
        shareApproved: false,
      },
      include: {
        member: {
          select: { name: true, memberId: true },
        },
        ingredients: {
          select: { name: true, portionSize: true, calories: true },
        },
      },
      orderBy: { shareRequestedAt: "asc" },
    });

    return NextResponse.json({
      pendingMeals: pendingMeals.map((meal) => ({
        id: meal.id,
        name: meal.name,
        totalCalories: meal.totalCalories,
        totalProtein: meal.totalProtein,
        totalCarbs: meal.totalCarbs,
        totalFats: meal.totalFats,
        photoUrl: meal.photoUrl,
        ingredientCount: meal.ingredients.length,
        ingredients: meal.ingredients,
        memberName: meal.member.name,
        memberId: meal.member.memberId,
        requestedAt: meal.shareRequestedAt,
      })),
    });
  } catch (error) {
    console.error("Get pending shares error:", error);
    return NextResponse.json(
      { error: "Failed to get pending shares" },
      { status: 500 }
    );
  }
}

// POST - Approve or reject a share request
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify this is an admin
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true, gymId: true },
    });

    if (!staff || staff.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can manage share requests" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { mealId, action } = body;

    if (!mealId || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid request. Must provide mealId and action (approve/reject)" },
        { status: 400 }
      );
    }

    // Get the meal and verify it's in this gym
    const meal = await prisma.customMeal.findFirst({
      where: {
        id: mealId,
        gymId: staff.gymId,
        isShared: true,
        shareApproved: false,
      },
    });

    if (!meal) {
      return NextResponse.json(
        { error: "Meal not found or already processed" },
        { status: 404 }
      );
    }

    if (action === "approve") {
      // Approve the share request
      await prisma.customMeal.update({
        where: { id: mealId },
        data: { shareApproved: true },
      });

      return NextResponse.json({
        success: true,
        message: "Share request approved",
      });
    } else {
      // Reject - just remove the share request (keep the meal but don't share it)
      await prisma.customMeal.update({
        where: { id: mealId },
        data: {
          isShared: false,
          shareApproved: false,
          shareRequestedAt: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Share request rejected",
      });
    }
  } catch (error) {
    console.error("Process share request error:", error);
    return NextResponse.json(
      { error: "Failed to process share request" },
      { status: 500 }
    );
  }
}
