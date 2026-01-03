import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as MemberGET, POST as MemberPOST } from '@/app/api/member/gym-checkin/route'
import { GET as AdminGET, POST as AdminPOST, DELETE as AdminDELETE } from '@/app/api/admin/gym-checkin/route'
import prisma from '@/lib/db'
import { getMemberFromSession, getSession } from '@/lib/auth'
import { generateDailyCode } from '@/lib/checkin'
import {
  mockMember,
  mockMemberAuthResult,
  mockNoSessionError,
  mockStaffNoLinkedMemberError,
  mockGymWithCheckin,
  mockGymWithoutCheckin,
  mockGymCheckin,
  mockStaffAdmin,
  mockAdminSession,
  mockStaffCoach,
  mockStaffSession,
  mockChallenge,
  mockChallengeParticipant,
  createMockRequest,
} from '../mocks/fixtures'

describe('Gym Check-in API', () => {
  // ===========================================================================
  // Member API: POST /api/member/gym-checkin
  // ===========================================================================
  describe('POST /api/member/gym-checkin', () => {
    describe('Authentication', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockNoSessionError)

        const request = createMockRequest({ secret: 'test-secret' })
        const response = await MemberPOST(request as never)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.code).toBe('NO_SESSION')
      })

      it('should return 401 if staff without linked member', async () => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockStaffNoLinkedMemberError)

        const request = createMockRequest({ secret: 'test-secret' })
        const response = await MemberPOST(request as never)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.code).toBe('STAFF_NO_LINKED_MEMBER')
      })
    })

    describe('Validation', () => {
      beforeEach(() => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
      })

      it('should return 400 if secret is missing', async () => {
        const request = createMockRequest({})
        const response = await MemberPOST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Nedostaje kod za prijavu')
      })

      it('should return 404 if member not found', async () => {
        vi.mocked(prisma.member.findUnique).mockResolvedValue(null)

        const request = createMockRequest({ secret: 'test-secret' })
        const response = await MemberPOST(request as never)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toBe('Član nije pronađen')
      })

      it('should return 400 if gym has no check-in secret', async () => {
        vi.mocked(prisma.member.findUnique).mockResolvedValue({
          gymId: mockGymWithoutCheckin.id,
          gym: mockGymWithoutCheckin,
        } as never)

        const request = createMockRequest({ secret: 'test-secret' })
        const response = await MemberPOST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Teretana nema aktiviran sistem prijave')
      })

      it('should return 400 if secret does not match', async () => {
        vi.mocked(prisma.member.findUnique).mockResolvedValue({
          gymId: mockGymWithCheckin.id,
          gym: mockGymWithCheckin,
        } as never)

        const request = createMockRequest({ secret: 'wrong-secret' })
        const response = await MemberPOST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Nevažeći ili istekao kod za prijavu')
      })
    })

    describe('Check-in Creation', () => {
      beforeEach(() => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
        vi.mocked(prisma.member.findUnique).mockResolvedValue({
          gymId: mockGymWithCheckin.id,
          gym: mockGymWithCheckin,
        } as never)
      })

      it('should create new check-in successfully', async () => {
        vi.mocked(prisma.gymCheckin.findUnique).mockResolvedValue(null)
        vi.mocked(prisma.gymCheckin.create).mockResolvedValue(mockGymCheckin as never)

        // Use the daily code generated from the master secret
        const dailyCode = generateDailyCode(mockGymWithCheckin.checkinSecret!)
        const request = createMockRequest({ secret: dailyCode })
        const response = await MemberPOST(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.alreadyCheckedIn).toBe(false)
        expect(data.checkinId).toBeDefined()
      })

      it('should return already checked in if duplicate', async () => {
        vi.mocked(prisma.gymCheckin.findUnique).mockResolvedValue(mockGymCheckin as never)

        // Use the daily code generated from the master secret
        const dailyCode = generateDailyCode(mockGymWithCheckin.checkinSecret!)
        const request = createMockRequest({ secret: dailyCode })
        const response = await MemberPOST(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.alreadyCheckedIn).toBe(true)
        expect(data.message).toBe('Već si prijavljen danas')
      })
    })
  })

  // ===========================================================================
  // Member API: GET /api/member/gym-checkin
  // ===========================================================================
  describe('GET /api/member/gym-checkin', () => {
    describe('Authentication', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockNoSessionError)

        const response = await MemberGET()
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.code).toBe('NO_SESSION')
      })
    })

    describe('Check-in Status', () => {
      beforeEach(() => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
      })

      it('should return checked in status when checked in today', async () => {
        vi.mocked(prisma.gymCheckin.findUnique).mockResolvedValue(mockGymCheckin as never)
        vi.mocked(prisma.member.findUnique).mockResolvedValue({
          gymId: mockGymWithCheckin.id,
          challengeParticipations: [],
        } as never)

        const response = await MemberGET()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.checkedInToday).toBe(true)
        expect(data.isInActiveChallenge).toBe(false)
      })

      it('should return not checked in when no check-in today', async () => {
        vi.mocked(prisma.gymCheckin.findUnique).mockResolvedValue(null)
        vi.mocked(prisma.member.findUnique).mockResolvedValue({
          gymId: mockGymWithCheckin.id,
          challengeParticipations: [],
        } as never)

        const response = await MemberGET()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.checkedInToday).toBe(false)
        expect(data.checkinTime).toBe(null)
      })

      it('should include active challenge info', async () => {
        vi.mocked(prisma.gymCheckin.findUnique).mockResolvedValue(mockGymCheckin as never)
        vi.mocked(prisma.member.findUnique).mockResolvedValue({
          gymId: mockGymWithCheckin.id,
          challengeParticipations: [
            {
              id: mockChallengeParticipant.id,
              challenge: { name: mockChallenge.name },
            },
          ],
        } as never)

        const response = await MemberGET()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.isInActiveChallenge).toBe(true)
        expect(data.challengeName).toBe(mockChallenge.name)
      })
    })
  })

  // ===========================================================================
  // Admin API: GET /api/admin/gym-checkin
  // ===========================================================================
  describe('GET /api/admin/gym-checkin', () => {
    describe('Authorization', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getSession).mockResolvedValue(null)

        const response = await AdminGET()
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })

      it('should return 401 if not staff', async () => {
        vi.mocked(getSession).mockResolvedValue({ ...mockAdminSession, userType: 'member' as const })

        const response = await AdminGET()
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })

      it('should return 403 if not admin role', async () => {
        vi.mocked(getSession).mockResolvedValue(mockStaffSession)
        vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffCoach as never)

        const response = await AdminGET()
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error).toBe('Admin access required')
      })
    })

    describe('Check-in Settings', () => {
      beforeEach(() => {
        vi.mocked(getSession).mockResolvedValue(mockAdminSession)
        vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffAdmin as never)
      })

      it('should return check-in settings and stats with daily code', async () => {
        vi.mocked(prisma.gym.findUnique).mockResolvedValue(mockGymWithCheckin as never)
        vi.mocked(prisma.gymCheckin.count)
          .mockResolvedValueOnce(15 as never) // today
          .mockResolvedValueOnce(342 as never) // total

        const response = await AdminGET()
        const data = await response.json()

        const expectedDailyCode = generateDailyCode(mockGymWithCheckin.checkinSecret!)
        expect(response.status).toBe(200)
        expect(data.hasSecret).toBe(true)
        expect(data.dailyCode).toBe(expectedDailyCode)
        expect(data.nextRotation).toBeDefined()
        expect(data.stats.todayCheckins).toBe(15)
        expect(data.stats.totalCheckins).toBe(342)
      })

      it('should return no secret when gym has no check-in', async () => {
        vi.mocked(prisma.gym.findUnique).mockResolvedValue(mockGymWithoutCheckin as never)
        vi.mocked(prisma.gymCheckin.count).mockResolvedValue(0 as never)

        const response = await AdminGET()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.hasSecret).toBe(false)
        expect(data.dailyCode).toBe(null)
      })
    })
  })

  // ===========================================================================
  // Admin API: POST /api/admin/gym-checkin
  // ===========================================================================
  describe('POST /api/admin/gym-checkin', () => {
    describe('Authorization', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getSession).mockResolvedValue(null)

        const response = await AdminPOST()
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })

      it('should return 403 if not admin role', async () => {
        vi.mocked(getSession).mockResolvedValue(mockStaffSession)
        vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffCoach as never)

        const response = await AdminPOST()
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error).toBe('Admin access required')
      })
    })

    describe('Generate Secret', () => {
      beforeEach(() => {
        vi.mocked(getSession).mockResolvedValue(mockAdminSession)
        vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffAdmin as never)
      })

      it('should generate new check-in secret and return daily code', async () => {
        const newSecret = 'new-generated-uuid'
        vi.mocked(prisma.gym.update).mockResolvedValue({
          ...mockGymWithCheckin,
          checkinSecret: newSecret,
        } as never)

        const response = await AdminPOST()
        const data = await response.json()

        const expectedDailyCode = generateDailyCode(newSecret)
        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.message).toBe('Novi kod za prijavu je generisan')
        expect(data.dailyCode).toBe(expectedDailyCode)
        expect(data.nextRotation).toBeDefined()
      })
    })
  })

  // ===========================================================================
  // Admin API: DELETE /api/admin/gym-checkin
  // ===========================================================================
  describe('DELETE /api/admin/gym-checkin', () => {
    describe('Authorization', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getSession).mockResolvedValue(null)

        const response = await AdminDELETE()
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })

      it('should return 403 if not admin role', async () => {
        vi.mocked(getSession).mockResolvedValue(mockStaffSession)
        vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffCoach as never)

        const response = await AdminDELETE()
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error).toBe('Admin access required')
      })
    })

    describe('Disable Check-in', () => {
      beforeEach(() => {
        vi.mocked(getSession).mockResolvedValue(mockAdminSession)
        vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffAdmin as never)
      })

      it('should disable check-in by removing secret', async () => {
        vi.mocked(prisma.gym.update).mockResolvedValue({
          ...mockGymWithCheckin,
          checkinSecret: null,
        } as never)

        const response = await AdminDELETE()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.message).toBe('Sistem prijave je deaktiviran')
        expect(prisma.gym.update).toHaveBeenCalledWith({
          where: { id: mockAdminSession.gymId },
          data: { checkinSecret: null },
        })
      })
    })
  })
})
