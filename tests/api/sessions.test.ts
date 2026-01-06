import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as memberSessionsGet, POST as memberSessionsPost } from '@/app/api/member/sessions/route'
import { POST as memberRespondToRequest } from '@/app/api/member/sessions/requests/[id]/route'
import { POST as memberCancelSession } from '@/app/api/member/sessions/[id]/cancel/route'
import { GET as coachSessionsGet, POST as coachSessionsPost } from '@/app/api/coach/sessions/route'
import { POST as coachRespondToRequest } from '@/app/api/coach/sessions/requests/[id]/route'
import { POST as coachCancelSession } from '@/app/api/coach/sessions/[id]/cancel/route'
import { POST as coachCompleteSession } from '@/app/api/coach/sessions/[id]/complete/route'
import prisma from '@/lib/db'
import { getSession, getMemberFromSession } from '@/lib/auth'
import {
  mockMember,
  mockStaffCoach,
  mockStaffSession,
  mockMemberAuthResult,
  mockCoachAssignment,
  mockSessionRequest,
  mockSessionRequestFromMember,
  mockSessionRequestWithRelations,
  mockScheduledSession,
  mockScheduledSessionWithRelations,
  mockSessionProposal,
  createMockRequest,
} from '../mocks/fixtures'

// =============================================================================
// MEMBER SESSION SCHEDULING TESTS
// =============================================================================

