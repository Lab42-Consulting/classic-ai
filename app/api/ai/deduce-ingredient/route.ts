import { NextRequest, NextResponse } from "next/server";
import { getSession, getMemberFromSession, getMemberAuthErrorMessage } from "@/lib/auth";
import prisma from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";
import { lookupIngredient, searchIngredients } from "@/lib/nutrition/ingredient-lookup";
import { checkAndIncrementRateLimit } from "@/lib/ai/cache";

const INGREDIENT_DEDUCTION_PROMPT = `You are a nutrition database assistant. Given an ingredient name and portion size, provide accurate nutritional estimates.

RULES:
1. Provide values for the EXACT portion specified (not per 100g unless that's the portion)
2. Be conservative with estimates - prefer slight underestimates over overestimates
3. If the ingredient is unclear, provide values for the most common interpretation
4. Round all values to whole numbers

RESPOND ONLY with valid JSON in this exact format (no markdown, no explanation):
{"calories":NUMBER,"protein":NUMBER,"carbs":NUMBER,"fats":NUMBER}

Examples:
- "150g chicken breast" → {"calories":248,"protein":47,"carbs":0,"fats":5}
- "1 banana" → {"calories":89,"protein":1,"carbs":23,"fats":0}
- "2 eggs" → {"calories":156,"protein":13,"carbs":1,"fats":11}`;

interface DeducedNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}


// Call AI to deduce nutrition
async function callAI(name: string, portionSize: string): Promise<DeducedNutrition | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not set");
    return null;
  }

  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 100,
      system: INGREDIENT_DEDUCTION_PROMPT,
      messages: [
        {
          role: "user",
          content: `${portionSize} ${name}`,
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return null;
    }

    // Parse the JSON response
    const jsonStr = textBlock.text.trim();
    const nutrition = JSON.parse(jsonStr) as DeducedNutrition;

    // Validate the response
    if (
      typeof nutrition.calories !== "number" ||
      typeof nutrition.protein !== "number" ||
      typeof nutrition.carbs !== "number" ||
      typeof nutrition.fats !== "number"
    ) {
      console.error("Invalid AI response format:", jsonStr);
      return null;
    }

    return {
      calories: Math.round(nutrition.calories),
      protein: Math.round(nutrition.protein),
      carbs: Math.round(nutrition.carbs),
      fats: Math.round(nutrition.fats),
    };
  } catch (error) {
    console.error("AI deduction error:", error);
    return null;
  }
}

// POST - Deduce ingredient nutrition from name + portion
export async function POST(request: NextRequest) {
  try {
    // Check session first for staff detection
    const session = await getSession();

    if (!session || (session.userType !== "member" && session.userType !== "staff")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isStaff = session.userType === "staff";

    // For members (including staff with linked member accounts), resolve member ID
    let memberId: string | null = null;
    if (!isStaff) {
      const authResult = await getMemberFromSession();
      if ("error" in authResult) {
        return NextResponse.json(
          { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
          { status: 401 }
        );
      }
      memberId = authResult.memberId;
    }

    const body = await request.json();
    const { name, portionSize } = body;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Ingredient name is required" },
        { status: 400 }
      );
    }

    if (!portionSize || typeof portionSize !== "string" || portionSize.trim().length === 0) {
      return NextResponse.json(
        { error: "Portion size is required (e.g., '150g', '100ml')" },
        { status: 400 }
      );
    }

    // Step 1: Try static database lookup first (FREE, no rate limit)
    const dbResult = lookupIngredient(name.trim(), portionSize.trim());

    if (dbResult.found) {
      return NextResponse.json({
        success: true,
        source: "database",
        confidence: "high",
        ingredientName: dbResult.ingredient.name,
        ...dbResult.data,
      });
    }

    // Step 2: Check for similar ingredients in database (suggestions)
    const suggestions = searchIngredients(name.trim(), 3);

    // Step 3: Fall back to AI (requires rate limit check for members, not for staff)
    if (!isStaff && memberId) {
      // Member flow with rate limiting
      const member = await prisma.member.findUnique({
        where: { id: memberId },
        select: { subscriptionStatus: true },
      });

      if (!member) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }

      // Check and atomically increment rate limit (prevents race conditions)
      const rateLimit = await checkAndIncrementRateLimit(memberId, member.subscriptionStatus);

      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error: "Daily AI limit reached",
            remaining: rateLimit.remaining,
            limit: rateLimit.limit,
            suggestions: suggestions.map((s) => ({
              name: s.name,
              per100: s.per100,
            })),
          },
          { status: 429 }
        );
      }

      // Call AI (usage already incremented atomically above)
      const aiResult = await callAI(name.trim(), portionSize.trim());

      if (!aiResult) {
        return NextResponse.json(
          {
            error: "Could not determine nutrition values",
            suggestions: suggestions.map((s) => ({
              name: s.name,
              per100: s.per100,
            })),
          },
          { status: 422 }
        );
      }

      // Return AI result
      return NextResponse.json({
        success: true,
        source: "ai",
        confidence: "medium",
        ...aiResult,
        remaining: rateLimit.remaining,
        limit: rateLimit.limit,
      });
    }

    // Staff flow - no rate limiting
    const aiResult = await callAI(name.trim(), portionSize.trim());

    if (!aiResult) {
      return NextResponse.json(
        {
          error: "Could not determine nutrition values",
          suggestions: suggestions.map((s) => ({
            name: s.name,
            per100: s.per100,
          })),
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      source: "ai",
      confidence: "medium",
      ...aiResult,
    });
  } catch (error) {
    console.error("Deduce ingredient error:", error);
    return NextResponse.json(
      { error: "Failed to deduce ingredient nutrition" },
      { status: 500 }
    );
  }
}

// GET - Search/suggest ingredients from the static database
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || (session.userType !== "member" && session.userType !== "staff")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions = searchIngredients(query, 10);

    return NextResponse.json({
      suggestions: suggestions.map((s) => ({
        name: s.name,
        category: s.category,
        unit: s.unit,
        per100: s.per100,
      })),
    });
  } catch (error) {
    console.error("Search ingredients error:", error);
    return NextResponse.json(
      { error: "Failed to search ingredients" },
      { status: 500 }
    );
  }
}
