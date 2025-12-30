import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

// GET - Get meals for the logged-in member (own + shared from gym)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "member") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get member's gymId
    const member = await prisma.member.findUnique({
      where: { id: session.userId },
      select: { gymId: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all"; // "own" | "shared" | "all"

    // Build where clause based on type
    // Shared meals only show if BOTH isShared AND shareApproved are true
    let whereClause;
    if (type === "own") {
      whereClause = { memberId: session.userId };
    } else if (type === "shared") {
      whereClause = {
        gymId: member.gymId,
        isShared: true,
        shareApproved: true, // Only approved shared meals
        memberId: { not: session.userId }, // Exclude own meals from shared
      };
    } else {
      // "all" - own meals + approved shared meals from gym
      whereClause = {
        OR: [
          { memberId: session.userId },
          { gymId: member.gymId, isShared: true, shareApproved: true },
        ],
      };
    }

    // Fetch meals with ingredients
    const meals = await prisma.customMeal.findMany({
      where: whereClause,
      include: {
        ingredients: {
          orderBy: { createdAt: "asc" },
        },
        member: {
          select: { name: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Separate own and shared meals
    const ownMeals = meals.filter((m) => m.memberId === session.userId);
    const sharedMeals = meals.filter(
      (m) => m.memberId !== session.userId && m.isShared && m.shareApproved
    );

    return NextResponse.json({
      own: ownMeals.map((meal) => ({
        id: meal.id,
        name: meal.name,
        totalCalories: meal.totalCalories,
        totalProtein: meal.totalProtein,
        totalCarbs: meal.totalCarbs,
        totalFats: meal.totalFats,
        isManualTotal: meal.isManualTotal,
        isShared: meal.isShared,
        shareApproved: meal.shareApproved,
        sharePending: meal.isShared && !meal.shareApproved, // Pending approval
        ingredientCount: meal.ingredients.length,
        ingredients: meal.ingredients,
        createdAt: meal.createdAt,
        updatedAt: meal.updatedAt,
      })),
      shared: sharedMeals.map((meal) => ({
        id: meal.id,
        name: meal.name,
        totalCalories: meal.totalCalories,
        totalProtein: meal.totalProtein,
        totalCarbs: meal.totalCarbs,
        totalFats: meal.totalFats,
        authorName: meal.member.name,
        ingredientCount: meal.ingredients.length,
        ingredients: meal.ingredients,
        createdAt: meal.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get meals error:", error);
    return NextResponse.json(
      { error: "Failed to get meals" },
      { status: 500 }
    );
  }
}

// POST - Create a new meal with ingredients
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "member") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      isShared = false,
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

    // Get member's gymId
    const member = await prisma.member.findUnique({
      where: { id: session.userId },
      select: { gymId: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
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

    // Create meal with ingredients in a transaction
    const meal = await prisma.customMeal.create({
      data: {
        memberId: session.userId,
        gymId: member.gymId,
        name: name.trim(),
        ...finalTotals,
        isManualTotal,
        isShared,
        shareApproved: false, // Requires admin approval
        shareRequestedAt: isShared ? new Date() : null, // Track when share was requested
        ingredients: {
          create: ingredients.map((ing: {
            name: string;
            portionSize: string;
            calories: number;
            protein?: number;
            carbs?: number;
            fats?: number;
            savedIngredientId?: string;
          }) => ({
            name: ing.name,
            portionSize: ing.portionSize,
            calories: ing.calories,
            protein: ing.protein || null,
            carbs: ing.carbs || null,
            fats: ing.fats || null,
            savedIngredientId: ing.savedIngredientId || null,
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
        isShared: meal.isShared,
        shareApproved: meal.shareApproved,
        sharePending: meal.isShared && !meal.shareApproved,
        ingredients: meal.ingredients,
        createdAt: meal.createdAt,
      },
    });
  } catch (error) {
    console.error("Create meal error:", error);
    return NextResponse.json(
      { error: "Failed to create meal" },
      { status: 500 }
    );
  }
}
