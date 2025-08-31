'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { 
  KeyIcon, 
  DocumentTextIcon, 
  ChartBarIcon,
  PlusIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface ApiKey {
  id: string
  name: string
  permissions: string[]
  isActive: boolean
  lastUsed: string | null
  createdAt: string
  expiresAt: string | null
}

interface ApiStats {
  totalKeys: number
  activeKeys: number
  totalRequests: number
  errorRate: number
}

export default function ApiManagementDashboard() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [stats, setStats] = useState<ApiStats>({
    totalKeys: 0,
    activeKeys: 0,
    totalRequests: 0,
    errorRate: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchApiKeys()
    fetchStats()
  }, [fetchApiKeys, fetchStats])

  const fetchApiKeys = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/api-keys')
      if (response.ok) {
        const data = await response.json()
        setApiKeys(data.apiKeys || [])
      }
    } catch (error) {
      console.error('Error fetching API keys:', error)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      // Mock stats for now - would come from analytics API
      setStats({
        totalKeys: apiKeys.length,
        activeKeys: apiKeys.filter(key => key.isActive).length,
        totalRequests: 12450,
        errorRate: 2.3
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }, [apiKeys])

  const quickActions = [
    {
      title: 'Create API Key',
      description: 'Generate a new API key for integrations',
      href: '/admin/api/keys/new',
      icon: PlusIcon,
      color: 'bg-blue-500'
    },
    {
      title: 'View Documentation',
      description: 'Browse interactive API documentation',
      href: '/admin/api/documentation',
      icon: DocumentTextIcon,
      color: 'bg-green-500'
    },
    {
      title: 'Analytics Dashboard',
      description: 'Monitor API usage and performance',
      href: '/admin/api/analytics',
      icon: ChartBarIcon,
      color: 'bg-purple-500'
    }
  ]

  const statCards = [
    {
      title: 'Total API Keys',
      value: stats.totalKeys,
      icon: KeyIcon,
      color: 'text-blue-600'
    },
    {
      title: 'Active Keys',
      value: stats.activeKeys,
      icon: KeyIcon,
      color: 'text-green-600'
    },
    {
      title: 'Total Requests',
      value: stats.totalRequests.toLocaleString(),
      icon: ChartBarIcon,
      color: 'text-purple-600'
    },
    {
      title: 'Error Rate',
      value: `${stats.errorRate}%`,
      icon: ExclamationTriangleIcon,
      color: stats.errorRate > 5 ? 'text-red-600' : 'text-yellow-600'
    }
  ]

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
          ))}
        </div>
        <div className="bg-gray-200 h-64 rounded-lg"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`flex-shrink-0 ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className="group relative bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center">
                  <div className={`flex-shrink-0 ${action.color} rounded-lg p-3`}>
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-gray-900 group-hover:text-blue-600">
                      {action.title}
                    </h4>
                    <p className="text-sm text-gray-500">{action.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent API Keys */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Recent API Keys</h3>
          <Link
            href="/admin/api/keys"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            View all
          </Link>
        </div>
        <div className="p-6">
          {apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <KeyIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No API keys</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first API key.
              </p>
              <div className="mt-6">
                <Link
                  href="/admin/api/keys/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Create API Key
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.slice(0, 5).map((key) => (
                <div key={key.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${key.isActive ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{key.name}</h4>
                      <p className="text-sm text-gray-500">
                        {key.permissions.length} permission{key.permissions.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {key.lastUsed ? `Last used ${new Date(key.lastUsed).toLocaleDateString()}` : 'Never used'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Created {new Date(key.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}