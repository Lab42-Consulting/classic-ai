import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

// GET - Get meals created by coach for a specific member
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memberId } = await params;

    // Get staff info to check role
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!staff || staff.role.toLowerCase() !== "coach") {
      return NextResponse.json({ error: "Only coaches can access this" }, { status: 403 });
    }

    // Verify coach is assigned to this member
    const assignment = await prisma.coachAssignment.findFirst({
      where: {
        staffId: session.userId,
        memberId: memberId,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "You are not assigned to this member" },
        { status: 403 }
      );
    }

    // Get meals created by this coach for this member
    const meals = await prisma.customMeal.findMany({
      where: {
        memberId: memberId,
        createdByCoachId: session.userId,
      },
      include: {
        ingredients: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      meals: meals.map((meal) => ({
        id: meal.id,
        name: meal.name,
        totalCalories: meal.totalCalories,
        totalProtein: meal.totalProtein,
        totalCarbs: meal.totalCarbs,
        totalFats: meal.totalFats,
        isManualTotal: meal.isManualTotal,
        ingredientCount: meal.ingredients.length,
        ingredients: meal.ingredients,
        createdAt: meal.createdAt,
        updatedAt: meal.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Get coach meals error:", error);
    return NextResponse.json(
      { error: "Failed to get meals" },
      { status: 500 }
    );
  }
}

// POST - Create a new meal for a member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memberId } = await params;

    // Get staff info to check role
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!staff || staff.role.toLowerCase() !== "coach") {
      return NextResponse.json({ error: "Only coaches can create meals" }, { status: 403 });
    }

    // Verify coach is assigned to this member
    const assignment = await prisma.coachAssignment.findFirst({
      where: {
        staffId: session.userId,
        memberId: memberId,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "You are not assigned to this member" },
        { status: 403 }
      );
    }

    // Get member's gymId
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { gymId: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      ingredients,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFats,
      isManualTotal = false,
    } = body;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Meal name is required" },
        { status: 400 }
      );
    }

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: "At least one ingredient is required" },
        { status: 400 }
      );
    }

    // Validate each ingredient
    for (const ing of ingredients) {
      if (!ing.name || !ing.portionSize || typeof ing.calories !== "number") {
        return NextResponse.json(
          { error: "Each ingredient must have name, portionSize, and calories" },
          { status: 400 }
        );
      }
    }

    // Calculate totals from ingredients if not manual
    let calculatedTotals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
    };

    for (const ing of ingredients) {
      calculatedTotals.calories += ing.calories || 0;
      calculatedTotals.protein += ing.protein || 0;
      calculatedTotals.carbs += ing.carbs || 0;
      calculatedTotals.fats += ing.fats || 0;
    }

    // Use manual totals if provided, otherwise use calculated
    const finalTotals = isManualTotal
      ? {
          totalCalories: totalCalories ?? calculatedTotals.calories,
          totalProtein: totalProtein ?? calculatedTotals.protein,
          totalCarbs: totalCarbs ?? calculatedTotals.carbs,
          totalFats: totalFats ?? calculatedTotals.fats,
        }
      : {
          totalCalories: calculatedTotals.calories,
          totalProtein: calculatedTotals.protein,
          totalCarbs: calculatedTotals.carbs,
          totalFats: calculatedTotals.fats,
        };

    // Create meal with ingredients - set createdByCoachId
    const meal = await prisma.customMeal.create({
      data: {
        memberId: memberId,
        gymId: member.gymId,
        createdByCoachId: session.userId, // Mark this meal as coach-created
        name: name.trim(),
        ...finalTotals,
        isManualTotal,
        isShared: false, // Coach-created meals are not shared
        shareApproved: false,
        ingredients: {
          create: ingredients.map((ing: {
            name: string;
            portionSize: string;
            calories: number;
            protein?: number;
            carbs?: number;
            fats?: number;
          }) => ({
            name: ing.name,
            portionSize: ing.portionSize,
            calories: ing.calories,
            protein: ing.protein || null,
            carbs: ing.carbs || null,
            fats: ing.fats || null,
          })),
        },
      },
      include: {
        ingredients: true,
      },
    });

    return NextResponse.json({
      success: true,
      meal: {
        id: meal.id,
        name: meal.name,
        totalCalories: meal.totalCalories,
        totalProtein: meal.totalProtein,
        totalCarbs: meal.totalCarbs,
        totalFats: meal.totalFats,
        isManualTotal: meal.isManualTotal,
        ingredients: meal.ingredients,
        createdAt: meal.createdAt,
      },
    });
  } catch (error) {
    console.error("Create coach meal error:", error);
    return NextResponse.json(
      { error: "Failed to create meal" },
      { status: 500 }
    );
  }
}
