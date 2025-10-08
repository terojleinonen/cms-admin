/**
 * Admin Users Bulk Operations API Tests
 * Tests for bulk user management operations
 */

import { jest } from '@jest/globals'
import { POST } from '../../../app/api/admin/users/bulk/route'
import { GET } from '../../../app/api/admin/users/[id]/security/route'
import { UserRole } from '@prisma/client'

// Mock the auth function
jest.mock('../../../auth', () => ({
  auth: jest.fn(),
}))

// Mock the prisma client
jest.mock('../../../app/lib/db', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
    roleChangeHistory: {
      create: jest.fn(),
    },
    passwordResetToken: {
      create: jest.fn(),
    },
    securityEvent: {
      findMany: jest.fn(),
    },
  },
}))

// Mock the audit service
jest.mock('../../../app/lib/audit-service', () => ({
  auditService: {
    log: jest.fn(),
  },
}))

// Mock password utils
jest.mock('../../../app/lib/password-utils', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
}))

import { auth } from '../../../auth'
import { prisma } from '../../../app/lib/db'
import { auditService } from '../../../app/lib/audit-service'

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockPrisma = prisma as any

describe('/api/admin/users/bulk', () => {
  const mockAdminUser = {
    id: 'admin-id',
    name: 'Admin User',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  }

  const mockUsers = [
    {
      id: 'user-1',
      name: 'User 1',
      email: 'user1@example.com',
      role: UserRole.EDITOR,
      isActive: false,
    },
    {
      id: 'user-2',
      name: 'User 2',
      email: 'user2@example.com',
      role: UserRole.VIEWER,
      isActive: true,
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.mockResolvedValue({ user: mockAdminUser })
  })

  describe('POST /api/admin/users/bulk', () => {
    it('should activate inactive users', async () => {
      mockPrisma.user.findMany.mockResolvedValue(mockUsers)
      mockPrisma.user.updateMany.mockResolvedValue({ count: 1 })

      const request = new Request('http://localhost/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'activate',
          userIds: ['user-1', 'user-2'],
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.operation).toBe('activate')
      expect(data.updated).toBe(1) // Only user-1 was inactive
      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['user-1'] } },
        data: { isActive: true, updatedAt: expect.any(Date) },
      })
    })

    it('should deactivate active users (except self)', async () => {
      mockPrisma.user.findMany.mockResolvedValue(mockUsers)
      mockPrisma.user.updateMany.mockResolvedValue({ count: 1 })

      const request = new Request('http://localhost/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'deactivate',
          userIds: ['user-1', 'user-2'],
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.updated).toBe(1) // Only user-2 was active
      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['user-2'] } },
        data: { isActive: false, updatedAt: expect.any(Date) },
      })
    })

    it('should change user roles', async () => {
      mockPrisma.user.findMany.mockResolvedValue(mockUsers)
      mockPrisma.user.updateMany.mockResolvedValue({ count: 2 })
      mockPrisma.roleChangeHistory.create.mockResolvedValue({})

      const request = new Request('http://localhost/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'change_role',
          userIds: ['user-1', 'user-2'],
          data: { role: 'ADMIN' },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.updated).toBe(2)
      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['user-1', 'user-2'] } },
        data: { role: 'ADMIN', updatedAt: expect.any(Date) },
      })
      expect(mockPrisma.roleChangeHistory.create).toHaveBeenCalledTimes(2)
    })

    it('should create password reset tokens', async () => {
      mockPrisma.user.findMany.mockResolvedValue(mockUsers)
      mockPrisma.passwordResetToken.create.mockResolvedValue({})

      const request = new Request('http://localhost/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'reset_password',
          userIds: ['user-1', 'user-2'],
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.updated).toBe(2)
      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledTimes(2)
    })

    it('should require admin access', async () => {
      mockAuth.mockResolvedValue({ user: { ...mockAdminUser, role: UserRole.EDITOR } })

      const request = new Request('http://localhost/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'activate',
          userIds: ['user-1'],
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })

    it('should validate request data', async () => {
      const request = new Request('http://localhost/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'invalid_operation',
          userIds: ['user-1'],
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should handle missing users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUsers[0]]) // Only return one user

      const request = new Request('http://localhost/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'activate',
          userIds: ['user-1', 'user-2'], // Request two users
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
    })
  })
})

describe('/api/admin/users/[id]/security', () => {
  const mockAdminUser = {
    id: 'admin-id',
    name: 'Admin User',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  }

  const mockUserWithSecurity = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: UserRole.EDITOR,
    isActive: true,
    emailVerified: new Date(),
    twoFactorEnabled: true,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    sessions: [
      {
        id: 'session-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isActive: true,
      },
    ],
    auditLogs: [
      {
        id: 'audit-1',
        action: 'LOGIN',
        resource: 'auth',
        details: {},
        ipAddress: '192.168.1.1',
        createdAt: new Date(),
      },
    ],
    passwordResetTokens: [],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.mockResolvedValue({ user: mockAdminUser })
  })

  describe('GET /api/admin/users/[id]/security', () => {
    it('should return user security information', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithSecurity)
      mockPrisma.securityEvent.findMany.mockResolvedValue([])

      const request = new Request('http://localhost/api/admin/users/user-1/security')
      const response = await GET(request, { params: { id: 'user-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.security).toBeDefined()
      expect(data.security.twoFactorEnabled).toBe(true)
      expect(data.security.activeSessions).toHaveLength(1)
      expect(data.security.recentActivity).toHaveLength(1)
      expect(data.security.securityScore).toBeGreaterThan(0)
    })

    it('should require admin access', async () => {
      mockAuth.mockResolvedValue({ user: { ...mockAdminUser, role: UserRole.EDITOR } })

      const request = new Request('http://localhost/api/admin/users/user-1/security')
      const response = await GET(request, { params: { id: 'user-1' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })

    it('should validate user ID format', async () => {
      const request = new Request('http://localhost/api/admin/users/invalid-id/security')
      const response = await GET(request, { params: { id: 'invalid-id' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('INVALID_ID')
    })

    it('should handle user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = new Request('http://localhost/api/admin/users/00000000-0000-0000-0000-000000000000/security')
      const response = await GET(request, { params: { id: '00000000-0000-0000-0000-000000000000' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
    })

    it('should calculate security score correctly', async () => {
      const userWithHighSecurity = {
        ...mockUserWithSecurity,
        emailVerified: new Date(),
        twoFactorEnabled: true,
        lastLoginAt: new Date(), // Recent login
        isActive: true,
        sessions: [{ id: 'session-1' }], // One session
      }

      mockPrisma.user.findUnique.mockResolvedValue(userWithHighSecurity)
      mockPrisma.securityEvent.findMany.mockResolvedValue([])

      const request = new Request('http://localhost/api/admin/users/user-1/security')
      const response = await GET(request, { params: { id: 'user-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.security.securityScore).toBeGreaterThanOrEqual(80) // High security score
    })
  })
})