describe('Member Sessions API', () => {
  describe('GET /api/member/sessions', () => {
    beforeEach(() => {
      vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
    })

    it('should return sessions data for member', async () => {
      vi.mocked(prisma.coachAssignment.findUnique).mockResolvedValue({
        ...mockCoachAssignment,
        staff: {
          id: mockStaffCoach.id,
          name: mockStaffCoach.name,
          avatarUrl: null,
        },
      } as never)

      vi.mocked(prisma.sessionRequest.findMany).mockResolvedValue([
        mockSessionRequestWithRelations,
      ] as never)

      vi.mocked(prisma.scheduledSession.findMany)
        .mockResolvedValueOnce([mockScheduledSessionWithRelations] as never) // upcoming
        .mockResolvedValueOnce([]) // past

      const request = new Request('http://localhost/api/member/sessions')
      const response = await memberSessionsGet(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.requests).toBeDefined()
      expect(data.upcoming).toBeDefined()
      expect(data.past).toBeDefined()
      expect(data.coach).toBeDefined()
      expect(data.coach.name).toBe(mockStaffCoach.name)
    })

    it('should return 401 if not authenticated', async () => {
      vi.mocked(getMemberFromSession).mockResolvedValue({ error: 'NO_SESSION' })

      const request = new Request('http://localhost/api/member/sessions')
      const response = await memberSessionsGet(request)

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/member/sessions', () => {
    beforeEach(() => {
      vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
    })

    it('should create session request when member has coach', async () => {
      vi.mocked(prisma.coachAssignment.findUnique).mockResolvedValue({
        ...mockCoachAssignment,
        staff: mockStaffCoach,
      } as never)

      vi.mocked(prisma.sessionRequest.create).mockResolvedValue({
        ...mockSessionRequestFromMember,
        staff: { name: mockStaffCoach.name },
      } as never)

      vi.mocked(prisma.sessionProposal.create).mockResolvedValue({
        id: 'proposal-new',
      } as never)

      const proposedAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      const request = createMockRequest({
        sessionType: 'training',
        proposedAt,
        duration: 60,
        location: 'gym',
        note: 'Test request',
      })

      const response = await memberSessionsPost(request as never)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.request).toBeDefined()
    })

    it('should return 400 if member has no coach', async () => {
      vi.mocked(prisma.coachAssignment.findUnique).mockResolvedValue(null)

      const proposedAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      const request = createMockRequest({
        sessionType: 'training',
        proposedAt,
        duration: 60,
        location: 'gym',
      })

      const response = await memberSessionsPost(request as never)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('trenera')
    })

    it('should return 400 if proposed time is less than 24 hours away', async () => {
      vi.mocked(prisma.coachAssignment.findUnique).mockResolvedValue({
        ...mockCoachAssignment,
        staff: mockStaffCoach,
      } as never)

      // Proposed time is 1 hour from now (less than 24 hours)
      const proposedAt = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString()
      const request = createMockRequest({
        sessionType: 'training',
        proposedAt,
        duration: 60,
        location: 'gym',
      })

      const response = await memberSessionsPost(request as never)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('24')
    })

    it('should validate session type', async () => {
      vi.mocked(prisma.coachAssignment.findUnique).mockResolvedValue({
        ...mockCoachAssignment,
        staff: mockStaffCoach,
      } as never)

      const proposedAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      const request = createMockRequest({
        sessionType: 'invalid_type',
        proposedAt,
        duration: 60,
        location: 'gym',
      })

      const response = await memberSessionsPost(request as never)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should validate duration', async () => {
      vi.mocked(prisma.coachAssignment.findUnique).mockResolvedValue({
        ...mockCoachAssignment,
        staff: mockStaffCoach,
      } as never)

      const proposedAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      const request = createMockRequest({
        sessionType: 'training',
        proposedAt,
        duration: 120, // Invalid duration
        location: 'gym',
      })

      const response = await memberSessionsPost(request as never)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })
  })
})

// =============================================================================
// COACH SESSION SCHEDULING TESTS
// =============================================================================

describe('Coach Sessions API', () => {
  describe('GET /api/coach/sessions', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockStaffSession)
    })

    it('should return sessions data for coach', async () => {
      vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffCoach as never)

      vi.mocked(prisma.coachAssignment.findMany).mockResolvedValue([
        {
          member: {
            id: mockMember.id,
            name: mockMember.name,
            avatarUrl: null,
          },
        },
      ] as never)

      vi.mocked(prisma.sessionRequest.findMany).mockResolvedValue([
        {
          ...mockSessionRequest,
          member: {
            id: mockMember.id,
            name: mockMember.name,
            avatarUrl: null,
            memberId: mockMember.memberId,
          },
          proposalHistory: [],
        },
      ] as never)

      vi.mocked(prisma.scheduledSession.findMany)
        .mockResolvedValueOnce([mockScheduledSessionWithRelations] as never) // upcoming
        .mockResolvedValueOnce([]) // past

      const request = new Request('http://localhost/api/coach/sessions')
      const response = await coachSessionsGet(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.requests).toBeDefined()
      expect(data.upcoming).toBeDefined()
      expect(data.past).toBeDefined()
      expect(data.members).toBeDefined()
      expect(data.members.length).toBeGreaterThan(0)
    })

    it('should return 401 if not authenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = new Request('http://localhost/api/coach/sessions')
      const response = await coachSessionsGet(request)

      expect(response.status).toBe(401)
    })

    it('should return 403 if not a coach', async () => {
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffCoach,
        role: 'ADMIN',
      } as never)

      const request = new Request('http://localhost/api/coach/sessions')
      const response = await coachSessionsGet(request)

      expect(response.status).toBe(403)
    })
  })

  describe('POST /api/coach/sessions', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockStaffSession)
    })

    it('should create session request for assigned member', async () => {
      vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffCoach as never)

      vi.mocked(prisma.coachAssignment.findFirst).mockResolvedValue(mockCoachAssignment as never)

      vi.mocked(prisma.sessionRequest.create).mockResolvedValue({
        ...mockSessionRequest,
        member: { name: mockMember.name },
      } as never)

      vi.mocked(prisma.sessionProposal.create).mockResolvedValue({
        id: 'proposal-new',
      } as never)

      const proposedAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      const request = createMockRequest({
        memberId: mockMember.id,
        sessionType: 'training',
        proposedAt,
        duration: 60,
        location: 'gym',
        note: 'Test request from coach',
      })

      const response = await coachSessionsPost(request as never)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.request).toBeDefined()
    })

    it('should return 403 if member is not assigned to coach', async () => {
      vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffCoach as never)
      vi.mocked(prisma.coachAssignment.findFirst).mockResolvedValue(null)

      const proposedAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      const request = createMockRequest({
        memberId: 'unassigned-member-id',
        sessionType: 'training',
        proposedAt,
        duration: 60,
        location: 'gym',
      })

      const response = await coachSessionsPost(request as never)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('dodeljenim')
    })

    it('should return 400 if proposed time is less than 24 hours away', async () => {
      vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffCoach as never)
      vi.mocked(prisma.coachAssignment.findFirst).mockResolvedValue(mockCoachAssignment as never)

      // Proposed time is 1 hour from now
      const proposedAt = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString()
      const request = createMockRequest({
        memberId: mockMember.id,
        sessionType: 'training',
        proposedAt,
        duration: 60,
        location: 'gym',
      })

      const response = await coachSessionsPost(request as never)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('24')
    })
  })
})

