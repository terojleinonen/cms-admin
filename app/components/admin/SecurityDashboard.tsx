/**
 * Security Dashboard Component
 * Comprehensive security monitoring dashboard with metrics, alerts, and system health
 */

'use client'

import { useState, useEffect } from 'react'
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  EyeIcon,
  ClockIcon,
  ComputerDesktopIcon,
  ArrowPathIcon,
  BellIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'

interface SecurityMetrics {
  totalUsers: number
  activeUsers: number
  suspiciousActivity: number
  securityAlerts: number
  failedLogins: number
  blockedIPs: number
  twoFactorEnabled: number
  passwordResets: number
}

interface SecurityAlert {
  id: string
  type: 'login_failure' | 'suspicious_activity' | 'security_breach' | 'system_error'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  timestamp: Date
  userId?: string
  ipAddress?: string
  resolved: boolean
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  uptime: string
  lastIncident: Date | null
  activeIncidents: number
  systemLoad: number
  memoryUsage: number
  diskUsage: number
}

interface SecurityDashboardProps {
  initialData?: {
    metrics: Partial<SecurityMetrics>
    recentAlerts: SecurityAlert[]
    systemHealth: Partial<SystemHealth>
  }
}

const alertTypeColors = {
  login_failure: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  suspicious_activity: 'bg-orange-100 text-orange-800 border-orange-200',
  security_breach: 'bg-red-100 text-red-800 border-red-200',
  system_error: 'bg-gray-100 text-gray-800 border-gray-200',
}

const severityColors = {
  low: 'text-green-600 bg-green-50',
  medium: 'text-yellow-600 bg-yellow-50',
  high: 'text-orange-600 bg-orange-50',
  critical: 'text-red-600 bg-red-50',
}

const statusColors = {
  healthy: 'text-green-600 bg-green-50',
  warning: 'text-yellow-600 bg-yellow-50',
  critical: 'text-red-600 bg-red-50',
  unknown: 'text-gray-600 bg-gray-50',
}

export default function SecurityDashboard({ initialData }: SecurityDashboardProps) {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalUsers: 0,
    activeUsers: 0,
    suspiciousActivity: 0,
    securityAlerts: 0,
    failedLogins: 0,
    blockedIPs: 0,
    twoFactorEnabled: 0,
    passwordResets: 0,
    ...initialData?.metrics,
  })
  
  const [alerts, setAlerts] = useState<SecurityAlert[]>(initialData?.recentAlerts || [])
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    status: 'unknown',
    uptime: 'N/A',
    lastIncident: null,
    activeIncidents: 0,
    systemLoad: 0,
    memoryUsage: 0,
    diskUsage: 0,
    ...initialData?.systemHealth,
  })
  
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')

  // Fetch security data
  const fetchSecurityData = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      setError(null)

      const [metricsResponse, alertsResponse, healthResponse] = await Promise.all([
        fetch(`/api/admin/security/metrics?timeRange=${selectedTimeRange}`),
        fetch(`/api/admin/security/alerts?limit=10`),
        fetch('/api/admin/security/health')
      ])

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json()
        setMetrics(metricsData.metrics)
      }

      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json()
        setAlerts(alertsData.alerts)
      }

      if (healthResponse.ok) {
        const healthData = await healthResponse.json()
        setSystemHealth(healthData.health)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch security data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Initial load
  useEffect(() => {
    if (!initialData) {
      fetchSecurityData()
    }
  }, [selectedTimeRange, initialData])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSecurityData(false)
    }, 30000)

    return () => clearInterval(interval)
  }, [selectedTimeRange])

  // Handle alert resolution
  const handleResolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/admin/security/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: true }),
      })

      if (response.ok) {
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId ? { ...alert, resolved: true } : alert
        ))
      }
    } catch (err) {
      console.error('Failed to resolve alert:', err)
    }
  }

  // Format timestamp
  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Get system health status icon
  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      case 'critical':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-500" />
    }
  }

  if (loading && !refreshing) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">Security Monitoring</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor system security events, threats, and user activity
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSecurityData(false)}
            disabled={refreshing}
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Health Status */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">System Health</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center">
              {getHealthIcon(systemHealth.status)}
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-900">Overall Status</div>
                <div className={`text-sm capitalize px-2 py-1 rounded-full ${statusColors[systemHealth.status]}`}>
                  {systemHealth.status}
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Uptime</div>
              <div className="text-2xl font-bold text-gray-900">{systemHealth.uptime}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Active Incidents</div>
              <div className="text-2xl font-bold text-gray-900">{systemHealth.activeIncidents}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Last Incident</div>
              <div className="text-sm text-gray-600">
                {systemHealth.lastIncident 
                  ? formatTimestamp(systemHealth.lastIncident)
                  : 'None'
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <UserGroupIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.totalUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Users</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.activeUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Suspicious Activity</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.suspiciousActivity}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <BellIcon className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Security Alerts</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.securityAlerts}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <XCircleIcon className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Failed Logins</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.failedLogins}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ComputerDesktopIcon className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Blocked IPs</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.blockedIPs}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ShieldCheckIcon className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">2FA Enabled</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.twoFactorEnabled}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Password Resets</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.passwordResets}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Security Alerts */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Recent Security Alerts</h2>
            <Button variant="outline" size="sm">
              <EyeIcon className="h-4 w-4 mr-2" />
              View All
            </Button>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {alerts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Security Alerts</h3>
              <p className="mt-1 text-sm text-gray-500">
                All systems are operating normally.
              </p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
                      alert.resolved ? 'bg-gray-400' : severityColors[alert.severity].split(' ')[0].replace('text-', 'bg-')
                    }`}></div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className={`text-sm font-medium ${alert.resolved ? 'text-gray-500' : 'text-gray-900'}`}>
                          {alert.title}
                        </h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${alertTypeColors[alert.type]}`}>
                          {alert.type.replace('_', ' ')}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${severityColors[alert.severity]}`}>
                          {alert.severity}
                        </span>
                        {alert.resolved && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Resolved
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${alert.resolved ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                        {alert.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>{formatTimestamp(alert.timestamp)}</span>
                        {alert.ipAddress && <span>IP: {alert.ipAddress}</span>}
                      </div>
                    </div>
                  </div>
                  {!alert.resolved && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResolveAlert(alert.id)}
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}