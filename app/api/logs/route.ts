import { NextRequest, NextResponse } from "next/server";
import { getMemberFromSession, getMemberAuthErrorMessage } from "@/lib/auth";
import prisma from "@/lib/db";
import { estimateMealMacros, Goal, MealSize } from "@/lib/calculations";

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
    const { type, mealSize, mealName, customCalories, customProtein, customCarbs, customFats } = body;

    if (!type || !["meal", "training", "water"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid log type" },
        { status: 400 }
      );
    }

    const member = await prisma.member.findUnique({
      where: { id: authResult.memberId },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    let logData: {
      memberId: string;
      type: string;
      mealSize?: string;
      mealName?: string;
      estimatedCalories?: number;
      estimatedProtein?: number;
      estimatedCarbs?: number;
      estimatedFats?: number;
    } = {
      memberId: authResult.memberId,
      type,
    };

    if (type === "meal") {
      if (!mealSize || !["small", "medium", "large", "custom", "exact", "saved"].includes(mealSize)) {
        return NextResponse.json(
          { error: "Meal size is required" },
          { status: 400 }
        );
      }

      if (mealSize === "saved") {
        // Saved meal - uses provided values from the custom meal
        if (!customCalories || typeof customCalories !== "number" || customCalories <= 0) {
          return NextResponse.json(
            { error: "Calories required for saved meal" },
            { status: 400 }
          );
        }

        logData = {
          ...logData,
          mealSize,
          mealName: mealName || undefined,
          estimatedCalories: customCalories,
          estimatedProtein: customProtein || undefined,
          estimatedCarbs: customCarbs || undefined,
          estimatedFats: customFats || undefined,
        };
      } else if (mealSize === "exact") {
        // Exact macros mode - coach requires P/C/F input
        if (!customProtein || !customCarbs || !customFats) {
          return NextResponse.json(
            { error: "Protein, carbs, and fats are required for exact macro logging" },
            { status: 400 }
          );
        }

        logData = {
          ...logData,
          mealSize,
          mealName: mealName || undefined,
          estimatedCalories: customCalories,
          estimatedProtein: customProtein,
          estimatedCarbs: customCarbs,
          estimatedFats: customFats,
        };
      } else if (mealSize === "custom") {
        // Custom meal with user-provided calories
        if (!customCalories || typeof customCalories !== "number" || customCalories <= 0) {
          return NextResponse.json(
            { error: "Custom calories are required" },
            { status: 400 }
          );
        }

        logData = {
          ...logData,
          mealSize,
          mealName: mealName || undefined,
          estimatedCalories: customCalories,
          estimatedProtein: customProtein && typeof customProtein === "number" ? customProtein : undefined,
        };
      } else {
        // Preset meal size with estimated macros
        const macros = estimateMealMacros(
          mealSize as MealSize,
          member.goal as Goal
        );

        logData = {
          ...logData,
          mealSize,
          mealName: mealName || undefined,
          estimatedCalories: macros.calories,
          estimatedProtein: macros.protein,
          estimatedCarbs: macros.carbs,
          estimatedFats: macros.fats,
        };
      }
    }

    const log = await prisma.dailyLog.create({
      data: logData,
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error("Log creation error:", error);
    return NextResponse.json(
      { error: "Failed to create log" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const daysParam = searchParams.get("days");

    let startDate: Date;
    let endDate: Date;

    // If days param is provided, fetch aggregated history
    if (daysParam) {
      const days = parseInt(daysParam, 10) || 30;
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const logs = await prisma.dailyLog.findMany({
        where: {
          memberId: authResult.memberId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: "desc" },
      });

      // Aggregate logs by date for history view
      const aggregatedByDate: Record<string, {
        date: string;
        meals: number;
        training: boolean;
        water: number;
        calories: number;
        protein: number;
      }> = {};

      logs.forEach((log) => {
        const dateStr = log.date.toISOString().split("T")[0];
        if (!aggregatedByDate[dateStr]) {
          aggregatedByDate[dateStr] = {
            date: dateStr,
            meals: 0,
            training: false,
            water: 0,
            calories: 0,
            protein: 0,
          };
        }

        if (log.type === "meal") {
          aggregatedByDate[dateStr].meals += 1;
          aggregatedByDate[dateStr].calories += log.estimatedCalories || 0;
          aggregatedByDate[dateStr].protein += log.estimatedProtein || 0;
        } else if (log.type === "training") {
          aggregatedByDate[dateStr].training = true;
        } else if (log.type === "water") {
          aggregatedByDate[dateStr].water += 1;
        }
      });

      return NextResponse.json(Object.values(aggregatedByDate));
    }

    // Single date query (original behavior)
    if (dateParam) {
      startDate = new Date(dateParam);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(dateParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    const logs = await prisma.dailyLog.findMany({
      where: {
        memberId: authResult.memberId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Get logs error:", error);
    return NextResponse.json(
      { error: "Failed to get logs" },
      { status: 500 }
    );
  }
}
