/**
 * User Avatar API Tests
 * Tests for the profile picture upload and management endpoints
 */

import { NextRequest } from 'next/server'
import { GET, POST, DELETE } from '@/api/users/[id]/avatar/route'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { UserRole } from '@prisma/client'

// Mock dependencies
jest.mock('next-auth')
jest.mock('../../app/lib/db')
jest.mock('../../app/lib/audit-service')
jest.mock('../../app/lib/profile-image-utils')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/users/[id]/avatar', () => {
  const mockUserId = 'user-123'
  
  const mockUser = {
    id: mockUserId,
    name: 'Test User',
    profilePicture: '/uploads/profiles/user-123/profile-medium.webp'
  }

  const mockUserWithoutAvatar = {
    id: mockUserId,
    name: 'Test User',
    profilePicture: null
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/users/[id]/avatar', () => {
    it('should return avatar information when user has profile picture', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      // Mock profile picture service
      const { profilePictureService } = require('@/lib/profile-image-utils')
      profilePictureService.hasProfilePicture.mockResolvedValue(true)
      profilePictureService.getProfilePictureUrl.mockReturnValue('/uploads/profiles/user-123/profile-medium.webp')

      const request = new NextRequest('http://localhost/api/users/user-123/avatar')
      const params = Promise.resolve({ id: mockUserId })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.hasAvatar).toBe(true)
      expect(data.profilePicture).toMatchObject({
        url: '/uploads/profiles/user-123/profile-medium.webp',
        variants: expect.any(Array)
      })
    })

    it('should return default avatar information when user has no profile picture', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithoutAvatar as any)

      // Mock profile picture service
      const { profilePictureService } = require('@/lib/profile-image-utils')
      profilePictureService.hasProfilePicture.mockResolvedValue(false)
      profilePictureService.getDefaultAvatarUrl.mockReturnValue('/images/default-avatar.svg')
      profilePictureService.generateInitials.mockReturnValue('TU')
      profilePictureService.generateAvatarColor.mockReturnValue('#F87171')

      const request = new NextRequest('http://localhost/api/users/user-123/avatar')
      const params = Promise.resolve({ id: mockUserId })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.hasAvatar).toBe(false)
      expect(data.defaultAvatar).toMatchObject({
        url: '/images/default-avatar.svg',
        initials: 'TU',
        backgroundColor: '#F87171'
      })
    })

    it('should return 404 for non-existent user', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/users/nonexistent/avatar')
      const params = Promise.resolve({ id: 'nonexistent' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
    })
  })

  describe('POST /api/users/[id]/avatar', () => {
    it('should upload profile picture successfully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithoutAvatar as any)
      mockPrisma.user.update.mockResolvedValue({
        ...mockUserWithoutAvatar,
        profilePicture: '/uploads/profiles/user-123/profile-medium.webp'
      } as any)

      // Mock profile picture service
      const { profilePictureService, fileToBuffer } = require('@/lib/profile-image-utils')
      profilePictureService.validateFile.mockReturnValue({
        isValid: true,
        errors: []
      })
      profilePictureService.processProfilePicture.mockResolvedValue({
        variants: [
          {
            size: 'medium',
            url: '/uploads/profiles/user-123/profile-medium.webp',
            width: 256,
            height: 256
          }
        ],
        metadata: {
          originalSize: 1024000,
          processedSize: 512000,
          compressionRatio: 50,
          format: 'webp'
        }
      })
      profilePictureService.getProfilePictureUrl.mockReturnValue('/uploads/profiles/user-123/profile-medium.webp')
      fileToBuffer.mockResolvedValue(Buffer.from('fake-image-data'))

      // Create mock file
      const mockFile = new File(['fake-image-data'], 'test.jpg', { type: 'image/jpeg' })
      const formData = new FormData()
      formData.append('file', mockFile)

      const request = new NextRequest('http://localhost/api/users/user-123/avatar', {
        method: 'POST',
        body: formData
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Profile picture uploaded successfully')
      expect(data.profilePicture).toMatchObject({
        url: '/uploads/profiles/user-123/profile-medium.webp',
        variants: expect.any(Array),
        metadata: expect.objectContaining({
          compressionRatio: '50%',
          format: 'webp'
        })
      })
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { profilePicture: '/uploads/profiles/user-123/profile-medium.webp' }
      })
    })

    it('should replace existing profile picture', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.user.update.mockResolvedValue(mockUser as any)

      // Mock profile picture service
      const { profilePictureService, fileToBuffer } = require('@/lib/profile-image-utils')
      profilePictureService.validateFile.mockReturnValue({
        isValid: true,
        errors: []
      })
      profilePictureService.deleteProfilePicture.mockResolvedValue(undefined)
      profilePictureService.processProfilePicture.mockResolvedValue({
        variants: [],
        metadata: {
          originalSize: 1024000,
          processedSize: 512000,
          compressionRatio: 50,
          format: 'webp'
        }
      })
      profilePictureService.getProfilePictureUrl.mockReturnValue('/uploads/profiles/user-123/profile-medium.webp')
      fileToBuffer.mockResolvedValue(Buffer.from('fake-image-data'))

      const mockFile = new File(['fake-image-data'], 'test.jpg', { type: 'image/jpeg' })
      const formData = new FormData()
      formData.append('file', mockFile)

      const request = new NextRequest('http://localhost/api/users/user-123/avatar', {
        method: 'POST',
        body: formData
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await POST(request, { params })

      expect(response.status).toBe(200)
      expect(profilePictureService.deleteProfilePicture).toHaveBeenCalledWith(mockUserId)
    })

    it('should return error for missing file', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const formData = new FormData()
      // No file added

      const request = new NextRequest('http://localhost/api/users/user-123/avatar', {
        method: 'POST',
        body: formData
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('NO_FILE')
    })

    it('should return error for invalid file', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      // Mock profile picture service
      const { profilePictureService } = require('@/lib/profile-image-utils')
      profilePictureService.validateFile.mockReturnValue({
        isValid: false,
        errors: ['File size too large', 'Invalid file type']
      })

      const mockFile = new File(['fake-image-data'], 'test.txt', { type: 'text/plain' })
      const formData = new FormData()
      formData.append('file', mockFile)

      const request = new NextRequest('http://localhost/api/users/user-123/avatar', {
        method: 'POST',
        body: formData
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('INVALID_FILE')
      expect(data.error.details).toEqual(['File size too large', 'Invalid file type'])
    })
  })

  describe('DELETE /api/users/[id]/avatar', () => {
    it('should remove profile picture successfully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        profilePicture: null
      } as any)

      // Mock profile picture service
      const { profilePictureService } = require('@/lib/profile-image-utils')
      profilePictureService.deleteProfilePicture.mockResolvedValue(undefined)
      profilePictureService.getDefaultAvatarUrl.mockReturnValue('/images/default-avatar.svg')
      profilePictureService.generateInitials.mockReturnValue('TU')
      profilePictureService.generateAvatarColor.mockReturnValue('#F87171')

      const request = new NextRequest('http://localhost/api/users/user-123/avatar', {
        method: 'DELETE'
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Profile picture removed successfully')
      expect(data.defaultAvatar).toMatchObject({
        url: '/images/default-avatar.svg',
        initials: 'TU',
        backgroundColor: '#F87171'
      })
      expect(profilePictureService.deleteProfilePicture).toHaveBeenCalledWith(mockUserId)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { profilePicture: null }
      })
    })

    it('should return error when user has no profile picture', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithoutAvatar as any)

      const request = new NextRequest('http://localhost/api/users/user-123/avatar', {
        method: 'DELETE'
      })
      const params = Promise.resolve({ id: mockUserId })

      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('NO_AVATAR')
    })

    it('should return 404 for non-existent user', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId, role: UserRole.EDITOR }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/users/nonexistent/avatar', {
        method: 'DELETE'
      })
      const params = Promise.resolve({ id: 'nonexistent' })

      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for all operations', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/users/user-123/avatar')
      const params = Promise.resolve({ id: mockUserId })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should deny access to other users avatar for non-admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'other-user', role: UserRole.EDITOR }
      } as any)

      const request = new NextRequest('http://localhost/api/users/user-123/avatar')
      const params = Promise.resolve({ id: mockUserId })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })

    it('should allow admin to access any user avatar', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-456', role: UserRole.ADMIN }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      const { profilePictureService } = require('@/lib/profile-image-utils')
      profilePictureService.hasProfilePicture.mockResolvedValue(true)
      profilePictureService.getProfilePictureUrl.mockReturnValue('/uploads/profiles/user-123/profile-medium.webp')

      const request = new NextRequest('http://localhost/api/users/user-123/avatar')
      const params = Promise.resolve({ id: mockUserId })

      const response = await GET(request, { params })

      expect(response.status).toBe(200)
    })
  })
})