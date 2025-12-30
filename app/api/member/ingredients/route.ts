import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

// GET - Get ingredients for the logged-in member (own + shared from gym)
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
    const search = searchParams.get("search"); // Optional search query

    // Build where clause based on type
    let whereClause;
    if (type === "own") {
      whereClause = { memberId: session.userId };
    } else if (type === "shared") {
      whereClause = {
        gymId: member.gymId,
        isShared: true,
        memberId: { not: session.userId },
      };
    } else {
      // "all" - own ingredients + shared ingredients from gym
      whereClause = {
        OR: [
          { memberId: session.userId },
          { gymId: member.gymId, isShared: true },
        ],
      };
    }

    // Add search filter if provided
    if (search && search.length >= 2) {
      whereClause = {
        AND: [
          whereClause,
          {
            name: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
        ],
      };
    }

    // Fetch ingredients
    const ingredients = await prisma.savedIngredient.findMany({
      where: whereClause,
      include: {
        member: {
          select: { name: true },
        },
      },
      orderBy: { name: "asc" },
    });

    // Separate own and shared ingredients
    const ownIngredients = ingredients.filter((i) => i.memberId === session.userId);
    const sharedIngredients = ingredients.filter(
      (i) => i.memberId !== session.userId && i.isShared
    );

    return NextResponse.json({
      own: ownIngredients.map((ing) => ({
        id: ing.id,
        name: ing.name,
        defaultPortion: ing.defaultPortion,
        calories: ing.calories,
        protein: ing.protein,
        carbs: ing.carbs,
        fats: ing.fats,
        isShared: ing.isShared,
        createdAt: ing.createdAt,
      })),
      shared: sharedIngredients.map((ing) => ({
        id: ing.id,
        name: ing.name,
        defaultPortion: ing.defaultPortion,
        calories: ing.calories,
        protein: ing.protein,
        carbs: ing.carbs,
        fats: ing.fats,
        authorName: ing.member.name,
        createdAt: ing.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get ingredients error:", error);
    return NextResponse.json(
      { error: "Failed to get ingredients" },
      { status: 500 }
    );
  }
}

// POST - Save a new ingredient to the library
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.userType !== "member") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      defaultPortion,
      calories,
      protein,
      carbs,
      fats,
      isShared = false,
    } = body;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Ingredient name is required" },
        { status: 400 }
      );
    }

    if (!defaultPortion || typeof defaultPortion !== "string") {
      return NextResponse.json(
        { error: "Default portion is required (e.g., '100g')" },
        { status: 400 }
      );
    }

    if (typeof calories !== "number" || calories < 0) {
      return NextResponse.json(
        { error: "Calories must be a positive number" },
        { status: 400 }
      );
    }

    // Get member's gymId
    const member = await prisma.member.findUnique({
      where: { id: session.userId },
      select: { gymId: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Create the ingredient
    const ingredient = await prisma.savedIngredient.create({
      data: {
        memberId: session.userId,
        gymId: member.gymId,
        name: name.trim(),
        defaultPortion: defaultPortion.trim(),
        calories,
        protein: protein ?? null,
        carbs: carbs ?? null,
        fats: fats ?? null,
        isShared,
      },
    });

    return NextResponse.json({
      success: true,
      ingredient: {
        id: ingredient.id,
        name: ingredient.name,
        defaultPortion: ingredient.defaultPortion,
        calories: ingredient.calories,
        protein: ingredient.protein,
        carbs: ingredient.carbs,
        fats: ingredient.fats,
        isShared: ingredient.isShared,
        createdAt: ingredient.createdAt,
      },
    });
  } catch (error) {
    console.error("Create ingredient error:", error);
    return NextResponse.json(
      { error: "Failed to create ingredient" },
      { status: 500 }
    );
  }
}
