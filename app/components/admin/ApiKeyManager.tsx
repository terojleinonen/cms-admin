'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  PlusIcon, 
  KeyIcon, 
  EyeIcon, 
  EyeSlashIcon,
  TrashIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline'

interface ApiKey {
  id: string
  name: string
  permissions: string[]
  isActive: boolean
  lastUsed: string | null
  createdAt: string
  expiresAt: string | null
  creator: {
    name: string
    email: string
  }
}

export default function ApiKeyManager() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showKey, setShowKey] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/admin/api-keys')
      if (response.ok) {
        const data = await response.json()
        setApiKeys(data.apiKeys || [])
      }
    } catch (error) {
      console.error('Error fetching API keys:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleKeyVisibility = (keyId: string) => {
    setShowKey(showKey === keyId ? null : keyId)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/api-keys/${keyId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setApiKeys(apiKeys.filter(key => key.id !== keyId))
      } else {
        console.error('Failed to delete API key')
      }
    } catch (error) {
      console.error('Error deleting API key:', error)
    }
  }

  const toggleKeyStatus = async (keyId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/api-keys/${keyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !isActive })
      })

      if (response.ok) {
        setApiKeys(apiKeys.map(key => 
          key.id === keyId ? { ...key, isActive: !isActive } : key
        ))
      }
    } catch (error) {
      console.error('Error updating API key status:', error)
    }
  }

  const filteredKeys = apiKeys.filter(key => {
    if (filter === 'active') return key.isActive
    if (filter === 'inactive') return !key.isActive
    return true
  })

  const formatPermissions = (permissions: string[]) => {
    return permissions.map(permission => {
      // Convert permission strings to readable format
      return permission.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }).join(', ')
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-4">
          <select
            value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Keys</option>
            <option value="active">Active Keys</option>
            <option value="inactive">Inactive Keys</option>
          </select>
        </div>
        <Link
          href="/admin/api/keys/new"
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          Create API Key
        </Link>
      </div>

      {/* API Keys List */}
      {filteredKeys.length === 0 ? (
        <div className="text-center py-12">
          <KeyIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {filter === 'all' ? 'No API keys' : `No ${filter} API keys`}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === 'all' 
              ? 'Get started by creating your first API key.'
              : `There are no ${filter} API keys at the moment.`
            }
          </p>
          {filter === 'all' && (
            <div className="mt-6">
              <Link
                href="/admin/api/keys/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Create API Key
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredKeys.map((apiKey) => (
              <li key={apiKey.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${apiKey.isActive ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{apiKey.name}</p>
                        <p className="text-sm text-gray-500">
                          Created by {apiKey.creator.name} on {new Date(apiKey.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleKeyStatus(apiKey.id, apiKey.isActive)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          apiKey.isActive 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {apiKey.isActive ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        onClick={() => deleteApiKey(apiKey.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                        title="Delete API key"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">
                          <span className="font-medium">Permissions:</span> {formatPermissions(apiKey.permissions)}
                        </p>
                        <p className="text-sm text-gray-500">
                          <span className="font-medium">Last used:</span> {
                            apiKey.lastUsed 
                              ? new Date(apiKey.lastUsed).toLocaleDateString()
                              : 'Never'
                          }
                        </p>
                        {apiKey.expiresAt && (
                          <p className="text-sm text-gray-500">
                            <span className="font-medium">Expires:</span> {new Date(apiKey.expiresAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center space-x-2">
                      <div className="flex-1 bg-gray-50 rounded-md p-2 font-mono text-sm">
                        {showKey === apiKey.id ? (
                          <span className="text-gray-900">api_key_{apiKey.id}_****</span>
                        ) : (
                          <span className="text-gray-500">••••••••••••••••••••••••••••••••</span>
                        )}
                      </div>
                      <button
                        onClick={() => toggleKeyVisibility(apiKey.id)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title={showKey === apiKey.id ? 'Hide key' : 'Show key'}
                      >
                        {showKey === apiKey.id ? (
                          <EyeSlashIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(`api_key_${apiKey.id}_****`)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="Copy to clipboard"
                      >
                        <ClipboardDocumentIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}