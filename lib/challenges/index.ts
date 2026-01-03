/**
 * Challenge utility functions
 * Handles challenge status computation, join eligibility, and streak calculations
 */

export type ChallengeStatus = "draft" | "upcoming" | "registration" | "active" | "ended";

interface ChallengeForStatus {
  startDate: Date;
  endDate: Date;
  joinDeadlineDays: number;
  status: string;
}

/**
 * Compute the effective status of a challenge based on dates and manual status
 * Status transitions: draft -> upcoming -> registration -> active -> ended
 */
export function getChallengeStatus(challenge: ChallengeForStatus): ChallengeStatus {
  const now = new Date();

  // If manually ended, return ended
  if (challenge.status === "ended") {
    return "ended";
  }

  // If manually set to draft (not published), keep as draft
  if (challenge.status === "draft") {
    return "draft";
  }

  // If before start date, it's upcoming (visible but can't join yet)
  if (now < new Date(challenge.startDate)) {
    return "upcoming";
  }

  // If past end date, it's ended
  if (now > new Date(challenge.endDate)) {
    return "ended";
  }

  // Calculate join deadline
  const joinDeadline = new Date(challenge.startDate);
  joinDeadline.setDate(joinDeadline.getDate() + challenge.joinDeadlineDays);

  // If within join deadline, it's in registration period
  if (now <= joinDeadline) {
    return "registration";
  }

  // Otherwise it's active (past registration, before end)
  return "active";
}

/**
 * Check if a member can join a challenge
 * Returns true if the challenge is in registration period
 */
export function canJoinChallenge(challenge: ChallengeForStatus): boolean {
  const status = getChallengeStatus(challenge);
  return status === "registration";
}

/**
 * Get the join deadline date for a challenge
 */
export function getJoinDeadline(challenge: { startDate: Date; joinDeadlineDays: number }): Date {
  const deadline = new Date(challenge.startDate);
  deadline.setDate(deadline.getDate() + challenge.joinDeadlineDays);
  return deadline;
}

/**
 * Get days remaining until join deadline
 */
export function getDaysUntilJoinDeadline(challenge: { startDate: Date; joinDeadlineDays: number }): number {
  const deadline = getJoinDeadline(challenge);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Get days remaining until challenge ends
 */
export function getDaysUntilEnd(challenge: { endDate: Date }): number {
  const now = new Date();
  const diffMs = new Date(challenge.endDate).getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Get days remaining until challenge starts
 */
export function getDaysUntilStart(challenge: { startDate: Date }): number {
  const now = new Date();
  const diffMs = new Date(challenge.startDate).getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

interface StreakResult {
  newStreak: number;
  awardBonus: boolean;
}

/**
 * Calculate streak bonus based on last active date
 * Awards bonus once per day for consecutive days of activity
 */
export function calculateStreakBonus(
  lastActiveDate: Date | null,
  currentStreak: number
): StreakResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // First activity ever
  if (!lastActiveDate) {
    return { newStreak: 1, awardBonus: true };
  }

  const lastActive = new Date(lastActiveDate);
  lastActive.setHours(0, 0, 0, 0);

  const diffDays = Math.floor(
    (today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    // Same day - no bonus, keep current streak
    return { newStreak: currentStreak, awardBonus: false };
  } else if (diffDays === 1) {
    // Consecutive day - increment streak, award bonus
    return { newStreak: currentStreak + 1, awardBonus: true };
  } else {
    // Streak broken - reset to 1, award bonus for new streak start
    return { newStreak: 1, awardBonus: true };
  }
}

/**
 * Format challenge status for display (Serbian)
 */
export function getStatusLabel(status: ChallengeStatus): string {
  const labels: Record<ChallengeStatus, string> = {
    draft: "Nacrt",
    upcoming: "Uskoro",
    registration: "Registracija",
    active: "Aktivno",
    ended: "Završeno",
  };
  return labels[status];
}

/**
 * Get status badge color classes
 */
export function getStatusColor(status: ChallengeStatus): string {
  const colors: Record<ChallengeStatus, string> = {
    draft: "bg-gray-500/20 text-gray-400",
    upcoming: "bg-amber-500/20 text-amber-400",
    registration: "bg-blue-500/20 text-blue-400",
    active: "bg-emerald-500/20 text-emerald-400",
    ended: "bg-foreground-muted/20 text-foreground-muted",
  };
  return colors[status];
}
