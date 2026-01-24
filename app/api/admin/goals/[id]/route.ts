import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { checkFeatureAccess } from "@/lib/subscription/guards";
import {
  getGoalStatus,
  isSingleOptionGoal,
  calculateProgress,
  centsToEuros,
  eurosToCents,
} from "@/lib/goals";
import { selectWinner, addContribution } from "@/lib/goals/voting";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/goals/[id]
 * Get goal details with options, votes, and contributions
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true, gymId: true },
    });

    if (!staff || staff.role.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const featureCheck = await checkFeatureAccess(staff.gymId, "challenges");
    if (!featureCheck.allowed) {
      return NextResponse.json(
        {
          error: featureCheck.error,
          code: "TIER_REQUIRED",
          requiredTier: featureCheck.requiredTier,
          currentTier: featureCheck.tier,
        },
        { status: 403 }
      );
    }

    const goal = await prisma.goal.findUnique({
      where: { id, gymId: staff.gymId },
      include: {
        options: {
          orderBy: [{ voteCount: "desc" }, { displayOrder: "asc" }],
        },
        contributions: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        _count: {
          select: { votes: true, contributions: true },
        },
      },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const totalVotes = goal.options.reduce((sum, opt) => sum + opt.voteCount, 0);
    const winningOption = goal.options.find((o) => o.id === goal.winningOptionId);
    const targetAmount = winningOption?.targetAmount ?? goal.options[0]?.targetAmount ?? 0;

    return NextResponse.json({
      goal: {
        id: goal.id,
        name: goal.name,
        description: goal.description,
        status: getGoalStatus(goal),
        isVisible: goal.isVisible,
        votingEndsAt: goal.votingEndsAt,
        votingEndedAt: goal.votingEndedAt,
        completedAt: goal.completedAt,
        createdAt: goal.createdAt,
        updatedAt: goal.updatedAt,
        // Voting info
        totalVotes,
        voteCount: goal._count.votes,
        // Fundraising info
        currentAmount: centsToEuros(goal.currentAmount),
        targetAmount: centsToEuros(targetAmount),
        progressPercentage: calculateProgress(goal.currentAmount, targetAmount),
        contributionCount: goal._count.contributions,
        // Options
        options: goal.options.map((opt) => ({
          id: opt.id,
          name: opt.name,
          description: opt.description,
          imageUrl: opt.imageUrl,
          targetAmount: centsToEuros(opt.targetAmount),
          voteCount: opt.voteCount,
          percentage: totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0,
          isWinner: opt.id === goal.winningOptionId,
          displayOrder: opt.displayOrder,
        })),
        winningOptionId: goal.winningOptionId,
        // Contributions (most recent 50)
        contributions: goal.contributions.map((c) => ({
          id: c.id,
          amount: centsToEuros(c.amount),
          source: c.source,
          memberName: c.memberName,
          note: c.note,
          createdAt: c.createdAt,
        })),
        isSingleOption: isSingleOptionGoal(goal.options.length),
      },
    });
  } catch (error) {
    console.error("Error fetching goal:", error);
    return NextResponse.json({ error: "Failed to fetch goal" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/goals/[id]
 * Update goal, perform actions (publish, close_voting, cancel), or add contribution
 *
 * Request body can include:
 * - Regular updates: name, description, isVisible, votingEndsAt
 * - Actions: action ("publish" | "close_voting" | "cancel")
 * - Manual contribution: addAmount (euros), addNote
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true, gymId: true },
    });

    if (!staff || staff.role.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const featureCheck = await checkFeatureAccess(staff.gymId, "challenges");
    if (!featureCheck.allowed) {
      return NextResponse.json(
        {
          error: featureCheck.error,
          code: "TIER_REQUIRED",
          requiredTier: featureCheck.requiredTier,
          currentTier: featureCheck.tier,
        },
        { status: 403 }
      );
    }

    const goal = await prisma.goal.findUnique({
      where: { id, gymId: staff.gymId },
      include: { options: true },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const body = await request.json();
    const { action, name, description, isVisible, votingEndsAt, addAmount, addNote } = body;

    // Handle actions
    if (action) {
      switch (action) {
        case "publish": {
          if (goal.status !== "draft") {
            return NextResponse.json(
              { error: "Samo nacrti mogu biti objavljeni" },
              { status: 400 }
            );
          }

          const isSingle = isSingleOptionGoal(goal.options.length);

          if (isSingle) {
            // Single option: go directly to fundraising
            await prisma.goal.update({
              where: { id },
              data: {
                status: "fundraising",
                winningOptionId: goal.options[0].id,
              },
            });
          } else {
            // Multiple options: start voting
            if (!goal.votingEndsAt) {
              return NextResponse.json(
                { error: "Rok za glasanje je obavezan za objavu" },
                { status: 400 }
              );
            }

            await prisma.goal.update({
              where: { id },
              data: { status: "voting" },
            });
          }

          return NextResponse.json({ success: true, action: "published" });
        }

        case "close_voting": {
          if (goal.status !== "voting") {
            return NextResponse.json(
              { error: "Glasanje nije aktivno" },
              { status: 400 }
            );
          }

          const result = await selectWinner(id);

          if (!result.success) {
            return NextResponse.json(
              { error: result.error || "Greška pri zatvaranju glasanja" },
              { status: 500 }
            );
          }

          return NextResponse.json({
            success: true,
            action: "voting_closed",
            winningOption: result.winningOption,
          });
        }

        case "cancel": {
          if (goal.status === "completed") {
            return NextResponse.json(
              { error: "Završeni ciljevi ne mogu biti otkazani" },
              { status: 400 }
            );
          }

          await prisma.goal.update({
            where: { id },
            data: { status: "cancelled" },
          });

          return NextResponse.json({ success: true, action: "cancelled" });
        }

        default:
          return NextResponse.json({ error: "Nepoznata akcija" }, { status: 400 });
      }
    }

    // Handle manual contribution
    if (addAmount !== undefined && addAmount > 0) {
      if (goal.status !== "fundraising") {
        return NextResponse.json(
          { error: "Doprinosi su mogući samo u fazi prikupljanja" },
          { status: 400 }
        );
      }

      const result = await addContribution(
        id,
        eurosToCents(addAmount),
        "manual",
        undefined,
        undefined,
        addNote || "Ručni unos"
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Greška pri dodavanju doprinosa" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        completed: result.completed,
        message: result.completed ? "Cilj je dostignut!" : "Doprinos je dodat",
      });
    }

    // Handle regular field updates
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json({ error: "Naziv ne može biti prazan" }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (isVisible !== undefined) {
      updateData.isVisible = Boolean(isVisible);
    }

    if (votingEndsAt !== undefined) {
      if (goal.status !== "draft" && goal.status !== "voting") {
        return NextResponse.json(
          { error: "Rok za glasanje može se menjati samo za nacrte i aktivna glasanja" },
          { status: 400 }
        );
      }

      if (votingEndsAt) {
        const deadline = new Date(votingEndsAt);
        if (deadline <= new Date()) {
          return NextResponse.json(
            { error: "Rok za glasanje mora biti u budućnosti" },
            { status: 400 }
          );
        }
        updateData.votingEndsAt = deadline;
      } else {
        updateData.votingEndsAt = null;
      }
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.goal.update({
        where: { id },
        data: updateData,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating goal:", error);
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/goals/[id]
 * Delete a goal (only drafts with no votes)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true, gymId: true },
    });

    if (!staff || staff.role.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const featureCheck = await checkFeatureAccess(staff.gymId, "challenges");
    if (!featureCheck.allowed) {
      return NextResponse.json(
        {
          error: featureCheck.error,
          code: "TIER_REQUIRED",
          requiredTier: featureCheck.requiredTier,
          currentTier: featureCheck.tier,
        },
        { status: 403 }
      );
    }

    const goal = await prisma.goal.findUnique({
      where: { id, gymId: staff.gymId },
      include: {
        _count: {
          select: { votes: true, contributions: true },
        },
      },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Only allow deletion of drafts with no votes or contributions
    if (goal.status !== "draft") {
      return NextResponse.json(
        { error: "Samo nacrti mogu biti obrisani" },
        { status: 400 }
      );
    }

    if (goal._count.votes > 0) {
      return NextResponse.json(
        { error: "Cilj ima glasove i ne može biti obrisan" },
        { status: 400 }
      );
    }

    if (goal._count.contributions > 0) {
      return NextResponse.json(
        { error: "Cilj ima doprinose i ne može biti obrisan" },
        { status: 400 }
      );
    }

    // Delete goal (cascade will delete options)
    await prisma.goal.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting goal:", error);
    return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 });
  }
}
