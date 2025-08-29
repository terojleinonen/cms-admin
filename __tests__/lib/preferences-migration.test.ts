/**
 * Tests for preferences migration functionality
 */

import { validateAndMigrateUserPreferences, batchMigrateAllUserPreferences, ensureUserPreferences } from '../../app/lib/preferences-migration'
import { prisma } from '../../app/lib/db'
import { Theme } from '@prisma/client'

// Mock the database
jest.mock('../../app/lib/db', () => ({
  prisma: {
    userPreferences: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Preferences Migration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('validateAndMigrateUserPreferences', () => {
    it('should create default preferences for new user', async () => {
      const userId = 'user-123'
      
      // Mock no existing preferences
      mockPrisma.userPreferences.findUnique.mockResolvedValue(null)
      
      // Mock preference creation
      const mockCreatedPrefs = {
        id: 'pref-123',
        userId,
        theme: Theme.SYSTEM,
        timezone: 'UTC',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          security: true,
          marketing: false,
        },
        dashboard: {
          layout: 'default',
          widgets: [],
          defaultView: 'dashboard',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      mockPrisma.userPreferences.create.mockResolvedValue(mockCreatedPrefs)

      const result = await validateAndMigrateUserPreferences(userId)

      expect(result.success).toBe(true)
      expect(result.migrated).toBe(false)
      expect(result.preferences.theme).toBe('SYSTEM')
      expect(mockPrisma.userPreferences.create).toHaveBeenCalledWith({
        data: {
          userId,
          theme: 'SYSTEM',
          timezone: 'UTC',
          language: 'en',
          notifications: {
            email: true,
            push: true,
            security: true,
            marketing: false,
          },
          dashboard: {
            layout: 'default',
            widgets: [],
            defaultView: 'dashboard',
          },
        },
      })
    })

    it('should validate existing preferences without migration', async () => {
      const userId = 'user-123'
      
      const existingPrefs = {
        id: 'pref-123',
        userId,
        theme: Theme.DARK,
        timezone: 'America/New_York',
        language: 'en-US',
        notifications: {
          email: false,
          push: true,
          security: true,
          marketing: false,
        },
        dashboard: {
          layout: 'compact',
          widgets: ['weather'],
          defaultView: 'analytics',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      mockPrisma.userPreferences.findUnique.mockResolvedValue(existingPrefs)

      const result = await validateAndMigrateUserPreferences(userId)

      expect(result.success).toBe(true)
      expect(result.migrated).toBe(false)
      expect(result.preferences.theme).toBe('DARK')
      expect(result.preferences.timezone).toBe('America/New_York')
      expect(mockPrisma.userPreferences.update).not.toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      const userId = 'user-123'
      
      mockPrisma.userPreferences.findUnique.mockRejectedValue(new Error('Database error'))

      const result = await validateAndMigrateUserPreferences(userId)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Migration failed: Error: Database error')
      expect(result.preferences.theme).toBe('SYSTEM') // Should return defaults
    })

    it('should validate and fix invalid preference values', async () => {
      const userId = 'user-123'
      
      const invalidPrefs = {
        id: 'pref-123',
        userId,
        theme: 'INVALID_THEME' as Theme,
        timezone: '',
        language: '',
        notifications: null,
        dashboard: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      mockPrisma.userPreferences.findUnique.mockResolvedValue(invalidPrefs)

      const result = await validateAndMigrateUserPreferences(userId)

      expect(result.success).toBe(true)
      expect(result.preferences.theme).toBe('SYSTEM') // Should fallback to default
      expect(result.preferences.timezone).toBe('UTC') // Should fallback to default
      expect(result.preferences.language).toBe('en') // Should fallback to default
      expect(result.preferences.notifications).toEqual({
        email: true,
        push: true,
        security: true,
        marketing: false,
      })
    })
  })

  describe('batchMigrateAllUserPreferences', () => {
    it('should migrate all users with preferences', async () => {
      const mockUsers = [
        { id: 'user-1' },
        { id: 'user-2' },
        { id: 'user-3' },
      ]
      
      mockPrisma.user.findMany.mockResolvedValue(mockUsers)
      
      // Mock successful migrations
      mockPrisma.userPreferences.findUnique
        .mockResolvedValueOnce({
          id: 'pref-1',
          userId: 'user-1',
          theme: Theme.SYSTEM,
          timezone: 'UTC',
          language: 'en',
          notifications: { email: true, push: true, security: true, marketing: false },
          dashboard: { layout: 'default', widgets: [], defaultView: 'dashboard' },
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'pref-2',
          userId: 'user-2',
          theme: Theme.LIGHT,
          timezone: 'UTC',
          language: 'en',
          notifications: { email: true, push: true, security: true, marketing: false },
          dashboard: { layout: 'default', widgets: [], defaultView: 'dashboard' },
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'pref-3',
          userId: 'user-3',
          theme: Theme.DARK,
          timezone: 'UTC',
          language: 'en',
          notifications: { email: true, push: true, security: true, marketing: false },
          dashboard: { layout: 'default', widgets: [], defaultView: 'dashboard' },
          createdAt: new Date(),
          updatedAt: new Date(),
        })

      const result = await batchMigrateAllUserPreferences()

      expect(result.total).toBe(3)
      expect(result.migrated).toBe(0) // No migrations needed for valid data
      expect(result.errors).toHaveLength(0)
    })

    it('should handle individual user migration errors', async () => {
      const mockUsers = [
        { id: 'user-1' },
        { id: 'user-2' },
      ]
      
      mockPrisma.user.findMany.mockResolvedValue(mockUsers)
      
      // First user succeeds, second fails
      mockPrisma.userPreferences.findUnique
        .mockResolvedValueOnce({
          id: 'pref-1',
          userId: 'user-1',
          theme: Theme.SYSTEM,
          timezone: 'UTC',
          language: 'en',
          notifications: { email: true, push: true, security: true, marketing: false },
          dashboard: { layout: 'default', widgets: [], defaultView: 'dashboard' },
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockRejectedValueOnce(new Error('Database error'))

      const result = await batchMigrateAllUserPreferences()

      expect(result.total).toBe(2)
      expect(result.migrated).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('User user-2')
    })
  })

  describe('ensureUserPreferences', () => {
    it('should return existing valid preferences', async () => {
      const userId = 'user-123'
      
      const existingPrefs = {
        id: 'pref-123',
        userId,
        theme: Theme.DARK,
        timezone: 'America/New_York',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          security: true,
          marketing: false,
        },
        dashboard: {
          layout: 'default',
          widgets: [],
          defaultView: 'dashboard',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      mockPrisma.userPreferences.findUnique.mockResolvedValue(existingPrefs)

      const result = await ensureUserPreferences(userId)

      expect(result.theme).toBe('DARK')
      expect(result.timezone).toBe('America/New_York')
    })

    it('should return defaults on error', async () => {
      const userId = 'user-123'
      
      mockPrisma.userPreferences.findUnique.mockRejectedValue(new Error('Database error'))

      const result = await ensureUserPreferences(userId)

      expect(result.theme).toBe('SYSTEM')
      expect(result.timezone).toBe('UTC')
      expect(result.language).toBe('en')
    })
  })
})