import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST as placeOrder } from '@/app/api/public/shop/[slug]/orders/route'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { mockGym, createMockRequest } from '../mocks/fixtures'

const enabledGym = {
  id: mockGym.id,
  name: mockGym.name,
  logo: null,
  primaryColor: null,
  storeEnabled: true,
  storePickupAddress: null,
  storeDeliveryFeeRsd: 300,
  storeFreeDeliveryThresholdRsd: 5000,
  storeContactPhone: null,
  storeNote: null,
}

function ctx(slug = 'novi-sad') {
  return { params: Promise.resolve({ slug }) }
}

function order(body: object) {
  return placeOrder(createMockRequest(body, 'POST') as never, ctx())
}

describe('POST /api/public/shop/[slug]/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSession).mockResolvedValue(null) // guest checkout
    vi.mocked(prisma.gym.findFirst).mockResolvedValue(enabledGym as never)
  })

  it('creates an order using server-side prices', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([
      { id: 'p1', name: 'Whey', price: 3500, currentStock: 5 },
    ] as never)
    vi.mocked(prisma.order.count).mockResolvedValue(0 as never)
    vi.mocked(prisma.order.create).mockResolvedValue({
      id: 'o1',
      orderNumber: '0001',
      subtotalRsd: 7000,
      deliveryFeeRsd: null,
      totalRsd: 7000,
      fulfillmentType: 'pickup',
      status: 'new',
    } as never)

    const res = await order({
      customerName: 'Ana',
      customerPhone: '060111',
      fulfillmentType: 'pickup',
      // client "price" is irrelevant — server uses the product's price
      items: [{ productId: 'p1', quantity: 2, priceRsd: 1 }],
    })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.order.orderNumber).toBe('0001')

    const createArg = vi.mocked(prisma.order.create).mock.calls[0][0] as {
      data: { subtotalRsd: number; items: { create: { unitPriceRsd: number; lineTotalRsd: number }[] } }
    }
    expect(createArg.data.subtotalRsd).toBe(7000)
    expect(createArg.data.items.create[0].unitPriceRsd).toBe(3500)
    expect(createArg.data.items.create[0].lineTotalRsd).toBe(7000)
  })

  it('rejects when name/phone missing', async () => {
    const res = await order({ fulfillmentType: 'pickup', items: [{ productId: 'p1', quantity: 1 }] })
    expect(res.status).toBe(400)
  })

  it('rejects an empty cart', async () => {
    const res = await order({ customerName: 'Ana', customerPhone: '060', fulfillmentType: 'pickup', items: [] })
    expect(res.status).toBe(400)
  })

  it('requires an address for delivery', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([
      { id: 'p1', name: 'Whey', price: 3500, currentStock: 5 },
    ] as never)
    const res = await order({
      customerName: 'Ana',
      customerPhone: '060',
      fulfillmentType: 'delivery',
      items: [{ productId: 'p1', quantity: 1 }],
    })
    expect(res.status).toBe(400)
  })

  it('409s when an item is out of stock', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([
      { id: 'p1', name: 'Whey', price: 3500, currentStock: 1 },
    ] as never)
    const res = await order({
      customerName: 'Ana',
      customerPhone: '060',
      fulfillmentType: 'pickup',
      items: [{ productId: 'p1', quantity: 5 }],
    })
    expect(res.status).toBe(409)
  })

  it('404s when the store is disabled', async () => {
    vi.mocked(prisma.gym.findFirst).mockResolvedValue({ ...enabledGym, storeEnabled: false } as never)
    const res = await order({
      customerName: 'Ana',
      customerPhone: '060',
      fulfillmentType: 'pickup',
      items: [{ productId: 'p1', quantity: 1 }],
    })
    expect(res.status).toBe(404)
  })
})
