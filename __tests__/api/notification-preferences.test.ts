import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET, PUT } from '../../../app/api/users/[id]/notification-preferences/route'
import { prisma } from '@/app/lib/prisma'

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

const { getServerSession } = require('next-auth')

describe('/api/users/[id]/notification-preferences', () => {
  let testUserId: string
  let otherUserId: string

  beforeEach(async () => {
    // Create test users
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
        role: 'EDITOR'
      }
    })
    testUserId = testUser.id

    const otherUser = await prisma.user.create({
      data: {
        email: 'other@example.com',
        passwordHash: 'hashed-password',
        name: 'Other User',
        role: 'EDITOR'
      }
    })
    otherUserId = otherUser.id

    // Create user preferences
    await prisma.userPreferences.create({
      data: {
        userId: testUserId,
        notifications: {
          email: true,
          security: true,
          marketing: false,
          accountUpdates: true,
          adminMessages: true
        }
      }
    })

    await prisma.userPreferences.create({
      data: {
        userId: otherUserId,
        notifications: {
          email: false,
          security: true,
          marketing: true,
          accountUpdates: false,
          adminMessages: false
        }
      }
    })
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.userPreferences.deleteMany({ 
      where: { userId: { in: [testUserId, otherUserId] } }
    })
    await prisma.user.deleteMany({ 
      where: { id: { in: [testUserId, otherUserId] } }
    })
    jest.clearAllMocks()
  })

  describe('GET /api/users/[id]/notification-preferences', () => {
    it('should return user notification preferences', async () => {
      getServerSession.mockResolvedValue({
        user: { id: testUserId, role: 'EDITOR' }
      })

      const request = new NextRequest(`http://localhost/api/users/${testUserId}/notification-preferences`)
      const response = await GET(request, { params: { id: testUserId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.preferences).toEqual({
        email: true,
        security: true,
        marketing: false,
        accountUpdates: true,
        adminMessages: true
      })
    })

    it('should allow admin to access any user preferences', async () => {
      getServerSession.mockResolvedValue({
        user: { id: otherUserId, role: 'ADMIN' }
      })

      const request = new NextRequest(`http://localhost/api/users/${testUserId}/notification-preferences`)
      const response = await GET(request, { params: { id: testUserId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.preferences).toBeDefined()
    })

    it('should return 403 for unauthorized access', async () => {
      getServerSession.mockResolvedValue({
        user: { id: otherUserId, role: 'EDITOR' }
      })

      const request = new NextRequest(`http://localhost/api/users/${testUserId}/notification-preferences`)
      const response = await GET(request, { params: { id: testUserId } })

      expect(response.status).toBe(403)
    })

    it('should return 401 for unauthenticated requests', async () => {
      getServerSession.mockResolvedValue(null)

      const request = new NextRequest(`http://localhost/api/users/${testUserId}/notification-preferences`)
      const response = await GET(request, { params: { id: testUserId } })

      expect(response.status).toBe(401)
    })

    it('should return 404 for non-existent user preferences', async () => {
      const nonExistentUserId = 'non-existent-id'
      getServerSession.mockResolvedValue({
        user: { id: nonExistentUserId, role: 'EDITOR' }
      })

      const request = new NextRequest(`http://localhost/api/users/${nonExistentUserId}/notification-preferences`)
      const response = await GET(request, { params: { id: nonExistentUserId } })

      expect(response.status).toBe(404)
    })
  })

  describe('PUT /api/users/[id]/notification-preferences', () => {
    it('should update user notification preferences', async () => {
      getServerSession.mockResolvedValue({
        user: { id: testUserId, role: 'EDITOR' }
      })

      const newPreferences = {
        email: false,
        security: true,
        marketing: true,
        accountUpdates: false,
        adminMessages: true
      }

      const request = new NextRequest(`http://localhost/api/users/${testUserId}/notification-preferences`, {
        method: 'PUT',
        body: JSON.stringify(newPreferences)
      })
      const response = await PUT(request, { params: { id: testUserId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.preferences).toEqual(newPreferences)
      expect(data.message).toBe('Notification preferences updated successfully')

      // Verify preferences were updated in database
      const updatedPreferences = await prisma.userPreferences.findUnique({
        where: { userId: testUserId },
        select: { notifications: true }
      })
      expect(updatedPreferences?.notifications).toEqual(newPreferences)
    })

    it('should allow admin to update any user preferences', async () => {
      getServerSession.mockResolvedValue({
        user: { id: otherUserId, role: 'ADMIN' }
      })

      const newPreferences = {
        email: true,
        security: true,
        marketing: false,
        accountUpdates: true,
        adminMessages: false
      }

      const request = new NextRequest(`http://localhost/api/users/${testUserId}/notification-preferences`, {
        method: 'PUT',
        body: JSON.stringify(newPreferences)
      })
      const response = await PUT(request, { params: { id: testUserId } })

      expect(response.status).toBe(200)
    })

    it('should return 403 for unauthorized access', async () => {
      getServerSession.mockResolvedValue({
        user: { id: otherUserId, role: 'EDITOR' }
      })

      const newPreferences = {
        email: false,
        security: true,
        marketing: true,
        accountUpdates: false,
        adminMessages: true
      }

      const request = new NextRequest(`http://localhost/api/users/${testUserId}/notification-preferences`, {
        method: 'PUT',
        body: JSON.stringify(newPreferences)
      })
      const response = await PUT(request, { params: { id: testUserId } })

      expect(response.status).toBe(403)
    })

    it('should return 400 for invalid data', async () => {
      getServerSession.mockResolvedValue({
        user: { id: testUserId, role: 'EDITOR' }
      })

      const invalidPreferences = {
        email: 'invalid', // Should be boolean
        security: true,
        marketing: true,
        accountUpdates: false,
        adminMessages: true
      }

      const request = new NextRequest(`http://localhost/api/users/${testUserId}/notification-preferences`, {
        method: 'PUT',
        body: JSON.stringify(invalidPreferences)
      })
      const response = await PUT(request, { params: { id: testUserId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid data')
      expect(data.details).toBeDefined()
    })

    it('should return 401 for unauthenticated requests', async () => {
      getServerSession.mockResolvedValue(null)

      const newPreferences = {
        email: false,
        security: true,
        marketing: true,
        accountUpdates: false,
        adminMessages: true
      }

      const request = new NextRequest(`http://localhost/api/users/${testUserId}/notification-preferences`, {
        method: 'PUT',
        body: JSON.stringify(newPreferences)
      })
      const response = await PUT(request, { params: { id: testUserId } })

      expect(response.status).toBe(401)
    })
  })
})