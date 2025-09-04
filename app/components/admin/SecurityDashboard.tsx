'use client'

/**
 * Security Dashboard Component
 * Real-time security monitoring and threat management interface
 */

import { useState, useEffect } from 'react'
import { 
  ShieldCheckIcon, 
  ShieldExclamationIcon, 
  ExclamationTriangleIcon,
  ClockIcon,
  ComputerDesktopIcon,
  UserIcon,
  ChartBarIcon,
  EyeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface SecurityStats {
  totalEvents: number
  criticalEvents: number
  blockedRequests: number
  suspiciousActivity: number
  failedLogins: number
  successfulLogins: number
  accountLocks: number
  rateLimitViolations: number
  csrfViolations: number
  lastScan: string
  threatLevel: 'low' | 'medium' | 'high' | 'critical'
  topThreats: Array<{ type: string; count: number }>
  ipBlacklist: string[]
  recentAlerts: Array<{
    id: string
    type: string
    severity: string
    message: string
    ipAddress: string
    timestamp: string
    resolved: boolean
  }>
}

interface SecurityEvent {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  ipAddress: string
  userAgent?: string
  userId?: string
  timestamp: string
  resolved: boolean
  metadata?: Record<string, unknown>
}

export default function SecurityDashboard() {
  const [stats, setStats] = useState<SecurityStats | null>(null)
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null)
  const [filter, setFilter] = useState<{
    severity?: string
    type?: string
    resolved?: boolean
  }>({})

  useEffect(() => {
    fetchSecurityData()
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchSecurityData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchSecurityData = async () => {
    try {
      const [statsResponse, eventsResponse] = await Promise.all([
        fetch('/api/admin/security/stats'),
        fetch('/api/admin/security/events')
      ])

      if (statsResponse.ok && eventsResponse.ok) {
        const statsData = await statsResponse.json()
        const eventsData = await eventsResponse.json()
        
        setStats(statsData)
        setEvents(eventsData.events || [])
      }
    } catch (error) {
      console.error('Failed to fetch security data:', error)
    } finally {
      setLoading(false)
    }
  }

  const resolveEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/admin/security/events/${eventId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        setEvents(events.map(event => 
          event.id === eventId ? { ...event, resolved: true } : event
        ))
        setSelectedEvent(null)
      }
    } catch (error) {
      console.error('Failed to resolve event:', error)
    }
  }

  const unblockIP = async (ip: string) => {
    try {
      const response = await fetch('/api/admin/security/unblock-ip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ip })
      })

      if (response.ok) {
        fetchSecurityData() // Refresh data
      }
    } catch (error) {
      console.error('Failed to unblock IP:', error)
    }
  }

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-green-600 bg-green-100'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600'
      case 'high': return 'text-orange-600'
      case 'medium': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ShieldExclamationIcon className="h-5 w-5 text-red-600" />
      case 'high':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
      case 'medium':
        return <ClockIcon className="h-5 w-5 text-yellow-600" />
      default:
        return <ShieldCheckIcon className="h-5 w-5 text-green-600" />
    }
  }

  const filteredEvents = events.filter(event => {
    if (filter.severity && event.severity !== filter.severity) return false
    if (filter.type && event.type !== filter.type) return false
    if (filter.resolved !== undefined && event.resolved !== filter.resolved) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security Dashboard</h1>
          <p className="text-gray-600">Monitor security events and threats in real-time</p>
        </div>
        
        {stats && (
          <div className={`px-4 py-2 rounded-lg font-medium ${getThreatLevelColor(stats.threatLevel)}`}>
            Threat Level: {stats.threatLevel.toUpperCase()}
          </div>
        )}
      </div>

      {/* Security Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Events (24h)</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Critical Events</p>
                <p className="text-2xl font-bold text-gray-900">{stats.criticalEvents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <ComputerDesktopIcon className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Blocked Requests</p>
                <p className="text-2xl font-bold text-gray-900">{stats.blockedRequests}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <UserIcon className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Failed Logins</p>
                <p className="text-2xl font-bold text-gray-900">{stats.failedLogins}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Threats and Blocked IPs */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Threats */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Threats (24h)</h3>
            <div className="space-y-3">
              {stats.topThreats.map((threat, index) => (
                <div key={threat.type} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                      {index + 1}
                    </div>
                    <span className="ml-3 text-sm text-gray-900">{threat.type.replace(/_/g, ' ')}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-600">{threat.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Blocked IPs */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Blocked IP Addresses</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {stats.ipBlacklist.length === 0 ? (
                <p className="text-sm text-gray-500">No blocked IPs</p>
              ) : (
                stats.ipBlacklist.map((ip) => (
                  <div key={ip} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                    <span className="text-sm font-mono text-gray-900">{ip}</span>
                    <button
                      onClick={() => unblockIP(ip)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Unblock
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Security Events */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Security Events</h3>
            
            {/* Filters */}
            <div className="flex space-x-4">
              <select
                value={filter.severity || ''}
                onChange={(e) => setFilter({ ...filter, severity: e.target.value || undefined })}
                className="text-sm border-gray-300 rounded-md"
              >
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              
              <select
                value={filter.resolved === undefined ? '' : filter.resolved.toString()}
                onChange={(e) => setFilter({ 
                  ...filter, 
                  resolved: e.target.value === '' ? undefined : e.target.value === 'true' 
                })}
                className="text-sm border-gray-300 rounded-md"
              >
                <option value="">All Events</option>
                <option value="false">Unresolved</option>
                <option value="true">Resolved</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getSeverityIcon(event.severity)}
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {event.type.replace(/_/g, ' ')}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {event.message}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${getSeverityColor(event.severity)}`}>
                      {event.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {event.ipAddress}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(event.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      event.resolved 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {event.resolved ? 'Resolved' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedEvent(event)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      {!event.resolved && (
                        <button
                          onClick={() => resolveEvent(event.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Security Event Details</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Event Type</label>
                <p className="mt-1 text-sm text-gray-900">{selectedEvent.type.replace(/_/g, ' ')}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Message</label>
                <p className="mt-1 text-sm text-gray-900">{selectedEvent.message}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Severity</label>
                  <p className={`mt-1 text-sm font-medium ${getSeverityColor(selectedEvent.severity)}`}>
                    {selectedEvent.severity}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">IP Address</label>
                  <p className="mt-1 text-sm font-mono text-gray-900">{selectedEvent.ipAddress}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(selectedEvent.timestamp).toLocaleString()}
                </p>
              </div>
              
              {selectedEvent.userAgent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">User Agent</label>
                  <p className="mt-1 text-sm text-gray-900 break-all">{selectedEvent.userAgent}</p>
                </div>
              )}
              
              {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Metadata</label>
                  <pre className="mt-1 text-sm text-gray-900 bg-gray-100 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedEvent.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              {!selectedEvent.resolved && (
                <button
                  onClick={() => resolveEvent(selectedEvent.id)}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
                >
                  Resolve Event
                </button>
              )}
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}