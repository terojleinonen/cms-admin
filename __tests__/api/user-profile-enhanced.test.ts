/**
 * Enhanced User Profile API Tests
 * Tests for the enhanced user profile endpoints with profile picture support
 */

import { NextRequest } from 'next/server'
import { GET, PUT, DELETE } from '@/api/users/[id]/route'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { UserRole } from '@prisma/client'

// Mock dependencies
jest.mock('next-auth')
jest.mock('../../app/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    }
  }
}))
jest.mock('../../app/lib/audit-service', () => ({
  getAuditService: jest.fn(() => ({
    logUser: jest.fn()
  }))
}))
jest.mock('../../app/lib/profile-image-utils', () => ({
  profilePictureService: {
    getProfilePictureUrl: jest.fn(),
    deleteProfilePicture: jest.fn(),
  },
  formatValidationErrors: jest.fn()
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/users/[id] - Enhanced Profile API', () => {
  const mockUserId = 'user-123'
  const mockAdminId = 'admin-456'
  
  const mockUser = {
    id: mockUserId,
    name: 'Test User',
    email: 'test@example.com',
    role: UserRole.EDITOR,
    isActive: true,
    profilePicture: '/uploads/profiles/user-123/profile-medium.webp',
    emailVerified: new Date(),
    twoFactorEnabled: false,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    preferences: {
      theme: 'SYSTEM',
      timezone: 'UTC',
      language: 'en',
      notifications: { email: true, push: true, security: true, marketing: false },
      dashboard: { layout: 'default', widgets: [], defaultView: 'dashboard' },
    },
    _count: {
      createdProducts: 5,
      createdPages: 3,
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/users/[id]', () => {
    it('should return enhanced user profile with preferences and profile picture', async () => {
      // Mock authentication
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      // Mock database query
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const request = new NextRequest('http://localhost/api/users/user-123')
      const params = Promise.resolve({ id: mockUserId })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toMatchObject({
        id: mockUserId,
        name: 'Test User',
        email: 'test@example.com',
        role: UserRole.EDITOR,
        profilePicture: '/uploads/profiles/user-123/profile-medium.webp',
        twoFactorEnabled: false,
        preferences: expect.objectContaining({
          theme: 'SYSTEM',
          timezone: 'UTC',
        })
      })
      expect(data.user.profilePictureUrl).toBeDefined()
    })

    it('should return 404 for non-existent user', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/users/nonexistent')
      const params = Promise.resolve({ id: 'nonexistent' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
    })

    it('should deny access to other users profile for non-admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'other-user', role: UserRole.EDITOR }
      } as any)

      const request = new NextRequest('http://localhost/api/users/user-123')
      const params = Promise.resolve({ id: mockUserId })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })
  })

  describe('PUT /api/users/[id]', () => {
    it('should update user profile with audit logging', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        name: 'Updated Name',
        profilePicture: 'new-profile-pic.webp'
      } as any)

      const updateData = {
        name: 'Updated Name',
        profilePicture: 'new-profile-pic.webp'
      }

      const request = new NextRequest('http://localhost/api/users/user-123', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'content-type': 'application/json' }
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user.name).toBe('Updated Name')
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          name: 'Updated Name',
          profilePicture: 'new-profile-pic.webp'
        }),
        select: expect.any(Object)
      })
    })

    it('should prevent non-admin from changing role', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.user.update.mockResolvedValue(mockUser as any)

      const updateData = {
        name: 'Updated Name',
        role: UserRole.ADMIN // Should be ignored
      }

      const request = new NextRequest('http://localhost/api/users/user-123', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'content-type': 'application/json' }
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await PUT(request, { params })

      expect(response.status).toBe(200)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.not.objectContaining({
          role: UserRole.ADMIN
        }),
        select: expect.any(Object)
      })
    })

    it('should validate email uniqueness', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser as any) // First call for user existence
        .mockResolvedValueOnce({ id: 'other-user' } as any) // Second call for email check

      const updateData = {
        email: 'existing@example.com'
      }

      const request = new NextRequest('http://localhost/api/users/user-123', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'content-type': 'application/json' }
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error.code).toBe('DUPLICATE_ENTRY')
    })

    it('should return validation errors for invalid data', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      const updateData = {
        email: 'invalid-email', // Invalid email format
        name: '' // Empty name
      }

      const request = new NextRequest('http://localhost/api/users/user-123', {
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
  })

  describe('DELETE /api/users/[id]', () => {
    it('should delete user and profile picture (admin only)', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockAdminId, role: UserRole.ADMIN }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.user.delete.mockResolvedValue(mockUser as any)

      const request = new NextRequest('http://localhost/api/users/user-123', {
        method: 'DELETE'
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('User deleted successfully')
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: mockUserId }
      })
    })

    it('should prevent self-deletion', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.ADMIN }
      } as any)

      const request = new NextRequest('http://localhost/api/users/user-123', {
        method: 'DELETE'
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
      expect(data.error.message).toBe('Cannot delete your own account')
    })

    it('should require admin access', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'other-user', role: UserRole.EDITOR }
      } as any)

      const request = new NextRequest('http://localhost/api/users/user-123', {
        method: 'DELETE'
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/users/user-123')
      const params = Promise.resolve({ id: mockUserId })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should allow admin to access any user profile', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockAdminId, role: UserRole.ADMIN }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const request = new NextRequest('http://localhost/api/users/user-123')
      const params = Promise.resolve({ id: mockUserId })

      const response = await GET(request, { params })

      expect(response.status).toBe(200)
    })
  })
})