// =============================================================================
// MEMBER SESSION REQUEST RESPONSE TESTS
// =============================================================================

describe('Member Session Request Response API', () => {
  describe('POST /api/member/sessions/requests/[id]', () => {
    beforeEach(() => {
      vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
    })

    it('should accept a session request', async () => {
      const mockRequestWithCoachAction = {
        ...mockSessionRequest,
        lastActionBy: 'coach',
        proposalHistory: [mockSessionProposal],
        staff: {
          id: mockStaffCoach.id,
          name: mockStaffCoach.name,
          avatarUrl: null,
        },
      }

      vi.mocked(prisma.sessionRequest.findFirst).mockResolvedValue(mockRequestWithCoachAction as never)
      vi.mocked(prisma.sessionRequest.update).mockResolvedValue({
        ...mockRequestWithCoachAction,
        status: 'accepted',
      } as never)
      vi.mocked(prisma.sessionProposal.update).mockResolvedValue({} as never)
      vi.mocked(prisma.scheduledSession.create).mockResolvedValue({
        ...mockScheduledSession,
        staff: {
          id: mockStaffCoach.id,
          name: mockStaffCoach.name,
          avatarUrl: null,
        },
      } as never)

      const request = createMockRequest({ action: 'accept' })
      const response = await memberRespondToRequest(
        request as never,
        { params: Promise.resolve({ id: mockSessionRequest.id }) }
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.action).toBe('accepted')
      expect(data.session).toBeDefined()
    })

    it('should decline a session request', async () => {
      const mockRequestWithCoachAction = {
        ...mockSessionRequest,
        lastActionBy: 'coach',
        proposalHistory: [mockSessionProposal],
        staff: {
          id: mockStaffCoach.id,
          name: mockStaffCoach.name,
          avatarUrl: null,
        },
      }

      vi.mocked(prisma.sessionRequest.findFirst).mockResolvedValue(mockRequestWithCoachAction as never)
      vi.mocked(prisma.sessionRequest.update).mockResolvedValue({
        ...mockRequestWithCoachAction,
        status: 'declined',
      } as never)
      vi.mocked(prisma.sessionProposal.update).mockResolvedValue({} as never)

      const request = createMockRequest({ action: 'decline' })
      const response = await memberRespondToRequest(
        request as never,
        { params: Promise.resolve({ id: mockSessionRequest.id }) }
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.action).toBe('declined')
    })

    it('should counter a session request with new proposal', async () => {
      const mockRequestWithCoachAction = {
        ...mockSessionRequest,
        lastActionBy: 'coach',
        proposalHistory: [mockSessionProposal],
        staff: {
          id: mockStaffCoach.id,
          name: mockStaffCoach.name,
          avatarUrl: null,
        },
      }

      vi.mocked(prisma.sessionRequest.findFirst).mockResolvedValue(mockRequestWithCoachAction as never)
      vi.mocked(prisma.sessionRequest.update).mockResolvedValue({
        ...mockRequestWithCoachAction,
        status: 'countered',
        counterCount: 1,
      } as never)
      vi.mocked(prisma.sessionProposal.update).mockResolvedValue({} as never)
      vi.mocked(prisma.sessionProposal.create).mockResolvedValue({} as never)

      const newProposedAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      const request = createMockRequest({
        action: 'counter',
        proposedAt: newProposedAt,
        duration: 45,
        location: 'virtual',
        note: 'Can we do it online instead?',
      })
      const response = await memberRespondToRequest(
        request as never,
        { params: Promise.resolve({ id: mockSessionRequest.id }) }
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.action).toBe('countered')
    })

    it('should return 400 if not member turn to respond', async () => {
      const mockRequestWithMemberAction = {
        ...mockSessionRequest,
        lastActionBy: 'member', // Member already responded
        proposalHistory: [mockSessionProposal],
      }

      vi.mocked(prisma.sessionRequest.findFirst).mockResolvedValue(mockRequestWithMemberAction as never)

      const request = createMockRequest({ action: 'accept' })
      const response = await memberRespondToRequest(
        request as never,
        { params: Promise.resolve({ id: mockSessionRequest.id }) }
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('trenera')
    })

    it('should return 404 if request not found', async () => {
      vi.mocked(prisma.sessionRequest.findFirst).mockResolvedValue(null)

      const request = createMockRequest({ action: 'accept' })
      const response = await memberRespondToRequest(
        request as never,
        { params: Promise.resolve({ id: 'non-existent-id' }) }
      )
      const data = await response.json()

      expect(response.status).toBe(404)
    })

    it('should return 400 for invalid action', async () => {
      const request = createMockRequest({ action: 'invalid' })
      const response = await memberRespondToRequest(
        request as never,
        { params: Promise.resolve({ id: mockSessionRequest.id }) }
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('accept')
    })

    it('should return 401 if not authenticated', async () => {
      vi.mocked(getMemberFromSession).mockResolvedValue({ error: 'NO_SESSION' })

      const request = createMockRequest({ action: 'accept' })
      const response = await memberRespondToRequest(
        request as never,
        { params: Promise.resolve({ id: mockSessionRequest.id }) }
      )

      expect(response.status).toBe(401)
    })
  })
})

// =============================================================================
// MEMBER SESSION CANCELLATION TESTS
// =============================================================================

describe('Member Session Cancel API', () => {
  describe('POST /api/member/sessions/[id]/cancel', () => {
    beforeEach(() => {
      vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
    })

    it('should cancel a confirmed session with valid reason', async () => {
      vi.mocked(prisma.scheduledSession.findFirst).mockResolvedValue({
        ...mockScheduledSession,
        staff: { id: mockStaffCoach.id, name: mockStaffCoach.name },
      } as never)

      vi.mocked(prisma.scheduledSession.update).mockResolvedValue({
        ...mockScheduledSession,
        status: 'cancelled',
        cancelledBy: 'member',
        cancelledAt: new Date(),
        cancellationReason: 'Need to reschedule due to conflict',
      } as never)

      const request = createMockRequest({
        reason: 'Need to reschedule due to conflict',
      })
      const response = await memberCancelSession(
        request as never,
        { params: Promise.resolve({ id: mockScheduledSession.id }) }
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.session.status).toBe('cancelled')
    })

    it('should return 400 if cancellation reason is too short', async () => {
      const request = createMockRequest({
        reason: 'Short', // Less than 10 characters
      })
      const response = await memberCancelSession(
        request as never,
        { params: Promise.resolve({ id: mockScheduledSession.id }) }
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('10')
    })

    it('should return 400 if cancellation reason is missing', async () => {
      const request = createMockRequest({})
      const response = await memberCancelSession(
        request as never,
        { params: Promise.resolve({ id: mockScheduledSession.id }) }
      )
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should return 404 if session not found', async () => {
      vi.mocked(prisma.scheduledSession.findFirst).mockResolvedValue(null)

      const request = createMockRequest({
        reason: 'Need to reschedule due to conflict',
      })
      const response = await memberCancelSession(
        request as never,
        { params: Promise.resolve({ id: 'non-existent-id' }) }
      )
      const data = await response.json()

      expect(response.status).toBe(404)
    })

    it('should return 401 if not authenticated', async () => {
      vi.mocked(getMemberFromSession).mockResolvedValue({ error: 'NO_SESSION' })

      const request = createMockRequest({
        reason: 'Need to reschedule due to conflict',
      })
      const response = await memberCancelSession(
        request as never,
        { params: Promise.resolve({ id: mockScheduledSession.id }) }
      )

      expect(response.status).toBe(401)
    })
  })
})

// =============================================================================
// COACH SESSION REQUEST RESPONSE TESTS
// =============================================================================

describe('Coach Session Request Response API', () => {
  describe('POST /api/coach/sessions/requests/[id]', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockStaffSession)
    })

    it('should accept a session request from member', async () => {
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        id: mockStaffCoach.id,
        role: 'coach',
      } as never)

      const mockRequestWithMemberAction = {
        ...mockSessionRequestFromMember,
        lastActionBy: 'member',
        proposalHistory: [{ ...mockSessionProposal, proposedBy: 'member' }],
        member: {
          id: mockMember.id,
          name: mockMember.name,
          avatarUrl: null,
          memberId: mockMember.memberId,
        },
      }

      vi.mocked(prisma.sessionRequest.findFirst).mockResolvedValue(mockRequestWithMemberAction as never)
      vi.mocked(prisma.sessionRequest.update).mockResolvedValue({
        ...mockRequestWithMemberAction,
        status: 'accepted',
      } as never)
      vi.mocked(prisma.sessionProposal.update).mockResolvedValue({} as never)
      vi.mocked(prisma.scheduledSession.create).mockResolvedValue({
        ...mockScheduledSession,
        member: {
          id: mockMember.id,
          name: mockMember.name,
          avatarUrl: null,
          memberId: mockMember.memberId,
        },
      } as never)

      const request = createMockRequest({ action: 'accept' })
      const response = await coachRespondToRequest(
        request as never,
        { params: Promise.resolve({ id: mockSessionRequestFromMember.id }) }
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.action).toBe('accepted')
      expect(data.session).toBeDefined()
    })

    it('should decline a session request', async () => {
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        id: mockStaffCoach.id,
        role: 'coach',
      } as never)

      const mockRequestWithMemberAction = {
        ...mockSessionRequestFromMember,
        lastActionBy: 'member',
        proposalHistory: [mockSessionProposal],
        member: {
          id: mockMember.id,
          name: mockMember.name,
          avatarUrl: null,
          memberId: mockMember.memberId,
        },
      }

      vi.mocked(prisma.sessionRequest.findFirst).mockResolvedValue(mockRequestWithMemberAction as never)
      vi.mocked(prisma.sessionRequest.update).mockResolvedValue({
        ...mockRequestWithMemberAction,
        status: 'declined',
      } as never)
      vi.mocked(prisma.sessionProposal.update).mockResolvedValue({} as never)

      const request = createMockRequest({ action: 'decline' })
      const response = await coachRespondToRequest(
        request as never,
        { params: Promise.resolve({ id: mockSessionRequestFromMember.id }) }
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.action).toBe('declined')
    })

    it('should return 400 if not coach turn to respond', async () => {
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        id: mockStaffCoach.id,
        role: 'coach',
      } as never)

      const mockRequestWithCoachAction = {
        ...mockSessionRequest,
        lastActionBy: 'coach', // Coach already responded
        proposalHistory: [mockSessionProposal],
      }

      vi.mocked(prisma.sessionRequest.findFirst).mockResolvedValue(mockRequestWithCoachAction as never)

      const request = createMockRequest({ action: 'accept' })
      const response = await coachRespondToRequest(
        request as never,
        { params: Promise.resolve({ id: mockSessionRequest.id }) }
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('člana')
    })

    it('should return 403 if not a coach', async () => {
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        id: mockStaffCoach.id,
        role: 'ADMIN', // Not a coach
      } as never)

      const request = createMockRequest({ action: 'accept' })
      const response = await coachRespondToRequest(
        request as never,
        { params: Promise.resolve({ id: mockSessionRequest.id }) }
      )
      const data = await response.json()

      expect(response.status).toBe(403)
    })

    it('should return 401 if not authenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createMockRequest({ action: 'accept' })
      const response = await coachRespondToRequest(
        request as never,
        { params: Promise.resolve({ id: mockSessionRequest.id }) }
      )

      expect(response.status).toBe(401)
    })
  })
})

