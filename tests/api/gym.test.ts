import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as getSettings } from '@/app/api/gym/settings/route'
import { GET as getBranding, PUT as updateBranding } from '@/app/api/gym/branding/route'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import {
  mockGym,
  mockMember,
  mockStaffCoach,
  mockStaffAdmin,
  mockStaffSession,
  mockAdminSession,
  mockMemberSession,
  createMockRequest,
} from '../mocks/fixtures'

// =============================================================================
// GYM SETTINGS API TESTS
// =============================================================================

describe('Gym Settings API', () => {
  describe('GET /api/gym/settings', () => {
    describe('Unauthenticated Access', () => {
      it('should return empty settings for unauthenticated users', async () => {
        vi.mocked(getSession).mockResolvedValue(null)

        const response = await getSettings()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.settings).toEqual({})
      })
    })

    describe('Member Access', () => {
      beforeEach(() => {
        vi.mocked(getSession).mockResolvedValue(mockMemberSession)
      })

      it('should return settings with gym name and logo for members', async () => {
        const gymWithBranding = {
          ...mockGym,
          name: 'Classic Gym',
          logo: 'data:image/png;base64,mockLogo',
          primaryColor: '#3b82f6',
          settings: { accentColor: '#ef4444' },
        }
        vi.mocked(prisma.gym.findUnique).mockResolvedValue(gymWithBranding as never)

        const response = await getSettings()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.settings.accentColor).toBe('#3b82f6') // primaryColor overrides settings.accentColor
        expect(data.gym.name).toBe('Classic Gym')
        expect(data.gym.logo).toBe('data:image/png;base64,mockLogo')
        expect(data.staff).toBeUndefined() // No staff data for members
        expect(data.stats).toBeUndefined() // No stats for members
      })

      it('should use settings.accentColor if primaryColor is not set', async () => {
        const gymWithoutPrimaryColor = {
          ...mockGym,
          primaryColor: null,
          settings: { accentColor: '#22c55e' },
        }
        vi.mocked(prisma.gym.findUnique).mockResolvedValue(gymWithoutPrimaryColor as never)

        const response = await getSettings()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.settings.accentColor).toBe('#22c55e')
      })

      it('should return empty settings if gym not found', async () => {
        vi.mocked(prisma.gym.findUnique).mockResolvedValue(null)

        const response = await getSettings()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.settings).toEqual({})
      })
    })

    describe('Staff Access', () => {
      beforeEach(() => {
        vi.mocked(getSession).mockResolvedValue(mockStaffSession)
      })

      it('should return settings with staff data and gym stats', async () => {
        const gymWithBranding = {
          ...mockGym,
          name: 'Classic Gym',
          logo: 'data:image/png;base64,mockLogo',
          primaryColor: '#3b82f6',
          subscriptionStatus: 'active',
          subscribedAt: new Date('2024-01-01'),
          subscribedUntil: new Date('2025-01-01'),
          settings: {},
        }
        vi.mocked(prisma.gym.findUnique).mockResolvedValue(gymWithBranding as never)
        vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffCoach as never)
        vi.mocked(prisma.member.count)
          .mockResolvedValueOnce(50) // totalMembers
          .mockResolvedValueOnce(45) // activeMembers
        vi.mocked(prisma.staff.count)
          .mockResolvedValueOnce(5) // totalStaff
          .mockResolvedValueOnce(3) // coaches

        const response = await getSettings()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.settings.accentColor).toBe('#3b82f6')
        expect(data.gym.name).toBe('Classic Gym')
        expect(data.gym.subscriptionStatus).toBe('active')
        expect(data.staff.id).toBe(mockStaffCoach.id)
        expect(data.staff.name).toBe(mockStaffCoach.name)
        expect(data.staff.role).toBe(mockStaffCoach.role)
        expect(data.stats.totalMembers).toBe(50)
        expect(data.stats.activeMembers).toBe(45)
        expect(data.stats.totalStaff).toBe(5)
        expect(data.stats.coaches).toBe(3)
      })
    })
  })
})

// =============================================================================
// GYM BRANDING API TESTS
// =============================================================================

