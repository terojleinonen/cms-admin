'use client'

import { useState } from 'react'
import {
  CheckCircleIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { LoadingState } from '@/components/ui/LoadingState'

interface User {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  updatedAt: string
}

interface AccountReactivationProps {
  user: User
  onReactivationComplete?: (user: User) => void
  onCancel?: () => void
}

interface ReactivationFormData {
  reason: string
  notifyUser: boolean
  confirmReactivation: boolean
}

export function AccountReactivation({ 
  user, 
  onReactivationComplete,
  onCancel 
}: AccountReactivationProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [formData, setFormData] = useState<ReactivationFormData>({
    reason: '',
    notifyUser: true,
    confirmReactivation: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: keyof ReactivationFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.reason.trim()) {
      newErrors.reason = 'Reactivation reason is required'
    }

    if (!formData.confirmReactivation) {
      newErrors.confirmReactivation = 'You must confirm the reactivation'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleReactivate = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/users/${user.id}/deactivate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: formData.reason,
          notifyUser: formData.notifyUser,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to reactivate account')
      }

      onReactivationComplete?.(data.user)
    } catch (error) {
      console.error('Reactivation error:', error)
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to reactivate account' })
    } finally {
      setIsLoading(false)
    }
  }

  const getDeactivationDuration = () => {
    const deactivatedDate = new Date(user.updatedAt)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - deactivatedDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return '1 day'
    if (diffDays < 30) return `${diffDays} days`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`
    return `${Math.floor(diffDays / 365)} years`
  }

  if (!showConfirmation) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <CheckCircleIcon className="h-6 w-6 text-green-500" />
          <h3 className="text-lg font-medium text-gray-900">
            Reactivate {user.name}'s Account
          </h3>
        </div>

        <div className="space-y-6">
          {/* Account Information */}
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Account Information</h4>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="text-sm text-gray-900">{user.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Role</dt>
                <dd className="text-sm text-gray-900">{user.role}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Deactivated For</dt>
                <dd className="text-sm text-gray-900">{getDeactivationDuration()}</dd>
              </div>
            </dl>
          </div>

          {/* Reactivation Information */}
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <CheckCircleIcon className="h-5 w-5 text-green-400 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-green-800">
                  Reactivation Effects
                </h4>
                <div className="mt-2 text-sm text-green-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>User will be able to log in immediately</li>
                    <li>All account permissions will be restored</li>
                    <li>Previous data and preferences will be preserved</li>
                    <li>User will receive a notification email (if enabled)</li>
                    <li>Action will be logged in the audit trail</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowConfirmation(true)}
            >
              Proceed with Reactivation
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center space-x-3 mb-6">
        <CheckCircleIcon className="h-6 w-6 text-green-500" />
        <h3 className="text-lg font-medium text-gray-900">
          Confirm Account Reactivation
        </h3>
      </div>

      {isLoading ? (
        <LoadingState message="Reactivating account..." />
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); handleReactivate(); }} className="space-y-6">
          {/* Reactivation Reason */}
          <FormField
            label="Reason for Reactivation"
            required
            error={errors.reason}
          >
            <textarea
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              rows={3}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Please provide a reason for reactivating this account..."
            />
          </FormField>

          {/* Notification Option */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="notifyUser"
                type="checkbox"
                checked={formData.notifyUser}
                onChange={(e) => handleInputChange('notifyUser', e.target.checked)}
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="notifyUser" className="font-medium text-gray-700 flex items-center">
                <EnvelopeIcon className="h-4 w-4 mr-1" />
                Send notification email to user
              </label>
              <p className="text-gray-500">
                The user will receive an email notification that their account has been reactivated.
              </p>
            </div>
          </div>

          {/* Final Confirmation */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="confirmReactivation"
                type="checkbox"
                checked={formData.confirmReactivation}
                onChange={(e) => handleInputChange('confirmReactivation', e.target.checked)}
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="confirmReactivation" className="font-medium text-gray-700">
                I confirm that I want to reactivate this user account
              </label>
              {errors.confirmReactivation && (
                <p className="text-red-600 mt-1">{errors.confirmReactivation}</p>
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
              variant="primary"
              disabled={isLoading}
            >
              {isLoading ? 'Reactivating...' : 'Reactivate Account'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}