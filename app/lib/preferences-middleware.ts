/**
 * User Preferences Middleware
 * Handles applying user preferences like theme and timezone to requests
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export interface UserPreferencesData {
  theme: 'LIGHT' | 'DARK' | 'SYSTEM'
  timezone: string
  language: string
  notifications: {
    email: boolean
    push: boolean
    security: boolean
    marketing: boolean
  }
  dashboard: {
    layout: string
    widgets: string[]
    defaultView: string
  }
}

/**
 * Apply user preferences to the response
 * Sets appropriate headers and cookies based on user preferences
 */
export async function applyUserPreferences(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  try {
    // Get the user token
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    })

    if (!token?.sub) {
      // No authenticated user, apply default preferences
      return applyDefaultPreferences(response)
    }

    // Get user preferences from cache or database
    const preferences = await getUserPreferences(token.sub)
    
    if (!preferences) {
      return applyDefaultPreferences(response)
    }

    // Apply theme preference
    if (preferences.theme) {
      response.cookies.set('theme', preferences.theme.toLowerCase(), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      })
    }

    // Apply timezone preference
    if (preferences.timezone) {
      response.cookies.set('timezone', preferences.timezone, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      })
    }

    // Apply language preference
    if (preferences.language) {
      response.cookies.set('language', preferences.language, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      })
    }

    // Add preference headers for client-side access
    response.headers.set('X-User-Theme', preferences.theme)
    response.headers.set('X-User-Timezone', preferences.timezone)
    response.headers.set('X-User-Language', preferences.language)

    return response
  } catch (error) {
    console.error('Error applying user preferences:', error)
    return applyDefaultPreferences(response)
  }
}

/**
 * Apply default preferences when user is not authenticated or preferences are not available
 */
function applyDefaultPreferences(response: NextResponse): NextResponse {
  const defaultPreferences = getDefaultPreferences()

  response.cookies.set('theme', defaultPreferences.theme.toLowerCase(), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })

  response.cookies.set('timezone', defaultPreferences.timezone, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })

  response.cookies.set('language', defaultPreferences.language, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })

  return response
}

/**
 * Get user preferences with caching
 */
async function getUserPreferences(userId: string): Promise<UserPreferencesData | null> {
  try {
    // Try to get from cache first (if Redis is available)
    const cacheKey = `user_preferences:${userId}`
    
    // For now, we'll fetch directly from database
    // In production, this should use Redis or similar caching
    const { prisma } = await import('./db')
    
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId },
      select: {
        theme: true,
        timezone: true,
        language: true,
        notifications: true,
        dashboard: true,
      }
    })

    if (!preferences) {
      return null
    }

    return {
      theme: preferences.theme,
      timezone: preferences.timezone,
      language: preferences.language,
      notifications: preferences.notifications as any,
      dashboard: preferences.dashboard as any,
    }
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return null
  }
}

/**
 * Get default preferences for new users or fallback
 */
export function getDefaultPreferences(): UserPreferencesData {
  return {
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
  }
}

/**
 * Validate and migrate preferences schema
 * Ensures preferences conform to current schema and migrates old data
 */
export function validateAndMigratePreferences(
  preferences: any
): UserPreferencesData {
  const defaultPrefs = getDefaultPreferences()

  try {
    // Validate theme
    const validThemes = ['LIGHT', 'DARK', 'SYSTEM']
    const theme = validThemes.includes(preferences?.theme) 
      ? preferences.theme 
      : defaultPrefs.theme

    // Validate timezone (basic check)
    const timezone = typeof preferences?.timezone === 'string' && 
                    preferences.timezone.length > 0
      ? preferences.timezone
      : defaultPrefs.timezone

    // Validate language (basic check)
    const language = typeof preferences?.language === 'string' && 
                    preferences.language.length > 0
      ? preferences.language
      : defaultPrefs.language

    // Validate notifications object
    const notifications = {
      email: typeof preferences?.notifications?.email === 'boolean' 
        ? preferences.notifications.email 
        : defaultPrefs.notifications.email,
      push: typeof preferences?.notifications?.push === 'boolean' 
        ? preferences.notifications.push 
        : defaultPrefs.notifications.push,
      security: typeof preferences?.notifications?.security === 'boolean' 
        ? preferences.notifications.security 
        : defaultPrefs.notifications.security,
      marketing: typeof preferences?.notifications?.marketing === 'boolean' 
        ? preferences.notifications.marketing 
        : defaultPrefs.notifications.marketing,
    }

    // Validate dashboard object
    const dashboard = {
      layout: typeof preferences?.dashboard?.layout === 'string' 
        ? preferences.dashboard.layout 
        : defaultPrefs.dashboard.layout,
      widgets: Array.isArray(preferences?.dashboard?.widgets) 
        ? preferences.dashboard.widgets 
        : defaultPrefs.dashboard.widgets,
      defaultView: typeof preferences?.dashboard?.defaultView === 'string' 
        ? preferences.dashboard.defaultView 
        : defaultPrefs.dashboard.defaultView,
    }

    return {
      theme,
      timezone,
      language,
      notifications,
      dashboard,
    }
  } catch (error) {
    console.error('Error validating preferences:', error)
    return defaultPrefs
  }
}

/**
 * Create default preferences for a new user
 */
export async function createDefaultUserPreferences(userId: string): Promise<UserPreferencesData> {
  try {
    const { prisma } = await import('./db')
    const defaultPrefs = getDefaultPreferences()

    const preferences = await prisma.userPreferences.create({
      data: {
        userId,
        theme: defaultPrefs.theme,
        timezone: defaultPrefs.timezone,
        language: defaultPrefs.language,
        notifications: defaultPrefs.notifications,
        dashboard: defaultPrefs.dashboard,
      }
    })

    return {
      theme: preferences.theme,
      timezone: preferences.timezone,
      language: preferences.language,
      notifications: preferences.notifications as any,
      dashboard: preferences.dashboard as any,
    }
  } catch (error) {
    console.error('Error creating default preferences:', error)
    return getDefaultPreferences()
  }
}