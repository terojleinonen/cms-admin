'use client'

/**
 * Compliance Dashboard Component
 * Comprehensive compliance reporting and audit trail management
 */

import { useState, useEffect } from 'react'
import {
  DocumentArrowDownIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ChartBarIcon,
  CalendarIcon,
  DocumentTextIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'

interface ComplianceMetrics {
  totalUsers: number
  activeUsers: number
  totalActions: number
  failedActions: number
  securityIncidents: number
  dataExports: number
  privilegedActions: number
  complianceScore: number
}

interface UserActivityReport {
  userId: string
  userName: string
  userEmail: string
  userRole: string
  totalActions: number
  loginCount: number
  failedLoginCount: number
  resourcesAccessed: string[]
  riskScore: number
  lastActivity: Date
}

interface SecurityStandardReport {
  standard: string
  requirements: Array<{
    id: string
    title: string
    status: 'compliant' | 'non-compliant' | 'partial'
    evidence: string[]
    gaps: string[]
    recommendations: string[]
  }>
  overallCompliance: number
  lastAssessment: Date
}

export function ComplianceDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  
  // Data state
  const [complianceMetrics, setComplianceMetrics] = useState<ComplianceMetrics | null>(null)
  const [userActivity, setUserActivity] = useState<UserActivityReport[]>([])
  const [securityStandards, setSecurityStandards] = useState<SecurityStandardReport[]>([])
  
  // Filter state
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })
  const [selectedStandard, setSelectedStandard] = useState<'SOC2' | 'GDPR' | 'ISO27001' | 'HIPAA'>('SOC2')

  useEffect(() => {
    fetchComplianceData()
  }, [dateRange])

  const fetchComplianceData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch compliance report
      const complianceResponse = await fetch(
        `/api/admin/compliance?type=compliance&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      )
      
      if (!complianceResponse.ok) {
        throw new Error('Failed to fetch compliance data')
      }
      
      const complianceData = await complianceResponse.json()
      setComplianceMetrics(complianceData.data.summary)

      // Fetch user activity
      const userActivityResponse = await fetch(
        `/api/admin/compliance?type=user-activity&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      )
      
      if (!userActivityResponse.ok) {
        throw new Error('Failed to fetch user activity data')
      }
      
      const userActivityData = await userActivityResponse.json()
      setUserActivity(userActivityData.data)

      // Fetch security standards
      const standardsPromises = ['SOC2', 'GDPR', 'ISO27001', 'HIPAA'].map(async (standard) => {
        const response = await fetch(`/api/admin/compliance?type=security-standard&standard=${standard}`)
        if (response.ok) {
          const data = await response.json()
          return data.data
        }
        return null
      })

      const standardsResults = await Promise.all(standardsPromises)
      setSecurityStandards(standardsResults.filter(Boolean))

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch compliance data')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'json' | 'csv' | 'pdf') => {
    try {
      setExporting(true)
      
      const response = await fetch('/api/admin/compliance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          format,
          includeFailures: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to export compliance report')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `compliance-report-${dateRange.startDate}-to-${dateRange.endDate}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export compliance report')
    } finally {
      setExporting(false)
    }
  }

  const getComplianceScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100'
    if (score >= 70) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getRiskScoreColor = (score: number) => {
    if (score >= 70) return 'text-red-600 bg-red-100'
    if (score >= 40) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance Dashboard</h1>
          <p className="text-gray-600">Monitor compliance status and generate audit reports</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Date Range Selector */}
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {/* Export Buttons */}
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => handleExport('json')}
              disabled={exporting}
              variant="outline"
              size="sm"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
              JSON
            </Button>
            <Button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              variant="outline"
              size="sm"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button
              onClick={() => handleExport('pdf')}
              disabled={exporting}
              variant="outline"
              size="sm"
            >
              <DocumentTextIcon className="h-4 w-4 mr-1" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Compliance Metrics */}
      {complianceMetrics && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ShieldCheckIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Compliance Score
                    </dt>
                    <dd className="flex items-baseline">
                      <div className={`text-2xl font-semibold ${getComplianceScoreColor(complianceMetrics.complianceScore)} px-2 py-1 rounded-full`}>
                        {complianceMetrics.complianceScore}%
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserGroupIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Users
                    </dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      {complianceMetrics.activeUsers} / {complianceMetrics.totalUsers}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Security Incidents
                    </dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      {complianceMetrics.securityIncidents}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Actions
                    </dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      {complianceMetrics.totalActions.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Standards Compliance */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Security Standards Compliance
            </h3>
            <select
              value={selectedStandard}
              onChange={(e) => setSelectedStandard(e.target.value as any)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="SOC2">SOC 2</option>
              <option value="GDPR">GDPR</option>
              <option value="ISO27001">ISO 27001</option>
              <option value="HIPAA">HIPAA</option>
            </select>
          </div>

          {securityStandards.find(s => s.standard === selectedStandard) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Overall Compliance</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  getComplianceScoreColor(securityStandards.find(s => s.standard === selectedStandard)!.overallCompliance)
                }`}>
                  {Math.round(securityStandards.find(s => s.standard === selectedStandard)!.overallCompliance)}%
                </span>
              </div>

              <div className="space-y-3">
                {securityStandards.find(s => s.standard === selectedStandard)!.requirements.map((req) => (
                  <div key={req.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">{req.id}: {req.title}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        req.status === 'compliant' ? 'bg-green-100 text-green-800' :
                        req.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    
                    {req.evidence.length > 0 && (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-gray-700">Evidence:</span>
                        <ul className="text-xs text-gray-600 ml-4 list-disc">
                          {req.evidence.map((evidence, idx) => (
                            <li key={idx}>{evidence}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {req.recommendations.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-gray-700">Recommendations:</span>
                        <ul className="text-xs text-gray-600 ml-4 list-disc">
                          {req.recommendations.map((rec, idx) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* High-Risk Users */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            High-Risk User Activity
          </h3>
          
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Actions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Failed Logins
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userActivity.slice(0, 10).map((user) => (
                  <tr key={user.userId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.userName}</div>
                        <div className="text-sm text-gray-500">{user.userEmail}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {user.userRole}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskScoreColor(user.riskScore)}`}>
                        {user.riskScore}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.totalActions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.failedLoginCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {new Date(user.lastActivity).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}