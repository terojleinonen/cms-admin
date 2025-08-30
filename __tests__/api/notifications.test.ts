import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET, PUT } from '../../app/api/notifications/route'
import { PUT as PUT_ID, DELETE } from '../../app/api/notifications/[id]/route'
import { NotificationType } from '@prisma/client'
import { prisma } from '@/app/lib/prisma'

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

const { getServerSession } = require('next-auth')

describe('/api/notifications', () => {
  let testUserId: string
  let testNotificationId: string

  beforeEach(async () => {
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
        role: 'EDITOR'
      }
    })
    testUserId = testUser.id

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

    // Create test notification
    const notification = await prisma.notification.create({
      data: {
        userId: testUserId,
        type: NotificationType.PROFILE_UPDATED,
        title: 'Test Notification',
        message: 'This is a test notification'
      }
    })
    testNotificationId = notification.id

    // Mock authenticated session
    getServerSession.mockResolvedValue({
      user: { id: testUserId, role: 'EDITOR' }
    })
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.notification.deleteMany({ where: { userId: testUserId } })
    await prisma.userPreferences.deleteMany({ where: { userId: testUserId } })
    await prisma.user.deleteMany({ where: { id: testUserId } })
    jest.clearAllMocks()
  })

  describe('GET /api/notifications', () => {
    it('should return user notifications', async () => {
      const request = new NextRequest('http://localhost/api/notifications')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.notifications).toHaveLength(1)
      expect(data.notifications[0].title).toBe('Test Notification')
      expect(data.unreadCount).toBe(1)
    })

    it('should handle pagination parameters', async () => {
      // Create additional notifications
      await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          prisma.notification.create({
            data: {
              userId: testUserId,
              type: NotificationType.PROFILE_UPDATED,
              title: `Notification ${i + 2}`,
              message: `Message ${i + 2}`
            }
          })
        )
      )

      const request = new NextRequest('http://localhost/api/notifications?limit=3&offset=2')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.notifications).toHaveLength(3)
      expect(data.hasMore).toBe(true)
    })

    it('should return 401 for unauthenticated requests', async () => {
      getServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/notifications')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })

  describe('PUT /api/notifications', () => {
    it('should mark all notifications as read', async () => {
      // Create additional unread notifications
      await Promise.all(
        Array.from({ length: 3 }, (_, i) =>
          prisma.notification.create({
            data: {
              userId: testUserId,
              type: NotificationType.PROFILE_UPDATED,
              title: `Notification ${i + 2}`,
              message: `Message ${i + 2}`
            }
          })
        )
      )

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'PUT',
        body: JSON.stringify({ action: 'markAllAsRead' })
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify all notifications are marked as read
      const notifications = await prisma.notification.findMany({
        where: { userId: testUserId, read: false }
      })
      expect(notifications).toHaveLength(0)
    })

    it('should return 400 for invalid action', async () => {
      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'PUT',
        body: JSON.stringify({ action: 'invalidAction' })
      })
      const response = await PUT(request)

      expect(response.status).toBe(400)
    })
  })

  describe('PUT /api/notifications/[id]', () => {
    it('should mark specific notification as read', async () => {
      const request = new NextRequest(`http://localhost/api/notifications/${testNotificationId}`, {
        method: 'PUT',
        body: JSON.stringify({ action: 'markAsRead' })
      })
      const response = await PUT_ID(request, { params: { id: testNotificationId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify notification is marked as read
      const notification = await prisma.notification.findUnique({
        where: { id: testNotificationId }
      })
      expect(notification?.read).toBe(true)
      expect(notification?.readAt).toBeTruthy()
    })

    it('should return 400 for invalid action', async () => {
      const request = new NextRequest(`http://localhost/api/notifications/${testNotificationId}`, {
        method: 'PUT',
        body: JSON.stringify({ action: 'invalidAction' })
      })
      const response = await PUT_ID(request, { params: { id: testNotificationId } })

      expect(response.status).toBe(400)
    })
  })

  describe('DELETE /api/notifications/[id]', () => {
    it('should delete specific notification', async () => {
      const request = new NextRequest(`http://localhost/api/notifications/${testNotificationId}`, {
        method: 'DELETE'
      })
      const response = await DELETE(request, { params: { id: testNotificationId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify notification is deleted
      const notification = await prisma.notification.findUnique({
        where: { id: testNotificationId }
      })
      expect(notification).toBeNull()
    })

    it('should return 401 for unauthenticated requests', async () => {
      getServerSession.mockResolvedValue(null)

      const request = new NextRequest(`http://localhost/api/notifications/${testNotificationId}`, {
        method: 'DELETE'
      })
      const response = await DELETE(request, { params: { id: testNotificationId } })

      expect(response.status).toBe(401)
    })
  })
})