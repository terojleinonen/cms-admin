/**
 * RoleConfigurationInterface component
 * Comprehensive interface for managing roles, permissions, and role hierarchy
 * Implements task 44: Build role configuration interface
 */

'use client'

import { useState, useEffect } from 'react'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import { UserRole } from '@prisma/client'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { Permission, RoleConfig, ResourceConfig } from '@/lib/permission-config'
import { permissionConfigManager } from '@/lib/permission-config'
import ResourcePermissionRows from './ResourcePermissionRows'
import CreateRoleModal from './CreateRoleModal'
import EditRoleModal from './EditRoleModal'
import DeleteRoleConfirmModal from './DeleteRoleConfirmModal'

interface RoleConfigurationInterfaceProps {
  className?: string
}

interface CustomRole extends RoleConfig {
  id: string
  isBuiltIn: boolean
}

interface PermissionMatrixCell {
  resource: string
  action: string
  scope?: string
  enabled: boolean
}

export default function RoleConfigurationInterface({ className = '' }: RoleConfigurationInterfaceProps) {
  const [roles, setRoles] = useState<CustomRole[]>([])
  const [resources, setResources] = useState<ResourceConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'matrix' | 'roles' | 'hierarchy'>('matrix')
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false)
  const [showEditRoleModal, setShowEditRoleModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null)
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set())
  const [permissionMatrix, setPermissionMatrix] = useState<Record<string, PermissionMatrixCell[]>>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Load initial data
  useEffect(() => {
    loadRoleConfiguration()
  }, [])

  const loadRoleConfiguration = async () => {
    try {
      setLoading(true)
      
      // Get configuration from permission config manager
      const config = permissionConfigManager.getConfig()
      
      // Transform roles to include built-in flag and ID
      const transformedRoles: CustomRole[] = config.roles.map((role, index) => ({
        ...role,
        id: `${role.role}-${index}`,
        isBuiltIn: !role.isCustom,
      }))
      
      setRoles(transformedRoles)
      setResources(config.resources)
      
      // Initialize permission matrix
      initializePermissionMatrix(transformedRoles, config.resources)
      
    } catch (error) {
      console.error('Error loading role configuration:', error)
    } finally {
      setLoading(false)
    }
  }

  const initializePermissionMatrix = (roleList: CustomRole[], resourceList: ResourceConfig[]) => {
    const matrix: Record<string, PermissionMatrixCell[]> = {}
    
    roleList.forEach(role => {
      matrix[role.role] = []
      
      resourceList.forEach(resource => {
        resource.actions.forEach(action => {
          resource.scopes.forEach(scope => {
            const hasPermission = role.permissions.some(p => 
              p.resource === resource.name && 
              p.action === action.name && 
              p.scope === scope.name
            )
            
            matrix[role.role].push({
              resource: resource.name,
              action: action.name,
              scope: scope.name,
              enabled: hasPermission
            })
          })
        })
      })
    })
    
    setPermissionMatrix(matrix)
  }

  const handlePermissionToggle = (roleType: UserRole, resource: string, action: string, scope?: string) => {
    setPermissionMatrix(prev => {
      const updated = { ...prev }
      const roleMatrix = updated[roleType] || []
      
      const cellIndex = roleMatrix.findIndex(cell => 
        cell.resource === resource && 
        cell.action === action && 
        cell.scope === scope
      )
      
      if (cellIndex !== -1) {
        roleMatrix[cellIndex].enabled = !roleMatrix[cellIndex].enabled
        setHasUnsavedChanges(true)
      }
      
      return updated
    })
  }

  const savePermissionChanges = async () => {
    try {
      // Update roles with new permissions from matrix
      const updatedRoles = roles.map(role => {
        const roleMatrix = permissionMatrix[role.role] || []
        const permissions: Permission[] = roleMatrix
          .filter(cell => cell.enabled)
          .map(cell => ({
            resource: cell.resource,
            action: cell.action,
            scope: cell.scope
          }))
        
        return {
          ...role,
          permissions
        }
      })
      
      // Update configuration
      const config = permissionConfigManager.getConfig()
      config.roles = updatedRoles.map(({ id, isBuiltIn, ...role }) => role)
      permissionConfigManager.updateConfig(config)
      
      setRoles(updatedRoles)
      setHasUnsavedChanges(false)
      
      // In a real implementation, this would save to the backend
      console.log('Permission changes saved successfully')
      
    } catch (error) {
      console.error('Error saving permission changes:', error)
    }
  }

  const handleCreateRole = async (roleData: Partial<RoleConfig>) => {
    try {
      const newRole: CustomRole = {
        id: `custom-${Date.now()}`,
        role: roleData.role as UserRole,
        name: roleData.name || '',
        description: roleData.description || '',
        permissions: roleData.permissions || [],
        hierarchy: roleData.hierarchy || 0,
        isCustom: true,
        isBuiltIn: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      setRoles(prev => [...prev, newRole])
      setShowCreateRoleModal(false)
      
      // Add to permission matrix
      setPermissionMatrix(prev => ({
        ...prev,
        [newRole.role]: resources.flatMap(resource =>
          resource.actions.flatMap(action =>
            resource.scopes.map(scope => ({
              resource: resource.name,
              action: action.name,
              scope: scope.name,
              enabled: false
            }))
          )
        )
      }))
      
    } catch (error) {
      console.error('Error creating role:', error)
    }
  }

  const handleEditRole = async (roleData: Partial<RoleConfig>) => {
    if (!editingRole) return
    
    try {
      const updatedRole: CustomRole = {
        ...editingRole,
        ...roleData,
        updatedAt: new Date(),
      }
      
      setRoles(prev => prev.map(role => 
        role.id === editingRole.id ? updatedRole : role
      ))
      
      setShowEditRoleModal(false)
      setEditingRole(null)
      
    } catch (error) {
      console.error('Error updating role:', error)
    }
  }

  const handleDeleteRole = async () => {
    if (!editingRole || editingRole.isBuiltIn) return
    
    try {
      setRoles(prev => prev.filter(role => role.id !== editingRole.id))
      
      // Remove from permission matrix
      setPermissionMatrix(prev => {
        const updated = { ...prev }
        delete updated[editingRole.role]
        return updated
      })
      
      setShowDeleteConfirm(false)
      setEditingRole(null)
      
    } catch (error) {
      console.error('Error deleting role:', error)
    }
  }

  const toggleResourceExpansion = (resourceName: string) => {
    setExpandedResources(prev => {
      const updated = new Set(prev)
      if (updated.has(resourceName)) {
        updated.delete(resourceName)
      } else {
        updated.add(resourceName)
      }
      return updated
    })
  }

  const getRoleHierarchyLevel = (role: CustomRole): number => {
    return role.hierarchy || 0
  }

  const sortedRoles = [...roles].sort((a, b) => getRoleHierarchyLevel(b) - getRoleHierarchyLevel(a))

  const tabs = [
    { id: 'matrix', label: 'Permission Matrix', icon: ShieldCheckIcon },
    { id: 'roles', label: 'Role Management', icon: UserGroupIcon },
    { id: 'hierarchy', label: 'Role Hierarchy', icon: ArrowUpIcon },
  ]

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow ${className}`}>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Role Configuration</h2>
            <p className="text-sm text-gray-500">Manage roles, permissions, and access control</p>
          </div>
          <div className="flex items-center space-x-3">
            {hasUnsavedChanges && (
              <Button
                onClick={savePermissionChanges}
                variant="primary"
                size="sm"
              >
                Save Changes
              </Button>
            )}
            <Button
              onClick={() => setShowCreateRoleModal(true)}
              variant="primary"
              size="sm"
              icon={PlusIcon}
            >
              Create Role
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="px-6 -mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'matrix' | 'roles' | 'hierarchy')}
              className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'matrix' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Permission Matrix</h3>
              <p className="text-sm text-gray-500">
                Click cells to toggle permissions for each role
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resource / Action
                    </th>
                    {roles.map((role) => (
                      <th key={role.id} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex flex-col items-center">
                          <span>{role.name}</span>
                          <span className="text-xs text-gray-400 normal-case">({role.role})</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {resources.map((resource) => (
                    <ResourcePermissionRows
                      key={resource.name}
                      resource={resource}
                      roles={roles}
                      permissionMatrix={permissionMatrix}
                      isExpanded={expandedResources.has(resource.name)}
                      onToggleExpansion={() => toggleResourceExpansion(resource.name)}
                      onPermissionToggle={handlePermissionToggle}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'roles' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Role Management</h3>
              <p className="text-sm text-gray-500">
                Manage individual roles and their configurations
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roles.map((role) => (
                <div key={role.id} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-lg font-medium text-gray-900">{role.name}</h4>
                        {role.isBuiltIn && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Built-in
                          </span>
                        )}
                        {role.isCustom && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Custom
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                        <span>Hierarchy: {role.hierarchy}</span>
                        <span>{role.permissions.length} permissions</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setEditingRole(role)
                          setShowEditRoleModal(true)
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      {!role.isBuiltIn && (
                        <button
                          onClick={() => {
                            setEditingRole(role)
                            setShowDeleteConfirm(true)
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Key Permissions</h5>
                      <div className="space-y-1">
                        {role.permissions.slice(0, 3).map((permission, index) => (
                          <div key={index} className="text-xs text-gray-600">
                            {permission.resource}:{permission.action}
                            {permission.scope && ` (${permission.scope})`}
                          </div>
                        ))}
                        {role.permissions.length > 3 && (
                          <div className="text-xs text-gray-400">
                            +{role.permissions.length - 3} more permissions
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'hierarchy' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Role Hierarchy</h3>
              <p className="text-sm text-gray-500">
                Roles are ordered by hierarchy level (highest to lowest)
              </p>
            </div>

            <div className="space-y-4">
              {sortedRoles.map((role, index) => (
                <div key={role.id} className="relative">
                  {/* Hierarchy Line */}
                  {index < sortedRoles.length - 1 && (
                    <div className="absolute left-6 top-16 w-px h-8 bg-gray-300"></div>
                  )}
                  
                  <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-lg font-semibold text-blue-600">{role.hierarchy}</span>
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-lg font-medium text-gray-900">{role.name}</h4>
                        <span className="text-sm text-gray-500">({role.role})</span>
                        {role.isBuiltIn && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Built-in
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>{role.permissions.length} permissions</span>
                        <span>Level {role.hierarchy}</span>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => {
                          setEditingRole(role)
                          setShowEditRoleModal(true)
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-white"
                      >
                        <Cog6ToothIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {roles.length === 0 && (
              <div className="text-center py-12">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No roles configured</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new role.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateRoleModal && (
        <CreateRoleModal
          onClose={() => setShowCreateRoleModal(false)}
          onSave={handleCreateRole}
          existingRoles={roles}
          resources={resources}
        />
      )}

      {showEditRoleModal && editingRole && (
        <EditRoleModal
          role={editingRole}
          onClose={() => {
            setShowEditRoleModal(false)
            setEditingRole(null)
          }}
          onSave={handleEditRole}
          resources={resources}
        />
      )}

      {showDeleteConfirm && editingRole && (
        <DeleteRoleConfirmModal
          role={editingRole}
          onClose={() => {
            setShowDeleteConfirm(false)
            setEditingRole(null)
          }}
          onConfirm={handleDeleteRole}
        />
      )}
    </div>
  )
}