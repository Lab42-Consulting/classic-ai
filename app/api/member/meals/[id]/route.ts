import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get a single meal by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "member") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get member's gymId for access check
    const member = await prisma.member.findUnique({
      where: { id: session.userId },
      select: { gymId: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const meal = await prisma.customMeal.findUnique({
      where: { id },
      include: {
        ingredients: {
          orderBy: { createdAt: "asc" },
        },
        member: {
          select: { name: true },
        },
      },
    });

    if (!meal) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }

    // Check access: own meal OR shared meal from same gym
    const isOwnMeal = meal.memberId === session.userId;
    const isAccessibleShared = meal.isShared && meal.gymId === member.gymId;

    if (!isOwnMeal && !isAccessibleShared) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({
      meal: {
        id: meal.id,
        name: meal.name,
        totalCalories: meal.totalCalories,
        totalProtein: meal.totalProtein,
        totalCarbs: meal.totalCarbs,
        totalFats: meal.totalFats,
        isManualTotal: meal.isManualTotal,
        isShared: meal.isShared,
        isOwn: isOwnMeal,
        authorName: meal.member.name,
        ingredients: meal.ingredients,
        createdAt: meal.createdAt,
        updatedAt: meal.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get meal error:", error);
    return NextResponse.json(
      { error: "Failed to get meal" },
      { status: 500 }
    );
  }
}

// PATCH - Update a meal (only own meals, NOT coach-created meals)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "member") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check if meal exists and belongs to the user
    const existingMeal = await prisma.customMeal.findUnique({
      where: { id },
      include: { ingredients: true },
    });

    if (!existingMeal) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }

    if (existingMeal.memberId !== session.userId) {
      return NextResponse.json(
        { error: "You can only edit your own meals" },
        { status: 403 }
      );
    }

    // Members cannot edit meals created by their coach
    if (existingMeal.createdByCoachId) {
      return NextResponse.json(
        { error: "You cannot edit meals created by your coach" },
        { status: 403 }
      );
    }

    const {
      name,
      ingredients,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFats,
      isManualTotal,
      isShared,
    } = body;

    // Build update data
    const updateData: {
      name?: string;
      totalCalories?: number;
      totalProtein?: number | null;
      totalCarbs?: number | null;
      totalFats?: number | null;
      isManualTotal?: boolean;
      isShared?: boolean;
    } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Meal name cannot be empty" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (isManualTotal !== undefined) {
      updateData.isManualTotal = isManualTotal;
    }

    if (isShared !== undefined) {
      updateData.isShared = isShared;
    }

    // If ingredients are provided, update them
    if (ingredients !== undefined) {
      if (!Array.isArray(ingredients) || ingredients.length === 0) {
        return NextResponse.json(
          { error: "At least one ingredient is required" },
          { status: 400 }
        );
      }

      // Calculate totals from new ingredients
      let calculatedTotals = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
      };

      for (const ing of ingredients) {
        if (!ing.name || !ing.portionSize || typeof ing.calories !== "number") {
          return NextResponse.json(
            { error: "Each ingredient must have name, portionSize, and calories" },
            { status: 400 }
          );
        }
        calculatedTotals.calories += ing.calories || 0;
        calculatedTotals.protein += ing.protein || 0;
        calculatedTotals.carbs += ing.carbs || 0;
        calculatedTotals.fats += ing.fats || 0;
      }

      // Use manual totals if specified, otherwise use calculated
      const useManual = isManualTotal ?? existingMeal.isManualTotal;
      if (useManual) {
        updateData.totalCalories = totalCalories ?? calculatedTotals.calories;
        updateData.totalProtein = totalProtein ?? calculatedTotals.protein;
        updateData.totalCarbs = totalCarbs ?? calculatedTotals.carbs;
        updateData.totalFats = totalFats ?? calculatedTotals.fats;
      } else {
        updateData.totalCalories = calculatedTotals.calories;
        updateData.totalProtein = calculatedTotals.protein;
        updateData.totalCarbs = calculatedTotals.carbs;
        updateData.totalFats = calculatedTotals.fats;
      }

      // Delete old ingredients and create new ones in a transaction
      await prisma.$transaction([
        prisma.mealIngredient.deleteMany({
          where: { mealId: id },
        }),
        prisma.customMeal.update({
          where: { id },
          data: {
            ...updateData,
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
        }),
      ]);
    } else if (Object.keys(updateData).length > 0) {
      // Just update meal fields without touching ingredients
      // But recalculate totals if not manual
      if (!updateData.isManualTotal && !existingMeal.isManualTotal) {
        const currentIngredients = existingMeal.ingredients;
        let calculatedTotals = {
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
        };

        for (const ing of currentIngredients) {
          calculatedTotals.calories += ing.calories || 0;
          calculatedTotals.protein += ing.protein || 0;
          calculatedTotals.carbs += ing.carbs || 0;
          calculatedTotals.fats += ing.fats || 0;
        }

        updateData.totalCalories = calculatedTotals.calories;
        updateData.totalProtein = calculatedTotals.protein;
        updateData.totalCarbs = calculatedTotals.carbs;
        updateData.totalFats = calculatedTotals.fats;
      } else if (updateData.isManualTotal || existingMeal.isManualTotal) {
        // Manual mode - use provided values or keep existing
        if (totalCalories !== undefined) updateData.totalCalories = totalCalories;
        if (totalProtein !== undefined) updateData.totalProtein = totalProtein;
        if (totalCarbs !== undefined) updateData.totalCarbs = totalCarbs;
        if (totalFats !== undefined) updateData.totalFats = totalFats;
      }

      await prisma.customMeal.update({
        where: { id },
        data: updateData,
      });
    }

    // Fetch updated meal
    const updatedMeal = await prisma.customMeal.findUnique({
      where: { id },
      include: {
        ingredients: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      meal: updatedMeal,
    });
  } catch (error) {
    console.error("Update meal error:", error);
    return NextResponse.json(
      { error: "Failed to update meal" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a meal (own meals AND coach-created meals assigned to member)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "member") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if meal exists and belongs to the user
    // (includes both member-created and coach-created meals for this member)
    const meal = await prisma.customMeal.findUnique({
      where: { id },
    });

    if (!meal) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }

    // Member can delete any meal assigned to them (own or coach-created)
    if (meal.memberId !== session.userId) {
      return NextResponse.json(
        { error: "You can only delete meals assigned to you" },
        { status: 403 }
      );
    }

    // Delete meal (ingredients will be cascade deleted)
    await prisma.customMeal.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      deleted: true,
    });
  } catch (error) {
    console.error("Delete meal error:", error);
    return NextResponse.json(
      { error: "Failed to delete meal" },
      { status: 500 }
    );
  }
}
