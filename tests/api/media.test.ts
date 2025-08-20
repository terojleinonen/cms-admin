/**
 * Tests for Media API endpoints
 * Tests file upload, media management, and security
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { GET, POST } from '../../app/api/media/route'
import { prisma } from '../../app/lib/db'

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('../../app/lib/db', () => ({
  prisma: {
    media: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}))

jest.mock('../../app/lib/auth-config', () => ({
  authConfig: {},
}))

// Mock file system operations
jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  mkdir: jest.fn(),
}))

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
}))

// Mock sharp for image processing
jest.mock('sharp', () => {
  const mockSharp = {
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toFile: jest.fn().mockResolvedValue(undefined),
  }
  return jest.fn(() => mockSharp)
})

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}))

const mockGetServerSession = getServerSession as any
const mockPrisma = prisma as any

describe('/api/media', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('GET /api/media', () => {
    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/media')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should deny access to VIEWER role', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'VIEWER' },
      })

      const request = new NextRequest('http://localhost:3000/api/media')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })

    it('should return media files for EDITOR role', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'EDITOR' },
      })

      const mockDate = new Date()
      const mockMediaFiles = [
        {
          id: '1',
          filename: 'test-image.jpg',
          originalName: 'test image.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          url: '/uploads/test-image.jpg',
          altText: 'Test image',
          createdAt: mockDate,
          updatedAt: mockDate,
          uploadedBy: {
            id: '1',
            name: 'Test User',
            email: 'test@example.com',
          },
        },
      ]

      mockPrisma.media.count.mockResolvedValue(1)
      mockPrisma.media.findMany.mockResolvedValue(mockMediaFiles)

      const request = new NextRequest('http://localhost:3000/api/media')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mediaFiles).toHaveLength(1)
      expect(data.mediaFiles[0]).toMatchObject({
        id: '1',
        filename: 'test-image.jpg',
        originalName: 'test image.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        url: '/uploads/test-image.jpg',
        altText: 'Test image',
      })
      expect(data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1,
      })
    })
  })

  describe('POST /api/media', () => {
    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const formData = new FormData()
      const request = new NextRequest('http://localhost:3000/api/media', {
        method: 'POST',
        body: formData,
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should require files in request', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'EDITOR' },
      })

      const formData = new FormData()
      const request = new NextRequest('http://localhost:3000/api/media', {
        method: 'POST',
        body: formData,
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('No files provided')
    })
  })
})