import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, PATCH } from '@/app/api/member/profile/route'
import prisma from '@/lib/db'
import { getMemberFromSession } from '@/lib/auth'
import {
  mockMember,
  mockMemberAuthResult,
  mockNoSessionError,
  mockStaffNoLinkedMemberError,
  mockCoachAssignment,
  createMockRequest,
} from '../mocks/fixtures'

describe('Member Profile API', () => {
  // =========================================================================
  // GET /api/member/profile - Get Profile
  // =========================================================================
  describe('GET /api/member/profile', () => {
    beforeEach(() => {
      vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
    })

    describe('Authentication', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockNoSessionError)

        const response = await GET()
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.code).toBe('NO_SESSION')
      })

      it('should return 401 if staff without linked member', async () => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockStaffNoLinkedMemberError)

        const response = await GET()
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.code).toBe('STAFF_NO_LINKED_MEMBER')
      })
    })

    describe('Profile Retrieval', () => {
      it('should return member profile data', async () => {
        const memberWithCoach = {
          ...mockMember,
          coachAssignment: null,
        }
        vi.mocked(prisma.member.findUnique).mockResolvedValue(memberWithCoach as never)

        const response = await GET()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.id).toBe(mockMember.id)
        expect(data.memberId).toBe(mockMember.memberId)
        expect(data.name).toBe(mockMember.name)
        expect(data.goal).toBe(mockMember.goal)
        expect(data.weight).toBe(mockMember.weight)
        expect(data.height).toBe(mockMember.height)
        expect(data.locale).toBe(mockMember.locale)
        expect(data.requireExactMacros).toBe(false)
      })

      it('should return requireExactMacros from coach assignment', async () => {
        const memberWithCoach = {
          ...mockMember,
          coachAssignment: {
            requireExactMacros: true,
          },
        }
        vi.mocked(prisma.member.findUnique).mockResolvedValue(memberWithCoach as never)

        const response = await GET()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.requireExactMacros).toBe(true)
      })

      it('should return 404 if member not found', async () => {
        vi.mocked(prisma.member.findUnique).mockResolvedValue(null)

        const response = await GET()
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toBe('Member not found')
      })
    })
  })

  // =========================================================================
  // PATCH /api/member/profile - Update Profile
  // =========================================================================
  describe('PATCH /api/member/profile', () => {
    beforeEach(() => {
      vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
    })

    describe('Authentication', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockNoSessionError)

        const request = createMockRequest({ goal: 'muscle_gain' }, 'PATCH')
        const response = await PATCH(request as never)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.code).toBe('NO_SESSION')
      })

      it('should return 401 if staff without linked member', async () => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockStaffNoLinkedMemberError)

        const request = createMockRequest({ goal: 'muscle_gain' }, 'PATCH')
        const response = await PATCH(request as never)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.code).toBe('STAFF_NO_LINKED_MEMBER')
      })
    })

    describe('Goal Update', () => {
      it('should update goal to fat_loss', async () => {
        vi.mocked(prisma.member.update).mockResolvedValue({
          ...mockMember,
          goal: 'fat_loss',
        } as never)

        const request = createMockRequest({ goal: 'fat_loss' }, 'PATCH')
        const response = await PATCH(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(prisma.member.update).toHaveBeenCalledWith({
          where: { id: mockMemberAuthResult.memberId },
          data: { goal: 'fat_loss' },
          select: expect.any(Object),
        })
      })

      it('should update goal to muscle_gain', async () => {
        vi.mocked(prisma.member.update).mockResolvedValue({
          ...mockMember,
          goal: 'muscle_gain',
        } as never)

        const request = createMockRequest({ goal: 'muscle_gain' }, 'PATCH')
        const response = await PATCH(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      it('should update goal to recomposition', async () => {
        vi.mocked(prisma.member.update).mockResolvedValue({
          ...mockMember,
          goal: 'recomposition',
        } as never)

        const request = createMockRequest({ goal: 'recomposition' }, 'PATCH')
        const response = await PATCH(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      it('should return 400 for invalid goal', async () => {
        const request = createMockRequest({ goal: 'invalid_goal' }, 'PATCH')
        const response = await PATCH(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid goal')
      })
    })

    describe('Locale Update', () => {
      it('should update locale to Serbian', async () => {
        vi.mocked(prisma.member.update).mockResolvedValue({
          ...mockMember,
          locale: 'sr',
        } as never)

        const request = createMockRequest({ locale: 'sr' }, 'PATCH')
        const response = await PATCH(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      it('should update locale to English', async () => {
        vi.mocked(prisma.member.update).mockResolvedValue({
          ...mockMember,
          locale: 'en',
        } as never)

        const request = createMockRequest({ locale: 'en' }, 'PATCH')
        const response = await PATCH(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      it('should return 400 for invalid locale', async () => {
        const request = createMockRequest({ locale: 'fr' }, 'PATCH')
        const response = await PATCH(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid locale')
      })
    })

    describe('Weight/Height Update', () => {
      it('should update weight', async () => {
        vi.mocked(prisma.member.update).mockResolvedValue({
          ...mockMember,
          weight: 82.5,
        } as never)

        const request = createMockRequest({ weight: 82.5 }, 'PATCH')
        const response = await PATCH(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      it('should update height', async () => {
        vi.mocked(prisma.member.update).mockResolvedValue({
          ...mockMember,
          height: 182,
        } as never)

        const request = createMockRequest({ height: 182 }, 'PATCH')
        const response = await PATCH(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })
    })

    describe('Onboarding Status Update', () => {
      it('should update hasSeenOnboarding to true', async () => {
        vi.mocked(prisma.member.update).mockResolvedValue({
          ...mockMember,
          hasSeenOnboarding: true,
        } as never)

        const request = createMockRequest({ hasSeenOnboarding: true }, 'PATCH')
        const response = await PATCH(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })
    })

    describe('Multiple Fields Update', () => {
      it('should update multiple fields at once', async () => {
        vi.mocked(prisma.member.update).mockResolvedValue({
          ...mockMember,
          goal: 'muscle_gain',
          weight: 80,
          locale: 'en',
        } as never)

        const request = createMockRequest(
          { goal: 'muscle_gain', weight: 80, locale: 'en' },
          'PATCH'
        )
        const response = await PATCH(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(prisma.member.update).toHaveBeenCalledWith({
          where: { id: mockMemberAuthResult.memberId },
          data: expect.objectContaining({
            goal: 'muscle_gain',
            weight: 80,
            locale: 'en',
          }),
          select: expect.any(Object),
        })
      })
    })

    // =========================================================================
    // Difficulty Mode Updates
    // =========================================================================
    describe('Difficulty Mode Update', () => {
      it('should update difficultyMode to simple', async () => {
        vi.mocked(prisma.member.update).mockResolvedValue({
          ...mockMember,
          difficultyMode: 'simple',
        } as never)

        const request = createMockRequest({ difficultyMode: 'simple' }, 'PATCH')
        const response = await PATCH(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(prisma.member.update).toHaveBeenCalledWith({
          where: { id: mockMemberAuthResult.memberId },
          data: { difficultyMode: 'simple' },
          select: expect.any(Object),
        })
      })

      it('should update difficultyMode to standard', async () => {
        vi.mocked(prisma.member.update).mockResolvedValue({
          ...mockMember,
          difficultyMode: 'standard',
        } as never)

        const request = createMockRequest({ difficultyMode: 'standard' }, 'PATCH')
        const response = await PATCH(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      it('should update difficultyMode to pro', async () => {
        vi.mocked(prisma.member.update).mockResolvedValue({
          ...mockMember,
          difficultyMode: 'pro',
        } as never)

        const request = createMockRequest({ difficultyMode: 'pro' }, 'PATCH')
        const response = await PATCH(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      it('should return 400 for invalid difficultyMode', async () => {
        const request = createMockRequest({ difficultyMode: 'invalid' }, 'PATCH')
        const response = await PATCH(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid difficulty mode')
      })

      it('should allow updating difficultyMode even with coach assignment', async () => {
        // Unlike custom nutrition targets, difficulty mode can be changed even with a coach
        vi.mocked(prisma.member.update).mockResolvedValue({
          ...mockMember,
          difficultyMode: 'pro',
          coachAssignment: mockCoachAssignment,
        } as never)

        const request = createMockRequest({ difficultyMode: 'pro' }, 'PATCH')
        const response = await PATCH(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })
    })
  })
})
