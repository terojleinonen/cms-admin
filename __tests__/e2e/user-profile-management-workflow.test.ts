/**
 * User Profile Management E2E Tests
 * End-to-end tests for complete user profile management workflows
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { prisma } from '@/app/lib/db'
import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Import API handlers
import { GET as getUser, PUT as updateUser } from '@/app/api/users/[id]/route'
import { GET as getUserPreferences, PUT as updateUserPreferences } from '@/app/api/users/[id]/preferences/route'
import { GET as getUserSecurity, PUT as updateUserSecurity } from '@/app/api/users/[id]/security/route'
import { POST as uploadAvatar, DELETE as deleteAvatar } from '@/app/api/users/[id]/avatar/route'
import { GET as getUserSessions, POST as manageUserSessions } from '@/app/api/users/[id]/sessions/route'

// Mock NextAuth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

// Mock auth config
jest.mock('@/app/lib/auth-config', () => ({
  authOptions: {}
}))

// Mock file system operations
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    access: jest.fn(),
    unlink: jest.fn(),
  },
}))

// Mock Sharp for image processing
jest.mock('sharp', () => {
  return jest.fn(() => ({
    metadata: jest.fn().mockResolvedValue({
      width: 800,
      height: 600,
      format: 'jpeg',
      size: 1024000,
    }),
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toFile: jest.fn().mockResolvedValue(undefined),
  }))
})

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}))

describe('User Profile Management E2E Workflow', () => {
  let testUser: Record<string, unknown>
  let adminUser: Record<string, unknown>
  let userSession: Record<string, unknown>
  let adminSession: Record<string, unknown>

  beforeEach(async () => {
    // Clean up test data
    await prisma.auditLog.deleteMany()
    await prisma.session.deleteMany()
    await prisma.userPreferences.deleteMany()
    await prisma.user.deleteMany()

    // Create test users
    testUser = await prisma.user.create({
      data: {
        email: 'testuser@example.com',
        name: 'Test User',
        passwordHash: await bcrypt.hash('password123', 10),
        role: UserRole.USER,
        isActive: true,
        emailVerified: new Date(),
      },
    })

    adminUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin User',
        passwordHash: await bcrypt.hash('adminpass123', 10),
        role: UserRole.ADMIN,
        isActive: true,
        emailVerified: new Date(),
      },
    })

    // Create user preferences
    await prisma.userPreferences.create({
      data: {
        userId: testUser.id,
        theme: 'light',
        timezone: 'UTC',
        language: 'en',
        notifications: {
          email: true,
          push: false,
          security: true,
        },
        dashboard: {
          layout: 'grid',
          widgets: ['recent', 'stats'],
        },
      },
    })

    // Create sessions
    userSession = {
      user: {
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
        role: testUser.role,
      },
      expires: '2024-12-31',
    }

    adminSession = {
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
      },
      expires: '2024-12-31',
    }

    const { getServerSession } = require('next-auth/next')
    getServerSession.mockResolvedValue(userSession)
  })

  afterEach(async () => {
    await prisma.auditLog.deleteMany()
    await prisma.session.deleteMany()
    await prisma.userPreferences.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('Complete Profile Update Workflow', () => {
    it('should allow user to update complete profile information', async () => {
      // Step 1: Get current user profile
      const getUserRequest = new NextRequest(`http://localhost:3000/api/users/${testUser.id}`)
      const getUserResponse = await getUser(getUserRequest, { params: { id: testUser.id } })
      expect(getUserResponse.status).toBe(200)
      
      const userResult = await getUserResponse.json()
      expect(userResult.user.email).toBe(testUser.email)
      expect(userResult.user.name).toBe(testUser.name)

      // Step 2: Update basic profile information
      const updateData = {
        name: 'Updated Test User',
        email: 'updated@example.com',
      }

      const updateRequest = new NextRequest(`http://localhost:3000/api/users/${testUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      })

      const updateResponse = await updateUser(updateRequest, { params: { id: testUser.id } })
      expect(updateResponse.status).toBe(200)
      
      const updateResult = await updateResponse.json()
      expect(updateResult.user.name).toBe(updateData.name)
      expect(updateResult.user.email).toBe(updateData.email)

      // Step 3: Verify audit log was created
      const auditLogs = await prisma.auditLog.findMany({
        where: { userId: testUser.id, action: 'UPDATE_PROFILE' }
      })
      expect(auditLogs).toHaveLength(1)
      expect(auditLogs[0].details).toMatchObject({
        changes: expect.objectContaining({
          name: { from: 'Test User', to: 'Updated Test User' },
          email: { from: 'testuser@example.com', to: 'updated@example.com' }
        })
      })
    })

    it('should handle profile picture upload workflow', async () => {
      // Step 1: Upload profile picture
      const mockFile = new File(['mock image data'], 'profile.jpg', {
        type: 'image/jpeg',
      })
      
      const formData = new FormData()
      formData.append('file', mockFile)

      const uploadRequest = new NextRequest(`http://localhost:3000/api/users/${testUser.id}/avatar`, {
        method: 'POST',
        body: formData,
      })

      const uploadResponse = await uploadAvatar(uploadRequest, { params: { id: testUser.id } })
      expect(uploadResponse.status).toBe(200)
      
      const uploadResult = await uploadResponse.json()
      expect(uploadResult.profilePicture).toBeDefined()
      expect(uploadResult.profilePicture).toContain('/uploads/avatars/')

      // Step 2: Verify user record was updated
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      })
      expect(updatedUser?.profilePicture).toBe(uploadResult.profilePicture)

      // Step 3: Delete profile picture
      const deleteRequest = new NextRequest(`http://localhost:3000/api/users/${testUser.id}/avatar`, {
        method: 'DELETE',
      })

      const deleteResponse = await deleteAvatar(deleteRequest, { params: { id: testUser.id } })
      expect(deleteResponse.status).toBe(200)

      // Step 4: Verify user record was updated
      const userAfterDelete = await prisma.user.findUnique({
        where: { id: testUser.id }
      })
      expect(userAfterDelete?.profilePicture).toBeNull()
    })
  })

  describe('User Preferences Management Workflow', () => {
    it('should manage user preferences end-to-end', async () => {
      // Step 1: Get current preferences
      const getPrefsRequest = new NextRequest(`http://localhost:3000/api/users/${testUser.id}/preferences`)
      const getPrefsResponse = await getUserPreferences(getPrefsRequest, { params: { id: testUser.id } })
      expect(getPrefsResponse.status).toBe(200)
      
      const prefsResult = await getPrefsResponse.json()
      expect(prefsResult.preferences.theme).toBe('light')
      expect(prefsResult.preferences.timezone).toBe('UTC')

      // Step 2: Update preferences
      const newPreferences = {
        theme: 'dark',
        timezone: 'America/New_York',
        language: 'es',
        notifications: {
          email: false,
          push: true,
          security: true,
        },
        dashboard: {
          layout: 'list',
          widgets: ['recent', 'stats', 'activity'],
        },
      }

      const updatePrefsRequest = new NextRequest(`http://localhost:3000/api/users/${testUser.id}/preferences`, {
        method: 'PUT',
        body: JSON.stringify(newPreferences),
        headers: { 'Content-Type': 'application/json' },
      })

      const updatePrefsResponse = await updateUserPreferences(updatePrefsRequest, { params: { id: testUser.id } })
      expect(updatePrefsResponse.status).toBe(200)
      
      const updatePrefsResult = await updatePrefsResponse.json()
      expect(updatePrefsResult.preferences.theme).toBe('dark')
      expect(updatePrefsResult.preferences.timezone).toBe('America/New_York')
      expect(updatePrefsResult.preferences.language).toBe('es')

      // Step 3: Verify preferences were persisted
      const verifyPrefsRequest = new NextRequest(`http://localhost:3000/api/users/${testUser.id}/preferences`)
      const verifyPrefsResponse = await getUserPreferences(verifyPrefsRequest, { params: { id: testUser.id } })
      const verifyPrefsResult = await verifyPrefsResponse.json()
      
      expect(verifyPrefsResult.preferences.theme).toBe('dark')
      expect(verifyPrefsResult.preferences.notifications.push).toBe(true)
      expect(verifyPrefsResult.preferences.dashboard.widgets).toContain('activity')
    })

    it('should validate preferences data', async () => {
      const invalidPreferences = {
        theme: 'invalid-theme',
        timezone: 'invalid-timezone',
        language: 'invalid-lang-code',
      }

      const updateRequest = new NextRequest(`http://localhost:3000/api/users/${testUser.id}/preferences`, {
        method: 'PUT',
        body: JSON.stringify(invalidPreferences),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await updateUserPreferences(updateRequest, { params: { id: testUser.id } })
      expect(response.status).toBe(400)
      
      const result = await response.json()
      expect(result.error.code).toBe('VALIDATION_ERROR')
      expect(result.error.details).toBeDefined()
    })
  })

  describe('Security Settings Management Workflow', () => {
    it('should handle password change workflow', async () => {
      // Step 1: Get current security info
      const getSecurityRequest = new NextRequest(`http://localhost:3000/api/users/${testUser.id}/security`)
      const getSecurityResponse = await getUserSecurity(getSecurityRequest, { params: { id: testUser.id } })
      expect(getSecurityResponse.status).toBe(200)
      
      const securityResult = await getSecurityResponse.json()
      expect(securityResult.security.twoFactorEnabled).toBe(false)

      // Step 2: Change password
      const passwordChangeData = {
        currentPassword: 'password123',
        newPassword: 'newpassword456',
      }

      const changePasswordRequest = new NextRequest(`http://localhost:3000/api/users/${testUser.id}/security`, {
        method: 'PUT',
        body: JSON.stringify(passwordChangeData),
        headers: { 'Content-Type': 'application/json' },
      })

      const changePasswordResponse = await updateUserSecurity(changePasswordRequest, { params: { id: testUser.id } })
      expect(changePasswordResponse.status).toBe(200)

      // Step 3: Verify audit log for password change
      const auditLogs = await prisma.auditLog.findMany({
        where: { userId: testUser.id, action: 'CHANGE_PASSWORD' }
      })
      expect(auditLogs).toHaveLength(1)
    })

    it('should handle two-factor authentication setup', async () => {
      // Step 1: Enable 2FA
      const enable2FAData = {
        action: 'enable_2fa',
        totpCode: '123456', // Mock TOTP code
      }

      const enable2FARequest = new NextRequest(`http://localhost:3000/api/users/${testUser.id}/security`, {
        method: 'PUT',
        body: JSON.stringify(enable2FAData),
        headers: { 'Content-Type': 'application/json' },
      })

      const enable2FAResponse = await updateUserSecurity(enable2FARequest, { params: { id: testUser.id } })
      expect(enable2FAResponse.status).toBe(200)
      
      const enable2FAResult = await enable2FAResponse.json()
      expect(enable2FAResult.backupCodes).toBeDefined()
      expect(enable2FAResult.backupCodes).toHaveLength(10)

      // Step 2: Verify 2FA is enabled
      const verifySecurityRequest = new NextRequest(`http://localhost:3000/api/users/${testUser.id}/security`)
      const verifySecurityResponse = await getUserSecurity(verifySecurityRequest, { params: { id: testUser.id } })
      const verifySecurityResult = await verifySecurityResponse.json()
      
      expect(verifySecurityResult.security.twoFactorEnabled).toBe(true)

      // Step 3: Disable 2FA
      const disable2FAData = {
        action: 'disable_2fa',
        currentPassword: 'password123',
      }

      const disable2FARequest = new NextRequest(`http://localhost:3000/api/users/${testUser.id}/security`, {
        method: 'PUT',
        body: JSON.stringify(disable2FAData),
        headers: { 'Content-Type': 'application/json' },
      })

      const disable2FAResponse = await updateUserSecurity(disable2FARequest, { params: { id: testUser.id } })
      expect(disable2FAResponse.status).toBe(200)
    })
  })

  describe('Session Management Workflow', () => {
    it('should manage user sessions end-to-end', async () => {
      // Step 1: Create test sessions
      const session1 = await prisma.session.create({
        data: {
          userId: testUser.id,
          token: 'session-token-1',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          isActive: true,
        },
      })

      const session2 = await prisma.session.create({
        data: {
          userId: testUser.id,
          token: 'session-token-2',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          isActive: true,
        },
      })

      // Step 2: Get user sessions
      const getSessionsRequest = new NextRequest(`http://localhost:3000/api/users/${testUser.id}/sessions`)
      const getSessionsResponse = await getUserSessions(getSessionsRequest, { params: { id: testUser.id } })
      expect(getSessionsResponse.status).toBe(200)
      
      const sessionsResult = await getSessionsResponse.json()
      expect(sessionsResult.sessions).toHaveLength(2)
      expect(sessionsResult.statistics.activeSessions).toBe(2)

      // Step 3: Invalidate specific session
      const invalidateSessionData = {
        action: 'invalidate_session',
        sessionId: session1.id,
      }

      const invalidateRequest = new NextRequest(`http://localhost:3000/api/users/${testUser.id}/sessions`, {
        method: 'POST',
        body: JSON.stringify(invalidateSessionData),
        headers: { 'Content-Type': 'application/json' },
      })

      const invalidateResponse = await manageUserSessions(invalidateRequest, { params: { id: testUser.id } })
      expect(invalidateResponse.status).toBe(200)

      // Step 4: Verify session was invalidated
      const verifySessionsRequest = new NextRequest(`http://localhost:3000/api/users/${testUser.id}/sessions`)
      const verifySessionsResponse = await getUserSessions(verifySessionsRequest, { params: { id: testUser.id } })
      const verifySessionsResult = await verifySessionsResponse.json()
      
      expect(verifySessionsResult.sessions).toHaveLength(1)
      expect(verifySessionsResult.statistics.activeSessions).toBe(1)

      // Step 5: Logout from all devices
      const logoutAllData = {
        action: 'logout_all',
        currentSessionToken: 'current-session-token',
      }

      const logoutAllRequest = new NextRequest(`http://localhost:3000/api/users/${testUser.id}/sessions`, {
        method: 'POST',
        body: JSON.stringify(logoutAllData),
        headers: { 'Content-Type': 'application/json' },
      })

      const logoutAllResponse = await manageUserSessions(logoutAllRequest, { params: { id: testUser.id } })
      expect(logoutAllResponse.status).toBe(200)
      
      const logoutAllResult = await logoutAllResponse.json()
      expect(logoutAllResult.invalidatedSessions).toBe(1)
    })
  })

  describe('Admin User Management Workflow', () => {
    beforeEach(() => {
      const { getServerSession } = require('next-auth/next')
      getServerSession.mockResolvedValue(adminSession)
    })

    it('should allow admin to manage other users', async () => {
      // Step 1: Admin gets user profile
      const getUserRequest = new NextRequest(`http://localhost:3000/api/users/${testUser.id}`)
      const getUserResponse = await getUser(getUserRequest, { params: { id: testUser.id } })
      expect(getUserResponse.status).toBe(200)

      // Step 2: Admin updates user role
      const updateUserData = {
        role: UserRole.EDITOR,
        isActive: false,
      }

      const updateRequest = new NextRequest(`http://localhost:3000/api/users/${testUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateUserData),
        headers: { 'Content-Type': 'application/json' },
      })

      const updateResponse = await updateUser(updateRequest, { params: { id: testUser.id } })
      expect(updateResponse.status).toBe(200)
      
      const updateResult = await updateResponse.json()
      expect(updateResult.user.role).toBe(UserRole.EDITOR)
      expect(updateResult.user.isActive).toBe(false)

      // Step 3: Verify audit log for admin action
      const auditLogs = await prisma.auditLog.findMany({
        where: { 
          userId: testUser.id, 
          action: 'UPDATE_USER_BY_ADMIN',
          performedBy: adminUser.id
        }
      })
      expect(auditLogs).toHaveLength(1)
    })

    it('should prevent non-admin users from accessing admin functions', async () => {
      // Reset to regular user session
      const { getServerSession } = require('next-auth/next')
      getServerSession.mockResolvedValue(userSession)

      // Try to update another user's role (should fail)
      const updateData = {
        role: UserRole.ADMIN,
      }

      const updateRequest = new NextRequest(`http://localhost:3000/api/users/${adminUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      })

      const updateResponse = await updateUser(updateRequest, { params: { id: adminUser.id } })
      expect(updateResponse.status).toBe(403)
    })
  })

  describe('Data Validation and Error Handling', () => {
    it('should validate user input and return appropriate errors', async () => {
      // Test invalid email format
      const invalidEmailData = {
        email: 'invalid-email-format',
      }

      const invalidEmailRequest = new NextRequest(`http://localhost:3000/api/users/${testUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(invalidEmailData),
        headers: { 'Content-Type': 'application/json' },
      })

      const invalidEmailResponse = await updateUser(invalidEmailRequest, { params: { id: testUser.id } })
      expect(invalidEmailResponse.status).toBe(400)
      
      const invalidEmailResult = await invalidEmailResponse.json()
      expect(invalidEmailResult.error.code).toBe('VALIDATION_ERROR')

      // Test duplicate email
      const duplicateEmailData = {
        email: adminUser.email,
      }

      const duplicateEmailRequest = new NextRequest(`http://localhost:3000/api/users/${testUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(duplicateEmailData),
        headers: { 'Content-Type': 'application/json' },
      })

      const duplicateEmailResponse = await updateUser(duplicateEmailRequest, { params: { id: testUser.id } })
      expect(duplicateEmailResponse.status).toBe(400)
      
      const duplicateEmailResult = await duplicateEmailResponse.json()
      expect(duplicateEmailResult.error.code).toBe('DUPLICATE_EMAIL')
    })

    it('should handle unauthorized access attempts', async () => {
      // Mock no session
      const { getServerSession } = require('next-auth/next')
      getServerSession.mockResolvedValue(null)

      const updateRequest = new NextRequest(`http://localhost:3000/api/users/${testUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'Unauthorized Update' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await updateUser(updateRequest, { params: { id: testUser.id } })
      expect(response.status).toBe(401)
    })
  })

  describe('Audit Trail and Security Monitoring', () => {
    it('should create comprehensive audit logs for all actions', async () => {
      // Perform various actions
      await updateUser(
        new NextRequest(`http://localhost:3000/api/users/${testUser.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: 'Audit Test User' }),
          headers: { 'Content-Type': 'application/json' },
        }),
        { params: { id: testUser.id } }
      )

      await updateUserPreferences(
        new NextRequest(`http://localhost:3000/api/users/${testUser.id}/preferences`, {
          method: 'PUT',
          body: JSON.stringify({ theme: 'dark' }),
          headers: { 'Content-Type': 'application/json' },
        }),
        { params: { id: testUser.id } }
      )

      // Verify audit logs were created
      const auditLogs = await prisma.auditLog.findMany({
        where: { userId: testUser.id },
        orderBy: { createdAt: 'desc' }
      })

      expect(auditLogs.length).toBeGreaterThanOrEqual(2)
      
      const profileUpdateLog = auditLogs.find(log => log.action === 'UPDATE_PROFILE')
      const preferencesUpdateLog = auditLogs.find(log => log.action === 'UPDATE_PREFERENCES')
      
      expect(profileUpdateLog).toBeDefined()
      expect(preferencesUpdateLog).toBeDefined()
      
      expect(profileUpdateLog?.details).toMatchObject({
        changes: expect.objectContaining({
          name: expect.any(Object)
        })
      })
    })
  })
})