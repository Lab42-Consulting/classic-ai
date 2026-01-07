import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as getMemberChallenge, POST as joinChallenge } from '@/app/api/member/challenge/route'
import { GET as getAdminChallenges, POST as createChallenge } from '@/app/api/admin/challenges/route'
import { GET as getAdminChallenge, PATCH as updateChallenge, DELETE as deleteChallenge } from '@/app/api/admin/challenges/[id]/route'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getMemberFromSession } from '@/lib/auth'
import {
  mockGym,
  mockMember,
  mockStaffCoach,
  mockStaffAdmin,
  mockStaffSession,
  mockAdminSession,
  mockMemberSession,
  mockMemberAuthResult,
  mockStaffMemberAuthResult,
  mockChallenge,
  mockDraftChallenge,
  mockUpcomingChallenge,
  mockEndedChallenge,
  mockChallengeParticipant,
  mockChallengeWithParticipants,
  mockChallengeLeaderboard,
  mockChallengeWinner,
  mockOldChallengeWinner,
  createMockRequest,
} from '../mocks/fixtures'

// =============================================================================
// MEMBER CHALLENGE API TESTS
// =============================================================================

describe('Member Challenge API', () => {
  describe('GET /api/member/challenge', () => {
    describe('Authentication', () => {
      it('should return 401 if not authenticated', async () => {
        vi.mocked(getMemberFromSession).mockResolvedValue({ error: 'NO_SESSION' })

        const response = await getMemberChallenge()
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.code).toBe('NO_SESSION')
      })
    })

    describe('No Active Challenge', () => {
      beforeEach(() => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
        vi.mocked(prisma.member.findUnique).mockResolvedValue(mockMember as never)
      })

      it('should return null challenge when no active challenge exists', async () => {
        vi.mocked(prisma.challenge.findFirst).mockResolvedValue(null)

        const response = await getMemberChallenge()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.challenge).toBeNull()
        expect(data.participation).toBeNull()
        expect(data.leaderboard).toEqual([])
        expect(data.rank).toBeNull()
      })
    })

    describe('Active Challenge', () => {
      beforeEach(() => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
        vi.mocked(prisma.member.findUnique).mockResolvedValue(mockMember as never)
        vi.mocked(prisma.challenge.findFirst).mockResolvedValue(mockChallenge as never)
      })

      it('should return challenge info when not participating', async () => {
        vi.mocked(prisma.challengeParticipant.findUnique).mockResolvedValue(null)
        vi.mocked(prisma.challengeParticipant.findMany).mockResolvedValue([])

        const response = await getMemberChallenge()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.challenge.id).toBe(mockChallenge.id)
        expect(data.challenge.name).toBe(mockChallenge.name)
        expect(data.participation).toBeNull()
        expect(data.rank).toBeNull()
      })

      it('should return participation and rank when participating', async () => {
        vi.mocked(prisma.challengeParticipant.findUnique).mockResolvedValue(mockChallengeParticipant as never)
        vi.mocked(prisma.challengeParticipant.findMany).mockResolvedValue(mockChallengeLeaderboard as never)
        vi.mocked(prisma.challengeParticipant.count).mockResolvedValue(0) // 0 people ahead = rank 1

        const response = await getMemberChallenge()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.participation).not.toBeNull()
        expect(data.participation.totalPoints).toBe(145)
        expect(data.rank).toBe(1) // First in leaderboard
      })

      it('should include point configuration in response', async () => {
        vi.mocked(prisma.challengeParticipant.findUnique).mockResolvedValue(null)
        vi.mocked(prisma.challengeParticipant.findMany).mockResolvedValue([])

        const response = await getMemberChallenge()
        const data = await response.json()

        expect(data.challenge.pointsPerMeal).toBe(5)
        expect(data.challenge.pointsPerTraining).toBe(15)
        expect(data.challenge.pointsPerWater).toBe(1)
        expect(data.challenge.pointsPerCheckin).toBe(25)
        expect(data.challenge.streakBonus).toBe(5)
      })
    })

    describe('Upcoming Challenge', () => {
      beforeEach(() => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
        vi.mocked(prisma.member.findUnique).mockResolvedValue(mockMember as never)
        vi.mocked(prisma.challenge.findFirst).mockResolvedValue(mockUpcomingChallenge as never)
        vi.mocked(prisma.challengeParticipant.findUnique).mockResolvedValue(null)
        vi.mocked(prisma.challengeParticipant.findMany).mockResolvedValue([])
      })

      it('should return upcoming status for future challenge', async () => {
        const response = await getMemberChallenge()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.challenge.status).toBe('upcoming')
        expect(data.challenge.canJoin).toBe(false)
        expect(data.challenge.daysUntilStart).toBeGreaterThan(0)
      })
    })

    describe('Coach Access (View Only)', () => {
      beforeEach(() => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockStaffMemberAuthResult)
        vi.mocked(prisma.member.findUnique).mockResolvedValue(mockMember as never)
        vi.mocked(prisma.challenge.findFirst).mockResolvedValue(mockChallenge as never)
        vi.mocked(prisma.challengeParticipant.findUnique).mockResolvedValue(null)
        vi.mocked(prisma.challengeParticipant.findMany).mockResolvedValue(mockChallengeLeaderboard as never)
      })

      it('should include isStaffMember flag in response for coaches', async () => {
        const response = await getMemberChallenge()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.isStaffMember).toBe(true)
        expect(data.challenge).not.toBeNull()
        expect(data.leaderboard).toBeDefined()
      })

      it('should include isStaffMember=false for regular members', async () => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)

        const response = await getMemberChallenge()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.isStaffMember).toBe(false)
      })
    })
  })

  describe('POST /api/member/challenge', () => {
    describe('Authentication', () => {
      it('should return 401 if not authenticated', async () => {
        vi.mocked(getMemberFromSession).mockResolvedValue({ error: 'NO_SESSION' })

        const response = await joinChallenge()
        const data = await response.json()

        expect(response.status).toBe(401)
      })
    })

    describe('Coach Restriction', () => {
      it('should return 403 when coach tries to join challenge', async () => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockStaffMemberAuthResult)

        const response = await joinChallenge()
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error).toBe('Treneri ne mogu učestvovati u izazovima')
      })
    })

    describe('Join Challenge', () => {
      beforeEach(() => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
        vi.mocked(prisma.member.findUnique).mockResolvedValue(mockMember as never)
      })

      it('should return 404 if no active challenge', async () => {
        vi.mocked(prisma.challenge.findFirst).mockResolvedValue(null)

        const response = await joinChallenge()
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toBe('Nema aktivnog izazova')
      })

      it('should return 400 if already participating', async () => {
        vi.mocked(prisma.challenge.findFirst).mockResolvedValue(mockChallenge as never)
        vi.mocked(prisma.challengeParticipant.findUnique).mockResolvedValue(mockChallengeParticipant as never)

        const response = await joinChallenge()
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Već učestvuješ u ovom izazovu')
      })

      it('should successfully join challenge', async () => {
        vi.mocked(prisma.challenge.findFirst).mockResolvedValue(mockChallenge as never)
        vi.mocked(prisma.challengeParticipant.findUnique).mockResolvedValue(null)
        vi.mocked(prisma.challengeParticipant.create).mockResolvedValue({
          id: 'new-participant',
          joinedAt: new Date(),
        } as never)

        const response = await joinChallenge()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.participation.id).toBe('new-participant')
      })
    })
  })
})

