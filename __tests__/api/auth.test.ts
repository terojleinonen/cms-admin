/**
 * Authentication API Routes Unit Tests
 * Tests the /api/auth/login and /api/auth/me endpoints
 */

import { NextRequest } from 'next/server'
import { POST as loginUser } from '../../app/api/auth/login/route'
import { GET as getProfile } from '../../app/api/auth/me/route'
import { prisma } from '../../app/lib/db'
import { hashPassword } from '../../app/lib/auth-utils'
import jwt from 'jsonwebtoken'

// Mock the database
jest.mock('../../app/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

// Mock auth utils
jest.mock('../../app/lib/auth-utils', () => ({
  verifyPassword: jest.fn(),
  getCurrentUser: jest.fn(),
  requireAuth: jest.fn(),
}))

// Mock JWT
jest.mock('jsonwebtoken')

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockJwt = jwt as jest.Mocked<typeof jwt>

describe('Authentication API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXTAUTH_SECRET = 'test-secret'
  })

  describe('POST /api/auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
    }

    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'EDITOR',
      passwordHash: 'hashed-password',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('should successfully login with valid credentials', async () => {
      // Mock database response
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.user.update.mockResolvedValue(mockUser)

      // Mock password verification
      const { verifyPassword } = require('../../app/lib/auth-utils')
      verifyPassword.mockResolvedValue(true)

      // Mock JWT signing
      mockJwt.sign.mockReturnValue('mock-jwt-token')

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(validLoginData),
      })

      const response = await loginUser(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user.email).toBe(validLoginData.email)
      expect(data.token).toBe('mock-jwt-token')
      expect(data.tokenType).toBe('Bearer')
      expect(data.expiresIn).toBe(86400)

      // Verify database calls
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: validLoginData.email.toLowerCase() },
        select: expect.any(Object),
      })
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { updatedAt: expect.any(Date) },
      })

      // Verify JWT token creation
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
        }),
        'test-secret',
        { algorithm: 'HS256' }
      )
    })

    it('should reject login with invalid email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(validLoginData),
      })

      const response = await loginUser(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('INVALID_CREDENTIALS')
      expect(data.error.message).toBe('Invalid email or password')
    })

    it('should reject login with invalid password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const { verifyPassword } = require('../../app/lib/auth-utils')
      verifyPassword.mockResolvedValue(false)

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(validLoginData),
      })

      const response = await loginUser(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('INVALID_CREDENTIALS')
      expect(data.error.message).toBe('Invalid email or password')
    })

    it('should reject login for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false }
      mockPrisma.user.findUnique.mockResolvedValue(inactiveUser)

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(validLoginData),
      })

      const response = await loginUser(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('ACCOUNT_INACTIVE')
      expect(data.error.message).toBe('Account has been disabled')
    })

    it('should validate request data', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123', // Too short
      }

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      })

      const response = await loginUser(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.details).toBeDefined()
    })

    it('should handle missing NEXTAUTH_SECRET', async () => {
      delete process.env.NEXTAUTH_SECRET

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      const { verifyPassword } = require('../../app/lib/auth-utils')
      verifyPassword.mockResolvedValue(true)

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(validLoginData),
      })

      const response = await loginUser(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('GET /api/auth/me', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'EDITOR',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('should return user profile with valid JWT token', async () => {
      // Mock JWT verification
      mockJwt.verify.mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      })

      // Mock database response
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost/api/auth/me', {
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      })

      const response = await getProfile(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user.email).toBe(mockUser.email)
      expect(data.user.name).toBe(mockUser.name)
      expect(data.user.role).toBe(mockUser.role)
      expect(data.permissions).toBeDefined()
      expect(Array.isArray(data.permissions)).toBe(true)

      // Verify JWT verification
      expect(mockJwt.verify).toHaveBeenCalledWith('valid-jwt-token', 'test-secret')
    })

    it('should return user profile with NextAuth session fallback', async () => {
      // Mock JWT verification to fail (no token)
      const request = new NextRequest('http://localhost/api/auth/me')

      // Mock NextAuth session
      const { getCurrentUser, requireAuth } = require('../../app/lib/auth-utils')
      requireAuth.mockResolvedValue(mockUser)
      getCurrentUser.mockResolvedValue(mockUser)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const response = await getProfile(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user.email).toBe(mockUser.email)
      expect(data.permissions).toBeDefined()
    })

    it('should reject request with invalid JWT token', async () => {
      // Mock JWT verification to throw error
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      // Mock NextAuth session to fail
      const { requireAuth } = require('../../app/lib/auth-utils')
      requireAuth.mockResolvedValue(new Response('Unauthorized', { status: 401 }))

      const request = new NextRequest('http://localhost/api/auth/me', {
        headers: {
          'Authorization': 'Bearer invalid-token',
        },
      })

      const response = await getProfile(request)

      expect(response.status).toBe(401)
    })

    it('should reject request for inactive user with JWT', async () => {
      // Mock JWT verification
      mockJwt.verify.mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      })

      // Mock database response with inactive user
      const inactiveUser = { ...mockUser, isActive: false }
      mockPrisma.user.findUnique.mockResolvedValue(inactiveUser)

      const request = new NextRequest('http://localhost/api/auth/me', {
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      })

      // Mock NextAuth session to fail
      const { requireAuth } = require('../../app/lib/auth-utils')
      requireAuth.mockResolvedValue(new Response('Unauthorized', { status: 401 }))

      const response = await getProfile(request)

      expect(response.status).toBe(401)
    })

    it('should return correct permissions for different roles', async () => {
      const adminUser = { ...mockUser, role: 'ADMIN' }

      mockJwt.verify.mockReturnValue({
        sub: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
      })

      mockPrisma.user.findUnique.mockResolvedValue(adminUser)

      const request = new NextRequest('http://localhost/api/auth/me', {
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      })

      const response = await getProfile(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.permissions).toContain('users.create')
      expect(data.permissions).toContain('users.delete')
      expect(data.permissions).toContain('settings.update')
    })
  })
})