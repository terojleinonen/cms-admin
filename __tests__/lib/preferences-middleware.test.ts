/**
 * Tests for preferences middleware functionality
 */

import { NextRequest, NextResponse } from 'next/server'
import { applyUserPreferences, getDefaultPreferences, validateAndMigratePreferences } from '../../app/lib/preferences-middleware'
import { getToken } from 'next-auth/jwt'

// Mock next-auth/jwt
jest.mock('next-auth/jwt')
const mockGetToken = getToken as jest.MockedFunction<typeof getToken>

// Mock database
jest.mock('../../app/lib/db', () => ({
  prisma: {
    userPreferences: {
      findUnique: jest.fn(),
    },
  },
}))

describe('Preferences Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getDefaultPreferences', () => {
    it('should return default preferences structure', () => {
      const defaults = getDefaultPreferences()

      expect(defaults).toEqual({
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
      })
    })
  })

  describe('validateAndMigratePreferences', () => {
    it('should return default preferences for invalid data', () => {
      const invalidPrefs = {
        theme: 'INVALID_THEME',
        timezone: '',
        language: 123,
        notifications: 'not an object',
        dashboard: null,
      }

      const result = validateAndMigratePreferences(invalidPrefs)
      const defaults = getDefaultPreferences()

      expect(result).toEqual(defaults)
    })

    it('should preserve valid preferences', () => {
      const validPrefs = {
        theme: 'DARK',
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
          widgets: ['weather', 'calendar'],
          defaultView: 'analytics',
        },
      }

      const result = validateAndMigratePreferences(validPrefs)

      expect(result).toEqual(validPrefs)
    })

    it('should fill in missing notification fields', () => {
      const partialPrefs = {
        theme: 'LIGHT',
        timezone: 'UTC',
        language: 'en',
        notifications: {
          email: false,
          // missing push, security, marketing
        },
        dashboard: {
          layout: 'default',
          widgets: [],
          defaultView: 'dashboard',
        },
      }

      const result = validateAndMigratePreferences(partialPrefs)

      expect(result.notifications).toEqual({
        email: false,
        push: true, // default
        security: true, // default
        marketing: false, // default
      })
    })

    it('should validate timezone format', () => {
      const prefsWithInvalidTimezone = {
        theme: 'SYSTEM',
        timezone: 'Invalid/Timezone',
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
      }

      const result = validateAndMigratePreferences(prefsWithInvalidTimezone)

      expect(result.timezone).toBe('UTC') // should fallback to default
    })
  })

  describe('applyUserPreferences', () => {
    it('should apply default preferences when no user token', async () => {
      mockGetToken.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/test')
      const response = NextResponse.next()

      const result = await applyUserPreferences(request, response)

      // Check that default theme cookie is set
      const themeCookie = result.cookies.get('theme')
      expect(themeCookie?.value).toBe('system')

      // Check that default timezone cookie is set
      const timezoneCookie = result.cookies.get('timezone')
      expect(timezoneCookie?.value).toBe('UTC')

      // Check that default language cookie is set
      const languageCookie = result.cookies.get('language')
      expect(languageCookie?.value).toBe('en')
    })

    it('should set secure cookies in production', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      mockGetToken.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/test')
      const response = NextResponse.next()

      const result = await applyUserPreferences(request, response)

      const themeCookie = result.cookies.get('theme')
      expect(themeCookie?.secure).toBe(true)

      process.env.NODE_ENV = originalEnv
    })

    it('should handle errors gracefully', async () => {
      mockGetToken.mockRejectedValue(new Error('Token error'))

      const request = new NextRequest('http://localhost:3000/test')
      const response = NextResponse.next()

      // Should not throw and should apply default preferences
      const result = await applyUserPreferences(request, response)

      const themeCookie = result.cookies.get('theme')
      expect(themeCookie?.value).toBe('system')
    })
  })
})