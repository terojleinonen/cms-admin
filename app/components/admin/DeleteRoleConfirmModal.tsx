/**
 * DeleteRoleConfirmModal component
 * Confirmation modal for deleting custom roles
 */

'use client'

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

interface CustomRole {
  id: string
  role: string
  name: string
  description: string
  permissions: Array<{
    resource: string
    action: string
    scope?: string
  }>
  hierarchy: number
  isBuiltIn: boolean
  isCustom?: boolean
}

interface DeleteRoleConfirmModalProps {
  role: CustomRole
  onClose: () => void
  onConfirm: () => void
}

export default function DeleteRoleConfirmModal({ role, onClose, onConfirm }: DeleteRoleConfirmModalProps) {
  return (
    <Modal isOpen={true} onClose={onClose} title="Delete Role" size="sm">
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
          <div>
            <h3 className="text-lg font-medium text-gray-900">Delete Role</h3>
            <p className="text-sm text-gray-500">
              Are you sure you want to delete the role "{role.name}"? This action cannot be undone.
            </p>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Warning
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  Users with this role will lose their permissions. Make sure to reassign users to other roles before deleting.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm}>
            Delete Role
          </Button>
        </div>
      </div>
    </Modal>
  )
}