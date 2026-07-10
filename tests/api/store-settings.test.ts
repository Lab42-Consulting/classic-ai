import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as getStore, PATCH as patchStore } from '@/app/api/admin/store-settings/route'
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

function asAdmin() {
  vi.mocked(getSession).mockResolvedValue(mockAdminSession)
  vi.mocked(prisma.staff.findUnique).mockResolvedValue({
    ...mockStaffAdmin,
    role: 'ADMIN',
    gymId: mockGym.id,
  } as never)
}

describe('Store settings API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns store settings for an admin', async () => {
    asAdmin()
    vi.mocked(prisma.gym.findUnique).mockResolvedValue({
      storeEnabled: false,
      storePickupAddress: null,
      storeDeliveryFeeRsd: null,
      storeFreeDeliveryThresholdRsd: null,
      storeContactPhone: null,
      storeNote: null,
    } as never)
    const res = await getStore()
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.store.storeEnabled).toBe(false)
  })

  it('enables the store and normalizes RSD fields', async () => {
    asAdmin()
    vi.mocked(prisma.gym.update).mockResolvedValue({ storeEnabled: true } as never)
    const res = await patchStore(
      createMockRequest(
        { storeEnabled: true, storeDeliveryFeeRsd: 300, storeFreeDeliveryThresholdRsd: 5000 },
        'PATCH'
      ) as never
    )
    expect(res.status).toBe(200)
    expect(prisma.gym.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockGym.id },
        data: expect.objectContaining({
          storeEnabled: true,
          storeDeliveryFeeRsd: 300,
          storeFreeDeliveryThresholdRsd: 5000,
        }),
      })
    )
  })

  it('rejects a coach with 403', async () => {
    vi.mocked(getSession).mockResolvedValue(mockStaffSession)
    vi.mocked(prisma.staff.findUnique).mockResolvedValue({
      ...mockStaffCoach,
      role: 'COACH',
      gymId: mockGym.id,
    } as never)
    const res = await patchStore(createMockRequest({ storeEnabled: true }, 'PATCH') as never)
    expect(res.status).toBe(403)
  })
})
