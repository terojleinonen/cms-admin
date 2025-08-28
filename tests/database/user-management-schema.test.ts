/**
 * Test suite for enhanced user management database schema
 * Tests the new User model fields and related models (UserPreferences, AuditLog, Session)
 */

import { PrismaClient } from '@prisma/client'
import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from '@jest/globals'

const prisma = new PrismaClient()

describe('Enhanced User Management Schema', () => {
  let testUserId: string

  beforeAll(async () => {
    // Ensure database connection
    await prisma.$connect()
  })

  afterAll(async () => {
    // Clean up and disconnect
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Create a test user with enhanced fields
    const testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        passwordHash: 'hashed_password',
        name: 'Test User',
        role: 'EDITOR',
        profilePicture: '/uploads/profile/test-avatar.jpg',
        twoFactorEnabled: false,
        emailVerified: new Date(),
        lastLoginAt: new Date(),
      },
    })
    testUserId = testUser.id
  })

  afterEach(async () => {
    // Clean up test data
    if (testUserId) {
      await prisma.session.deleteMany({ where: { userId: testUserId } })
      await prisma.auditLog.deleteMany({ where: { userId: testUserId } })
      await prisma.userPreferences.deleteMany({ where: { userId: testUserId } })
      await prisma.user.delete({ where: { id: testUserId } })
    }
  })

  describe('Enhanced User Model', () => {
    it('should create user with new profile fields', async () => {
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
      })

      expect(user).toBeTruthy()
      expect(user?.profilePicture).toBe('/uploads/profile/test-avatar.jpg')
      expect(user?.twoFactorEnabled).toBe(false)
      expect(user?.emailVerified).toBeInstanceOf(Date)
      expect(user?.lastLoginAt).toBeInstanceOf(Date)
    })

    it('should update user profile picture', async () => {
      const newProfilePicture = '/uploads/profile/updated-avatar.jpg'
      
      await prisma.user.update({
        where: { id: testUserId },
        data: { profilePicture: newProfilePicture },
      })

      const updatedUser = await prisma.user.findUnique({
        where: { id: testUserId },
      })

      expect(updatedUser?.profilePicture).toBe(newProfilePicture)
    })

    it('should enable two-factor authentication', async () => {
      await prisma.user.update({
        where: { id: testUserId },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: 'encrypted_secret_key',
        },
      })

      const updatedUser = await prisma.user.findUnique({
        where: { id: testUserId },
      })

      expect(updatedUser?.twoFactorEnabled).toBe(true)
      expect(updatedUser?.twoFactorSecret).toBe('encrypted_secret_key')
    })
  })

  describe('UserPreferences Model', () => {
    it('should create user preferences with default values', async () => {
      const preferences = await prisma.userPreferences.create({
        data: {
          userId: testUserId,
          theme: 'DARK',
          timezone: 'America/New_York',
          language: 'en',
        },
      })

      expect(preferences.theme).toBe('DARK')
      expect(preferences.timezone).toBe('America/New_York')
      expect(preferences.language).toBe('en')
      expect(preferences.notifications).toEqual({
        email: true,
        push: true,
        security: true,
        marketing: false,
      })
      expect(preferences.dashboard).toEqual({
        layout: 'default',
        widgets: [],
        defaultView: 'dashboard',
      })
    })

    it('should update user preferences', async () => {
      // Create initial preferences
      await prisma.userPreferences.create({
        data: {
          userId: testUserId,
          theme: 'LIGHT',
        },
      })

      // Update preferences
      const updatedPreferences = await prisma.userPreferences.update({
        where: { userId: testUserId },
        data: {
          theme: 'DARK',
          notifications: {
            email: false,
            push: true,
            security: true,
            marketing: true,
          },
        },
      })

      expect(updatedPreferences.theme).toBe('DARK')
      expect(updatedPreferences.notifications).toEqual({
        email: false,
        push: true,
        security: true,
        marketing: true,
      })
    })

    it('should cascade delete preferences when user is deleted', async () => {
      // Create preferences
      await prisma.userPreferences.create({
        data: {
          userId: testUserId,
          theme: 'SYSTEM',
        },
      })

      // Verify preferences exist
      const preferences = await prisma.userPreferences.findUnique({
        where: { userId: testUserId },
      })
      expect(preferences).toBeTruthy()

      // Delete user (this should cascade delete preferences)
      await prisma.user.delete({ where: { id: testUserId } })

      // Verify preferences are deleted
      const deletedPreferences = await prisma.userPreferences.findUnique({
        where: { userId: testUserId },
      })
      expect(deletedPreferences).toBeNull()

      // Reset testUserId to prevent cleanup issues
      testUserId = ''
    })
  })

  describe('AuditLog Model', () => {
    it('should create audit log entry', async () => {
      const auditLog = await prisma.auditLog.create({
        data: {
          userId: testUserId,
          action: 'USER_LOGIN',
          resource: 'authentication',
          details: {
            method: 'password',
            success: true,
          },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 Test Browser',
        },
      })

      expect(auditLog.action).toBe('USER_LOGIN')
      expect(auditLog.resource).toBe('authentication')
      expect(auditLog.details).toEqual({
        method: 'password',
        success: true,
      })
      expect(auditLog.ipAddress).toBe('192.168.1.1')
      expect(auditLog.userAgent).toBe('Mozilla/5.0 Test Browser')
    })

    it('should query audit logs by user', async () => {
      // Create multiple audit log entries
      await prisma.auditLog.createMany({
        data: [
          {
            userId: testUserId,
            action: 'USER_LOGIN',
            resource: 'authentication',
            ipAddress: '192.168.1.1',
          },
          {
            userId: testUserId,
            action: 'PROFILE_UPDATE',
            resource: 'user_profile',
            ipAddress: '192.168.1.1',
          },
        ],
      })

      const auditLogs = await prisma.auditLog.findMany({
        where: { userId: testUserId },
        orderBy: { createdAt: 'desc' },
      })

      expect(auditLogs).toHaveLength(2)
      // Check that both actions are present (order may vary)
      const actions = auditLogs.map(log => log.action)
      expect(actions).toContain('PROFILE_UPDATE')
      expect(actions).toContain('USER_LOGIN')
    })

    it('should query audit logs by action', async () => {
      await prisma.auditLog.create({
        data: {
          userId: testUserId,
          action: 'PASSWORD_CHANGE',
          resource: 'user_security',
        },
      })

      const passwordChangeLogs = await prisma.auditLog.findMany({
        where: { action: 'PASSWORD_CHANGE' },
      })

      expect(passwordChangeLogs.length).toBeGreaterThan(0)
      expect(passwordChangeLogs[0].action).toBe('PASSWORD_CHANGE')
    })
  })

  describe('Session Model', () => {
    it('should create user session', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      
      const session = await prisma.session.create({
        data: {
          userId: testUserId,
          token: 'unique_session_token_123',
          expiresAt,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 Test Browser',
        },
      })

      expect(session.token).toBe('unique_session_token_123')
      expect(session.isActive).toBe(true)
      expect(session.expiresAt).toEqual(expiresAt)
      expect(session.ipAddress).toBe('192.168.1.1')
    })

    it('should find active sessions for user', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      
      // Create active session
      await prisma.session.create({
        data: {
          userId: testUserId,
          token: 'active_session_token',
          expiresAt,
          isActive: true,
        },
      })

      // Create inactive session
      await prisma.session.create({
        data: {
          userId: testUserId,
          token: 'inactive_session_token',
          expiresAt,
          isActive: false,
        },
      })

      const activeSessions = await prisma.session.findMany({
        where: {
          userId: testUserId,
          isActive: true,
        },
      })

      expect(activeSessions).toHaveLength(1)
      expect(activeSessions[0].token).toBe('active_session_token')
    })

    it('should find sessions by token', async () => {
      const token = 'unique_lookup_token'
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      
      await prisma.session.create({
        data: {
          userId: testUserId,
          token,
          expiresAt,
        },
      })

      const session = await prisma.session.findUnique({
        where: { token },
      })

      expect(session).toBeTruthy()
      expect(session?.userId).toBe(testUserId)
    })

    it('should deactivate session', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      
      const session = await prisma.session.create({
        data: {
          userId: testUserId,
          token: 'session_to_deactivate',
          expiresAt,
        },
      })

      await prisma.session.update({
        where: { id: session.id },
        data: { isActive: false },
      })

      const updatedSession = await prisma.session.findUnique({
        where: { id: session.id },
      })

      expect(updatedSession?.isActive).toBe(false)
    })
  })

  describe('User Relations', () => {
    it('should fetch user with all relations', async () => {
      // Create related data
      await prisma.userPreferences.create({
        data: {
          userId: testUserId,
          theme: 'DARK',
        },
      })

      await prisma.auditLog.create({
        data: {
          userId: testUserId,
          action: 'TEST_ACTION',
          resource: 'test_resource',
        },
      })

      await prisma.session.create({
        data: {
          userId: testUserId,
          token: 'test_session_token',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })

      // Fetch user with all relations
      const userWithRelations = await prisma.user.findUnique({
        where: { id: testUserId },
        include: {
          preferences: true,
          auditLogs: true,
          sessions: true,
        },
      })

      expect(userWithRelations).toBeTruthy()
      expect(userWithRelations?.preferences).toBeTruthy()
      expect(userWithRelations?.auditLogs).toHaveLength(1)
      expect(userWithRelations?.sessions).toHaveLength(1)
    })
  })
})