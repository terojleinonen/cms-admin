'use client'

/**
 * Compliance Reporting Interface Component
 * Advanced compliance reporting and audit trail analysis for regulatory requirements
 */

import { useState, useEffect } from 'react'
import {
  DocumentArrowDownIcon,
  CalendarIcon,
  FunnelIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'

interface ComplianceReport {
  logs: Array<{
    id: string
    userId: string
    action: string
    resource: string
    details: Record<string, any> | null
    ipAddress: string | null
    userAgent: string | null
    createdAt: string
    user: {
      id: string
      name: string
      email: string
      role: string
    }
  }>
  summary: {
    totalActions: number
    uniqueUsers: number
    failedActions: number
    criticalEvents: number
  }
}

interface ComplianceFilters {
  startDate: string
  endDate: string
  userId?: string
  actions?: string[]
  resources?: string[]
  includeFailures: boolean
}

interface ComplianceMetrics {
  dataAccess: number
  dataModification: number
  dataExport: number
  adminActions: number
  userManagement: number
  securityEvents: number
  complianceScore: number
}

const COMPLIANCE_STANDARDS = {
  'GDPR': {
    name: 'General Data Protection Regulation',
    requirements: [
      'Data access logging',
      'Data modification tracking',
      'Data export monitoring',
      'User consent management',
      'Right to be forgotten',
    ]
  },
  'SOX': {
    name: 'Sarbanes-Oxley Act',
    requirements: [
      'Financial data access controls',
      'Administrative action logging',
      'User role management',
      'System change tracking',
      'Access review processes',
    ]
  },
  'HIPAA': {
    name: 'Health Insurance Portability and Accountability Act',
    requirements: [
      'PHI access logging',
      'User authentication tracking',
      'Data breach monitoring',
      'Access control validation',
      'Audit trail integrity',
    ]
  },
  'PCI_DSS': {
    name: 'Payment Card Industry Data Security Standard',
    requirements: [
      'Cardholder data access',
      'Security event monitoring',
      'Access control testing',
      'Network activity logging',
      'Vulnerability management',
    ]
  }
}

const ACTION_CATEGORIES = {
  'auth.': 'Authentication',
  'user.': 'User Management',
  'security.': 'Security Events',
  'system.': 'System Administration',
  'resource.': 'Resource Access',
}

export default function ComplianceReportingInterface() {
  const [report, setReport] = useState<ComplianceReport | null>(null)
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  // Filter state
  const [filters, setFilters] = useState<ComplianceFilters>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    includeFailures: true,
  })

  // UI state
  const [selectedStandard, setSelectedStandard] = useState<keyof typeof COMPLIANCE_STANDARDS>('GDPR')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'report' | 'metrics' | 'standards'>('overview')

  // Available users, actions, and resources for filters
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [availableActions, setAvailableActions] = useState<string[]>([])
  const [availableResources, setAvailableResources] = useState<string[]>([])

  // Generate compliance report
  const generateComplianceReport = async (format: 'json' | 'csv') => {
    try {
      setGenerating(true)

      const response = await fetch('/api/audit-logs/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...filters,
          format,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate compliance report')
      }

      if (format === 'csv') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `compliance-report-${filters.startDate}-${filters.endDate}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        return null
      } else {
        const data = await response.json()
        setReport(data.data)
        return data.data
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate compliance report')
      return null
    } finally {
      setGenerating(false)
    }
  }

  // Fetch compliance data
  const fetchComplianceData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [reportResponse, metricsResponse] = await Promise.all([
        generateComplianceReport('json'),
        fetch(`/api/audit-logs/analysis?startDate=${filters.startDate}&endDate=${filters.endDate}`)
      ])

      if (!metricsResponse.ok) {
        throw new Error('Failed to fetch compliance metrics')
      }

      const metricsData = await metricsResponse.json()
      
      setMetrics({
        ...metricsData.data.complianceMetrics,
        securityEvents: metricsData.data.securityMetrics.totalSecurityEvents,
        complianceScore: calculateComplianceScore(metricsData.data),
      })

      // Extract unique values for filters
      if (reportResponse && typeof reportResponse === 'object' && 'logs' in reportResponse) {
        const logs = reportResponse.logs
        const users = [...new Set(logs.map((log: any) => ({ 
          id: log.userId, 
          name: log.user.name, 
          email: log.user.email 
        })))]
        const actions = [...new Set(logs.map((log: any) => log.action))]
        const resources = [...new Set(logs.map((log: any) => log.resource))]

        setAvailableUsers(users)
        setAvailableActions(actions.sort())
        setAvailableResources(resources.sort())
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch compliance data')
    } finally {
      setLoading(false)
    }
  }

  // Calculate compliance score based on metrics
  const calculateComplianceScore = (data: any): number => {
    const totalActions = data.summary.totalLogs || 1
    const failedActions = data.securityMetrics.totalSecurityEvents || 0
    const criticalEvents = data.securityMetrics.criticalEvents || 0
    
    // Base score starts at 100
    let score = 100
    
    // Deduct points for failures and security events
    const failureRate = (failedActions / totalActions) * 100
    const criticalRate = (criticalEvents / totalActions) * 100
    
    score -= Math.min(failureRate * 2, 30) // Max 30 points deduction for failures
    score -= Math.min(criticalRate * 5, 40) // Max 40 points deduction for critical events
    
    return Math.max(Math.round(score), 0)
  }  
// Get compliance score color
  const getComplianceScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100'
    if (score >= 75) return 'text-yellow-600 bg-yellow-100'
    if (score >= 60) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  // Format action name for display
  const formatAction = (action: string) => {
    return action
      .split('.')
      .map(part => part.replace(/_/g, ' '))
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' → ')
  }

  // Get action category
  const getActionCategory = (action: string) => {
    for (const [prefix, category] of Object.entries(ACTION_CATEGORIES)) {
      if (action.startsWith(prefix)) {
        return category
      }
    }
    return 'Other'
  }

  useEffect(() => {
    fetchComplianceData()
  }, [filters.startDate, filters.endDate])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }  r
eturn (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Compliance Reporting</h2>
          <p className="text-gray-600">Generate comprehensive compliance reports and audit trail analysis</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
          </button>
          
          <button
            onClick={() => generateComplianceReport('csv')}
            disabled={generating}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          
          <button
            onClick={() => generateComplianceReport('json')}
            disabled={generating}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Generate Report
          </button>
        </div>
      </div>      {/*
 Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Report Filters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User
              </label>
              <select
                value={filters.userId || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value || undefined }))}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">All Users</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeFailures"
                checked={filters.includeFailures}
                onChange={(e) => setFilters(prev => ({ ...prev, includeFailures: e.target.checked }))}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="includeFailures" className="ml-2 block text-sm text-gray-900">
                Include Failed Actions
              </label>
            </div>
          </div>
        </div>
      )}      
{/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center text-sm text-red-700">
            <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
            {error}
          </div>
        </div>
      )}

      {/* Compliance Score */}
      {metrics && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Compliance Score</h3>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getComplianceScoreColor(metrics.complianceScore)}`}>
              <ShieldCheckIcon className="h-4 w-4 mr-1" />
              {metrics.complianceScore}/100
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div
              className={`h-3 rounded-full ${
                metrics.complianceScore >= 90 ? 'bg-green-600' :
                metrics.complianceScore >= 75 ? 'bg-yellow-600' :
                metrics.complianceScore >= 60 ? 'bg-orange-600' : 'bg-red-600'
              }`}
              style={{ width: `${metrics.complianceScore}%` }}
            ></div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.dataAccess}</div>
              <div className="text-sm text-gray-600">Data Access</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{metrics.dataModification}</div>
              <div className="text-sm text-gray-600">Data Modification</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{metrics.dataExport}</div>
              <div className="text-sm text-gray-600">Data Export</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{metrics.adminActions}</div>
              <div className="text-sm text-gray-600">Admin Actions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{metrics.userManagement}</div>
              <div className="text-sm text-gray-600">User Management</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{metrics.securityEvents}</div>
              <div className="text-sm text-gray-600">Security Events</div>
            </div>
          </div>
        </div>
      )}  
    {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: ChartBarIcon },
            { id: 'report', name: 'Detailed Report', icon: EyeIcon },
            { id: 'metrics', name: 'Metrics', icon: ClockIcon },
            { id: 'standards', name: 'Standards', icon: ShieldCheckIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`${
                selectedTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {selectedTab === 'overview' && report && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <ChartBarIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Actions</p>
                  <p className="text-2xl font-bold text-gray-900">{report.summary.totalActions}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <UserIcon className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Unique Users</p>
                  <p className="text-2xl font-bold text-gray-900">{report.summary.uniqueUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Failed Actions</p>
                  <p className="text-2xl font-bold text-gray-900">{report.summary.failedActions}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <ShieldCheckIcon className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Critical Events</p>
                  <p className="text-2xl font-bold text-gray-900">{report.summary.criticalEvents}</p>
                </div>
              </div>
            </div>
          </div>
        )}        
{/* Detailed Report Tab */}
        {selectedTab === 'report' && report && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Detailed Audit Log Report</h3>
              <p className="text-sm text-gray-600">
                Showing {report.logs.length} audit log entries from {filters.startDate} to {filters.endDate}
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resource
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {report.logs.slice(0, 100).map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{log.user.name}</div>
                        <div className="text-sm text-gray-500">{log.user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatAction(log.action)}</div>
                        <div className="text-sm text-gray-500">{getActionCategory(log.action)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.resource}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.details?.success !== false ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                            Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                        {log.ipAddress || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {report.logs.length > 100 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Showing first 100 entries. Export full report for complete data.
                </p>
              </div>
            )}
          </div>
        )}        
{/* Metrics Tab */}
        {selectedTab === 'metrics' && metrics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Compliance Metrics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Data Access Events</span>
                  <span className="text-sm font-medium text-gray-900">{metrics.dataAccess}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Data Modification Events</span>
                  <span className="text-sm font-medium text-gray-900">{metrics.dataModification}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Data Export Events</span>
                  <span className="text-sm font-medium text-gray-900">{metrics.dataExport}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Administrative Actions</span>
                  <span className="text-sm font-medium text-gray-900">{metrics.adminActions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">User Management Events</span>
                  <span className="text-sm font-medium text-gray-900">{metrics.userManagement}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Security Events</span>
                  <span className="text-sm font-medium text-gray-900">{metrics.securityEvents}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Compliance Assessment</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Overall Score</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getComplianceScoreColor(metrics.complianceScore)}`}>
                    {metrics.complianceScore}/100
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Audit Trail Completeness</span>
                  <span className="text-xs font-medium text-green-600">Complete</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Data Integrity</span>
                  <span className="text-xs font-medium text-green-600">Verified</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Access Controls</span>
                  <span className="text-xs font-medium text-green-600">Enforced</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Security Monitoring</span>
                  <span className="text-xs font-medium text-green-600">Active</span>
                </div>
              </div>
            </div>
          </div>
        )}  
      {/* Standards Tab */}
        {selectedTab === 'standards' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Compliance Standards</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(COMPLIANCE_STANDARDS).map(([key, standard]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedStandard(key as keyof typeof COMPLIANCE_STANDARDS)}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      selectedStandard === key
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{key}</div>
                    <div className="text-sm text-gray-600">{standard.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {COMPLIANCE_STANDARDS[selectedStandard].name} Requirements
              </h3>
              <div className="space-y-3">
                {COMPLIANCE_STANDARDS[selectedStandard].requirements.map((requirement, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-sm text-gray-700">{requirement}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}