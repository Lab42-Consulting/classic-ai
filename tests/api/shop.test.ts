import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as getProducts, POST as createProduct } from '@/app/api/admin/products/route'
import { GET as getProduct, PUT as updateProduct, DELETE as deleteProduct } from '@/app/api/admin/products/[id]/route'
import { POST as adjustStock } from '@/app/api/admin/products/[id]/stock/route'
import { GET as getSales, POST as createSale } from '@/app/api/admin/sales/route'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import {
  mockProduct,
  mockProductLowStock,
  mockProductOutOfStock,
  mockProductInactive,
  mockProductWithSales,
  mockStockLog,
  mockStockLogSale,
  mockSale,
  mockSaleWithProduct,
  mockAdminSession,
  mockStaffSession,
  mockMemberSession,
  mockStaffAdmin,
  mockStaffCoach,
  mockGym,
  mockMember,
  createMockRequest,
  createMockGetRequest,
} from '../mocks/fixtures'

// =============================================================================
// PRODUCTS API TESTS
// =============================================================================

describe('Shop API - Products (Admin Only)', () => {
  // =========================================================================
  // GET /api/admin/products - List Products
  // =========================================================================
  describe('GET /api/admin/products - List Products', () => {
    describe('Authentication', () => {
      it('should return 401 if no session', async () => {
        vi.mocked(getSession).mockResolvedValue(null)

        const request = createMockGetRequest()
        const response = await getProducts(request as never)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })

      it('should return 401 if session is member type', async () => {
        vi.mocked(getSession).mockResolvedValue(mockMemberSession)

        const request = createMockGetRequest()
        const response = await getProducts(request as never)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })

      it('should return 403 if staff is not admin', async () => {
        vi.mocked(getSession).mockResolvedValue(mockStaffSession)
        vi.mocked(prisma.staff.findUnique).mockResolvedValue({
          ...mockStaffCoach,
          role: 'COACH',
        } as never)

        const request = createMockGetRequest()
        const response = await getProducts(request as never)
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error).toBe('Admin access required')
      })
    })

    describe('Successful Retrieval', () => {
      beforeEach(() => {
        vi.mocked(getSession).mockResolvedValue(mockAdminSession)
        vi.mocked(prisma.staff.findUnique).mockResolvedValue({
          ...mockStaffAdmin,
          role: 'ADMIN',
          gymId: mockGym.id,
        } as never)
      })

      it('should return all products for gym', async () => {
        vi.mocked(prisma.product.findMany).mockResolvedValue([
          mockProduct,
          mockProductLowStock,
        ] as never)

        const request = createMockGetRequest()
        const response = await getProducts(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.products).toHaveLength(2)
        expect(data.products[0].name).toBe('Whey Protein 2kg')
      })

      it('should return empty array if no products', async () => {
        vi.mocked(prisma.product.findMany).mockResolvedValue([])

        const request = createMockGetRequest()
        const response = await getProducts(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.products).toHaveLength(0)
      })
    })
  })

  // =========================================================================
  // POST /api/admin/products - Create Product
  // =========================================================================
  describe('POST /api/admin/products - Create Product', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffAdmin,
        role: 'ADMIN',
        gymId: mockGym.id,
        name: mockStaffAdmin.name,
      } as never)
    })

    describe('Validation', () => {
      it('should return 400 if name is missing', async () => {
        const request = createMockRequest({ price: 5990 })
        const response = await createProduct(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Name and price are required')
      })

      it('should return 400 if price is missing', async () => {
        const request = createMockRequest({ name: 'Test Product' })
        const response = await createProduct(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Name and price are required')
      })

      it('should return 400 if price is negative', async () => {
        const request = createMockRequest({ name: 'Test Product', price: -100 })
        const response = await createProduct(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Price must be positive')
      })
    })

    describe('Successful Creation', () => {
      it('should create product with minimal data', async () => {
        vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
          return fn(prisma)
        })
        vi.mocked(prisma.product.create).mockResolvedValue(mockProduct as never)

        const request = createMockRequest({
          name: 'Whey Protein 2kg',
          price: 5990,
        })
        const response = await createProduct(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.product.name).toBe('Whey Protein 2kg')
      })

      it('should create product with initial stock and stock log', async () => {
        vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
          return fn(prisma)
        })
        vi.mocked(prisma.product.create).mockResolvedValue({
          ...mockProduct,
          currentStock: 20,
        } as never)
        vi.mocked(prisma.stockLog.create).mockResolvedValue(mockStockLog as never)

        const request = createMockRequest({
          name: 'Whey Protein 2kg',
          price: 5990,
          initialStock: 20,
        })
        const response = await createProduct(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      it('should create product with all fields', async () => {
        vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
          return fn(prisma)
        })
        vi.mocked(prisma.product.create).mockResolvedValue(mockProduct as never)

        const request = createMockRequest({
          name: 'Whey Protein 2kg',
          description: 'Premium protein',
          sku: 'WP-001',
          category: 'protein',
          price: 5990,
          costPrice: 4500,
          initialStock: 15,
          lowStockAlert: 5,
        })
        const response = await createProduct(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })
    })
  })

  // =========================================================================
  // GET /api/admin/products/[id] - Get Single Product
  // =========================================================================
  describe('GET /api/admin/products/[id] - Get Single Product', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffAdmin,
        role: 'ADMIN',
        gymId: mockGym.id,
      } as never)
    })

    it('should return 404 if product not found', async () => {
      vi.mocked(prisma.product.findFirst).mockResolvedValue(null)

      const request = createMockGetRequest()
      const context = { params: Promise.resolve({ id: 'nonexistent' }) }
      const response = await getProduct(request as never, context)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Product not found')
    })

    it('should return product with stock logs', async () => {
      vi.mocked(prisma.product.findFirst).mockResolvedValue({
        ...mockProduct,
        stockLogs: [mockStockLog, mockStockLogSale],
        _count: { sales: 5 },
      } as never)

      const request = createMockGetRequest()
      const context = { params: Promise.resolve({ id: mockProduct.id }) }
      const response = await getProduct(request as never, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.product.name).toBe('Whey Protein 2kg')
      expect(data.product.stockLogs).toHaveLength(2)
      expect(data.product._count.sales).toBe(5)
    })
  })

  // =========================================================================
  // PUT /api/admin/products/[id] - Update Product
  // =========================================================================
  describe('PUT /api/admin/products/[id] - Update Product', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffAdmin,
        role: 'ADMIN',
        gymId: mockGym.id,
      } as never)
    })

    it('should return 404 if product not found', async () => {
      vi.mocked(prisma.product.findFirst).mockResolvedValue(null)

      const request = createMockRequest({ name: 'Updated Name' }, 'PUT')
      const context = { params: Promise.resolve({ id: 'nonexistent' }) }
      const response = await updateProduct(request as never, context)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Product not found')
    })

    it('should return 400 if name is empty', async () => {
      vi.mocked(prisma.product.findFirst).mockResolvedValue(mockProduct as never)

      const request = createMockRequest({ name: '' }, 'PUT')
      const context = { params: Promise.resolve({ id: mockProduct.id }) }
      const response = await updateProduct(request as never, context)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Name cannot be empty')
    })

    it('should update product successfully', async () => {
      vi.mocked(prisma.product.findFirst).mockResolvedValue(mockProduct as never)
      vi.mocked(prisma.product.update).mockResolvedValue({
        ...mockProduct,
        name: 'Updated Protein',
        price: 6990,
      } as never)

      const request = createMockRequest({ name: 'Updated Protein', price: 6990 }, 'PUT')
      const context = { params: Promise.resolve({ id: mockProduct.id }) }
      const response = await updateProduct(request as never, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.product.name).toBe('Updated Protein')
    })
  })

  // =========================================================================
  // DELETE /api/admin/products/[id] - Delete Product
  // =========================================================================
  describe('DELETE /api/admin/products/[id] - Delete Product', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffAdmin,
        role: 'ADMIN',
        gymId: mockGym.id,
      } as never)
    })

    it('should return 404 if product not found', async () => {
      vi.mocked(prisma.product.findFirst).mockResolvedValue(null)

      const request = createMockRequest({}, 'DELETE')
      const context = { params: Promise.resolve({ id: 'nonexistent' }) }
      const response = await deleteProduct(request as never, context)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Product not found')
    })

    it('should soft delete product with sales history', async () => {
      vi.mocked(prisma.product.findFirst).mockResolvedValue(mockProduct as never)
      vi.mocked(prisma.sale.count).mockResolvedValue(5)
      vi.mocked(prisma.product.update).mockResolvedValue({
        ...mockProduct,
        isActive: false,
      } as never)

      const request = createMockRequest({}, 'DELETE')
      const context = { params: Promise.resolve({ id: mockProduct.id }) }
      const response = await deleteProduct(request as never, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.softDeleted).toBe(true)
    })

    it('should hard delete product without sales', async () => {
      vi.mocked(prisma.product.findFirst).mockResolvedValue(mockProduct as never)
      vi.mocked(prisma.sale.count).mockResolvedValue(0)
      vi.mocked(prisma.product.delete).mockResolvedValue(mockProduct as never)

      const request = createMockRequest({}, 'DELETE')
      const context = { params: Promise.resolve({ id: mockProduct.id }) }
      const response = await deleteProduct(request as never, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.softDeleted).toBeUndefined()
    })
  })

  // =========================================================================
  // POST /api/admin/products/[id]/stock - Adjust Stock
  // =========================================================================
  describe('POST /api/admin/products/[id]/stock - Adjust Stock', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffAdmin,
        role: 'ADMIN',
        gymId: mockGym.id,
        name: mockStaffAdmin.name,
      } as never)
    })

    describe('Validation', () => {
      it('should return 404 if product not found', async () => {
        vi.mocked(prisma.product.findFirst).mockResolvedValue(null)

        const request = createMockRequest({ type: 'purchase', quantity: 10 })
        const context = { params: Promise.resolve({ id: 'nonexistent' }) }
        const response = await adjustStock(request as never, context)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toBe('Product not found')
      })

      it('should return 400 for invalid adjustment type', async () => {
        vi.mocked(prisma.product.findFirst).mockResolvedValue(mockProduct as never)

        const request = createMockRequest({ type: 'invalid', quantity: 10 })
        const context = { params: Promise.resolve({ id: mockProduct.id }) }
        const response = await adjustStock(request as never, context)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Invalid adjustment type')
      })

      it('should return 400 if quantity is zero', async () => {
        vi.mocked(prisma.product.findFirst).mockResolvedValue(mockProduct as never)

        const request = createMockRequest({ type: 'purchase', quantity: 0 })
        const context = { params: Promise.resolve({ id: mockProduct.id }) }
        const response = await adjustStock(request as never, context)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Quantity is required')
      })

      it('should return 400 if adjustment would result in negative stock', async () => {
        vi.mocked(prisma.product.findFirst).mockResolvedValue({
          ...mockProduct,
          currentStock: 5,
        } as never)

        const request = createMockRequest({ type: 'adjustment', quantity: -10 })
        const context = { params: Promise.resolve({ id: mockProduct.id }) }
        const response = await adjustStock(request as never, context)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Insufficient stock')
      })
    })

    describe('Successful Adjustments', () => {
      it('should add stock via purchase', async () => {
        vi.mocked(prisma.product.findFirst).mockResolvedValue({
          ...mockProduct,
          currentStock: 15,
        } as never)
        vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
          return fn(prisma)
        })
        vi.mocked(prisma.stockLog.create).mockResolvedValue(mockStockLog as never)
        vi.mocked(prisma.product.update).mockResolvedValue({
          ...mockProduct,
          currentStock: 25,
        } as never)

        const request = createMockRequest({
          type: 'purchase',
          quantity: 10,
          note: 'Supplier delivery',
        })
        const context = { params: Promise.resolve({ id: mockProduct.id }) }
        const response = await adjustStock(request as never, context)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.adjustment.previousStock).toBe(15)
        expect(data.adjustment.newStock).toBe(25)
      })

      it('should reduce stock via adjustment', async () => {
        vi.mocked(prisma.product.findFirst).mockResolvedValue({
          ...mockProduct,
          currentStock: 15,
        } as never)
        vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
          return fn(prisma)
        })
        vi.mocked(prisma.stockLog.create).mockResolvedValue(mockStockLogSale as never)
        vi.mocked(prisma.product.update).mockResolvedValue({
          ...mockProduct,
          currentStock: 13,
        } as never)

        const request = createMockRequest({
          type: 'adjustment',
          quantity: -2,
          note: 'Damaged items',
        })
        const context = { params: Promise.resolve({ id: mockProduct.id }) }
        const response = await adjustStock(request as never, context)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.adjustment.quantity).toBe(-2)
      })
    })
  })
})

