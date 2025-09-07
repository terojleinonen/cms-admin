/**
 * UserManagement component
 * Administrative interface for managing users with bulk operations and role management
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { PaginationInfo, UserProfile } from '@/lib/types'
import { UserRole } from '@prisma/client'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import UserModal from '@/components/users/UserModal'
import UserDetailModal from './UserDetailModal'
import BulkOperationsModal from './BulkOperationsModal'
// Simple notification helper
const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
  // In a real app, you'd use a proper toast library
  if (type === 'success') {
    alert(`✓ ${message}`)
  } else {
    alert(`✗ ${message}`)
  }
}

interface UserWithStats extends UserProfile {
  _count: {
    createdProducts: number
    createdPages: number
    auditLogs: number
    sessions: number
  }
}

interface UserManagementProps {
  initialUsers?: UserWithStats[]
  initialPagination?: PaginationInfo
}

interface Filters {
  search: string
  role: string
  status: string
  sortBy: string
  sortOrder: string
}

const roleColors: Record<UserRole, string> = {
  ADMIN: 'bg-red-100 text-red-800 border-red-200',
  EDITOR: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  VIEWER: 'bg-green-100 text-green-800 border-green-200',
}

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Admin',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
}

export default function UserManagement({ 
  initialUsers = [], 
  initialPagination 
}: UserManagementProps) {
  const [users, setUsers] = useState<UserWithStats[]>(initialUsers)
  const [pagination, setPagination] = useState<PaginationInfo>(
    initialPagination || { page: 1, limit: 10, total: 0, totalPages: 0 }
  )
  const [loading, setLoading] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<Filters>({
    search: '',
    role: '',
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithStats | null>(null)
  const [viewingUser, setViewingUser] = useState<UserWithStats | null>(null)
  const [showBulkModal, setBulkModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      })

      if (filters.search) params.append('search', filters.search)
      if (filters.role) params.append('role', filters.role)
      if (filters.status) params.append('status', filters.status)

      const response = await fetch(`/api/admin/users?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const data = await response.json()
      setUsers(data.users)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching users:', error)
      showNotification('Failed to load users', 'error')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, filters])

  // Initial load
  useEffect(() => {
    if (initialUsers.length === 0) {
      fetchUsers()
    }
  }, [fetchUsers, initialUsers.length])

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
    setSelectedUsers(new Set()) // Clear selections
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
    setSelectedUsers(new Set()) // Clear selections when changing pages
  }

  // Handle user selection
  const handleUserSelect = (userId: string, selected: boolean) => {
    const newSelected = new Set(selectedUsers)
    if (selected) {
      newSelected.add(userId)
    } else {
      newSelected.delete(userId)
    }
    setSelectedUsers(newSelected)
  }

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedUsers(new Set(users.map(user => user.id)))
    } else {
      setSelectedUsers(new Set())
    }
  }

  // Handle user deletion
  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete user')
      }

      showNotification('User deleted successfully')
      fetchUsers()
      setShowDeleteConfirm(null)
    } catch (error) {
      console.error('Error deleting user:', error)
      showNotification('Failed to delete user', 'error')
    }
  }

  // Handle bulk operations
  const handleBulkOperation = async (operation: string, data?: unknown) => {
    try {
      const userIds = Array.from(selectedUsers)
      const response = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation,
          userIds,
          data,
        }),
      })

      if (!response.ok) {
        throw new Error('Bulk operation failed')
      }

      const result = await response.json()
      showNotification(`Successfully updated ${result.updated} users`)
      fetchUsers()
      setSelectedUsers(new Set())
      setBulkModal(false)
    } catch (error) {
      console.error('Error performing bulk operation:', error)
      showNotification('Bulk operation failed', 'error')
    }
  }

  // Format date
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Get user status badge
  const getUserStatusBadge = (user: UserWithStats) => {
    if (!user.isActive) {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 border border-gray-200">
          <XCircleIcon className="w-3 h-3 mr-1" />
          Inactive
        </span>
      )
    }

    const isOnline = user.lastLoginAt && 
      new Date(user.lastLoginAt).getTime() > Date.now() - 15 * 60 * 1000 // 15 minutes

    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
        isOnline 
          ? 'bg-green-100 text-green-800 border border-green-200'
          : 'bg-blue-100 text-blue-800 border border-blue-200'
      }`}>
        <CheckCircleIcon className="w-3 h-3 mr-1" />
        {isOnline ? 'Online' : 'Active'}
      </span>
    )
  }

  const allSelected = users.length > 0 && selectedUsers.size === users.length
  const someSelected = selectedUsers.size > 0 && selectedUsers.size < users.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <UserGroupIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">{pagination.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.isActive).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ShieldCheckIcon className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Admins</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.role === 'ADMIN').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Inactive</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => !u.isActive).length}
              </p>
            </div>
          </div>
        </div>
      </div> 
     {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange({ search: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Role Filter */}
            <select
              value={filters.role}
              onChange={(e) => handleFilterChange({ role: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="EDITOR">Editor</option>
              <option value="VIEWER">Viewer</option>
            </select>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange({ status: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Bulk Operations Bar */}
        {selectedUsers.size > 0 && (
          <div className="px-6 py-3 bg-blue-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">
                {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkModal(true)}
                >
                  Bulk Actions
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUsers(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={(e) => handleUserSelect(user.id, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {user.profilePicture ? (
                            <Image
                              className="h-10 w-10 rounded-full object-cover"
                              src={user.profilePicture}
                              alt={user.name}
                              width={40}
                              height={40}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${roleColors[user.role]}`}>
                        {roleLabels[user.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getUserStatusBadge(user)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="space-y-1">
                        <div>{user._count.createdProducts} products</div>
                        <div>{user._count.createdPages} pages</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.lastLoginAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Menu as="div" className="relative inline-block text-left">
                        <MenuButton className="flex items-center text-gray-400 hover:text-gray-600">
                          <EllipsisVerticalIcon className="h-5 w-5" />
                        </MenuButton>
                        <MenuItems className="absolute right-0 z-10 mt-2 w-48 origin-top-right bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none rounded-md">
                          <MenuItem>
                            {({ focus }) => (
                              <button
                                onClick={() => setViewingUser(user)}
                                className={`${
                                  focus ? 'bg-gray-100' : ''
                                } group flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                              >
                                <EyeIcon className="mr-3 h-4 w-4" />
                                View Details
                              </button>
                            )}
                          </MenuItem>
                          <MenuItem>
                            {({ focus }) => (
                              <button
                                onClick={() => setEditingUser(user)}
                                className={`${
                                  focus ? 'bg-gray-100' : ''
                                } group flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                              >
                                <PencilIcon className="mr-3 h-4 w-4" />
                                Edit User
                              </button>
                            )}
                          </MenuItem>
                          <MenuItem>
                            {({ focus }) => (
                              <button
                                onClick={() => setShowDeleteConfirm(user.id)}
                                className={`${
                                  focus ? 'bg-gray-100' : ''
                                } group flex w-full items-center px-4 py-2 text-sm text-red-700`}
                              >
                                <TrashIcon className="mr-3 h-4 w-4" />
                                Delete User
                              </button>
                            )}
                          </MenuItem>
                        </MenuItems>
                      </Menu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-700">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <UserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            fetchUsers()
          }}
        />
      )}

      {editingUser && (
        <UserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null)
            fetchUsers()
          }}
        />
      )}

      {viewingUser && (
        <UserDetailModal
          user={viewingUser as UserWithStats}
          onClose={() => setViewingUser(null)}
          onEdit={(user) => {
            setViewingUser(null)
            setEditingUser(user as UserWithStats)
          }}
        />
      )}

      {showBulkModal && (
        <BulkOperationsModal
          selectedUserIds={Array.from(selectedUsers)}
          users={users.filter(u => selectedUsers.has(u.id))}
          onClose={() => setBulkModal(false)}
          onConfirm={handleBulkOperation}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setShowDeleteConfirm(null)}
          title="Delete User"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-900">
                  Are you sure you want to delete this user? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => showDeleteConfirm && handleDeleteUser(showDeleteConfirm)}
              >
                Delete User
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}