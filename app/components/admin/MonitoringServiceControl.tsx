'use client'

import { useState, useEffect } from 'react'
import { 
  PlayIcon, 
  StopIcon, 
  ArrowPathIcon,
  ClockIcon,
  CogIcon
} from '@heroicons/react/24/outline'

interface ServiceStatus {
  isRunning: boolean
  intervalMinutes: number
  nextCollection: string | null
}

interface MonitoringServiceControlProps {
  className?: string
}

export default function MonitoringServiceControl({ className = '' }: MonitoringServiceControlProps) {
  const [status, setStatus] = useState<ServiceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showIntervalConfig, setShowIntervalConfig] = useState(false)
  const [newInterval, setNewInterval] = useState(1)

  useEffect(() => {
    fetchStatus()
    
    // Refresh status every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/monitoring/service')
      if (!response.ok) throw new Error('Failed to fetch status')
      
      const data = await response.json()
      setStatus(data.data)
    } catch (error) {
      console.error('Error fetching service status:', error)
    } finally {
      setLoading(false)
    }
  }

  const performAction = async (action: string, params?: any) => {
    try {
      setActionLoading(action)
      
      const response = await fetch('/api/admin/monitoring/service', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, ...params })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Action failed')
      }

      const result = await response.json()
      
      // Refresh status after action
      await fetchStatus()
      
      // Show success message (you could use a toast library here)
      console.log(result.message)
    } catch (error) {
      console.error(`Error performing action ${action}:`, error)
      alert(error instanceof Error ? error.message : 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  const handleIntervalChange = async () => {
    if (newInterval < 1) {
      alert('Interval must be at least 1 minute')
      return
    }

    await performAction('set_interval', { intervalMinutes: newInterval })
    setShowIntervalConfig(false)
  }

  if (loading) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!status) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="text-center text-gray-500">
          Failed to load service status
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Monitoring Service Control</h3>
          <p className="mt-1 text-sm text-gray-600">
            Manage the health monitoring background service
          </p>
        </div>
        <div className="flex items-center">
          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            status.isRunning 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-1 ${
              status.isRunning ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
            {status.isRunning ? 'Running' : 'Stopped'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Service Status */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Service Information</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Status:</span>
              <span className={status.isRunning ? 'text-green-600' : 'text-red-600'}>
                {status.isRunning ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Collection Interval:</span>
              <span className="text-gray-900">{status.intervalMinutes} minutes</span>
            </div>
            {status.nextCollection && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Next Collection:</span>
                <span className="text-gray-900">
                  {new Date(status.nextCollection).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Service Controls */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Controls</h4>
          <div className="space-y-2">
            <div className="flex space-x-2">
              {!status.isRunning ? (
                <button
                  onClick={() => performAction('start')}
                  disabled={actionLoading === 'start'}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {actionLoading === 'start' ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <PlayIcon className="h-4 w-4 mr-1" />
                  )}
                  Start
                </button>
              ) : (
                <button
                  onClick={() => performAction('stop')}
                  disabled={actionLoading === 'stop'}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {actionLoading === 'stop' ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <StopIcon className="h-4 w-4 mr-1" />
                  )}
                  Stop
                </button>
              )}
              
              <button
                onClick={() => performAction('restart')}
                disabled={actionLoading === 'restart'}
                className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {actionLoading === 'restart' ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <ArrowPathIcon className="h-4 w-4 mr-1" />
                )}
                Restart
              </button>
            </div>

            <button
              onClick={() => performAction('collect_now')}
              disabled={actionLoading === 'collect_now'}
              className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {actionLoading === 'collect_now' ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <ClockIcon className="h-4 w-4 mr-1" />
              )}
              Collect Now
            </button>

            <button
              onClick={() => setShowIntervalConfig(!showIntervalConfig)}
              className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <CogIcon className="h-4 w-4 mr-1" />
              Configure Interval
            </button>
          </div>
        </div>
      </div>

      {/* Interval Configuration */}
      {showIntervalConfig && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Collection Interval</h4>
          <div className="flex items-center space-x-3">
            <input
              type="number"
              min="1"
              max="60"
              value={newInterval}
              onChange={(e) => setNewInterval(parseInt(e.target.value) || 1)}
              className="block w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            <span className="text-sm text-gray-600">minutes</span>
            <button
              onClick={handleIntervalChange}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Update
            </button>
            <button
              onClick={() => setShowIntervalConfig(false)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Recommended: 1-5 minutes for production environments
          </p>
        </div>
      )}
    </div>
  )
}