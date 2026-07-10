import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as getProduct } from '@/app/api/public/shop/[slug]/products/[productId]/route'
import prisma from '@/lib/db'
import { mockGym } from '../mocks/fixtures'

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

const rawProduct = {
  id: 'p1',
  name: 'Whey',
  slug: 'whey',
  description: 'Protein',
  price: 3500,
  imageUrl: null,
  currentStock: 5,
  isFeatured: false,
  categoryId: 'c1',
  brandId: 'b1',
  category: { id: 'c1', name: 'Proteini' },
  brand: { id: 'b1', name: 'ON' },
}

function ctx(productId = 'p1', slug = 'novi-sad') {
  return { params: Promise.resolve({ slug, productId }) }
}

describe('GET /api/public/shop/[slug]/products/[productId]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns an active, online product with related items', async () => {
    vi.mocked(prisma.gym.findFirst).mockResolvedValue(enabledGym as never)
    vi.mocked(prisma.product.findFirst).mockResolvedValue(rawProduct as never)
    vi.mocked(prisma.product.findMany).mockResolvedValue([{ ...rawProduct, id: 'p2', name: 'Casein' }] as never)

    const res = await getProduct(new Request('http://x') as never, ctx())
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.product.priceRsd).toBe(3500)
    expect(data.product.available).toBe(true)
    expect(data.related).toHaveLength(1)
    // detail query enforces active + online
    expect(prisma.product.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'p1', isActive: true, isVisibleOnline: true }),
      })
    )
  })

  it('404s when the product is missing or not published', async () => {
    vi.mocked(prisma.gym.findFirst).mockResolvedValue(enabledGym as never)
    vi.mocked(prisma.product.findFirst).mockResolvedValue(null)
    const res = await getProduct(new Request('http://x') as never, ctx('ghost'))
    expect(res.status).toBe(404)
  })

  it('404s when the store is disabled', async () => {
    vi.mocked(prisma.gym.findFirst).mockResolvedValue({ ...enabledGym, storeEnabled: false } as never)
    const res = await getProduct(new Request('http://x') as never, ctx())
    expect(res.status).toBe(404)
  })
})
