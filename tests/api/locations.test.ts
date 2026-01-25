import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as getLocations, POST as createLocation } from '@/app/api/admin/locations/route'
import { GET as getLocationStaff, POST as addLocationStaff } from '@/app/api/admin/locations/[gymId]/staff/route'
import { getSession, generateStaffId, generatePin, hashPin } from '@/lib/auth'
import prisma from '@/lib/db'
import {
  mockGym,
  mockGymWithOwner,
  mockGymWithOwner2,
  mockGymDifferentOwner,
  mockStaffOwner,
  mockStaffOwnerWithGym,
  mockStaffAdmin,
  mockStaffCoach,
  mockOwnerSession,
  mockAdminSession,
  mockStaffSession,
  createMockRequest,
} from '../mocks/fixtures'

describe('Locations API', () => {
  // =========================================================================
  // GET /api/admin/locations - List Owner's Gym Locations
  // =========================================================================
  describe('GET /api/admin/locations', () => {
    it('should return all locations for an owner with multiple gyms', async () => {
      vi.mocked(getSession).mockResolvedValue(mockOwnerSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffOwnerWithGym,
        gym: mockGymWithOwner,
      } as never)
      vi.mocked(prisma.gym.findMany).mockResolvedValue([
        { ...mockGymWithOwner, _count: { members: 10, staff: 3 } },
        { ...mockGymWithOwner2, _count: { members: 5, staff: 2 } },
      ] as never)

      const response = await getLocations()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.locations).toHaveLength(2)
      expect(data.locations[0].name).toBe('Classic Gym - Main')
      expect(data.locations[1].name).toBe('Classic Gym - Branch')
    })

    it('should return single gym if owner has no ownerEmail set', async () => {
      vi.mocked(getSession).mockResolvedValue(mockOwnerSession)
      const gymWithoutOwnerEmail = { ...mockGym, ownerEmail: null }
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffOwner,
        gym: gymWithoutOwnerEmail,
      } as never)
      vi.mocked(prisma.member.count).mockResolvedValue(15)
      vi.mocked(prisma.staff.count).mockResolvedValue(4)

      const response = await getLocations()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.locations).toHaveLength(1)
      expect(data.locations[0].memberCount).toBe(15)
      expect(data.locations[0].staffCount).toBe(4)
    })

    it('should return 401 if not authenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const response = await getLocations()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 if user is not an owner', async () => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffAdmin,
        gym: mockGym,
      } as never)

      const response = await getLocations()
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only owners can view locations')
    })

    it('should return 403 if user is a coach', async () => {
      vi.mocked(getSession).mockResolvedValue(mockStaffSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffCoach,
        gym: mockGym,
      } as never)

      const response = await getLocations()
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only owners can view locations')
    })

    it('should handle case-insensitive role check for OWNER', async () => {
      vi.mocked(getSession).mockResolvedValue(mockOwnerSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffOwner,
        role: 'OWNER', // uppercase
        gym: mockGymWithOwner,
      } as never)
      vi.mocked(prisma.gym.findMany).mockResolvedValue([
        { ...mockGymWithOwner, _count: { members: 10, staff: 3 } },
      ] as never)

      const response = await getLocations()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.locations).toHaveLength(1)
    })
  })

  // =========================================================================
  // POST /api/admin/locations - Create New Location
  // =========================================================================
  describe('POST /api/admin/locations', () => {
    beforeEach(() => {
      vi.mocked(generateStaffId).mockReturnValue('S-12345')
      vi.mocked(generatePin).mockReturnValue('1234')
      vi.mocked(hashPin).mockResolvedValue('$2a$10$hashedPinValue')
    })

    it('should create a new location for an owner', async () => {
      vi.mocked(getSession).mockResolvedValue(mockOwnerSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffOwnerWithGym,
      } as never)

      const newGym = {
        id: 'new-gym-001',
        name: 'New Location',
        address: 'New Address 123',
        logo: mockGymWithOwner.logo,
        primaryColor: '#ef4444',
      }

      vi.mocked(prisma.gym.create).mockResolvedValue(newGym as never)
      vi.mocked(prisma.staff.create).mockResolvedValue({
        id: 'new-staff-001',
        staffId: 'S-12345',
        name: mockStaffOwner.name,
        role: 'owner',
      } as never)
      vi.mocked(prisma.subscriptionLog.create).mockResolvedValue({} as never)

      const request = createMockRequest({
        name: 'New Location',
        address: 'New Address 123',
      })

      const response = await (createLocation as (req: Request) => Promise<Response>)(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.location.name).toBe('New Location')
      // Owners use the same credentials across all locations
      expect(data.sameCredentials).toBe(true)
      expect(data.message).toBeDefined()
    })

    it('should return 400 if name is missing', async () => {
      vi.mocked(getSession).mockResolvedValue(mockOwnerSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffOwnerWithGym,
      } as never)

      const request = createMockRequest({
        address: 'Some Address',
      })

      const response = await (createLocation as (req: Request) => Promise<Response>)(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Naziv lokacije je obavezan')
    })

    it('should return 403 if user is not an owner', async () => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffAdmin,
        gym: mockGym,
      } as never)

      const request = createMockRequest({
        name: 'New Location',
      })

      const response = await (createLocation as (req: Request) => Promise<Response>)(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only owners can add locations')
    })
  })

  // =========================================================================
  // GET /api/admin/locations/[gymId]/staff - List Staff for Location
  // =========================================================================
  describe('GET /api/admin/locations/[gymId]/staff', () => {
    const mockParams = Promise.resolve({ gymId: mockGymWithOwner.id })
    const mockRequest = new Request('http://localhost:3000/api/admin/locations/gym-owner-001/staff')

    it('should return staff list for a location owned by the user', async () => {
      vi.mocked(getSession).mockResolvedValue(mockOwnerSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffOwnerWithGym,
      } as never)
      vi.mocked(prisma.gym.findUnique).mockResolvedValue(mockGymWithOwner as never)
      vi.mocked(prisma.staff.findMany).mockResolvedValue([
        { id: '1', staffId: 'S-OWNER', name: 'Owner', role: 'owner' },
        { id: '2', staffId: 'S-ADMIN1', name: 'Admin One', role: 'admin' },
        { id: '3', staffId: 'S-COACH1', name: 'Coach One', role: 'coach' },
      ] as never)

      const response = await getLocationStaff(mockRequest as never, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.staff).toHaveLength(3)
    })

    it('should return staff for a different location owned by same owner', async () => {
      vi.mocked(getSession).mockResolvedValue(mockOwnerSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffOwnerWithGym,
      } as never)
      vi.mocked(prisma.gym.findUnique).mockResolvedValue(mockGymWithOwner2 as never)
      vi.mocked(prisma.staff.findMany).mockResolvedValue([
        { id: '4', staffId: 'S-ADMIN2', name: 'Admin Two', role: 'admin' },
      ] as never)

      const params2 = Promise.resolve({ gymId: mockGymWithOwner2.id })
      const response = await getLocationStaff(mockRequest as never, { params: params2 })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.staff).toHaveLength(1)
    })

    it('should return 403 if trying to access gym owned by different owner', async () => {
      vi.mocked(getSession).mockResolvedValue(mockOwnerSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffOwnerWithGym,
      } as never)
      vi.mocked(prisma.gym.findUnique).mockResolvedValue(mockGymDifferentOwner as never)

      const params3 = Promise.resolve({ gymId: mockGymDifferentOwner.id })
      const response = await getLocationStaff(mockRequest as never, { params: params3 })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied')
    })

    it('should return 404 if gym does not exist', async () => {
      vi.mocked(getSession).mockResolvedValue(mockOwnerSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffOwnerWithGym,
      } as never)
      vi.mocked(prisma.gym.findUnique).mockResolvedValue(null)

      const params4 = Promise.resolve({ gymId: 'non-existent' })
      const response = await getLocationStaff(mockRequest as never, { params: params4 })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Gym not found')
    })

    it('should return 403 if user is not an owner', async () => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffAdmin,
        gym: mockGym,
      } as never)

      const response = await getLocationStaff(mockRequest as never, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only owners can view staff')
    })
  })

  // =========================================================================
  // POST /api/admin/locations/[gymId]/staff - Add Staff to Location
  // =========================================================================
  describe('POST /api/admin/locations/[gymId]/staff', () => {
    const mockParams = Promise.resolve({ gymId: mockGymWithOwner.id })

    beforeEach(() => {
      vi.mocked(generateStaffId).mockReturnValue('S-NEW01')
      vi.mocked(generatePin).mockReturnValue('5678')
      vi.mocked(hashPin).mockResolvedValue('$2a$10$hashedPinValue')
    })

    it('should add a new admin to a location', async () => {
      vi.mocked(getSession).mockResolvedValue(mockOwnerSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffOwnerWithGym,
      } as never)
      vi.mocked(prisma.gym.findUnique).mockResolvedValue(mockGymWithOwner as never)
      vi.mocked(prisma.staff.create).mockResolvedValue({
        id: 'new-admin-001',
        staffId: 'S-NEW01',
        name: 'New Admin',
        role: 'admin',
      } as never)
      vi.mocked(prisma.subscriptionLog.create).mockResolvedValue({} as never)

      const request = createMockRequest({
        name: 'New Admin',
        role: 'admin',
      })

      const response = await addLocationStaff(request as never, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.staff.name).toBe('New Admin')
      expect(data.staff.role).toBe('admin')
      expect(data.credentials).toHaveProperty('staffId')
      expect(data.credentials).toHaveProperty('pin')
    })

    it('should add a new coach to a location', async () => {
      vi.mocked(getSession).mockResolvedValue(mockOwnerSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffOwnerWithGym,
      } as never)
      vi.mocked(prisma.gym.findUnique).mockResolvedValue(mockGymWithOwner as never)
      vi.mocked(prisma.staff.create).mockResolvedValue({
        id: 'new-coach-001',
        staffId: 'S-COACH2',
        name: 'New Coach',
        role: 'coach',
      } as never)
      vi.mocked(prisma.subscriptionLog.create).mockResolvedValue({} as never)

      const request = createMockRequest({
        name: 'New Coach',
        role: 'coach',
      })

      const response = await addLocationStaff(request as never, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.staff.role).toBe('coach')
    })

    it('should return 400 if name is missing', async () => {
      vi.mocked(getSession).mockResolvedValue(mockOwnerSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffOwnerWithGym,
      } as never)
      vi.mocked(prisma.gym.findUnique).mockResolvedValue(mockGymWithOwner as never)

      const request = createMockRequest({
        role: 'admin',
      })

      const response = await addLocationStaff(request as never, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Ime je obavezno')
    })

    it('should return 400 for invalid role (owner)', async () => {
      vi.mocked(getSession).mockResolvedValue(mockOwnerSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffOwnerWithGym,
      } as never)
      vi.mocked(prisma.gym.findUnique).mockResolvedValue(mockGymWithOwner as never)

      const request = createMockRequest({
        name: 'Should Fail',
        role: 'owner', // Cannot add owners via this endpoint
      })

      const response = await addLocationStaff(request as never, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid role')
    })

    it('should return 403 if trying to add staff to gym owned by different owner', async () => {
      vi.mocked(getSession).mockResolvedValue(mockOwnerSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffOwnerWithGym,
      } as never)
      vi.mocked(prisma.gym.findUnique).mockResolvedValue(mockGymDifferentOwner as never)

      const request = createMockRequest({
        name: 'New Admin',
        role: 'admin',
      })

      const params2 = Promise.resolve({ gymId: mockGymDifferentOwner.id })
      const response = await addLocationStaff(request as never, { params: params2 })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied')
    })

    it('should default to admin role if not specified', async () => {
      vi.mocked(getSession).mockResolvedValue(mockOwnerSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        ...mockStaffOwnerWithGym,
      } as never)
      vi.mocked(prisma.gym.findUnique).mockResolvedValue(mockGymWithOwner as never)
      vi.mocked(prisma.staff.create).mockResolvedValue({
        id: 'new-admin-002',
        staffId: 'S-NEW02',
        name: 'Default Role Admin',
        role: 'admin',
      } as never)
      vi.mocked(prisma.subscriptionLog.create).mockResolvedValue({} as never)

      const request = createMockRequest({
        name: 'Default Role Admin',
        // No role specified
      })

      const response = await addLocationStaff(request as never, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.staff.role).toBe('admin')
    })
  })
})
