/**
 * PageStatusManager Component
 * Handles page status changes with workflow validation
 */

'use client'

import { useState } from 'react'
import { 
  CheckCircleIcon, 
  ClockIcon, 
  EyeIcon, 
  ArchiveBoxIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

type PageStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED'

interface PageStatusManagerProps {
  currentStatus: PageStatus
  pageId: string
  pageTitle: string
  onStatusChange: (newStatus: PageStatus) => Promise<void>
  disabled?: boolean
  showWorkflow?: boolean
}

interface StatusConfig {
  label: string
  color: string
  bgColor: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  allowedTransitions: PageStatus[]
}

const STATUS_CONFIG: Record<PageStatus, StatusConfig> = {
  DRAFT: {
    label: 'Draft',
    color: 'text-gray-800',
    bgColor: 'bg-gray-100',
    icon: ClockIcon,
    description: 'Page is being worked on and not visible to public',
    allowedTransitions: ['REVIEW', 'PUBLISHED', 'ARCHIVED']
  },
  REVIEW: {
    label: 'Review',
    color: 'text-yellow-800',
    bgColor: 'bg-yellow-100',
    icon: ExclamationTriangleIcon,
    description: 'Page is ready for review before publishing',
    allowedTransitions: ['DRAFT', 'PUBLISHED', 'ARCHIVED']
  },
  PUBLISHED: {
    label: 'Published',
    color: 'text-green-800',
    bgColor: 'bg-green-100',
    icon: CheckCircleIcon,
    description: 'Page is live and visible to public',
    allowedTransitions: ['DRAFT', 'REVIEW', 'ARCHIVED']
  },
  ARCHIVED: {
    label: 'Archived',
    color: 'text-red-800',
    bgColor: 'bg-red-100',
    icon: ArchiveBoxIcon,
    description: 'Page is archived and not visible to public',
    allowedTransitions: ['DRAFT', 'REVIEW', 'PUBLISHED']
  }
}

export default function PageStatusManager({
  currentStatus,
  pageId,
  pageTitle,
  onStatusChange,
  disabled = false,
  showWorkflow = true
}: PageStatusManagerProps) {
  const [loading, setLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState<PageStatus | null>(null)

  const currentConfig = STATUS_CONFIG[currentStatus]

  const handleStatusChange = async (newStatus: PageStatus) => {
    // Check if transition is allowed
    if (!currentConfig.allowedTransitions.includes(newStatus)) {
      return
    }

    // Show confirmation for certain transitions
    if (shouldShowConfirmation(currentStatus, newStatus)) {
      setShowConfirmation(newStatus)
      return
    }

    await executeStatusChange(newStatus)
  }

  const executeStatusChange = async (newStatus: PageStatus) => {
    setLoading(true)
    try {
      await onStatusChange(newStatus)
      setShowConfirmation(null)
    } catch (error) {
      console.error('Failed to change status:', error)
    } finally {
      setLoading(false)
    }
  }

  const shouldShowConfirmation = (from: PageStatus, to: PageStatus): boolean => {
    // Show confirmation when:
    // - Publishing from any status
    // - Archiving from published
    // - Moving from published to draft
    return (
      to === 'PUBLISHED' ||
      (from === 'PUBLISHED' && to === 'ARCHIVED') ||
      (from === 'PUBLISHED' && to === 'DRAFT')
    )
  }

  const getConfirmationMessage = (newStatus: PageStatus): string => {
    switch (newStatus) {
      case 'PUBLISHED':
        return `Are you sure you want to publish "${pageTitle}"? This will make it visible to the public.`
      case 'ARCHIVED':
        return `Are you sure you want to archive "${pageTitle}"? This will remove it from public view.`
      case 'DRAFT':
        return `Are you sure you want to move "${pageTitle}" back to draft? This will remove it from public view.`
      default:
        return `Are you sure you want to change the status of "${pageTitle}"?`
    }
  }

  const StatusIcon = currentConfig.icon

  return (
    <div className="relative">
      {/* Current Status Display */}
      <div className="flex items-center space-x-2">
        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${currentConfig.bgColor} ${currentConfig.color}`}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {currentConfig.label}
        </div>
        
        {showWorkflow && !disabled && (
          <div className="relative">
            <select
              value={currentStatus}
              onChange={(e) => handleStatusChange(e.target.value as PageStatus)}
              disabled={loading}
              className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              <option value={currentStatus}>{currentConfig.label}</option>
              {currentConfig.allowedTransitions.map((status) => (
                <option key={status} value={status}>
                  Change to {STATUS_CONFIG[status].label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Status Description */}
      {showWorkflow && (
        <p className="text-xs text-gray-500 mt-1">
          {currentConfig.description}
        </p>
      )}

      {/* Workflow Actions */}
      {showWorkflow && !disabled && (
        <div className="mt-2 flex flex-wrap gap-1">
          {currentConfig.allowedTransitions.map((status) => {
            const config = STATUS_CONFIG[status]
            const ActionIcon = config.icon
            
            return (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                disabled={loading}
                className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 ${config.color}`}
                title={`Change to ${config.label}`}
              >
                <ActionIcon className="w-3 h-3 mr-1" />
                {config.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">
                Confirm Status Change
              </h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              {getConfirmationMessage(showConfirmation)}
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmation(null)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => executeStatusChange(showConfirmation)}
                disabled={loading}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 ${
                  showConfirmation === 'PUBLISHED' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : showConfirmation === 'ARCHIVED'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? 'Changing...' : `Change to ${STATUS_CONFIG[showConfirmation].label}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}