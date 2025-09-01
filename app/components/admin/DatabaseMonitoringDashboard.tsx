'use client'

import { useState, useEffect } from 'react'
import { 
  CircleStackIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface DatabaseHealth {
  connected: boolean
  latency?: number
  error?: string
  connectionPool?: {
    active: number
    idle: number
    total: number
  }
  database?: {
    name: string
    version: string
    size?: string
  }
  performance?: {
    slowQueries: number
    avgResponseTime: number
  }
}

interface ConnectionStats {
  current: number
  max: number
  available: number
  health: 'healthy' | 'warning' | 'critical'
}

interface PerformanceMetrics {
  slowQueries: number
  avgQueryTime: number
  cacheHitRatio: number
  indexUsage: number
}

interface DatabaseMonitoringData {
  timestamp: string
  status: string
  health: DatabaseHealth
  connections: ConnectionStats
  performance: PerformanceMetrics
  recommendations: string[]
}

export default function DatabaseMonitoringDashboard() {
  const [data, setData] = useState<DatabaseMonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchDatabaseHealth = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/database/health')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch database health')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDatabaseHealth()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchDatabaseHealth, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [autoRefresh])

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircleIcon className="h-5 w-5 text-green-600" />
      case 'warning': return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
      case 'critical': return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
      default: return <CircleStackIcon className="h-5 w-5 text-gray-600" />
    }
  }

  if (loading && !data) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
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
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Database Monitoring Error</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <button
            onClick={fetchDatabaseHealth}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CircleStackIcon className="h-8 w-8 text-indigo-600 mr-3" />
            <div>
              <h2 className="text-lg font-medium text-gray-900">Database Monitoring</h2>
              <p className="text-sm text-gray-500">
                Last updated: {new Date(data.timestamp).toLocaleString()}
              </p>
            </div>
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
              onClick={fetchDatabaseHealth}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Connection Status */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            {getHealthStatusIcon(data.status)}
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Connection Status</p>
              <p className={`text-lg font-semibold ${getHealthStatusColor(data.status)}`}>
                {data.health.connected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
          </div>
          {data.health.latency && (
            <p className="mt-2 text-sm text-gray-600">
              Latency: {data.health.latency}ms
            </p>
          )}
        </div>

        {/* Database Info */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <CircleStackIcon className="h-5 w-5 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Database</p>
              <p className="text-lg font-semibold text-gray-900">
                {data.health.database?.name || 'Unknown'}
              </p>
            </div>
          </div>
          {data.health.database && (
            <div className="mt-2 text-sm text-gray-600">
              <p>Version: {data.health.database.version}</p>
              {data.health.database.size && <p>Size: {data.health.database.size}</p>}
            </div>
          )}
        </div>

        {/* Connection Pool */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            {getHealthStatusIcon(data.connections.health)}
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Connection Pool</p>
              <p className={`text-lg font-semibold ${getHealthStatusColor(data.connections.health)}`}>
                {data.connections.current}/{data.connections.max}
              </p>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Available: {data.connections.available}
          </p>
        </div>

        {/* Cache Hit Ratio */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <ClockIcon className="h-5 w-5 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Cache Hit Ratio</p>
              <p className="text-lg font-semibold text-gray-900">
                {data.performance.cacheHitRatio.toFixed(1)}%
              </p>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Slow queries: {data.performance.slowQueries}
          </p>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Average Response Time</span>
              <span className="text-sm font-medium text-gray-900">
                {data.health.performance?.avgResponseTime || 0}ms
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Slow Queries</span>
              <span className="text-sm font-medium text-gray-900">
                {data.performance.slowQueries}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Cache Hit Ratio</span>
              <span className="text-sm font-medium text-gray-900">
                {data.performance.cacheHitRatio.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Index Usage</span>
              <span className="text-sm font-medium text-gray-900">
                {data.performance.indexUsage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h3>
          {data.recommendations.length > 0 ? (
            <ul className="space-y-2">
              {data.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start">
                  <div className="flex-shrink-0 w-2 h-2 bg-indigo-600 rounded-full mt-2 mr-3"></div>
                  <span className="text-sm text-gray-700">{recommendation}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No recommendations at this time.</p>
          )}
        </div>
      </div>

      {/* Connection Pool Details */}
      {data.health.connectionPool && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Connection Pool Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{data.health.connectionPool.active}</p>
              <p className="text-sm text-gray-600">Active Connections</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{data.health.connectionPool.idle}</p>
              <p className="text-sm text-gray-600">Idle Connections</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">{data.health.connectionPool.total}</p>
              <p className="text-sm text-gray-600">Total Connections</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}