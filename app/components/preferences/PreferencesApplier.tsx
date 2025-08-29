/**
 * Preferences Applier Component
 * Applies user preferences to the DOM and handles theme changes
 */

'use client'

import { useEffect } from 'react'
import { usePreferencesContext } from '../providers/PreferencesProvider'

/**
 * Component that applies user preferences to the DOM
 * Should be included in the root layout to ensure preferences are applied
 */
export function PreferencesApplier() {
  const { preferences } = usePreferencesContext()

  useEffect(() => {
    if (!preferences) return

    // Apply theme
    applyTheme(preferences.theme)

    // Apply timezone
    if (preferences.timezone) {
      document.documentElement.setAttribute('data-timezone', preferences.timezone)
    }

    // Apply language
    if (preferences.language) {
      document.documentElement.setAttribute('lang', preferences.language)
    }

    // Apply other preferences as needed
    applyDashboardPreferences(preferences.dashboard)
  }, [preferences])

  // Listen for system theme changes when using SYSTEM theme
  useEffect(() => {
    if (preferences?.theme === 'SYSTEM') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      
      const handleThemeChange = () => {
        applyTheme('SYSTEM')
      }

      mediaQuery.addEventListener('change', handleThemeChange)
      return () => mediaQuery.removeEventListener('change', handleThemeChange)
    }
  }, [preferences?.theme])

  return null // This component doesn't render anything
}

/**
 * Apply theme to the document
 */
function applyTheme(theme: 'LIGHT' | 'DARK' | 'SYSTEM') {
  const html = document.documentElement
  
  // Remove existing theme classes
  html.classList.remove('light', 'dark')
  
  if (theme === 'DARK') {
    html.classList.add('dark')
  } else if (theme === 'LIGHT') {
    html.classList.add('light')
  } else {
    // SYSTEM theme - detect system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    html.classList.add(prefersDark ? 'dark' : 'light')
  }

  // Update CSS custom properties for theme
  updateThemeCustomProperties(theme)
}

/**
 * Update CSS custom properties based on theme
 */
function updateThemeCustomProperties(theme: 'LIGHT' | 'DARK' | 'SYSTEM') {
  const root = document.documentElement
  const isDark = theme === 'DARK' || 
    (theme === 'SYSTEM' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  if (isDark) {
    // Dark theme colors
    root.style.setProperty('--color-background', '#0f172a')
    root.style.setProperty('--color-foreground', '#f8fafc')
    root.style.setProperty('--color-muted', '#1e293b')
    root.style.setProperty('--color-muted-foreground', '#94a3b8')
    root.style.setProperty('--color-border', '#334155')
    root.style.setProperty('--color-input', '#1e293b')
    root.style.setProperty('--color-primary', '#3b82f6')
    root.style.setProperty('--color-primary-foreground', '#f8fafc')
  } else {
    // Light theme colors
    root.style.setProperty('--color-background', '#ffffff')
    root.style.setProperty('--color-foreground', '#0f172a')
    root.style.setProperty('--color-muted', '#f1f5f9')
    root.style.setProperty('--color-muted-foreground', '#64748b')
    root.style.setProperty('--color-border', '#e2e8f0')
    root.style.setProperty('--color-input', '#ffffff')
    root.style.setProperty('--color-primary', '#3b82f6')
    root.style.setProperty('--color-primary-foreground', '#ffffff')
  }
}

/**
 * Apply dashboard preferences
 */
function applyDashboardPreferences(dashboard: {
  layout: string
  widgets: string[]
  defaultView: string
}) {
  // Store dashboard preferences in data attributes for CSS/JS access
  document.documentElement.setAttribute('data-dashboard-layout', dashboard.layout)
  document.documentElement.setAttribute('data-dashboard-view', dashboard.defaultView)
  
  // Store widgets as JSON in a data attribute
  document.documentElement.setAttribute(
    'data-dashboard-widgets', 
    JSON.stringify(dashboard.widgets)
  )
}

/**
 * Hook to get current theme from DOM
 */
export function useCurrentTheme(): 'light' | 'dark' {
  const html = document.documentElement
  return html.classList.contains('dark') ? 'dark' : 'light'
}

/**
 * Hook to get timezone from preferences
 */
export function useTimezone(): string {
  const { preferences } = usePreferencesContext()
  return preferences?.timezone || 'UTC'
}

/**
 * Hook to format date according to user preferences
 */
export function useFormatDate() {
  const timezone = useTimezone()
  const { preferences } = usePreferencesContext()
  const language = preferences?.language || 'en'

  return (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    return new Intl.DateTimeFormat(language, {
      timeZone: timezone,
      ...options,
    }).format(dateObj)
  }
}