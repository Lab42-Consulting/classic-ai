import { NextRequest, NextResponse } from "next/server";
import { getMemberFromSession, getMemberAuthErrorMessage } from "@/lib/auth";
import prisma from "@/lib/db";
import { validateImageUpload, processImageUpload } from "@/lib/storage";

// GET - Get meals for the logged-in member (own + coach + shared from gym)
export async function GET(request: NextRequest) {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
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

    // Get query params
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all"; // "own" | "coach" | "shared" | "all"

    // Build where clause based on type
    // Shared meals only show if BOTH isShared AND shareApproved are true
    let whereClause;
    if (type === "own") {
      whereClause = {
        memberId: authResult.memberId,
        createdByCoachId: null, // Only meals created by member themselves
      };
    } else if (type === "coach") {
      whereClause = {
        memberId: authResult.memberId,
        createdByCoachId: { not: null }, // Only meals created by coach
      };
    } else if (type === "shared") {
      whereClause = {
        gymId: member.gymId,
        isShared: true,
        shareApproved: true, // Only approved shared meals
        memberId: { not: authResult.memberId }, // Exclude own meals from shared
      };
    } else {
      // "all" - own meals + coach meals + approved shared meals from gym
      whereClause = {
        OR: [
          { memberId: authResult.memberId },
          { gymId: member.gymId, isShared: true, shareApproved: true },
        ],
      };
    }

    // Fetch meals with ingredients and coach info
    const meals = await prisma.customMeal.findMany({
      where: whereClause,
      include: {
        ingredients: {
          orderBy: { createdAt: "asc" },
        },
        member: {
          select: { name: true },
        },
        createdByCoach: {
          select: { name: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Separate own, coach, and shared meals
    const ownMeals = meals.filter(
      (m) => m.memberId === authResult.memberId && !m.createdByCoachId
    );
    const coachMeals = meals.filter(
      (m) => m.memberId === authResult.memberId && m.createdByCoachId
    );
    const sharedMeals = meals.filter(
      (m) => m.memberId !== authResult.memberId && m.isShared && m.shareApproved
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
        photoUrl: meal.photoUrl,
        ingredientCount: meal.ingredients.length,
        ingredients: meal.ingredients,
        createdAt: meal.createdAt,
        updatedAt: meal.updatedAt,
      })),
      coach: coachMeals.map((meal) => ({
        id: meal.id,
        name: meal.name,
        totalCalories: meal.totalCalories,
        totalProtein: meal.totalProtein,
        totalCarbs: meal.totalCarbs,
        totalFats: meal.totalFats,
        isManualTotal: meal.isManualTotal,
        coachName: meal.createdByCoach?.name,
        photoUrl: meal.photoUrl,
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
        photoUrl: meal.photoUrl,
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
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
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
      isManualTotal = false,
      isShared = false,
      photoUrl,
    } = body;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Meal name is required" },
        { status: 400 }
      );
    }

    // Validate photo if provided (required when sharing)
    const photoValidation = validateImageUpload(photoUrl, "meal", {
      required: isShared,
      requiredMessage: "Photo is required when sharing a meal",
    });
    if (!photoValidation.valid) {
      return NextResponse.json(
        { error: photoValidation.error },
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
      where: { id: authResult.memberId },
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

    // Upload photo to blob storage if provided
    let processedPhotoUrl: string | null = null;
    if (photoUrl) {
      const imageResult = await processImageUpload(photoUrl, "meal", authResult.memberId);
      if (imageResult.error) {
        return NextResponse.json({ error: imageResult.error }, { status: 400 });
      }
      processedPhotoUrl = imageResult.url;
    }

    // Create meal with ingredients in a transaction
    const meal = await prisma.customMeal.create({
      data: {
        memberId: authResult.memberId,
        gymId: member.gymId,
        name: name.trim(),
        ...finalTotals,
        isManualTotal,
        isShared,
        shareApproved: false, // Requires admin approval
        shareRequestedAt: isShared ? new Date() : null, // Track when share was requested
        photoUrl: processedPhotoUrl,
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
        photoUrl: meal.photoUrl,
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