// =============================================================================
// COACH SESSION CANCELLATION TESTS
// =============================================================================

describe('Coach Session Cancel API', () => {
  describe('POST /api/coach/sessions/[id]/cancel', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockStaffSession)
    })

    it('should cancel a confirmed session with valid reason', async () => {
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        id: mockStaffCoach.id,
        role: 'coach',
      } as never)

      vi.mocked(prisma.scheduledSession.findFirst).mockResolvedValue({
        ...mockScheduledSession,
        member: { id: mockMember.id, name: mockMember.name },
      } as never)

      vi.mocked(prisma.scheduledSession.update).mockResolvedValue({
        ...mockScheduledSession,
        status: 'cancelled',
        cancelledBy: 'coach',
        cancelledAt: new Date(),
        cancellationReason: 'Schedule conflict - need to reschedule',
      } as never)

      const request = createMockRequest({
        reason: 'Schedule conflict - need to reschedule',
      })
      const response = await coachCancelSession(
        request as never,
        { params: Promise.resolve({ id: mockScheduledSession.id }) }
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.session.status).toBe('cancelled')
    })

    it('should return 400 if cancellation reason is too short', async () => {
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        id: mockStaffCoach.id,
        role: 'coach',
      } as never)

      const request = createMockRequest({
        reason: 'Short', // Less than 10 characters
      })
      const response = await coachCancelSession(
        request as never,
        { params: Promise.resolve({ id: mockScheduledSession.id }) }
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('10')
    })

    it('should return 403 if not a coach', async () => {
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        id: mockStaffCoach.id,
        role: 'ADMIN',
      } as never)

      const request = createMockRequest({
        reason: 'Schedule conflict - need to reschedule',
      })
      const response = await coachCancelSession(
        request as never,
        { params: Promise.resolve({ id: mockScheduledSession.id }) }
      )
      const data = await response.json()

      expect(response.status).toBe(403)
    })

    it('should return 401 if not authenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createMockRequest({
        reason: 'Schedule conflict - need to reschedule',
      })
      const response = await coachCancelSession(
        request as never,
        { params: Promise.resolve({ id: mockScheduledSession.id }) }
      )

      expect(response.status).toBe(401)
    })
  })
})

