import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, GET } from '@/app/api/members/route'
import prisma from '@/lib/db'
import { getSession, generateMemberId, generatePin, hashPin } from '@/lib/auth'
import { checkMemberCapacity } from '@/lib/subscription/guards'
import {
  mockMember,
  mockStaffSession,
  mockMemberSession,
  mockGym,
  createMockRequest,
} from '../mocks/fixtures'

// Global beforeEach to setup subscription guards mock for member tests
beforeEach(() => {
  vi.mocked(checkMemberCapacity).mockResolvedValue({ allowed: true, current: 10, limit: 150, tier: 'pro' })
})

describe('Members API (Staff)', () => {
  // =========================================================================
  // POST /api/members - Register New Member
  // =========================================================================
  describe('POST /api/members - Register New Member', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockStaffSession)
      vi.mocked(generateMemberId).mockReturnValue('NEW123')
      vi.mocked(generatePin).mockReturnValue('5678')
      vi.mocked(hashPin).mockResolvedValue('$2a$10$hashedPinValue')
    })

    describe('Authentication', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getSession).mockResolvedValue(null)

        const request = createMockRequest({ name: 'New Member', goal: 'fat_loss' })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })

      it('should return 401 if session is member type', async () => {
        vi.mocked(getSession).mockResolvedValue(mockMemberSession)

        const request = createMockRequest({ name: 'New Member', goal: 'fat_loss' })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })
    })

    describe('Validation', () => {
      it('should return 400 if name is missing', async () => {
        const request = createMockRequest({ goal: 'fat_loss' })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Name and goal are required')
      })

      it('should return 400 if goal is missing', async () => {
        const request = createMockRequest({ name: 'New Member' })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Name and goal are required')
      })

      it('should return 400 for invalid goal', async () => {
        const request = createMockRequest({ name: 'New Member', goal: 'invalid' })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid goal')
      })
    })

    describe('Successful Registration', () => {
      it('should register a new member with minimal data', async () => {
        vi.mocked(prisma.member.findFirst).mockResolvedValue(null)
        vi.mocked(prisma.member.create).mockResolvedValue({
          id: 'new-member-id',
          memberId: 'NEW123',
          name: 'New Member',
          goal: 'fat_loss',
          qrCode: 'data:image/png;base64,mockQRCode',
        } as never)

        const request = createMockRequest({ name: 'New Member', goal: 'fat_loss' })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.member).toBeDefined()
        expect(data.credentials).toBeDefined()
        expect(data.credentials.memberId).toBe('NEW123')
        expect(data.credentials.pin).toBe('5678')
      })

      it('should register a member with all optional fields', async () => {
        vi.mocked(prisma.member.findFirst).mockResolvedValue(null)
        vi.mocked(prisma.member.create).mockResolvedValue({
          id: 'new-member-id',
          memberId: 'NEW123',
          name: 'Full Member',
          goal: 'muscle_gain',
          height: 180,
          weight: 85,
          gender: 'male',
          qrCode: 'data:image/png;base64,mockQRCode',
        } as never)

        const request = createMockRequest({
          name: 'Full Member',
          goal: 'muscle_gain',
          height: '180',
          weight: '85',
          gender: 'male',
        })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(prisma.member.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            name: 'Full Member',
            goal: 'muscle_gain',
            height: 180,
            weight: 85,
            gender: 'male',
            gymId: mockStaffSession.gymId,
          }),
        })
      })

      it('should generate unique member ID if collision occurs', async () => {
        // First call returns existing member (collision)
        // Second call returns null (no collision)
        vi.mocked(prisma.member.findFirst)
          .mockResolvedValueOnce(mockMember as never)
          .mockResolvedValueOnce(null)

        vi.mocked(generateMemberId)
          .mockReturnValueOnce('ABC123') // Collision
          .mockReturnValueOnce('XYZ789') // Unique

        vi.mocked(prisma.member.create).mockResolvedValue({
          id: 'new-member-id',
          memberId: 'XYZ789',
          name: 'New Member',
          goal: 'fat_loss',
        } as never)

        const request = createMockRequest({ name: 'New Member', goal: 'fat_loss' })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(generateMemberId).toHaveBeenCalledTimes(2)
      })
    })
  })

  // =========================================================================
  // GET /api/members - List Members
  // =========================================================================
  describe('GET /api/members - List Members', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockStaffSession)
    })

    describe('Authentication', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getSession).mockResolvedValue(null)

        const response = await GET()
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })

      it('should return 401 if session is member type', async () => {
        vi.mocked(getSession).mockResolvedValue(mockMemberSession)

        const response = await GET()
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })
    })

    describe('Member Listing', () => {
      it('should return list of members with activity status', async () => {
        const membersWithCounts = [
          {
            ...mockMember,
            _count: { dailyLogs: 10, weeklyCheckins: 4 },
          },
        ]
        vi.mocked(prisma.member.findMany).mockResolvedValue(membersWithCounts as never)
        vi.mocked(prisma.dailyLog.findMany).mockResolvedValue([
          { createdAt: new Date() },
          { createdAt: new Date() },
          { createdAt: new Date() },
        ] as never)

        const response = await GET()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.members).toBeDefined()
        expect(data.members).toHaveLength(1)
        expect(data.members[0].activityStatus).toBe('active')
      })

      it('should mark member as "slipping" with some activity in 30 days but <3 in last week', async () => {
        const membersWithCounts = [
          {
            ...mockMember,
            _count: { dailyLogs: 5, weeklyCheckins: 2 },
          },
        ]
        vi.mocked(prisma.member.findMany).mockResolvedValue(membersWithCounts as never)

        // Activity from 10 days ago (outside last 7 days but within 30)
        const tenDaysAgo = new Date()
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)

        vi.mocked(prisma.dailyLog.findMany).mockResolvedValue([
          { createdAt: tenDaysAgo },
          { createdAt: tenDaysAgo },
        ] as never)

        const response = await GET()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.members[0].activityStatus).toBe('slipping')
      })

      it('should mark member as "inactive" with no activity in 30 days', async () => {
        const membersWithCounts = [
          {
            ...mockMember,
            _count: { dailyLogs: 0, weeklyCheckins: 0 },
          },
        ]
        vi.mocked(prisma.member.findMany).mockResolvedValue(membersWithCounts as never)
        vi.mocked(prisma.dailyLog.findMany).mockResolvedValue([])

        const response = await GET()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.members[0].activityStatus).toBe('inactive')
      })

      it('should return empty array if no members', async () => {
        vi.mocked(prisma.member.findMany).mockResolvedValue([])

        const response = await GET()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.members).toHaveLength(0)
      })
    })
  })
})
