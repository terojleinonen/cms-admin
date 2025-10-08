/**
 * PermissionOverviewModal component
 * Displays a comprehensive overview of user permissions and role matrix
 */

'use client'

import { useState, useEffect } from 'react'
import {
  ShieldCheckIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { UserRole } from '@prisma/client'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

interface PermissionOverviewModalProps {
  onClose: () => void
}

interface Permission {
  resource: string
  action: string
  scope?: string
  description: string
}

interface RolePermissions {
  role: UserRole
  label: string
  description: string
  permissions: Permission[]
  userCount: number
}

// Define all permissions in the system
const ALL_PERMISSIONS: Permission[] = [
  // User Management
  { resource: 'users', action: 'create', scope: 'all', description: 'Create new user accounts' },
  { resource: 'users', action: 'read', scope: 'all', description: 'View all user information' },
  { resource: 'users', action: 'update', scope: 'all', description: 'Edit any user account' },
  { resource: 'users', action: 'delete', scope: 'all', description: 'Delete user accounts' },
  { resource: 'users', action: 'manage', scope: 'all', description: 'Full user management access' },
  
  // Profile Management
  { resource: 'profile', action: 'read', scope: 'own', description: 'View own profile' },
  { resource: 'profile', action: 'update', scope: 'own', description: 'Edit own profile' },
  { resource: 'profile', action: 'manage', scope: 'own', description: 'Manage own profile settings' },
  
  // Product Management
  { resource: 'products', action: 'create', scope: 'all', description: 'Create new products' },
  { resource: 'products', action: 'read', scope: 'all', description: 'View all products' },
  { resource: 'products', action: 'update', scope: 'all', description: 'Edit any product' },
  { resource: 'products', action: 'delete', scope: 'all', description: 'Delete products' },
  { resource: 'products', action: 'manage', scope: 'all', description: 'Full product management' },
  
  // Category Management
  { resource: 'categories', action: 'create', scope: 'all', description: 'Create new categories' },
  { resource: 'categories', action: 'read', scope: 'all', description: 'View all categories' },
  { resource: 'categories', action: 'update', scope: 'all', description: 'Edit categories' },
  { resource: 'categories', action: 'delete', scope: 'all', description: 'Delete categories' },
  { resource: 'categories', action: 'manage', scope: 'all', description: 'Full category management' },
  
  // Page Management
  { resource: 'pages', action: 'create', scope: 'all', description: 'Create new pages' },
  { resource: 'pages', action: 'read', scope: 'all', description: 'View all pages' },
  { resource: 'pages', action: 'update', scope: 'all', description: 'Edit any page' },
  { resource: 'pages', action: 'delete', scope: 'all', description: 'Delete pages' },
  { resource: 'pages', action: 'manage', scope: 'all', description: 'Full page management' },
  
  // Media Management
  { resource: 'media', action: 'create', scope: 'all', description: 'Upload new media files' },
  { resource: 'media', action: 'read', scope: 'all', description: 'View all media files' },
  { resource: 'media', action: 'update', scope: 'all', description: 'Edit media metadata' },
  { resource: 'media', action: 'delete', scope: 'all', description: 'Delete media files' },
  { resource: 'media', action: 'manage', scope: 'all', description: 'Full media management' },
  
  // Order Management
  { resource: 'orders', action: 'read', scope: 'all', description: 'View all orders' },
  { resource: 'orders', action: 'update', scope: 'all', description: 'Update order status' },
  
  // Analytics & Reporting
  { resource: 'analytics', action: 'read', scope: 'all', description: 'View analytics and reports' },
  
  // System Administration
  { resource: 'settings', action: 'read', scope: 'all', description: 'View system settings' },
  { resource: 'settings', action: 'manage', scope: 'all', description: 'Manage system settings' },
  { resource: 'security', action: 'read', scope: 'all', description: 'View security settings' },
  { resource: 'security', action: 'manage', scope: 'all', description: 'Manage security settings' },
  { resource: 'audit', action: 'read', scope: 'all', description: 'View audit logs' },
  { resource: 'monitoring', action: 'read', scope: 'all', description: 'View system monitoring' },
]

// Define role permissions based on the permission service
const ROLE_PERMISSIONS_MAP: Record<UserRole, Permission[]> = {
  ADMIN: ALL_PERMISSIONS, // Admins have all permissions
  EDITOR: ALL_PERMISSIONS.filter(p => 
    // Editors have content management permissions but not user/system management
    (p.resource === 'products' && p.scope === 'all') ||
    (p.resource === 'categories' && p.scope === 'all') ||
    (p.resource === 'pages' && p.scope === 'all') ||
    (p.resource === 'media' && p.scope === 'all') ||
    (p.resource === 'orders' && p.action === 'read') ||
    (p.resource === 'profile' && p.scope === 'own')
  ),
  VIEWER: ALL_PERMISSIONS.filter(p => 
    // Viewers have read-only access
    (p.action === 'read' && p.resource !== 'users' && p.resource !== 'settings' && p.resource !== 'security' && p.resource !== 'audit' && p.resource !== 'monitoring') ||
    (p.resource === 'profile' && p.scope === 'own')
  ),
}

export default function PermissionOverviewModal({ onClose }: PermissionOverviewModalProps) {
  const [rolePermissions, setRolePermissions] = useState<RolePermissions[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedResource, setSelectedResource] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'matrix' | 'roles' | 'resources'>('matrix')

  // Fetch user counts for each role
  useEffect(() => {
    const fetchRoleData = async () => {
      try {
        setLoading(true)
        
        // In a real implementation, this would fetch from API
        // For now, we'll simulate the data
        const mockRoleCounts = {
          ADMIN: 2,
          EDITOR: 8,
          VIEWER: 15,
        }

        const roleData: RolePermissions[] = [
          {
            role: UserRole.ADMIN,
            label: 'Administrator',
            description: 'Full access to all features including user management and system settings',
            permissions: ROLE_PERMISSIONS_MAP.ADMIN,
            userCount: mockRoleCounts.ADMIN,
          },
          {
            role: UserRole.EDITOR,
            label: 'Editor',
            description: 'Can create, edit, and manage content but cannot manage users or system settings',
            permissions: ROLE_PERMISSIONS_MAP.EDITOR,
            userCount: mockRoleCounts.EDITOR,
          },
          {
            role: UserRole.VIEWER,
            label: 'Viewer',
            description: 'Read-only access to dashboard and analytics',
            permissions: ROLE_PERMISSIONS_MAP.VIEWER,
            userCount: mockRoleCounts.VIEWER,
          },
        ]

        setRolePermissions(roleData)
      } catch (error) {
        console.error('Error fetching role data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRoleData()
  }, [])

  // Get unique resources for filtering
  const resources = Array.from(new Set(ALL_PERMISSIONS.map(p => p.resource)))

  // Filter permissions based on search and resource
  const filteredPermissions = ALL_PERMISSIONS.filter(permission => {
    const matchesSearch = searchTerm === '' || 
      permission.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesResource = selectedResource === 'all' || permission.resource === selectedResource
    
    return matchesSearch && matchesResource
  })

  // Check if a role has a specific permission
  const hasPermission = (role: UserRole, permission: Permission): boolean => {
    const rolePerms = ROLE_PERMISSIONS_MAP[role]
    return rolePerms.some(p => 
      p.resource === permission.resource && 
      p.action === permission.action && 
      p.scope === permission.scope
    )
  }

  // Get permission color based on how many roles have it
  const getPermissionColor = (permission: Permission): string => {
    const roleCount = Object.values(UserRole).filter(role => hasPermission(role, permission)).length
    if (roleCount === 3) return 'bg-green-50 border-green-200'
    if (roleCount === 2) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  const tabs = [
    { id: 'matrix', label: 'Permission Matrix', icon: ShieldCheckIcon },
    { id: 'roles', label: 'Role Details', icon: UserGroupIcon },
    { id: 'resources', label: 'Resource Overview', icon: InformationCircleIcon },
  ]

  if (loading) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Permission Overview" size="xl">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Permission Overview" size="xl">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rolePermissions.map((roleData) => (
            <div key={roleData.role} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{roleData.label}</h3>
                  <p className="text-2xl font-semibold text-gray-900">{roleData.userCount} users</p>
                </div>
                <div className="text-sm text-gray-500">
                  {roleData.permissions.length} permissions
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'matrix' | 'roles' | 'resources')}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
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

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search permissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <select
            value={selectedResource}
            onChange={(e) => setSelectedResource(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Resources</option>
            {resources.map((resource) => (
              <option key={resource} value={resource}>
                {resource.charAt(0).toUpperCase() + resource.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Tab Content */}
        <div className="min-h-[500px]">
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Permission Matrix</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Permission
                      </th>
                      {rolePermissions.map((roleData) => (
                        <th key={roleData.role} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {roleData.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPermissions.map((permission, index) => (
                      <tr key={index} className={`${getPermissionColor(permission)}`}>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {permission.resource}:{permission.action}
                              {permission.scope && (
                                <span className="ml-1 text-xs text-gray-500">({permission.scope})</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">{permission.description}</div>
                          </div>
                        </td>
                        {rolePermissions.map((roleData) => (
                          <td key={roleData.role} className="px-6 py-4 text-center">
                            {hasPermission(roleData.role, permission) ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-500 mx-auto" />
                            ) : (
                              <XCircleIcon className="h-5 w-5 text-gray-300 mx-auto" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Role Details</h3>
              {rolePermissions.map((roleData) => (
                <div key={roleData.role} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">{roleData.label}</h4>
                      <p className="text-sm text-gray-500 mt-1">{roleData.description}</p>
                      <p className="text-sm text-gray-400 mt-1">{roleData.userCount} users with this role</p>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {roleData.permissions.length} permissions
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {roleData.permissions.map((permission, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-md">
                        <div className="text-sm font-medium text-gray-900">
                          {permission.resource}:{permission.action}
                          {permission.scope && (
                            <span className="ml-1 text-xs text-gray-500">({permission.scope})</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{permission.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Resource Overview</h3>
              {resources.map((resource) => {
                const resourcePermissions = ALL_PERMISSIONS.filter(p => p.resource === resource)
                return (
                  <div key={resource} className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium text-gray-900 capitalize">{resource}</h4>
                      <span className="text-sm text-gray-500">
                        {resourcePermissions.length} permissions
                      </span>
                    </div>
                    <div className="space-y-2">
                      {resourcePermissions.map((permission, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {permission.action}
                              {permission.scope && (
                                <span className="ml-1 text-xs text-gray-500">({permission.scope})</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">{permission.description}</div>
                          </div>
                          <div className="flex space-x-2">
                            {rolePermissions.map((roleData) => (
                              <div key={roleData.role} className="flex items-center space-x-1">
                                <span className="text-xs text-gray-500">{roleData.label}</span>
                                {hasPermission(roleData.role, permission) ? (
                                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircleIcon className="h-4 w-4 text-gray-300" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}