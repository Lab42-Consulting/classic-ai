import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import {
  calculateConsistencyScore,
  calculateAvailableDays,
} from '@/lib/calculations'

describe('Calculations', () => {
  // =========================================================================
  // calculateAvailableDays
  // =========================================================================
  describe('calculateAvailableDays', () => {
    // Use fake timers for this entire describe block
    beforeAll(() => {
      vi.useFakeTimers()
    })

    afterAll(() => {
      vi.useRealTimers()
    })

    it('should return days passed in current week for established member', () => {
      // Mock: Wednesday, January 8, 2025
      vi.setSystemTime(new Date('2025-01-08T12:00:00Z'))

      const memberCreatedAt = new Date('2024-12-01T00:00:00Z') // Created long ago
      const weekResetAt = null
      const mondayOfThisWeek = new Date('2025-01-06T00:00:00Z')

      const result = calculateAvailableDays(memberCreatedAt, weekResetAt, mondayOfThisWeek)

      // Wednesday = day 3 of the week
      expect(result).toBe(3)
    })

    it('should return days since creation for new member this week', () => {
      // Mock: Wednesday, January 8, 2025
      vi.setSystemTime(new Date('2025-01-08T12:00:00Z'))

      const memberCreatedAt = new Date('2025-01-07T00:00:00Z') // Created yesterday (Tuesday)
      const weekResetAt = null
      const mondayOfThisWeek = new Date('2025-01-06T00:00:00Z')

      const result = calculateAvailableDays(memberCreatedAt, weekResetAt, mondayOfThisWeek)

      // Created yesterday, so 2 days available (yesterday + today)
      expect(result).toBe(2)
    })

    it('should use weekResetAt instead of createdAt when set', () => {
      // Mock: Wednesday, January 8, 2025
      vi.setSystemTime(new Date('2025-01-08T12:00:00Z'))

      const memberCreatedAt = new Date('2024-12-01T00:00:00Z') // Created long ago
      const weekResetAt = new Date('2025-01-07T00:00:00Z') // Reset yesterday
      const mondayOfThisWeek = new Date('2025-01-06T00:00:00Z')

      const result = calculateAvailableDays(memberCreatedAt, weekResetAt, mondayOfThisWeek)

      // Reset yesterday, so 2 days available
      expect(result).toBe(2)
    })

    it('should return 7 on Sunday for established member', () => {
      // Mock: Sunday, January 12, 2025
      vi.setSystemTime(new Date('2025-01-12T12:00:00Z'))

      const memberCreatedAt = new Date('2024-12-01T00:00:00Z')
      const weekResetAt = null
      const mondayOfThisWeek = new Date('2025-01-06T00:00:00Z')

      const result = calculateAvailableDays(memberCreatedAt, weekResetAt, mondayOfThisWeek)

      // Sunday = full week
      expect(result).toBe(7)
    })

    it('should return 1 for member who just signed up today', () => {
      // Mock: Wednesday, January 8, 2025
      vi.setSystemTime(new Date('2025-01-08T12:00:00Z'))

      const memberCreatedAt = new Date('2025-01-08T10:00:00Z') // Created earlier today
      const weekResetAt = null
      const mondayOfThisWeek = new Date('2025-01-06T00:00:00Z')

      const result = calculateAvailableDays(memberCreatedAt, weekResetAt, mondayOfThisWeek)

      // Just created today = 1 day
      expect(result).toBe(1)
    })

    it('should cap at 7 days maximum', () => {
      // Mock: Sunday, January 12, 2025
      vi.setSystemTime(new Date('2025-01-12T12:00:00Z'))

      const memberCreatedAt = new Date('2024-01-01T00:00:00Z') // Created a year ago
      const weekResetAt = null
      const mondayOfThisWeek = new Date('2025-01-06T00:00:00Z')

      const result = calculateAvailableDays(memberCreatedAt, weekResetAt, mondayOfThisWeek)

      // Never exceeds 7
      expect(result).toBeLessThanOrEqual(7)
    })
  })

  // =========================================================================
  // calculateConsistencyScore with availableDays normalization
  // =========================================================================
  describe('calculateConsistencyScore', () => {
    describe('Full week (7 days)', () => {
      it('should return perfect score for perfect week', () => {
        const score = calculateConsistencyScore({
          trainingSessions: 3,
          daysWithMeals: 7,
          avgCalorieAdherence: 100,
          avgProteinAdherence: 100,
          waterConsistency: 7,
          availableDays: 7,
        })

        expect(score).toBe(100)
      })

      it('should return 0 for no activity', () => {
        const score = calculateConsistencyScore({
          trainingSessions: 0,
          daysWithMeals: 0,
          avgCalorieAdherence: 0,
          avgProteinAdherence: 0,
          waterConsistency: 0,
          availableDays: 7,
        })

        expect(score).toBe(0)
      })

      it('should calculate mid-range score correctly', () => {
        const score = calculateConsistencyScore({
          trainingSessions: 2,
          daysWithMeals: 4,
          avgCalorieAdherence: 90,
          avgProteinAdherence: 80,
          waterConsistency: 4,
          availableDays: 7,
        })

        // Should be somewhere in the middle
        expect(score).toBeGreaterThan(30)
        expect(score).toBeLessThan(80)
      })
    })

    describe('Partial week (new member normalization)', () => {
      it('should give fair score for new member with 2 days', () => {
        // New member, 2 days available, perfect activity for those 2 days
        const score = calculateConsistencyScore({
          trainingSessions: 1, // 1 session in 2 days is proportionally good
          daysWithMeals: 2,
          avgCalorieAdherence: 100,
          avgProteinAdherence: 100,
          waterConsistency: 2,
          availableDays: 2,
        })

        // Should be high score - they did well for their available time
        expect(score).toBeGreaterThanOrEqual(80)
      })

      it('should give fair score for 3-day member', () => {
        const score = calculateConsistencyScore({
          trainingSessions: 1, // Expected ~1.3 for 3 days, so 1 is good
          daysWithMeals: 3,
          avgCalorieAdherence: 100,
          avgProteinAdherence: 100,
          waterConsistency: 3,
          availableDays: 3,
        })

        // Should be high score
        expect(score).toBeGreaterThanOrEqual(85)
      })

      it('should penalize poor performance even with short window', () => {
        const score = calculateConsistencyScore({
          trainingSessions: 0,
          daysWithMeals: 0,
          avgCalorieAdherence: 0,
          avgProteinAdherence: 0,
          waterConsistency: 0,
          availableDays: 3,
        })

        // Should be 0 - no activity
        expect(score).toBe(0)
      })

      it('should handle 1 day available', () => {
        const score = calculateConsistencyScore({
          trainingSessions: 0, // Can't expect training in 1 day
          daysWithMeals: 1,
          avgCalorieAdherence: 100,
          avgProteinAdherence: 100,
          waterConsistency: 1,
          availableDays: 1,
        })

        // 1 training expected for 1 day (ceil(1 * 3/7) = 1), but 0 done
        // However, other metrics should be good
        expect(score).toBeGreaterThan(40)
      })
    })

    describe('Edge cases', () => {
      it('should default to 7 days if availableDays not provided', () => {
        const scoreWithDays = calculateConsistencyScore({
          trainingSessions: 2,
          daysWithMeals: 4,
          avgCalorieAdherence: 90,
          avgProteinAdherence: 80,
          waterConsistency: 4,
          availableDays: 7,
        })

        const scoreWithoutDays = calculateConsistencyScore({
          trainingSessions: 2,
          daysWithMeals: 4,
          avgCalorieAdherence: 90,
          avgProteinAdherence: 80,
          waterConsistency: 4,
        })

        expect(scoreWithDays).toBe(scoreWithoutDays)
      })

      it('should clamp availableDays to minimum of 1', () => {
        const score = calculateConsistencyScore({
          trainingSessions: 1,
          daysWithMeals: 1,
          avgCalorieAdherence: 100,
          avgProteinAdherence: 100,
          waterConsistency: 1,
          availableDays: 0, // Invalid - should be treated as 1
        })

        expect(score).toBeGreaterThan(0)
      })

      it('should clamp score to max of 100', () => {
        const score = calculateConsistencyScore({
          trainingSessions: 10, // Way over expected
          daysWithMeals: 7,
          avgCalorieAdherence: 100,
          avgProteinAdherence: 200, // Over 100%
          waterConsistency: 7,
          availableDays: 7,
        })

        expect(score).toBeLessThanOrEqual(100)
      })

      it('should handle calorie/protein scores only when meals logged', () => {
        const scoreNoMeals = calculateConsistencyScore({
          trainingSessions: 3,
          daysWithMeals: 0, // No meals
          avgCalorieAdherence: 0,
          avgProteinAdherence: 0,
          waterConsistency: 7,
          availableDays: 7,
        })

        // Should have training (30) + water (10) = 40, no calorie/protein penalties
        expect(scoreNoMeals).toBe(40)
      })
    })
  })
})
