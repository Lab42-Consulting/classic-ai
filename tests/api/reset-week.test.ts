import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/member/reset-week/route'
import prisma from '@/lib/db'
import { getMemberFromSession } from '@/lib/auth'
import {
  mockMember,
  mockMemberAuthResult,
  mockNoSessionError,
  mockStaffNoLinkedMemberError,
} from '../mocks/fixtures'

describe('Reset Week API', () => {
  // =========================================================================
  // POST /api/member/reset-week - Reset Week
  // =========================================================================
  describe('POST /api/member/reset-week', () => {
    describe('Authentication', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockNoSessionError)

        const response = await POST()
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.code).toBe('NO_SESSION')
      })

      it('should return 401 if staff without linked member', async () => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockStaffNoLinkedMemberError)

        const response = await POST()
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.code).toBe('STAFF_NO_LINKED_MEMBER')
      })
    })

    describe('Week Reset', () => {
      beforeEach(() => {
        vi.mocked(getMemberFromSession).mockResolvedValue(mockMemberAuthResult)
      })

      it('should successfully reset week and return new weekResetAt', async () => {
        const now = new Date()
        vi.mocked(prisma.member.update).mockResolvedValue({
          id: mockMember.id,
          weekResetAt: now,
        } as never)

        const response = await POST()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.message).toBe('Nedelja uspešno resetovana')
        expect(data.weekResetAt).toBeDefined()
      })

      it('should call prisma.member.update with correct parameters', async () => {
        const now = new Date()
        vi.mocked(prisma.member.update).mockResolvedValue({
          id: mockMember.id,
          weekResetAt: now,
        } as never)

        await POST()

        expect(prisma.member.update).toHaveBeenCalledWith({
          where: { id: mockMemberAuthResult.memberId },
          data: { weekResetAt: expect.any(Date) },
          select: {
            id: true,
            weekResetAt: true,
          },
        })
      })

      it('should allow multiple resets (each sets new timestamp)', async () => {
        const firstReset = new Date('2025-01-01T10:00:00Z')
        const secondReset = new Date('2025-01-03T12:00:00Z')

        vi.mocked(prisma.member.update)
          .mockResolvedValueOnce({ id: mockMember.id, weekResetAt: firstReset } as never)
          .mockResolvedValueOnce({ id: mockMember.id, weekResetAt: secondReset } as never)

        const response1 = await POST()
        const data1 = await response1.json()
        expect(data1.success).toBe(true)

        const response2 = await POST()
        const data2 = await response2.json()
        expect(data2.success).toBe(true)
        // Each reset creates a new timestamp
        expect(prisma.member.update).toHaveBeenCalledTimes(2)
      })

      it('should return 500 on database error', async () => {
        vi.mocked(prisma.member.update).mockRejectedValue(new Error('Database error'))

        const response = await POST()
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Greška pri resetovanju nedelje')
      })
    })
  })
})