describe('Gym Branding API', () => {
  describe('GET /api/gym/branding', () => {
    describe('Authentication', () => {
      it('should return 401 if not authenticated', async () => {
        vi.mocked(getSession).mockResolvedValue(null)

        const response = await getBranding()
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })

      it('should return 401 if authenticated as member', async () => {
        vi.mocked(getSession).mockResolvedValue(mockMemberSession)

        const response = await getBranding()
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })
    })

    describe('Authorization - Admin Only', () => {
      it('should return 403 if staff is a coach (not admin)', async () => {
        vi.mocked(getSession).mockResolvedValue(mockStaffSession)
        vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffCoach as never)

        const response = await getBranding()
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error).toBe('Admin access required')
      })

      it('should return 404 if staff not found', async () => {
        vi.mocked(getSession).mockResolvedValue(mockStaffSession)
        vi.mocked(prisma.staff.findUnique).mockResolvedValue(null)

        const response = await getBranding()
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toBe('Staff not found')
      })
    })

    describe('Successful Retrieval', () => {
      it('should return gym branding for admin', async () => {
        vi.mocked(getSession).mockResolvedValue(mockAdminSession)
        vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffAdmin as never)
        const gymWithBranding = {
          id: mockGym.id,
          name: 'Classic Gym',
          logo: 'data:image/png;base64,mockLogo',
          primaryColor: '#3b82f6',
          secondaryColor: '#10b981',
          settings: {},
        }
        vi.mocked(prisma.gym.findUnique).mockResolvedValue(gymWithBranding as never)

        const response = await getBranding()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.name).toBe('Classic Gym')
        expect(data.logo).toBe('data:image/png;base64,mockLogo')
        expect(data.primaryColor).toBe('#3b82f6')
        expect(data.secondaryColor).toBe('#10b981')
      })

      it('should return 404 if gym not found', async () => {
        vi.mocked(getSession).mockResolvedValue(mockAdminSession)
        vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffAdmin as never)
        vi.mocked(prisma.gym.findUnique).mockResolvedValue(null)

        const response = await getBranding()
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toBe('Gym not found')
      })
    })
  })

  describe('PUT /api/gym/branding', () => {
    describe('Authentication', () => {
      it('should return 401 if not authenticated', async () => {
        vi.mocked(getSession).mockResolvedValue(null)

        const request = createMockRequest({ primaryColor: '#3b82f6' }, 'PUT')
        const response = await updateBranding(request as never)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })

      it('should return 401 if authenticated as member', async () => {
        vi.mocked(getSession).mockResolvedValue(mockMemberSession)

        const request = createMockRequest({ primaryColor: '#3b82f6' }, 'PUT')
        const response = await updateBranding(request as never)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })
    })

    describe('Authorization - Admin Only', () => {
      it('should return 403 if staff is a coach (not admin)', async () => {
        vi.mocked(getSession).mockResolvedValue(mockStaffSession)
        vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffCoach as never)

        const request = createMockRequest({ primaryColor: '#3b82f6' }, 'PUT')
        const response = await updateBranding(request as never)
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error).toBe('Admin access required')
      })
    })

    describe('Validation', () => {
      beforeEach(() => {
        vi.mocked(getSession).mockResolvedValue(mockAdminSession)
        vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffAdmin as never)
      })

      it('should return 400 for invalid primary color format', async () => {
        const request = createMockRequest({ primaryColor: 'invalid-color' }, 'PUT')
        const response = await updateBranding(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid primary color format')
      })

      it('should return 400 for invalid secondary color format', async () => {
        const request = createMockRequest({ secondaryColor: 'not-a-hex' }, 'PUT')
        const response = await updateBranding(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid secondary color format')
      })

      it('should accept valid hex colors', async () => {
        const updatedGym = {
          id: mockGym.id,
          name: 'Classic Gym',
          logo: null,
          primaryColor: '#3B82F6',
          secondaryColor: '#10B981',
        }
        vi.mocked(prisma.gym.update).mockResolvedValue(updatedGym as never)

        const request = createMockRequest(
          { primaryColor: '#3B82F6', secondaryColor: '#10B981' },
          'PUT'
        )
        const response = await updateBranding(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.primaryColor).toBe('#3B82F6')
        expect(data.secondaryColor).toBe('#10B981')
      })

      it('should accept lowercase hex colors', async () => {
        const updatedGym = {
          id: mockGym.id,
          name: 'Classic Gym',
          logo: null,
          primaryColor: '#3b82f6',
          secondaryColor: null,
        }
        vi.mocked(prisma.gym.update).mockResolvedValue(updatedGym as never)

        const request = createMockRequest({ primaryColor: '#3b82f6' }, 'PUT')
        const response = await updateBranding(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.primaryColor).toBe('#3b82f6')
      })
    })

    describe('Logo Upload', () => {
      beforeEach(() => {
        vi.mocked(getSession).mockResolvedValue(mockAdminSession)
        vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffAdmin as never)
      })

      it('should accept base64 logo under 2MB', async () => {
        const smallLogo = 'data:image/png;base64,' + 'A'.repeat(1000)
        const updatedGym = {
          id: mockGym.id,
          name: 'Classic Gym',
          logo: smallLogo,
          primaryColor: null,
          secondaryColor: null,
        }
        vi.mocked(prisma.gym.update).mockResolvedValue(updatedGym as never)

        const request = createMockRequest({ logo: smallLogo }, 'PUT')
        const response = await updateBranding(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.logo).toBe(smallLogo)
      })

      it('should return 400 for logo over 1MB', async () => {
        // Create a string larger than 1MB * 1.4 (base64 overhead)
        const largeLogo = 'data:image/png;base64,' + 'A'.repeat(1.5 * 1024 * 1024)

        const request = createMockRequest({ logo: largeLogo }, 'PUT')
        const response = await updateBranding(request as never)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Logo too large. Max 1MB.')
      })
    })

    describe('Successful Update', () => {
      beforeEach(() => {
        vi.mocked(getSession).mockResolvedValue(mockAdminSession)
        vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffAdmin as never)
      })

      it('should update branding with all fields', async () => {
        // Mock blob URL that will be returned after upload
        const mockBlobUrl = 'https://test.blob.vercel-storage.com/test-image.jpg'
        const updatedGym = {
          id: mockGym.id,
          name: 'Classic Gym',
          logo: mockBlobUrl,
          primaryColor: '#8b5cf6',
          secondaryColor: '#f59e0b',
        }
        vi.mocked(prisma.gym.update).mockResolvedValue(updatedGym as never)

        const request = createMockRequest(
          {
            logo: 'data:image/png;base64,newLogo',
            primaryColor: '#8b5cf6',
            secondaryColor: '#f59e0b',
          },
          'PUT'
        )
        const response = await updateBranding(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.logo).toBe(mockBlobUrl)
        expect(data.primaryColor).toBe('#8b5cf6')
        expect(data.secondaryColor).toBe('#f59e0b')

        expect(prisma.gym.update).toHaveBeenCalledWith({
          where: { id: mockStaffAdmin.gymId },
          data: {
            logo: mockBlobUrl,
            primaryColor: '#8b5cf6',
            secondaryColor: '#f59e0b',
          },
          select: {
            id: true,
            name: true,
            logo: true,
            primaryColor: true,
            secondaryColor: true,
          },
        })
      })

      it('should update only primary color when other fields not provided', async () => {
        const updatedGym = {
          id: mockGym.id,
          name: 'Classic Gym',
          logo: null,
          primaryColor: '#ef4444',
          secondaryColor: null,
        }
        vi.mocked(prisma.gym.update).mockResolvedValue(updatedGym as never)

        const request = createMockRequest({ primaryColor: '#ef4444' }, 'PUT')
        const response = await updateBranding(request as never)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.primaryColor).toBe('#ef4444')
      })
    })
  })
})

// =============================================================================
// ROLE-BASED ACCESS INTEGRATION TESTS
// =============================================================================

describe('Role-Based Access Control', () => {
  describe('Admin vs Coach Separation', () => {
    it('should allow admin to access branding API', async () => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffAdmin as never)
      vi.mocked(prisma.gym.findUnique).mockResolvedValue({
        ...mockGym,
        primaryColor: '#3b82f6',
        secondaryColor: null,
      } as never)

      const response = await getBranding()

      expect(response.status).toBe(200)
    })

    it('should deny coach from accessing branding API', async () => {
      vi.mocked(getSession).mockResolvedValue(mockStaffSession)
      vi.mocked(prisma.staff.findUnique).mockResolvedValue(mockStaffCoach as never)

      const response = await getBranding()
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })
  })
})
