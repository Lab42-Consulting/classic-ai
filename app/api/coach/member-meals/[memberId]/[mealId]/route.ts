import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

// PATCH - Update a coach-created meal
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; mealId: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memberId, mealId } = await params;

    // Get staff info to check role
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!staff || staff.role.toLowerCase() !== "coach") {
      return NextResponse.json({ error: "Only coaches can update meals" }, { status: 403 });
    }

    // Verify the meal exists, belongs to this member, and was created by this coach
    const existingMeal = await prisma.customMeal.findFirst({
      where: {
        id: mealId,
        memberId: memberId,
        createdByCoachId: session.userId,
      },
    });

    if (!existingMeal) {
      return NextResponse.json(
        { error: "Meal not found or you don't have permission to edit it" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      ingredients,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFats,
      isManualTotal,
    } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    // If ingredients are provided, handle recalculation
    if (ingredients && Array.isArray(ingredients)) {
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

      const useManualTotal = isManualTotal ?? existingMeal.isManualTotal;

      if (useManualTotal) {
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

      updateData.isManualTotal = useManualTotal;
    } else if (isManualTotal !== undefined) {
      updateData.isManualTotal = isManualTotal;
      if (totalCalories !== undefined) updateData.totalCalories = totalCalories;
      if (totalProtein !== undefined) updateData.totalProtein = totalProtein;
      if (totalCarbs !== undefined) updateData.totalCarbs = totalCarbs;
      if (totalFats !== undefined) updateData.totalFats = totalFats;
    }

    // Update meal with transaction if ingredients changed
    const updatedMeal = await prisma.$transaction(async (tx) => {
      // If ingredients are provided, delete old and create new
      if (ingredients && Array.isArray(ingredients)) {
        await tx.mealIngredient.deleteMany({
          where: { mealId },
        });

        await tx.mealIngredient.createMany({
          data: ingredients.map((ing: {
            name: string;
            portionSize: string;
            calories: number;
            protein?: number;
            carbs?: number;
            fats?: number;
          }) => ({
            mealId,
            name: ing.name,
            portionSize: ing.portionSize,
            calories: ing.calories,
            protein: ing.protein || null,
            carbs: ing.carbs || null,
            fats: ing.fats || null,
          })),
        });
      }

      // Update meal
      return tx.customMeal.update({
        where: { id: mealId },
        data: updateData,
        include: {
          ingredients: {
            orderBy: { createdAt: "asc" },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      meal: {
        id: updatedMeal.id,
        name: updatedMeal.name,
        totalCalories: updatedMeal.totalCalories,
        totalProtein: updatedMeal.totalProtein,
        totalCarbs: updatedMeal.totalCarbs,
        totalFats: updatedMeal.totalFats,
        isManualTotal: updatedMeal.isManualTotal,
        ingredients: updatedMeal.ingredients,
        updatedAt: updatedMeal.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update coach meal error:", error);
    return NextResponse.json(
      { error: "Failed to update meal" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a coach-created meal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; mealId: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memberId, mealId } = await params;

    // Get staff info to check role
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!staff || staff.role.toLowerCase() !== "coach") {
      return NextResponse.json({ error: "Only coaches can delete meals" }, { status: 403 });
    }

    // Verify the meal exists, belongs to this member, and was created by this coach
    const existingMeal = await prisma.customMeal.findFirst({
      where: {
        id: mealId,
        memberId: memberId,
        createdByCoachId: session.userId,
      },
    });

    if (!existingMeal) {
      return NextResponse.json(
        { error: "Meal not found or you don't have permission to delete it" },
        { status: 404 }
      );
    }

    // Delete meal (ingredients will be cascade deleted)
    await prisma.customMeal.delete({
      where: { id: mealId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete coach meal error:", error);
    return NextResponse.json(
      { error: "Failed to delete meal" },
      { status: 500 }
    );
  }
}
