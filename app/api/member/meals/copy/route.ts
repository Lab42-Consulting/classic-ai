import { NextRequest, NextResponse } from "next/server";
import { getMemberFromSession, getMemberAuthErrorMessage } from "@/lib/auth";
import prisma from "@/lib/db";

// POST - Copy a shared meal to member's own saved meals
export async function POST(request: NextRequest) {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { mealId } = body;

    if (!mealId) {
      return NextResponse.json(
        { error: "Meal ID is required" },
        { status: 400 }
      );
    }

    // Get member's gymId
    const member = await prisma.member.findUnique({
      where: { id: authResult.memberId },
      select: { gymId: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Get the shared meal to copy (must be shared and approved, from same gym)
    const sharedMeal = await prisma.customMeal.findFirst({
      where: {
        id: mealId,
        gymId: member.gymId,
        isShared: true,
        shareApproved: true,
        memberId: { not: authResult.memberId }, // Can't copy own meal
      },
      include: {
        ingredients: true,
      },
    });

    if (!sharedMeal) {
      return NextResponse.json(
        { error: "Shared meal not found" },
        { status: 404 }
      );
    }

    // Create a copy of the meal for this member
    const copiedMeal = await prisma.customMeal.create({
      data: {
        memberId: authResult.memberId,
        gymId: member.gymId,
        name: sharedMeal.name,
        totalCalories: sharedMeal.totalCalories,
        totalProtein: sharedMeal.totalProtein,
        totalCarbs: sharedMeal.totalCarbs,
        totalFats: sharedMeal.totalFats,
        isManualTotal: sharedMeal.isManualTotal,
        isShared: false, // Copy is not shared by default
        shareApproved: false,
        shareRequestedAt: null,
        photoUrl: sharedMeal.photoUrl, // Copy the photo too
        ingredients: {
          create: sharedMeal.ingredients.map((ing) => ({
            name: ing.name,
            portionSize: ing.portionSize,
            calories: ing.calories,
            protein: ing.protein,
            carbs: ing.carbs,
            fats: ing.fats,
          })),
        },
      },
      include: {
        ingredients: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Obrok kopiran u tvoje sačuvane obroke",
      meal: {
        id: copiedMeal.id,
        name: copiedMeal.name,
        totalCalories: copiedMeal.totalCalories,
        totalProtein: copiedMeal.totalProtein,
        totalCarbs: copiedMeal.totalCarbs,
        totalFats: copiedMeal.totalFats,
        photoUrl: copiedMeal.photoUrl,
      },
    });
  } catch (error) {
    console.error("Copy meal error:", error);
    return NextResponse.json(
      { error: "Failed to copy meal" },
      { status: 500 }
    );
  }
}
