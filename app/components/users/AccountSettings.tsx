/**
 * AccountSettings Component
 * Comprehensive account settings component for user preferences management
 * Handles theme selection, timezone, language preferences, and notification settings
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { 
  CogIcon, 
  BellIcon, 
  GlobeAltIcon, 
  PaintBrushIcon,
  ComputerDesktopIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import FormField from '@/components/ui/FormField'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { UserPreferences, NotificationSettings, DashboardSettings } from '@/lib/types'
import { Theme } from '@prisma/client'
import { userPreferencesUpdateSchema, formatValidationErrors } from '@/lib/user-validation-schemas'
import { z } from 'zod'

interface AccountSettingsProps {
  userId: string
  className?: string
}

interface FormErrors {
  [key: string]: string[]
}

// Available options for form fields
const THEME_OPTIONS = [
  { value: 'SYSTEM', label: 'System' },
  { value: 'LIGHT', label: 'Light' },
  { value: 'DARK', label: 'Dark' }
]

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' }
]

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' }
]

const LAYOUT_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'compact', label: 'Compact' },
  { value: 'expanded', label: 'Expanded' }
]

const DEFAULT_VIEW_OPTIONS = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'products', label: 'Products' },
  { value: 'orders', label: 'Orders' },
  { value: 'analytics', label: 'Analytics' }
]

export default function AccountSettings({ userId, className = '' }: AccountSettingsProps) {
  const { data: session } = useSession()
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  /**
   * Load user preferences from API
   */
  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true)
      setErrorMessage(null)

      const response = await fetch(`/api/users/${userId}/preferences`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load preferences')
      }

      setPreferences(data.preferences)
    } catch (error) {
      console.error('Error loading preferences:', error)
      setErrorMessage('Failed to load preferences. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  /**
   * Update user preferences
   */
  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    try {
      setUpdating(true)
      setErrors({})
      setErrorMessage(null)
      setSuccessMessage(null)

      // Validate the updates
      const validatedData = userPreferencesUpdateSchema.parse(updates)

      const response = await fetch(`/api/users/${userId}/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validatedData)
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 400 && data.errors) {
          setErrors(data.errors)
          return
        }
        throw new Error(data.error || 'Failed to update preferences')
      }

      setPreferences(data.preferences)
      
      // Show success message based on what was updated
      if (updates.theme) {
        setSuccessMessage('Theme updated successfully!')
      } else if (updates.timezone) {
        setSuccessMessage('Timezone updated successfully!')
      } else if (updates.language) {
        setSuccessMessage('Language updated successfully!')
      } else if (updates.notifications) {
        setSuccessMessage('Notification settings updated successfully!')
      } else if (updates.dashboard) {
        setSuccessMessage('Dashboard settings updated successfully!')
      } else {
        setSuccessMessage('Preferences updated successfully!')
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)

    } catch (error) {
      console.error('Error updating preferences:', error)
      if (error instanceof z.ZodError) {
        const formattedErrors = formatValidationErrors(error)
        setErrors(formattedErrors.errors)
      } else {
        setErrorMessage('Failed to update preferences. Please try again.')
      }
    } finally {
      setUpdating(false)
    }
  }, [userId])

  /**
   * Handle theme change
   */
  const handleThemeChange = useCallback((theme: Theme) => {
    updatePreferences({ theme })
  }, [updatePreferences])

  /**
   * Handle timezone change
   */
  const handleTimezoneChange = useCallback((timezone: string) => {
    updatePreferences({ timezone })
  }, [updatePreferences])

  /**
   * Handle language change
   */
  const handleLanguageChange = useCallback((language: string) => {
    updatePreferences({ language })
  }, [updatePreferences])

  /**
   * Handle notification setting change
   */
  const handleNotificationChange = useCallback((key: keyof NotificationSettings, value: boolean) => {
    if (!preferences) return

    const updatedNotifications = {
      ...preferences.notifications,
      [key]: value
    }

    updatePreferences({ notifications: updatedNotifications })
  }, [preferences, updatePreferences])

  /**
   * Handle dashboard setting change
   */
  const handleDashboardChange = useCallback((key: keyof DashboardSettings, value: string) => {
    if (!preferences) return

    const updatedDashboard = {
      ...preferences.dashboard,
      [key]: value
    }

    updatePreferences({ dashboard: updatedDashboard })
  }, [preferences, updatePreferences])

  // Load preferences on component mount
  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  // Clear messages after timeout
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage])

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading preferences...</span>
      </div>
    )
  }

  if (!preferences) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Failed to load preferences</h3>
          <p className="mt-1 text-sm text-gray-500">
            {errorMessage || 'Unable to load your account settings.'}
          </p>
          <div className="mt-6">
            <Button onClick={loadPreferences}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center">
          <CogIcon className="h-6 w-6 text-gray-400 mr-3" />
          <div>
            <h2 className="text-lg font-medium text-gray-900">Account Settings</h2>
            <p className="text-sm text-gray-500">
              Manage your account preferences and notification settings
            </p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-md">
          <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
          <span className="text-sm text-green-700">{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-md">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appearance Settings */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <PaintBrushIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Appearance</h3>
          </div>

          <div className="space-y-4">
            <FormField
              label="Theme"
              name="theme"
              error={errors.theme}
              helpText="Choose your preferred color scheme"
            >
              <Select
                id="theme"
                name="theme"
                value={preferences.theme}
                options={THEME_OPTIONS}
                onChange={(e) => handleThemeChange(e.target.value as Theme)}
                disabled={updating}
                error={!!errors.theme}
                aria-label="Theme"
              />
            </FormField>
          </div>
        </div>

        {/* Localization Settings */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <GlobeAltIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Localization</h3>
          </div>

          <div className="space-y-4">
            <FormField
              label="Timezone"
              name="timezone"
              error={errors.timezone}
              helpText="Your local timezone for date and time display"
            >
              <Select
                id="timezone"
                name="timezone"
                value={preferences.timezone}
                options={TIMEZONE_OPTIONS}
                onChange={(e) => handleTimezoneChange(e.target.value)}
                disabled={updating}
                error={!!errors.timezone}
                aria-label="Timezone"
              />
            </FormField>

            <FormField
              label="Language"
              name="language"
              error={errors.language}
              helpText="Your preferred language for the interface"
            >
              <Select
                id="language"
                name="language"
                value={preferences.language}
                options={LANGUAGE_OPTIONS}
                onChange={(e) => handleLanguageChange(e.target.value)}
                disabled={updating}
                error={!!errors.language}
                aria-label="Language"
              />
            </FormField>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <BellIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="email-notifications" className="text-sm font-medium text-gray-700">
                    Email notifications
                  </label>
                  <p className="text-sm text-gray-500">
                    Receive email notifications for important updates
                  </p>
                </div>
                <label htmlFor="email-notifications" className="relative inline-flex items-center cursor-pointer">
                  <input
                    id="email-notifications"
                    type="checkbox"
                    className="sr-only peer"
                    checked={preferences.notifications.email}
                    onChange={(e) => handleNotificationChange('email', e.target.checked)}
                    disabled={updating}
                    aria-label="Email notifications"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="push-notifications" className="text-sm font-medium text-gray-700">
                    Push notifications
                  </label>
                  <p className="text-sm text-gray-500">
                    Receive push notifications in your browser
                  </p>
                </div>
                <label htmlFor="push-notifications" className="relative inline-flex items-center cursor-pointer">
                  <input
                    id="push-notifications"
                    type="checkbox"
                    className="sr-only peer"
                    checked={preferences.notifications.push}
                    onChange={(e) => handleNotificationChange('push', e.target.checked)}
                    disabled={updating}
                    aria-label="Push notifications"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="security-alerts" className="text-sm font-medium text-gray-700">
                    Security alerts
                  </label>
                  <p className="text-sm text-gray-500">
                    Receive notifications about security events
                  </p>
                </div>
                <label htmlFor="security-alerts" className="relative inline-flex items-center cursor-pointer">
                  <input
                    id="security-alerts"
                    type="checkbox"
                    className="sr-only peer"
                    checked={preferences.notifications.security}
                    onChange={(e) => handleNotificationChange('security', e.target.checked)}
                    disabled={updating}
                    aria-label="Security alerts"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="marketing-emails" className="text-sm font-medium text-gray-700">
                    Marketing emails
                  </label>
                  <p className="text-sm text-gray-500">
                    Receive promotional emails and product updates
                  </p>
                </div>
                <label htmlFor="marketing-emails" className="relative inline-flex items-center cursor-pointer">
                  <input
                    id="marketing-emails"
                    type="checkbox"
                    className="sr-only peer"
                    checked={preferences.notifications.marketing}
                    onChange={(e) => handleNotificationChange('marketing', e.target.checked)}
                    disabled={updating}
                    aria-label="Marketing emails"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Settings */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <ComputerDesktopIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Dashboard</h3>
          </div>

          <div className="space-y-4">
            <FormField
              label="Dashboard Layout"
              name="dashboard-layout"
              error={errors['dashboard.layout']}
              helpText="Choose your preferred dashboard layout"
            >
              <Select
                id="dashboard-layout"
                name="dashboard-layout"
                value={preferences.dashboard.layout}
                options={LAYOUT_OPTIONS}
                onChange={(e) => handleDashboardChange('layout', e.target.value)}
                disabled={updating}
                error={!!errors['dashboard.layout']}
                aria-label="Dashboard Layout"
              />
            </FormField>

            <FormField
              label="Default View"
              name="dashboard-default-view"
              error={errors['dashboard.defaultView']}
              helpText="The page you'll see when you first log in"
            >
              <Select
                id="dashboard-default-view"
                name="dashboard-default-view"
                value={preferences.dashboard.defaultView}
                options={DEFAULT_VIEW_OPTIONS}
                onChange={(e) => handleDashboardChange('defaultView', e.target.value)}
                disabled={updating}
                error={!!errors['dashboard.defaultView']}
                aria-label="Default View"
              />
            </FormField>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {updating && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <LoadingSpinner />
            <span className="text-gray-700">Updating preferences...</span>
          </div>
        </div>
      )}
    </div>
  )
}