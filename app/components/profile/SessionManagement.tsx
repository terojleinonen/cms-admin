'use client'

/**
 * Session Management Component
 * Displays and manages user sessions with security features
 */

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  ComputerDesktopIcon, 
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface SessionInfo {
  id: string
  userId: string
  token: string
  expiresAt: string
  ipAddress: string | null
  userAgent: string | null
  isActive: boolean
  createdAt: string
  isCurrent?: boolean
}

interface SessionStatistics {
  activeSessions: number
  totalSessions: number
  recentLogins: number
  lastLogin: string | null
}

interface SuspiciousActivity {
  type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  details: Record<string, unknown>
  timestamp: string
}

interface SessionData {
  sessions: SessionInfo[]
  statistics: SessionStatistics
  suspiciousActivity: SuspiciousActivity[]
  hasSecurityConcerns: boolean
}

export default function SessionManagement() {
  const { data: session } = useSession()
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user?.id) {
      fetchSessionData()
    }
  }, [session, fetchSessionData])

  const fetchSessionData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/users/${session?.user?.id}/sessions`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch session data')
      }

      const data = await response.json()
      setSessionData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  const handleLogoutAllDevices = async () => {
    try {
      setActionLoading('logout_all')
      const response = await fetch(`/api/users/${session?.user?.id}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'logout_all',
          currentSessionToken: session?.user?.sessionToken
        })
      })

      if (!response.ok) {
        throw new Error('Failed to logout from all devices')
      }

      const result = await response.json()
      await fetchSessionData()
      
      // Show success message
      alert(`Successfully logged out from ${result.invalidatedSessions} devices`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(null)
    }
  }

  const handleInvalidateSession = async (sessionId: string) => {
    try {
      setActionLoading(sessionId)
      const response = await fetch(`/api/users/${session?.user?.id}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'invalidate_session',
          sessionId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to invalidate session')
      }

      await fetchSessionData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(null)
    }
  }

  const getDeviceIcon = (userAgent: string | null) => {
    if (!userAgent) return ComputerDesktopIcon
    
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent)
    return isMobile ? DevicePhoneMobileIcon : ComputerDesktopIcon
  }

  const getDeviceInfo = (userAgent: string | null) => {
    if (!userAgent) return 'Unknown Device'
    
    // Simple device detection
    if (userAgent.includes('Chrome')) return 'Chrome Browser'
    if (userAgent.includes('Firefox')) return 'Firefox Browser'
    if (userAgent.includes('Safari')) return 'Safari Browser'
    if (userAgent.includes('Edge')) return 'Edge Browser'
    
    return 'Unknown Browser'
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

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
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
              type="button"
              onClick={fetchSessionData}
              className="mt-2 text-sm text-red-600 hover:text-red-500"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!sessionData) {
    return <div>No session data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Security Alerts */}
      {sessionData.hasSecurityConcerns && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Security Concerns Detected
              </h3>
              <div className="mt-2 space-y-2">
                {sessionData.suspiciousActivity.map((activity, index) => (
                  <div key={index} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(activity.severity)}`}>
                    {activity.type.replace(/_/g, ' ')} - {activity.severity}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Statistics */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Session Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{sessionData.statistics.activeSessions}</div>
            <div className="text-sm text-gray-500">Active Sessions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{sessionData.statistics.totalSessions}</div>
            <div className="text-sm text-gray-500">Total Sessions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{sessionData.statistics.recentLogins}</div>
            <div className="text-sm text-gray-500">Recent Logins</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-900">
              {sessionData.statistics.lastLogin 
                ? new Date(sessionData.statistics.lastLogin).toLocaleDateString()
                : 'Never'
              }
            </div>
            <div className="text-sm text-gray-500">Last Login</div>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Active Sessions</h3>
            <button
              type="button"
              onClick={handleLogoutAllDevices}
              disabled={actionLoading === 'logout_all'}
              className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {actionLoading === 'logout_all' ? 'Logging out...' : 'Logout All Devices'}
            </button>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {sessionData.sessions.map((session) => {
            const DeviceIcon = getDeviceIcon(session.userAgent)
            
            return (
              <div key={session.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <DeviceIcon className="h-6 w-6 text-gray-400" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900">
                          {getDeviceInfo(session.userAgent)}
                        </p>
                        {session.isCurrent && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <ShieldCheckIcon className="h-3 w-3 mr-1" />
                            Current Session
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {session.ipAddress && (
                          <span>IP: {session.ipAddress} • </span>
                        )}
                        Created: {new Date(session.createdAt).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        Expires: {new Date(session.expiresAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  {!session.isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleInvalidateSession(session.id)}
                      disabled={actionLoading === session.id}
                      className="inline-flex items-center p-1 border border-transparent rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      title="End this session"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          
          {sessionData.sessions.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              No active sessions found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}