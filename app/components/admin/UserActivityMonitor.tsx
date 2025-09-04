'use client'

/**
 * User Activity Monitor Component
 * Displays user activity logs with filtering, search, and real-time updates
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserIcon,
  ComputerDesktopIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { AuditLog, User } from '@/lib/types'

interface AuditLogWithUser extends AuditLog {
  user: Pick<User, 'id' | 'name' | 'email' | 'role'>
}

interface UserActivityMonitorProps {
  userId?: string
  timeRange?: {
    startDate?: Date
    endDate?: Date
  }
  className?: string
}

interface AuditLogFilters {
  userId?: string
  action?: string
  resource?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  startDate?: string
  endDate?: string
  search?: string
  page: number
  limit: number
}

interface AuditLogStats {
  totalLogs: number
  actionBreakdown: Record<string, number>
  resourceBreakdown: Record<string, number>
  severityBreakdown: Record<string, number>
  recentActivity: AuditLogWithUser[]
  securityAlerts: Array<{
    type: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    message: string
    count: number
    users: string[]
    lastOccurrence: Date
  }>
}

const SEVERITY_COLORS = {
  low: 'text-green-600 bg-green-50',
  medium: 'text-yellow-600 bg-yellow-50',
  high: 'text-orange-600 bg-orange-50',
  critical: 'text-red-600 bg-red-50',
}

const SEVERITY_ICONS = {
  low: ShieldCheckIcon,
  medium: ExclamationTriangleIcon,
  high: ExclamationTriangleIcon,
  critical: ExclamationTriangleIcon,
}

export default function UserActivityMonitor({ 
  userId, 
  timeRange, 
  className = '' 
}: UserActivityMonitorProps) {
  const [logs, setLogs] = useState<AuditLogWithUser[]>([])
  const [stats, setStats] = useState<AuditLogStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Filter state
  const [filters, setFilters] = useState<AuditLogFilters>({
    userId,
    startDate: timeRange?.startDate?.toISOString(),
    endDate: timeRange?.endDate?.toISOString(),
    page: 1,
    limit: 20,
  })

  // UI state
  const [showFilters, setShowFilters] = useState(false)
  const [_selectedLogs, _setSelectedLogs] = useState<Set<string>>(new Set())

  // Fetch audit logs
  const fetchLogs = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      setError(null)

      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/admin/audit-logs?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch audit logs')
      }

      setLogs(data.data.logs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filters])

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/audit-logs/stats?days=30')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch statistics')
      }

      setStats(data.data)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchLogs()
    fetchStats()
  }, [fetchLogs, fetchStats])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLogs(false)
      fetchStats()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchLogs, fetchStats])

  // Handle filter changes
  const handleFilterChange = (key: keyof AuditLogFilters, value: unknown) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value, // Reset page when other filters change
    }))
  }

  // Handle search
  const handleSearch = (searchTerm: string) => {
    handleFilterChange('search', searchTerm)
  }

  // Handle export
  const handleExport = async (format: 'json' | 'csv') => {
    try {
      setExporting(true)

      const exportFilters = {
        format,
        userId: filters.userId,
        action: filters.action,
        resource: filters.resource,
        startDate: filters.startDate,
        endDate: filters.endDate,
      }

      const response = await fetch('/api/admin/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportFilters),
      })

      if (!response.ok) {
        throw new Error('Failed to export audit logs')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export audit logs')
    } finally {
      setExporting(false)
    }
  }

  // Format action name for display
  const formatAction = (action: string) => {
    return action
      .split('.')
      .map(part => part.replace(/_/g, ' '))
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' → ')
  }

  // Get severity from log details
  const getSeverity = (log: AuditLogWithUser): 'low' | 'medium' | 'high' | 'critical' => {
    if (
      log.details &&
      typeof log.details === 'object' &&
      'severity' in log.details &&
      typeof log.details.severity === 'string'
    ) {
      const severity = log.details.severity.toLowerCase();
      if (['low', 'medium', 'high', 'critical'].includes(severity)) {
        return severity as 'low' | 'medium' | 'high' | 'critical';
      }
    }
    return 'low'
  }

  // Memoized filtered and sorted logs
  const displayLogs = useMemo(() => {
    return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [logs])

  if (loading && !refreshing) {
    return (
      <div className={`bg-white rounded-lg shadow ${className}`}>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              User Activity Monitor
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Track and monitor user actions and security events
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchLogs(false)}
              disabled={refreshing}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filters
            </button>
            <div className="relative">
              <button
                onClick={() => handleExport('csv')}
                disabled={exporting}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-blue-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total Logs</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalLogs}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center">
                <UserIcon className="h-8 w-8 text-green-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Recent Activity</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.recentActivity.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Security Alerts</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.securityAlerts.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center">
                <ComputerDesktopIcon className="h-8 w-8 text-purple-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Critical Events</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.severityBreakdown.critical || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Alerts */}
      {stats?.securityAlerts && stats.securityAlerts.length > 0 && (
        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
          <h4 className="text-sm font-medium text-red-800 mb-2">Security Alerts</h4>
          <div className="space-y-2">
            {stats.securityAlerts.slice(0, 3).map((alert, index) => (
              <div key={index} className="flex items-center text-sm text-red-700">
                <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                <span>{alert.message}</span>
                <span className="ml-2 text-xs text-red-500">
                  ({new Date(alert.lastOccurrence).toLocaleString()})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search || ''}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search logs..."
                  className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <select
                value={filters.action || ''}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">All Actions</option>
                <option value="auth.login">Login</option>
                <option value="auth.logout">Logout</option>
                <option value="auth.password_changed">Password Changed</option>
                <option value="user.created">User Created</option>
                <option value="user.updated">User Updated</option>
                <option value="user.deleted">User Deleted</option>
                <option value="security.suspicious_activity">Suspicious Activity</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severity
              </label>
              <select
                value={filters.severity || ''}
                onChange={(e) => handleFilterChange('severity', e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
          <div className="flex items-center text-sm text-red-700">
            <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
            {error}
          </div>
        </div>
      )}

      {/* Activity Logs Table */}
      <div className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                    No activity logs found
                  </td>
                </tr>
              ) : (
                displayLogs.map((log) => {
                  const severity = getSeverity(log)
                  const SeverityIcon = SEVERITY_ICONS[severity]
                  
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <UserIcon className="h-4 w-4 text-gray-500" />
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {log.user.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {log.user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatAction(log.action)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.resource}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLORS[severity]}`}>
                          <SeverityIcon className="h-3 w-3 mr-1" />
                          {severity.charAt(0).toUpperCase() + severity.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="max-w-xs truncate">
                          {log.details ? (
                            <details className="cursor-pointer">
                              <summary className="text-indigo-600 hover:text-indigo-500">
                                View details
                              </summary>
                              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </details>
                          ) : (
                            <span className="text-gray-400">No details</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {displayLogs.length} results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleFilterChange('page', Math.max(1, filters.page - 1))}
              disabled={filters.page <= 1}
              className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm text-gray-700">
              Page {filters.page}
            </span>
            <button
              onClick={() => handleFilterChange('page', filters.page + 1)}
              disabled={displayLogs.length < filters.limit}
              className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}