// =============================================================================
// COACH SESSION COMPLETION TESTS
// =============================================================================

describe('Coach Session Complete API', () => {
  describe('POST /api/coach/sessions/[id]/complete', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockStaffSession)
    })

    it('should mark a session as completed', async () => {
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        id: mockStaffCoach.id,
        role: 'coach',
      } as never)

      vi.mocked(prisma.scheduledSession.findFirst).mockResolvedValue({
        ...mockScheduledSession,
        member: { id: mockMember.id, name: mockMember.name },
      } as never)

      vi.mocked(prisma.scheduledSession.update).mockResolvedValue({
        ...mockScheduledSession,
        status: 'completed',
        completedAt: new Date(),
      } as never)

      const request = createMockRequest({})
      const response = await coachCompleteSession(
        request as never,
        { params: Promise.resolve({ id: mockScheduledSession.id }) }
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.session.status).toBe('completed')
    })

    it('should return 404 if session not found or already completed', async () => {
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        id: mockStaffCoach.id,
        role: 'coach',
      } as never)

      vi.mocked(prisma.scheduledSession.findFirst).mockResolvedValue(null)

      const request = createMockRequest({})
      const response = await coachCompleteSession(
        request as never,
        { params: Promise.resolve({ id: 'non-existent-id' }) }
      )
      const data = await response.json()

      expect(response.status).toBe(404)
    })

    it('should return 403 if not a coach', async () => {
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        id: mockStaffCoach.id,
        role: 'ADMIN',
      } as never)

      const request = createMockRequest({})
      const response = await coachCompleteSession(
        request as never,
        { params: Promise.resolve({ id: mockScheduledSession.id }) }
      )
      const data = await response.json()

      expect(response.status).toBe(403)
    })

    it('should return 401 if not authenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createMockRequest({})
      const response = await coachCompleteSession(
        request as never,
        { params: Promise.resolve({ id: mockScheduledSession.id }) }
      )

      expect(response.status).toBe(401)
    })
  })
})
