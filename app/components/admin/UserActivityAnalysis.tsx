'use client'

/**
 * User Activity Analysis Component
 * Detailed analysis of user behavior patterns and risk assessment
 */

import { useState, useEffect } from 'react'
import {
  UserIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  GlobeAltIcon,
  ComputerDesktopIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'

interface UserActivityReport {
  userId: string
  userName: string
  userEmail: string
  userRole: string
  totalActions: number
  loginCount: number
  failedLoginCount: number
  resourcesAccessed: string[]
  riskScore: number
  lastActivity: Date
  activityTimeline: Array<{
    date: string
    actionCount: number
    actions: Record<string, number>
  }>
}

interface ActivityPattern {
  type: 'normal' | 'suspicious' | 'anomalous'
  description: string
  severity: 'low' | 'medium' | 'high'
  recommendations: string[]
}

export function UserActivityAnalysis() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userActivity, setUserActivity] = useState<UserActivityReport[]>([])
  const [selectedUser, setSelectedUser] = useState<UserActivityReport | null>(null)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })
  const [sortBy, setSortBy] = useState<'riskScore' | 'totalActions' | 'lastActivity'>('riskScore')
  const [filterRole, setFilterRole] = useState<string>('all')

  useEffect(() => {
    fetchUserActivity()
  }, [dateRange])

  const fetchUserActivity = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/admin/compliance?type=user-activity&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch user activity data')
      }
      
      const data = await response.json()
      setUserActivity(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user activity data')
    } finally {
      setLoading(false)
    }
  }

  const analyzeUserPattern = (user: UserActivityReport): ActivityPattern => {
    const patterns: ActivityPattern[] = []

    // High failed login rate
    if (user.failedLoginCount > 5) {
      patterns.push({
        type: 'suspicious',
        description: `High number of failed login attempts (${user.failedLoginCount})`,
        severity: 'high',
        recommendations: [
          'Review account security',
          'Consider enabling two-factor authentication',
          'Monitor for brute force attacks',
        ],
      })
    }

    // Excessive resource access
    if (user.resourcesAccessed.length > 15) {
      patterns.push({
        type: 'anomalous',
        description: `Accessing unusually high number of resources (${user.resourcesAccessed.length})`,
        severity: 'medium',
        recommendations: [
          'Review user permissions',
          'Verify legitimate business need',
          'Consider role-based access restrictions',
        ],
      })
    }

    // High activity volume
    if (user.totalActions > 1000) {
      patterns.push({
        type: 'anomalous',
        description: `Very high activity volume (${user.totalActions} actions)`,
        severity: 'medium',
        recommendations: [
          'Verify automated vs manual activity',
          'Check for potential bot behavior',
          'Review activity patterns',
        ],
      })
    }

    // Return the most severe pattern or normal
    const severityOrder = { high: 3, medium: 2, low: 1 }
    const mostSevere = patterns.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity])[0]

    return mostSevere || {
      type: 'normal',
      description: 'Normal activity pattern detected',
      severity: 'low',
      recommendations: ['Continue regular monitoring'],
    }
  }

  const getRiskScoreColor = (score: number) => {
    if (score >= 70) return 'text-red-600 bg-red-100'
    if (score >= 40) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const getPatternColor = (type: string) => {
    switch (type) {
      case 'suspicious': return 'text-red-600 bg-red-100'
      case 'anomalous': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-green-600 bg-green-100'
    }
  }

  const filteredAndSortedUsers = userActivity
    .filter(user => filterRole === 'all' || user.userRole === filterRole)
    .sort((a, b) => {
      switch (sortBy) {
        case 'riskScore':
          return b.riskScore - a.riskScore
        case 'totalActions':
          return b.totalActions - a.totalActions
        case 'lastActivity':
          return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
        default:
          return 0
      }
    })

  const uniqueRoles = [...new Set(userActivity.map(user => user.userRole))]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Activity Analysis</h1>
          <p className="text-gray-600">Analyze user behavior patterns and identify potential risks</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Date Range */}
          <div className="flex items-center space-x-2">
            <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Filters and Sorting */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Role</label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="all">All Roles</option>
                {uniqueRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="riskScore">Risk Score</option>
                <option value="totalActions">Total Actions</option>
                <option value="lastActivity">Last Activity</option>
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            Showing {filteredAndSortedUsers.length} of {userActivity.length} users
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User List */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                User Activity Overview
              </h3>
              
              <div className="space-y-4">
                {filteredAndSortedUsers.map((user) => {
                  const pattern = analyzeUserPattern(user)
                  
                  return (
                    <div
                      key={user.userId}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedUser?.userId === user.userId 
                          ? 'border-indigo-500 bg-indigo-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <UserIcon className="h-8 w-8 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.userName}</div>
                            <div className="text-sm text-gray-500">{user.userEmail}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {user.userRole}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskScoreColor(user.riskScore)}`}>
                            Risk: {user.riskScore}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Actions:</span>
                          <span className="ml-1 font-medium">{user.totalActions.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Failed Logins:</span>
                          <span className="ml-1 font-medium">{user.failedLoginCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Resources:</span>
                          <span className="ml-1 font-medium">{user.resourcesAccessed.length}</span>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPatternColor(pattern.type)}`}>
                          {pattern.description}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* User Detail Panel */}
        <div className="lg:col-span-1">
          {selectedUser ? (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  User Details
                </h3>
                
                <div className="space-y-4">
                  {/* User Info */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">User Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Name:</span>
                        <span className="font-medium">{selectedUser.userName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email:</span>
                        <span className="font-medium">{selectedUser.userEmail}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Role:</span>
                        <span className="font-medium">{selectedUser.userRole}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Last Activity:</span>
                        <span className="font-medium">
                          {new Date(selectedUser.lastActivity).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Activity Metrics */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Activity Metrics</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500">Total Actions</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {selectedUser.totalActions.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500">Login Count</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {selectedUser.loginCount}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500">Failed Logins</div>
                        <div className="text-lg font-semibold text-red-600">
                          {selectedUser.failedLoginCount}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500">Risk Score</div>
                        <div className={`text-lg font-semibold ${
                          selectedUser.riskScore >= 70 ? 'text-red-600' :
                          selectedUser.riskScore >= 40 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {selectedUser.riskScore}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resources Accessed */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Resources Accessed</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedUser.resourcesAccessed.map((resource, idx) => (
                        <span
                          key={idx}
                          className="inline-flex px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800"
                        >
                          {resource}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Pattern Analysis */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Pattern Analysis</h4>
                    {(() => {
                      const pattern = analyzeUserPattern(selectedUser)
                      return (
                        <div className="space-y-2">
                          <div className={`p-3 rounded-lg ${
                            pattern.type === 'suspicious' ? 'bg-red-50 border border-red-200' :
                            pattern.type === 'anomalous' ? 'bg-yellow-50 border border-yellow-200' :
                            'bg-green-50 border border-green-200'
                          }`}>
                            <div className="flex items-center mb-1">
                              <ExclamationTriangleIcon className={`h-4 w-4 mr-1 ${
                                pattern.type === 'suspicious' ? 'text-red-500' :
                                pattern.type === 'anomalous' ? 'text-yellow-500' :
                                'text-green-500'
                              }`} />
                              <span className="text-sm font-medium">{pattern.description}</span>
                            </div>
                            <div className="text-xs text-gray-600">
                              <strong>Recommendations:</strong>
                              <ul className="list-disc list-inside mt-1">
                                {pattern.recommendations.map((rec, idx) => (
                                  <li key={idx}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Activity Timeline */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Activity Timeline</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {selectedUser.activityTimeline.slice(-7).map((day, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">{day.date}</span>
                          <span className="font-medium">{day.actionCount} actions</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="text-center text-gray-500">
                  <UserIcon className="h-12 w-12 mx-auto mb-2" />
                  <p>Select a user to view detailed analysis</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}