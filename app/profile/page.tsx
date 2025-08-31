/**
 * Enhanced User Profile Page
 * Comprehensive profile management with tabbed interface
 * Integrates ProfilePictureManager, AccountSettings, and SecuritySettings components
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { 
  EyeIcon, 
  EyeSlashIcon, 
  UserCircleIcon,
  UserIcon,
  CogIcon,
  ShieldCheckIcon,
  ComputerDesktopIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import ProfilePictureManager from '@/components/users/ProfilePictureManager'
import AccountSettings from '@/components/users/AccountSettings'
import SecuritySettings from '@/components/users/SecuritySettings'
import SessionManagement from '@/components/profile/SessionManagement'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  email: z.string().email('Invalid email format').max(255, 'Email is too long'),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  // If changing password, current password is required
  if (data.newPassword && !data.currentPassword) {
    return false
  }
  // If changing password, confirmation must match
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false
  }
  return true
}, {
  message: "Password confirmation doesn't match",
  path: ["confirmPassword"],
})

type ProfileFormData = z.infer<typeof profileSchema>

type TabId = 'profile' | 'account' | 'security' | 'sessions'

interface Tab {
  id: TabId
  name: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const tabs: Tab[] = [
  {
    id: 'profile',
    name: 'Profile',
    icon: UserIcon,
    description: 'Basic profile information and picture'
  },
  {
    id: 'account',
    name: 'Account Settings',
    icon: CogIcon,
    description: 'Preferences, notifications, and display settings'
  },
  {
    id: 'security',
    name: 'Security',
    icon: ShieldCheckIcon,
    description: 'Password, 2FA, and security settings'
  },
  {
    id: 'sessions',
    name: 'Sessions',
    icon: ComputerDesktopIcon,
    description: 'Active sessions and device management'
  }
]

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession()
  const [activeTab, setActiveTab] = useState<TabId>('profile')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const tabRefs = useRef<{ [key in TabId]?: HTMLButtonElement }>({})
  const [isMobile, setIsMobile] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  /**
   * Handle responsive design
   */
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  /**
   * Handle tab navigation with keyboard
   */
  const handleTabKeyDown = useCallback((e: React.KeyboardEvent, tabId: TabId) => {
    const tabIds = tabs.map(tab => tab.id)
    const currentIndex = tabIds.indexOf(tabId)
    
    let nextIndex = currentIndex
    
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault()
        nextIndex = (currentIndex + 1) % tabIds.length
        break
      case 'ArrowLeft':
        e.preventDefault()
        nextIndex = currentIndex === 0 ? tabIds.length - 1 : currentIndex - 1
        break
      case 'Home':
        e.preventDefault()
        nextIndex = 0
        break
      case 'End':
        e.preventDefault()
        nextIndex = tabIds.length - 1
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        setActiveTab(tabId)
        return
      default:
        return
    }
    
    const nextTabId = tabIds[nextIndex]
    const nextTabRef = tabRefs.current[nextTabId]
    if (nextTabRef) {
      nextTabRef.focus()
    }
  }, [])

  /**
   * Handle profile picture upload
   */
  const handleProfilePictureUpload = useCallback(async (file: File) => {
    if (!session?.user?.id) {
      throw new Error('User session not found')
    }

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`/api/users/${session.user.id}/avatar`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || 'Failed to upload profile picture')
    }

    const result = await response.json()
    
    // Update session with new profile picture
    await updateSession({
      ...session,
      user: {
        ...session.user,
        profilePicture: result.profilePicture
      }
    })
  }, [session, updateSession])

  /**
   * Handle profile picture removal
   */
  const handleProfilePictureRemove = useCallback(async () => {
    if (!session?.user?.id) {
      throw new Error('User session not found')
    }

    const response = await fetch(`/api/users/${session.user.id}/avatar`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || 'Failed to remove profile picture')
    }

    // Update session to remove profile picture
    await updateSession({
      ...session,
      user: {
        ...session.user,
        profilePicture: undefined
      }
    })
  }, [session, updateSession])

  // Load user data when session is available
  useEffect(() => {
    if (session?.user) {
      reset({
        name: session.user.name || '',
        email: session.user.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    }
  }, [session, reset])

  // Clear messages after timeout
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null)
        setError(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [success, error])

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      if (!session?.user?.id) {
        throw new Error('User session not found')
      }

      // Prepare update data
      const updateData: any = {
        name: data.name,
        email: data.email,
      }

      // Add password if changing
      if (isChangingPassword && data.newPassword) {
        updateData.password = data.newPassword
      }

      const response = await fetch(`/api/users/${session.user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to update profile')
      }

      const result = await response.json()

      // Update session with new data
      await updateSession({
        ...session,
        user: {
          ...session.user,
          name: result.user.name,
          email: result.user.email,
        },
      })

      setSuccess('Profile updated successfully')
      
      // Reset password fields
      if (isChangingPassword) {
        reset({
          name: result.user.name,
          email: result.user.email,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
        setIsChangingPassword(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelPasswordChange = () => {
    setIsChangingPassword(false)
    reset({
      name: watch('name'),
      email: watch('email'),
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading profile...</span>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
                {session.user.profilePicture ? (
                  <Image
                    src={session.user.profilePicture}
                    alt={`${session.user.name}'s profile picture`}
                    className="w-full h-full object-cover"
                    width={96}
                    height={96}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UserCircleIcon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
                {session.user.name}
              </h1>
              <p className="text-gray-600 truncate">{session.user.email}</p>
              <div className="flex items-center mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                  {session.user.role?.toLowerCase()} Role
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Messages */}
        {success && (
          <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-md">
            <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
            <span className="text-sm text-green-700">{success}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-md">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Tabbed Interface */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex" role="tablist" aria-label="Profile sections">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                
                return (
                  <button
                    key={tab.id}
                    id={`${tab.id}-tab`}
                    ref={(el) => {
                      if (el) tabRefs.current[tab.id] = el
                    }}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`${tab.id}-panel`}
                    tabIndex={isActive ? 0 : -1}
                    className={`
                      group relative min-w-0 flex-1 overflow-hidden py-4 px-4 text-center text-sm font-medium hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
                      ${isActive 
                        ? 'text-blue-600 border-b-2 border-blue-600' 
                        : 'text-gray-500 border-b-2 border-transparent hover:text-gray-700 hover:border-gray-300'
                      }
                      ${isMobile ? 'px-2' : 'px-4'}
                    `}
                    onClick={() => setActiveTab(tab.id)}
                    onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <Icon className={`h-5 w-5 ${isMobile ? 'hidden' : ''}`} />
                      <span className={isMobile ? 'text-xs' : ''}>{tab.name}</span>
                    </div>
                    {!isMobile && (
                      <p className="text-xs text-gray-500 mt-1">{tab.description}</p>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Tab Panels */}
          <div className="p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div
                id="profile-panel"
                role="tabpanel"
                aria-labelledby="profile-tab"
                className="space-y-8"
              >
                {/* Profile Picture Section */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Picture</h3>
                  <ProfilePictureManager
                    currentImage={session.user.profilePicture}
                    onUpload={handleProfilePictureUpload}
                    onRemove={session.user.profilePicture ? handleProfilePictureRemove : undefined}
                    className="max-w-2xl"
                  />
                </div>

                {/* Basic Profile Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
                    {/* Name */}
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        {...register('name')}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        {...register('email')}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                      )}
                    </div>

                    {/* Password Change Section */}
                    <div className="border-t border-gray-200 pt-6">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-md font-medium text-gray-900">Change Password</h4>
                        {!isChangingPassword ? (
                          <button
                            type="button"
                            onClick={() => setIsChangingPassword(true)}
                            className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:underline"
                          >
                            Change Password
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleCancelPasswordChange}
                            className="text-sm text-gray-600 hover:text-gray-800 focus:outline-none focus:underline"
                          >
                            Cancel
                          </button>
                        )}
                      </div>

                      {isChangingPassword && (
                        <div className="space-y-4">
                          {/* Current Password */}
                          <div>
                            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                              Current Password
                            </label>
                            <div className="mt-1 relative">
                              <input
                                type={showCurrentPassword ? 'text' : 'password'}
                                id="currentPassword"
                                {...register('currentPassword')}
                                className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none"
                                aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                              >
                                {showCurrentPassword ? (
                                  <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <EyeIcon className="h-4 w-4 text-gray-400" />
                                )}
                              </button>
                            </div>
                            {errors.currentPassword && (
                              <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message}</p>
                            )}
                          </div>

                          {/* New Password */}
                          <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                              New Password
                            </label>
                            <div className="mt-1 relative">
                              <input
                                type={showNewPassword ? 'text' : 'password'}
                                id="newPassword"
                                {...register('newPassword')}
                                className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none"
                                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                              >
                                {showNewPassword ? (
                                  <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <EyeIcon className="h-4 w-4 text-gray-400" />
                                )}
                              </button>
                            </div>
                            {errors.newPassword && (
                              <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
                            )}
                          </div>

                          {/* Confirm Password */}
                          <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                              Confirm New Password
                            </label>
                            <div className="mt-1 relative">
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                id="confirmPassword"
                                {...register('confirmPassword')}
                                className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none"
                                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                              >
                                {showConfirmPassword ? (
                                  <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <EyeIcon className="h-4 w-4 text-gray-400" />
                                )}
                              </button>
                            </div>
                            {errors.confirmPassword && (
                              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end pt-4">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <div className="flex items-center">
                            <LoadingSpinner size="sm" className="mr-2" />
                            Saving...
                          </div>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Account Settings Tab */}
            {activeTab === 'account' && (
              <div
                id="account-panel"
                role="tabpanel"
                aria-labelledby="account-tab"
              >
                <AccountSettings userId={session.user.id} />
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div
                id="security-panel"
                role="tabpanel"
                aria-labelledby="security-tab"
              >
                <SecuritySettings userId={session.user.id} />
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
              <div
                id="sessions-panel"
                role="tabpanel"
                aria-labelledby="sessions-tab"
              >
                <SessionManagement />
              </div>
            )}
          </div>
        </div>
      </main>
    </ErrorBoundary>
  )
}