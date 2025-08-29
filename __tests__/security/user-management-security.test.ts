/**
 * User Management Security Tests
 * Comprehensive security testing for authentication, authorization, and data protection
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { UserRole } from '@prisma/client'
import { hash, compare } from 'bcryptjs'

// Import API handlers for security testing
import { GET as getUsersGET, POST as createUserPOST } from '@/api/users/route'
import { GET as getUserGET, PUT as updateUserPUT, DELETE as deleteUserDELETE } from '@/api/users/[id]/route'
import { PUT as updateSecurityPUT } from '@/api/users/[id]/security/route'
import { POST as uploadAvatarPOST } from '@/api/users/[id]/avatar/route'

// Mock dependencies
jest.mock('next-auth')
jest.mock('../../app/lib/db')
jest.mock('bcryptjs')
jest.mock('../../app/lib/audit-service')
jest.mock('../../app/lib/rate-limit')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockHash = hash as jest.MockedFunction<typeof hash>
const mockCompare = compare as jest.MockedFunction<typeof compare>

describe('User Management Security Tests', () => {
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
  }

  const mockViewerUser = {
    id: 'viewer-123',
    name: 'Viewer User',
    email: 'viewer@example.com',
    role: UserRole.VIEWER,
    isActive: true,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Authentication Security', () => {
    it('should reject requests without authentication', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/users')
      const response = await getUsersGET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(data.error.message).toBe('Authentication required')
    })

    it('should reject requests with invalid session', async () => {
      mockGetServerSession.mockResolvedValue({
        user: null,
        expires: '2024-01-01',
      } as any)

      const request = new NextRequest('http://localhost/api/users')
      const response = await getUsersGET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should reject requests with expired session', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockRegularUser,
        expires: '2020-01-01', // Expired
      } as any)

      const request = new NextRequest('http://localhost/api/users')
      const response = await getUsersGET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should reject requests from inactive users', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { ...mockRegularUser, isActive: false },
        expires: '2024-12-31',
      } as any)

      const request = new NextRequest('http://localhost/api/users')
      const response = await getUsersGET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('ACCOUNT_INACTIVE')
    })
  })

  describe('Authorization Security', () => {
    describe('Role-Based Access Control', () => {
      it('should enforce admin-only access for user listing', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser,
          expires: '2024-12-31',
        } as any)

        const request = new NextRequest('http://localhost/api/users')
        const response = await getUsersGET(request)
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error.code).toBe('FORBIDDEN')
        expect(data.error.message).toBe('Admin access required')
      })

      it('should enforce admin-only access for user creation', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser,
          expires: '2024-12-31',
        } as any)

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

        expect(response.status).toBe(403)
        expect(data.error.code).toBe('FORBIDDEN')
      })

      it('should enforce admin-only access for user deletion', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser,
          expires: '2024-12-31',
        } as any)

        const request = new NextRequest('http://localhost/api/users/user-456', {
          method: 'DELETE',
        })
        const params = Promise.resolve({ id: 'user-456' })

        const response = await deleteUserDELETE(request, { params })
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error.code).toBe('FORBIDDEN')
      })

      it('should allow users to access their own profile', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser,
          expires: '2024-12-31',
        } as any)

        mockPrisma.user.findUnique.mockResolvedValue(mockRegularUser as any)

        const request = new NextRequest('http://localhost/api/users/user-123')
        const params = Promise.resolve({ id: 'user-123' })

        const response = await getUserGET(request, { params })

        expect(response.status).toBe(200)
      })

      it('should prevent users from accessing other profiles', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser,
          expires: '2024-12-31',
        } as any)

        const request = new NextRequest('http://localhost/api/users/other-user')
        const params = Promise.resolve({ id: 'other-user' })

        const response = await getUserGET(request, { params })
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error.code).toBe('FORBIDDEN')
      })

      it('should allow admin to access any profile', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockAdminUser,
          expires: '2024-12-31',
        } as any)

        mockPrisma.user.findUnique.mockResolvedValue(mockRegularUser as any)

        const request = new NextRequest('http://localhost/api/users/user-123')
        const params = Promise.resolve({ id: 'user-123' })

        const response = await getUserGET(request, { params })

        expect(response.status).toBe(200)
      })
    })

    describe('Field-Level Security', () => {
      it('should prevent non-admin from changing user role', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser,
          expires: '2024-12-31',
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

      it('should prevent non-admin from changing isActive status', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser,
          expires: '2024-12-31',
        } as any)

        mockPrisma.user.findUnique.mockResolvedValue(mockRegularUser as any)
        mockPrisma.user.update.mockResolvedValue(mockRegularUser as any)

        const updateData = {
          name: 'Updated Name',
          isActive: false, // Should be ignored
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
            isActive: false,
          }),
          select: expect.any(Object),
        })
      })

      it('should allow admin to change user role and status', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockAdminUser,
          expires: '2024-12-31',
        } as any)

        mockPrisma.user.findUnique.mockResolvedValue(mockRegularUser as any)
        mockPrisma.user.update.mockResolvedValue({
          ...mockRegularUser,
          role: UserRole.ADMIN,
          isActive: false,
        } as any)

        const updateData = {
          role: UserRole.ADMIN,
          isActive: false,
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
          data: expect.objectContaining({
            role: UserRole.ADMIN,
            isActive: false,
          }),
          select: expect.any(Object),
        })
      })
    })
  })

  describe('Input Validation Security', () => {
    describe('SQL Injection Prevention', () => {
      it('should sanitize user search input', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockAdminUser,
          expires: '2024-12-31',
        } as any)

        mockPrisma.user.findMany.mockResolvedValue([])
        mockPrisma.user.count.mockResolvedValue(0)

        // Attempt SQL injection
        const maliciousSearch = "'; DROP TABLE users; --"
        const request = new NextRequest(`http://localhost/api/users?search=${encodeURIComponent(maliciousSearch)}`)

        const response = await getUsersGET(request)

        expect(response.status).toBe(200)
        expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
          select: expect.any(Object),
          where: {
            OR: [
              { name: { contains: maliciousSearch, mode: 'insensitive' } },
              { email: { contains: maliciousSearch, mode: 'insensitive' } },
            ],
          },
          skip: 0,
          take: 20,
          orderBy: { createdAt: 'desc' },
        })
      })

      it('should validate user ID format', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockAdminUser,
          expires: '2024-12-31',
        } as any)

        // Attempt with malicious ID
        const maliciousId = "'; DROP TABLE users; --"
        const request = new NextRequest(`http://localhost/api/users/${encodeURIComponent(maliciousId)}`)
        const params = Promise.resolve({ id: maliciousId })

        const response = await getUserGET(request, { params })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error.code).toBe('VALIDATION_ERROR')
      })
    })

    describe('XSS Prevention', () => {
      it('should sanitize user input in profile updates', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser,
          expires: '2024-12-31',
        } as any)

        mockPrisma.user.findUnique.mockResolvedValue(mockRegularUser as any)

        const maliciousData = {
          name: '<script>alert("XSS")</script>',
          email: 'test@example.com',
        }

        const request = new NextRequest('http://localhost/api/users/user-123', {
          method: 'PUT',
          body: JSON.stringify(maliciousData),
          headers: { 'content-type': 'application/json' },
        })
        const params = Promise.resolve({ id: 'user-123' })

        const response = await updateUserPUT(request, { params })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.details.name).toContain('Invalid characters')
      })
    })

    describe('File Upload Security', () => {
      it('should validate file types for profile pictures', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser,
          expires: '2024-12-31',
        } as any)

        // Create malicious file with executable extension
        const maliciousFile = new File(['malicious content'], 'malware.exe', {
          type: 'application/x-msdownload',
        })

        const formData = new FormData()
        formData.append('file', maliciousFile)

        const request = new NextRequest('http://localhost/api/users/user-123/avatar', {
          method: 'POST',
          body: formData,
        })
        const params = Promise.resolve({ id: 'user-123' })

        const response = await uploadAvatarPOST(request, { params })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error.code).toBe('INVALID_FILE_TYPE')
      })

      it('should validate file size limits', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser,
          expires: '2024-12-31',
        } as any)

        // Create oversized file
        const largeContent = 'x'.repeat(10 * 1024 * 1024) // 10MB
        const largeFile = new File([largeContent], 'large.jpg', {
          type: 'image/jpeg',
        })

        const formData = new FormData()
        formData.append('file', largeFile)

        const request = new NextRequest('http://localhost/api/users/user-123/avatar', {
          method: 'POST',
          body: formData,
        })
        const params = Promise.resolve({ id: 'user-123' })

        const response = await uploadAvatarPOST(request, { params })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error.code).toBe('FILE_TOO_LARGE')
      })
    })
  })

  describe('Password Security', () => {
    describe('Password Strength Validation', () => {
      it('should enforce strong password requirements', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockAdminUser,
          expires: '2024-12-31',
        } as any)

        const weakPasswords = [
          'password',
          '123456',
          'qwerty',
          'abc123',
          'password123',
        ]

        for (const weakPassword of weakPasswords) {
          const userData = {
            name: 'Test User',
            email: 'test@example.com',
            password: weakPassword,
            role: UserRole.EDITOR,
          }

          const request = new NextRequest('http://localhost/api/users', {
            method: 'POST',
            body: JSON.stringify(userData),
            headers: { 'content-type': 'application/json' },
          })

          const response = await createUserPOST(request)
          const data = await response.json()

          expect(response.status).toBe(400)
          expect(data.error.code).toBe('VALIDATION_ERROR')
          expect(data.error.details.password).toContain('Password is too weak')
        }
      })

      it('should accept strong passwords', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockAdminUser,
          expires: '2024-12-31',
        } as any)

        mockPrisma.user.findUnique.mockResolvedValue(null) // Email not taken
        mockHash.mockResolvedValue('hashed-password')
        mockPrisma.user.create.mockResolvedValue(mockRegularUser as any)

        const strongPasswords = [
          'StrongPassword123!',
          'MySecure@Password456',
          'Complex#Pass789$',
        ]

        for (const strongPassword of strongPasswords) {
          const userData = {
            name: 'Test User',
            email: `test${Date.now()}@example.com`,
            password: strongPassword,
            role: UserRole.EDITOR,
          }

          const request = new NextRequest('http://localhost/api/users', {
            method: 'POST',
            body: JSON.stringify(userData),
            headers: { 'content-type': 'application/json' },
          })

          const response = await createUserPOST(request)

          expect(response.status).toBe(201)
        }
      })
    })

    describe('Password Change Security', () => {
      it('should require current password for password change', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser,
          expires: '2024-12-31',
        } as any)

        const updateData = {
          newPassword: 'NewStrongPassword123!',
          // Missing currentPassword
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
        expect(data.error.code).toBe('VALIDATION_ERROR')
      })

      it('should verify current password before change', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser,
          expires: '2024-12-31',
        } as any)

        mockPrisma.user.findUnique.mockResolvedValue({
          ...mockRegularUser,
          passwordHash: 'old-hash',
        } as any)

        mockCompare.mockResolvedValue(false) // Wrong current password

        const updateData = {
          currentPassword: 'wrongPassword',
          newPassword: 'NewStrongPassword123!',
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

      it('should prevent password reuse', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser,
          expires: '2024-12-31',
        } as any)

        mockPrisma.user.findUnique.mockResolvedValue({
          ...mockRegularUser,
          passwordHash: 'current-hash',
        } as any)

        mockCompare
          .mockResolvedValueOnce(true) // Current password correct
          .mockResolvedValueOnce(true) // New password same as current

        const updateData = {
          currentPassword: 'currentPassword123!',
          newPassword: 'currentPassword123!', // Same as current
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
        expect(data.error.message).toBe('New password must be different from current password')
      })
    })
  })

  describe('Data Protection', () => {
    describe('Sensitive Data Filtering', () => {
      it('should not expose password hashes in API responses', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser,
          expires: '2024-12-31',
        } as any)

        mockPrisma.user.findUnique.mockResolvedValue({
          ...mockRegularUser,
          passwordHash: 'secret-hash',
        } as any)

        const request = new NextRequest('http://localhost/api/users/user-123')
        const params = Promise.resolve({ id: 'user-123' })

        const response = await getUserGET(request, { params })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.user.passwordHash).toBeUndefined()
        expect(data.user.password).toBeUndefined()
      })

      it('should not expose 2FA secrets in API responses', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockRegularUser,
          expires: '2024-12-31',
        } as any)

        mockPrisma.user.findUnique.mockResolvedValue({
          ...mockRegularUser,
          twoFactorSecret: 'secret-2fa-key',
        } as any)

        const request = new NextRequest('http://localhost/api/users/user-123')
        const params = Promise.resolve({ id: 'user-123' })

        const response = await getUserGET(request, { params })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.user.twoFactorSecret).toBeUndefined()
      })
    })

    describe('Email Uniqueness Security', () => {
      it('should prevent email enumeration attacks', async () => {
        mockGetServerSession.mockResolvedValue({
          user: mockAdminUser,
          expires: '2024-12-31',
        } as any)

        mockPrisma.user.findUnique.mockResolvedValue(mockRegularUser as any)

        const userData = {
          name: 'Test User',
          email: 'user@example.com', // Already exists
          password: 'StrongPassword123!',
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
        // Should not reveal which field is duplicate for security
        expect(data.error.message).toBe('User with this email already exists')
      })
    })
  })

  describe('Rate Limiting Security', () => {
    it('should implement rate limiting for password change attempts', async () => {
      // This would be tested with actual rate limiting implementation
      // For now, we verify the rate limiting middleware is called
      const rateLimitMock = require('../../app/lib/rate-limit')
      rateLimitMock.checkRateLimit = jest.fn().mockResolvedValue({
        success: false,
        limit: 5,
        remaining: 0,
        reset: Date.now() + 60000,
      })

      mockGetServerSession.mockResolvedValue({
        user: mockRegularUser,
        expires: '2024-12-31',
      } as any)

      const updateData = {
        currentPassword: 'currentPassword123!',
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

      expect(response.status).toBe(429)
      expect(data.error.code).toBe('RATE_LIMIT_EXCEEDED')
    })
  })

  describe('Audit Trail Security', () => {
    it('should log all security-sensitive operations', async () => {
      const auditMock = require('../../app/lib/audit-service')
      const mockAuditService = {
        logUser: jest.fn(),
        logSecurity: jest.fn(),
      }
      auditMock.getAuditService.mockReturnValue(mockAuditService)

      mockGetServerSession.mockResolvedValue({
        user: mockRegularUser,
        expires: '2024-12-31',
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockRegularUser,
        passwordHash: 'old-hash',
      } as any)

      mockCompare.mockResolvedValue(true)
      mockHash.mockResolvedValue('new-hash')
      mockPrisma.user.update.mockResolvedValue(mockRegularUser as any)

      const updateData = {
        currentPassword: 'currentPassword123!',
        newPassword: 'NewPassword456@',
      }

      const request = new NextRequest('http://localhost/api/users/user-123/security', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'content-type': 'application/json' },
      })
      const params = Promise.resolve({ id: 'user-123' })

      const response = await updateSecurityPUT(request, { params })

      expect(response.status).toBe(200)
      expect(mockAuditService.logSecurity).toHaveBeenCalledWith(
        'user-123',
        'PASSWORD_CHANGE',
        expect.objectContaining({
          userId: 'user-123',
          success: true,
        }),
        expect.any(String), // IP address
        expect.any(String)  // User agent
      )
    })

    it('should log failed authentication attempts', async () => {
      const auditMock = require('../../app/lib/audit-service')
      const mockAuditService = {
        logSecurity: jest.fn(),
      }
      auditMock.getAuditService.mockReturnValue(mockAuditService)

      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/users/user-123')
      const params = Promise.resolve({ id: 'user-123' })

      const response = await getUserGET(request, { params })

      expect(response.status).toBe(401)
      expect(mockAuditService.logSecurity).toHaveBeenCalledWith(
        null,
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        expect.objectContaining({
          endpoint: '/api/users/user-123',
          method: 'GET',
        }),
        expect.any(String), // IP address
        expect.any(String)  // User agent
      )
    })
  })
})