'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'

interface FormData {
  name: string
  permissions: string[]
  expiresAt: string
}

const availablePermissions = [
  { id: 'products:read', label: 'Read Products', description: 'View product information' },
  { id: 'products:write', label: 'Write Products', description: 'Create and update products' },
  { id: 'products:delete', label: 'Delete Products', description: 'Delete products' },
  { id: 'categories:read', label: 'Read Categories', description: 'View category information' },
  { id: 'categories:write', label: 'Write Categories', description: 'Create and update categories' },
  { id: 'categories:delete', label: 'Delete Categories', description: 'Delete categories' },
  { id: 'orders:read', label: 'Read Orders', description: 'View order information' },
  { id: 'orders:write', label: 'Write Orders', description: 'Create and update orders' },
  { id: 'media:read', label: 'Read Media', description: 'View media files' },
  { id: 'media:write', label: 'Write Media', description: 'Upload and manage media files' },
  { id: 'media:delete', label: 'Delete Media', description: 'Delete media files' },
  { id: 'analytics:read', label: 'Read Analytics', description: 'View analytics data' },
]

export default function CreateApiKeyForm() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    name: '',
    permissions: [],
    expiresAt: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdKey, setCreatedKey] = useState<{ id: string; apiKey: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          permissions: formData.permissions,
          expiresAt: formData.expiresAt || undefined
        })
      })

      const data = await response.json()

      if (response.ok) {
        setCreatedKey({ id: data.id, apiKey: data.apiKey })
      } else {
        setError(data.error || 'Failed to create API key')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        permissions: [...prev.permissions, permissionId]
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => p !== permissionId)
      }))
    }
  }

  const copyToClipboard = async () => {
    if (createdKey) {
      try {
        await navigator.clipboard.writeText(createdKey.apiKey)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        console.error('Failed to copy to clipboard:', error)
      }
    }
  }

  const selectAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: availablePermissions.map(p => p.id)
    }))
  }

  const clearAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: []
    }))
  }

  if (createdKey) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <CheckIcon className="h-6 w-6 text-green-600 mr-2" />
            <h3 className="text-lg font-medium text-green-900">API Key Created Successfully</h3>
          </div>
          
          <p className="text-sm text-green-700 mb-4">
            Your API key has been created. Please copy it now as it won&apos;t be shown again for security reasons.
          </p>
          
          <div className="bg-white border border-green-200 rounded-md p-4 mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <div className="flex items-center space-x-2">
              <code className="flex-1 bg-gray-50 p-2 rounded text-sm font-mono break-all">
                {createdKey.apiKey}
              </code>
              <button
                onClick={copyToClipboard}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Copy to clipboard"
              >
                <ClipboardDocumentIcon className="h-5 w-5" />
              </button>
            </div>
            {copied && (
              <p className="text-sm text-green-600 mt-2">Copied to clipboard!</p>
            )}
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={() => router.push('/admin/api/keys')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              View All API Keys
            </button>
            <button
              onClick={() => {
                setCreatedKey(null)
                setFormData({ name: '', permissions: [], expiresAt: '' })
              }}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Create Another Key
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* API Key Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            API Key Name
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="e.g., Mobile App Integration"
          />
          <p className="mt-1 text-sm text-gray-500">
            Choose a descriptive name to identify this API key
          </p>
        </div>

        {/* Expiration Date */}
        <div>
          <label htmlFor="expiresAt" className="block text-sm font-medium text-gray-700">
            Expiration Date (Optional)
          </label>
          <input
            type="datetime-local"
            id="expiresAt"
            value={formData.expiresAt}
            onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            Leave empty for no expiration
          </p>
        </div>

        {/* Permissions */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Permissions
            </label>
            <div className="space-x-2">
              <button
                type="button"
                onClick={selectAllPermissions}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={clearAllPermissions}
                className="text-sm text-gray-600 hover:text-gray-500"
              >
                Clear All
              </button>
            </div>
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto border border-gray-200 rounded-md p-4">
            {availablePermissions.map((permission) => (
              <div key={permission.id} className="flex items-start">
                <input
                  type="checkbox"
                  id={permission.id}
                  checked={formData.permissions.includes(permission.id)}
                  onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="ml-3">
                  <label htmlFor={permission.id} className="text-sm font-medium text-gray-700">
                    {permission.label}
                  </label>
                  <p className="text-sm text-gray-500">{permission.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          {formData.permissions.length === 0 && (
            <p className="mt-2 text-sm text-red-600">
              Please select at least one permission
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.push('/admin/api/keys')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || formData.permissions.length === 0}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create API Key'}
          </button>
        </div>
      </form>
    </div>
  )
}