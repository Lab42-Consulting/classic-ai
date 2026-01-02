import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.userType !== "member") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const member = await prisma.member.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        memberId: true,
        name: true,
        avatarUrl: true,
        height: true,
        weight: true,
        gender: true,
        goal: true,
        status: true,
        subscriptionStatus: true,
        locale: true,
        hasSeenOnboarding: true,
        createdAt: true,
        // Custom targets set by member
        customCalories: true,
        customProtein: true,
        customCarbs: true,
        customFats: true,
        coachAssignment: {
          select: {
            requireExactMacros: true,
            customCalories: true,
            customProtein: true,
            customCarbs: true,
            customFats: true,
            staff: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Flatten coach assignment settings
    return NextResponse.json({
      ...member,
      requireExactMacros: member.coachAssignment?.requireExactMacros || false,
      hasCoach: !!member.coachAssignment,
      coachName: member.coachAssignment?.staff?.name || null,
      // Coach targets (if assigned)
      coachCalories: member.coachAssignment?.customCalories || null,
      coachProtein: member.coachAssignment?.customProtein || null,
      coachCarbs: member.coachAssignment?.customCarbs || null,
      coachFats: member.coachAssignment?.customFats || null,
      coachAssignment: undefined,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: "Failed to get profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    console.log("PATCH /api/member/profile - session:", session ? { userId: session.userId, userType: session.userType } : null);

    if (!session || session.userType !== "member") {
      console.log("PATCH /api/member/profile - Unauthorized: no valid member session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("PATCH /api/member/profile - body:", body);
    const { goal, weight, height, locale, hasSeenOnboarding, customCalories, customProtein, customCarbs, customFats } = body;

    // Check if member has a coach (targets cannot be changed if they have one)
    const isUpdatingTargets = customCalories !== undefined || customProtein !== undefined ||
                              customCarbs !== undefined || customFats !== undefined;

    if (isUpdatingTargets) {
      const existingMember = await prisma.member.findUnique({
        where: { id: session.userId },
        select: { coachAssignment: { select: { id: true } } },
      });

      if (existingMember?.coachAssignment) {
        return NextResponse.json(
          { error: "Cannot modify targets while assigned to a coach. Contact your coach to adjust your targets." },
          { status: 403 }
        );
      }
    }

    // Validate goal if provided
    if (goal && !["fat_loss", "muscle_gain", "recomposition"].includes(goal)) {
      return NextResponse.json(
        { error: "Invalid goal" },
        { status: 400 }
      );
    }

    // Validate locale if provided
    if (locale && !["sr", "en"].includes(locale)) {
      return NextResponse.json(
        { error: "Invalid locale" },
        { status: 400 }
      );
    }

    // Validate custom targets if provided
    if (customCalories !== undefined && customCalories !== null) {
      const cal = parseInt(customCalories);
      if (isNaN(cal) || cal < 800 || cal > 10000) {
        return NextResponse.json(
          { error: "Calories must be between 800 and 10000" },
          { status: 400 }
        );
      }
    }

    if (customProtein !== undefined && customProtein !== null) {
      const prot = parseInt(customProtein);
      if (isNaN(prot) || prot < 0 || prot > 500) {
        return NextResponse.json(
          { error: "Protein must be between 0 and 500g" },
          { status: 400 }
        );
      }
    }

    if (customCarbs !== undefined && customCarbs !== null) {
      const carb = parseInt(customCarbs);
      if (isNaN(carb) || carb < 0 || carb > 1000) {
        return NextResponse.json(
          { error: "Carbs must be between 0 and 1000g" },
          { status: 400 }
        );
      }
    }

    if (customFats !== undefined && customFats !== null) {
      const fat = parseInt(customFats);
      if (isNaN(fat) || fat < 0 || fat > 500) {
        return NextResponse.json(
          { error: "Fats must be between 0 and 500g" },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: {
      goal?: string;
      weight?: number;
      height?: number;
      locale?: string;
      hasSeenOnboarding?: boolean;
      customCalories?: number | null;
      customProtein?: number | null;
      customCarbs?: number | null;
      customFats?: number | null;
    } = {};

    if (goal) updateData.goal = goal;
    if (weight !== undefined) updateData.weight = parseFloat(weight);
    if (height !== undefined) updateData.height = parseFloat(height);
    if (locale) updateData.locale = locale;
    if (typeof hasSeenOnboarding === "boolean") updateData.hasSeenOnboarding = hasSeenOnboarding;

    // Handle custom targets (allow setting to null to reset to auto-calculated)
    if (customCalories !== undefined) {
      updateData.customCalories = customCalories === null ? null : parseInt(customCalories);
    }
    if (customProtein !== undefined) {
      updateData.customProtein = customProtein === null ? null : parseInt(customProtein);
    }
    if (customCarbs !== undefined) {
      updateData.customCarbs = customCarbs === null ? null : parseInt(customCarbs);
    }
    if (customFats !== undefined) {
      updateData.customFats = customFats === null ? null : parseInt(customFats);
    }

    console.log("PATCH /api/member/profile - updateData:", updateData);
    console.log("PATCH /api/member/profile - updating member:", session.userId);

    const member = await prisma.member.update({
      where: { id: session.userId },
      data: updateData,
      select: {
        id: true,
        goal: true,
        weight: true,
        height: true,
        locale: true,
        hasSeenOnboarding: true,
        customCalories: true,
        customProtein: true,
        customCarbs: true,
        customFats: true,
      },
    });

    console.log("PATCH /api/member/profile - success:", member);
    return NextResponse.json({ success: true, member });
  } catch (error) {
    console.error("Update profile error:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
