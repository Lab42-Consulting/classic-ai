import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST as mealsPost, GET as mealsGet } from '@/app/api/member/meals/route'
import { POST as coachMealsPost } from '@/app/api/coach/member-meals/[memberId]/route'
import prisma from '@/lib/db'
import { getSession, getMemberFromSession } from '@/lib/auth'
import {
  mockMember,
  mockStaffCoach,
  mockStaffAdmin,
  mockMemberAuthResult,
  mockNoSessionError,
  mockStaffNoLinkedMemberError,
  mockStaffSession,
  mockAdminSession,
  mockMemberSession,
  mockCustomMeal,
  mockCoachMeal,
  mockSharedMeal,
  mockMealWithIngredients,
  mockCoachMealWithIngredients,
  mockMealIngredient,
  mockMealWithPhoto,
  mockPendingSharedMeal,
  mockValidPhotoBase64,
  mockOversizedPhoto,
  mockInvalidPhotoFormat,
  createMockRequest,
  createMockGetRequest,
} from '../mocks/fixtures'

describe('Meals API', () => {
  // =========================================================================
  // GET /api/member/meals - Get Member Meals
  // =========================================================================
  describe('GET /api/member/meals - Get Member Meals', () => {
    beforeEach(() => {
      vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
      vi.mocked(prisma.member.findUnique).mockResolvedValue({
        ...mockMember,
        gymId: mockMember.gymId,
      } as never)
    })

    describe('Authentication', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockNoSessionError)

        const request = createMockGetRequest()
        const response = await mealsGet(request as never)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.code).toBe('NO_SESSION')
      })

      it('should return 401 if staff without linked member', async () => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockStaffNoLinkedMemberError)

        const request = createMockGetRequest()
        const response = await mealsGet(request as never)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.code).toBe('STAFF_NO_LINKED_MEMBER')
      })
    })

    describe('Get All Meals', () => {
      it('should return own, coach, and shared meals', async () => {
        const allMeals = [
          mockMealWithIngredients,
          mockCoachMealWithIngredients,
          { ...mockSharedMeal, memberId: 'other-member', ingredients: [], member: { name: 'Other' }, createdByCoach: null },
        ]
        vi.mocked(prisma.customMeal.findMany).mockResolvedValue(allMeals as never)

        const request = createMockGetRequest()
        const response = await mealsGet(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.own).toBeDefined()
        expect(data.coach).toBeDefined()
        expect(data.shared).toBeDefined()
      })

      it('should filter by type=own', async () => {
        vi.mocked(prisma.customMeal.findMany).mockResolvedValue([mockMealWithIngredients] as never)

        const request = createMockGetRequest({ type: 'own' })
        const response = await mealsGet(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(prisma.customMeal.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              memberId: mockMemberAuthResult.memberId,
              createdByCoachId: null,
            }),
          })
        )
      })

      it('should filter by type=coach', async () => {
        vi.mocked(prisma.customMeal.findMany).mockResolvedValue([mockCoachMealWithIngredients] as never)

        const request = createMockGetRequest({ type: 'coach' })
        const response = await mealsGet(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(prisma.customMeal.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              memberId: mockMemberAuthResult.memberId,
              createdByCoachId: { not: null },
            }),
          })
        )
      })
    })
  })

  // =========================================================================
  // POST /api/member/meals - Create Member Meal
  // =========================================================================
  describe('POST /api/member/meals - Create Member Meal', () => {
    beforeEach(() => {
      vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
      vi.mocked(prisma.member.findUnique).mockResolvedValue({
        ...mockMember,
        gymId: mockMember.gymId,
      } as never)
    })

    describe('Authentication', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockNoSessionError)

        const request = createMockRequest({
          name: 'Test Meal',
          ingredients: [{ name: 'Chicken', portionSize: '150g', calories: 250 }],
        })
        const response = await mealsPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.code).toBe('NO_SESSION')
      })
    })

    describe('Validation', () => {
      it('should return 400 if meal name is missing', async () => {
        const request = createMockRequest({
          name: '',
          ingredients: [{ name: 'Chicken', portionSize: '150g', calories: 250 }],
        })
        const response = await mealsPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Meal name is required')
      })

      it('should return 400 if ingredients array is empty', async () => {
        const request = createMockRequest({
          name: 'Test Meal',
          ingredients: [],
        })
        const response = await mealsPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('At least one ingredient is required')
      })

      it('should return 400 if ingredient is missing required fields', async () => {
        const request = createMockRequest({
          name: 'Test Meal',
          ingredients: [{ name: 'Chicken' }], // Missing portionSize and calories
        })
        const response = await mealsPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Each ingredient must have name, portionSize, and calories')
      })
    })

    describe('Successful Creation', () => {
      it('should create meal with auto-calculated totals', async () => {
        const mealData = {
          ...mockCustomMeal,
          ingredients: [mockMealIngredient],
        }
        vi.mocked(prisma.customMeal.create).mockResolvedValue(mealData as never)

        const request = createMockRequest({
          name: 'Test Meal',
          ingredients: [
            { name: 'Chicken', portionSize: '150g', calories: 250, protein: 40, carbs: 0, fats: 8 },
          ],
          isManualTotal: false,
        })
        const response = await mealsPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.meal).toBeDefined()
      })

      it('should create meal with manual totals', async () => {
        const mealData = {
          ...mockCustomMeal,
          isManualTotal: true,
          totalCalories: 500,
          totalProtein: 50,
          ingredients: [mockMealIngredient],
        }
        vi.mocked(prisma.customMeal.create).mockResolvedValue(mealData as never)

        const request = createMockRequest({
          name: 'Test Meal',
          ingredients: [
            { name: 'Chicken', portionSize: '150g', calories: 250 },
          ],
          isManualTotal: true,
          totalCalories: 500,
          totalProtein: 50,
        })
        const response = await mealsPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      it('should create shared meal with pending approval (requires photo)', async () => {
        const mealData = {
          ...mockPendingSharedMeal,
          ingredients: [mockMealIngredient],
        }
        vi.mocked(prisma.customMeal.create).mockResolvedValue(mealData as never)

        const request = createMockRequest({
          name: 'Shared Meal',
          photoUrl: mockValidPhotoBase64, // Photo is required for sharing
          ingredients: [
            { name: 'Chicken', portionSize: '150g', calories: 250 },
          ],
          isShared: true,
        })
        const response = await mealsPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.meal.sharePending).toBe(true)
        expect(data.meal.shareApproved).toBe(false)
      })
    })
  })

  // =========================================================================
  // POST /api/coach/member-meals/[memberId] - Coach Creates Meal for Member
  // =========================================================================
  describe('POST /api/coach/member-meals/[memberId] - Coach Meal Creation', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockStaffSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffCoach as never)
      vi.mocked(prisma.coachAssignment.findFirst).mockResolvedValue({
        staffId: mockStaffCoach.id,
        memberId: mockMember.id,
      } as never)
      vi.mocked(prisma.member.findUnique).mockResolvedValue(mockMember as never)
    })

    describe('Authentication', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getSession).mockResolvedValue(null)

        const request = createMockRequest({
          name: 'Coach Meal',
          ingredients: [{ name: 'Chicken', portionSize: '150g', calories: 250 }],
        })
        const response = await coachMealsPost(request as never, { params: Promise.resolve({ memberId: mockMember.id }) })
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })

      it('should return 401 if session is member type', async () => {
        vi.mocked(getSession).mockResolvedValue({
          userId: mockMember.id,
          userType: 'member',
          gymId: mockMember.gymId,
          exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        })

        const request = createMockRequest({
          name: 'Coach Meal',
          ingredients: [{ name: 'Chicken', portionSize: '150g', calories: 250 }],
        })
        const response = await coachMealsPost(request as never, { params: Promise.resolve({ memberId: mockMember.id }) })
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })
    })

    describe('Authorization', () => {
      it('should return 403 if coach is not assigned to member', async () => {
        vi.mocked(prisma.coachAssignment.findFirst).mockResolvedValue(null)

        const request = createMockRequest({
          name: 'Coach Meal',
          ingredients: [{ name: 'Chicken', portionSize: '150g', calories: 250 }],
        })
        const response = await coachMealsPost(request as never, { params: Promise.resolve({ memberId: mockMember.id }) })
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error).toContain('not assigned')
      })
    })

    describe('Successful Creation', () => {
      it('should create meal with createdByCoachId set', async () => {
        const mealData = {
          ...mockCoachMeal,
          ingredients: [mockMealIngredient],
        }
        vi.mocked(prisma.customMeal.create).mockResolvedValue(mealData as never)

        const request = createMockRequest({
          name: 'Pre-Workout Meal',
          ingredients: [
            { name: 'Chicken', portionSize: '150g', calories: 250, protein: 40 },
          ],
        })
        const response = await coachMealsPost(request as never, { params: Promise.resolve({ memberId: mockMember.id }) })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(prisma.customMeal.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              createdByCoachId: mockStaffCoach.id,
              memberId: mockMember.id,
            }),
          })
        )
      })
    })
  })

  // =========================================================================
  // MEAL PHOTO TESTS
  // =========================================================================
  describe('Meal Photo Feature', () => {
    describe('Photo Validation', () => {
      beforeEach(() => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
        vi.mocked(prisma.member.findUnique).mockResolvedValue({
          ...mockMember,
          gymId: mockMember.gymId,
        } as never)
      })

      it('should create private meal without photo', async () => {
        vi.mocked(prisma.customMeal.create).mockResolvedValue({
          ...mockCustomMeal,
          ingredients: [mockMealIngredient],
        } as never)

        const request = createMockRequest({
          name: 'Test Meal',
          ingredients: [{ name: 'Chicken', portionSize: '150g', calories: 250 }],
          isShared: false,
        })

        const response = await mealsPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      it('should create meal with valid photo', async () => {
        vi.mocked(prisma.customMeal.create).mockResolvedValue({
          ...mockMealWithPhoto,
          ingredients: [mockMealIngredient],
        } as never)

        const request = createMockRequest({
          name: 'Test Meal with Photo',
          photoUrl: mockValidPhotoBase64,
          ingredients: [{ name: 'Chicken', portionSize: '150g', calories: 250 }],
        })

        const response = await mealsPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      it('should reject sharing without photo', async () => {
        const request = createMockRequest({
          name: 'Test Meal',
          ingredients: [{ name: 'Chicken', portionSize: '150g', calories: 250 }],
          isShared: true,
          // No photoUrl
        })

        const response = await mealsPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Photo is required when sharing a meal')
      })

      it('should reject oversized photo', async () => {
        const request = createMockRequest({
          name: 'Test Meal',
          photoUrl: mockOversizedPhoto,
          ingredients: [{ name: 'Chicken', portionSize: '150g', calories: 250 }],
        })

        const response = await mealsPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Photo too large. Max 1MB.')
      })

      it('should reject invalid photo format', async () => {
        const request = createMockRequest({
          name: 'Test Meal',
          photoUrl: mockInvalidPhotoFormat,
          ingredients: [{ name: 'Chicken', portionSize: '150g', calories: 250 }],
        })

        const response = await mealsPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Photo must be an image')
      })

      it('should allow sharing with valid photo', async () => {
        vi.mocked(prisma.customMeal.create).mockResolvedValue({
          ...mockPendingSharedMeal,
          ingredients: [mockMealIngredient],
        } as never)

        const request = createMockRequest({
          name: 'Shared Meal with Photo',
          photoUrl: mockValidPhotoBase64,
          ingredients: [{ name: 'Chicken', portionSize: '150g', calories: 250 }],
          isShared: true,
        })

        const response = await mealsPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.meal.sharePending).toBe(true)
      })
    })

    describe('Photo in GET Response', () => {
      beforeEach(() => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
        vi.mocked(prisma.member.findUnique).mockResolvedValue({
          ...mockMember,
          gymId: mockMember.gymId,
        } as never)
      })

      it('should include photoUrl in meal response', async () => {
        const mealWithPhoto = {
          ...mockMealWithPhoto,
          ingredients: [mockMealIngredient],
          member: { name: mockMember.name },
          createdByCoach: null,
        }
        vi.mocked(prisma.customMeal.findMany).mockResolvedValue([mealWithPhoto] as never)

        const request = createMockGetRequest()
        const response = await mealsGet(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.own[0].photoUrl).toBeDefined()
      })
    })
  })
})
