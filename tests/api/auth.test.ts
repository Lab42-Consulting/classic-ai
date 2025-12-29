import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST as loginPost } from '@/app/api/auth/login/route'
import { POST as staffLoginPost } from '@/app/api/auth/staff-login/route'
import { POST as logoutPost } from '@/app/api/auth/logout/route'
import prisma from '@/lib/db'
import { verifyPin, createSession, setSessionCookie, clearSession } from '@/lib/auth'
import {
  mockMember,
  mockMemberWithGym,
  mockInactiveMember,
  mockStaffCoach,
  mockGym,
  createMockRequest,
} from '../mocks/fixtures'

describe('Authentication API', () => {
  // =========================================================================
  // MEMBER LOGIN TESTS
  // =========================================================================
  describe('POST /api/auth/login - Member Login', () => {
    beforeEach(() => {
      vi.mocked(createSession).mockResolvedValue('mock-jwt-token')
      vi.mocked(setSessionCookie).mockResolvedValue()
    })

    it('should successfully login a valid member', async () => {
      vi.mocked(prisma.member.findUnique).mockResolvedValue(mockMemberWithGym as never)
      vi.mocked(verifyPin).mockResolvedValue(true)

      const request = createMockRequest({
        memberId: 'ABC123',
        pin: '1234',
        gymId: mockGym.id,
      })

      const response = await loginPost(request as never)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user).toEqual({
        id: mockMember.id,
        name: mockMember.name,
        goal: mockMember.goal,
      })
      expect(setSessionCookie).toHaveBeenCalledWith('mock-jwt-token')
    })

    it('should return 400 if memberId is missing', async () => {
      const request = createMockRequest({
        pin: '1234',
        gymId: mockGym.id,
      })

      const response = await loginPost(request as never)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Member ID, PIN, and Gym are required')
    })

    it('should return 400 if pin is missing', async () => {
      const request = createMockRequest({
        memberId: 'ABC123',
        gymId: mockGym.id,
      })

      const response = await loginPost(request as never)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Member ID, PIN, and Gym are required')
    })

    it('should return 400 if gymId is missing', async () => {
      const request = createMockRequest({
        memberId: 'ABC123',
        pin: '1234',
      })

      const response = await loginPost(request as never)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Member ID, PIN, and Gym are required')
    })

    it('should return 401 for non-existent member', async () => {
      vi.mocked(prisma.member.findUnique).mockResolvedValue(null)

      const request = createMockRequest({
        memberId: 'INVALID',
        pin: '1234',
        gymId: mockGym.id,
      })

      const response = await loginPost(request as never)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid Member ID or PIN')
    })

    it('should return 401 for incorrect PIN', async () => {
      vi.mocked(prisma.member.findUnique).mockResolvedValue(mockMemberWithGym as never)
      vi.mocked(verifyPin).mockResolvedValue(false)

      const request = createMockRequest({
        memberId: 'ABC123',
        pin: '9999',
        gymId: mockGym.id,
      })

      const response = await loginPost(request as never)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid Member ID or PIN')
    })

    it('should return 403 for inactive member', async () => {
      const inactiveWithGym = { ...mockInactiveMember, gym: mockGym }
      vi.mocked(prisma.member.findUnique).mockResolvedValue(inactiveWithGym as never)

      const request = createMockRequest({
        memberId: 'INA001',
        pin: '1234',
        gymId: mockGym.id,
      })

      const response = await loginPost(request as never)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Your account is not active. Please contact staff.')
    })

    it('should convert memberId to uppercase', async () => {
      vi.mocked(prisma.member.findUnique).mockResolvedValue(mockMemberWithGym as never)
      vi.mocked(verifyPin).mockResolvedValue(true)

      const request = createMockRequest({
        memberId: 'abc123',
        pin: '1234',
        gymId: mockGym.id,
      })

      await loginPost(request as never)

      expect(prisma.member.findUnique).toHaveBeenCalledWith({
        where: {
          memberId_gymId: {
            memberId: 'ABC123',
            gymId: mockGym.id,
          },
        },
        include: { gym: true },
      })
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.member.findUnique).mockRejectedValue(new Error('Database error'))

      const request = createMockRequest({
        memberId: 'ABC123',
        pin: '1234',
        gymId: mockGym.id,
      })

      const response = await loginPost(request as never)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An error occurred during login')
    })
  })

  // =========================================================================
  // STAFF LOGIN TESTS
  // =========================================================================
  describe('POST /api/auth/staff-login - Staff Login', () => {
    beforeEach(() => {
      vi.mocked(createSession).mockResolvedValue('mock-jwt-token')
      vi.mocked(setSessionCookie).mockResolvedValue()
    })

    it('should successfully login a valid staff member', async () => {
      vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffCoach as never)
      vi.mocked(verifyPin).mockResolvedValue(true)

      const request = createMockRequest({
        staffId: 'S-COACH',
        pin: '1234',
        gymId: mockGym.id,
      })

      const response = await staffLoginPost(request as never)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user).toEqual({
        id: mockStaffCoach.id,
        name: mockStaffCoach.name,
        role: mockStaffCoach.role,
      })
    })

    it('should return 400 if staffId is missing', async () => {
      const request = createMockRequest({
        pin: '1234',
        gymId: mockGym.id,
      })

      const response = await staffLoginPost(request as never)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Staff ID, PIN, and Gym are required')
    })

    it('should return 401 for non-existent staff', async () => {
      vi.mocked(prisma.staff.findUnique).mockResolvedValue(null)

      const request = createMockRequest({
        staffId: 'S-INVALID',
        pin: '1234',
        gymId: mockGym.id,
      })

      const response = await staffLoginPost(request as never)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid Staff ID or PIN')
    })

    it('should return 401 for incorrect PIN', async () => {
      vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffCoach as never)
      vi.mocked(verifyPin).mockResolvedValue(false)

      const request = createMockRequest({
        staffId: 'S-COACH',
        pin: '9999',
        gymId: mockGym.id,
      })

      const response = await staffLoginPost(request as never)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid Staff ID or PIN')
    })
  })

  // =========================================================================
  // LOGOUT TESTS
  // =========================================================================
  describe('POST /api/auth/logout - Logout', () => {
    it('should successfully logout and clear session', async () => {
      vi.mocked(clearSession).mockResolvedValue()

      const request = createMockRequest({})

      const response = await logoutPost(request as never)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(clearSession).toHaveBeenCalled()
    })
  })
})
