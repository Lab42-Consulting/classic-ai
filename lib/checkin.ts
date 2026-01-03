/**
 * Daily rotating code generation for gym check-in
 *
 * The master secret is stored in the database.
 * A daily code is generated from hash(masterSecret + date).
 * This allows codes to change daily while keeping the master secret stable.
 */

import { createHash } from "crypto";

/**
 * Generate a daily check-in code from the master secret
 * The code changes at midnight UTC each day
 *
 * @param masterSecret - The gym's master checkinSecret from database
 * @param date - Optional date to generate code for (defaults to today)
 * @returns 8-character alphanumeric code (uppercase)
 */
export function generateDailyCode(masterSecret: string, date?: Date): string {
  const targetDate = date || new Date();
  // Use UTC date string (YYYY-MM-DD) to ensure consistency across timezones
  const dateString = targetDate.toISOString().split("T")[0];

  // Create hash from master secret + date
  const hash = createHash("sha256")
    .update(`${masterSecret}-${dateString}`)
    .digest("hex");

  // Take first 8 characters and make uppercase for readability
  return hash.substring(0, 8).toUpperCase();
}

/**
 * Validate a provided code against the daily codes
 * Checks both today's code and optionally yesterday's for grace period
 * (handles edge case of someone checking in right after midnight)
 *
 * @param masterSecret - The gym's master checkinSecret from database
 * @param providedCode - The code provided by the member (case-insensitive)
 * @param includeGracePeriod - If true, also accept yesterday's code (default: true)
 * @returns true if the code is valid
 */
export function isValidDailyCode(
  masterSecret: string,
  providedCode: string,
  includeGracePeriod: boolean = true
): boolean {
  const normalizedCode = providedCode.toUpperCase().trim();

  // Check today's code
  const todayCode = generateDailyCode(masterSecret);
  if (normalizedCode === todayCode) {
    return true;
  }

  // Check yesterday's code for grace period (first hour of the day)
  if (includeGracePeriod) {
    const now = new Date();
    const hourOfDay = now.getUTCHours();

    // Only allow yesterday's code in the first hour (0:00-0:59 UTC)
    // This handles edge case of members arriving just before midnight
    if (hourOfDay === 0) {
      const yesterday = new Date(now);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayCode = generateDailyCode(masterSecret, yesterday);
      if (normalizedCode === yesterdayCode) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get time until next code rotation (midnight UTC)
 * @returns Object with hours, minutes, and formatted string
 */
export function getTimeUntilRotation(): {
  hours: number;
  minutes: number;
  formatted: string;
} {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCDate(midnight.getUTCDate() + 1);
  midnight.setUTCHours(0, 0, 0, 0);

  const diffMs = midnight.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  let formatted: string;
  if (diffHours > 0) {
    formatted = `${diffHours}h ${diffMinutes}m`;
  } else {
    formatted = `${diffMinutes}m`;
  }

  return {
    hours: diffHours,
    minutes: diffMinutes,
    formatted,
  };
}
