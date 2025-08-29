/**
 * Data Export API Tests
 * Tests for user data export functionality
 */

import { NextRequest } from 'next/server'
import { GET as exportHandler } from '../../app/api/users/[id]/export/route'
import { getServerSession } from 'next-auth'
import { prisma } from '../../app/lib/db'
import { UserRole } from '@prisma/client'

// Mock dependencies
jest.mock('next-auth')
jest.mock('../../app/lib/db')
jest.mock('../../app/lib/audit-service')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/users/[id]/export', () => {
  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    role: UserRole.EDITOR,
    isActive: true,
    profilePicture: 'profile.jpg',
    emailVerified: new Date('2024-01-01'),
    twoFactorEnabled: false,
    lastLoginAt: new Date('2024-01-15'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  }

  const mockAdmin = {
    id: 'admin-123',
    name: 'Admin User',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    isActive: true,
  }

  const mockPreferences = {
    id: 'pref-123',
    userId: 'user-123',
    theme: 'DARK',
    timezone: 'UTC',
    language: 'en',
    notifications: { email: true, push: false },
    dashboard: { layout: 'default' },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  const mockAuditLogs = [
    {
      id: 'audit-1',
      action: 'LOGIN',
      resource: 'user',
      details: { ip: '127.0.0.1' },
      createdAt: new Date('2024-01-15'),
    },
    {
      id: 'audit-2',
      action: 'PROFILE_UPDATED',
      resource: 'user',
      details: { fields: ['name'] },
      createdAt: new Date('2024-01-10'),
    },
  ]

  const mockSessions = [
    {
      id: 'session-1',
      expiresAt: new Date('2024-02-01'),
      isActive: true,
      createdAt: new Date('2024-01-15'),
    },
  ]

  const mockProducts = [
    {
      id: 'product-1',
      name: 'Test Product',
      slug: 'test-product',
      status: 'PUBLISHED',
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-12'),
    },
  ]

  const mockPages = [
    {
      id: 'page-1',
      title: 'Test Page',
      slug: 'test-page',
      status: 'PUBLISHED',
      createdAt: new Date('2024-01-08'),
      updatedAt: new Date('2024-01-09'),
    },
  ]

  const mockMedia = [
    {
      id: 'media-1',
      filename: 'image.jpg',
      originalName: 'original-image.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024000,
      createdAt: new Date('2024-01-05'),
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET - Data Export', () => {
    it('should allow user to export their own data in JSON format', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
        expires: '2024-01-01'
      })

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.userPreferences.findUnique.mockResolvedValue(mockPreferences)
      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditLogs)
      mockPrisma.session.findMany.mockResolvedValue(mockSessions)
      mockPrisma.product.findMany.mockResolvedValue(mockProducts)
      mockPrisma.page.findMany.mockResolvedValue(mockPages)
      mockPrisma.media.findMany.mockResolvedValue(mockMedia)

      const request = new NextRequest('http://localhost:3001/api/users/user-123/export?format=json&includeAuditLogs=true&includePreferences=true&includeCreatedContent=true')

      const response = await exportHandler(request, { params: Promise.resolve({ id: 'user-123' }) })

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(response.headers.get('Content-Disposition')).toContain('attachment')
      expect(response.headers.get('Content-Disposition')).toContain('user-data-export-user-123')

      const responseText = await response.text()
      const exportData = JSON.parse(responseText)

      expect(exportData.user).toBeDefined()
      expect(exportData.user.id).toBe('user-123')
      expect(exportData.user.name).toBe('Test User')
      expect(exportData.user.profilePicture).toBe('Profile picture exists') // Sanitized

      expect(exportData.preferences).toEqual(mockPreferences)
      expect(exportData.auditLogs).toEqual(mockAuditLogs)
      expect(exportData.createdContent.products).toEqual(mockProducts)
      expect(exportData.createdContent.pages).toEqual(mockPages)
      expect(exportData.createdContent.media).toEqual(mockMedia)

      expect(exportData.exportMetadata).toBeDefined()
      expect(exportData.exportMetadata.format).toBe('json')
      expect(exportData.exportMetadata.exportedBy).toBe('user-123')
    })

    it('should allow admin to export any user data', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockAdmin,
        expires: '2024-01-01'
      })

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.userPreferences.findUnique.mockResolvedValue(mockPreferences)
      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditLogs)
      mockPrisma.product.findMany.mockResolvedValue(mockProducts)
      mockPrisma.page.findMany.mockResolvedValue(mockPages)
      mockPrisma.media.findMany.mockResolvedValue(mockMedia)

      const request = new NextRequest('http://localhost:3001/api/users/user-123/export?format=json')

      const response = await exportHandler(request, { params: Promise.resolve({ id: 'user-123' }) })

      expect(response.status).toBe(200)
      
      const responseText = await response.text()
      const exportData = JSON.parse(responseText)

      expect(exportData.user.id).toBe('user-123')
      expect(exportData.exportMetadata.exportedBy).toBe('admin-123')
    })

    it('should export data in CSV format', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
        expires: '2024-01-01'
      })

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.userPreferences.findUnique.mockResolvedValue(mockPreferences)
      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditLogs)
      mockPrisma.product.findMany.mockResolvedValue(mockProducts)
      mockPrisma.page.findMany.mockResolvedValue(mockPages)
      mockPrisma.media.findMany.mockResolvedValue(mockMedia)

      const request = new NextRequest('http://localhost:3001/api/users/user-123/export?format=csv&includeAuditLogs=true&includePreferences=true')

      const response = await exportHandler(request, { params: Promise.resolve({ id: 'user-123' }) })

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/csv')
      expect(response.headers.get('Content-Disposition')).toContain('attachment')
      expect(response.headers.get('Content-Disposition')).toContain('.csv')

      const csvData = await response.text()
      expect(csvData).toContain('USER DATA')
      expect(csvData).toContain('USER PREFERENCES')
      expect(csvData).toContain('AUDIT LOGS')
      expect(csvData).toContain('Test User')
    })

    it('should respect include/exclude options', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
        expires: '2024-01-01'
      })

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      // Don't mock other queries since they shouldn't be called

      const request = new NextRequest('http://localhost:3001/api/users/user-123/export?format=json&includeAuditLogs=false&includePreferences=false&includeCreatedContent=false')

      const response = await exportHandler(request, { params: Promise.resolve({ id: 'user-123' }) })

      expect(response.status).toBe(200)
      
      const responseText = await response.text()
      const exportData = JSON.parse(responseText)

      expect(exportData.user).toBeDefined()
      expect(exportData.preferences).toBeUndefined()
      expect(exportData.auditLogs).toBeUndefined()
      expect(exportData.createdContent).toBeUndefined()

      // Verify that the queries were not made
      expect(mockPrisma.userPreferences.findUnique).not.toHaveBeenCalled()
      expect(mockPrisma.auditLog.findMany).not.toHaveBeenCalled()
      expect(mockPrisma.product.findMany).not.toHaveBeenCalled()
    })

    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3001/api/users/user-123/export')

      const response = await exportHandler(request, { params: Promise.resolve({ id: 'user-123' }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should prevent unauthorized access to other users data', async () => {
      const otherUser = { ...mockUser, id: 'other-user-123' }
      mockGetServerSession.mockResolvedValue({
        user: otherUser,
        expires: '2024-01-01'
      })

      const request = new NextRequest('http://localhost:3001/api/users/user-123/export')

      const response = await exportHandler(request, { params: Promise.resolve({ id: 'user-123' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })

    it('should handle non-existent user', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockAdmin,
        expires: '2024-01-01'
      })

      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3001/api/users/nonexistent/export')

      const response = await exportHandler(request, { params: Promise.resolve({ id: 'nonexistent' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
    })

    it('should limit audit logs to prevent excessive data', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
        expires: '2024-01-01'
      })

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditLogs)

      const request = new NextRequest('http://localhost:3001/api/users/user-123/export?includeAuditLogs=true')

      await exportHandler(request, { params: Promise.resolve({ id: 'user-123' }) })

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: 1000, // Should limit to 1000 entries
        select: expect.any(Object),
      })
    })

    it('should limit sessions to prevent excessive data', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
        expires: '2024-01-01'
      })

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.session.findMany.mockResolvedValue(mockSessions)

      const request = new NextRequest('http://localhost:3001/api/users/user-123/export?includeSessions=true')

      await exportHandler(request, { params: Promise.resolve({ id: 'user-123' }) })

      expect(mockPrisma.session.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: 50, // Should limit to 50 sessions
        select: expect.any(Object),
      })
    })

    it('should validate query parameters', async () => {
      mockGetServerSession.mockResolvedValue({
        user: mockUser,
        expires: '2024-01-01'
      })

      const request = new NextRequest('http://localhost:3001/api/users/user-123/export?format=invalid')

      const response = await exportHandler(request, { params: Promise.resolve({ id: 'user-123' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })
})