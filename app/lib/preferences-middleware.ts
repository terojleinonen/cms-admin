/**
 * User Preferences Middleware
 * Applies user preferences to requests and responses
 */

import { NextRequest, NextResponse } from 'next/server'

export interface UserPreferences {
  theme?: 'light' | 'dark'
  language?: string
  timezone?: string
  dateFormat?: string
  itemsPerPage?: number
}

/**
 * Apply user preferences to the response
 * This middleware can be used to customize responses based on user preferences
 */
export function applyUserPreferences(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  // Get user preferences from cookies or headers
  const theme = request.cookies.get('theme')?.value || 'light'
  const language = request.cookies.get('language')?.value || 'en'
  const timezone = request.cookies.get('timezone')?.value || 'UTC'

  // Clone the response to add headers
  const modifiedResponse = NextResponse.next({
    request: {
      headers: request.headers
    }
  })

  // Add preference headers to the response
  modifiedResponse.headers.set('X-User-Theme', theme)
  modifiedResponse.headers.set('X-User-Language', language)
  modifiedResponse.headers.set('X-User-Timezone', timezone)

  return modifiedResponse
}

/**
 * Get user preferences from request
 */
export function getUserPreferences(request: NextRequest): UserPreferences {
  return {
    theme: (request.cookies.get('theme')?.value as 'light' | 'dark') || 'light',
    language: request.cookies.get('language')?.value || 'en',
    timezone: request.cookies.get('timezone')?.value || 'UTC',
    dateFormat: request.cookies.get('dateFormat')?.value || 'MM/DD/YYYY',
    itemsPerPage: parseInt(request.cookies.get('itemsPerPage')?.value || '25', 10)
  }
}

/**
 * Set user preferences in response
 */
export function setUserPreferences(
  response: NextResponse,
  preferences: Partial<UserPreferences>
): NextResponse {
  if (preferences.theme) {
    response.cookies.set('theme', preferences.theme, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365 // 1 year
    })
  }

  if (preferences.language) {
    response.cookies.set('language', preferences.language, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365
    })
  }

  if (preferences.timezone) {
    response.cookies.set('timezone', preferences.timezone, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365
    })
  }

  if (preferences.dateFormat) {
    response.cookies.set('dateFormat', preferences.dateFormat, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365
    })
  }

  if (preferences.itemsPerPage) {
    response.cookies.set('itemsPerPage', preferences.itemsPerPage.toString(), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365
    })
  }

  return response
}
