'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  ChartBarIcon, 
  ClockIcon, 
  CpuChipIcon, 
  ServerIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorMessage from '@/components/ui/ErrorMessage'

interface PerformanceMetrics {
  database: {
    avgQueryTime: number
    cacheHitRatio: number
    indexUsage: number
    connectionPool: {
      active: number
      idle: number
      total: number
      utilization: number
    }
    slowQueries: Array<{
      query: string
      duration: number
      count: number
    }>
    healthScore: number
    suggestions: Array<{
      type: string
      priority: string
      description: string
      impact: string
    }>
  }
  api: {
    avgResponseTime: number
    requestCount: number
    errorRate: number
    throughput: number
    slowEndpoints: Array<{
      endpoint: string
      method: string
      avgResponseTime: number
      requestCount: number
    }>
  }
  system: {
    memoryUsage: {
      heapUsed: number
      heapTotal: number
      rss: number
      external: number
    }
    memoryTrend: 'increasing' | 'decreasing' | 'stable'
    cpuUsage?: number
  }
}

export default function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/performance')
      if (!response.ok) {
        throw new Error('Failed to fetch performance metrics')
      }
      const data = await response.json()
      setMetrics(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000)

    return () => {
      clearInterval(interval)
    }
  }, [fetchMetrics])

  const formatBytes = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(1)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const getHealthColor = (score: number): string => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getHealthIcon = (score: number) => {
    if (score >= 90) return <CheckCircleIcon className="h-5 w-5 text-green-600" />
    return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <ArrowTrendingUpIcon className="h-4 w-4 text-red-500" />
      case 'decreasing':
        return <ArrowTrendingDownIcon className="h-4 w-4 text-green-500" />
      default:
        return <div className="h-4 w-4 bg-gray-400 rounded-full" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return <ErrorMessage message={error} />
  }

  if (!metrics) {
    return <ErrorMessage message="No performance data available" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
          <p className="text-gray-600">Monitor system performance and optimization opportunities</p>
        </div>
        <button
          onClick={fetchMetrics}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Database Health */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Database Health</p>
              <p className={`text-2xl font-bold ${getHealthColor(metrics.database.healthScore)}`}>
                {metrics.database.healthScore}%
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <ServerIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {getHealthIcon(metrics.database.healthScore)}
            <span className="ml-2 text-sm text-gray-600">
              {metrics.database.healthScore >= 90 ? 'Excellent' : 
               metrics.database.healthScore >= 70 ? 'Good' : 'Needs Attention'}
            </span>
          </div>
        </div>

        {/* API Performance */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatDuration(metrics.api.avgResponseTime)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <ClockIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              {metrics.api.requestCount.toLocaleString()} requests
            </p>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Memory Usage</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatBytes(metrics.system.memoryUsage.heapUsed)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <CpuChipIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {getTrendIcon(metrics.system.memoryTrend)}
            <span className="ml-2 text-sm text-gray-600 capitalize">
              {metrics.system.memoryTrend}
            </span>
          </div>
        </div>

        {/* Error Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Error Rate</p>
              <p className={`text-2xl font-bold ${
                metrics.api.errorRate > 0.05 ? 'text-red-600' : 'text-green-600'
              }`}>
                {(metrics.api.errorRate * 100).toFixed(2)}%
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              {metrics.api.errorRate > 0.05 ? 'Above threshold' : 'Within limits'}
            </p>
          </div>
        </div>
      </div>

      {/* Database Performance */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Database Performance</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Cache Hit Ratio</p>
              <p className={`text-xl font-bold ${
                metrics.database.cacheHitRatio >= 95 ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {metrics.database.cacheHitRatio.toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Index Usage</p>
              <p className={`text-xl font-bold ${
                metrics.database.indexUsage >= 80 ? 'text-green-600' : 'text-red-600'
              }`}>
                {metrics.database.indexUsage.toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Connection Pool</p>
              <p className={`text-xl font-bold ${
                metrics.database.connectionPool.utilization < 80 ? 'text-green-600' : 'text-red-600'
              }`}>
                {metrics.database.connectionPool.active}/{metrics.database.connectionPool.total}
              </p>
            </div>
          </div>

          {/* Optimization Suggestions */}
          {metrics.database.suggestions.length > 0 && (
            <div>
              <h3 className="text-md font-semibold text-gray-900 mb-3">Optimization Suggestions</h3>
              <div className="space-y-3">
                {metrics.database.suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-l-4 ${
                      suggestion.priority === 'high' 
                        ? 'bg-red-50 border-red-400' 
                        : suggestion.priority === 'medium'
                        ? 'bg-yellow-50 border-yellow-400'
                        : 'bg-blue-50 border-blue-400'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{suggestion.description}</p>
                        <p className="text-sm text-gray-600 mt-1">{suggestion.impact}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        suggestion.priority === 'high' 
                          ? 'bg-red-100 text-red-800' 
                          : suggestion.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {suggestion.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* API Performance */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">API Performance</h2>
        </div>
        <div className="p-6">
          {metrics.api.slowEndpoints.length > 0 ? (
            <div>
              <h3 className="text-md font-semibold text-gray-900 mb-3">Slow Endpoints</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Endpoint
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Response Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requests
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {metrics.api.slowEndpoints.map((endpoint, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {endpoint.endpoint}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            endpoint.method === 'GET' ? 'bg-green-100 text-green-800' :
                            endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                            endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {endpoint.method}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDuration(endpoint.avgResponseTime)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {endpoint.requestCount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No slow endpoints detected</h3>
              <p className="mt-1 text-sm text-gray-500">All API endpoints are performing well</p>
            </div>
          )}
        </div>
      </div>

      {/* System Resources */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">System Resources</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-md font-semibold text-gray-900 mb-3">Memory Usage</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Heap Used</span>
                  <span className="text-sm font-medium">
                    {formatBytes(metrics.system.memoryUsage.heapUsed)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Heap Total</span>
                  <span className="text-sm font-medium">
                    {formatBytes(metrics.system.memoryUsage.heapTotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">RSS</span>
                  <span className="text-sm font-medium">
                    {formatBytes(metrics.system.memoryUsage.rss)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">External</span>
                  <span className="text-sm font-medium">
                    {formatBytes(metrics.system.memoryUsage.external)}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-md font-semibold text-gray-900 mb-3">Trends</h3>
              <div className="flex items-center space-x-2">
                {getTrendIcon(metrics.system.memoryTrend)}
                <span className="text-sm text-gray-600">
                  Memory usage is {metrics.system.memoryTrend}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}