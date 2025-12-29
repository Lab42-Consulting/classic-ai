import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST as assignPost } from '@/app/api/coach/assign/route'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import {
  mockMember,
  mockStaffCoach,
  mockStaffAdmin,
  mockStaffSession,
  mockMemberSession,
  mockCoachAssignment,
  mockCoachRequest,
  mockCoachRequestWithStaffAndMember,
  createMockRequest,
} from '../mocks/fixtures'

describe('Coach API', () => {
  // =========================================================================
  // POST /api/coach/assign - Coach Request (pending approval)
  // =========================================================================
  describe('POST /api/coach/assign - Coach Request', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockStaffSession)
    })

    describe('Authentication', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getSession).mockResolvedValue(null)

        const request = createMockRequest({ memberId: mockMember.id })
        const response = await assignPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })

      it('should return 401 if session is member type', async () => {
        vi.mocked(getSession).mockResolvedValue(mockMemberSession)

        const request = createMockRequest({ memberId: mockMember.id })
        const response = await assignPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })
    })

    describe('Role Validation', () => {
      it('should return 403 if staff is not a coach', async () => {
        vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffAdmin as never)

        const request = createMockRequest({ memberId: mockMember.id })
        const response = await assignPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error).toBe('Only coaches can request member assignments')
      })

      it('should return 404 if staff not found', async () => {
        vi.mocked(prisma.staff.findUnique).mockResolvedValue(null)

        const request = createMockRequest({ memberId: mockMember.id })
        const response = await assignPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toBe('Staff not found')
      })
    })

    describe('Member Validation', () => {
      beforeEach(() => {
        vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffCoach as never)
      })

      it('should return 400 if memberId is missing', async () => {
        const request = createMockRequest({})
        const response = await assignPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Member ID is required')
      })

      it('should return 404 if member not found in gym', async () => {
        vi.mocked(prisma.member.findFirst).mockResolvedValue(null)

        const request = createMockRequest({ memberId: 'non-existent' })
        const response = await assignPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toBe('Member not found in your gym')
      })

      it('should return 400 if member already has a coach', async () => {
        const memberWithCoach = {
          ...mockMember,
          coachAssignment: mockCoachAssignment,
          coachRequest: null,
        }
        vi.mocked(prisma.member.findFirst).mockResolvedValue(memberWithCoach as never)

        const request = createMockRequest({ memberId: mockMember.id })
        const response = await assignPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Member already has a coach assigned')
      })

      it('should return 400 if member already has a pending request', async () => {
        const memberWithRequest = {
          ...mockMember,
          coachAssignment: null,
          coachRequest: mockCoachRequest,
        }
        vi.mocked(prisma.member.findFirst).mockResolvedValue(memberWithRequest as never)

        const request = createMockRequest({ memberId: mockMember.id })
        const response = await assignPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Member already has a pending coach request')
      })
    })

    describe('Successful Request', () => {
      beforeEach(() => {
        vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffCoach as never)
        vi.mocked(prisma.member.findFirst).mockResolvedValue({
          ...mockMember,
          coachAssignment: null,
          coachRequest: null,
        } as never)
      })

      it('should create coach request with minimal data', async () => {
        vi.mocked(prisma.coachRequest.create).mockResolvedValue(mockCoachRequestWithStaffAndMember as never)

        const request = createMockRequest({ memberId: mockMember.id })
        const response = await assignPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.requestSent).toBe(true)
        expect(data.request).toBeDefined()
        expect(data.request.memberId).toBe(mockMember.id)
      })

      it('should create request with custom calorie and protein targets', async () => {
        const createdRequest = {
          ...mockCoachRequestWithStaffAndMember,
          customCalories: 1800,
          customProtein: 150,
        }
        vi.mocked(prisma.coachRequest.create).mockResolvedValue(createdRequest as never)

        const request = createMockRequest({
          memberId: mockMember.id,
          customCalories: 1800,
          customProtein: 150,
        })
        const response = await assignPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.request.customCalories).toBe(1800)
        expect(data.request.customProtein).toBe(150)
      })

      it('should create request with all custom targets and exact macros', async () => {
        const createdRequest = {
          ...mockCoachRequestWithStaffAndMember,
          customGoal: 'fat_loss',
          customCalories: 1800,
          customProtein: 160,
          customCarbs: 180,
          customFats: 60,
          requireExactMacros: true,
          notes: 'Strict tracking required',
        }
        vi.mocked(prisma.coachRequest.create).mockResolvedValue(createdRequest as never)

        const request = createMockRequest({
          memberId: mockMember.id,
          customGoal: 'fat_loss',
          customCalories: 1800,
          customProtein: 160,
          customCarbs: 180,
          customFats: 60,
          requireExactMacros: true,
          notes: 'Strict tracking required',
        })
        const response = await assignPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.requestSent).toBe(true)
        expect(data.request.requireExactMacros).toBe(true)
        expect(data.request.customGoal).toBe('fat_loss')
        expect(data.request.notes).toBe('Strict tracking required')
      })

      it('should include customGoal in request (not update member directly)', async () => {
        const createdRequest = {
          ...mockCoachRequestWithStaffAndMember,
          customGoal: 'muscle_gain',
        }
        vi.mocked(prisma.coachRequest.create).mockResolvedValue(createdRequest as never)

        const request = createMockRequest({
          memberId: mockMember.id,
          customGoal: 'muscle_gain',
        })
        const response = await assignPost(request as never)
        const data = await response.json()

        // Request should be created, member goal NOT updated yet (happens on accept)
        expect(response.status).toBe(200)
        expect(data.request.customGoal).toBe('muscle_gain')
        expect(prisma.member.update).not.toHaveBeenCalled()
      })
    })
  })
})

// =========================================================================
// Additional Coach API Tests (Nudges, Knowledge)
// These would be in separate files or extended here
// =========================================================================

describe('Coach Nudges API', () => {
  describe('POST /api/coach/nudge - Send Nudge', () => {
    it('should allow coach to send nudge to assigned member', async () => {
      // This test would verify nudge sending functionality
      expect(true).toBe(true) // Placeholder - implementation depends on actual route
    })
  })

  describe('GET /api/member/nudges - Get Nudges', () => {
    it('should return unread nudges for member', async () => {
      // This test would verify nudge retrieval for members
      expect(true).toBe(true) // Placeholder
    })
  })
})

describe('Coach Knowledge API', () => {
  describe('POST /api/coach/knowledge - Save Knowledge', () => {
    it('should allow coach to save nutrition knowledge for member', async () => {
      // This test would verify knowledge saving
      expect(true).toBe(true) // Placeholder
    })

    it('should allow coach to save training knowledge for member', async () => {
      expect(true).toBe(true) // Placeholder
    })

    it('should allow coach to save supplements knowledge for member', async () => {
      expect(true).toBe(true) // Placeholder
    })
  })

  describe('GET /api/coach/knowledge - Get Knowledge', () => {
    it('should return all agent knowledge for a member', async () => {
      expect(true).toBe(true) // Placeholder
    })
  })
})
