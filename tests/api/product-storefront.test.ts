import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST as createProduct, slugify } from '@/app/api/admin/products/route'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import {
  mockAdminSession,
  mockStaffAdmin,
  mockGym,
  createMockRequest,
} from '../mocks/fixtures'

function asAdmin() {
  vi.mocked(getSession).mockResolvedValue(mockAdminSession)
  vi.mocked(prisma.staff.findUnique).mockResolvedValue({
    ...mockStaffAdmin,
    role: 'ADMIN',
    gymId: mockGym.id,
    name: mockStaffAdmin.name,
  } as never)
}

describe('slugify', () => {
  it('produces url-safe slugs and transliterates Serbian letters', () => {
    expect(slugify('Whey Protein 2kg')).toBe('whey-protein-2kg')
    expect(slugify('Šejker – Crna Đđ')).toBe('sejker-crna-djdj')
    expect(slugify('  Extra   Spaces  ')).toBe('extra-spaces')
  })
})

describe('POST /api/admin/products - storefront fields', () => {
  beforeEach(() => vi.clearAllMocks())

  it('persists brand, visibility, featured flags and an auto slug', async () => {
    asAdmin()
    vi.mocked(prisma.brand.findFirst).mockResolvedValue({ id: 'brand-1', gymId: mockGym.id } as never)
    vi.mocked(prisma.product.create).mockResolvedValue({ id: 'p1', name: 'Whey' } as never)

    const request = createMockRequest({
      name: 'Whey Protein',
      price: 3500,
      brandId: 'brand-1',
      isVisibleOnline: true,
      isFeatured: true,
    })
    const response = await createProduct(request as never)
    expect(response.status).toBe(200)

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          brandId: 'brand-1',
          isVisibleOnline: true,
          isFeatured: true,
          slug: 'whey-protein',
        }),
      })
    )
  })

  it('defaults isVisibleOnline to false when omitted', async () => {
    asAdmin()
    vi.mocked(prisma.product.create).mockResolvedValue({ id: 'p2', name: 'Bar' } as never)

    const request = createMockRequest({ name: 'Energy Bar', price: 250 })
    const response = await createProduct(request as never)
    expect(response.status).toBe(200)
    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isVisibleOnline: false, isFeatured: false }),
      })
    )
  })

  it('rejects an unknown brand with 404', async () => {
    asAdmin()
    vi.mocked(prisma.brand.findFirst).mockResolvedValue(null)

    const request = createMockRequest({ name: 'X', price: 100, brandId: 'ghost' })
    const response = await createProduct(request as never)
    expect(response.status).toBe(404)
    expect((await response.json()).error).toBe('Brand not found')
  })
})
