/**
 * User Management Integration Tests
 * Tests the integration between components and API functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import UserManagement from '@/components/admin/UserManagement'
import { UserRole } from '@prisma/client'

// Mock fetch globally
global.fetch = jest.fn()

// Mock alert function
global.alert = jest.fn()

// Mock the child components
jest.mock('@/components/users/UserModal', () => {
  return function MockUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    return (
      <div data-testid="user-modal">
        <button onClick={onSuccess}>Save User</button>
        <button onClick={onClose}>Close</button>
      </div>
    )
  }
})

jest.mock('@/components/admin/UserDetailModal', () => {
  return function MockUserDetailModal({ onClose }: { onClose: () => void }) {
    return (
      <div data-testid="user-detail-modal">
        <button onClick={onClose}>Close</button>
      </div>
    )
  }
})

jest.mock('@/components/admin/BulkOperationsModal', () => {
  return function MockBulkOperationsModal({ 
    onClose, 
    onConfirm 
  }: { 
    onClose: () => void; 
    onConfirm: (operation: string, data?: any) => void 
  }) {
    return (
      <div data-testid="bulk-operations-modal">
        <button onClick={() => onConfirm('activate')}>Activate Users</button>
        <button onClick={() => onConfirm('change_role', { role: 'ADMIN' })}>Change Role</button>
        <button onClick={onClose}>Close</button>
      </div>
    )
  }
})

jest.mock('@/components/admin/PermissionOverviewModal', () => {
  return function MockPermissionOverviewModal({ onClose }: { onClose: () => void }) {
    return (
      <div data-testid="permission-overview-modal">
        <div>Permission Matrix</div>
        <div>Role: Admin - Full system access</div>
        <div>Role: Editor - Content management</div>
        <div>Role: Viewer - Read-only access</div>
        <button onClick={onClose}>Close</button>
      </div>
    )
  }
})

const mockUsers = [
  {
    id: '1',
    name: 'John Admin',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    isActive: true,
    profilePicture: null,
    emailVerified: new Date(),
    twoFactorEnabled: true,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: {
      createdProducts: 5,
      createdPages: 3,
      auditLogs: 25,
      sessions: 2,
    },
  },
  {
    id: '2',
    name: 'Jane Editor',
    email: 'editor@example.com',
    role: UserRole.EDITOR,
    isActive: true,
    profilePicture: null,
    emailVerified: new Date(),
    twoFactorEnabled: false,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: {
      createdProducts: 12,
      createdPages: 8,
      auditLogs: 45,
      sessions: 1,
    },
  },
  {
    id: '3',
    name: 'Bob Viewer',
    email: 'viewer@example.com',
    role: UserRole.VIEWER,
    isActive: false,
    profilePicture: null,
    emailVerified: null,
    twoFactorEnabled: false,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: {
      createdProducts: 0,
      createdPages: 0,
      auditLogs: 5,
      sessions: 0,
    },
  },
]

const mockPagination = {
  page: 1,
  limit: 10,
  total: 3,
  totalPages: 1,
}

describe('UserManagement Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({
        users: mockUsers,
        pagination: mockPagination,
      }),
    } as Response)
  })

  describe('User List Management', () => {
    it('should load and display users from API', async () => {
      render(<UserManagement />)
      
      // Should make API call to fetch users
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/admin/users'))
      })
    })

    it('should handle search functionality with API calls', async () => {
      render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
      
      const searchInput = screen.getByPlaceholderText('Search users by name or email...')
      
      // Type in search
      fireEvent.change(searchInput, { target: { value: 'admin' } })
      
      // Should trigger API call with search parameter
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('search=admin')
        )
      })
    })

    it('should handle role filtering with API calls', async () => {
      render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
      
      const roleFilter = screen.getByDisplayValue('All Roles')
      
      // Change role filter
      fireEvent.change(roleFilter, { target: { value: 'ADMIN' } })
      
      // Should trigger API call with role parameter
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('role=ADMIN')
        )
      })
    })
  })

  describe('Bulk Operations Integration', () => {
    it('should perform bulk user activation', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: mockUsers, pagination: mockPagination }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, updated: 1, operation: 'activate' }),
        } as Response)

      render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
      
      // Select inactive user (Bob Viewer)
      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[3]) // Bob Viewer checkbox
      
      // Open bulk operations
      await waitFor(() => {
        fireEvent.click(screen.getByText('Bulk Actions'))
      })
      
      // Perform activation
      fireEvent.click(screen.getByText('Activate Users'))
      
      // Should call bulk API
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/admin/users/bulk',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('activate'),
          })
        )
      })
    })

    it('should perform bulk role changes', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: mockUsers, pagination: mockPagination }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, updated: 2, operation: 'change_role' }),
        } as Response)

      render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
      
      // Select multiple users
      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[2]) // Jane Editor
      fireEvent.click(checkboxes[3]) // Bob Viewer
      
      // Open bulk operations
      await waitFor(() => {
        fireEvent.click(screen.getByText('Bulk Actions'))
      })
      
      // Perform role change
      fireEvent.click(screen.getByText('Change Role'))
      
      // Should call bulk API with role data
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/admin/users/bulk',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('change_role'),
          })
        )
      })
    })
  })

  describe('User Creation Integration', () => {
    it('should create new user and refresh list', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: mockUsers, pagination: mockPagination }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: [...mockUsers, { id: '4', name: 'New User' }], pagination: mockPagination }),
        } as Response)

      render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
      
      // Open user creation modal
      fireEvent.click(screen.getByText('Add User'))
      
      // Save user (mocked)
      fireEvent.click(screen.getByText('Save User'))
      
      // Should refresh user list
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(2) // Initial load + refresh after create
      })
    })
  })

  describe('Permission Overview Integration', () => {
    it('should display comprehensive permission matrix', async () => {
      render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
      
      // Open permission overview
      fireEvent.click(screen.getByText('Permission Overview'))
      
      // Should show permission overview modal
      await waitFor(() => {
        expect(screen.getByTestId('permission-overview-modal')).toBeInTheDocument()
      })
      
      // Should display role information
      expect(screen.getByText('Permission Matrix')).toBeInTheDocument()
      expect(screen.getByText('Role: Admin - Full system access')).toBeInTheDocument()
      expect(screen.getByText('Role: Editor - Content management')).toBeInTheDocument()
      expect(screen.getByText('Role: Viewer - Read-only access')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(new Error('API Error'))
      
      // Mock console.error to avoid test output noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      render(<UserManagement />)
      
      // Should handle error without crashing
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled()
      })
      
      consoleSpy.mockRestore()
    })

    it('should handle bulk operation failures', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: mockUsers, pagination: mockPagination }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: { message: 'Bulk operation failed' } }),
        } as Response)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
      
      // Select user and try bulk operation
      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[1])
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Bulk Actions'))
      })
      
      fireEvent.click(screen.getByText('Activate Users'))
      
      // Should handle error
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled()
      })
      
      consoleSpy.mockRestore()
    })
  })

  describe('User Statistics and Activity', () => {
    it('should display user activity statistics correctly', () => {
      render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
      
      // Check that user statistics are displayed
      expect(screen.getByText('5 products')).toBeInTheDocument() // John Admin
      expect(screen.getByText('3 pages')).toBeInTheDocument() // John Admin
      expect(screen.getByText('12 products')).toBeInTheDocument() // Jane Editor
      expect(screen.getByText('8 pages')).toBeInTheDocument() // Jane Editor
      expect(screen.getByText('0 products')).toBeInTheDocument() // Bob Viewer
      expect(screen.getByText('0 pages')).toBeInTheDocument() // Bob Viewer
    })

    it('should show correct user status indicators', () => {
      render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
      
      // Should show active/inactive status
      const activeStatuses = screen.getAllByText(/Active|Online/)
      expect(activeStatuses.length).toBeGreaterThan(0)
      
      const inactiveStatuses = screen.getAllByText('Inactive')
      expect(inactiveStatuses.length).toBeGreaterThan(0)
    })
  })
})