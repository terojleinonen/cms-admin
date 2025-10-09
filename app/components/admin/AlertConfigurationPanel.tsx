'use client'

import { useState, useEffect } from 'react'
import { 
  BellIcon, 
  EnvelopeIcon, 
  GlobeAltIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon
} from '@heroicons/react/24/outline'
import { AlertNotificationConfig, AlertRule } from '@/app/lib/system-alert-service'

interface AlertConfigurationPanelProps {
  className?: string
}

export default function AlertConfigurationPanel({ className = '' }: AlertConfigurationPanelProps) {
  const [config, setConfig] = useState<AlertNotificationConfig>({
    email: { enabled: false, recipients: [], threshold: 'high' },
    webhook: { enabled: false, url: '', threshold: 'critical' },
    inApp: { enabled: true, threshold: 'low' }
  })
  const [alertRules, setAlertRules] = useState<AlertRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddRule, setShowAddRule] = useState(false)
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null)

  useEffect(() => {
    fetchConfiguration()
  }, [])

  const fetchConfiguration = async () => {
    try {
      setLoading(true)
      // In a real implementation, this would fetch from an API
      // For now, we'll use mock data
      setConfig({
        email: { enabled: false, recipients: ['admin@example.com'], threshold: 'high' },
        webhook: { enabled: false, url: '', threshold: 'critical' },
        inApp: { enabled: true, threshold: 'low' }
      })
      
      setAlertRules([
        {
          id: 'cache-hit-rate-low',
          name: 'Low Cache Hit Rate',
          description: 'Permission cache hit rate is below threshold',
          condition: 'cacheHitRate < 0.8',
          severity: 'medium',
          enabled: true,
          cooldownMinutes: 15
        },
        {
          id: 'response-time-high',
          name: 'High Response Time',
          description: 'Permission system response time is above threshold',
          condition: 'avgResponseTime > 100ms',
          severity: 'high',
          enabled: true,
          cooldownMinutes: 10
        }
      ])
    } catch (error) {
      console.error('Error fetching configuration:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveConfiguration = async () => {
    try {
      setSaving(true)
      // In a real implementation, this would save to an API
      console.log('Saving configuration:', config)
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      alert('Configuration saved successfully!')
    } catch (error) {
      console.error('Error saving configuration:', error)
      alert('Error saving configuration')
    } finally {
      setSaving(false)
    }
  }

  const testNotifications = async (severity: 'low' | 'medium' | 'high' | 'critical') => {
    try {
      // In a real implementation, this would call the test API
      console.log(`Testing notifications with severity: ${severity}`)
      alert(`Test notification sent with severity: ${severity}`)
    } catch (error) {
      console.error('Error testing notifications:', error)
      alert('Error sending test notification')
    }
  }

  const updateEmailConfig = (updates: Partial<typeof config.email>) => {
    setConfig(prev => ({
      ...prev,
      email: { ...prev.email!, ...updates }
    }))
  }

  const updateWebhookConfig = (updates: Partial<typeof config.webhook>) => {
    setConfig(prev => ({
      ...prev,
      webhook: { ...prev.webhook!, ...updates }
    }))
  }

  const updateInAppConfig = (updates: Partial<typeof config.inApp>) => {
    setConfig(prev => ({
      ...prev,
      inApp: { ...prev.inApp!, ...updates }
    }))
  }

  const addEmailRecipient = (email: string) => {
    if (email && !config.email?.recipients.includes(email)) {
      updateEmailConfig({
        recipients: [...(config.email?.recipients || []), email]
      })
    }
  }

  const removeEmailRecipient = (email: string) => {
    updateEmailConfig({
      recipients: config.email?.recipients.filter(r => r !== email) || []
    })
  }

  const toggleAlertRule = (ruleId: string) => {
    setAlertRules(prev => 
      prev.map(rule => 
        rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
      )
    )
  }

  const deleteAlertRule = (ruleId: string) => {
    if (confirm('Are you sure you want to delete this alert rule?')) {
      setAlertRules(prev => prev.filter(rule => rule.id !== ruleId))
    }
  }

  if (loading) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Notification Channels */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Notification Channels</h3>
          <button
            onClick={saveConfiguration}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>

        <div className="space-y-6">
          {/* In-App Notifications */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <BellIcon className="h-5 w-5 text-gray-400 mr-2" />
                <h4 className="text-sm font-medium text-gray-900">In-App Notifications</h4>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.inApp?.enabled || false}
                  onChange={(e) => updateInAppConfig({ enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="ml-7">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Severity
              </label>
              <select
                value={config.inApp?.threshold || 'low'}
                onChange={(e) => updateInAppConfig({ threshold: e.target.value as any })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Email Notifications */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-2" />
                <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.email?.enabled || false}
                  onChange={(e) => updateEmailConfig({ enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            {config.email?.enabled && (
              <div className="ml-7 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Severity
                  </label>
                  <select
                    value={config.email?.threshold || 'high'}
                    onChange={(e) => updateEmailConfig({ threshold: e.target.value as any })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipients
                  </label>
                  <div className="space-y-2">
                    {config.email?.recipients.map((email, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                        <span className="text-sm text-gray-900">{email}</span>
                        <button
                          onClick={() => removeEmailRecipient(email)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex">
                      <input
                        type="email"
                        placeholder="Enter email address"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addEmailRecipient((e.target as HTMLInputElement).value)
                            ;(e.target as HTMLInputElement).value = ''
                          }
                        }}
                      />
                      <button
                        onClick={(e) => {
                          const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement
                          addEmailRecipient(input.value)
                          input.value = ''
                        }}
                        className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-700 hover:bg-gray-100"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Webhook Notifications */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <GlobeAltIcon className="h-5 w-5 text-gray-400 mr-2" />
                <h4 className="text-sm font-medium text-gray-900">Webhook Notifications</h4>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.webhook?.enabled || false}
                  onChange={(e) => updateWebhookConfig({ enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            {config.webhook?.enabled && (
              <div className="ml-7 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    value={config.webhook?.url || ''}
                    onChange={(e) => updateWebhookConfig({ url: e.target.value })}
                    placeholder="https://your-webhook-endpoint.com/alerts"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Severity
                  </label>
                  <select
                    value={config.webhook?.threshold || 'critical'}
                    onChange={(e) => updateWebhookConfig({ threshold: e.target.value as any })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Test Notifications */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Test Notifications</h4>
          <div className="flex space-x-2">
            {(['low', 'medium', 'high', 'critical'] as const).map((severity) => (
              <button
                key={severity}
                onClick={() => testNotifications(severity)}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  severity === 'low' ? 'bg-blue-100 text-blue-800' :
                  severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  severity === 'high' ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                }`}
              >
                Test {severity}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alert Rules */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Alert Rules</h3>
          <button
            onClick={() => setShowAddRule(true)}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Rule
          </button>
        </div>

        <div className="space-y-4">
          {alertRules.map((rule) => (
            <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h4 className="text-sm font-medium text-gray-900">{rule.name}</h4>
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      rule.severity === 'low' ? 'bg-blue-100 text-blue-800' :
                      rule.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      rule.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {rule.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{rule.description}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Condition: {rule.condition} | Cooldown: {rule.cooldownMinutes}min
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => toggleAlertRule(rule.id)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <button
                    onClick={() => setEditingRule(rule)}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteAlertRule(rule.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}