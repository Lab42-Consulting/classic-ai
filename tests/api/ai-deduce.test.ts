import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, GET } from '@/app/api/ai/deduce-ingredient/route'
import prisma from '@/lib/db'
import { getSession, getMemberFromSession } from '@/lib/auth'
import { checkAndIncrementRateLimit } from '@/lib/ai/cache'
import {
  mockMember,
  mockMemberAuthResult,
  mockNoSessionError,
  mockMemberSession,
  mockStaffSession,
  mockAIUsageDaily,
  createMockRequest,
  createMockGetRequest,
} from '../mocks/fixtures'

// Mock the ingredient lookup module
vi.mock('@/lib/nutrition/ingredient-lookup', () => ({
  lookupIngredient: vi.fn(),
  searchIngredients: vi.fn().mockReturnValue([]),
}))

import { lookupIngredient, searchIngredients } from '@/lib/nutrition/ingredient-lookup'

describe('AI Deduce Ingredient API', () => {
  // =========================================================================
  // POST /api/ai/deduce-ingredient - Deduce Ingredient Nutrition
  // =========================================================================
  describe('POST /api/ai/deduce-ingredient - Deduce Nutrition', () => {
    beforeEach(() => {
      // This endpoint uses getSession for staff detection, then getMemberFromSession for members
      vi.mocked(getSession).mockResolvedValue(mockMemberSession)
      vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
      vi.mocked(prisma.member.findUnique).mockResolvedValue(mockMember as never)
      vi.mocked(lookupIngredient).mockReturnValue({ found: false } as never)
      vi.mocked(searchIngredients).mockReturnValue([])
    })

    // -------------------------------------------------------------------------
    // Authentication Tests
    // -------------------------------------------------------------------------
    describe('Authentication', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getSession).mockResolvedValue(null)

        const request = createMockRequest({
          name: 'chicken breast',
          portionSize: '150g',
        })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })

      it('should allow member session', async () => {
        vi.mocked(lookupIngredient).mockReturnValue({
          found: true,
          ingredient: { name: 'Chicken Breast' },
          data: { calories: 248, protein: 47, carbs: 0, fats: 5 },
        } as never)

        const request = createMockRequest({
          name: 'chicken breast',
          portionSize: '150g',
        })
        const response = await POST(request as never)

        expect(response.status).toBe(200)
      })

      it('should allow staff session', async () => {
        vi.mocked(getSession).mockResolvedValue(mockStaffSession)
        vi.mocked(lookupIngredient).mockReturnValue({
          found: true,
          ingredient: { name: 'Chicken Breast' },
          data: { calories: 248, protein: 47, carbs: 0, fats: 5 },
        } as never)

        const request = createMockRequest({
          name: 'chicken breast',
          portionSize: '150g',
        })
        const response = await POST(request as never)

        expect(response.status).toBe(200)
      })
    })

    // -------------------------------------------------------------------------
    // Validation Tests
    // -------------------------------------------------------------------------
    describe('Validation', () => {
      it('should return 400 if ingredient name is missing', async () => {
        const request = createMockRequest({
          name: '',
          portionSize: '150g',
        })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Ingredient name is required')
      })

      it('should return 400 if portion size is missing', async () => {
        const request = createMockRequest({
          name: 'chicken breast',
          portionSize: '',
        })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Portion size is required')
      })
    })

    // -------------------------------------------------------------------------
    // Database Lookup Tests
    // -------------------------------------------------------------------------
    describe('Database Lookup', () => {
      it('should return database result when ingredient is found', async () => {
        vi.mocked(lookupIngredient).mockReturnValue({
          found: true,
          ingredient: { name: 'Chicken Breast' },
          data: { calories: 248, protein: 47, carbs: 0, fats: 5 },
        } as never)

        const request = createMockRequest({
          name: 'chicken breast',
          portionSize: '150g',
        })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.source).toBe('database')
        expect(data.confidence).toBe('high')
        expect(data.calories).toBe(248)
        expect(data.protein).toBe(47)
      })

      it('should not count toward rate limit when found in database', async () => {
        vi.mocked(lookupIngredient).mockReturnValue({
          found: true,
          ingredient: { name: 'Chicken Breast' },
          data: { calories: 248, protein: 47, carbs: 0, fats: 5 },
        } as never)

        const request = createMockRequest({
          name: 'chicken breast',
          portionSize: '150g',
        })
        await POST(request as never)

        // Should not upsert AI usage for database lookups
        expect(prisma.aIUsageDaily.upsert).not.toHaveBeenCalled()
      })
    })

    // -------------------------------------------------------------------------
    // Rate Limiting Tests (Member)
    // -------------------------------------------------------------------------
    describe('Rate Limiting (Member)', () => {
      beforeEach(() => {
        vi.mocked(lookupIngredient).mockReturnValue({ found: false } as never)
        vi.mocked(prisma.member.findUnique).mockResolvedValue({
          ...mockMember,
          subscriptionStatus: 'active',
        } as never)
      })

      it('should enforce rate limit for trial members (5/day)', async () => {
        vi.mocked(prisma.member.findUnique).mockResolvedValue({
          ...mockMember,
          subscriptionStatus: 'trial',
        } as never)
        // Mock rate limit check to return "not allowed"
        vi.mocked(checkAndIncrementRateLimit).mockResolvedValue({
          allowed: false,
          remaining: 0,
          limit: 5,
        })

        const request = createMockRequest({
          name: 'some ingredient',
          portionSize: '100g',
        })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(429)
        expect(data.error).toBe('Daily AI limit reached')
        expect(data.remaining).toBe(0)
        expect(data.limit).toBe(5)
      })

      it('should enforce rate limit for active members (20/day)', async () => {
        // Mock rate limit check to return "not allowed"
        vi.mocked(checkAndIncrementRateLimit).mockResolvedValue({
          allowed: false,
          remaining: 0,
          limit: 20,
        })

        const request = createMockRequest({
          name: 'some ingredient',
          portionSize: '100g',
        })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(429)
        expect(data.error).toBe('Daily AI limit reached')
        expect(data.limit).toBe(20)
      })

      it('should return 0 limit for expired subscriptions', async () => {
        vi.mocked(prisma.member.findUnique).mockResolvedValue({
          ...mockMember,
          subscriptionStatus: 'expired',
        } as never)
        // Mock rate limit check to return "not allowed" with 0 limit for expired
        vi.mocked(checkAndIncrementRateLimit).mockResolvedValue({
          allowed: false,
          remaining: 0,
          limit: 0,
        })

        const request = createMockRequest({
          name: 'some ingredient',
          portionSize: '100g',
        })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(429)
        expect(data.limit).toBe(0)
      })
    })

    // -------------------------------------------------------------------------
    // Staff Bypass Tests (No Rate Limit)
    // -------------------------------------------------------------------------
    describe('Staff Rate Limit Bypass', () => {
      beforeEach(() => {
        vi.mocked(getSession).mockResolvedValue(mockStaffSession)
        vi.mocked(lookupIngredient).mockReturnValue({ found: false } as never)
      })

      it('should not check rate limit for staff', async () => {
        // Even with high usage count, staff should succeed
        vi.mocked(prisma.aIUsageDaily.findUnique).mockResolvedValue({
          ...mockAIUsageDaily,
          count: 1000, // Very high count
        } as never)

        const request = createMockRequest({
          name: 'some ingredient',
          portionSize: '100g',
        })
        const response = await POST(request as never)

        // Should not return 429 for staff
        expect(response.status).not.toBe(429)
      })

      it('should not include remaining/limit in staff response', async () => {
        // Mock AI response for staff
        vi.mocked(lookupIngredient).mockReturnValue({
          found: true,
          ingredient: { name: 'Test' },
          data: { calories: 100, protein: 10, carbs: 10, fats: 5 },
        } as never)

        const request = createMockRequest({
          name: 'test ingredient',
          portionSize: '100g',
        })
        const response = await POST(request as never)
        const data = await response.json()

        // Staff response should not have rate limit info
        expect(data.remaining).toBeUndefined()
        expect(data.limit).toBeUndefined()
      })

      it('should not increment usage counter for staff', async () => {
        vi.mocked(lookupIngredient).mockReturnValue({
          found: true,
          ingredient: { name: 'Test' },
          data: { calories: 100, protein: 10, carbs: 10, fats: 5 },
        } as never)

        const request = createMockRequest({
          name: 'test ingredient',
          portionSize: '100g',
        })
        await POST(request as never)

        // Staff should not trigger usage upsert
        expect(prisma.aIUsageDaily.upsert).not.toHaveBeenCalled()
      })
    })
  })

  // =========================================================================
  // GET /api/ai/deduce-ingredient - Search Ingredients
  // =========================================================================
  describe('GET /api/ai/deduce-ingredient - Search Ingredients', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockMemberSession)
    })

    describe('Authentication', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getSession).mockResolvedValue(null)

        const request = createMockGetRequest({ q: 'chicken' })
        const response = await GET(request as never)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })

      it('should allow both member and staff sessions', async () => {
        vi.mocked(searchIngredients).mockReturnValue([
          { name: 'Chicken Breast', category: 'Protein', unit: 'g', per100: { calories: 165 } },
        ] as never)

        // Test member
        let request = createMockGetRequest({ q: 'chicken' })
        let response = await GET(request as never)
        expect(response.status).toBe(200)

        // Test staff
        vi.mocked(getSession).mockResolvedValue(mockStaffSession)
        request = createMockGetRequest({ q: 'chicken' })
        response = await GET(request as never)
        expect(response.status).toBe(200)
      })
    })

    describe('Search', () => {
      it('should return empty array for short queries', async () => {
        const request = createMockGetRequest({ q: 'a' })
        const response = await GET(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.suggestions).toEqual([])
      })

      it('should return suggestions for valid queries', async () => {
        vi.mocked(searchIngredients).mockReturnValue([
          { name: 'Chicken Breast', category: 'Protein', unit: 'g', per100: { calories: 165, protein: 31 } },
          { name: 'Chicken Thigh', category: 'Protein', unit: 'g', per100: { calories: 209, protein: 26 } },
        ] as never)

        const request = createMockGetRequest({ q: 'chicken' })
        const response = await GET(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.suggestions).toHaveLength(2)
        expect(data.suggestions[0].name).toBe('Chicken Breast')
      })
    })
  })
})
