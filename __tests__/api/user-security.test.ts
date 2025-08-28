/**
 * User Security Settings API Tests
 * Tests for the security settings and 2FA management endpoints
 */

import { NextRequest } from 'next/server'
import { GET, PUT } from '@/api/users/[id]/security/route'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { UserRole } from '@prisma/client'
import { verifyPassword } from '@/lib/password-utils'

// Mock dependencies
jest.mock('next-auth')
jest.mock('../../app/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    session: {
      updateMany: jest.fn(),
    }
  }
}))
jest.mock('../../app/lib/audit-service', () => ({
  getAuditService: jest.fn(() => ({
    getUserActivity: jest.fn(),
    logAuth: jest.fn()
  }))
}))
jest.mock('../../app/lib/password-utils')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockVerifyPassword = verifyPassword as jest.MockedFunction<typeof verifyPassword>

describe('/api/users/[id]/security', () => {
  const mockUserId = 'user-123'
  
  const mockUser = {
    id: mockUserId,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    lastLoginAt: new Date(),
    updatedAt: new Date(),
    passwordHash: 'hashed-password',
    sessions: [
      {
        id: 'session-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      {
        id: 'session-2',
        ipAddress: '192.168.1.2',
        userAgent: 'Chrome/91.0...',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }
    ]
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/users/[id]/security', () => {
    it('should return security information with sessions and activity', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      // Mock audit service
      const mockAuditService = {
        getUserActivity: jest.fn().mockResolvedValue([
          {
            id: 'audit-1',
            action: 'auth.login',
            createdAt: new Date(),
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0...'
          }
        ])
      }
      
      const { getAuditService } = require('@/lib/audit-service')
      getAuditService.mockReturnValue(mockAuditService)

      const request = new NextRequest('http://localhost/api/users/user-123/security')
      const params = Promise.resolve({ id: mockUserId })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.security).toMatchObject({
        twoFactorEnabled: false,
        lastPasswordChange: expect.any(String),
        lastLoginAt: expect.any(String),
        activeSessions: expect.arrayContaining([
          expect.objectContaining({
            id: 'session-1',
            ipAddress: '192.168.1.1'
          })
        ]),
        recentActivity: expect.any(Array),
        securityScore: expect.any(Number)
      })
    })

    it('should return 404 for non-existent user', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/users/nonexistent/security')
      const params = Promise.resolve({ id: 'nonexistent' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
    })

    it('should deny access to other users security for non-admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'other-user', role: UserRole.EDITOR }
      } as any)

      const request = new NextRequest('http://localhost/api/users/user-123/security')
      const params = Promise.resolve({ id: mockUserId })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })
  })

  describe('PUT /api/users/[id]/security - Password Change', () => {
    it('should change password with valid current password', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockVerifyPassword.mockResolvedValue(true)
      mockPrisma.user.update.mockResolvedValue(mockUser as any)

      const requestData = {
        action: 'change_password',
        currentPassword: 'current-password',
        newPassword: 'NewPassword123!',
        confirmNewPassword: 'NewPassword123!'
      }

      const request = new NextRequest('http://localhost/api/users/user-123/security', {
        method: 'PUT',
        body: JSON.stringify(requestData),
        headers: { 'content-type': 'application/json' }
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Password changed successfully')
      expect(mockVerifyPassword).toHaveBeenCalledWith('current-password', 'hashed-password')
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { passwordHash: expect.any(String) }
      })
    })

    it('should reject password change with invalid current password', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockVerifyPassword.mockResolvedValue(false)

      const requestData = {
        action: 'change_password',
        currentPassword: 'wrong-password',
        newPassword: 'NewPassword123!',
        confirmNewPassword: 'NewPassword123!'
      }

      const request = new NextRequest('http://localhost/api/users/user-123/security', {
        method: 'PUT',
        body: JSON.stringify(requestData),
        headers: { 'content-type': 'application/json' }
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('INVALID_PASSWORD')
    })

    it('should validate password strength', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      const requestData = {
        action: 'change_password',
        currentPassword: 'current-password',
        newPassword: 'weak', // Weak password
        confirmNewPassword: 'weak'
      }

      const request = new NextRequest('http://localhost/api/users/user-123/security', {
        method: 'PUT',
        body: JSON.stringify(requestData),
        headers: { 'content-type': 'application/json' }
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('PUT /api/users/[id]/security - 2FA Setup', () => {
    it('should setup 2FA and return secret and QR code', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, email: 'test@example.com', role: UserRole.EDITOR }
      } as any)

      mockPrisma.user.update.mockResolvedValue(mockUser as any)

      const requestData = {
        action: 'setup_2fa'
      }

      const request = new NextRequest('http://localhost/api/users/user-123/security', {
        method: 'PUT',
        body: JSON.stringify(requestData),
        headers: { 'content-type': 'application/json' }
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.secret).toBeDefined()
      expect(data.qrCodeUrl).toContain('otpauth://totp/')
      expect(data.backupCodes).toHaveLength(10)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { twoFactorSecret: expect.any(String) }
      })
    })
  })

  describe('PUT /api/users/[id]/security - 2FA Verification', () => {
    it('should verify 2FA token and enable 2FA', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      const userWith2FASecret = {
        ...mockUser,
        twoFactorSecret: 'test-secret'
      }

      mockPrisma.user.findUnique.mockResolvedValue(userWith2FASecret as any)
      mockPrisma.user.update.mockResolvedValue({
        ...userWith2FASecret,
        twoFactorEnabled: true
      } as any)

      // Mock TOTP verification (in real implementation, use proper TOTP library)
      jest.doMock('crypto', () => ({
        createHmac: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            digest: jest.fn().mockReturnValue('123456123456')
          })
        }),
        randomBytes: jest.fn().mockReturnValue(Buffer.from('test'))
      }))

      const requestData = {
        action: 'verify_2fa',
        token: '123456'
      }

      const request = new NextRequest('http://localhost/api/users/user-123/security', {
        method: 'PUT',
        body: JSON.stringify(requestData),
        headers: { 'content-type': 'application/json' }
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('2FA enabled successfully')
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { twoFactorEnabled: true }
      })
    })

    it('should reject invalid 2FA token', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      const userWith2FASecret = {
        ...mockUser,
        twoFactorSecret: 'test-secret'
      }

      mockPrisma.user.findUnique.mockResolvedValue(userWith2FASecret as any)

      const requestData = {
        action: 'verify_2fa',
        token: '000000' // Invalid token
      }

      const request = new NextRequest('http://localhost/api/users/user-123/security', {
        method: 'PUT',
        body: JSON.stringify(requestData),
        headers: { 'content-type': 'application/json' }
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('INVALID_TOKEN')
    })
  })

  describe('PUT /api/users/[id]/security - 2FA Disable', () => {
    it('should disable 2FA with valid password', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      const userWith2FA = {
        ...mockUser,
        twoFactorEnabled: true,
        twoFactorSecret: 'test-secret'
      }

      mockPrisma.user.findUnique.mockResolvedValue(userWith2FA as any)
      mockVerifyPassword.mockResolvedValue(true)
      mockPrisma.user.update.mockResolvedValue({
        ...userWith2FA,
        twoFactorEnabled: false,
        twoFactorSecret: null
      } as any)

      const requestData = {
        action: 'disable_2fa',
        currentPassword: 'current-password'
      }

      const request = new NextRequest('http://localhost/api/users/user-123/security', {
        method: 'PUT',
        body: JSON.stringify(requestData),
        headers: { 'content-type': 'application/json' }
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('2FA disabled successfully')
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { 
          twoFactorEnabled: false,
          twoFactorSecret: null
        }
      })
    })
  })

  describe('PUT /api/users/[id]/security - Session Termination', () => {
    it('should terminate specific sessions', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      mockPrisma.session.updateMany.mockResolvedValue({ count: 2 } as any)

      const requestData = {
        action: 'terminate_sessions',
        sessionIds: ['session-1', 'session-2'],
        terminateAll: false
      }

      const request = new NextRequest('http://localhost/api/users/user-123/security', {
        method: 'PUT',
        body: JSON.stringify(requestData),
        headers: { 'content-type': 'application/json' }
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Sessions terminated successfully')
      expect(mockPrisma.session.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['session-1', 'session-2'] },
          userId: mockUserId,
          isActive: true
        },
        data: { isActive: false }
      })
    })

    it('should terminate all sessions except current', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR },
        sessionToken: 'current-session-token'
      } as any)

      mockPrisma.session.updateMany.mockResolvedValue({ count: 5 } as any)

      const requestData = {
        action: 'terminate_sessions',
        sessionIds: [],
        terminateAll: true
      }

      const request = new NextRequest('http://localhost/api/users/user-123/security', {
        method: 'PUT',
        body: JSON.stringify(requestData),
        headers: { 'content-type': 'application/json' }
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockPrisma.session.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          isActive: true,
          token: { not: 'current-session-token' }
        },
        data: { isActive: false }
      })
    })
  })

  describe('Invalid Actions', () => {
    it('should return error for invalid action', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      const requestData = {
        action: 'invalid_action'
      }

      const request = new NextRequest('http://localhost/api/users/user-123/security', {
        method: 'PUT',
        body: JSON.stringify(requestData),
        headers: { 'content-type': 'application/json' }
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('INVALID_ACTION')
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/users/user-123/security')
      const params = Promise.resolve({ id: mockUserId })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should allow admin to access any user security settings', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-456', role: UserRole.ADMIN }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const { getAuditService } = require('@/lib/audit-service')
      getAuditService.mockReturnValue({
        getUserActivity: jest.fn().mockResolvedValue([])
      })

      const request = new NextRequest('http://localhost/api/users/user-123/security')
      const params = Promise.resolve({ id: mockUserId })

      const response = await GET(request, { params })

      expect(response.status).toBe(200)
    })
  })
})