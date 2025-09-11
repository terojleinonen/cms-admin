/**
 * Client-side preferences hook
 * Handles preference caching, synchronization, and real-time updates
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'

export interface UserPreferences {
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

export interface PreferencesState {
  preferences: UserPreferences | null
  isLoading: boolean
  error: string | null
  isUpdating: boolean
}

const CACHE_KEY = 'user_preferences'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

interface CachedPreferences {
  data: UserPreferences
  timestamp: number
}

/**
 * Hook for managing user preferences with caching and synchronization
 */
export function usePreferences() {
  const { data: session } = useSession()
  const [state, setState] = useState<PreferencesState>({
    preferences: null,
    isLoading: true,
    error: null,
    isUpdating: false,
  })

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSyncRef = useRef<number>(0)

  /**
   * Get preferences from cache if valid
   */
  const getCachedPreferences = useCallback((): UserPreferences | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (!cached) return null

      const parsedCache: CachedPreferences = JSON.parse(cached)
      const now = Date.now()

      // Check if cache is still valid
      if (now - parsedCache.timestamp < CACHE_DURATION) {
        return parsedCache.data
      }

      // Cache expired, remove it
      localStorage.removeItem(CACHE_KEY)
      return null
    } catch (error) {
      console.error('Error reading preferences cache:', error)
      localStorage.removeItem(CACHE_KEY)
      return null
    }
  }, [])

  /**
   * Cache preferences in localStorage
   */
  const cachePreferences = useCallback((preferences: UserPreferences) => {
    try {
      const cacheData: CachedPreferences = {
        data: preferences,
        timestamp: Date.now(),
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
    } catch (error) {
      console.error('Error caching preferences:', error)
    }
  }, [])

  /**
   * Fetch preferences from API
   */
  const fetchPreferences = useCallback(async (): Promise<UserPreferences | null> => {
    if (!session?.user?.id) return null

    try {
      const response = await fetch(`/api/users/${session.user.id}/preferences`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch preferences: ${response.statusText}`)
      }

      const data = await response.json()
      return data.preferences
    } catch (error) {
      console.error('Error fetching preferences:', error)
      throw error
    }
  }, [session?.user?.id])

  /**
   * Apply preferences to DOM (theme, etc.)
   */
  const applyPreferencesToDOM = useCallback((preferences: UserPreferences) => {
    // Apply theme
    const html = document.documentElement
    html.classList.remove('light', 'dark')

    if (preferences.theme === 'DARK') {
      html.classList.add('dark')
    } else if (preferences.theme === 'LIGHT') {
      html.classList.add('light')
    } else {
      // SYSTEM theme - detect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      html.classList.add(prefersDark ? 'dark' : 'light')
    }

    // Set timezone for date formatting
    if (preferences.timezone) {
      document.documentElement.setAttribute('data-timezone', preferences.timezone)
    }

    // Set language
    if (preferences.language) {
      document.documentElement.setAttribute('lang', preferences.language)
    }
  }, [])

  /**
   * Update preferences on server
   */
  const updatePreferences = useCallback(async (
    updates: Partial<UserPreferences>
  ): Promise<UserPreferences> => {
    if (!session?.user?.id) {
      throw new Error('User not authenticated')
    }

    setState(prev => ({ ...prev, isUpdating: true, error: null }))

    try {
      const response = await fetch(`/api/users/${session.user.id}/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to update preferences')
      }

      const data = await response.json()
      const updatedPreferences = data.preferences

      // Update cache
      cachePreferences(updatedPreferences)

      // Update state
      setState(prev => ({
        ...prev,
        preferences: updatedPreferences,
        isUpdating: false,
        error: null,
      }))

      // Apply preferences immediately
      applyPreferencesToDOM(updatedPreferences)

      return updatedPreferences
    } catch (error) {
      setState(prev => ({
        ...prev,
        isUpdating: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }))
      throw error
    }
  }, [session?.user?.id, cachePreferences, applyPreferencesToDOM])

  /**
   * Load preferences with caching strategy
   */
  const loadPreferences = useCallback(async () => {
    if ((session as any)?.status === 'loading') {
      return
    }
    if (!session?.user?.id) {
      setState(prev => ({ ...prev, isLoading: false, preferences: null }))
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Try cache first
      const cachedPreferences = getCachedPreferences()
      if (cachedPreferences) {
        setState(prev => ({
          ...prev,
          preferences: cachedPreferences,
          isLoading: false,
        }))
        applyPreferencesToDOM(cachedPreferences)

        // Fetch fresh data in background
        fetchPreferences()
          .then(freshPreferences => {
            if (freshPreferences) {
              cachePreferences(freshPreferences)
              setState(prev => ({
                ...prev,
                preferences: freshPreferences,
              }))
              applyPreferencesToDOM(freshPreferences)
            }
          })
          .catch(error => {
            console.error('Background preferences sync failed:', error)
          })

        return
      }

      // No cache, fetch from server
      const preferences = await fetchPreferences()
      if (preferences) {
        cachePreferences(preferences)
        setState(prev => ({
          ...prev,
          preferences,
          isLoading: false,
        }))
        applyPreferencesToDOM(preferences)
      } else {
        setState(prev => ({ ...prev, isLoading: false }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load preferences',
      }))
    }
  }, [session?.user?.id, getCachedPreferences, fetchPreferences, cachePreferences, applyPreferencesToDOM, (session as any)?.status])

  /**
   * Debounced sync to prevent too frequent API calls
   */
  const debouncedSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }

    syncTimeoutRef.current = setTimeout(() => {
      const now = Date.now()
      if (now - lastSyncRef.current > 30000) { // Sync at most every 30 seconds
        lastSyncRef.current = now
        loadPreferences()
      }
    }, 1000)
  }, [loadPreferences])

  /**
   * Invalidate cache and reload preferences
   */
  const invalidateCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY)
    loadPreferences()
  }, [loadPreferences])

  // Load preferences on mount and session change
  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  // Listen for storage events (preferences changed in another tab)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === CACHE_KEY) {
        debouncedSync()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [debouncedSync])

  // Listen for system theme changes when using SYSTEM theme
  useEffect(() => {
    if (state.preferences?.theme === 'SYSTEM') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      
      const handleThemeChange = () => {
        if (state.preferences) {
          applyPreferencesToDOM(state.preferences)
        }
      }

      mediaQuery.addEventListener('change', handleThemeChange)
      return () => mediaQuery.removeEventListener('change', handleThemeChange)
    }
  }, [state.preferences?.theme, applyPreferencesToDOM, state.preferences])

  return {
    ...state,
    updatePreferences,
    invalidateCache,
    refetch: loadPreferences,
  }
}