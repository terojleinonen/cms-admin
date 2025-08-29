'use client'

/**
 * Security Monitoring Component
 * Admin interface for monitoring user security and suspicious activities
 */

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  ShieldExclamationIcon,
  LockClosedIcon,
  LockOpenIcon,
  ArrowRightOnRectangleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface SecurityData {
  user: {
    id: string
    email: string
    name: string
    isActive: boolean
    lastLoginAt: string | null
    twoFactorEnabled: boolean
  }
  securityScore: {
    score: number
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  }
  suspiciousActivity: Array<{
    type: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    details: Record<string, any>
    timestamp: string
  }>
  sessionStatistics: {
    activeSessions: number
    totalSessions: number
    recentLogins: number
    lastLogin: string | null
  }
  passwordResetStatistics: {
    requests: number
    completions: number
    rateLimited: number
    successRate: number
  }
  recentSecurityEvents: Array<{
    id: string
    action: string
    details: Record<string, any>
    ipAddress: string | null
    createdAt: string
  }>
  recommendations: string[]
}

interface SecurityMonitoringProps {
  userId: string
}

export default function SecurityMonitoring({ userId }: SecurityMonitoringProps) {
  const { data: session } = useSession()
  const [securityData, setSecurityData] = useState<SecurityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchSecurityData()
    }
  }, [userId, session])

  const fetchSecurityData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/users/${userId}/security/monitoring`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch security data')
      }

      const data = await response.json()
      setSecurityData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSecurityAction = async (action: string, reason?: string) => {
    try {
      setActionLoading(action)
      const response = await fetch(`/api/users/${userId}/security/monitoring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason })
      })

      if (!response.ok) {
        throw new Error('Failed to perform security action')
      }

      const result = await response.json()
      await fetchSecurityData()
      
      alert(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(null)
    }
  }

  const getScoreColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'text-green-600 bg-green-50'
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50'
      case 'LOW': return 'text-orange-600 bg-orange-50'
      case 'CRITICAL': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'text-yellow-600 bg-yellow-50'
      case 'MEDIUM': return 'text-orange-600 bg-orange-50'
      case 'HIGH': return 'text-red-600 bg-red-50'
      case 'CRITICAL': return 'text-red-800 bg-red-100'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (session?.user?.role !== 'ADMIN') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Access Denied</h3>
            <p className="mt-1 text-sm text-red-700">
              You need administrator privileges to view security monitoring.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-32 bg-gray-200 rounded-lg"></div>
        <div className="h-48 bg-gray-200 rounded-lg"></div>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={fetchSecurityData}
              className="mt-2 text-sm text-red-600 hover:text-red-500"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!securityData) {
    return <div>No security data available</div>
  }

  return (
    <div className="space-y-6">
      {/* User Overview & Security Score */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{securityData.user.name}</h3>
            <p className="text-sm text-gray-500">{securityData.user.email}</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(securityData.securityScore.level)}`}>
              Security Score: {securityData.securityScore.score}/100 ({securityData.securityScore.level})
            </span>
            {securityData.user.twoFactorEnabled ? (
              <CheckCircleIcon className="h-5 w-5 text-green-500" title="2FA Enabled" />
            ) : (
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" title="2FA Disabled" />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{securityData.sessionStatistics.activeSessions}</div>
            <div className="text-sm text-gray-500">Active Sessions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{securityData.passwordResetStatistics.requests}</div>
            <div className="text-sm text-gray-500">Password Resets</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{securityData.suspiciousActivity.length}</div>
            <div className="text-sm text-gray-500">Security Alerts</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-900">
              {securityData.user.lastLoginAt 
                ? new Date(securityData.user.lastLoginAt).toLocaleDateString()
                : 'Never'
              }
            </div>
            <div className="text-sm text-gray-500">Last Login</div>
          </div>
        </div>
      </div>

      {/* Security Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Security Actions</h3>
        <div className="flex flex-wrap gap-3">
          {securityData.user.isActive ? (
            <button
              onClick={() => handleSecurityAction('lock_account', 'Manual lock by administrator')}
              disabled={actionLoading === 'lock_account'}
              className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              <LockClosedIcon className="h-4 w-4 mr-2" />
              {actionLoading === 'lock_account' ? 'Locking...' : 'Lock Account'}
            </button>
          ) : (
            <button
              onClick={() => handleSecurityAction('unlock_account', 'Manual unlock by administrator')}
              disabled={actionLoading === 'unlock_account'}
              className="inline-flex items-center px-3 py-2 border border-green-300 shadow-sm text-sm leading-4 font-medium rounded-md text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              <LockOpenIcon className="h-4 w-4 mr-2" />
              {actionLoading === 'unlock_account' ? 'Unlocking...' : 'Unlock Account'}
            </button>
          )}
          
          <button
            onClick={() => handleSecurityAction('force_logout', 'Force logout by administrator')}
            disabled={actionLoading === 'force_logout'}
            className="inline-flex items-center px-3 py-2 border border-orange-300 shadow-sm text-sm leading-4 font-medium rounded-md text-orange-700 bg-white hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
            {actionLoading === 'force_logout' ? 'Logging out...' : 'Force Logout'}
          </button>
        </div>
      </div>

      {/* Suspicious Activity */}
      {securityData.suspiciousActivity.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Suspicious Activity</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {securityData.suspiciousActivity.map((activity, index) => (
              <div key={index} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <ShieldExclamationIcon className="h-6 w-6 text-red-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {activity.type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                      {activity.details && (
                        <p className="text-sm text-gray-600 mt-1">
                          {JSON.stringify(activity.details, null, 2)}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(activity.severity)}`}>
                    {activity.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Security Events */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Security Events</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {securityData.recentSecurityEvents.slice(0, 10).map((event) => (
            <div key={event.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <ClockIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {event.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(event.createdAt).toLocaleString()}
                      {event.ipAddress && ` • IP: ${event.ipAddress}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {securityData.recentSecurityEvents.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              No recent security events
            </div>
          )}
        </div>
      </div>

      {/* Security Recommendations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-3">Security Recommendations</h3>
        <ul className="space-y-2">
          {securityData.recommendations.map((recommendation, index) => (
            <li key={index} className="flex items-start space-x-2">
              <CheckCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-blue-800">{recommendation}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}