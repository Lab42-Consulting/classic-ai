import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, GET } from '@/app/api/logs/route'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import {
  mockMember,
  mockMemberSession,
  mockStaffSession,
  mockMealLog,
  mockTrainingLog,
  mockWaterLog,
  mockExactMacroLog,
  mockMemberMuscleGain,
  mockMemberRecomp,
  createMockRequest,
  createMockGetRequest,
} from '../mocks/fixtures'

describe('Logs API', () => {
  // =========================================================================
  // POST /api/logs - Create Log
  // =========================================================================
  describe('POST /api/logs - Create Log', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockMemberSession)
      vi.mocked(prisma.member.findUnique).mockResolvedValue(mockMember as never)
    })

    // -------------------------------------------------------------------------
    // Authentication Tests
    // -------------------------------------------------------------------------
    describe('Authentication', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getSession).mockResolvedValue(null)

        const request = createMockRequest({ type: 'meal', mealSize: 'medium' })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })

      it('should return 401 if session is not member type', async () => {
        vi.mocked(getSession).mockResolvedValue(mockStaffSession)

        const request = createMockRequest({ type: 'meal', mealSize: 'medium' })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })
    })

    // -------------------------------------------------------------------------
    // Meal Logging - Preset Sizes
    // -------------------------------------------------------------------------
    describe('Meal Logging - Preset Sizes', () => {
      it('should log a small meal with estimated macros for fat_loss goal', async () => {
        vi.mocked(prisma.dailyLog.create).mockResolvedValue(mockMealLog as never)

        const request = createMockRequest({
          type: 'meal',
          mealSize: 'small',
          mealName: 'Salata',
        })

        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(prisma.dailyLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            type: 'meal',
            mealSize: 'small',
            mealName: 'Salata',
            estimatedCalories: 300, // fat_loss small = 300
            estimatedProtein: expect.any(Number),
            estimatedCarbs: expect.any(Number),
            estimatedFats: expect.any(Number),
          }),
        })
      })

      it('should log a medium meal with estimated macros for fat_loss goal', async () => {
        vi.mocked(prisma.dailyLog.create).mockResolvedValue(mockMealLog as never)

        const request = createMockRequest({
          type: 'meal',
          mealSize: 'medium',
          mealName: 'Piletina sa risom',
        })

        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(prisma.dailyLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            estimatedCalories: 500, // fat_loss medium = 500
          }),
        })
      })

      it('should log a large meal with estimated macros for fat_loss goal', async () => {
        vi.mocked(prisma.dailyLog.create).mockResolvedValue(mockMealLog as never)

        const request = createMockRequest({
          type: 'meal',
          mealSize: 'large',
        })

        const response = await POST(request as never)

        expect(prisma.dailyLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            estimatedCalories: 750, // fat_loss large = 750
          }),
        })
      })

      it('should estimate macros correctly for muscle_gain goal', async () => {
        vi.mocked(prisma.member.findUnique).mockResolvedValue(mockMemberMuscleGain as never)
        vi.mocked(prisma.dailyLog.create).mockResolvedValue(mockMealLog as never)

        const request = createMockRequest({
          type: 'meal',
          mealSize: 'medium',
        })

        const response = await POST(request as never)

        expect(prisma.dailyLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            estimatedCalories: 700, // muscle_gain medium = 700
          }),
        })
      })

      it('should estimate macros correctly for recomposition goal', async () => {
        vi.mocked(prisma.member.findUnique).mockResolvedValue(mockMemberRecomp as never)
        vi.mocked(prisma.dailyLog.create).mockResolvedValue(mockMealLog as never)

        const request = createMockRequest({
          type: 'meal',
          mealSize: 'medium',
        })

        const response = await POST(request as never)

        expect(prisma.dailyLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            estimatedCalories: 600, // recomposition medium = 600
          }),
        })
      })
    })

    // -------------------------------------------------------------------------
    // Meal Logging - Custom Calories
    // -------------------------------------------------------------------------
    describe('Meal Logging - Custom Calories', () => {
      it('should log a custom meal with provided calories', async () => {
        vi.mocked(prisma.dailyLog.create).mockResolvedValue(mockMealLog as never)

        const request = createMockRequest({
          type: 'meal',
          mealSize: 'custom',
          customCalories: 450,
          mealName: 'Custom meal',
        })

        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(prisma.dailyLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            mealSize: 'custom',
            estimatedCalories: 450,
          }),
        })
      })

      it('should log custom meal with optional protein', async () => {
        vi.mocked(prisma.dailyLog.create).mockResolvedValue(mockMealLog as never)

        const request = createMockRequest({
          type: 'meal',
          mealSize: 'custom',
          customCalories: 500,
          customProtein: 35,
          mealName: 'High protein meal',
        })

        const response = await POST(request as never)

        expect(prisma.dailyLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            estimatedCalories: 500,
            estimatedProtein: 35,
          }),
        })
      })

      it('should return 400 if custom calories not provided', async () => {
        const request = createMockRequest({
          type: 'meal',
          mealSize: 'custom',
        })

        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Custom calories are required')
      })

      it('should return 400 if custom calories is invalid', async () => {
        const request = createMockRequest({
          type: 'meal',
          mealSize: 'custom',
          customCalories: 'invalid',
        })

        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Custom calories are required')
      })

      it('should return 400 if custom calories is zero or negative', async () => {
        const request = createMockRequest({
          type: 'meal',
          mealSize: 'custom',
          customCalories: 0,
        })

        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Custom calories are required')
      })
    })

    // -------------------------------------------------------------------------
    // Meal Logging - Exact Macros
    // -------------------------------------------------------------------------
    describe('Meal Logging - Exact Macros', () => {
      it('should log exact macros meal with all required fields', async () => {
        vi.mocked(prisma.dailyLog.create).mockResolvedValue(mockExactMacroLog as never)

        const request = createMockRequest({
          type: 'meal',
          mealSize: 'exact',
          customProtein: 35,
          customCarbs: 45,
          customFats: 15,
          customCalories: 455, // Auto-calculated on frontend
          mealName: 'Tracked meal',
        })

        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(prisma.dailyLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            mealSize: 'exact',
            estimatedProtein: 35,
            estimatedCarbs: 45,
            estimatedFats: 15,
            estimatedCalories: 455,
          }),
        })
      })

      it('should return 400 if protein missing for exact macros', async () => {
        const request = createMockRequest({
          type: 'meal',
          mealSize: 'exact',
          customCarbs: 45,
          customFats: 15,
        })

        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Protein, carbs, and fats are required for exact macro logging')
      })

      it('should return 400 if carbs missing for exact macros', async () => {
        const request = createMockRequest({
          type: 'meal',
          mealSize: 'exact',
          customProtein: 35,
          customFats: 15,
        })

        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Protein, carbs, and fats are required for exact macro logging')
      })

      it('should return 400 if fats missing for exact macros', async () => {
        const request = createMockRequest({
          type: 'meal',
          mealSize: 'exact',
          customProtein: 35,
          customCarbs: 45,
        })

        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Protein, carbs, and fats are required for exact macro logging')
      })
    })

    // -------------------------------------------------------------------------
    // Training Logging
    // -------------------------------------------------------------------------
    describe('Training Logging', () => {
      it('should log training session', async () => {
        vi.mocked(prisma.dailyLog.create).mockResolvedValue(mockTrainingLog as never)

        const request = createMockRequest({ type: 'training' })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(prisma.dailyLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            type: 'training',
          }),
        })
      })
    })

    // -------------------------------------------------------------------------
    // Water Logging
    // -------------------------------------------------------------------------
    describe('Water Logging', () => {
      it('should log water intake', async () => {
        vi.mocked(prisma.dailyLog.create).mockResolvedValue(mockWaterLog as never)

        const request = createMockRequest({ type: 'water' })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(prisma.dailyLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            type: 'water',
          }),
        })
      })
    })

    // -------------------------------------------------------------------------
    // Validation Tests
    // -------------------------------------------------------------------------
    describe('Validation', () => {
      it('should return 400 for invalid log type', async () => {
        const request = createMockRequest({ type: 'invalid' })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid log type')
      })

      it('should return 400 for missing log type', async () => {
        const request = createMockRequest({})
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid log type')
      })

      it('should return 400 for meal without mealSize', async () => {
        const request = createMockRequest({ type: 'meal' })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Meal size is required')
      })

      it('should return 400 for invalid mealSize', async () => {
        const request = createMockRequest({ type: 'meal', mealSize: 'huge' })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Meal size is required')
      })

      it('should return 404 if member not found', async () => {
        vi.mocked(prisma.member.findUnique).mockResolvedValue(null)

        const request = createMockRequest({ type: 'training' })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toBe('Member not found')
      })
    })
  })

  // =========================================================================
  // GET /api/logs - Get Logs
  // =========================================================================
  describe('GET /api/logs - Get Logs', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockMemberSession)
    })

    describe('Authentication', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getSession).mockResolvedValue(null)

        const request = createMockGetRequest()
        const response = await GET(request as never)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })
    })

    describe("Get Today's Logs", () => {
      it("should return today's logs", async () => {
        const todayLogs = [mockMealLog, mockTrainingLog, mockWaterLog]
        vi.mocked(prisma.dailyLog.findMany).mockResolvedValue(todayLogs as never)

        const request = createMockGetRequest()
        const response = await GET(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.logs).toHaveLength(3)
      })

      it('should return empty array if no logs today', async () => {
        vi.mocked(prisma.dailyLog.findMany).mockResolvedValue([])

        const request = createMockGetRequest()
        const response = await GET(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.logs).toHaveLength(0)
      })
    })

    describe('Get Logs by Date', () => {
      it('should return logs for specific date', async () => {
        vi.mocked(prisma.dailyLog.findMany).mockResolvedValue([mockMealLog] as never)

        const request = createMockGetRequest({ date: '2024-12-25' })
        const response = await GET(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(prisma.dailyLog.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              memberId: mockMemberSession.userId,
            }),
          })
        )
      })
    })

    describe('Get History (Multiple Days)', () => {
      it('should return aggregated history for 30 days', async () => {
        const logsMultipleDays = [
          { ...mockMealLog, date: new Date('2024-12-27') },
          { ...mockTrainingLog, date: new Date('2024-12-27') },
          { ...mockMealLog, date: new Date('2024-12-26'), id: 'log-2' },
        ]
        vi.mocked(prisma.dailyLog.findMany).mockResolvedValue(logsMultipleDays as never)

        const request = createMockGetRequest({ days: '30' })
        const response = await GET(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(Array.isArray(data)).toBe(true)
        // Should be aggregated by date
        expect(data.length).toBeGreaterThanOrEqual(1)
      })

      it('should aggregate meals, training, and water by date', async () => {
        const sameDayLogs = [
          { ...mockMealLog, date: new Date('2024-12-27'), estimatedCalories: 500, estimatedProtein: 40 },
          { ...mockMealLog, date: new Date('2024-12-27'), id: 'meal-2', estimatedCalories: 600, estimatedProtein: 45 },
          { ...mockTrainingLog, date: new Date('2024-12-27') },
          { ...mockWaterLog, date: new Date('2024-12-27') },
          { ...mockWaterLog, date: new Date('2024-12-27'), id: 'water-2' },
        ]
        vi.mocked(prisma.dailyLog.findMany).mockResolvedValue(sameDayLogs as never)

        const request = createMockGetRequest({ days: '7' })
        const response = await GET(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        const dayData = data[0]
        expect(dayData.meals).toBe(2)
        expect(dayData.training).toBe(true)
        expect(dayData.water).toBe(2)
        expect(dayData.calories).toBe(1100)
        expect(dayData.protein).toBe(85)
      })
    })
  })
})
