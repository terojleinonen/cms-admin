/**
 * EmptyState Component
 * Display component for empty data states
 */

'use client'

import { ReactNode } from 'react'
import { DocumentIcon } from '@heroicons/react/24/outline'
import Button from './Button'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = ''
}: EmptyStateProps) {
  const defaultIcon = <DocumentIcon className="h-12 w-12 text-gray-400" />

  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="mx-auto mb-4">
        {icon || defaultIcon}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}