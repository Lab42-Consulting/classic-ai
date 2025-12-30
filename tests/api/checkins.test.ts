import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST, GET } from '@/app/api/checkins/route'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import {
  mockMemberSession,
  mockStaffSession,
  mockWeeklyCheckin,
  mockCheckinHistory,
  createMockRequest,
  createMockGetRequest,
  getSunday,
  getWeekday,
} from '../mocks/fixtures'

// Mock the getWeekNumber function
vi.mock('@/lib/calculations', async () => {
  const actual = await vi.importActual<typeof import('@/lib/calculations')>('@/lib/calculations')
  return {
    ...actual,
    getWeekNumber: () => ({ week: 1, year: 2025 }),
  }
})

describe('Checkins API', () => {
  // =========================================================================
  // POST /api/checkins - Create Check-in
  // =========================================================================
  describe('POST /api/checkins - Create Check-in', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockMemberSession)
    })

    describe('Authentication', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getSession).mockResolvedValue(null)

        const request = createMockRequest({ weight: 85, feeling: 3 })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })

      it('should return 401 if session is not member type', async () => {
        vi.mocked(getSession).mockResolvedValue(mockStaffSession)

        const request = createMockRequest({ weight: 85, feeling: 3 })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })
    })

    describe('Sunday-only Check-in Rule', () => {
      it('should allow check-in on Sunday', async () => {
        // Mock Date to be a Sunday
        const sunday = getSunday()
        vi.useFakeTimers()
        vi.setSystemTime(sunday)

        vi.mocked(prisma.weeklyCheckin.findUnique).mockResolvedValue(null)
        vi.mocked(prisma.weeklyCheckin.findFirst).mockResolvedValue(null)
        vi.mocked(prisma.weeklyCheckin.create).mockResolvedValue(mockWeeklyCheckin as never)
        vi.mocked(prisma.member.update).mockResolvedValue({} as never)

        const request = createMockRequest({ weight: 84.5, feeling: 3 })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)

        vi.useRealTimers()
      })

      it('should reject check-in on weekdays', async () => {
        // Mock Date to be a weekday
        const weekday = getWeekday()
        vi.useFakeTimers()
        vi.setSystemTime(weekday)

        const request = createMockRequest({ weight: 85, feeling: 3 })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Nedeljni pregled je dostupan samo nedeljom')
        expect(data.daysUntilSunday).toBeDefined()

        vi.useRealTimers()
      })
    })

    describe('Weight Validation', () => {
      beforeEach(() => {
        const sunday = getSunday()
        vi.useFakeTimers()
        vi.setSystemTime(sunday)
      })

      afterEach(() => {
        vi.useRealTimers()
      })

      it('should return 400 if weight is missing', async () => {
        const request = createMockRequest({ feeling: 3 })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Valid weight is required (30-300 kg)')
      })

      it('should return 400 if weight is below 30kg', async () => {
        const request = createMockRequest({ weight: 25, feeling: 3 })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Valid weight is required (30-300 kg)')
      })

      it('should return 400 if weight is above 300kg', async () => {
        const request = createMockRequest({ weight: 350, feeling: 3 })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Valid weight is required (30-300 kg)')
      })

      it('should return 400 if weight is not a number', async () => {
        const request = createMockRequest({ weight: 'heavy', feeling: 3 })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Valid weight is required (30-300 kg)')
      })
    })

    describe('Feeling Validation', () => {
      beforeEach(() => {
        const sunday = getSunday()
        vi.useFakeTimers()
        vi.setSystemTime(sunday)
      })

      afterEach(() => {
        vi.useRealTimers()
      })

      it('should return 400 if feeling is missing', async () => {
        const request = createMockRequest({ weight: 85 })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Feeling is required (1-4)')
      })

      it('should return 400 if feeling is below 1', async () => {
        const request = createMockRequest({ weight: 85, feeling: 0 })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Feeling is required (1-4)')
      })

      it('should return 400 if feeling is above 4', async () => {
        const request = createMockRequest({ weight: 85, feeling: 5 })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Feeling is required (1-4)')
      })
    })

    describe('Duplicate Check-in Prevention', () => {
      beforeEach(() => {
        const sunday = getSunday()
        vi.useFakeTimers()
        vi.setSystemTime(sunday)
      })

      afterEach(() => {
        vi.useRealTimers()
      })

      it('should reject if already checked in this week', async () => {
        vi.mocked(prisma.weeklyCheckin.findUnique).mockResolvedValue(mockWeeklyCheckin as never)

        const request = createMockRequest({ weight: 85, feeling: 3 })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Već si završio pregled ove nedelje')
      })
    })

    describe('7-Day Minimum Interval', () => {
      beforeEach(() => {
        const sunday = getSunday()
        vi.useFakeTimers()
        vi.setSystemTime(sunday)
      })

      afterEach(() => {
        vi.useRealTimers()
      })

      it('should reject if less than 7 days since last check-in', async () => {
        vi.mocked(prisma.weeklyCheckin.findUnique).mockResolvedValue(null)

        // Last check-in was 3 days ago
        const recentCheckin = {
          ...mockWeeklyCheckin,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        }
        vi.mocked(prisma.weeklyCheckin.findFirst).mockResolvedValue(recentCheckin as never)

        const request = createMockRequest({ weight: 85, feeling: 3 })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Moraš sačekati još')
        expect(data.daysRemaining).toBeDefined()
      })

      it('should allow check-in if 7+ days since last check-in', async () => {
        vi.mocked(prisma.weeklyCheckin.findUnique).mockResolvedValue(null)

        // Last check-in was 8 days ago
        const oldCheckin = {
          ...mockWeeklyCheckin,
          createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        }
        vi.mocked(prisma.weeklyCheckin.findFirst).mockResolvedValue(oldCheckin as never)
        vi.mocked(prisma.weeklyCheckin.create).mockResolvedValue(mockWeeklyCheckin as never)
        vi.mocked(prisma.member.update).mockResolvedValue({} as never)

        const request = createMockRequest({ weight: 84.5, feeling: 3 })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })
    })

    describe('Successful Check-in', () => {
      beforeEach(() => {
        const sunday = getSunday()
        vi.useFakeTimers()
        vi.setSystemTime(sunday)
      })

      afterEach(() => {
        vi.useRealTimers()
      })

      it('should create check-in and update member weight', async () => {
        vi.mocked(prisma.weeklyCheckin.findUnique).mockResolvedValue(null)
        vi.mocked(prisma.weeklyCheckin.findFirst).mockResolvedValue(null)
        vi.mocked(prisma.weeklyCheckin.create).mockResolvedValue(mockWeeklyCheckin as never)
        vi.mocked(prisma.member.update).mockResolvedValue({} as never)

        const request = createMockRequest({ weight: 84.5, feeling: 3 })
        const response = await POST(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.checkin).toBeDefined()

        expect(prisma.weeklyCheckin.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            memberId: mockMemberSession.userId,
            weight: 84.5,
            feeling: 3,
          }),
        })

        expect(prisma.member.update).toHaveBeenCalledWith({
          where: { id: mockMemberSession.userId },
          data: { weight: 84.5 },
        })
      })
    })
  })

  // =========================================================================
  // GET /api/checkins - Get Check-in Status
  // =========================================================================
  describe('GET /api/checkins - Get Check-in Status', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockMemberSession)
    })

    describe('Authentication', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getSession).mockResolvedValue(null)

        const request = createMockGetRequest()
        const response = await GET()
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })
    })

    describe('Check-in Status Response', () => {
      it('should return canCheckIn: true on Sunday with no prior check-in this week', async () => {
        const sunday = getSunday()
        vi.useFakeTimers()
        vi.setSystemTime(sunday)

        vi.mocked(prisma.weeklyCheckin.findUnique).mockResolvedValue(null)
        vi.mocked(prisma.weeklyCheckin.findFirst).mockResolvedValue(null)
        vi.mocked(prisma.weeklyCheckin.findMany).mockResolvedValue([])

        const response = await GET()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.canCheckIn).toBe(true)
        expect(data.isSunday).toBe(true)
        expect(data.hasCheckedInThisWeek).toBe(false)

        vi.useRealTimers()
      })

      it('should return canCheckIn: false with reason "sunday_only" on weekdays', async () => {
        const weekday = getWeekday()
        vi.useFakeTimers()
        vi.setSystemTime(weekday)

        vi.mocked(prisma.weeklyCheckin.findUnique).mockResolvedValue(null)
        vi.mocked(prisma.weeklyCheckin.findFirst).mockResolvedValue(null)
        vi.mocked(prisma.weeklyCheckin.findMany).mockResolvedValue([])

        const response = await GET()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.canCheckIn).toBe(false)
        expect(data.reason).toBe('sunday_only')
        expect(data.isSunday).toBe(false)

        vi.useRealTimers()
      })

      it('should return canCheckIn: false with reason "already_done" if checked in this week', async () => {
        const sunday = getSunday()
        vi.useFakeTimers()
        vi.setSystemTime(sunday)

        vi.mocked(prisma.weeklyCheckin.findUnique).mockResolvedValue(mockWeeklyCheckin as never)
        vi.mocked(prisma.weeklyCheckin.findFirst).mockResolvedValue(mockWeeklyCheckin as never)
        vi.mocked(prisma.weeklyCheckin.findMany).mockResolvedValue([mockWeeklyCheckin] as never)

        const response = await GET()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.canCheckIn).toBe(false)
        expect(data.reason).toBe('already_done')
        expect(data.hasCheckedInThisWeek).toBe(true)

        vi.useRealTimers()
      })

      it('should return recent check-ins history', async () => {
        const sunday = getSunday()
        vi.useFakeTimers()
        vi.setSystemTime(sunday)

        vi.mocked(prisma.weeklyCheckin.findUnique).mockResolvedValue(null)
        vi.mocked(prisma.weeklyCheckin.findFirst).mockResolvedValue(null)
        vi.mocked(prisma.weeklyCheckin.findMany).mockResolvedValue(mockCheckinHistory as never)

        const response = await GET()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.recentCheckins).toHaveLength(4)

        vi.useRealTimers()
      })

      it('should calculate missed weeks for accountability', async () => {
        const sunday = getSunday()
        vi.useFakeTimers()
        vi.setSystemTime(sunday)

        vi.mocked(prisma.weeklyCheckin.findUnique).mockResolvedValue(null)
        vi.mocked(prisma.weeklyCheckin.findFirst).mockResolvedValue(null)
        vi.mocked(prisma.weeklyCheckin.findMany).mockResolvedValue(mockCheckinHistory as never)

        const response = await GET()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.missedWeeks).toBeDefined()
        expect(typeof data.missedWeeks).toBe('number')

        vi.useRealTimers()
      })
    })
  })
})
