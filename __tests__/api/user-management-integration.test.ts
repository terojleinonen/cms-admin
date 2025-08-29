/**
 * User Management API Integration Tests
 * Comprehensive integration tests for all user management endpoints
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { UserRole, Theme } from '@prisma/client'
import { hash } from 'bcryptjs'

// Import API handlers
import { GET as getUsersGET, POST as createUserPOST } from '@/api/users/route'
import { GET as getUserGET, PUT as updateUserPUT, DELETE as deleteUserDELETE } from '@/api/users/[id]/route'
import { GET as getPreferencesGET, PUT as updatePreferencesPUT } from '@/api/users/[id]/preferences/route'
import { GET as getSecurityGET, PUT as updateSecurityPUT } from '@/api/users/[id]/security/route'
import { POST as uploadAvatarPOST, DELETE as deleteAvatarDELETE } from '@/api/users/[id]/avatar/route'
import { GET as getSessionsGET, POST as manageSessionsPOST } from '@/api/users/[id]/sessions/route'
import { POST as deactivateUserPOST, PUT as reactivateUserPUT } from '@/api/users/[id]/deactivate/route'

// Mock dependencies
jest.mock('next-auth')
jest.mock('../../app/lib/db', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    userPreferences: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    session: {
      findMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  }
}))

jest.mock('../../app/lib/audit-service', () => ({
  getAuditService: jest.fn(() => ({
    logUser: jest.fn(),
    logSecurity: jest.fn(),
  }))
}))

jest.mock('../../app/lib/profile-image-utils', () => ({
  profilePictureService: {
    processProfilePicture: jest.fn(),
    deleteProfilePicture: jest.fn(),
    getProfilePictureUrl: jest.fn(),
  }
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockHash = hash as jest.MockedFunction<typeof hash>

describe('User Management API Integration Tests', () => {
  const mockAdminUser = {
    id: 'admin-123',
    name: 'Admin User',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    isActive: true,
  }

  const mockRegularUser = {
    id: 'user-123',
    name: 'Regular User',
    email: 'user@example.com',
    role: UserRole.EDITOR,
    isActive: true,
    profilePicture: null,
    emailVerified: new Date(),
    twoFactorEnabled: false,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockUserPreferences = {
    id: 'pref-123',
    userId: 'user-123',
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
      widgets: ['analytics'],
      defaultView: 'dashboard',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('User CRUD Operations', () => {
    describe('GET /api/users', () => {
      it('should list users with pagination (admin only)', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockAdminUser
        } as any)

        mockPrisma.user.findMany.mockResolvedValue([mockRegularUser] as any)
        mockPrisma.user.count.mockResolvedValue(1)

        const request = new NextRequest('http://localhost/api/users?page=1&limit=10')
        const response = await getUsersGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.users).toHaveLength(1)
        expect(data.pagination).toMatchObject({
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        })
        expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
          select: expect.any(Object),
          skip: 0,
          take: 10,
          orderBy: { createdAt: 'desc' },
        })
      })

      it('should filter users by role', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockAdminUser
        } as any)

        mockPrisma.user.findMany.mockResolvedValue([mockRegularUser] as any)
        mockPrisma.user.count.mockResolvedValue(1)

        const request = new NextRequest('http://localhost/api/users?role=EDITOR')
        const response = await getUsersGET(request)

        expect(response.status).toBe(200)
        expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
          select: expect.any(Object),
          where: { role: UserRole.EDITOR },
          skip: 0,
          take: 20,
          orderBy: { createdAt: 'desc' },
        })
      })

      it('should search users by name or email', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockAdminUser
        } as any)

        mockPrisma.user.findMany.mockResolvedValue([mockRegularUser] as any)
        mockPrisma.user.count.mockResolvedValue(1)

        const request = new NextRequest('http://localhost/api/users?search=john')
        const response = await getUsersGET(request)

        expect(response.status).toBe(200)
        expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
          select: expect.any(Object),
          where: {
            OR: [
              { name: { contains: 'john', mode: 'insensitive' } },
              { email: { contains: 'john', mode: 'insensitive' } },
            ],
          },
          skip: 0,
          take: 20,
          orderBy: { createdAt: 'desc' },
        })
      })

      it('should deny access to non-admin users', async () => {
        mockGetServerSession.mockResolvedValue({
          user: { ...mockRegularUser, role: UserRole.EDITOR }
        } as any)

        const request = new NextRequest('http://localhost/api/users')
        const response = await getUsersGET(request)
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error.code).toBe('FORBIDDEN')
      })
    })

    describe('POST /api/users', () => {
      it('should create new user (admin only)', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockAdminUser
        } as any)

        mockHash.mockResolvedValue('hashed-password')
        mockPrisma.user.findUnique.mockResolvedValue(null) // Email not taken
        mockPrisma.user.create.mockResolvedValue(mockRegularUser as any)

        const userData = {
          name: 'New User',
          email: 'newuser@example.com',
          password: 'SecurePassword123!',
          role: UserRole.EDITOR,
        }

        const request = new NextRequest('http://localhost/api/users', {
          method: 'POST',
          body: JSON.stringify(userData),
          headers: { 'content-type': 'application/json' },
        })

        const response = await createUserPOST(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.user.email).toBe('newuser@example.com')
        expect(mockPrisma.user.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            name: 'New User',
            email: 'newuser@example.com',
            passwordHash: 'hashed-password',
            role: UserRole.EDITOR,
          }),
          select: expect.any(Object),
        })
      })

      it('should reject duplicate email addresses', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockAdminUser
        } as any)

        mockPrisma.user.findUnique.mockResolvedValue(mockRegularUser as any)

        const userData = {
          name: 'New User',
          email: 'user@example.com', // Already exists
          password: 'SecurePassword123!',
          role: UserRole.EDITOR,
        }

        const request = new NextRequest('http://localhost/api/users', {
          method: 'POST',
          body: JSON.stringify(userData),
          headers: { 'content-type': 'application/json' },
        })

        const response = await createUserPOST(request)
        const data = await response.json()

        expect(response.status).toBe(409)
        expect(data.error.code).toBe('DUPLICATE_ENTRY')
      })

      it('should validate user data', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockAdminUser
        } as any)

        const invalidUserData = {
          name: '', // Empty name
          email: 'invalid-email', // Invalid email
          password: 'weak', // Weak password
          role: 'INVALID_ROLE', // Invalid role
        }

        const request = new NextRequest('http://localhost/api/users', {
          method: 'POST',
          body: JSON.stringify(invalidUserData),
          headers: { 'content-type': 'application/json' },
        })

        const response = await createUserPOST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.details).toBeDefined()
      })
    })

    describe('GET /api/users/[id]', () => {
      it('should get user by ID with preferences', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser
        } as any)

        mockPrisma.user.findUnique.mockResolvedValue({
          ...mockRegularUser,
          preferences: mockUserPreferences,
        } as any)

        const request = new NextRequest('http://localhost/api/users/user-123')
        const params = Promise.resolve({ id: 'user-123' })

        const response = await getUserGET(request, { params })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.user.id).toBe('user-123')
        expect(data.user.preferences).toBeDefined()
      })

      it('should allow admin to access any user', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockAdminUser
        } as any)

        mockPrisma.user.findUnique.mockResolvedValue(mockRegularUser as any)

        const request = new NextRequest('http://localhost/api/users/user-123')
        const params = Promise.resolve({ id: 'user-123' })

        const response = await getUserGET(request, { params })

        expect(response.status).toBe(200)
      })

      it('should deny access to other users for non-admin', async () => {
        mockGetServerSession.mockResolvedValue({
          user: { ...mockRegularUser, id: 'other-user' }
        } as any)

        const request = new NextRequest('http://localhost/api/users/user-123')
        const params = Promise.resolve({ id: 'user-123' })

        const response = await getUserGET(request, { params })
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error.code).toBe('FORBIDDEN')
      })
    })

    describe('PUT /api/users/[id]', () => {
      it('should update user profile', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser
        } as any)

        mockPrisma.user.findUnique.mockResolvedValue(mockRegularUser as any)
        mockPrisma.user.update.mockResolvedValue({
          ...mockRegularUser,
          name: 'Updated Name',
        } as any)

        const updateData = {
          name: 'Updated Name',
        }

        const request = new NextRequest('http://localhost/api/users/user-123', {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: { 'content-type': 'application/json' },
        })
        const params = Promise.resolve({ id: 'user-123' })

        const response = await updateUserPUT(request, { params })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.user.name).toBe('Updated Name')
      })

      it('should prevent non-admin from changing role', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser
        } as any)

        mockPrisma.user.findUnique.mockResolvedValue(mockRegularUser as any)
        mockPrisma.user.update.mockResolvedValue(mockRegularUser as any)

        const updateData = {
          name: 'Updated Name',
          role: UserRole.ADMIN, // Should be ignored
        }

        const request = new NextRequest('http://localhost/api/users/user-123', {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: { 'content-type': 'application/json' },
        })
        const params = Promise.resolve({ id: 'user-123' })

        const response = await updateUserPUT(request, { params })

        expect(response.status).toBe(200)
        expect(mockPrisma.user.update).toHaveBeenCalledWith({
          where: { id: 'user-123' },
          data: expect.not.objectContaining({
            role: UserRole.ADMIN,
          }),
          select: expect.any(Object),
        })
      })
    })

    describe('DELETE /api/users/[id]', () => {
      it('should delete user (admin only)', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockAdminUser
        } as any)

        mockPrisma.user.findUnique.mockResolvedValue(mockRegularUser as any)
        mockPrisma.user.delete.mockResolvedValue(mockRegularUser as any)

        const request = new NextRequest('http://localhost/api/users/user-123', {
          method: 'DELETE',
        })
        const params = Promise.resolve({ id: 'user-123' })

        const response = await deleteUserDELETE(request, { params })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.message).toBe('User deleted successfully')
        expect(mockPrisma.user.delete).toHaveBeenCalledWith({
          where: { id: 'user-123' },
        })
      })

      it('should prevent self-deletion', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockAdminUser
        } as any)

        const request = new NextRequest('http://localhost/api/users/admin-123', {
          method: 'DELETE',
        })
        const params = Promise.resolve({ id: 'admin-123' })

        const response = await deleteUserDELETE(request, { params })
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error.message).toBe('Cannot delete your own account')
      })

      it('should require admin access', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser
        } as any)

        const request = new NextRequest('http://localhost/api/users/user-123', {
          method: 'DELETE',
        })
        const params = Promise.resolve({ id: 'user-123' })

        const response = await deleteUserDELETE(request, { params })
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error.code).toBe('FORBIDDEN')
      })
    })
  })

  describe('User Preferences Management', () => {
    describe('GET /api/users/[id]/preferences', () => {
      it('should get user preferences', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser
        } as any)

        mockPrisma.userPreferences.findUnique.mockResolvedValue(mockUserPreferences as any)

        const request = new NextRequest('http://localhost/api/users/user-123/preferences')
        const params = Promise.resolve({ id: 'user-123' })

        const response = await getPreferencesGET(request, { params })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.preferences.theme).toBe(Theme.SYSTEM)
        expect(data.preferences.timezone).toBe('UTC')
      })

      it('should return default preferences if none exist', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser
        } as any)

        mockPrisma.userPreferences.findUnique.mockResolvedValue(null)

        const request = new NextRequest('http://localhost/api/users/user-123/preferences')
        const params = Promise.resolve({ id: 'user-123' })

        const response = await getPreferencesGET(request, { params })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.preferences.theme).toBe(Theme.SYSTEM)
        expect(data.preferences.timezone).toBe('UTC')
        expect(data.preferences.language).toBe('en')
      })
    })

    describe('PUT /api/users/[id]/preferences', () => {
      it('should update user preferences', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser
        } as any)

        const updatedPreferences = {
          ...mockUserPreferences,
          theme: Theme.DARK,
          timezone: 'America/New_York',
        }

        mockPrisma.userPreferences.upsert.mockResolvedValue(updatedPreferences as any)

        const updateData = {
          theme: Theme.DARK,
          timezone: 'America/New_York',
        }

        const request = new NextRequest('http://localhost/api/users/user-123/preferences', {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: { 'content-type': 'application/json' },
        })
        const params = Promise.resolve({ id: 'user-123' })

        const response = await updatePreferencesPUT(request, { params })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.preferences.theme).toBe(Theme.DARK)
        expect(data.preferences.timezone).toBe('America/New_York')
      })

      it('should validate preference data', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser
        } as any)

        const invalidData = {
          theme: 'INVALID_THEME',
          timezone: 'invalid-timezone',
        }

        const request = new NextRequest('http://localhost/api/users/user-123/preferences', {
          method: 'PUT',
          body: JSON.stringify(invalidData),
          headers: { 'content-type': 'application/json' },
        })
        const params = Promise.resolve({ id: 'user-123' })

        const response = await updatePreferencesPUT(request, { params })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error.code).toBe('VALIDATION_ERROR')
      })
    })
  })

  describe('Security Management', () => {
    describe('GET /api/users/[id]/security', () => {
      it('should get security information', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser
        } as any)

        mockPrisma.user.findUnique.mockResolvedValue(mockRegularUser as any)
        mockPrisma.session.findMany.mockResolvedValue([
          {
            id: 'session-1',
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            lastActive: new Date(),
          },
        ] as any)

        const request = new NextRequest('http://localhost/api/users/user-123/security')
        const params = Promise.resolve({ id: 'user-123' })

        const response = await getSecurityGET(request, { params })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.security.twoFactorEnabled).toBe(false)
        expect(data.security.activeSessions).toHaveLength(1)
      })
    })

    describe('PUT /api/users/[id]/security', () => {
      it('should update password', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser
        } as any)

        mockPrisma.user.findUnique.mockResolvedValue({
          ...mockRegularUser,
          passwordHash: 'old-hash',
        } as any)

        // Mock bcrypt compare and hash
        require('bcryptjs').compare = jest.fn().mockResolvedValue(true)
        mockHash.mockResolvedValue('new-hash')

        mockPrisma.user.update.mockResolvedValue(mockRegularUser as any)

        const updateData = {
          currentPassword: 'oldPassword123!',
          newPassword: 'NewPassword456@',
        }

        const request = new NextRequest('http://localhost/api/users/user-123/security', {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: { 'content-type': 'application/json' },
        })
        const params = Promise.resolve({ id: 'user-123' })

        const response = await updateSecurityPUT(request, { params })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.message).toBe('Security settings updated successfully')
        expect(mockPrisma.user.update).toHaveBeenCalledWith({
          where: { id: 'user-123' },
          data: { passwordHash: 'new-hash' },
        })
      })

      it('should reject incorrect current password', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser
        } as any)

        mockPrisma.user.findUnique.mockResolvedValue({
          ...mockRegularUser,
          passwordHash: 'old-hash',
        } as any)

        // Mock bcrypt compare to return false
        require('bcryptjs').compare = jest.fn().mockResolvedValue(false)

        const updateData = {
          currentPassword: 'wrongPassword',
          newPassword: 'NewPassword456@',
        }

        const request = new NextRequest('http://localhost/api/users/user-123/security', {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: { 'content-type': 'application/json' },
        })
        const params = Promise.resolve({ id: 'user-123' })

        const response = await updateSecurityPUT(request, { params })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error.message).toBe('Current password is incorrect')
      })
    })
  })

  describe('Session Management', () => {
    describe('GET /api/users/[id]/sessions', () => {
      it('should get active sessions', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser
        } as any)

        const mockSessions = [
          {
            id: 'session-1',
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            lastActive: new Date(),
          },
          {
            id: 'session-2',
            ipAddress: '192.168.1.2',
            userAgent: 'Chrome/91.0',
            lastActive: new Date(Date.now() - 86400000),
          },
        ]

        mockPrisma.session.findMany.mockResolvedValue(mockSessions as any)

        const request = new NextRequest('http://localhost/api/users/user-123/sessions')
        const params = Promise.resolve({ id: 'user-123' })

        const response = await getSessionsGET(request, { params })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.sessions).toHaveLength(2)
        expect(data.stats.total).toBe(2)
        expect(data.stats.active).toBe(2)
      })
    })

    describe('POST /api/users/[id]/sessions', () => {
      it('should terminate specific session', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser
        } as any)

        mockPrisma.session.delete.mockResolvedValue({} as any)

        const actionData = {
          action: 'terminate_session',
          sessionId: 'session-1',
        }

        const request = new NextRequest('http://localhost/api/users/user-123/sessions', {
          method: 'POST',
          body: JSON.stringify(actionData),
          headers: { 'content-type': 'application/json' },
        })
        const params = Promise.resolve({ id: 'user-123' })

        const response = await manageSessionsPOST(request, { params })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.message).toBe('Session terminated successfully')
        expect(mockPrisma.session.delete).toHaveBeenCalledWith({
          where: { id: 'session-1' },
        })
      })

      it('should terminate all other sessions', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser
        } as any)

        mockPrisma.session.deleteMany.mockResolvedValue({ count: 2 } as any)

        const actionData = {
          action: 'terminate_all_others',
        }

        const request = new NextRequest('http://localhost/api/users/user-123/sessions', {
          method: 'POST',
          body: JSON.stringify(actionData),
          headers: { 'content-type': 'application/json' },
        })
        const params = Promise.resolve({ id: 'user-123' })

        const response = await manageSessionsPOST(request, { params })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.message).toBe('All other sessions terminated')
        expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
          where: {
            userId: 'user-123',
            id: { not: expect.any(String) },
          },
        })
      })
    })
  })

  describe('Account Deactivation', () => {
    describe('POST /api/users/[id]/deactivate', () => {
      it('should deactivate user account', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser
        } as any)

        mockPrisma.user.findUnique.mockResolvedValue(mockRegularUser as any)
        mockPrisma.user.update.mockResolvedValue({
          ...mockRegularUser,
          isActive: false,
        } as any)

        const deactivationData = {
          reason: 'User requested account deactivation',
        }

        const request = new NextRequest('http://localhost/api/users/user-123/deactivate', {
          method: 'POST',
          body: JSON.stringify(deactivationData),
          headers: { 'content-type': 'application/json' },
        })
        const params = Promise.resolve({ id: 'user-123' })

        const response = await deactivateUserPOST(request, { params })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.message).toBe('Account deactivated successfully')
        expect(mockPrisma.user.update).toHaveBeenCalledWith({
          where: { id: 'user-123' },
          data: { isActive: false },
        })
      })
    })

    describe('PUT /api/users/[id]/deactivate', () => {
      it('should reactivate user account (admin only)', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockAdminUser
        } as any)

        const deactivatedUser = {
          ...mockRegularUser,
          isActive: false,
        }

        mockPrisma.user.findUnique.mockResolvedValue(deactivatedUser as any)
        mockPrisma.user.update.mockResolvedValue({
          ...deactivatedUser,
          isActive: true,
        } as any)

        const request = new NextRequest('http://localhost/api/users/user-123/deactivate', {
          method: 'PUT',
        })
        const params = Promise.resolve({ id: 'user-123' })

        const response = await reactivateUserPUT(request, { params })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.message).toBe('Account reactivated successfully')
        expect(mockPrisma.user.update).toHaveBeenCalledWith({
          where: { id: 'user-123' },
          data: { isActive: true },
        })
      })

      it('should require admin access for reactivation', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser
        } as any)

        const request = new NextRequest('http://localhost/api/users/user-123/deactivate', {
          method: 'PUT',
        })
        const params = Promise.resolve({ id: 'user-123' })

        const response = await reactivateUserPUT(request, { params })
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error.code).toBe('FORBIDDEN')
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockRegularUser
      } as any)

      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost/api/users/user-123')
      const params = Promise.resolve({ id: 'user-123' })

      const response = await getUserGET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should handle invalid JSON in request body', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockRegularUser
      } as any)

      const request = new NextRequest('http://localhost/api/users/user-123', {
        method: 'PUT',
        body: 'invalid json',
        headers: { 'content-type': 'application/json' },
      })
      const params = Promise.resolve({ id: 'user-123' })

      const response = await updateUserPUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('INVALID_JSON')
    })

    it('should handle missing authentication', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/users/user-123')
      const params = Promise.resolve({ id: 'user-123' })

      const response = await getUserGET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })
  })
})