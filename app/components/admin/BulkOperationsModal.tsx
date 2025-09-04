/**
 * BulkOperationsModal component
 * Modal for performing bulk operations on selected users
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  UserGroupIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { UserRole } from '@prisma/client'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

interface SimpleUser {
  id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  profilePicture?: string
  emailVerified?: Date
}

interface BulkOperationsModalProps {
  selectedUserIds: string[]
  users: SimpleUser[]
  onClose: () => void
  onConfirm: (operation: string, data?: unknown) => void
}

type BulkOperation = 
  | 'activate'
  | 'deactivate' 
  | 'change_role'
  | 'reset_password'
  | 'send_invitation'

interface OperationConfig {
  id: BulkOperation
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  requiresConfirmation: boolean
  requiresData?: boolean
  dangerLevel: 'low' | 'medium' | 'high'
}

const operations: OperationConfig[] = [
  {
    id: 'activate',
    label: 'Activate Users',
    description: 'Enable selected users to access the system',
    icon: CheckCircleIcon,
    color: 'text-green-600 bg-green-100',
    requiresConfirmation: false,
    dangerLevel: 'low',
  },
  {
    id: 'deactivate',
    label: 'Deactivate Users',
    description: 'Disable selected users from accessing the system',
    icon: XCircleIcon,
    color: 'text-red-600 bg-red-100',
    requiresConfirmation: true,
    dangerLevel: 'high',
  },
  {
    id: 'change_role',
    label: 'Change Role',
    description: 'Update the role for all selected users',
    icon: ShieldCheckIcon,
    color: 'text-blue-600 bg-blue-100',
    requiresConfirmation: true,
    requiresData: true,
    dangerLevel: 'medium',
  },
  {
    id: 'reset_password',
    label: 'Reset Passwords',
    description: 'Send password reset emails to selected users',
    icon: ArrowPathIcon,
    color: 'text-yellow-600 bg-yellow-100',
    requiresConfirmation: true,
    dangerLevel: 'medium',
  },
  {
    id: 'send_invitation',
    label: 'Send Invitations',
    description: 'Send invitation emails to inactive users',
    icon: UserGroupIcon,
    color: 'text-purple-600 bg-purple-100',
    requiresConfirmation: false,
    dangerLevel: 'low',
  },
]

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
}

export default function BulkOperationsModal({
  selectedUserIds,
  users,
  onClose,
  onConfirm,
}: BulkOperationsModalProps) {
  interface OperationData {
    role?: UserRole;
  }
  const [selectedOperation, setSelectedOperation] = useState<BulkOperation | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [operationData, setOperationData] = useState<OperationData>({})
  const [loading, setLoading] = useState(false)

  const selectedCount = selectedUserIds.length
  const selectedOperation_config = operations.find(op => op.id === selectedOperation)

  // Handle operation selection
  const handleOperationSelect = (operation: BulkOperation) => {
    setSelectedOperation(operation)
    const config = operations.find(op => op.id === operation)
    
    if (config?.requiresConfirmation || config?.requiresData) {
      setShowConfirmation(true)
    } else {
      handleConfirm()
    }
  }

  // Handle confirmation
  const handleConfirm = async () => {
    if (!selectedOperation) return

    try {
      setLoading(true)
      await onConfirm(selectedOperation, operationData)
      onClose()
    } catch (error) {
      console.error('Bulk operation failed:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get operation preview
  const getOperationPreview = () => {
    if (!selectedOperation) return null

    const config = operations.find(op => op.id === selectedOperation)
    if (!config) return null

    switch (selectedOperation) {
      case 'activate':
        const inactiveUsers = users.filter(u => !u.isActive)
        return `${inactiveUsers.length} inactive users will be activated`
      
      case 'deactivate':
        const activeUsers = users.filter(u => u.isActive)
        return `${activeUsers.length} active users will be deactivated`
      
      case 'change_role':
        const targetRole = operationData.role
        if (!targetRole) return 'Select a role to continue'
        return `${selectedCount} users will be changed to ${roleLabels[targetRole as UserRole]}`
      
      case 'reset_password':
        return `Password reset emails will be sent to ${selectedCount} users`
      
      case 'send_invitation':
        const uninvitedUsers = users.filter(u => !u.emailVerified)
        return `Invitation emails will be sent to ${uninvitedUsers.length} users`
      
      default:
        return `Operation will affect ${selectedCount} users`
    }
  }

  // Get affected users for current operation
  const getAffectedUsers = () => {
    switch (selectedOperation) {
      case 'activate':
        return users.filter(u => !u.isActive)
      case 'deactivate':
        return users.filter(u => u.isActive)
      case 'send_invitation':
        return users.filter(u => !u.emailVerified)
      default:
        return users
    }
  }

  if (showConfirmation && selectedOperation_config) {
    const affectedUsers = getAffectedUsers()
    
    return (
      <Modal
        isOpen={true}
        onClose={() => setShowConfirmation(false)}
        title={`Confirm ${selectedOperation_config.label}`}
        size="md"
      >
        <div className="space-y-6">
          {/* Operation Summary */}
          <div className="flex items-start space-x-3">
            <div className={`flex-shrink-0 p-2 rounded-lg ${selectedOperation_config.color}`}>
              <selectedOperation_config.icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedOperation_config.label}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedOperation_config.description}
              </p>
            </div>
          </div>

          {/* Role Selection for Change Role Operation */}
          {selectedOperation === 'change_role' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select New Role
              </label>
              <select
                value={operationData.role || ''}
                onChange={(e) => setOperationData({ ...operationData, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a role...</option>
                <option value="ADMIN">Administrator</option>
                <option value="EDITOR">Editor</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>
          )}

          {/* Operation Preview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Operation Preview</h4>
            <p className="text-sm text-gray-600">{getOperationPreview()}</p>
          </div>

          {/* Affected Users List */}
          {affectedUsers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Affected Users ({affectedUsers.length})
              </h4>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                {affectedUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-3 p-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex-shrink-0">
                      {user.profilePicture ? (
                        <Image
                          className="h-8 w-8 rounded-full object-cover"
                          src={user.profilePicture}
                          alt={user.name}
                          width={32}
                          height={32}
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-700">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="text-xs text-gray-400">
                        {roleLabels[user.role]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning for High-Risk Operations */}
          {selectedOperation_config.dangerLevel === 'high' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-red-800">Warning</h4>
                  <p className="text-sm text-red-700 mt-1">
                    This operation cannot be undone. Please review the affected users carefully.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant={selectedOperation_config.dangerLevel === 'high' ? 'danger' : 'primary'}
              onClick={handleConfirm}
              loading={loading}
              disabled={selectedOperation === 'change_role' && !operationData.role}
            >
              {loading ? 'Processing...' : `Confirm ${selectedOperation_config.label}`}
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Bulk Operations"
      size="md"
    >
      <div className="space-y-6">
        {/* Selection Summary */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center space-x-3">
            <UserGroupIcon className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">
                {selectedCount} user{selectedCount !== 1 ? 's' : ''} selected
              </h3>
              <p className="text-sm text-blue-700">
                Choose an operation to perform on the selected users
              </p>
            </div>
          </div>
        </div>

        {/* Operations List */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Available Operations</h4>
          {operations.map((operation) => (
            <button
              key={operation.id}
              onClick={() => handleOperationSelect(operation.id)}
              className="w-full flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
            >
              <div className={`flex-shrink-0 p-2 rounded-lg ${operation.color}`}>
                <operation.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-sm font-medium text-gray-900">
                  {operation.label}
                </h5>
                <p className="text-sm text-gray-500">
                  {operation.description}
                </p>
              </div>
              {operation.dangerLevel === 'high' && (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
              )}
            </button>
          ))}
        </div>

        {/* Selected Users Preview */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Selected Users</h4>
          <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md">
            {users.slice(0, 5).map((user) => (
              <div key={user.id} className="flex items-center space-x-3 p-3 border-b border-gray-100 last:border-b-0">
                <div className="flex-shrink-0">
                  {user.profilePicture ? (
                    <Image
                      className="h-6 w-6 rounded-full object-cover"
                      src={user.profilePicture}
                      alt={user.name}
                      width={24}
                      height={24}
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-700">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.name}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span className="text-xs text-gray-400">
                    {roleLabels[user.role]}
                  </span>
                </div>
              </div>
            ))}
            {users.length > 5 && (
              <div className="p-3 text-center text-sm text-gray-500">
                And {users.length - 5} more users...
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}