import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as getStorefront } from '@/app/api/public/shop/[slug]/route'
import prisma from '@/lib/db'
import { mockGym } from '../mocks/fixtures'

const enabledGym = {
  id: mockGym.id,
  name: mockGym.name,
  logo: null,
  primaryColor: '#ef4444',
  storeEnabled: true,
  storePickupAddress: null,
  storeDeliveryFeeRsd: 300,
  storeFreeDeliveryThresholdRsd: 5000,
  storeContactPhone: '021 123',
  storeNote: null,
}

const rawFeatured = {
  id: 'p1',
  name: 'Whey',
  slug: 'whey',
  description: null,
  price: 3500,
  imageUrl: null,
  currentStock: 5,
  isFeatured: true,
  categoryId: 'c1',
  brandId: 'b1',
  category: { id: 'c1', name: 'Proteini' },
  brand: { id: 'b1', name: 'ON' },
}

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) }
}

describe('GET /api/public/shop/[slug]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns landing data when the storefront is enabled', async () => {
    vi.mocked(prisma.gym.findFirst).mockResolvedValue(enabledGym as never)
    vi.mocked(prisma.productCategory.findMany).mockResolvedValue([
      { id: 'c1', name: 'Proteini', color: null, icon: null, parentId: null, displayOrder: null },
    ] as never)
    vi.mocked(prisma.brand.findMany).mockResolvedValue([
      { id: 'b1', name: 'ON', logoUrl: null },
    ] as never)
    vi.mocked(prisma.product.findMany).mockResolvedValue([rawFeatured] as never)

    const res = await getStorefront(new Request('http://x') as never, ctx('novi-sad'))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.gym.name).toBe(mockGym.name)
    expect(data.categories).toHaveLength(1)
    expect(data.brands).toHaveLength(1)
    expect(data.featured[0].priceRsd).toBe(3500)
    expect(data.featured[0].available).toBe(true)
    expect(data.featured[0].brandName).toBe('ON')
  })

  it('returns 404 when the storefront is disabled', async () => {
    vi.mocked(prisma.gym.findFirst).mockResolvedValue({ ...enabledGym, storeEnabled: false } as never)
    const res = await getStorefront(new Request('http://x') as never, ctx('novi-sad'))
    expect(res.status).toBe(404)
  })

  it('returns 404 for an unknown slug', async () => {
    vi.mocked(prisma.gym.findFirst).mockResolvedValue(null)
    const res = await getStorefront(new Request('http://x') as never, ctx('ghost'))
    expect(res.status).toBe(404)
  })

  it('only queries active, online products for featured', async () => {
    vi.mocked(prisma.gym.findFirst).mockResolvedValue(enabledGym as never)
    vi.mocked(prisma.productCategory.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.brand.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.product.findMany).mockResolvedValue([] as never)

    await getStorefront(new Request('http://x') as never, ctx('novi-sad'))
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true, isVisibleOnline: true, isFeatured: true }),
      })
    )
  })
})
