'use client'

import { useState, useEffect } from 'react'
import {
  TrashIcon,
  ClockIcon,
  DocumentChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { Button } from '../ui/Button'
import { FormField } from '../ui/FormField'
import { LoadingState } from '../ui/LoadingState'

interface RetentionPolicy {
  auditLogRetentionDays: number
  inactiveSessionRetentionDays: number
  deactivatedUserRetentionDays: number
  mediaFileRetentionDays: number
  backupRetentionDays: number
}

interface CleanupResult {
  auditLogsDeleted: number
  sessionsDeleted: number
  usersDeleted: number
  mediaFilesDeleted: number
  backupsDeleted: number
  totalSpaceFreed: number
}

interface CleanupPreview extends CleanupResult {
  isDryRun: true
}

export function DataRetentionManager() {
  const [isLoading, setIsLoading] = useState(false)
  const [policy, setPolicy] = useState<RetentionPolicy>({
    auditLogRetentionDays: 365,
    inactiveSessionRetentionDays: 30,
    deactivatedUserRetentionDays: 90,
    mediaFileRetentionDays: 180,
    backupRetentionDays: 90,
  })
  const [preview, setPreview] = useState<CleanupPreview | null>(null)
  const [lastCleanup, setLastCleanup] = useState<CleanupResult | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handlePolicyChange = (field: keyof RetentionPolicy, value: number) => {
    setPolicy(prev => ({ ...prev, [field]: value }))
    setPreview(null) // Clear preview when policy changes
  }

  const getCleanupPreview = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/data-retention/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(policy),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get cleanup preview')
      }

      setPreview(data.preview)
    } catch (error) {
      console.error('Preview error:', error)
      setErrors({ preview: error instanceof Error ? error.message : 'Failed to get preview' })
    } finally {
      setIsLoading(false)
    }
  }

  const performCleanup = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/data-retention/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(policy),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to perform cleanup')
      }

      setLastCleanup(data.result)
      setPreview(null)
      setShowConfirmation(false)
    } catch (error) {
      console.error('Cleanup error:', error)
      setErrors({ cleanup: error instanceof Error ? error.message : 'Failed to perform cleanup' })
    } finally {
      setIsLoading(false)
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <ClockIcon className="h-6 w-6 text-indigo-500" />
          <h2 className="text-lg font-medium text-gray-900">Data Retention Management</h2>
        </div>
        <p className="text-sm text-gray-600">
          Configure data retention policies and perform cleanup operations to manage storage and comply with data protection regulations.
        </p>
      </div>

      {/* Retention Policy Configuration */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Retention Policies</h3>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            label="Audit Log Retention (days)"
            description="How long to keep audit log entries"
          >
            <input
              type="number"
              min="1"
              max="3650"
              value={policy.auditLogRetentionDays}
              onChange={(e) => handlePolicyChange('auditLogRetentionDays', parseInt(e.target.value) || 365)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </FormField>

          <FormField
            label="Inactive Session Retention (days)"
            description="How long to keep inactive user sessions"
          >
            <input
              type="number"
              min="1"
              max="365"
              value={policy.inactiveSessionRetentionDays}
              onChange={(e) => handlePolicyChange('inactiveSessionRetentionDays', parseInt(e.target.value) || 30)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </FormField>

          <FormField
            label="Deactivated User Retention (days)"
            description="How long to keep deactivated user accounts before deletion"
          >
            <input
              type="number"
              min="1"
              max="3650"
              value={policy.deactivatedUserRetentionDays}
              onChange={(e) => handlePolicyChange('deactivatedUserRetentionDays', parseInt(e.target.value) || 90)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </FormField>

          <FormField
            label="Orphaned Media Retention (days)"
            description="How long to keep media files not referenced by any content"
          >
            <input
              type="number"
              min="1"
              max="3650"
              value={policy.mediaFileRetentionDays}
              onChange={(e) => handlePolicyChange('mediaFileRetentionDays', parseInt(e.target.value) || 180)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </FormField>

          <FormField
            label="Backup Retention (days)"
            description="How long to keep system backups"
          >
            <input
              type="number"
              min="1"
              max="3650"
              value={policy.backupRetentionDays}
              onChange={(e) => handlePolicyChange('backupRetentionDays', parseInt(e.target.value) || 90)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </FormField>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={getCleanupPreview}
            disabled={isLoading}
            className="flex items-center"
          >
            <DocumentChartBarIcon className="h-4 w-4 mr-2" />
            {isLoading ? 'Generating Preview...' : 'Preview Cleanup'}
          </Button>
        </div>

        {errors.preview && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
            <div className="text-sm text-red-600">{errors.preview}</div>
          </div>
        )}
      </div>

      {/* Cleanup Preview */}
      {preview && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Cleanup Preview</h3>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">
                  Preview Results
                </h4>
                <p className="mt-1 text-sm text-yellow-700">
                  This shows what would be deleted if cleanup is performed with the current retention policy.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Audit Logs</div>
              <div className="text-2xl font-bold text-gray-900">{formatNumber(preview.auditLogsDeleted)}</div>
              <div className="text-sm text-gray-600">entries to delete</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Inactive Sessions</div>
              <div className="text-2xl font-bold text-gray-900">{formatNumber(preview.sessionsDeleted)}</div>
              <div className="text-sm text-gray-600">sessions to delete</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Deactivated Users</div>
              <div className="text-2xl font-bold text-gray-900">{formatNumber(preview.usersDeleted)}</div>
              <div className="text-sm text-gray-600">users to delete</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Orphaned Media</div>
              <div className="text-2xl font-bold text-gray-900">{formatNumber(preview.mediaFilesDeleted)}</div>
              <div className="text-sm text-gray-600">files to delete</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Old Backups</div>
              <div className="text-2xl font-bold text-gray-900">{formatNumber(preview.backupsDeleted)}</div>
              <div className="text-sm text-gray-600">backups to delete</div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm font-medium text-green-600">Space to Free</div>
              <div className="text-2xl font-bold text-green-900">{formatBytes(preview.totalSpaceFreed)}</div>
              <div className="text-sm text-green-600">storage space</div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setPreview(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => setShowConfirmation(true)}
              className="flex items-center"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Perform Cleanup
            </Button>
          </div>
        </div>
      )}

      {/* Cleanup Confirmation */}
      {showConfirmation && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
            <h3 className="text-lg font-medium text-gray-900">Confirm Data Cleanup</h3>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="text-sm text-red-700">
              <p className="font-medium mb-2">⚠️ This action cannot be undone!</p>
              <p>
                You are about to permanently delete data according to the retention policy. 
                Make sure you have recent backups and that this cleanup aligns with your data protection requirements.
              </p>
            </div>
          </div>

          {isLoading ? (
            <LoadingState message="Performing cleanup..." />
          ) : (
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={performCleanup}
                disabled={isLoading}
              >
                {isLoading ? 'Cleaning Up...' : 'Confirm Cleanup'}
              </Button>
            </div>
          )}

          {errors.cleanup && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
              <div className="text-sm text-red-600">{errors.cleanup}</div>
            </div>
          )}
        </div>
      )}

      {/* Last Cleanup Results */}
      {lastCleanup && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircleIcon className="h-6 w-6 text-green-500" />
            <h3 className="text-lg font-medium text-gray-900">Cleanup Completed</h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm font-medium text-green-600">Audit Logs Deleted</div>
              <div className="text-2xl font-bold text-green-900">{formatNumber(lastCleanup.auditLogsDeleted)}</div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm font-medium text-green-600">Sessions Deleted</div>
              <div className="text-2xl font-bold text-green-900">{formatNumber(lastCleanup.sessionsDeleted)}</div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm font-medium text-green-600">Users Deleted</div>
              <div className="text-2xl font-bold text-green-900">{formatNumber(lastCleanup.usersDeleted)}</div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm font-medium text-green-600">Media Files Deleted</div>
              <div className="text-2xl font-bold text-green-900">{formatNumber(lastCleanup.mediaFilesDeleted)}</div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm font-medium text-green-600">Backups Deleted</div>
              <div className="text-2xl font-bold text-green-900">{formatNumber(lastCleanup.backupsDeleted)}</div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm font-medium text-blue-600">Space Freed</div>
              <div className="text-2xl font-bold text-blue-900">{formatBytes(lastCleanup.totalSpaceFreed)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}