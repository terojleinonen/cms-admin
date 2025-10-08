'use client'

/**
 * Permission Performance Dashboard Component
 * 
 * Provides a comprehensive dashboard for monitoring permission system performance
 * Requirements: 6.1, 6.2
 */

import { useState, useEffect } from 'react'
import { 
  ChartBarIcon, 
  ClockIcon, 
  CpuChipIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'

interface PerformanceMetrics {
  summary: {
    totalOperations: number
    averageDuration: number
    p95Duration: number
    p99Duration: number
    operationsPerSecond: number
    errorRate: number
    cacheHitRate: number
    slowOperations: Array<{
      name: string
      duration: number
    }>
  }
  trends: {
    trend: 'improving' | 'degrading' | 'stable'
    averageChange: number
    recommendation: string
  }
  anomalies: Array<{
    type: string
    severity: 'low' | 'medium' | 'high'
    description: string
  }>
  recommendations: string[]
}

interface PerformanceStatus {
  cacheWarming: {
    enabled: boolean
    lastWarmed: Date | null
    entriesWarmed: number
  }
  queryOptimization: {
    enabled: boolean
    cacheHitRate: number
    averageQueryTime: number
  }
  profiling: {
    enabled: boolean
    totalOperations: number
    averageResponseTime: number
    errorRate: number
  }
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical'
    issues: string[]
    recommendations: string[]
  }
}

export default function PermissionPerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [status, setStatus] = useState<PerformanceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [optimizing, setOptimizing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Fetch performance data
  const fetchPerformanceData = async () => {
    try {
      const [metricsResponse, statusResponse] = await Promise.all([
        fetch('/api/admin/performance/metrics'),
        fetch('/api/admin/performance/status')
      ])

      if (metricsResponse.ok && statusResponse.ok) {
        const metricsData = await metricsResponse.json()
        const statusData = await statusResponse.json()
        
        setMetrics(metricsData)
        setStatus(statusData)
      }
    } catch (error) {
      console.error('Failed to fetch performance data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Trigger performance optimization
  const triggerOptimization = async () => {
    setOptimizing(true)
    try {
      const response = await fetch('/api/admin/performance/optimize', {
        method: 'POST'
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Optimization completed:', result)
        
        // Refresh data after optimization
        await fetchPerformanceData()
      }
    } catch (error) {
      console.error('Optimization failed:', error)
    } finally {
      setOptimizing(false)
    }
  }

  // Auto-refresh effect
  useEffect(() => {
    fetchPerformanceData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchPerformanceData, 30000) // 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <ArrowTrendingDownIcon className="h-5 w-5 text-green-500" />
      case 'degrading': return <ArrowTrendingUpIcon className="h-5 w-5 text-red-500" />
      default: return <div className="h-5 w-5 bg-gray-300 rounded-full" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Permission System Performance</h1>
          <p className="text-gray-600">Monitor and optimize permission system performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Auto-refresh</span>
          </label>
          <button
            onClick={triggerOptimization}
            disabled={optimizing}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {optimizing ? 'Optimizing...' : 'Optimize Performance'}
          </button>
        </div>
      </div>

      {/* System Health Status */}
      {status && (
        <div className={`rounded-lg p-4 ${getStatusColor(status.systemHealth.status)}`}>
          <div className="flex items-center">
            {status.systemHealth.status === 'healthy' ? (
              <CheckCircleIcon className="h-6 w-6 mr-2" />
            ) : (
              <ExclamationTriangleIcon className="h-6 w-6 mr-2" />
            )}
            <h2 className="text-lg font-semibold">
              System Health: {status.systemHealth.status.toUpperCase()}
            </h2>
          </div>
          
          {status.systemHealth.issues.length > 0 && (
            <div className="mt-2">
              <p className="font-medium">Issues:</p>
              <ul className="list-disc list-inside text-sm">
                {status.systemHealth.issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Key Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.summary.averageDuration.toFixed(1)}ms
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center">
              {getTrendIcon(metrics.trends.trend)}
              <span className="ml-1 text-sm text-gray-600">
                {metrics.trends.averageChange > 0 ? '+' : ''}{metrics.trends.averageChange.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Cache Hit Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.summary.cacheHitRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CpuChipIcon className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Operations/sec</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.summary.operationsPerSecond.toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Error Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.summary.errorRate.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Performance Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Summary */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Performance Summary</h3>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 gap-4">
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-600">Total Operations</dt>
                  <dd className="text-sm text-gray-900">{metrics.summary.totalOperations.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-600">95th Percentile</dt>
                  <dd className="text-sm text-gray-900">{metrics.summary.p95Duration.toFixed(2)}ms</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-600">99th Percentile</dt>
                  <dd className="text-sm text-gray-900">{metrics.summary.p99Duration.toFixed(2)}ms</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Slow Operations */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Slowest Operations</h3>
            </div>
            <div className="p-6">
              {metrics.summary.slowOperations.length > 0 ? (
                <div className="space-y-3">
                  {metrics.summary.slowOperations.slice(0, 5).map((operation, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-gray-900">{operation.name}</span>
                      <span className="text-sm font-medium text-red-600">
                        {operation.duration.toFixed(2)}ms
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No slow operations detected</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Anomalies and Recommendations */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Anomalies */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Performance Anomalies</h3>
            </div>
            <div className="p-6">
              {metrics.anomalies.length > 0 ? (
                <div className="space-y-3">
                  {metrics.anomalies.map((anomaly, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                        anomaly.severity === 'high' ? 'bg-red-500' :
                        anomaly.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{anomaly.type}</p>
                        <p className="text-sm text-gray-600">{anomaly.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No anomalies detected</p>
              )}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Optimization Recommendations</h3>
            </div>
            <div className="p-6">
              {metrics.recommendations.length > 0 ? (
                <div className="space-y-3">
                  {metrics.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500 mt-0.5" />
                      <p className="text-sm text-gray-900">{recommendation}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No recommendations at this time</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* System Status Details */}
      {status && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">System Status Details</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Cache Warming</h4>
                <dl className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-600">Enabled</dt>
                    <dd className={status.cacheWarming.enabled ? 'text-green-600' : 'text-red-600'}>
                      {status.cacheWarming.enabled ? 'Yes' : 'No'}
                    </dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-600">Entries Warmed</dt>
                    <dd className="text-gray-900">{status.cacheWarming.entriesWarmed}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Query Optimization</h4>
                <dl className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-600">Enabled</dt>
                    <dd className={status.queryOptimization.enabled ? 'text-green-600' : 'text-red-600'}>
                      {status.queryOptimization.enabled ? 'Yes' : 'No'}
                    </dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-600">Cache Hit Rate</dt>
                    <dd className="text-gray-900">{status.queryOptimization.cacheHitRate.toFixed(1)}%</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Profiling</h4>
                <dl className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-600">Enabled</dt>
                    <dd className={status.profiling.enabled ? 'text-green-600' : 'text-red-600'}>
                      {status.profiling.enabled ? 'Yes' : 'No'}
                    </dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-600">Total Operations</dt>
                    <dd className="text-gray-900">{status.profiling.totalOperations.toLocaleString()}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}