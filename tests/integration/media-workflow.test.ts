/**
 * Media Management Workflow Integration Tests
 * Tests the complete media upload, processing, and management workflow
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { UserRole } from '@prisma/client'
import { POST as uploadMedia, GET as getMediaList } from '../../app/api/media/route'
import { GET as getMedia, PUT as updateMedia, DELETE as deleteMedia } from '../../app/api/media/[id]/route'
import { prisma } from '../../app/lib/db'
import { initTestDatabase, cleanupTestDatabase } from '../setup'
import fs from 'fs'
import path from 'path'

// Mock next-auth
jest.mock('next-auth')
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

// Mock file system operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
}))

// Mock Sharp for image processing
jest.mock('sharp', () => {
  return jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed-image-data')),
    metadata: jest.fn().mockResolvedValue({
      width: 1920,
      height: 1080,
      format: 'jpeg',
      size: 245760
    })
  }))
})

describe('Media Workflow Integration', () => {
  let testUserId: string

  beforeAll(async () => {
    await initTestDatabase()
    
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        name: 'Test Editor',
        email: 'editor@integration-test.com',
        role: UserRole.EDITOR,
        isActive: true,
        passwordHash: 'hashed_password'
      }
    })
    testUserId = testUser.id

    // Mock editor session for all tests
    mockGetServerSession.mockResolvedValue({
      user: { 
        id: testUserId, 
        role: UserRole.EDITOR, 
        name: 'Test Editor', 
        email: 'editor@integration-test.com' 
      }
    } as any)
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    // Clean up test media files
    await prisma.media.deleteMany({
      where: {
        filename: {
          contains: 'integration-test'
        }
      }
    })
  })

  it('should complete full media upload and processing workflow', async () => {
    // Create mock file data
    const mockImageBuffer = Buffer.from('fake-image-data')
    const mockFile = new File([mockImageBuffer], 'integration-test-image.jpg', {
      type: 'image/jpeg'
    })

    // Create FormData
    const formData = new FormData()
    formData.append('file', mockFile)
    formData.append('folder', 'test-uploads')
    formData.append('altText', 'Integration test image')

    // Step 1: Upload media file
    const uploadRequest = new NextRequest('http://localhost/api/media', {
      method: 'POST',
      body: formData
    })

    const uploadResponse = await uploadMedia(uploadRequest)
    const uploadData = await uploadResponse.json()

    expect(uploadResponse.status).toBe(201)
    expect(uploadData.media.filename).toBe('integration-test-image.jpg')
    expect(uploadData.media.mimeType).toBe('image/jpeg')
    expect(uploadData.media.altText).toBe('Integration test image')
    expect(uploadData.media.folder).toBe('test-uploads')
    expect(uploadData.media.thumbnails).toBeDefined()
    expect(uploadData.media.thumbnails.small).toBeDefined()
    expect(uploadData.media.thumbnails.medium).toBeDefined()
    expect(uploadData.media.thumbnails.large).toBeDefined()

    const mediaId = uploadData.media.id

    // Step 2: Verify media appears in media list
    const listRequest = new NextRequest('http://localhost/api/media')
    const listResponse = await getMediaList(listRequest)
    const listData = await listResponse.json()

    expect(listResponse.status).toBe(200)
    const uploadedMedia = listData.media.find((m: any) => m.id === mediaId)
    expect(uploadedMedia).toBeTruthy()
    expect(uploadedMedia.filename).toBe('integration-test-image.jpg')

    // Step 3: Get individual media item
    const getRequest = new NextRequest(`http://localhost/api/media/${mediaId}`)
    const getResponse = await getMedia(getRequest, { params: { id: mediaId } })
    const getData = await getResponse.json()

    expect(getResponse.status).toBe(200)
    expect(getData.media.id).toBe(mediaId)
    expect(getData.media.filename).toBe('integration-test-image.jpg')
    expect(getData.media.width).toBe(1920)
    expect(getData.media.height).toBe(1080)

    // Step 4: Update media metadata
    const updateData = {
      altText: 'Updated integration test image',
      title: 'Integration Test Image',
      description: 'An image used for integration testing'
    }

    const updateRequest = new NextRequest(`http://localhost/api/media/${mediaId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    })

    const updateResponse = await updateMedia(updateRequest, { params: { id: mediaId } })
    const updatedData = await updateResponse.json()

    expect(updateResponse.status).toBe(200)
    expect(updatedData.media.altText).toBe(updateData.altText)
    expect(updatedData.media.title).toBe(updateData.title)
    expect(updatedData.media.description).toBe(updateData.description)

    // Step 5: Verify update in database
    const dbMedia = await prisma.media.findUnique({
      where: { id: mediaId }
    })

    expect(dbMedia?.altText).toBe(updateData.altText)
    expect(dbMedia?.title).toBe(updateData.title)
    expect(dbMedia?.description).toBe(updateData.description)

    // Step 6: Delete the media
    const deleteRequest = new NextRequest(`http://localhost/api/media/${mediaId}`)
    const deleteResponse = await deleteMedia(deleteRequest, { params: { id: mediaId } })

    expect(deleteResponse.status).toBe(200)

    // Step 7: Verify media is deleted
    const verifyDeleteRequest = new NextRequest(`http://localhost/api/media/${mediaId}`)
    const verifyDeleteResponse = await getMedia(verifyDeleteRequest, { params: { id: mediaId } })

    expect(verifyDeleteResponse.status).toBe(404)
  })

  it('should handle different file types and validation', async () => {
    // Test valid image file
    const validImageBuffer = Buffer.from('valid-image-data')
    const validImageFile = new File([validImageBuffer], 'integration-test-valid.png', {
      type: 'image/png'
    })

    const validFormData = new FormData()
    validFormData.append('file', validImageFile)

    const validRequest = new NextRequest('http://localhost/api/media', {
      method: 'POST',
      body: validFormData
    })

    const validResponse = await uploadMedia(validRequest)
    expect(validResponse.status).toBe(201)

    // Test invalid file type
    const invalidFileBuffer = Buffer.from('invalid-file-data')
    const invalidFile = new File([invalidFileBuffer], 'integration-test-invalid.exe', {
      type: 'application/x-msdownload'
    })

    const invalidFormData = new FormData()
    invalidFormData.append('file', invalidFile)

    const invalidRequest = new NextRequest('http://localhost/api/media', {
      method: 'POST',
      body: invalidFormData
    })

    const invalidResponse = await uploadMedia(invalidRequest)
    const invalidData = await invalidResponse.json()

    expect(invalidResponse.status).toBe(400)
    expect(invalidData.error.code).toBe('INVALID_FILE_TYPE')

    // Test file size limit (mock large file)
    const largeFileBuffer = Buffer.alloc(11 * 1024 * 1024) // 11MB
    const largeFile = new File([largeFileBuffer], 'integration-test-large.jpg', {
      type: 'image/jpeg'
    })

    const largeFormData = new FormData()
    largeFormData.append('file', largeFile)

    const largeRequest = new NextRequest('http://localhost/api/media', {
      method: 'POST',
      body: largeFormData
    })

    const largeResponse = await uploadMedia(largeRequest)
    const largeData = await largeResponse.json()

    expect(largeResponse.status).toBe(400)
    expect(largeData.error.code).toBe('FILE_TOO_LARGE')
  })

  it('should handle media search and filtering', async () => {
    // Upload multiple test files
    const testFiles = [
      {
        filename: 'integration-test-chair.jpg',
        folder: 'products',
        altText: 'Office chair image'
      },
      {
        filename: 'integration-test-desk.png',
        folder: 'products',
        altText: 'Standing desk image'
      },
      {
        filename: 'integration-test-logo.svg',
        folder: 'branding',
        altText: 'Company logo'
      }
    ]

    const uploadedIds: string[] = []

    for (const fileData of testFiles) {
      const mockBuffer = Buffer.from('mock-file-data')
      const mockFile = new File([mockBuffer], fileData.filename, {
        type: fileData.filename.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg'
      })

      const formData = new FormData()
      formData.append('file', mockFile)
      formData.append('folder', fileData.folder)
      formData.append('altText', fileData.altText)

      const request = new NextRequest('http://localhost/api/media', {
        method: 'POST',
        body: formData
      })

      const response = await uploadMedia(request)
      const data = await response.json()
      uploadedIds.push(data.media.id)
    }

    // Test search by filename
    const searchRequest = new NextRequest('http://localhost/api/media?search=chair')
    const searchResponse = await getMediaList(searchRequest)
    const searchData = await searchResponse.json()

    expect(searchResponse.status).toBe(200)
    expect(searchData.media).toHaveLength(1)
    expect(searchData.media[0].filename).toContain('chair')

    // Test filter by folder
    const folderRequest = new NextRequest('http://localhost/api/media?folder=products')
    const folderResponse = await getMediaList(folderRequest)
    const folderData = await folderResponse.json()

    expect(folderResponse.status).toBe(200)
    expect(folderData.media).toHaveLength(2)
    folderData.media.forEach((media: any) => {
      expect(media.folder).toBe('products')
    })

    // Test filter by file type
    const typeRequest = new NextRequest('http://localhost/api/media?type=image')
    const typeResponse = await getMediaList(typeRequest)
    const typeData = await typeResponse.json()

    expect(typeResponse.status).toBe(200)
    expect(typeData.media.length).toBeGreaterThanOrEqual(3)
    typeData.media.forEach((media: any) => {
      expect(media.mimeType).toMatch(/^image\//)
    })
  })

  it('should handle media organization and bulk operations', async () => {
    // Upload test files
    const testFiles = ['test1.jpg', 'test2.jpg', 'test3.jpg']
    const uploadedIds: string[] = []

    for (const filename of testFiles) {
      const mockBuffer = Buffer.from('mock-file-data')
      const mockFile = new File([mockBuffer], `integration-${filename}`, {
        type: 'image/jpeg'
      })

      const formData = new FormData()
      formData.append('file', mockFile)
      formData.append('folder', 'bulk-test')

      const request = new NextRequest('http://localhost/api/media', {
        method: 'POST',
        body: formData
      })

      const response = await uploadMedia(request)
      const data = await response.json()
      uploadedIds.push(data.media.id)
    }

    // Test bulk folder move (would require bulk update endpoint)
    // For now, test individual updates
    for (const mediaId of uploadedIds) {
      const updateRequest = new NextRequest(`http://localhost/api/media/${mediaId}`, {
        method: 'PUT',
        body: JSON.stringify({
          folder: 'moved-folder'
        })
      })

      const updateResponse = await updateMedia(updateRequest, { params: { id: mediaId } })
      expect(updateResponse.status).toBe(200)
    }

    // Verify all files moved to new folder
    const folderRequest = new NextRequest('http://localhost/api/media?folder=moved-folder')
    const folderResponse = await getMediaList(folderRequest)
    const folderData = await folderResponse.json()

    expect(folderResponse.status).toBe(200)
    expect(folderData.media).toHaveLength(3)
    folderData.media.forEach((media: any) => {
      expect(media.folder).toBe('moved-folder')
    })
  })
})