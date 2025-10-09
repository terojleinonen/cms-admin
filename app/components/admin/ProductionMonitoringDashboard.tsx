'use client'

/**
 * Production Monitoring Dashboard
 * Comprehensive dashboard for production RBAC system monitoring and maintenance
 */

import { useState, useEffect } from 'react'
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon,
  ClockIcon,
  ServerIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  DatabaseIcon
} from '@heroicons/react/24/outline'

interface HealthMetric {
  name: string
  status: 'healthy' | 'warning' | 'critical'
  value: number
  threshold: number
  unit: string
  timestamp: Date
  details?: Record<string, any>
}

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical'
  metrics: HealthMetric[]
  timestamp: Date
  uptime: number
}

interface MaintenanceStatus {
  isMaintenanceMode: boolean
  availableTasks: string[]
}

export default function ProductionMonitoringDashboard() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [maintenanceStatus, setMaintenanceStatus] = useState<MaintenanceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('/api/admin/production/health')
      if (!response.ok) {
        throw new Error('Failed to fetch system health')
      }
      const data = await response.json()
      setSystemHealth(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const fetchMaintenanceStatus = async () => {
    try {
      const response = await fetch('/api/admin/production/maintenance')
      if (!response.ok) {
        throw new Error('Failed to fetch maintenance status')
      }
      const data = await response.json()
      setMaintenanceStatus(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const runMaintenanceTask = async (taskId: string) => {
    try {
      const response = await fetch('/api/admin/production/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'run_task',
          taskId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to run maintenance task')
      }

      // Refresh data after task completion
      await fetchMaintenanceStatus()
      await fetchSystemHealth()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const createBackup = async (backupType: 'full' | 'rbac_only' | 'incremental') => {
    try {
      const response = await fetch('/api/admin/production/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'create_backup',
          backupType
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create backup')
      }

      const data = await response.json()
      alert(`Backup created successfully: ${data.data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchSystemHealth(), fetchMaintenanceStatus()])
      setLoading(false)
    }

    loadData()

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchSystemHealth()
      fetchMaintenanceStatus()
    }, 30000)

    setRefreshInterval(interval)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [])

  const getStatusIcon = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      case 'critical':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
    }
  }

  const getStatusColor = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'warning':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200'
      case 'critical':
        return 'text-red-700 bg-red-50 border-red-200'
    }
  }

  const formatUptime = (uptime: number) => {
    const seconds = Math.floor(uptime / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <XCircleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Production Monitoring</h1>
            <p className="mt-1 text-sm text-gray-500">
              Real-time monitoring and maintenance for production RBAC system
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {systemHealth && (
              <>
                {getStatusIcon(systemHealth.overall)}
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(systemHealth.overall)}`}>
                  {systemHealth.overall.toUpperCase()}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* System Overview */}
      {systemHealth && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <ServerIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">System Status</p>
                <p className={`text-lg font-semibold ${
                  systemHealth.overall === 'healthy' ? 'text-green-600' : 
                  systemHealth.overall === 'warning' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {systemHealth.overall.toUpperCase()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Uptime</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatUptime(systemHealth.uptime)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <ShieldCheckIcon className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Security Status</p>
                <p className="text-lg font-semibold text-green-600">SECURE</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <DatabaseIcon className="h-8 w-8 text-indigo-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Last Check</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(systemHealth.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Health Metrics */}
      {systemHealth && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Health Metrics</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {systemHealth.metrics.map((metric) => (
                <div key={metric.name} className={`border rounded-lg p-4 ${getStatusColor(metric.status)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getStatusIcon(metric.status)}
                      <h3 className="ml-2 text-sm font-medium capitalize">
                        {metric.name.replace(/_/g, ' ')}
                      </h3>
                    </div>
                    <span className="text-sm font-semibold">
                      {metric.value >= 0 ? `${metric.value.toFixed(1)}${metric.unit}` : 'Error'}
                    </span>
                  </div>
                  {metric.details && (
                    <div className="mt-2 text-xs">
                      {Object.entries(metric.details).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Tasks */}
      {maintenanceStatus && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Maintenance Tasks</h2>
              {maintenanceStatus.isMaintenanceMode && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                  MAINTENANCE MODE
                </span>
              )}
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {maintenanceStatus.availableTasks.map((taskId) => (
                <div key={taskId} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 capitalize mb-2">
                    {taskId.replace(/_/g, ' ')}
                  </h3>
                  <button
                    onClick={() => runMaintenanceTask(taskId)}
                    className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Run Task
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Backup Controls */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Backup Management</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => createBackup('full')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Create Full Backup
            </button>
            <button
              onClick={() => createBackup('rbac_only')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Create RBAC Backup
            </button>
            <button
              onClick={() => createBackup('incremental')}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              Create Incremental Backup
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}