import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as listOrders } from '@/app/api/admin/orders/route'
import { GET as getOrder, PATCH as patchOrder } from '@/app/api/admin/orders/[id]/route'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import {
  mockAdminSession,
  mockStaffSession,
  mockStaffAdmin,
  mockStaffCoach,
  mockGym,
  createMockRequest,
  createMockGetRequest,
} from '../mocks/fixtures'

function asAdmin() {
  vi.mocked(getSession).mockResolvedValue(mockAdminSession)
  vi.mocked(prisma.staff.findUnique).mockResolvedValue({
    id: mockStaffAdmin.id,
    role: 'ADMIN',
    gymId: mockGym.id,
    name: mockStaffAdmin.name,
  } as never)
}

function ctx(id = 'o1') {
  return { params: Promise.resolve({ id }) }
}

const baseOrder = {
  id: 'o1',
  gymId: mockGym.id,
  orderNumber: '0001',
  status: 'new',
  fulfillmentType: 'pickup',
  memberId: null,
  items: [{ id: 'i1', productId: 'p1', quantity: 2, unitPriceRsd: 3500, lineTotalRsd: 7000 }],
}

describe('Admin orders API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists orders for an admin', async () => {
    asAdmin()
    vi.mocked(prisma.order.findMany).mockResolvedValue([baseOrder] as never)
    const res = await listOrders(createMockGetRequest() as never)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.orders).toHaveLength(1)
  })

  it('rejects a coach', async () => {
    vi.mocked(getSession).mockResolvedValue(mockStaffSession)
    vi.mocked(prisma.staff.findUnique).mockResolvedValue({
      id: mockStaffCoach.id,
      role: 'COACH',
      gymId: mockGym.id,
      name: mockStaffCoach.name,
    } as never)
    const res = await listOrders(createMockGetRequest() as never)
    expect(res.status).toBe(403)
  })

  it('returns 404 for a missing order', async () => {
    asAdmin()
    vi.mocked(prisma.order.findFirst).mockResolvedValue(null)
    const res = await getOrder(createMockGetRequest() as never, ctx())
    expect(res.status).toBe(404)
  })

  it('advances status new -> confirmed', async () => {
    asAdmin()
    vi.mocked(prisma.order.findFirst).mockResolvedValue(baseOrder as never)
    vi.mocked(prisma.order.update).mockResolvedValue({ ...baseOrder, status: 'confirmed' } as never)
    const res = await patchOrder(createMockRequest({ status: 'confirmed' }, 'PATCH') as never, ctx())
    expect(res.status).toBe(200)
    expect((await res.json()).order.status).toBe('confirmed')
  })

  it('fulfilling decrements stock and records a Sale + StockLog', async () => {
    asAdmin()
    vi.mocked(prisma.order.findFirst).mockResolvedValue(baseOrder as never)
    vi.mocked(prisma.product.findUnique).mockResolvedValue({ currentStock: 5 } as never)
    vi.mocked(prisma.product.update).mockResolvedValue({} as never)
    vi.mocked(prisma.stockLog.create).mockResolvedValue({} as never)
    vi.mocked(prisma.sale.create).mockResolvedValue({} as never)
    vi.mocked(prisma.order.update).mockResolvedValue({ ...baseOrder, status: 'fulfilled' } as never)

    const res = await patchOrder(createMockRequest({ status: 'fulfilled' }, 'PATCH') as never, ctx())
    expect(res.status).toBe(200)
    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { currentStock: 3 } }) // 5 - 2
    )
    expect(prisma.sale.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ quantity: 2, totalAmount: 7000, paymentMethod: 'cash' }) })
    )
    expect(prisma.stockLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'sale', quantity: -2, newStock: 3 }) })
    )
  })

  it('guards against re-fulfilling an already fulfilled order', async () => {
    asAdmin()
    vi.mocked(prisma.order.findFirst).mockResolvedValue({ ...baseOrder, status: 'fulfilled' } as never)
    const res = await patchOrder(createMockRequest({ status: 'fulfilled' }, 'PATCH') as never, ctx())
    expect(res.status).toBe(400)
  })

  it('requires a reason to cancel', async () => {
    asAdmin()
    vi.mocked(prisma.order.findFirst).mockResolvedValue(baseOrder as never)
    const res = await patchOrder(createMockRequest({ status: 'cancelled' }, 'PATCH') as never, ctx())
    expect(res.status).toBe(400)
  })

  it('cancels with a reason', async () => {
    asAdmin()
    vi.mocked(prisma.order.findFirst).mockResolvedValue(baseOrder as never)
    vi.mocked(prisma.order.update).mockResolvedValue({ ...baseOrder, status: 'cancelled' } as never)
    const res = await patchOrder(
      createMockRequest({ status: 'cancelled', cancelledReason: 'Nema na stanju' }, 'PATCH') as never,
      ctx()
    )
    expect(res.status).toBe(200)
  })
})
