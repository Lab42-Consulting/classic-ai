import { NextRequest, NextResponse } from "next/server";
import { getMemberFromSession, getMemberAuthErrorMessage } from "@/lib/auth";
import prisma from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";
import { checkAndIncrementPhotoAnalysisLimit, getPhotoAnalysisUsage, trackAIUsage } from "@/lib/ai/cache";

// Vision-based meal analysis prompt
const MEAL_ANALYSIS_PROMPT = `You are a nutrition expert analyzing a meal photo. Estimate the nutritional content based on what you see.

RULES:
1. Identify all visible food items and estimate portion sizes
2. Calculate total calories, protein, carbs, and fats for the entire meal
3. Be conservative with estimates - prefer slight underestimates
4. Consider the goal context: "fat_loss" = leaner estimates, "muscle_gain" = slightly higher protein
5. Round all values to whole numbers

RESPOND ONLY with valid JSON in this exact format (no markdown, no explanation):
{
  "description": "Brief meal description in Serbian (max 30 chars)",
  "items": ["item 1 ~Xg", "item 2 ~Xg"],
  "calories": NUMBER,
  "protein": NUMBER,
  "carbs": NUMBER,
  "fats": NUMBER,
  "confidence": "high" | "medium" | "low"
}

Examples:
- Grilled chicken with rice and salad → {"description":"Piletina sa risom","items":["piletina ~150g","beli pirinač ~100g","mešana salata ~80g"],"calories":520,"protein":45,"carbs":50,"fats":12,"confidence":"high"}
- Protein shake with banana → {"description":"Protein šejk sa bananom","items":["protein prah ~30g","banana ~100g","mleko ~200ml"],"calories":380,"protein":35,"carbs":40,"fats":8,"confidence":"high"}`;

interface MealAnalysis {
  description: string;
  items: string[];
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  confidence: "high" | "medium" | "low";
}

// Call Vision API to analyze meal photo
async function analyzeMealPhoto(
  photoBase64: string,
  goal: string,
  sizeHint?: string
): Promise<MealAnalysis | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not set");
    return null;
  }

  try {
    const client = new Anthropic({ apiKey });

    // Build context message
    let contextMessage = `Analyze this meal photo.`;
    if (goal) {
      contextMessage += ` User's goal: ${goal === "fat_loss" ? "fat loss" : goal === "muscle_gain" ? "muscle gain" : "recomposition"}.`;
    }
    if (sizeHint) {
      contextMessage += ` User indicated meal size is: ${sizeHint}.`;
    }

    // Determine media type from base64 prefix
    let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg";
    let cleanBase64 = photoBase64;

    if (photoBase64.startsWith("data:")) {
      const match = photoBase64.match(/^data:(image\/[a-z]+);base64,/);
      if (match) {
        mediaType = match[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
        cleanBase64 = photoBase64.replace(/^data:image\/[a-z]+;base64,/, "");
      }
    }

    const response = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 300,
      system: MEAL_ANALYSIS_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: cleanBase64,
              },
            },
            {
              type: "text",
              text: contextMessage,
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return null;
    }

    // Parse the JSON response
    const jsonStr = textBlock.text.trim();
    const analysis = JSON.parse(jsonStr) as MealAnalysis;

    // Validate the response
    if (
      typeof analysis.description !== "string" ||
      !Array.isArray(analysis.items) ||
      typeof analysis.calories !== "number" ||
      typeof analysis.protein !== "number" ||
      typeof analysis.carbs !== "number" ||
      typeof analysis.fats !== "number"
    ) {
      console.error("Invalid AI response format:", jsonStr);
      return null;
    }

    return {
      description: analysis.description.slice(0, 50),
      items: analysis.items.slice(0, 10),
      calories: Math.round(analysis.calories),
      protein: Math.round(analysis.protein),
      carbs: Math.round(analysis.carbs),
      fats: Math.round(analysis.fats),
      confidence: analysis.confidence || "medium",
    };
  } catch (error) {
    console.error("Vision API error:", error);
    return null;
  }
}

// POST - Analyze meal from photo
export async function POST(request: NextRequest) {
  try {
    // Authenticate member
    const authResult = await getMemberFromSession();
    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    const { memberId } = authResult;

    // Get member subscription status
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        subscriptionStatus: true,
        goal: true,
        gymId: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { photo, sizeHint, goal } = body;

    if (!photo || typeof photo !== "string") {
      return NextResponse.json(
        { error: "Photo is required (base64 encoded)" },
        { status: 400 }
      );
    }

    // Validate photo size (max ~1.4MB base64 = ~1MB binary)
    if (photo.length > 1400000) {
      return NextResponse.json(
        { error: "Photo too large. Maximum 1MB." },
        { status: 400 }
      );
    }

    // Check rate limit (Vision API is expensive - strict limits)
    const rateLimit = await checkAndIncrementPhotoAnalysisLimit(memberId, member.subscriptionStatus);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Daily photo analysis limit reached",
          remaining: rateLimit.remaining,
          limit: rateLimit.limit,
          message: "AI analiza nije dostupna (limit 3/dan). Koristi procenu na osnovu veličine obroka.",
        },
        { status: 429 }
      );
    }

    // Call Vision API
    const analysis = await analyzeMealPhoto(
      photo,
      goal || member.goal,
      sizeHint
    );

    if (!analysis) {
      return NextResponse.json(
        { error: "Could not analyze meal photo. Try again or use manual entry." },
        { status: 422 }
      );
    }

    // Track AI usage for gym budget monitoring
    // Approximate tokens: ~1500 input (image) + ~150 output
    await trackAIUsage(member.gymId, 1500, 150);

    return NextResponse.json({
      success: true,
      estimation: analysis,
      remaining: rateLimit.remaining,
      limit: rateLimit.limit,
    });
  } catch (error) {
    console.error("Analyze meal photo error:", error);
    return NextResponse.json(
      { error: "Failed to analyze meal photo" },
      { status: 500 }
    );
  }
}

// GET - Check current photo analysis usage/limits
export async function GET() {
  try {
    const authResult = await getMemberFromSession();
    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    const { memberId } = authResult;

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { subscriptionStatus: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const usage = await getPhotoAnalysisUsage(memberId, member.subscriptionStatus);

    return NextResponse.json({
      used: usage.used,
      remaining: usage.remaining,
      limit: usage.limit,
      available: usage.remaining > 0,
    });
  } catch (error) {
    console.error("Get photo usage error:", error);
    return NextResponse.json(
      { error: "Failed to get usage info" },
      { status: 500 }
    );
  }
}
