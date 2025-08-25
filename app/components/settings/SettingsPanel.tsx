/**
 * Settings Panel component
 * Main interface for system configuration
 */

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface SystemSettings {
  siteName: string
  siteDescription: string
  adminEmail: string
  allowRegistration: boolean
  maintenanceMode: boolean
  maxFileSize: number
  allowedFileTypes: string[]
}

export default function SettingsPanel() {
  const { data: session } = useSession()
  const [settings, setSettings] = useState<SystemSettings>({
    siteName: 'Kin Workspace CMS',
    siteDescription: 'Content Management System for Kin Workspace',
    adminEmail: 'admin@kinworkspace.com',
    allowRegistration: false,
    maintenanceMode: false,
    maxFileSize: 10, // MB
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    setSaved(false)

    try {
      // Simulate API call - in real implementation, this would save to database
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof SystemSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-matte-black font-satoshi">Settings</h1>
        <p className="text-slate-gray font-inter">
          Configure system settings and preferences
        </p>
      </div>

      {/* Success Message */}
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-green-700 font-inter">Settings saved successfully!</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-matte-black font-satoshi mb-4">
            General Settings
          </h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="siteName" className="form-label">Site Name</label>
              <input
                id="siteName"
                type="text"
                className="form-input"
                value={settings.siteName}
                onChange={(e) => handleInputChange('siteName', e.target.value)}
                placeholder="Enter site name"
              />
            </div>

            <div>
              <label htmlFor="siteDescription" className="form-label">Site Description</label>
              <textarea
                id="siteDescription"
                className="form-input"
                rows={3}
                value={settings.siteDescription}
                onChange={(e) => handleInputChange('siteDescription', e.target.value)}
                placeholder="Enter site description"
              />
            </div>

            <div>
              <label htmlFor="adminEmail" className="form-label">Admin Email</label>
              <input
                id="adminEmail"
                type="email"
                className="form-input"
                value={settings.adminEmail}
                onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                placeholder="Enter admin email address"
              />
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-matte-black font-satoshi mb-4">
            Security Settings
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="allowRegistration" className="form-label mb-0">Allow User Registration</label>
                <p className="text-sm text-slate-gray font-inter">
                  Allow new users to register accounts
                </p>
              </div>
              <label htmlFor="allowRegistration" className="relative inline-flex items-center cursor-pointer">
                <input
                  id="allowRegistration"
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.allowRegistration}
                  onChange={(e) => handleInputChange('allowRegistration', e.target.checked)}
                  title="Toggle user registration"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-dusty-sage/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-dusty-sage"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="maintenanceMode" className="form-label mb-0">Maintenance Mode</label>
                <p className="text-sm text-slate-gray font-inter">
                  Put the site in maintenance mode
                </p>
              </div>
              <label htmlFor="maintenanceMode" className="relative inline-flex items-center cursor-pointer">
                <input
                  id="maintenanceMode"
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.maintenanceMode}
                  onChange={(e) => handleInputChange('maintenanceMode', e.target.checked)}
                  title="Toggle maintenance mode"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
              </label>
            </div>
          </div>
        </div>

        {/* File Upload Settings */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-matte-black font-satoshi mb-4">
            File Upload Settings
          </h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="maxFileSize" className="form-label">Maximum File Size (MB)</label>
              <input
                id="maxFileSize"
                type="number"
                className="form-input"
                min="1"
                max="100"
                value={settings.maxFileSize}
                onChange={(e) => handleInputChange('maxFileSize', parseInt(e.target.value))}
                placeholder="Enter maximum file size in MB"
              />
            </div>

            <div>
              <label className="form-label">Allowed File Types</label>
              <div className="space-y-2">
                {['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'].map((type) => (
                  <label key={type} htmlFor={`filetype-${type}`} className="flex items-center">
                    <input
                      id={`filetype-${type}`}
                      type="checkbox"
                      className="rounded border-gray-300 text-dusty-sage focus:ring-dusty-sage"
                      checked={settings.allowedFileTypes.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleInputChange('allowedFileTypes', [...settings.allowedFileTypes, type])
                        } else {
                          handleInputChange('allowedFileTypes', settings.allowedFileTypes.filter(t => t !== type))
                        }
                      }}
                      title={`Allow ${type} files`}
                    />
                    <span className="ml-2 text-sm text-slate-gray font-inter">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-matte-black font-satoshi mb-4">
            System Information
          </h2>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-slate-gray font-inter">Version:</span>
              <span className="text-sm font-medium text-matte-black font-inter">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-gray font-inter">Environment:</span>
              <span className="text-sm font-medium text-matte-black font-inter">
                {process.env.NODE_ENV || 'development'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-gray font-inter">Database:</span>
              <span className="text-sm font-medium text-matte-black font-inter">PostgreSQL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-gray font-inter">Current User:</span>
              <span className="text-sm font-medium text-matte-black font-inter">
                {session?.user?.name} ({session?.user?.role})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-gray font-inter">
          Changes are saved automatically when you modify settings.
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-soft-white mr-2"></div>
                Saving...
              </div>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-matte-black font-satoshi mb-4">
          Quick Actions
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="btn-outline text-left p-4">
            <div className="font-medium text-matte-black font-satoshi">Clear Cache</div>
            <div className="text-sm text-slate-gray font-inter">Clear system cache</div>
          </button>
          
          <button className="btn-outline text-left p-4">
            <div className="font-medium text-matte-black font-satoshi">Export Data</div>
            <div className="text-sm text-slate-gray font-inter">Export system data</div>
          </button>
          
          <button className="btn-outline text-left p-4">
            <div className="font-medium text-matte-black font-satoshi">System Health</div>
            <div className="text-sm text-slate-gray font-inter">Check system status</div>
          </button>
        </div>
      </div>
    </div>
  )
}