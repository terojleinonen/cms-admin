'use client'

import { useState, useEffect } from 'react'
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon,
  ClockIcon,
  CpuChipIcon,
  CircleStackIcon,
  ServerIcon,
  BellIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { SystemHealthMetrics, SystemAlert } from '@/app/lib/system-health-monitor'

interface SystemHealthDashboardProps {
  className?: string
}

export default function SystemHealthDashboard({ className = '' }: SystemHealthDashboardProps) {
  const [metrics, setMetrics] = useState<SystemHealthMetrics | null>(null)
  const [historicalData, setHistoricalData] = useState<SystemHealthMetrics[]>([])
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    fetchHealthData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchHealthData, 60000) // Refresh every minute
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const fetchHealthData = async () => {
    try {
      setLoading(true)
      
      const [currentResponse, historicalResponse, alertsResponse] = await Promise.all([
        fetch('/api/admin/monitoring/health?action=current'),
        fetch('/api/admin/monitoring/health?action=historical&hours=24'),
        fetch('/api/admin/monitoring/health?action=alerts')
      ])

      if (!currentResponse.ok || !historicalResponse.ok || !alertsResponse.ok) {
        throw new Error('Failed to fetch health data')
      }

      const [currentData, historicalData, alertsData] = await Promise.all([
        currentResponse.json(),
        historicalResponse.json(),
        alertsResponse.json()
      ])

      setMetrics(currentData.data)
      setHistoricalData(historicalData.data)
      setAlerts(alertsData.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data')
    } finally {
      setLoading(false)
    }
  }

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/admin/monitoring/health', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'resolve_alert',
          alertId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to resolve alert')
      }

      // Refresh alerts
      const alertsResponse = await fetch('/api/admin/monitoring/health?action=alerts')
      const alertsData = await alertsResponse.json()
      setAlerts(alertsData.data)
    } catch (err) {
      console.error('Error resolving alert:', err)
    }
  }

  const getStatusIcon = (status: 'healthy' | 'degraded' | 'critical') => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'degraded':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      case 'critical':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
    }
  }

  const getStatusColor = (status: 'healthy' | 'degraded' | 'critical') => {
    switch (status) {
      case 'healthy':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'degraded':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200'
      case 'critical':
        return 'text-red-700 bg-red-50 border-red-200'
    }
  }

  const getSeverityColor = (severity: 'low' | 'medium' | 'high' | 'critical') => {
    switch (severity) {
      case 'low':
        return 'bg-blue-100 text-blue-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'critical':
        return 'bg-red-100 text-red-800'
    }
  }

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`
  const formatTime = (ms: number) => `${ms.toFixed(0)}ms`
  const formatMemory = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  if (loading && !metrics) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <XCircleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Health Data</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <button
            onClick={fetchHealthData}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!metrics) return null

  const activeAlerts = alerts.filter(alert => !alert.resolved)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">System Health Dashboard</h2>
            <p className="mt-1 text-sm text-gray-500">
              Last updated: {new Date(metrics.timestamp).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Auto-refresh</span>
            </label>
            <button
              onClick={fetchHealthData}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <BellIcon className="h-5 w-5 text-red-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              Active Alerts ({activeAlerts.length})
            </h3>
          </div>
          <div className="space-y-3">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="ml-2 text-sm text-gray-600 capitalize">{alert.type}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-900">{alert.message}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => resolveAlert(alert.id)}
                  className="ml-4 inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                >
                  Resolve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Permission System */}
        <div className={`bg-white shadow rounded-lg p-6 border-l-4 ${getStatusColor(metrics.permissionSystem.status)}`}>
          <div className="flex items-center">
            <CpuChipIcon className="h-8 w-8 text-gray-400" />
            <div className="ml-4">
              <div className="flex items-center">
                {getStatusIcon(metrics.permissionSystem.status)}
                <h3 className="ml-2 text-lg font-medium text-gray-900">Permission System</h3>
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-600">
                  Cache Hit Rate: {formatPercentage(metrics.permissionSystem.cacheHitRate)}
                </p>
                <p className="text-sm text-gray-600">
                  Avg Response: {formatTime(metrics.permissionSystem.avgResponseTime)}
                </p>
                <p className="text-sm text-gray-600">
                  Error Rate: {formatPercentage(metrics.permissionSystem.errorRate)}
                </p>
                <p className="text-sm text-gray-600">
                  Active Users: {metrics.permissionSystem.activeUsers}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Database */}
        <div className={`bg-white shadow rounded-lg p-6 border-l-4 ${getStatusColor(metrics.database.status)}`}>
          <div className="flex items-center">
            <CircleStackIcon className="h-8 w-8 text-gray-400" />
            <div className="ml-4">
              <div className="flex items-center">
                {getStatusIcon(metrics.database.status)}
                <h3 className="ml-2 text-lg font-medium text-gray-900">Database</h3>
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-600">
                  Connections: {metrics.database.connectionCount}
                </p>
                <p className="text-sm text-gray-600">
                  Avg Query Time: {formatTime(metrics.database.avgQueryTime)}
                </p>
                <p className="text-sm text-gray-600">
                  Slow Queries: {metrics.database.slowQueries}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* API */}
        <div className={`bg-white shadow rounded-lg p-6 border-l-4 ${getStatusColor(metrics.api.status)}`}>
          <div className="flex items-center">
            <ServerIcon className="h-8 w-8 text-gray-400" />
            <div className="ml-4">
              <div className="flex items-center">
                {getStatusIcon(metrics.api.status)}
                <h3 className="ml-2 text-lg font-medium text-gray-900">API</h3>
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-600">
                  Requests/min: {metrics.api.requestsPerMinute}
                </p>
                <p className="text-sm text-gray-600">
                  Error Rate: {formatPercentage(metrics.api.errorRate)}
                </p>
                <p className="text-sm text-gray-600">
                  Avg Response: {formatTime(metrics.api.avgResponseTime)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Memory */}
        <div className="bg-white shadow rounded-lg p-6 border-l-4 border-gray-200">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-gray-400" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Memory Usage</h3>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-600">
                  Used: {formatMemory(metrics.memory.used)}
                </p>
                <p className="text-sm text-gray-600">
                  Total: {formatMemory(metrics.memory.total)}
                </p>
                <p className="text-sm text-gray-600">
                  Usage: {formatPercentage(metrics.memory.percentage)}
                </p>
              </div>
              <div className="mt-2">
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      metrics.memory.percentage > 0.85 ? 'bg-red-500' :
                      metrics.memory.percentage > 0.7 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(metrics.memory.percentage * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Trends */}
      {historicalData.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Trends (24 hours)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Permission System Response Time</h4>
              <div className="h-32 bg-gray-50 rounded flex items-center justify-center">
                <p className="text-sm text-gray-500">Chart visualization would go here</p>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Cache Hit Rate</h4>
              <div className="h-32 bg-gray-50 rounded flex items-center justify-center">
                <p className="text-sm text-gray-500">Chart visualization would go here</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}