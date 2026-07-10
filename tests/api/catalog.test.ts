import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as getBrands, POST as createBrand } from '@/app/api/admin/brands/route'
import { PUT as updateBrand, DELETE as deleteBrand } from '@/app/api/admin/brands/[id]/route'
import { POST as createCategory } from '@/app/api/owner/categories/route'
import { DELETE as deleteCategory } from '@/app/api/owner/categories/[id]/route'
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

const brand = {
  id: 'brand-1',
  gymId: mockGym.id,
  name: 'Optimum Nutrition',
  logoUrl: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

function asAdmin() {
  vi.mocked(getSession).mockResolvedValue(mockAdminSession)
  vi.mocked(prisma.staff.findUnique).mockResolvedValue({
    ...mockStaffAdmin,
    role: 'ADMIN',
    gymId: mockGym.id,
  } as never)
}

function asCoach() {
  vi.mocked(getSession).mockResolvedValue(mockStaffSession)
  vi.mocked(prisma.staff.findUnique).mockResolvedValue({
    ...mockStaffCoach,
    role: 'COACH',
    gymId: mockGym.id,
  } as never)
}

describe('Catalog API - Brands', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists brands for admin', async () => {
    asAdmin()
    vi.mocked(prisma.brand.findMany).mockResolvedValue([brand] as never)
    const res = await getBrands()
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.brands).toHaveLength(1)
  })

  it('rejects a coach with 403', async () => {
    asCoach()
    const res = await getBrands()
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('Admin or owner access required')
  })

  it('creates a brand', async () => {
    asAdmin()
    vi.mocked(prisma.brand.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.brand.create).mockResolvedValue(brand as never)
    const res = await createBrand(createMockRequest({ name: 'Optimum Nutrition' }) as never)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.brand.name).toBe('Optimum Nutrition')
  })

  it('rejects a duplicate brand name', async () => {
    asAdmin()
    vi.mocked(prisma.brand.findFirst).mockResolvedValue(brand as never)
    const res = await createBrand(createMockRequest({ name: 'Optimum Nutrition' }) as never)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Brend sa tim nazivom već postoji')
  })

  it('requires a name', async () => {
    asAdmin()
    const res = await createBrand(createMockRequest({}) as never)
    expect(res.status).toBe(400)
  })

  it('updates a brand', async () => {
    asAdmin()
    vi.mocked(prisma.brand.findFirst)
      .mockResolvedValueOnce(brand as never) // existing
      .mockResolvedValueOnce(null) // no duplicate
    vi.mocked(prisma.brand.update).mockResolvedValue({ ...brand, name: 'ON' } as never)
    const ctx = { params: Promise.resolve({ id: brand.id }) }
    const res = await updateBrand(createMockRequest({ name: 'ON' }, 'PUT') as never, ctx)
    expect(res.status).toBe(200)
    expect((await res.json()).brand.name).toBe('ON')
  })

  it('blocks deleting a brand that still has products', async () => {
    asAdmin()
    vi.mocked(prisma.brand.findFirst).mockResolvedValue({ ...brand, _count: { products: 3 } } as never)
    const ctx = { params: Promise.resolve({ id: brand.id }) }
    const res = await deleteBrand(createMockGetRequest() as never, ctx)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('proizvoda')
  })

  it('deletes a brand with no products', async () => {
    asAdmin()
    vi.mocked(prisma.brand.findFirst).mockResolvedValue({ ...brand, _count: { products: 0 } } as never)
    vi.mocked(prisma.brand.delete).mockResolvedValue(brand as never)
    const ctx = { params: Promise.resolve({ id: brand.id }) }
    const res = await deleteBrand(createMockGetRequest() as never, ctx)
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
  })
})

describe('Catalog API - Subcategories', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a subcategory under a top-level parent', async () => {
    asAdmin()
    vi.mocked(prisma.productCategory.findFirst)
      .mockResolvedValueOnce(null) // duplicate-name check
      .mockResolvedValueOnce({ id: 'parent-1', parentId: null } as never) // parent lookup
    vi.mocked(prisma.productCategory.create).mockResolvedValue({
      id: 'cat-1',
      name: 'Whey',
      parentId: 'parent-1',
    } as never)
    const res = await createCategory(
      createMockRequest({ name: 'Whey', parentId: 'parent-1' }) as never
    )
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.category.parentId).toBe('parent-1')
  })

  it('rejects a missing parent', async () => {
    asAdmin()
    vi.mocked(prisma.productCategory.findFirst)
      .mockResolvedValueOnce(null) // duplicate-name check
      .mockResolvedValueOnce(null) // parent lookup -> not found
    const res = await createCategory(
      createMockRequest({ name: 'Whey', parentId: 'ghost' }) as never
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Nadređena kategorija nije pronađena')
  })

  it('rejects nesting deeper than one level', async () => {
    asAdmin()
    vi.mocked(prisma.productCategory.findFirst)
      .mockResolvedValueOnce(null) // duplicate-name check
      .mockResolvedValueOnce({ id: 'sub-1', parentId: 'top-1' } as never) // parent is itself a subcategory
    const res = await createCategory(
      createMockRequest({ name: 'Deep', parentId: 'sub-1' }) as never
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Potkategorija ne može imati potkategorije')
  })

  it('blocks deleting a category that still has subcategories', async () => {
    asAdmin()
    vi.mocked(prisma.productCategory.findFirst).mockResolvedValue({
      id: 'parent-1',
      gymId: mockGym.id,
      _count: { products: 0, children: 2 },
    } as never)
    const ctx = { params: Promise.resolve({ id: 'parent-1' }) }
    const res = await deleteCategory(createMockGetRequest() as never, ctx)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('potkategorija')
  })
})
