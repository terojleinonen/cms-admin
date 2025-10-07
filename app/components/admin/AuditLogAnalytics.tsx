'use client'

/**
 * Audit Log Analytics Component
 * Comprehensive audit log analysis and reporting dashboard
 */

import { useState, useEffect, useMemo } from 'react'
import {
  ChartBarIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  UserIcon,
  ClockIcon,
  EyeIcon,
  FunnelIcon,
  CalendarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

interface AuditAnalysis {
  timeline: Array<{
    period: string
    totalActions: number
    failedActions: number
    securityEvents: number
    uniqueUsers: number
  }>
  topUsers: Array<{
    userId: string
    userName: string
    userEmail: string
    actionCount: number
    failedActions: number
    lastActivity: Date
  }>
  actionDistribution: Array<{
    action: string
    count: number
    percentage: number
  }>
  resourceAccess: Array<{
    resource: string
    reads: number
    writes: number
    deletes: number
    total: number
  }>
  securityMetrics: {
    totalSecurityEvents: number
    criticalEvents: number
    suspiciousActivities: number
    permissionViolations: number
    accountLockouts: number
  }
  complianceMetrics: {
    dataAccess: number
    dataModification: number
    dataExport: number
    adminActions: number
    userManagement: number
  }
}

interface SecurityAlert {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  count: number
  users: string[]
  lastOccurrence: Date
}

interface SecurityIncidents {
  totalIncidents: number
  criticalIncidents: number
  topThreats: Array<{ type: string; count: number }>
  affectedUsers: Array<{ userId: string; count: number }>
  recentIncidents: Array<{
    id: string
    action: string
    userId: string
    createdAt: string
    user: {
      name: string
      email: string
    }
  }>
}

export default function AuditLogAnalytics() {
  const [analysis, setAnalysis] = useState<AuditAnalysis | null>(null)
  const [alerts, setAlerts] = useState<SecurityAlert[]>([])
  const [incidents, setIncidents] = useState<SecurityIncidents | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Filter state
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })
  const [groupBy, setGroupBy] = useState<'hour' | 'day' | 'week'>('day')
  const [selectedTab, setSelectedTab] = useState<'overview' | 'timeline' | 'users' | 'security' | 'compliance'>('overview')

  // Fetch audit analysis data
  const fetchAnalysis = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      setError(null)

      const [analysisResponse, alertsResponse] = await Promise.all([
        fetch(`/api/audit-logs/analysis?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&groupBy=${groupBy}`),
        fetch('/api/audit-logs/security-alerts?days=7'),
      ])

      if (!analysisResponse.ok || !alertsResponse.ok) {
        throw new Error('Failed to fetch audit analysis data')
      }

      const analysisData = await analysisResponse.json()
      const alertsData = await alertsResponse.json()

      setAnalysis(analysisData.data)
      setAlerts(alertsData.data.alerts)
      setIncidents(alertsData.data.incidents)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit analysis')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAnalysis()
  }, [dateRange, groupBy])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAnalysis(false)
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [dateRange, groupBy])

  // Export compliance report
  const exportComplianceReport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch('/api/audit-logs/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          format,
          includeFailures: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to export compliance report')
      }

      if (format === 'csv') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `compliance-report-${dateRange.startDate}-${dateRange.endDate}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `compliance-report-${dateRange.startDate}-${dateRange.endDate}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report')
    }
  }

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-green-600 bg-green-100'
    }
  }

  // Calculate timeline metrics
  const timelineMetrics = useMemo(() => {
    if (!analysis?.timeline) return null

    const totalActions = analysis.timeline.reduce((sum, item) => sum + item.totalActions, 0)
    const totalFailures = analysis.timeline.reduce((sum, item) => sum + item.failedActions, 0)
    const totalSecurityEvents = analysis.timeline.reduce((sum, item) => sum + item.securityEvents, 0)
    const avgUsersPerPeriod = analysis.timeline.reduce((sum, item) => sum + item.uniqueUsers, 0) / analysis.timeline.length

    return {
      totalActions,
      totalFailures,
      totalSecurityEvents,
      avgUsersPerPeriod: Math.round(avgUsersPerPeriod),
      failureRate: totalActions > 0 ? ((totalFailures / totalActions) * 100).toFixed(2) : '0',
    }
  }, [analysis])

  if (loading && !refreshing) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log Analytics</h1>
          <p className="text-gray-600">Comprehensive audit trail analysis and security monitoring</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => fetchAnalysis(false)}
            disabled={refreshing}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <div className="relative">
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'hour' | 'day' | 'week')}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="hour">Hourly</option>
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
            </select>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => exportComplianceReport('csv')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={() => exportComplianceReport('json')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5 text-gray-400" />
            <label className="text-sm font-medium text-gray-700">Date Range:</label>
          </div>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Security Alerts */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
            <h3 className="text-lg font-medium text-red-800">Security Alerts</h3>
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 3).map((alert, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(alert.severity)}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                  <span className="ml-3 text-sm text-red-700">{alert.message}</span>
                </div>
                <span className="text-xs text-red-500">
                  {new Date(alert.lastOccurrence).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center text-sm text-red-700">
            <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
            {error}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: ChartBarIcon },
            { id: 'timeline', name: 'Timeline', icon: ClockIcon },
            { id: 'users', name: 'User Activity', icon: UserIcon },
            { id: 'security', name: 'Security', icon: ShieldCheckIcon },
            { id: 'compliance', name: 'Compliance', icon: EyeIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`${
                selectedTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {analysis && (
        <div className="space-y-6">
          {/* Overview Tab */}
          {selectedTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <ChartBarIcon className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Actions</p>
                    <p className="text-2xl font-bold text-gray-900">{timelineMetrics?.totalActions || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Failed Actions</p>
                    <p className="text-2xl font-bold text-gray-900">{timelineMetrics?.totalFailures || 0}</p>
                    <p className="text-xs text-gray-500">{timelineMetrics?.failureRate}% failure rate</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <ShieldCheckIcon className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Security Events</p>
                    <p className="text-2xl font-bold text-gray-900">{analysis.securityMetrics.totalSecurityEvents}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <UserIcon className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Users</p>
                    <p className="text-2xl font-bold text-gray-900">{timelineMetrics?.avgUsersPerPeriod || 0}</p>
                    <p className="text-xs text-gray-500">avg per {groupBy}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {selectedTab === 'timeline' && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Activity Timeline</h3>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Period
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Actions
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Failed Actions
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Security Events
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unique Users
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analysis.timeline.map((item, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.period}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.totalActions}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={item.failedActions > 0 ? 'text-red-600' : 'text-gray-500'}>
                              {item.failedActions}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={item.securityEvents > 0 ? 'text-orange-600' : 'text-gray-500'}>
                              {item.securityEvents}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.uniqueUsers}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {selectedTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Users */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Most Active Users</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {analysis.topUsers.slice(0, 10).map((user, index) => (
                      <div key={user.userId} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                            {index + 1}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{user.userName}</div>
                            <div className="text-sm text-gray-500">{user.userEmail}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{user.actionCount} actions</div>
                          {user.failedActions > 0 && (
                            <div className="text-sm text-red-600">{user.failedActions} failed</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Distribution */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Action Distribution</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {analysis.actionDistribution.slice(0, 10).map((action) => (
                      <div key={action.action} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">
                              {action.action.replace(/\./g, ' → ').replace(/_/g, ' ')}
                            </span>
                            <span className="text-sm text-gray-500">{action.count}</span>
                          </div>
                          <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-indigo-600 h-2 rounded-full"
                              style={{ width: `${action.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {selectedTab === 'security' && (
            <div className="space-y-6">
              {/* Security Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{analysis.securityMetrics.totalSecurityEvents}</div>
                    <div className="text-sm text-gray-600">Total Security Events</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{analysis.securityMetrics.criticalEvents}</div>
                    <div className="text-sm text-gray-600">Critical Events</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{analysis.securityMetrics.suspiciousActivities}</div>
                    <div className="text-sm text-gray-600">Suspicious Activities</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{analysis.securityMetrics.permissionViolations}</div>
                    <div className="text-sm text-gray-600">Permission Violations</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{analysis.securityMetrics.accountLockouts}</div>
                    <div className="text-sm text-gray-600">Account Lockouts</div>
                  </div>
                </div>
              </div>

              {/* Recent Security Incidents */}
              {incidents && incidents.recentIncidents.length > 0 && (
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Recent Security Incidents</h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {incidents.recentIncidents.slice(0, 10).map((incident) => (
                        <div key={incident.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                          <div className="flex items-center">
                            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {incident.action.replace(/\./g, ' → ').replace(/_/g, ' ')}
                              </div>
                              <div className="text-sm text-gray-500">
                                {incident.user.name} ({incident.user.email})
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(incident.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Compliance Tab */}
          {selectedTab === 'compliance' && (
            <div className="space-y-6">
              {/* Compliance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{analysis.complianceMetrics.dataAccess}</div>
                    <div className="text-sm text-gray-600">Data Access</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{analysis.complianceMetrics.dataModification}</div>
                    <div className="text-sm text-gray-600">Data Modification</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{analysis.complianceMetrics.dataExport}</div>
                    <div className="text-sm text-gray-600">Data Export</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{analysis.complianceMetrics.adminActions}</div>
                    <div className="text-sm text-gray-600">Admin Actions</div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{analysis.complianceMetrics.userManagement}</div>
                    <div className="text-sm text-gray-600">User Management</div>
                  </div>
                </div>
              </div>

              {/* Resource Access Patterns */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Resource Access Patterns</h3>
                </div>
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Resource
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Reads
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Writes
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Deletes
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {analysis.resourceAccess.map((resource) => (
                          <tr key={resource.resource}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {resource.resource}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                              {resource.reads}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                              {resource.writes}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                              {resource.deletes}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {resource.total}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}