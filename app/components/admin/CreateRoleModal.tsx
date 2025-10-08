/**
 * CreateRoleModal component
 * Modal for creating new custom roles with permission selection
 */

'use client'

import { useState } from 'react'
import { UserRole } from '@prisma/client'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { Permission, RoleConfig, ResourceConfig } from '@/lib/permission-config'

interface CustomRole {
  id: string
  role: UserRole
  name: string
  description: string
  permissions: Permission[]
  hierarchy: number
  isBuiltIn: boolean
  isCustom?: boolean
}

interface CreateRoleModalProps {
  onClose: () => void
  onSave: (roleData: Partial<RoleConfig>) => void
  existingRoles: CustomRole[]
  resources: ResourceConfig[]
}

export default function CreateRoleModal({ onClose, onSave, existingRoles, resources }: CreateRoleModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hierarchy: Math.max(...existingRoles.map(r => r.hierarchy)) + 1,
  })
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Role name is required'
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Role description is required'
    }
    
    if (existingRoles.some(role => role.name.toLowerCase() === formData.name.toLowerCase())) {
      newErrors.name = 'Role name already exists'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    // Generate a unique role enum value for custom roles
    const roleValue = `CUSTOM_${formData.name.toUpperCase().replace(/\s+/g, '_')}` as UserRole
    
    onSave({
      role: roleValue,
      name: formData.name,
      description: formData.description,
      hierarchy: formData.hierarchy,
      permissions: selectedPermissions,
      isCustom: true,
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
    <Modal isOpen={true} onClose={onClose} title="Create New Role" size="xl">
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
              placeholder="Enter role name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
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
            placeholder="Describe the role and its purpose"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
        </div>

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

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Create Role
          </Button>
        </div>
      </form>
    </Modal>
  )
}