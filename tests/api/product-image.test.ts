import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST as uploadImage } from '@/app/api/admin/products/image/route'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import {
  mockAdminSession,
  mockStaffSession,
  mockStaffAdmin,
  mockStaffCoach,
  mockGym,
  createMockRequest,
} from '../mocks/fixtures'

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAhowever'

function asAdmin() {
  vi.mocked(getSession).mockResolvedValue(mockAdminSession)
  vi.mocked(prisma.staff.findUnique).mockResolvedValue({
    ...mockStaffAdmin,
    role: 'ADMIN',
    gymId: mockGym.id,
  } as never)
}

describe('POST /api/admin/products/image', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uploads a base64 image and returns a blob URL for an admin', async () => {
    asAdmin()
    const res = await uploadImage(createMockRequest({ imageUrl: PNG }) as never)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.url).toContain('blob.vercel-storage.com')
  })

  it('returns an existing blob URL as-is', async () => {
    asAdmin()
    const url = 'https://x.blob.vercel-storage.com/existing.jpg'
    const res = await uploadImage(createMockRequest({ imageUrl: url }) as never)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.url).toBe(url)
  })

  it('rejects a coach with 403', async () => {
    vi.mocked(getSession).mockResolvedValue(mockStaffSession)
    vi.mocked(prisma.staff.findUnique).mockResolvedValue({
      ...mockStaffCoach,
      role: 'COACH',
      gymId: mockGym.id,
    } as never)
    const res = await uploadImage(createMockRequest({ imageUrl: PNG }) as never)
    expect(res.status).toBe(403)
  })

  it('requires an image', async () => {
    asAdmin()
    const res = await uploadImage(createMockRequest({}) as never)
    expect(res.status).toBe(400)
  })
})
