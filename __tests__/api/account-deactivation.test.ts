/**
 * Account Deactivation API Tests
 * Tests for account deactivation and reactivation functionality
 */

import { NextRequest } from 'next/server'
import { POST as deactivateHandler, PUT as reactivateHandler } from '../../app/api/users/[id]/deactivate/route'
import { getServerSession } from 'next-auth'
import { prisma } from '../../app/lib/db'
import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Mock dependencies
jest.mock('next-auth')
jest.mock('../../app/lib/db')
jest.mock('../../app/lib/audit-service')
jest.mock('bcryptjs')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>

describe('/api/users/[id]/deactivate', () => {
  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    role: UserRole.EDITOR,
    isActive: true,
    passwordHash: 'hashed-password',
  }

  const mockAdmin = {
    id: 'admin-123',
    name: 'Admin User',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    isActive: true,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock Prisma transaction
    mockPrisma.$transaction = jest.fn().mockImplementation(async (callback) => {
      return callback(mockPrisma)
    })
  })

  describe('POST - Account Deactivation', () => {
    it('should allow user to deactivate their own account', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
        expires: '2024-01-01'
      })

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockBcrypt.compare.mockResolvedValue(true)
      
      const updatedUser = { ...mockUser, isActive: false }
      mockPrisma.user.update.mockResolvedValue(updatedUser)
      mockPrisma.session.updateMany.mockResolvedValue({ count: 2 })

      const request = new NextRequest('http://localhost:3001/api/users/user-123/deactivate', {
        method: 'POST',
        body: JSON.stringify({
          reason: 'Personal reasons',
          confirmPassword: 'correct-password',
          dataRetention: true,
        }),
      })

      const response = await deactivateHandler(request, { params: Promise.resolve({ id: 'user-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user.isActive).toBe(false)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          isActive: false,
          updatedAt: expect.any(Date),
        },
        select: expect.any(Object),
      })
      expect(mockPrisma.session.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          isActive: true,
        },
        data: {
          isActive: false,
        },
      })
    })

    it('should allow admin to deactivate any user account', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockAdmin,
        expires: '2024-01-01'
      })

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      
      const updatedUser = { ...mockUser, isActive: false }
      mockPrisma.user.update.mockResolvedValue(updatedUser)
      mockPrisma.session.updateMany.mockResolvedValue({ count: 2 })

      const request = new NextRequest('http://localhost:3001/api/users/user-123/deactivate', {
        method: 'POST',
        body: JSON.stringify({
          reason: 'Policy violation',
          dataRetention: true,
        }),
      })

      const response = await deactivateHandler(request, { params: Promise.resolve({ id: 'user-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user.isActive).toBe(false)
    })

    it('should reject deactivation with invalid password', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
        expires: '2024-01-01'
      })

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockBcrypt.compare.mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3001/api/users/user-123/deactivate', {
        method: 'POST',
        body: JSON.stringify({
          reason: 'Personal reasons',
          confirmPassword: 'wrong-password',
          dataRetention: true,
        }),
      })

      const response = await deactivateHandler(request, { params: Promise.resolve({ id: 'user-123' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('INVALID_PASSWORD')
    })

    it('should prevent admin from deactivating themselves', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockAdmin,
        expires: '2024-01-01'
      })

      mockPrisma.user.findUnique.mockResolvedValue(mockAdmin)

      const request = new NextRequest('http://localhost:3001/api/users/admin-123/deactivate', {
        method: 'POST',
        body: JSON.stringify({
          reason: 'Testing',
          dataRetention: true,
        }),
      })

      const response = await deactivateHandler(request, { params: Promise.resolve({ id: 'admin-123' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })

    it('should reject deactivation of already deactivated account', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockAdmin,
        expires: '2024-01-01'
      })

      const deactivatedUser = { ...mockUser, isActive: false }
      mockPrisma.user.findUnique.mockResolvedValue(deactivatedUser)

      const request = new NextRequest('http://localhost:3001/api/users/user-123/deactivate', {
        method: 'POST',
        body: JSON.stringify({
          reason: 'Testing',
          dataRetention: true,
        }),
      })

      const response = await deactivateHandler(request, { params: Promise.resolve({ id: 'user-123' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('ALREADY_DEACTIVATED')
    })

    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3001/api/users/user-123/deactivate', {
        method: 'POST',
        body: JSON.stringify({
          reason: 'Testing',
          dataRetention: true,
        }),
      })

      const response = await deactivateHandler(request, { params: Promise.resolve({ id: 'user-123' }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should validate required fields', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
        expires: '2024-01-01'
      })

      const request = new NextRequest('http://localhost:3001/api/users/user-123/deactivate', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required reason field
          dataRetention: true,
        }),
      })

      const response = await deactivateHandler(request, { params: Promise.resolve({ id: 'user-123' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('PUT - Account Reactivation', () => {
    it('should allow admin to reactivate deactivated account', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockAdmin,
        expires: '2024-01-01'
      })

      const deactivatedUser = { ...mockUser, isActive: false }
      mockPrisma.user.findUnique.mockResolvedValue(deactivatedUser)
      
      const reactivatedUser = { ...mockUser, isActive: true }
      mockPrisma.user.update.mockResolvedValue(reactivatedUser)

      const request = new NextRequest('http://localhost:3001/api/users/user-123/deactivate', {
        method: 'PUT',
        body: JSON.stringify({
          reason: 'Issue resolved',
          notifyUser: true,
        }),
      })

      const response = await reactivateHandler(request, { params: Promise.resolve({ id: 'user-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user.isActive).toBe(true)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          isActive: true,
          updatedAt: expect.any(Date),
        },
        select: expect.any(Object),
      })
    })

    it('should require admin access for reactivation', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
        expires: '2024-01-01'
      })

      const request = new NextRequest('http://localhost:3001/api/users/user-123/deactivate', {
        method: 'PUT',
        body: JSON.stringify({
          reason: 'Issue resolved',
          notifyUser: true,
        }),
      })

      const response = await reactivateHandler(request, { params: Promise.resolve({ id: 'user-123' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })

    it('should reject reactivation of already active account', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockAdmin,
        expires: '2024-01-01'
      })

      mockPrisma.user.findUnique.mockResolvedValue(mockUser) // Already active

      const request = new NextRequest('http://localhost:3001/api/users/user-123/deactivate', {
        method: 'PUT',
        body: JSON.stringify({
          reason: 'Issue resolved',
          notifyUser: true,
        }),
      })

      const response = await reactivateHandler(request, { params: Promise.resolve({ id: 'user-123' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('ALREADY_ACTIVE')
    })

    it('should handle non-existent user', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockAdmin,
        expires: '2024-01-01'
      })

      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3001/api/users/nonexistent/deactivate', {
        method: 'PUT',
        body: JSON.stringify({
          reason: 'Issue resolved',
          notifyUser: true,
        }),
      })

      const response = await reactivateHandler(request, { params: Promise.resolve({ id: 'nonexistent' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
    })

    it('should validate required fields for reactivation', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockAdmin,
        expires: '2024-01-01'
      })

      const request = new NextRequest('http://localhost:3001/api/users/user-123/deactivate', {
        method: 'PUT',
        body: JSON.stringify({
          // Missing required reason field
          notifyUser: true,
        }),
      })

      const response = await reactivateHandler(request, { params: Promise.resolve({ id: 'user-123' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })
})