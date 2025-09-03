'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import LoadingState from '@/components/ui/LoadingState'

interface User {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
}

interface AccountDeactivationProps {
  user: User
  isOwnAccount: boolean
  onDeactivationComplete?: () => void
}

interface DeactivationFormData {
  reason: string
  confirmPassword: string
  dataRetention: boolean
  confirmDeactivation: boolean
}

export function AccountDeactivation({ 
  user, 
  isOwnAccount, 
  onDeactivationComplete 
}: AccountDeactivationProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [formData, setFormData] = useState<DeactivationFormData>({
    reason: '',
    confirmPassword: '',
    dataRetention: true,
    confirmDeactivation: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: keyof DeactivationFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.reason.trim()) {
      newErrors.reason = 'Deactivation reason is required'
    }

    if (isOwnAccount && !formData.confirmPassword) {
      newErrors.confirmPassword = 'Password confirmation is required'
    }

    if (!formData.confirmDeactivation) {
      newErrors.confirmDeactivation = 'You must confirm the deactivation'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleDeactivate = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/users/${user.id}/deactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: formData.reason,
          confirmPassword: isOwnAccount ? formData.confirmPassword : undefined,
          dataRetention: formData.dataRetention,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to deactivate account')
      }

      // If user deactivated their own account, sign them out
      if (isOwnAccount) {
        await signOut({ callbackUrl: '/auth/login?message=account-deactivated' })
      } else {
        onDeactivationComplete?.()
      }
    } catch (error) {
      console.error('Deactivation error:', error)
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to deactivate account' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportData = async () => {
    try {
      const response = await fetch(`/api/users/${user.id}/export?format=json&includeAuditLogs=true&includePreferences=true&includeCreatedContent=true`)
      
      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      // Trigger download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `user-data-export-${user.id}-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
      setErrors({ export: 'Failed to export data' })
    }
  }

  if (!showConfirmation) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
          <h3 className="text-lg font-medium text-gray-900">
            {isOwnAccount ? 'Deactivate Your Account' : `Deactivate ${user.name}'s Account`}
          </h3>
        </div>

        <div className="space-y-6">
          {/* Warning Information */}
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ShieldExclamationIcon className="h-5 w-5 text-red-400 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-red-800">
                  Important Information
                </h4>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Account deactivation will immediately disable login access</li>
                    <li>All active sessions will be terminated</li>
                    <li>Data will be preserved according to retention policies</li>
                    <li>Administrators can reactivate the account if needed</li>
                    {isOwnAccount && (
                      <li className="font-medium">You will be signed out immediately after deactivation</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Data Export Option */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-start">
              <DocumentArrowDownIcon className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="ml-3 flex-1">
                <h4 className="text-sm font-medium text-blue-800">
                  Export Your Data
                </h4>
                <p className="mt-1 text-sm text-blue-700">
                  Before deactivating, you can export all your account data including preferences, 
                  created content, and activity history.
                </p>
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportData}
                    className="text-blue-700 border-blue-300 hover:bg-blue-100"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {errors.export && (
            <div className="text-sm text-red-600">{errors.export}</div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => setShowConfirmation(true)}
            >
              Proceed with Deactivation
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center space-x-3 mb-6">
        <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
        <h3 className="text-lg font-medium text-gray-900">
          Confirm Account Deactivation
        </h3>
      </div>

      {isLoading ? (
        <LoadingState message="Deactivating account..." />
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); handleDeactivate(); }} className="space-y-6">
          {/* Deactivation Reason */}
          <FormField
            label="Reason for Deactivation"
            required
            error={errors.reason}
          >
            <textarea
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              rows={3}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Please provide a reason for this deactivation..."
            />
          </FormField>

          {/* Password Confirmation for Own Account */}
          {isOwnAccount && (
            <FormField
              label="Confirm Your Password"
              required
              error={errors.confirmPassword}
            >
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Enter your current password"
              />
            </FormField>
          )}

          {/* Data Retention Option */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="dataRetention"
                type="checkbox"
                checked={formData.dataRetention}
                onChange={(e) => handleInputChange('dataRetention', e.target.checked)}
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="dataRetention" className="font-medium text-gray-700">
                Retain account data according to data retention policies
              </label>
              <p className="text-gray-500">
                Keep user data for the standard retention period to allow for account reactivation.
                Uncheck this option only if immediate data deletion is required.
              </p>
            </div>
          </div>

          {/* Final Confirmation */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="confirmDeactivation"
                type="checkbox"
                checked={formData.confirmDeactivation}
                onChange={(e) => handleInputChange('confirmDeactivation', e.target.checked)}
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="confirmDeactivation" className="font-medium text-gray-700">
                I understand the consequences and want to proceed with deactivation
              </label>
              {errors.confirmDeactivation && (
                <p className="text-red-600 mt-1">{errors.confirmDeactivation}</p>
              )}
            </div>
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="text-sm text-red-600">{errors.submit}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirmation(false)}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={isLoading}
            >
              {isLoading ? 'Deactivating...' : 'Deactivate Account'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}