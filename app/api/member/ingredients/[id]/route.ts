import { NextRequest, NextResponse } from "next/server";
import { getMemberFromSession, getMemberAuthErrorMessage } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH - Update an ingredient (only own ingredients)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Check if ingredient exists and belongs to the user
    const existingIngredient = await prisma.savedIngredient.findUnique({
      where: { id },
    });

    if (!existingIngredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
    }

    if (existingIngredient.memberId !== authResult.memberId) {
      return NextResponse.json(
        { error: "You can only edit your own ingredients" },
        { status: 403 }
      );
    }

    const { name, defaultPortion, calories, protein, carbs, fats, isShared } = body;

    // Build update data
    const updateData: {
      name?: string;
      defaultPortion?: string;
      calories?: number;
      protein?: number | null;
      carbs?: number | null;
      fats?: number | null;
      isShared?: boolean;
    } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Ingredient name cannot be empty" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (defaultPortion !== undefined) {
      if (typeof defaultPortion !== "string" || defaultPortion.trim().length === 0) {
        return NextResponse.json(
          { error: "Default portion cannot be empty" },
          { status: 400 }
        );
      }
      updateData.defaultPortion = defaultPortion.trim();
    }

    if (calories !== undefined) {
      if (typeof calories !== "number" || calories < 0) {
        return NextResponse.json(
          { error: "Calories must be a positive number" },
          { status: 400 }
        );
      }
      updateData.calories = calories;
    }

    if (protein !== undefined) updateData.protein = protein;
    if (carbs !== undefined) updateData.carbs = carbs;
    if (fats !== undefined) updateData.fats = fats;
    if (isShared !== undefined) updateData.isShared = isShared;

    // Update the ingredient
    const updatedIngredient = await prisma.savedIngredient.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      ingredient: {
        id: updatedIngredient.id,
        name: updatedIngredient.name,
        defaultPortion: updatedIngredient.defaultPortion,
        calories: updatedIngredient.calories,
        protein: updatedIngredient.protein,
        carbs: updatedIngredient.carbs,
        fats: updatedIngredient.fats,
        isShared: updatedIngredient.isShared,
        updatedAt: updatedIngredient.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update ingredient error:", error);
    return NextResponse.json(
      { error: "Failed to update ingredient" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an ingredient (only own ingredients)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check if ingredient exists and belongs to the user
    const ingredient = await prisma.savedIngredient.findUnique({
      where: { id },
    });

    if (!ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
    }

    if (ingredient.memberId !== authResult.memberId) {
      return NextResponse.json(
        { error: "You can only delete your own ingredients" },
        { status: 403 }
      );
    }

    // Delete the ingredient
    await prisma.savedIngredient.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      deleted: true,
    });
  } catch (error) {
    console.error("Delete ingredient error:", error);
    return NextResponse.json(
      { error: "Failed to delete ingredient" },
      { status: 500 }
    );
  }
}
