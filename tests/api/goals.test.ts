import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as adminGoalsGet, POST as adminGoalsPost } from '@/app/api/admin/goals/route'
import { GET as adminGoalGet, PATCH as adminGoalPatch, DELETE as adminGoalDelete } from '@/app/api/admin/goals/[id]/route'
import { GET as memberGoalsGet } from '@/app/api/member/goals/route'
import { POST as memberVotePost } from '@/app/api/member/goals/[id]/vote/route'
import prisma from '@/lib/db'
import { getSession, getMemberFromSession } from '@/lib/auth'
import { getGoalStatus, canVote, determineWinner, calculateVotePercentage } from '@/lib/goals/index'
import * as votingModule from '@/lib/goals/voting'
import {
  mockGym,
  mockMember,
  mockStaffSession,
  mockMemberAuthResult,
  mockNoSessionError,
  mockGoalVoting,
  mockGoalVotingWithOptions,
  mockGoalDraft,
  mockGoalFundraising,
  mockGoalFundraisingWithOption,
  mockGoalCompleted,
  mockGoalOption1,
  mockGoalOption2,
  mockGoalOption3,
  mockGoalFundraisingOption,
  mockGoalVote,
  mockGoalContribution,
  mockExpiredVotingGoal,
  createMockRequest,
  createMockGetRequest,
} from '../mocks/fixtures'

