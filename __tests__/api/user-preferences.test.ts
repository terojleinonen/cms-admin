/**
 * User Preferences API Tests
 * Tests for the user preferences management endpoints
 */

import { NextRequest } from 'next/server'
import { GET, PUT } from '@/api/users/[id]/preferences/route'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { UserRole, Theme } from '@prisma/client'

// Mock dependencies
jest.mock('next-auth')
jest.mock('../../app/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    userPreferences: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    }
  }
}))
jest.mock('../../app/lib/audit-service', () => ({
  getAuditService: jest.fn(() => ({
    logUser: jest.fn()
  }))
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/users/[id]/preferences', () => {
  const mockUserId = 'user-123'
  
  const mockUser = {
    id: mockUserId,
  }

  const mockPreferences = {
    id: 'pref-123',
    userId: mockUserId,
    theme: Theme.SYSTEM,
    timezone: 'UTC',
    language: 'en',
    notifications: {
      email: true,
      push: true,
      security: true,
      marketing: false,
    },
    dashboard: {
      layout: 'default',
      widgets: [],
      defaultView: 'dashboard',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/users/[id]/preferences', () => {
    it('should return existing user preferences', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.userPreferences.findUnique.mockResolvedValue(mockPreferences as any)

      const request = new NextRequest('http://localhost/api/users/user-123/preferences')
      const params = Promise.resolve({ id: mockUserId })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.preferences).toMatchObject({
        theme: Theme.SYSTEM,
        timezone: 'UTC',
        language: 'en',
        notifications: expect.objectContaining({
          email: true,
          push: true,
          security: true,
          marketing: false,
        }),
        dashboard: expect.objectContaining({
          layout: 'default',
          widgets: [],
          defaultView: 'dashboard',
        })
      })
    })

    it('should create default preferences if none exist', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.userPreferences.findUnique.mockResolvedValue(null)
      mockPrisma.userPreferences.create.mockResolvedValue(mockPreferences as any)

      const request = new NextRequest('http://localhost/api/users/user-123/preferences')
      const params = Promise.resolve({ id: mockUserId })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockPrisma.userPreferences.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          theme: 'SYSTEM',
          timezone: 'UTC',
          language: 'en',
          notifications: expect.objectContaining({
            email: true,
            push: true,
            security: true,
            marketing: false,
          }),
          dashboard: expect.objectContaining({
            layout: 'default',
            widgets: [],
            defaultView: 'dashboard',
          }),
        }
      })
    })

    it('should return 404 for non-existent user', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/users/nonexistent/preferences')
      const params = Promise.resolve({ id: 'nonexistent' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
    })

    it('should deny access to other users preferences for non-admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'other-user', role: UserRole.EDITOR }
      } as any)

      const request = new NextRequest('http://localhost/api/users/user-123/preferences')
      const params = Promise.resolve({ id: mockUserId })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })
  })

  describe('PUT /api/users/[id]/preferences', () => {
    it('should update user preferences with partial data', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.userPreferences.findUnique.mockResolvedValue(mockPreferences as any)
      mockPrisma.userPreferences.upsert.mockResolvedValue({
        ...mockPreferences,
        theme: Theme.DARK,
        timezone: 'America/New_York',
      } as any)

      const updateData = {
        theme: Theme.DARK,
        timezone: 'America/New_York',
        notifications: {
          marketing: true, // Partial update
        }
      }

      const request = new NextRequest('http://localhost/api/users/user-123/preferences', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'content-type': 'application/json' }
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockPrisma.userPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        update: expect.objectContaining({
          theme: Theme.DARK,
          timezone: 'America/New_York',
          notifications: expect.objectContaining({
            email: true, // Preserved from existing
            push: true, // Preserved from existing
            security: true, // Preserved from existing
            marketing: true, // Updated
          })
        }),
        create: expect.any(Object)
      })
    })

    it('should create preferences if they do not exist', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.userPreferences.findUnique.mockResolvedValue(null)
      mockPrisma.userPreferences.upsert.mockResolvedValue(mockPreferences as any)

      const updateData = {
        theme: Theme.LIGHT,
        language: 'es'
      }

      const request = new NextRequest('http://localhost/api/users/user-123/preferences', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'content-type': 'application/json' }
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await PUT(request, { params })

      expect(response.status).toBe(200)
      expect(mockPrisma.userPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        update: expect.objectContaining({
          theme: Theme.LIGHT,
          language: 'es'
        }),
        create: expect.objectContaining({
          userId: mockUserId,
          theme: Theme.LIGHT,
          language: 'es'
        })
      })
    })

    it('should validate preference data', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      const updateData = {
        theme: 'INVALID_THEME', // Invalid theme
        timezone: 'invalid/timezone', // Invalid timezone format
        language: 'x' // Too short
      }

      const request = new NextRequest('http://localhost/api/users/user-123/preferences', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'content-type': 'application/json' }
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.details).toBeDefined()
    })

    it('should handle dashboard settings update', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.userPreferences.findUnique.mockResolvedValue(mockPreferences as any)
      mockPrisma.userPreferences.upsert.mockResolvedValue(mockPreferences as any)

      const updateData = {
        dashboard: {
          layout: 'compact',
          widgets: ['analytics', 'recent-products'],
          defaultView: 'products'
        }
      }

      const request = new NextRequest('http://localhost/api/users/user-123/preferences', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'content-type': 'application/json' }
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await PUT(request, { params })

      expect(response.status).toBe(200)
      expect(mockPrisma.userPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        update: expect.objectContaining({
          dashboard: expect.objectContaining({
            layout: 'compact',
            widgets: ['analytics', 'recent-products'],
            defaultView: 'products'
          })
        }),
        create: expect.any(Object)
      })
    })

    it('should handle notification settings update', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.userPreferences.findUnique.mockResolvedValue(mockPreferences as any)
      mockPrisma.userPreferences.upsert.mockResolvedValue(mockPreferences as any)

      const updateData = {
        notifications: {
          email: false,
          marketing: true
        }
      }

      const request = new NextRequest('http://localhost/api/users/user-123/preferences', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'content-type': 'application/json' }
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await PUT(request, { params })

      expect(response.status).toBe(200)
      expect(mockPrisma.userPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        update: expect.objectContaining({
          notifications: expect.objectContaining({
            email: false, // Updated
            push: true, // Preserved
            security: true, // Preserved
            marketing: true, // Updated
          })
        }),
        create: expect.any(Object)
      })
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/users/user-123/preferences')
      const params = Promise.resolve({ id: mockUserId })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should allow admin to access any user preferences', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-456', role: UserRole.ADMIN }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.userPreferences.findUnique.mockResolvedValue(mockPreferences as any)

      const request = new NextRequest('http://localhost/api/users/user-123/preferences')
      const params = Promise.resolve({ id: mockUserId })

      const response = await GET(request, { params })

      expect(response.status).toBe(200)
    })
  })
})