// =============================================================================
// ADMIN CHALLENGE API TESTS
// =============================================================================

describe('Admin Challenge API', () => {
  describe('GET /api/admin/challenges', () => {
    describe('Authentication', () => {
      it('should return 401 if not authenticated', async () => {
        vi.mocked(getSession).mockResolvedValue(null)

        const response = await getAdminChallenges()
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })

      it('should return 401 if authenticated as member', async () => {
        vi.mocked(getSession).mockResolvedValue(mockMemberSession)

        const response = await getAdminChallenges()
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })
    })

    describe('Authorization', () => {
      it('should return 403 if staff is not admin', async () => {
        vi.mocked(getSession).mockResolvedValue(mockStaffSession)
        vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffCoach as never)

        const response = await getAdminChallenges()
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error).toBe('Admin access required')
      })
    })

    describe('List Challenges', () => {
      beforeEach(() => {
        vi.mocked(getSession).mockResolvedValue(mockAdminSession)
        vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffAdmin as never)
      })

      it('should return all challenges for gym', async () => {
        vi.mocked(prisma.challenge.findMany).mockResolvedValue([
          { ...mockChallenge, _count: { participants: 5 } },
          { ...mockEndedChallenge, _count: { participants: 10 } },
        ] as never)

        const response = await getAdminChallenges()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.challenges).toHaveLength(2)
        expect(data.challenges[0].participantCount).toBe(5)
      })
    })
  })

  describe('POST /api/admin/challenges', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffAdmin as never)
    })

    it('should create a new challenge', async () => {
      vi.mocked(prisma.challenge.findFirst).mockResolvedValue(null) // No existing active
      vi.mocked(prisma.challenge.create).mockResolvedValue(mockDraftChallenge as never)

      const request = createMockRequest({
        name: 'Test Challenge',
        description: 'Test description',
        rewardDescription: 'Test reward',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString(),
      })

      const response = await createChallenge(request as never)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 400 if required fields missing', async () => {
      const request = createMockRequest({
        name: 'Test Challenge',
        // Missing other required fields
      })

      const response = await createChallenge(request as never)
      const data = await response.json()

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/admin/challenges/[id]', () => {
    const mockParams = { params: Promise.resolve({ id: mockChallenge.id }) }

    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffAdmin as never)
    })

    it('should return challenge with leaderboard', async () => {
      vi.mocked(prisma.challenge.findUnique).mockResolvedValue(mockChallengeWithParticipants as never)
      vi.mocked(prisma.challengeParticipant.findMany).mockResolvedValue(mockChallengeLeaderboard as never)

      const response = await getAdminChallenge({} as never, mockParams as never)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.challenge.id).toBe(mockChallenge.id)
      expect(data.leaderboard).toBeDefined()
    })

    it('should return 404 if challenge not found', async () => {
      vi.mocked(prisma.challenge.findUnique).mockResolvedValue(null)

      const response = await getAdminChallenge({} as never, mockParams as never)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Challenge not found')
    })
  })

  describe('PATCH /api/admin/challenges/[id]', () => {
    const mockParams = { params: Promise.resolve({ id: mockDraftChallenge.id }) }

    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffAdmin as never)
    })

    it('should publish a draft challenge', async () => {
      vi.mocked(prisma.challenge.findUnique).mockResolvedValue(mockDraftChallenge as never)
      vi.mocked(prisma.challenge.update).mockResolvedValue({
        ...mockDraftChallenge,
        status: 'registration',
      } as never)

      const request = createMockRequest({ action: 'publish' }, 'PATCH')
      const response = await updateChallenge(request as never, mockParams as never)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 400 if trying to publish non-draft', async () => {
      vi.mocked(prisma.challenge.findUnique).mockResolvedValue(mockChallenge as never) // Already registration

      const request = createMockRequest({ action: 'publish' }, 'PATCH')
      const response = await updateChallenge(request as never, mockParams as never)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Only draft challenges can be published')
    })

    it('should end an active challenge', async () => {
      vi.mocked(prisma.challenge.findUnique).mockResolvedValue(mockChallenge as never)
      vi.mocked(prisma.challengeParticipant.findMany).mockResolvedValue(mockChallengeLeaderboard as never)

      // Mock the transaction for ending challenge
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const mockTx = {
          challenge: {
            update: vi.fn().mockResolvedValue({ ...mockChallenge, status: 'ended' }),
          },
          challengeWinner: {
            createMany: vi.fn().mockResolvedValue({ count: 2 }),
          },
        }
        return callback(mockTx)
      })

      const request = createMockRequest({ action: 'end' }, 'PATCH')
      const response = await updateChallenge(request as never, mockParams as never)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should update challenge fields', async () => {
      vi.mocked(prisma.challenge.findUnique).mockResolvedValue(mockDraftChallenge as never)
      vi.mocked(prisma.challenge.update).mockResolvedValue({
        ...mockDraftChallenge,
        name: 'Updated Name',
      } as never)

      const request = createMockRequest({ name: 'Updated Name' }, 'PATCH')
      const response = await updateChallenge(request as never, mockParams as never)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('DELETE /api/admin/challenges/[id]', () => {
    const mockParams = { params: Promise.resolve({ id: mockDraftChallenge.id }) }

    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffAdmin as never)
    })

    it('should delete a draft challenge with no participants', async () => {
      vi.mocked(prisma.challenge.findUnique).mockResolvedValue({
        ...mockDraftChallenge,
        _count: { participants: 0 },
      } as never)
      vi.mocked(prisma.challenge.delete).mockResolvedValue(mockDraftChallenge as never)

      const response = await deleteChallenge({} as never, mockParams as never)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 400 if challenge is not draft', async () => {
      vi.mocked(prisma.challenge.findUnique).mockResolvedValue({
        ...mockChallenge,
        _count: { participants: 0 },
      } as never)

      const response = await deleteChallenge({} as never, mockParams as never)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Only draft challenges can be deleted')
    })

    it('should return 400 if challenge has participants', async () => {
      vi.mocked(prisma.challenge.findUnique).mockResolvedValue({
        ...mockDraftChallenge,
        _count: { participants: 5 },
      } as never)

      const response = await deleteChallenge({} as never, mockParams as never)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot delete challenge with participants')
    })
  })
})

