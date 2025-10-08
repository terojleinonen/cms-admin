/**
 * EditRoleModal component
 * Modal for editing existing roles and their permissions
 */

'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { Permission, RoleConfig, ResourceConfig } from '@/lib/permission-config'

interface CustomRole {
  id: string
  role: string
  name: string
  description: string
  permissions: Permission[]
  hierarchy: number
  isBuiltIn: boolean
  isCustom?: boolean
}

interface EditRoleModalProps {
  role: CustomRole
  onClose: () => void
  onSave: (roleData: Partial<RoleConfig>) => void
  resources: ResourceConfig[]
}

export default function EditRoleModal({ role, onClose, onSave, resources }: EditRoleModalProps) {
  const [formData, setFormData] = useState({
    name: role.name,
    description: role.description,
    hierarchy: role.hierarchy,
  })
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>(role.permissions)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    onSave({
      name: formData.name,
      description: formData.description,
      hierarchy: formData.hierarchy,
      permissions: selectedPermissions,
    })
  }

  const togglePermission = (resource: string, action: string, scope?: string) => {
    const permission: Permission = { resource, action, scope }
    
    setSelectedPermissions(prev => {
      const exists = prev.some(p => 
        p.resource === resource && p.action === action && p.scope === scope
      )
      
      if (exists) {
        return prev.filter(p => 
          !(p.resource === resource && p.action === action && p.scope === scope)
        )
      } else {
        return [...prev, permission]
      }
    })
  }

  const hasPermission = (resource: string, action: string, scope?: string): boolean => {
    return selectedPermissions.some(p => 
      p.resource === resource && p.action === action && p.scope === scope
    )
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={`Edit Role: ${role.name}`} size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              disabled={role.isBuiltIn}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hierarchy Level
            </label>
            <input
              type="number"
              value={formData.hierarchy}
              onChange={(e) => setFormData(prev => ({ ...prev, hierarchy: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              min="0"
              disabled={role.isBuiltIn}
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            disabled={role.isBuiltIn}
          />
        </div>

        {!role.isBuiltIn && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Permissions
            </label>
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
              {resources.map((resource) => (
                <div key={resource.name} className="p-4 border-b border-gray-100 last:border-b-0">
                  <h4 className="font-medium text-gray-900 mb-3 capitalize">{resource.displayName}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {resource.actions.map((action) => (
                      resource.scopes.map((scope) => (
                        <label key={`${action.name}-${scope.name}`} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={hasPermission(resource.name, action.name, scope.name)}
                            onChange={() => togglePermission(resource.name, action.name, scope.name)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {action.displayName} ({scope.displayName})
                          </span>
                        </label>
                      ))
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  )
}