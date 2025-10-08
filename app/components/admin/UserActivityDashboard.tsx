'use client'

/**
 * Enhanced User Activity Monitoring Dashboard
 * Real-time user activity monitoring with permission analytics and behavior analysis
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  UserIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  GlobeAltIcon,
  ComputerDesktopIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ShieldCheckIcon,
  BellIcon,
  CpuChipIcon,
  MapIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  UsersIcon,
  LockClosedIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ErrorMessage } from '../ui/ErrorMessage'

interface UserActivityMetrics {
  totalUsers: number
  activeUsers: number
  onlineUsers: number
  totalSessions: number
  averageSessionDuration: number
  totalActions: number
  actionsPerMinute: number
  failedActions: number
  securityAlerts: number
  permissionDenials: number
  topResources: Array<{
    resource: string
    accessCount: number
    uniqueUsers: number
  }>
  topActions: Array<{
    action: string
    count: number
    successRate: number
  }>
  riskDistribution: {
    low: number
    medium: number
    high: number
    critical: number
  }
  geographicDistribution: Array<{
    country: string
    city: string
    userCount: number
    sessionCount: number
  }>
  deviceDistribution: Array<{
    device: string
    count: number
    percentage: number
  }>
  hourlyActivity: Array<{
    hour: number
    actionCount: number
    userCount: number
  }>
}

interface UserActivityAlert {
  id: string
  type: 'security' | 'performance' | 'compliance' | 'anomaly'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  userId?: string
  userName?: string
  timestamp: Date
  acknowledged: boolean
  details: Record<string, any>
}

interface PermissionUsageStats {
  totalPermissionChecks: number
  permissionCheckRate: number
  cacheHitRate: number
  averageCheckLatency: number
  topPermissions: Array<{
    resource: string
    action: string
    checkCount: number
    denialRate: number
    averageLatency: number
  }>
  roleUsage: Array<{
    role: string
    userCount: number
    activeUsers: number
    permissionChecks: number
  }>
  resourceAccess: Array<{
    resource: string
    totalAccess: number
    uniqueUsers: number
    denialRate: number
  }>
}

interface UserBehaviorPattern {
  userId: string
  userName: string
  userEmail: string
  userRole: string
  pattern: 'normal' | 'suspicious' | 'anomalous' | 'high_risk'
  riskScore: number
  confidence: number
  indicators: string[]
  recommendations: string[]
  lastAnalyzed: Date
  trends: {
    activityTrend: 'increasing' | 'decreasing' | 'stable'
    riskTrend: 'increasing' | 'decreasing' | 'stable'
    accessPatternChange: boolean
  }
}

export default function UserActivityDashboard() {
  const [metrics, setMetrics] = useState<UserActivityMetrics | null>(null)
  const [alerts, setAlerts] = useState<UserActivityAlert[]>([])
  const [permissionStats, setPermissionStats] = useState<PermissionUsageStats | null>(null)
  const [behaviorPatterns, setBehaviorPatterns] = useState<UserBehaviorPattern[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h')
  const [selectedView, setSelectedView] = useState<'overview' | 'permissions' | 'behavior' | 'alerts'>('overview')
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      setError(null)

      const [metricsRes, alertsRes, permissionsRes, behaviorRes] = await Promise.all([
        fetch(`/api/admin/user-activity/metrics?timeRange=${selectedTimeRange}`),
        fetch(`/api/admin/user-activity/alerts?limit=50`),
        fetch(`/api/admin/user-activity/permissions?timeRange=${selectedTimeRange}`),
        fetch(`/api/admin/user-activity/behavior?timeRange=${selectedTimeRange}`)
      ])

      if (!metricsRes.ok || !alertsRes.ok || !permissionsRes.ok || !behaviorRes.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const [metricsData, alertsData, permissionsData, behaviorData] = await Promise.all([
        metricsRes.json(),
        alertsRes.json(),
        permissionsRes.json(),
        behaviorRes.json()
      ])

      setMetrics(metricsData.data)
      setAlerts(alertsData.data)
      setPermissionStats(permissionsData.data)
      setBehaviorPatterns(behaviorData.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedTimeRange])

  // Initial load
  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchDashboardData(false)
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [fetchDashboardData, autoRefresh])

  // Acknowledge alert
  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/admin/user-activity/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledged: true })
      })

      if (response.ok) {
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        ))
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err)
    }
  }

  // Export data
  const exportData = async (type: 'metrics' | 'alerts' | 'permissions' | 'behavior') => {
    try {
      const response = await fetch(`/api/admin/user-activity/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type, 
          timeRange: selectedTimeRange,
          format: 'csv'
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `user-activity-${type}-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (err) {
      console.error('Failed to export data:', err)
    }
  }

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200'
      default: return 'text-green-600 bg-green-100 border-green-200'
    }
  }

  // Get pattern color
  const getPatternColor = (pattern: string) => {
    switch (pattern) {
      case 'high_risk': return 'text-red-600 bg-red-100'
      case 'suspicious': return 'text-orange-600 bg-orange-100'
      case 'anomalous': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-green-600 bg-green-100'
    }
  }

  // Get trend icon
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUpIcon className="h-4 w-4 text-green-500" />
      case 'decreasing': return <TrendingDownIcon className="h-4 w-4 text-red-500" />
      default: return <div className="h-4 w-4 bg-gray-300 rounded-full" />
    }
  }

  if (loading && !refreshing) {
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
          <h1 className="text-2xl font-bold text-gray-900">User Activity Dashboard</h1>
          <p className="text-gray-600">Real-time monitoring and analytics for user behavior and permissions</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Time Range Selector */}
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          {/* Auto Refresh Toggle */}
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Auto-refresh</span>
          </label>

          {/* Refresh Button */}
          <button
            onClick={() => fetchDashboardData(false)}
            disabled={refreshing}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* View Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: ChartBarIcon },
            { id: 'permissions', name: 'Permissions', icon: LockClosedIcon },
            { id: 'behavior', name: 'Behavior Analysis', icon: CpuChipIcon },
            { id: 'alerts', name: 'Security Alerts', icon: BellIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedView(tab.id as any)}
              className={`${
                selectedView === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.name}
              {tab.id === 'alerts' && alerts.filter(a => !a.acknowledged).length > 0 && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {alerts.filter(a => !a.acknowledged).length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {selectedView === 'overview' && metrics && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UsersIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {metrics.activeUsers} / {metrics.totalUsers}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <span className="text-green-600 font-medium">{metrics.onlineUsers}</span>
                  <span className="text-gray-500"> online now</span>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ChartBarIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Actions/Min</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {metrics.actionsPerMinute.toFixed(1)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <span className="text-gray-600">{metrics.totalActions.toLocaleString()}</span>
                  <span className="text-gray-500"> total actions</span>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Security Alerts</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {metrics.securityAlerts}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <span className="text-red-600 font-medium">{metrics.permissionDenials}</span>
                  <span className="text-gray-500"> permission denials</span>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ClockIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Avg Session</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {Math.round(metrics.averageSessionDuration / 60)}m
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <span className="text-gray-600">{metrics.totalSessions}</span>
                  <span className="text-gray-500"> total sessions</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts and Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Resources */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Most Accessed Resources
                </h3>
                <div className="space-y-3">
                  {metrics.topResources.slice(0, 5).map((resource, index) => (
                    <div key={resource.resource} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-indigo-600">{index + 1}</span>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{resource.resource}</p>
                          <p className="text-sm text-gray-500">{resource.uniqueUsers} unique users</p>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {resource.accessCount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Risk Distribution */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  User Risk Distribution
                </h3>
                <div className="space-y-3">
                  {Object.entries(metrics.riskDistribution).map(([level, count]) => (
                    <div key={level} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          level === 'critical' ? 'bg-red-500' :
                          level === 'high' ? 'bg-orange-500' :
                          level === 'medium' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`} />
                        <span className="text-sm font-medium text-gray-900 capitalize">{level} Risk</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Hourly Activity Chart */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Activity by Hour
                </h3>
                <button
                  onClick={() => exportData('metrics')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Export
                </button>
              </div>
              <div className="mt-4">
                <div className="flex items-end space-x-1 h-32">
                  {metrics.hourlyActivity.map((hour) => (
                    <div
                      key={hour.hour}
                      className="flex-1 bg-indigo-200 rounded-t"
                      style={{
                        height: `${(hour.actionCount / Math.max(...metrics.hourlyActivity.map(h => h.actionCount))) * 100}%`
                      }}
                      title={`Hour ${hour.hour}: ${hour.actionCount} actions, ${hour.userCount} users`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>23:59</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Tab */}
      {selectedView === 'permissions' && permissionStats && (
        <div className="space-y-6">
          {/* Permission Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <LockClosedIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Permission Checks</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {permissionStats.totalPermissionChecks.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CpuChipIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Cache Hit Rate</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {(permissionStats.cacheHitRate * 100).toFixed(1)}%
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ClockIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Avg Latency</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {permissionStats.averageCheckLatency.toFixed(1)}ms
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ChartBarIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Checks/Min</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {permissionStats.permissionCheckRate.toFixed(1)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Permission Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Permissions */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Most Checked Permissions
                </h3>
                <div className="space-y-3">
                  {permissionStats.topPermissions.slice(0, 5).map((permission, index) => (
                    <div key={`${permission.resource}-${permission.action}`} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {permission.resource}:{permission.action}
                          </p>
                          <p className="text-sm text-gray-500">
                            {(permission.denialRate * 100).toFixed(1)}% denial rate
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {permission.checkCount.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {permission.averageLatency.toFixed(1)}ms avg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Role Usage */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Role Usage Statistics
                </h3>
                <div className="space-y-3">
                  {permissionStats.roleUsage.map((role) => (
                    <div key={role.role} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <UserIcon className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{role.role}</p>
                          <p className="text-sm text-gray-500">
                            {role.activeUsers}/{role.userCount} active
                          </p>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {role.permissionChecks.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Behavior Analysis Tab */}
      {selectedView === 'behavior' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              User Behavior Patterns
            </h3>
            <button
              onClick={() => exportData('behavior')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export Analysis
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {behaviorPatterns.map((pattern) => (
              <div key={pattern.userId} className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <UserIcon className="h-8 w-8 text-gray-400 mr-3" />
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">{pattern.userName}</h4>
                        <p className="text-sm text-gray-500">{pattern.userEmail} • {pattern.userRole}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPatternColor(pattern.pattern)}`}>
                        {pattern.pattern.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        Risk: {pattern.riskScore}/100
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 mr-2">Activity Trend:</span>
                      {getTrendIcon(pattern.trends.activityTrend)}
                      <span className="text-sm font-medium ml-1 capitalize">{pattern.trends.activityTrend}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 mr-2">Risk Trend:</span>
                      {getTrendIcon(pattern.trends.riskTrend)}
                      <span className="text-sm font-medium ml-1 capitalize">{pattern.trends.riskTrend}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 mr-2">Confidence:</span>
                      <span className="text-sm font-medium">{(pattern.confidence * 100).toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Risk Indicators</h5>
                    <div className="flex flex-wrap gap-2">
                      {pattern.indicators.map((indicator, index) => (
                        <span
                          key={index}
                          className="inline-flex px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800"
                        >
                          {indicator}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Recommendations</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {pattern.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-gray-400 mr-2">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 text-xs text-gray-500">
                    Last analyzed: {new Date(pattern.lastAnalyzed).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {selectedView === 'alerts' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Security Alerts
            </h3>
            <button
              onClick={() => exportData('alerts')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export Alerts
            </button>
          </div>

          <div className="space-y-4">
            {alerts.length === 0 ? (
              <div className="text-center py-12">
                <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No security alerts at this time</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)} ${
                    alert.acknowledged ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <ExclamationCircleIcon className="h-5 w-5 mr-2" />
                      <h4 className="text-sm font-medium">{alert.title}</h4>
                      <span className="ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        {alert.type}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                      {!alert.acknowledged && (
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="text-xs text-indigo-600 hover:text-indigo-500"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm mb-2">{alert.message}</p>
                  {alert.userName && (
                    <p className="text-xs text-gray-600">
                      User: {alert.userName}
                    </p>
                  )}
                  {Object.keys(alert.details).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-600 cursor-pointer">View details</summary>
                      <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(alert.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}