// =============================================================================
// CHALLENGE STATUS COMPUTATION TESTS
// =============================================================================

describe('Challenge Status Computation', () => {
  describe('getChallengeStatus', () => {
    it('should return draft for manual draft status', async () => {
      const { getChallengeStatus } = await import('@/lib/challenges')
      const status = getChallengeStatus(mockDraftChallenge)
      expect(status).toBe('draft')
    })

    it('should return ended for manual ended status', async () => {
      const { getChallengeStatus } = await import('@/lib/challenges')
      const status = getChallengeStatus(mockEndedChallenge)
      expect(status).toBe('ended')
    })

    it('should return upcoming for future start date', async () => {
      const { getChallengeStatus } = await import('@/lib/challenges')
      const status = getChallengeStatus(mockUpcomingChallenge)
      expect(status).toBe('upcoming')
    })

    it('should return registration for active challenge in join window', async () => {
      const { getChallengeStatus } = await import('@/lib/challenges')
      const status = getChallengeStatus(mockChallenge)
      expect(status).toBe('registration')
    })
  })

  describe('canJoinChallenge', () => {
    it('should return true during registration period', async () => {
      const { canJoinChallenge } = await import('@/lib/challenges')
      const canJoin = canJoinChallenge(mockChallenge)
      expect(canJoin).toBe(true)
    })

    it('should return false for upcoming challenge', async () => {
      const { canJoinChallenge } = await import('@/lib/challenges')
      const canJoin = canJoinChallenge(mockUpcomingChallenge)
      expect(canJoin).toBe(false)
    })

    it('should return false for ended challenge', async () => {
      const { canJoinChallenge } = await import('@/lib/challenges')
      const canJoin = canJoinChallenge(mockEndedChallenge)
      expect(canJoin).toBe(false)
    })
  })
})

