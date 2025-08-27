'use client'

import { useState, useEffect } from 'react'
import { 
  ChartBarIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'

interface ApiStats {
  totalRequests: number
  successfulRequests: number
  errorRequests: number
  averageResponseTime: number
  requestsToday: number
  requestsThisWeek: number
  requestsThisMonth: number
  topEndpoints: Array<{
    endpoint: string
    method: string
    requests: number
    averageResponseTime: number
  }>
  topApiKeys: Array<{
    name: string
    requests: number
    lastUsed: string
  }>
  errorsByType: Array<{
    type: string
    count: number
    percentage: number
  }>
  requestsByHour: Array<{
    hour: number
    requests: number
  }>
}

export default function ApiAnalytics() {
  const [stats, setStats] = useState<ApiStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h')

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    try {
      // Mock data - in real implementation, this would fetch from analytics API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setStats({
        totalRequests: 12450,
        successfulRequests: 12156,
        errorRequests: 294,
        averageResponseTime: 145,
        requestsToday: 1250,
        requestsThisWeek: 8750,
        requestsThisMonth: 35600,
        topEndpoints: [
          { endpoint: '/api/public/products', method: 'GET', requests: 4520, averageResponseTime: 120 },
          { endpoint: '/api/public/categories', method: 'GET', requests: 2340, averageResponseTime: 85 },
          { endpoint: '/api/products', method: 'POST', requests: 1890, averageResponseTime: 250 },
          { endpoint: '/api/public/products/{id}', method: 'GET', requests: 1650, averageResponseTime: 95 },
          { endpoint: '/api/orders', method: 'POST', requests: 980, averageResponseTime: 320 }
        ],
        topApiKeys: [
          { name: 'Mobile App Production', requests: 5670, lastUsed: '2024-01-15T10:30:00Z' },
          { name: 'Website Integration', requests: 3240, lastUsed: '2024-01-15T09:45:00Z' },
          { name: 'Analytics Service', requests: 2180, lastUsed: '2024-01-15T11:20:00Z' },
          { name: 'Third Party Sync', requests: 890, lastUsed: '2024-01-14T16:30:00Z' }
        ],
        errorsByType: [
          { type: '401 Unauthorized', count: 156, percentage: 53.1 },
          { type: '404 Not Found', count: 89, percentage: 30.3 },
          { type: '429 Rate Limited', count: 32, percentage: 10.9 },
          { type: '500 Server Error', count: 17, percentage: 5.7 }
        ],
        requestsByHour: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          requests: Math.floor(Math.random() * 200) + 50
        }))
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  const formatResponseTime = (ms: number) => {
    return `${ms}ms`
  }

  const getSuccessRate = () => {
    if (!stats) return 0
    return ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)
  }

  const getErrorRate = () => {
    if (!stats) return 0
    return ((stats.errorRequests / stats.totalRequests) * 100).toFixed(1)
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-200 h-64 rounded-lg"></div>
          <div className="bg-gray-200 h-64 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No analytics data</h3>
        <p className="mt-1 text-sm text-gray-500">Analytics data will appear here once API requests are made.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-end">
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Requests</p>
              <p className="text-2xl font-semibold text-gray-900">{formatNumber(stats.totalRequests)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ArrowTrendingUpIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Success Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{getSuccessRate()}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Response Time</p>
              <p className="text-2xl font-semibold text-gray-900">{formatResponseTime(stats.averageResponseTime)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Error Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{getErrorRate()}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Endpoints */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Top Endpoints</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats.topEndpoints.map((endpoint, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      endpoint.method === 'GET' ? 'bg-green-100 text-green-800' :
                      endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {endpoint.method}
                    </span>
                    <code className="text-sm font-mono text-gray-900">{endpoint.endpoint}</code>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{formatNumber(endpoint.requests)}</p>
                    <p className="text-xs text-gray-500">{formatResponseTime(endpoint.averageResponseTime)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top API Keys */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Top API Keys</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats.topApiKeys.map((apiKey, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{apiKey.name}</p>
                    <p className="text-xs text-gray-500">
                      Last used {new Date(apiKey.lastUsed).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{formatNumber(apiKey.requests)}</p>
                    <p className="text-xs text-gray-500">requests</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Error Breakdown */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Error Breakdown</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats.errorsByType.map((error, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <span className="text-sm text-gray-900">{error.type}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{error.count}</p>
                    <p className="text-xs text-gray-500">{error.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Request Timeline */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Requests by Hour</h3>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              {stats.requestsByHour.map((hour) => (
                <div key={hour.hour} className="flex items-center space-x-3">
                  <span className="text-xs text-gray-500 w-8">
                    {hour.hour.toString().padStart(2, '0')}:00
                  </span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ 
                        width: `${(hour.requests / Math.max(...stats.requestsByHour.map(h => h.requests))) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-900 w-12 text-right">
                    {hour.requests}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-2xl font-semibold text-gray-900">{formatNumber(stats.requestsToday)}</p>
            <p className="text-sm text-gray-500">Requests Today</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-gray-900">{formatNumber(stats.requestsThisWeek)}</p>
            <p className="text-sm text-gray-500">Requests This Week</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-gray-900">{formatNumber(stats.requestsThisMonth)}</p>
            <p className="text-sm text-gray-500">Requests This Month</p>
          </div>
        </div>
      </div>
    </div>
  )
}