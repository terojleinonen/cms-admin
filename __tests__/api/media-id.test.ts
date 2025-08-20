/**
 * Tests for individual Media API endpoints
 * Tests GET, PUT, DELETE operations for specific media files
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { GET, PUT, DELETE } from '../../app/api/media/[id]/route'
import { prisma } from '../../app/lib/db'

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('../../app/lib/db', () => ({
  prisma: {
    media: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

jest.mock('../../app/lib/auth-config', () => ({
  authConfig: {},
}))

// Mock file system operations
jest.mock('fs/promises', () => ({
  unlink: jest.fn(),
}))

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
}))

const mockGetServerSession = getServerSession as any
const mockPrisma = prisma as any

const mockMediaFile = {
  id: '1',
  name: 'test-image.jpg',
  originalName: 'test image.jpg',
  type: 'image',
  mimeType: 'image/jpeg',
  size: 1024,
  url: '/uploads/test-image.jpg',
  thumbnailUrl: '/uploads/thumbnails/test-image.jpg',
  folder: null,
  alt: 'Test image',
  caption: 'A test image',
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
  },
}

describe('/api/media/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('GET /api/media/[id]', () => {
    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/media/1')
      const response = await GET(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should deny access to VIEWER role', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'VIEWER' },
      })

      const request = new NextRequest('http://localhost:3000/api/media/1')
      const response = await GET(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })

    it('should return 404 for non-existent media file', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'EDITOR' },
      })

      mockPrisma.media.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/media/999')
      const response = await GET(request, { params: { id: '999' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
    })

    it('should return media file for valid ID', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'EDITOR' },
      })

      mockPrisma.media.findUnique.mockResolvedValue(mockMediaFile)

      const request = new NextRequest('http://localhost:3000/api/media/1')
      const response = await GET(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mediaFile).toEqual(mockMediaFile)
      expect(mockPrisma.media.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        select: expect.objectContaining({
          id: true,
          name: true,
          originalName: true,
          type: true,
          mimeType: true,
          size: true,
          url: true,
          thumbnailUrl: true,
          folder: true,
          alt: true,
          caption: true,
          createdAt: true,
          updatedAt: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        }),
      })
    })
  })

  describe('PUT /api/media/[id]', () => {
    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/media/1', {
        method: 'PUT',
        body: JSON.stringify({ alt: 'Updated alt text' }),
      })
      const response = await PUT(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should deny access to VIEWER role', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'VIEWER' },
      })

      const request = new NextRequest('http://localhost:3000/api/media/1', {
        method: 'PUT',
        body: JSON.stringify({ alt: 'Updated alt text' }),
      })
      const response = await PUT(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })

    it('should return 404 for non-existent media file', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'EDITOR' },
      })

      mockPrisma.media.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/media/999', {
        method: 'PUT',
        body: JSON.stringify({ alt: 'Updated alt text' }),
      })
      const response = await PUT(request, { params: { id: '999' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
    })

    it('should update media file metadata', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'EDITOR' },
      })

      mockPrisma.media.findUnique.mockResolvedValue(mockMediaFile)
      
      const updatedMediaFile = {
        ...mockMediaFile,
        alt: 'Updated alt text',
        caption: 'Updated caption',
        folder: 'products',
      }
      mockPrisma.media.update.mockResolvedValue(updatedMediaFile)

      const updateData = {
        alt: 'Updated alt text',
        caption: 'Updated caption',
        folder: 'products',
      }

      const request = new NextRequest('http://localhost:3000/api/media/1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })
      const response = await PUT(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mediaFile).toEqual(updatedMediaFile)
      expect(mockPrisma.media.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateData,
        select: expect.any(Object),
      })
    })

    it('should validate update data', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'EDITOR' },
      })

      const request = new NextRequest('http://localhost:3000/api/media/1', {
        method: 'PUT',
        body: JSON.stringify({ invalidField: 'value' }),
      })
      const response = await PUT(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('DELETE /api/media/[id]', () => {
    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/media/1', {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should deny access to VIEWER role', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'VIEWER' },
      })

      const request = new NextRequest('http://localhost:3000/api/media/1', {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })

    it('should return 404 for non-existent media file', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'EDITOR' },
      })

      mockPrisma.media.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/media/999', {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: { id: '999' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
    })

    it('should prevent deletion of media files in use', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'EDITOR' },
      })

      const mediaInUse = {
        ...mockMediaFile,
        productImages: [{ id: '1', name: 'Product 1' }], // Media is being used
      }
      mockPrisma.media.findUnique.mockResolvedValue(mediaInUse)

      const request = new NextRequest('http://localhost:3000/api/media/1', {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error.code).toBe('CONFLICT')
      expect(data.error.message).toContain('being used by products')
    })

    it('should successfully delete unused media file', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'EDITOR' },
      })

      const unusedMedia = {
        ...mockMediaFile,
        productImages: [], // Not being used
      }
      mockPrisma.media.findUnique.mockResolvedValue(unusedMedia)
      mockPrisma.media.delete.mockResolvedValue(unusedMedia)

      const request = new NextRequest('http://localhost:3000/api/media/1', {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Media file deleted successfully')
      expect(data.deletedFile).toEqual({
        id: unusedMedia.id,
        name: unusedMedia.name,
        originalName: unusedMedia.originalName,
      })
      expect(mockPrisma.media.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      })
    })
  })
})