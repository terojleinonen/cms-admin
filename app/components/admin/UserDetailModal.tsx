/**
 * UserDetailModal component
 * Displays comprehensive user information in a modal
 */

'use client'

import { useState, useEffect } from 'react'
import {
  UserIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  CalendarIcon,
  ClockIcon,
  DocumentTextIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline'
import { AuditLog, Session } from '@/lib/types'
import { UserRole } from '@prisma/client'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
// Simple notification helper
const showNotification = (message: string) => {
  alert(`✓ ${message}`)
}

interface UserWithDetails {
  id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  profilePicture?: string
  emailVerified?: Date
  twoFactorEnabled: boolean
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
  _count: {
    createdProducts: number
    createdPages: number
    auditLogs: number
    sessions: number
  }
  recentActivity?: AuditLog[]
  activeSessions?: Session[]
}

interface UserDetailModalProps {
  user: UserWithDetails
  onClose: () => void
  onEdit: (user: UserWithDetails) => void
}

interface SecurityInfo {
  twoFactorEnabled: boolean
  lastPasswordChange?: Date
  activeSessions: Session[]
  recentActivity: AuditLog[]
  securityScore: number
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

const roleDescriptions: Record<UserRole, string> = {
  ADMIN: 'Full access to all features including user management and system settings',
  EDITOR: 'Can create, edit, and manage content but cannot manage users or system settings',
  VIEWER: 'Read-only access to dashboard and analytics',
}

export default function UserDetailModal({ user, onClose, onEdit }: UserDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'security' | 'sessions'>('overview')
  const [securityInfo, setSecurityInfo] = useState<SecurityInfo | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch detailed security information
  useEffect(() => {
    const fetchSecurityInfo = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/admin/users/${user.id}/security`)
        if (response.ok) {
          const data = await response.json()
          setSecurityInfo(data.security)
        }
      } catch (error) {
        console.error('Error fetching security info:', error)
      } finally {
        setLoading(false)
      }
    }

    if (activeTab === 'security' || activeTab === 'sessions') {
      fetchSecurityInfo()
    }
  }, [user.id, activeTab])

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

  // Format relative time
  const formatRelativeTime = (date: Date | string) => {
    const now = new Date()
    const then = new Date(date)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minutes ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays < 7) return `${diffDays} days ago`
    return formatDate(date)
  }

  // Get security score color
  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  // Get user status
  const getUserStatus = () => {
    if (!user.isActive) {
      return {
        label: 'Inactive',
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: XCircleIcon,
      }
    }

    const isOnline = user.lastLoginAt && 
      new Date(user.lastLoginAt).getTime() > Date.now() - 15 * 60 * 1000 // 15 minutes

    return {
      label: isOnline ? 'Online' : 'Active',
      color: isOnline 
        ? 'bg-green-100 text-green-800 border-green-200'
        : 'bg-blue-100 text-blue-800 border-blue-200',
      icon: CheckCircleIcon,
    }
  }

  const status = getUserStatus()

  const tabs = [
    { id: 'overview', label: 'Overview', icon: UserIcon },
    { id: 'activity', label: 'Activity', icon: ClockIcon },
    { id: 'security', label: 'Security', icon: ShieldCheckIcon },
    { id: 'sessions', label: 'Sessions', icon: ComputerDesktopIcon },
  ]

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="User Details"
      size="xl"
    >
      <div className="space-y-6">
        {/* User Header */}
        <div className="flex items-start space-x-4 p-6 bg-gray-50 rounded-lg">
          <div className="flex-shrink-0">
            {user.profilePicture ? (
              <img
                className="h-16 w-16 rounded-full object-cover"
                src={user.profilePicture}
                alt={user.name}
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-xl font-medium text-gray-700">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {user.name}
              </h3>
              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${status.color}`}>
                <status.icon className="w-3 h-3 mr-1" />
                {status.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 truncate">{user.email}</p>
            <div className="mt-2 flex items-center space-x-4">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${roleColors[user.role]}`}>
                {roleLabels[user.role]}
              </span>
              <span className="text-xs text-gray-500">
                Member since {formatDate(user.createdAt)}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(user)}
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              Edit User
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <UserIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Full Name</p>
                        <p className="text-sm text-gray-500">{user.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Email Address</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Role</p>
                        <p className="text-sm text-gray-500">{roleLabels[user.role]}</p>
                        <p className="text-xs text-gray-400">{roleDescriptions[user.role]}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <CalendarIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Account Created</p>
                        <p className="text-sm text-gray-500">{formatDate(user.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <ClockIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Last Login</p>
                        <p className="text-sm text-gray-500">{formatDate(user.lastLoginAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircleIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Email Verified</p>
                        <p className="text-sm text-gray-500">
                          {user.emailVerified ? formatDate(user.emailVerified) : 'Not verified'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Summary */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Activity Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">Products Created</p>
                        <p className="text-2xl font-semibold text-blue-600">{user._count.createdProducts}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-8 w-8 text-green-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">Pages Created</p>
                        <p className="text-2xl font-semibold text-green-600">{user._count.createdPages}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <ClockIcon className="h-8 w-8 text-yellow-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">Audit Logs</p>
                        <p className="text-2xl font-semibold text-yellow-600">{user._count.auditLogs}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <ComputerDesktopIcon className="h-8 w-8 text-purple-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">Active Sessions</p>
                        <p className="text-2xl font-semibold text-purple-600">{user._count.sessions}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}      
    {activeTab === 'activity' && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">Recent Activity</h4>
              {user.recentActivity && user.recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {user.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <ClockIcon className="w-4 h-4 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.action}
                        </p>
                        <p className="text-sm text-gray-500">
                          {activity.resource}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatRelativeTime(activity.createdAt)}
                        </p>
                      </div>
                      {activity.details && (
                        <div className="flex-shrink-0">
                          <button className="text-xs text-blue-600 hover:text-blue-800">
                            View Details
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    This user hasn't performed any actions recently.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-gray-900">Security Information</h4>
              
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : securityInfo ? (
                <div className="space-y-6">
                  {/* Security Score */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-sm font-medium text-gray-900">Security Score</h5>
                        <p className="text-xs text-gray-500">Overall account security rating</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getSecurityScoreColor(securityInfo.securityScore)}`}>
                        {securityInfo.securityScore}/100
                      </div>
                    </div>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <h5 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h5>
                          <p className="text-xs text-gray-500">Additional security layer for account access</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {securityInfo.twoFactorEnabled ? (
                          <>
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                            <span className="text-sm text-green-600">Enabled</span>
                          </>
                        ) : (
                          <>
                            <XCircleIcon className="h-5 w-5 text-red-500" />
                            <span className="text-sm text-red-600">Disabled</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Password Information */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3">
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <h5 className="text-sm font-medium text-gray-900">Password</h5>
                        <p className="text-xs text-gray-500">
                          Last changed: {formatDate(securityInfo.lastPasswordChange)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Recent Security Events */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-3">Recent Security Events</h5>
                    {securityInfo.recentActivity.length > 0 ? (
                      <div className="space-y-2">
                        {securityInfo.recentActivity.slice(0, 5).map((event) => (
                          <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                              <span className="text-sm text-gray-900">{event.action}</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatRelativeTime(event.createdAt)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No recent security events</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Unable to load security information</h3>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">Active Sessions</h4>
              
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : securityInfo?.activeSessions && securityInfo.activeSessions.length > 0 ? (
                <div className="space-y-3">
                  {securityInfo.activeSessions.map((session) => (
                    <div key={session.id} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <ComputerDesktopIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900">
                            {session.userAgent || 'Unknown Device'}
                          </p>
                          {session.isActive && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          IP: {session.ipAddress || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-400">
                          Created: {formatDate(session.createdAt)}
                        </p>
                        <p className="text-xs text-gray-400">
                          Expires: {formatDate(session.expiresAt)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Handle session termination
                            showNotification('Session terminated')
                          }}
                        >
                          Terminate
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ComputerDesktopIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No active sessions</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    This user has no active sessions.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}