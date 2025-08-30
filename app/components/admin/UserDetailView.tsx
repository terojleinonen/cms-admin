/**
 * User Detail View Component
 * Comprehensive view and management interface for individual users
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  EnvelopeIcon,
  CalendarIcon,
  ClockIcon,
  ComputerDesktopIcon,
  KeyIcon,
} from '@heroicons/react/24/outline'
import { User, UserRole } from '@/app/lib/types'
import Button from '@/app/components/ui/Button'
import Modal from '@/app/components/ui/Modal'

interface UserWithDetails extends User {
  _count: {
    createdProducts: number
    createdPages: number
    auditLogs: number
    sessions: number
  }
  lastLoginAt?: Date
  emailVerified?: Date
  twoFactorEnabled: boolean
  isActive: boolean
}

interface UserDetailViewProps {
  userId: string
  initialData?: UserWithDetails | null
}

interface UserStats {
  totalLogins: number
  lastLogin: Date | null
  accountAge: number
  securityScore: number
  recentActivity: Array<{
    action: string
    timestamp: Date
    details: string
  }>
}

const roleColors: Record<UserRole, string> = {
  ADMIN: 'bg-red-100 text-red-800 border-red-200',
  EDITOR: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  VIEWER: 'bg-green-100 text-green-800 border-green-200',
}

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
}

export default function UserDetailView({ userId, initialData }: UserDetailViewProps) {
  const [user, setUser] = useState<UserWithDetails | null>(initialData)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'activity' | 'settings'>('overview')
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)

  // Fetch user data
  const fetchUserData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [userResponse, statsResponse] = await Promise.all([
        fetch(`/api/admin/users/${userId}`),
        fetch(`/api/admin/users/${userId}/stats`)
      ])

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user data')
      }

      const userData = await userResponse.json()
      setUser(userData.user)

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.stats)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!initialData) {
      fetchUserData()
    }
  }, [userId, initialData])

  // Handle user actions
  const handleDeactivateUser = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      })

      if (!response.ok) {
        throw new Error('Failed to deactivate user')
      }

      setUser(prev => prev ? { ...prev, isActive: false } : null)
      setShowDeactivateModal(false)
      alert('User deactivated successfully')
    } catch (err) {
      alert('Failed to deactivate user')
    }
  }

  const handleDeleteUser = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete user')
      }

      alert('User deleted successfully')
      // Redirect to users list
      window.location.href = '/admin/users'
    } catch (err) {
      alert('Failed to delete user')
    }
  }

  // Format date
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Calculate account age in days
  const getAccountAge = (createdAt: Date) => {
    const now = new Date()
    const created = new Date(createdAt)
    const diffTime = Math.abs(now.getTime() - created.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  // Get security score based on various factors
  const getSecurityScore = (user: UserWithDetails) => {
    let score = 0
    if (user.emailVerified) score += 25
    if (user.twoFactorEnabled) score += 35
    if (user.lastLoginAt && new Date(user.lastLoginAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000) score += 20
    if (user.isActive) score += 20
    return score
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-64"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading User</h3>
          <p className="mt-1 text-sm text-gray-500">
            {error || 'User not found'}
          </p>
          <div className="mt-6">
            <Link
              href="/admin/users"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Users
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const securityScore = getSecurityScore(user)
  const accountAge = getAccountAge(user.createdAt)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <Link
              href="/admin/users"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Users
            </Link>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditModal(true)}
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit User
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeactivateModal(true)}
                disabled={!user.isActive}
              >
                {user.isActive ? 'Deactivate' : 'Reactivate'}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* User Header Info */}
        <div className="px-6 py-6">
          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0">
              {user.profilePicture ? (
                <img
                  className="h-20 w-20 rounded-full object-cover"
                  src={user.profilePicture}
                  alt={user.name}
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-gray-300 flex items-center justify-center">
                  <UserIcon className="h-10 w-10 text-gray-600" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${roleColors[user.role]}`}>
                  {roleLabels[user.role]}
                </span>
                {user.isActive ? (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 border border-green-200">
                    <CheckCircleIcon className="w-3 h-3 mr-1" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                    <XCircleIcon className="w-3 h-3 mr-1" />
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-gray-600 mt-1">{user.email}</p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  Joined {formatDate(user.createdAt)}
                </span>
                <span className="flex items-center">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  Last login {formatDate(user.lastLoginAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'overview', name: 'Overview', icon: UserIcon },
              { id: 'security', name: 'Security', icon: ShieldCheckIcon },
              { id: 'activity', name: 'Activity', icon: ClockIcon },
              { id: 'settings', name: 'Settings', icon: ComputerDesktopIcon },
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Stats */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Account Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-gray-900">{user._count.createdProducts}</div>
                      <div className="text-sm text-gray-500">Products Created</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-gray-900">{user._count.createdPages}</div>
                      <div className="text-sm text-gray-500">Pages Created</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-gray-900">{user._count.auditLogs}</div>
                      <div className="text-sm text-gray-500">Total Actions</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-gray-900">{accountAge}</div>
                      <div className="text-sm text-gray-500">Days Active</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-gray-900">{user.email}</span>
                      {user.emailVerified && (
                        <CheckCircleIcon className="h-4 w-4 text-green-500 ml-2" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Overview */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Security Overview</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Security Score</span>
                      <span className="text-sm text-gray-500">{securityScore}/100</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          securityScore >= 80 ? 'bg-green-500' :
                          securityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${securityScore}%` }}
                        aria-label={`Security score: ${securityScore}%`}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Email Verified</span>
                      {user.emailVerified ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircleIcon className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Two-Factor Authentication</span>
                      {user.twoFactorEnabled ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircleIcon className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Active Sessions</span>
                      <span className="text-sm text-gray-900">{user._count.sessions}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Security Management
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>Security settings management is available in the dedicated security page.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <ClockIcon className="h-5 w-5 text-blue-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Activity Monitor
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>Detailed activity monitoring is shown in the activity monitor component below.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">User Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div>
                      <div className="text-sm font-medium text-gray-900">Account Status</div>
                      <div className="text-sm text-gray-500">Enable or disable user account</div>
                    </div>
                    <Button
                      variant={user.isActive ? "danger" : "primary"}
                      size="sm"
                      onClick={() => setShowDeactivateModal(true)}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div>
                      <div className="text-sm font-medium text-gray-900">Reset Password</div>
                      <div className="text-sm text-gray-500">Send password reset email to user</div>
                    </div>
                    <Button variant="outline" size="sm">
                      <KeyIcon className="h-4 w-4 mr-2" />
                      Reset Password
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showDeactivateModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowDeactivateModal(false)}
          title={user.isActive ? "Deactivate User" : "Activate User"}
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-900">
                  Are you sure you want to {user.isActive ? 'deactivate' : 'activate'} this user?
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeactivateModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant={user.isActive ? "danger" : "primary"}
                onClick={handleDeactivateUser}
              >
                {user.isActive ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showDeleteModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowDeleteModal(false)}
          title="Delete User"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-900">
                  Are you sure you want to delete this user? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteUser}
              >
                Delete User
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}