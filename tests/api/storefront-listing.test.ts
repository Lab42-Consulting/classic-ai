import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as getProducts } from '@/app/api/public/shop/[slug]/products/route'
import prisma from '@/lib/db'
import { mockGym, createMockGetRequest } from '../mocks/fixtures'

const enabledGym = {
  id: mockGym.id,
  name: mockGym.name,
  logo: null,
  primaryColor: null,
  storeEnabled: true,
  storePickupAddress: null,
  storeDeliveryFeeRsd: null,
  storeFreeDeliveryThresholdRsd: null,
  storeContactPhone: null,
  storeNote: null,
}

function ctx(slug = 'novi-sad') {
  return { params: Promise.resolve({ slug }) }
}

function baseMocks() {
  vi.mocked(prisma.gym.findFirst).mockResolvedValue(enabledGym as never)
  vi.mocked(prisma.brand.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.product.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.product.count).mockResolvedValue(0 as never)
}

describe('GET /api/public/shop/[slug]/products', () => {
  beforeEach(() => vi.clearAllMocks())

  it('expands a parent category to include its subcategories', async () => {
    baseMocks()
    vi.mocked(prisma.productCategory.findMany)
      .mockResolvedValueOnce([{ id: 'sub1' }, { id: 'sub2' }] as never) // children lookup
      .mockResolvedValueOnce([] as never) // facets
    const res = await getProducts(createMockGetRequest({ category: 'cat1' }) as never, ctx())
    expect(res.status).toBe(200)
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ categoryId: { in: ['cat1', 'sub1', 'sub2'] } }),
      })
    )
  })

  it('applies search and price sort', async () => {
    baseMocks()
    vi.mocked(prisma.productCategory.findMany).mockResolvedValue([] as never)
    const res = await getProducts(
      createMockGetRequest({ q: 'whey', sort: 'price_asc' }) as never,
      ctx()
    )
    expect(res.status).toBe(200)
    const call = vi.mocked(prisma.product.findMany).mock.calls[0][0] as Record<string, unknown>
    expect(call.where).toHaveProperty('OR')
    expect(call.orderBy).toEqual([{ price: 'asc' }])
  })

  it('only lists active, online products', async () => {
    baseMocks()
    vi.mocked(prisma.productCategory.findMany).mockResolvedValue([] as never)
    await getProducts(createMockGetRequest() as never, ctx())
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true, isVisibleOnline: true }),
      })
    )
  })

  it('404s when the store is disabled', async () => {
    vi.mocked(prisma.gym.findFirst).mockResolvedValue({ ...enabledGym, storeEnabled: false } as never)
    const res = await getProducts(createMockGetRequest() as never, ctx())
    expect(res.status).toBe(404)
  })
})
