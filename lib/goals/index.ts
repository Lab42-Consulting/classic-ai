/**
 * Goal voting system utility functions
 * Handles goal status computation, voting eligibility, and helper functions
 */

export type GoalStatus = "draft" | "voting" | "fundraising" | "completed" | "cancelled";

interface GoalForStatus {
  status: string;
  votingEndsAt: Date | null;
  options: { id: string }[];
  winningOptionId: string | null;
}

/**
 * Compute the effective status of a goal based on dates and manual status
 * Status transitions: draft -> voting -> fundraising -> completed
 *
 * Note: For single-option goals, status goes directly from draft to fundraising
 */
export function getGoalStatus(goal: GoalForStatus): GoalStatus {
  const now = new Date();

  // Manual statuses are always respected
  if (goal.status === "draft" || goal.status === "cancelled" || goal.status === "completed") {
    return goal.status as GoalStatus;
  }

  // If in voting status, check if deadline has passed
  if (goal.status === "voting") {
    if (goal.votingEndsAt && now > new Date(goal.votingEndsAt)) {
      // Voting period has ended but status not yet updated
      // This will be handled by the API to transition to fundraising
      return "voting"; // Return as voting, API will handle transition
    }
    return "voting";
  }

  // Fundraising status
  if (goal.status === "fundraising") {
    return "fundraising";
  }

  return goal.status as GoalStatus;
}

/**
 * Check if voting is currently open for a goal
 */
export function canVote(goal: GoalForStatus): boolean {
  if (goal.status !== "voting") return false;
  if (!goal.votingEndsAt) return false;

  const now = new Date();
  return now <= new Date(goal.votingEndsAt);
}

/**
 * Check if a goal should transition from voting to fundraising
 * Used by API endpoints to auto-close expired voting
 */
export function shouldCloseVoting(goal: GoalForStatus): boolean {
  if (goal.status !== "voting") return false;
  if (!goal.votingEndsAt) return false;

  const now = new Date();
  return now > new Date(goal.votingEndsAt);
}

/**
 * Check if a goal is a single-option goal (skips voting phase)
 */
export function isSingleOptionGoal(optionCount: number): boolean {
  return optionCount === 1;
}

/**
 * Get days remaining until voting ends
 */
export function getDaysUntilVotingEnds(goal: { votingEndsAt: Date | null }): number {
  if (!goal.votingEndsAt) return 0;

  const now = new Date();
  const diffMs = new Date(goal.votingEndsAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Get hours remaining until voting ends (for countdown displays)
 */
export function getHoursUntilVotingEnds(goal: { votingEndsAt: Date | null }): number {
  if (!goal.votingEndsAt) return 0;

  const now = new Date();
  const diffMs = new Date(goal.votingEndsAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
}

/**
 * Calculate progress percentage for fundraising
 */
export function calculateProgress(currentAmount: number, targetAmount: number): number {
  if (targetAmount <= 0) return 0;
  return Math.min(100, Math.round((currentAmount / targetAmount) * 100));
}

/**
 * Calculate vote percentage for an option
 */
export function calculateVotePercentage(voteCount: number, totalVotes: number): number {
  if (totalVotes <= 0) return 0;
  return Math.round((voteCount / totalVotes) * 100);
}

/**
 * Convert amount from cents to euros
 */
export function centsToEuros(cents: number): number {
  return cents / 100;
}

/**
 * Convert amount from euros to cents
 */
export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

/**
 * Format amount for display (in euros)
 */
export function formatAmount(cents: number): string {
  const euros = centsToEuros(cents);
  return `${euros.toLocaleString("sr-RS")}€`;
}

/**
 * Format goal status for display (Serbian)
 */
export function getStatusLabel(status: GoalStatus): string {
  const labels: Record<GoalStatus, string> = {
    draft: "Nacrt",
    voting: "Glasanje",
    fundraising: "Prikupljanje",
    completed: "Završeno",
    cancelled: "Otkazano",
  };
  return labels[status];
}

/**
 * Get status badge color classes
 */
export function getStatusColor(status: GoalStatus): string {
  const colors: Record<GoalStatus, string> = {
    draft: "bg-gray-500/20 text-gray-400",
    voting: "bg-blue-500/20 text-blue-400",
    fundraising: "bg-amber-500/20 text-amber-400",
    completed: "bg-emerald-500/20 text-emerald-400",
    cancelled: "bg-red-500/20 text-red-400",
  };
  return colors[status];
}

/**
 * Get the winning option from a list of options
 * Winner is determined by highest vote count, with tie-breaking by displayOrder
 */
export function determineWinner<T extends { id: string; voteCount: number; displayOrder: number }>(
  options: T[]
): T | null {
  if (options.length === 0) return null;

  // Sort by voteCount DESC, then displayOrder ASC (lower = earlier = wins ties)
  const sorted = [...options].sort((a, b) => {
    if (b.voteCount !== a.voteCount) {
      return b.voteCount - a.voteCount;
    }
    return a.displayOrder - b.displayOrder;
  });

  return sorted[0];
}