// =============================================================================
// WINNER EXCLUSION TESTS
// =============================================================================

describe('Winner Exclusion', () => {
  describe('POST /api/member/challenge - Winner Cooldown', () => {
    beforeEach(() => {
      vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
      vi.mocked(prisma.member.findUnique).mockResolvedValue(mockMember as never)
      vi.mocked(prisma.challenge.findFirst).mockResolvedValue(mockChallenge as never)
      vi.mocked(prisma.challengeParticipant.findUnique).mockResolvedValue(null)
    })

    it('should return 403 when past winner is within cooldown period', async () => {
      // Mock finding a recent win within cooldown
      vi.mocked(prisma.challengeWinner.findFirst).mockResolvedValue(mockChallengeWinner as never)

      const response = await joinChallenge()
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.code).toBe('WINNER_COOLDOWN')
      expect(data.error).toContain('Kao pobednik izazova')
      expect(data.cooldownEndsAt).toBeDefined()
    })

    it('should allow joining when past winner is outside cooldown period', async () => {
      // Mock no recent win found (outside cooldown)
      vi.mocked(prisma.challengeWinner.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.challengeParticipant.create).mockResolvedValue({
        id: 'new-participant',
        joinedAt: new Date(),
      } as never)

      const response = await joinChallenge()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should allow joining when past winner rank is outside excludeTopN', async () => {
      // A rank 4 winner should not be excluded if excludeTopN is 3
      vi.mocked(prisma.challengeWinner.findFirst).mockResolvedValue(null) // Query won't find rank > 3
      vi.mocked(prisma.challengeParticipant.create).mockResolvedValue({
        id: 'new-participant',
        joinedAt: new Date(),
      } as never)

      const response = await joinChallenge()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('GET /api/member/challenge - Eligibility Info', () => {
    beforeEach(() => {
      vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
      vi.mocked(prisma.member.findUnique).mockResolvedValue(mockMember as never)
      vi.mocked(prisma.challenge.findFirst).mockResolvedValue(mockChallenge as never)
      vi.mocked(prisma.challengeParticipant.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.challengeParticipant.findMany).mockResolvedValue([])
    })

    it('should return isEligible=false and cooldownInfo when winner is within cooldown', async () => {
      vi.mocked(prisma.challengeWinner.findFirst).mockResolvedValue(mockChallengeWinner as never)

      const response = await getMemberChallenge()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isEligible).toBe(false)
      expect(data.cooldownInfo).toBeDefined()
      expect(data.cooldownInfo.reason).toContain('Kao pobednik izazova')
      expect(data.cooldownInfo.endsAt).toBeDefined()
    })

    it('should return isEligible=true when no cooldown applies', async () => {
      vi.mocked(prisma.challengeWinner.findFirst).mockResolvedValue(null)

      const response = await getMemberChallenge()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isEligible).toBe(true)
      expect(data.cooldownInfo).toBeNull()
    })
  })

  describe('PATCH /api/admin/challenges/[id] - Save Winners on End', () => {
    const mockParams = { params: Promise.resolve({ id: mockChallenge.id }) }

    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffAdmin as never)
    })

    it('should save winners when challenge is ended', async () => {
      vi.mocked(prisma.challenge.findUnique).mockResolvedValue(mockChallenge as never)
      vi.mocked(prisma.challengeParticipant.findMany).mockResolvedValue(mockChallengeLeaderboard as never)

      // Mock the transaction
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const mockTx = {
          challenge: {
            update: vi.fn().mockResolvedValue({ ...mockChallenge, status: 'ended' }),
          },
          challengeWinner: {
            createMany: vi.fn().mockResolvedValue({ count: 2 }),
          },
        }
        return callback(mockTx)
      })

      const request = createMockRequest({ action: 'end' }, 'PATCH')
      const response = await updateChallenge(request as never, mockParams as never)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.winnersSaved).toBeDefined()
    })
  })

  describe('Challenge Creation with Winner Exclusion Settings', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffAdmin as never)
    })

    it('should create challenge with custom excludeTopN and winnerCooldownMonths', async () => {
      vi.mocked(prisma.challenge.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.challenge.create).mockResolvedValue({
        ...mockDraftChallenge,
        excludeTopN: 5,
        winnerCooldownMonths: 6,
      } as never)

      const request = createMockRequest({
        name: 'Test Challenge',
        description: 'Test description',
        rewardDescription: 'Test reward',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString(),
        excludeTopN: 5,
        winnerCooldownMonths: 6,
      })

      const response = await createChallenge(request as never)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should use default values when excludeTopN and winnerCooldownMonths not provided', async () => {
      vi.mocked(prisma.challenge.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.challenge.create).mockResolvedValue({
        ...mockDraftChallenge,
        excludeTopN: 3,
        winnerCooldownMonths: 3,
      } as never)

      const request = createMockRequest({
        name: 'Test Challenge',
        description: 'Test description',
        rewardDescription: 'Test reward',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString(),
      })

      const response = await createChallenge(request as never)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})
