'use client'

import { useState, useEffect } from 'react'
import { Switch } from '@headlessui/react'
import { 
  EnvelopeIcon, 
  ShieldCheckIcon, 
  MegaphoneIcon, 
  UserIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'

interface NotificationPreferences {
  email: boolean
  security: boolean
  marketing: boolean
  accountUpdates: boolean
  adminMessages: boolean
}

interface NotificationPreferencesProps {
  userId: string
  onUpdate?: (preferences: NotificationPreferences) => void
}

export function NotificationPreferences({ userId, onUpdate }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    security: true,
    marketing: false,
    accountUpdates: true,
    adminMessages: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchPreferences()
  }, [userId])

  const fetchPreferences = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/notification-preferences`)
      if (response.ok) {
        const data = await response.json()
        setPreferences(data.preferences)
      }
    } catch (error) {
      console.error('Failed to fetch notification preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const updatePreferences = async (newPreferences: NotificationPreferences) => {
    setSaving(true)
    setMessage('')
    
    try {
      const response = await fetch(`/api/users/${userId}/notification-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPreferences)
      })
      
      if (response.ok) {
        const data = await response.json()
        setPreferences(data.preferences)
        setMessage('Notification preferences updated successfully')
        onUpdate?.(data.preferences)
        
        // Clear message after 3 seconds
        setTimeout(() => setMessage(''), 3000)
      } else {
        throw new Error('Failed to update preferences')
      }
    } catch (error) {
      console.error('Failed to update notification preferences:', error)
      setMessage('Failed to update preferences. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = (key: keyof NotificationPreferences) => {
    const newPreferences = {
      ...preferences,
      [key]: !preferences[key]
    }
    setPreferences(newPreferences)
    updatePreferences(newPreferences)
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-5 w-5 bg-gray-200 rounded"></div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-48"></div>
                </div>
              </div>
              <div className="h-6 w-11 bg-gray-200 rounded-full"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const preferenceItems = [
    {
      key: 'email' as keyof NotificationPreferences,
      icon: EnvelopeIcon,
      title: 'Email Notifications',
      description: 'Receive notifications via email',
      color: 'text-blue-500'
    },
    {
      key: 'security' as keyof NotificationPreferences,
      icon: ShieldCheckIcon,
      title: 'Security Alerts',
      description: 'Important security-related notifications (recommended)',
      color: 'text-red-500'
    },
    {
      key: 'accountUpdates' as keyof NotificationPreferences,
      icon: UserIcon,
      title: 'Account Updates',
      description: 'Notifications about profile and account changes',
      color: 'text-green-500'
    },
    {
      key: 'adminMessages' as keyof NotificationPreferences,
      icon: ChatBubbleLeftRightIcon,
      title: 'Admin Messages',
      description: 'Messages and announcements from administrators',
      color: 'text-purple-500'
    },
    {
      key: 'marketing' as keyof NotificationPreferences,
      icon: MegaphoneIcon,
      title: 'Marketing & Updates',
      description: 'Product updates, tips, and promotional content',
      color: 'text-orange-500'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Notification Preferences
        </h3>
        <p className="text-sm text-gray-600">
          Choose how you want to be notified about account activity and updates.
        </p>
      </div>

      {message && (
        <div className={`p-3 rounded-md ${
          message.includes('successfully') 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <div className="space-y-4">
        {preferenceItems.map((item) => (
          <div key={item.key} className="flex items-center justify-between py-3">
            <div className="flex items-center space-x-3">
              <item.icon className={`h-5 w-5 ${item.color}`} />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {item.title}
                </p>
                <p className="text-sm text-gray-600">
                  {item.description}
                </p>
              </div>
            </div>
            
            <Switch
              checked={preferences[item.key]}
              onChange={() => handleToggle(item.key)}
              disabled={saving}
              className={`${
                preferences[item.key] ? 'bg-blue-600' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50`}
            >
              <span
                className={`${
                  preferences[item.key] ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
          </div>
        ))}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <ShieldCheckIcon className="h-5 w-5 text-yellow-400 mt-0.5" />
          <div className="ml-3">
            <h4 className="text-sm font-medium text-yellow-800">
              Security Notifications
            </h4>
            <p className="text-sm text-yellow-700 mt-1">
              We strongly recommend keeping security alerts enabled to protect your account from unauthorized access.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}