// =============================================================================
// SALES API TESTS
// =============================================================================

describe('Shop API - Sales (Admin Only)', () => {
  // =========================================================================
  // GET /api/admin/sales - List Sales
  // =========================================================================
  describe('GET /api/admin/sales - List Sales', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffAdmin,
        role: 'ADMIN',
        gymId: mockGym.id,
      } as never)
    })

    it('should return sales with summary', async () => {
      vi.mocked(prisma.sale.findMany).mockResolvedValue([
        mockSaleWithProduct,
        { ...mockSaleWithProduct, id: 'sale-2', quantity: 1, totalAmount: 5990 },
      ] as never)

      const request = createMockGetRequest()
      const response = await getSales(request as never)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sales).toHaveLength(2)
      expect(data.summary.totalSales).toBe(2)
      expect(data.summary.totalRevenue).toBe(17970)
      expect(data.summary.totalUnits).toBe(3)
    })

    it('should filter sales by date range', async () => {
      vi.mocked(prisma.sale.findMany).mockResolvedValue([mockSaleWithProduct] as never)

      const request = createMockGetRequest({
        startDate: '2024-12-01',
        endDate: '2024-12-31',
      })
      const response = await getSales(request as never)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sales).toHaveLength(1)
    })
  })

  // =========================================================================
  // POST /api/admin/sales - Record Sale
  // =========================================================================
  describe('POST /api/admin/sales - Record Sale', () => {
    beforeEach(() => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffAdmin,
        role: 'ADMIN',
        gymId: mockGym.id,
        name: mockStaffAdmin.name,
      } as never)
    })

    describe('Validation', () => {
      it('should return 400 if productId is missing', async () => {
        const request = createMockRequest({ quantity: 2 })
        const response = await createSale(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Product ID is required')
      })

      it('should return 400 if quantity is less than 1', async () => {
        const request = createMockRequest({ productId: mockProduct.id, quantity: 0 })
        const response = await createSale(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Quantity must be at least 1')
      })

      it('should return 404 if product not found', async () => {
        vi.mocked(prisma.product.findFirst).mockResolvedValue(null)

        const request = createMockRequest({ productId: 'nonexistent', quantity: 1 })
        const response = await createSale(request as never)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toBe('Product not found')
      })

      it('should return 400 if product is inactive', async () => {
        vi.mocked(prisma.product.findFirst).mockResolvedValue(mockProductInactive as never)

        const request = createMockRequest({ productId: mockProductInactive.id, quantity: 1 })
        const response = await createSale(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Product is not available for sale')
      })

      it('should return 400 if insufficient stock', async () => {
        vi.mocked(prisma.product.findFirst).mockResolvedValue({
          ...mockProduct,
          currentStock: 2,
        } as never)

        const request = createMockRequest({ productId: mockProduct.id, quantity: 5 })
        const response = await createSale(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Insufficient stock')
      })
    })

    describe('Successful Sale', () => {
      it('should record sale and update stock', async () => {
        vi.mocked(prisma.product.findFirst).mockResolvedValue({
          ...mockProduct,
          currentStock: 15,
        } as never)
        vi.mocked(prisma.member.findFirst).mockResolvedValue(null)
        vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
          return fn(prisma)
        })
        vi.mocked(prisma.sale.create).mockResolvedValue(mockSaleWithProduct as never)
        vi.mocked(prisma.stockLog.create).mockResolvedValue(mockStockLogSale as never)
        vi.mocked(prisma.product.update).mockResolvedValue({
          ...mockProduct,
          currentStock: 13,
        } as never)

        const request = createMockRequest({
          productId: mockProduct.id,
          quantity: 2,
          paymentMethod: 'cash',
        })
        const response = await createSale(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.sale.quantity).toBe(2)
      })

      it('should record sale with member link', async () => {
        vi.mocked(prisma.product.findFirst).mockResolvedValue({
          ...mockProduct,
          currentStock: 15,
        } as never)
        vi.mocked(prisma.member.findFirst).mockResolvedValue({
          name: mockMember.name,
        } as never)
        vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
          return fn(prisma)
        })
        vi.mocked(prisma.sale.create).mockResolvedValue({
          ...mockSaleWithProduct,
          memberId: mockMember.id,
          memberName: mockMember.name,
        } as never)
        vi.mocked(prisma.stockLog.create).mockResolvedValue(mockStockLogSale as never)
        vi.mocked(prisma.product.update).mockResolvedValue({
          ...mockProduct,
          currentStock: 13,
        } as never)

        const request = createMockRequest({
          productId: mockProduct.id,
          quantity: 2,
          memberId: mockMember.id,
          paymentMethod: 'card',
        })
        const response = await createSale(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })
    })
  })
})