describe('Goal Voting System API', () => {
  // Admin staff with ADMIN role
  const mockAdminStaff = {
    id: 'staff-test-002',
    staffId: 'S-ADMIN',
    name: 'Admin User',
    role: 'ADMIN',
    gymId: mockGym.id,
  }

  // =========================================================================
  // GET /api/admin/goals - List All Goals
  // =========================================================================
  describe('GET /api/admin/goals - List All Goals', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockStaffSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockAdminStaff as never)
      vi.mocked(prisma.gym.findUnique).mockResolvedValue(mockGym as never)
    })

    describe('Authentication', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getSession).mockResolvedValue(null)

        const request = createMockGetRequest()
        const response = await adminGoalsGet(request as never)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })
    })

    describe('Get All Goals', () => {
      it('should return all goals with options and vote counts', async () => {
        const goalsWithOptions = [
          { ...mockGoalVotingWithOptions, _count: { votes: 10, contributions: 0 } },
          { ...mockGoalFundraisingWithOption, _count: { votes: 8, contributions: 5 } },
        ]
        vi.mocked(prisma.goal.findMany).mockResolvedValue(goalsWithOptions as never)

        const request = createMockGetRequest()
        const response = await adminGoalsGet(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.goals).toBeDefined()
        expect(data.goals.length).toBe(2)
        expect(data.goals[0].options).toBeDefined()
      })

      it('should filter by status when provided', async () => {
        vi.mocked(prisma.goal.findMany).mockResolvedValue([mockGoalVotingWithOptions] as never)

        const request = createMockGetRequest({ status: 'voting' })
        const response = await adminGoalsGet(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.goals.length).toBe(1)
        expect(data.goals[0].status).toBe('voting')
      })

      it('should return empty array when no goals exist', async () => {
        vi.mocked(prisma.goal.findMany).mockResolvedValue([])

        const request = createMockGetRequest()
        const response = await adminGoalsGet(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.goals).toEqual([])
      })
    })
  })

  // =========================================================================
  // POST /api/admin/goals - Create Goal
  // =========================================================================
  describe('POST /api/admin/goals - Create Goal', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockStaffSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockAdminStaff as never)
      vi.mocked(prisma.gym.findUnique).mockResolvedValue(mockGym as never)
    })

    describe('Validation', () => {
      it('should return 400 if name is missing', async () => {
        const request = createMockRequest({
          options: [{ name: 'Option 1', targetAmount: 100 }],
        })
        const response = await adminGoalsPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error.toLowerCase()).toContain('naziv')
      })

      it('should return 400 if no options provided', async () => {
        const request = createMockRequest({
          name: 'Test Goal',
          options: [],
        })
        const response = await adminGoalsPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error.toLowerCase()).toContain('opcij')
      })

      it('should return 400 if multi-option goal has no voting deadline', async () => {
        const request = createMockRequest({
          name: 'Test Goal',
          options: [
            { name: 'Option 1', targetAmount: 100 },
            { name: 'Option 2', targetAmount: 200 },
          ],
        })
        const response = await adminGoalsPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error.toLowerCase()).toContain('glasanj')
      })
    })

    describe('Successful Creation', () => {
      it('should create multi-option goal with voting phase', async () => {
        // Mock the goal creation within transaction
        vi.mocked(prisma.goal.create).mockResolvedValue({
          ...mockGoalDraft,
          id: 'new-goal-001',
        } as never)
        vi.mocked(prisma.goalOption.create)
          .mockResolvedValueOnce({ ...mockGoalOption1, goalId: 'new-goal-001' } as never)
          .mockResolvedValueOnce({ ...mockGoalOption2, goalId: 'new-goal-001' } as never)
        vi.mocked(prisma.goal.findUnique).mockResolvedValue({
          ...mockGoalDraft,
          id: 'new-goal-001',
          name: 'Q1 2026 Equipment Upgrade',
          votingEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          options: [
            { ...mockGoalOption1, goalId: 'new-goal-001' },
            { ...mockGoalOption2, goalId: 'new-goal-001' },
          ],
        } as never)

        const request = createMockRequest({
          name: 'Q1 2026 Equipment Upgrade',
          description: 'Vote for the equipment you want!',
          options: [
            { name: 'Squat Rack', targetAmount: 2000 },
            { name: 'New Mats', targetAmount: 500 },
          ],
          votingEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        const response = await adminGoalsPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.goal).toBeDefined()
        expect(data.goal.status).toBe('draft')
      })

      it('should create single-option goal without voting phase', async () => {
        // Mock the goal creation within transaction
        vi.mocked(prisma.goal.create).mockResolvedValue({
          ...mockGoalDraft,
          id: 'new-goal-002',
        } as never)
        vi.mocked(prisma.goalOption.create).mockResolvedValue({
          ...mockGoalOption1,
          id: 'new-option-001',
          goalId: 'new-goal-002',
        } as never)
        vi.mocked(prisma.goal.update).mockResolvedValue({
          ...mockGoalDraft,
          id: 'new-goal-002',
          winningOptionId: 'new-option-001',
        } as never)
        vi.mocked(prisma.goal.findUnique).mockResolvedValue({
          ...mockGoalDraft,
          id: 'new-goal-002',
          name: 'New Equipment',
          winningOptionId: 'new-option-001',
          options: [{ ...mockGoalOption1, id: 'new-option-001', goalId: 'new-goal-002' }],
        } as never)

        const request = createMockRequest({
          name: 'New Equipment',
          options: [{ name: 'Squat Rack', targetAmount: 2000 }],
        })
        const response = await adminGoalsPost(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })
    })
  })

  // =========================================================================
  // PATCH /api/admin/goals/[id] - Update Goal / Actions
  // =========================================================================
  describe('PATCH /api/admin/goals/[id] - Update Goal / Actions', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockStaffSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockAdminStaff as never)
      vi.mocked(prisma.gym.findUnique).mockResolvedValue(mockGym as never)
    })

    describe('Publish Action', () => {
      it('should publish multi-option goal to voting status', async () => {
        vi.mocked(prisma.goal.findUnique).mockResolvedValue({
          ...mockGoalDraft,
          options: [mockGoalOption1, mockGoalOption2],
          votingEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        } as never)
        vi.mocked(prisma.goal.update).mockResolvedValue({
          ...mockGoalVoting,
          options: [mockGoalOption1, mockGoalOption2],
        } as never)

        const request = createMockRequest({ action: 'publish' }, 'PATCH')
        const response = await adminGoalPatch(request as never, { params: Promise.resolve({ id: mockGoalDraft.id }) })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.action).toBe('published')
      })

      it('should publish single-option goal directly to fundraising', async () => {
        vi.mocked(prisma.goal.findUnique).mockResolvedValue({
          ...mockGoalDraft,
          options: [mockGoalOption1],
          votingEndsAt: null,
        } as never)
        vi.mocked(prisma.goal.update).mockResolvedValue({
          ...mockGoalFundraising,
          options: [mockGoalOption1],
          winningOptionId: mockGoalOption1.id,
        } as never)

        const request = createMockRequest({ action: 'publish' }, 'PATCH')
        const response = await adminGoalPatch(request as never, { params: Promise.resolve({ id: mockGoalDraft.id }) })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.action).toBe('published')
      })
    })

    describe('Close Voting Action', () => {
      it('should close voting and select winner', async () => {
        vi.mocked(prisma.goal.findUnique).mockResolvedValue({
          ...mockGoalVoting,
          options: [mockGoalOption1, mockGoalOption2, mockGoalOption3],
        } as never)
        vi.mocked(votingModule.selectWinner).mockResolvedValue({
          success: true,
          winningOption: mockGoalOption1,
        })

        const request = createMockRequest({ action: 'close_voting' }, 'PATCH')
        const response = await adminGoalPatch(request as never, { params: Promise.resolve({ id: mockGoalVoting.id }) })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.action).toBe('voting_closed')
        expect(data.winningOption).toBeDefined()
      })

      it('should return 400 if goal is not in voting status', async () => {
        vi.mocked(prisma.goal.findUnique).mockResolvedValue({
          ...mockGoalFundraising,
          options: [mockGoalFundraisingOption],
        } as never)

        const request = createMockRequest({ action: 'close_voting' }, 'PATCH')
        const response = await adminGoalPatch(request as never, { params: Promise.resolve({ id: mockGoalFundraising.id }) })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error.toLowerCase()).toContain('glasanj')
      })
    })

    describe('Add Manual Contribution', () => {
      it('should add manual contribution to fundraising goal', async () => {
        vi.mocked(prisma.goal.findUnique).mockResolvedValue({
          ...mockGoalFundraising,
          options: [mockGoalFundraisingOption],
        } as never)
        vi.mocked(votingModule.addContribution).mockResolvedValue({
          success: true,
          completed: false,
        })

        const request = createMockRequest({ addAmount: 100, addNote: 'Manual donation' }, 'PATCH')
        const response = await adminGoalPatch(request as never, { params: Promise.resolve({ id: mockGoalFundraising.id }) })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.completed).toBe(false)
      })

      it('should mark goal as completed when target is reached', async () => {
        vi.mocked(prisma.goal.findUnique).mockResolvedValue({
          ...mockGoalFundraising,
          currentAmount: 95000, // 950€
          options: [{ ...mockGoalFundraisingOption, targetAmount: 100000 }], // Target: 1000€
        } as never)
        vi.mocked(votingModule.addContribution).mockResolvedValue({
          success: true,
          completed: true,
        })

        const request = createMockRequest({ addAmount: 50, addNote: 'Final contribution' }, 'PATCH')
        const response = await adminGoalPatch(request as never, { params: Promise.resolve({ id: mockGoalFundraising.id }) })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.completed).toBe(true)
      })

      it('should return 400 when adding contribution to non-fundraising goal', async () => {
        vi.mocked(prisma.goal.findUnique).mockResolvedValue({
          ...mockGoalVoting,
          options: [mockGoalOption1, mockGoalOption2],
        } as never)

        const request = createMockRequest({ addAmount: 100, addNote: 'Invalid' }, 'PATCH')
        const response = await adminGoalPatch(request as never, { params: Promise.resolve({ id: mockGoalVoting.id }) })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('prikupljanja')
      })
    })

    describe('Cancel Action', () => {
      it('should cancel a goal', async () => {
        vi.mocked(prisma.goal.findUnique).mockResolvedValue({
          ...mockGoalVoting,
          options: [mockGoalOption1, mockGoalOption2],
        } as never)
        vi.mocked(prisma.goal.update).mockResolvedValue({
          ...mockGoalVoting,
          status: 'cancelled',
        } as never)

        const request = createMockRequest({ action: 'cancel' }, 'PATCH')
        const response = await adminGoalPatch(request as never, { params: Promise.resolve({ id: mockGoalVoting.id }) })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.action).toBe('cancelled')
      })
    })
  })

  // =========================================================================
  // DELETE /api/admin/goals/[id] - Delete Goal
  // =========================================================================
  describe('DELETE /api/admin/goals/[id] - Delete Goal', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockStaffSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockAdminStaff as never)
      vi.mocked(prisma.gym.findUnique).mockResolvedValue(mockGym as never)
    })

    it('should delete draft goal', async () => {
      vi.mocked(prisma.goal.findUnique).mockResolvedValue({
        ...mockGoalDraft,
        _count: { votes: 0, contributions: 0 },
      } as never)
      vi.mocked(prisma.goal.delete).mockResolvedValue(mockGoalDraft as never)

      const request = createMockRequest({}, 'DELETE')
      const response = await adminGoalDelete(request as never, { params: Promise.resolve({ id: mockGoalDraft.id }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 400 when trying to delete non-draft goal', async () => {
      vi.mocked(prisma.goal.findUnique).mockResolvedValue({
        ...mockGoalVoting,
        _count: { votes: 5, contributions: 0 },
      } as never)

      const request = createMockRequest({}, 'DELETE')
      const response = await adminGoalDelete(request as never, { params: Promise.resolve({ id: mockGoalVoting.id }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('nacrt')
    })
  })

  // =========================================================================
  // GET /api/member/goals - Get Active Goals for Member
  // =========================================================================
  describe('GET /api/member/goals - Get Active Goals for Member', () => {
    const mockMemberGoalSession = {
      userId: mockMember.id,
      userType: 'member' as const,
      gymId: mockGym.id,
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    }

    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockMemberGoalSession)
      vi.mocked(prisma.member.findUnique).mockResolvedValue(mockMember as never)
    })

    describe('Authentication', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getSession).mockResolvedValue(null)

        const request = createMockGetRequest()
        const response = await memberGoalsGet(request as never)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })
    })

    describe('Get Goals', () => {
      it('should return voting and fundraising goals separately', async () => {
        vi.mocked(prisma.goal.findMany)
          .mockResolvedValueOnce([
            { ...mockGoalVotingWithOptions },
            { ...mockGoalFundraisingWithOption },
          ] as never)
          .mockResolvedValueOnce([]) // For recently completed goals
        vi.mocked(votingModule.getMemberVote).mockResolvedValue(null)

        const request = createMockGetRequest()
        const response = await memberGoalsGet(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.votingGoals).toBeDefined()
        expect(data.fundraisingGoals).toBeDefined()
      })

      it('should include member vote status for voting goals', async () => {
        vi.mocked(prisma.goal.findMany)
          .mockResolvedValueOnce([mockGoalVotingWithOptions] as never)
          .mockResolvedValueOnce([]) // For recently completed goals
        vi.mocked(votingModule.getMemberVote).mockResolvedValue(mockGoalOption1.id)

        const request = createMockGetRequest()
        const response = await memberGoalsGet(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.votingGoals[0].myVoteOptionId).toBe(mockGoalOption1.id)
      })

      it('should return empty arrays when no active goals', async () => {
        vi.mocked(prisma.goal.findMany).mockResolvedValue([])

        const request = createMockGetRequest()
        const response = await memberGoalsGet(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.votingGoals).toEqual([])
        expect(data.fundraisingGoals).toEqual([])
      })
    })
  })

  // =========================================================================
  // POST /api/member/goals/[id]/vote - Cast Vote
  // =========================================================================
  describe('POST /api/member/goals/[id]/vote - Cast Vote', () => {
    const mockMemberVoteSession = {
      userId: mockMember.id,
      userType: 'member' as const,
      gymId: mockGym.id,
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    }

    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockMemberVoteSession)
      vi.mocked(prisma.member.findUnique).mockResolvedValue(mockMember as never)
    })

    describe('Authentication', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getSession).mockResolvedValue(null)

        const request = createMockRequest({ optionId: mockGoalOption1.id })
        const response = await memberVotePost(request as never, { params: Promise.resolve({ id: mockGoalVoting.id }) })
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })
    })

    describe('Validation', () => {
      it('should return 400 if optionId is missing', async () => {
        vi.mocked(prisma.goal.findFirst).mockResolvedValue(mockGoalVoting as never)

        const request = createMockRequest({})
        const response = await memberVotePost(request as never, { params: Promise.resolve({ id: mockGoalVoting.id }) })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('optionId')
      })

      it('should return 404 if goal not found', async () => {
        vi.mocked(prisma.goal.findFirst).mockResolvedValue(null)

        const request = createMockRequest({ optionId: mockGoalOption1.id })
        const response = await memberVotePost(request as never, { params: Promise.resolve({ id: 'non-existent' }) })
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toContain('not found')
      })

      it('should return 400 if goal is not in voting status', async () => {
        vi.mocked(prisma.goal.findFirst).mockResolvedValue(mockGoalFundraising as never)
        vi.mocked(votingModule.castVote).mockResolvedValue({
          success: false,
          error: 'VOTING_NOT_ACTIVE',
        })

        const request = createMockRequest({ optionId: mockGoalOption1.id })
        const response = await memberVotePost(request as never, { params: Promise.resolve({ id: mockGoalFundraising.id }) })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('aktivno')
      })

      it('should return 400 if voting deadline has passed', async () => {
        vi.mocked(prisma.goal.findFirst).mockResolvedValue(mockExpiredVotingGoal as never)
        vi.mocked(votingModule.castVote).mockResolvedValue({
          success: false,
          error: 'VOTING_ENDED',
        })

        const request = createMockRequest({ optionId: mockGoalOption1.id })
        const response = await memberVotePost(request as never, { params: Promise.resolve({ id: mockExpiredVotingGoal.id }) })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('završeno')
      })
    })

    describe('Successful Voting', () => {
      it('should cast new vote', async () => {
        vi.mocked(prisma.goal.findFirst).mockResolvedValue(mockGoalVoting as never)
        vi.mocked(votingModule.castVote).mockResolvedValue({
          success: true,
          changed: true,
          previousOptionId: undefined,
          newOptionId: mockGoalOption1.id,
        })
        vi.mocked(prisma.goal.findUnique).mockResolvedValue({
          ...mockGoalVoting,
          options: [mockGoalOption1, mockGoalOption2],
        } as never)

        const request = createMockRequest({ optionId: mockGoalOption1.id })
        const response = await memberVotePost(request as never, { params: Promise.resolve({ id: mockGoalVoting.id }) })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.changed).toBe(true)
      })

      it('should change existing vote', async () => {
        vi.mocked(prisma.goal.findFirst).mockResolvedValue(mockGoalVoting as never)
        vi.mocked(votingModule.castVote).mockResolvedValue({
          success: true,
          changed: true,
          previousOptionId: mockGoalOption1.id,
          newOptionId: mockGoalOption2.id,
        })
        vi.mocked(prisma.goal.findUnique).mockResolvedValue({
          ...mockGoalVoting,
          options: [mockGoalOption1, mockGoalOption2],
        } as never)

        const request = createMockRequest({ optionId: mockGoalOption2.id })
        const response = await memberVotePost(request as never, { params: Promise.resolve({ id: mockGoalVoting.id }) })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.changed).toBe(true)
        expect(data.previousOptionId).toBe(mockGoalOption1.id)
        expect(data.newOptionId).toBe(mockGoalOption2.id)
      })

      it('should return unchanged when voting for same option', async () => {
        vi.mocked(prisma.goal.findFirst).mockResolvedValue(mockGoalVoting as never)
        vi.mocked(votingModule.castVote).mockResolvedValue({
          success: true,
          changed: false,
          previousOptionId: mockGoalOption1.id,
          newOptionId: mockGoalOption1.id,
        })
        vi.mocked(prisma.goal.findUnique).mockResolvedValue({
          ...mockGoalVoting,
          options: [mockGoalOption1, mockGoalOption2],
        } as never)

        const request = createMockRequest({ optionId: mockGoalOption1.id })
        const response = await memberVotePost(request as never, { params: Promise.resolve({ id: mockGoalVoting.id }) })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.changed).toBe(false)
      })
    })
  })

  // =========================================================================
  // LIB FUNCTIONS TESTS
  // =========================================================================
  describe('Goal Status Utilities', () => {
    describe('getGoalStatus', () => {
      it('should return draft for draft goals', () => {
        expect(getGoalStatus(mockGoalDraft)).toBe('draft')
      })

      it('should return voting for active voting goals', () => {
        expect(getGoalStatus(mockGoalVoting)).toBe('voting')
      })

      it('should return fundraising for fundraising goals', () => {
        expect(getGoalStatus(mockGoalFundraising)).toBe('fundraising')
      })

      it('should return completed for completed goals', () => {
        expect(getGoalStatus(mockGoalCompleted)).toBe('completed')
      })
    })

    describe('canVote', () => {
      it('should return true for active voting goal', () => {
        expect(canVote(mockGoalVoting)).toBe(true)
      })

      it('should return false for non-voting status', () => {
        expect(canVote(mockGoalFundraising)).toBe(false)
      })

      it('should return false for expired voting', () => {
        expect(canVote(mockExpiredVotingGoal)).toBe(false)
      })
    })

    describe('determineWinner', () => {
      it('should return option with highest vote count', () => {
        const options = [mockGoalOption1, mockGoalOption2, mockGoalOption3]
        const winner = determineWinner(options)
        expect(winner?.id).toBe(mockGoalOption1.id) // Has 5 votes
      })

      it('should use displayOrder as tiebreaker', () => {
        const tiedOptions = [
          { ...mockGoalOption1, voteCount: 5, displayOrder: 1 },
          { ...mockGoalOption2, voteCount: 5, displayOrder: 0 }, // Lower displayOrder wins
        ]
        const winner = determineWinner(tiedOptions)
        expect(winner?.id).toBe(mockGoalOption2.id)
      })

      it('should return null for empty options', () => {
        expect(determineWinner([])).toBeNull()
      })
    })

    describe('calculateVotePercentage', () => {
      it('should calculate percentage correctly', () => {
        expect(calculateVotePercentage(5, 10)).toBe(50)
        expect(calculateVotePercentage(1, 4)).toBe(25)
        expect(calculateVotePercentage(3, 10)).toBe(30)
      })

      it('should return 0 for zero total votes', () => {
        expect(calculateVotePercentage(0, 0)).toBe(0)
        expect(calculateVotePercentage(5, 0)).toBe(0)
      })
    })
  })
})
