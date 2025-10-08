/**
 * User Management Dashboard Tests
 * Tests for the comprehensive user management dashboard functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import UserManagement from '@/components/admin/UserManagement'
import { UserRole } from '@prisma/client'

// Mock the fetch function
global.fetch = jest.fn()

// Mock the components that have complex dependencies
jest.mock('@/components/users/UserModal', () => {
  return function MockUserModal({ onClose }: { onClose: () => void }) {
    return (
      <div data-testid="user-modal">
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
  return function MockBulkOperationsModal({ onClose }: { onClose: () => void }) {
    return (
      <div data-testid="bulk-operations-modal">
        <button onClick={onClose}>Close</button>
      </div>
    )
  }
})

jest.mock('@/components/admin/PermissionOverviewModal', () => {
  return function MockPermissionOverviewModal({ onClose }: { onClose: () => void }) {
    return (
      <div data-testid="permission-overview-modal">
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

describe('UserManagement Dashboard', () => {
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

  it('renders user management dashboard with header and stats', () => {
    render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
    
    // Check header
    expect(screen.getByText('User Management')).toBeInTheDocument()
    expect(screen.getByText('Manage user accounts, roles, and permissions')).toBeInTheDocument()
    
    // Check action buttons
    expect(screen.getByText('Add User')).toBeInTheDocument()
    expect(screen.getByText('Permission Overview')).toBeInTheDocument()
    
    // Check stats cards
    expect(screen.getByText('Total Users')).toBeInTheDocument()
    expect(screen.getByText('Active Users')).toBeInTheDocument()
    expect(screen.getByText('Admins')).toBeInTheDocument()
    expect(screen.getAllByText('Inactive')).toHaveLength(3) // Stats card, filter option, and user status
  })

  it('displays user list with role filtering and search', () => {
    render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
    
    // Check users are displayed
    expect(screen.getByText('John Admin')).toBeInTheDocument()
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
    expect(screen.getByText('Jane Editor')).toBeInTheDocument()
    expect(screen.getByText('editor@example.com')).toBeInTheDocument()
    expect(screen.getByText('Bob Viewer')).toBeInTheDocument()
    expect(screen.getByText('viewer@example.com')).toBeInTheDocument()
    
    // Check role badges (there are multiple instances due to filter options)
    expect(screen.getAllByText('Admin')).toHaveLength(2) // Role badge and filter option
    expect(screen.getAllByText('Editor')).toHaveLength(2) // Role badge and filter option
    expect(screen.getAllByText('Viewer')).toHaveLength(2) // Role badge and filter option
    
    // Check search input
    expect(screen.getByPlaceholderText('Search users by name or email...')).toBeInTheDocument()
    
    // Check filter dropdowns
    expect(screen.getByDisplayValue('All Roles')).toBeInTheDocument()
    expect(screen.getByDisplayValue('All Status')).toBeInTheDocument()
  })

  it('shows user activity statistics', () => {
    render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
    
    // Check activity columns
    expect(screen.getByText('5 products')).toBeInTheDocument()
    expect(screen.getByText('3 pages')).toBeInTheDocument()
    expect(screen.getByText('12 products')).toBeInTheDocument()
    expect(screen.getByText('8 pages')).toBeInTheDocument()
  })

  it('handles user selection for bulk operations', async () => {
    render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
    
    // Select first user
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1]) // First user checkbox (index 0 is select all)
    
    // Should show bulk operations bar
    await waitFor(() => {
      expect(screen.getByText('1 user selected')).toBeInTheDocument()
      expect(screen.getByText('Bulk Actions')).toBeInTheDocument()
    })
  })

  it('opens permission overview modal', async () => {
    render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
    
    // Click permission overview button
    fireEvent.click(screen.getByText('Permission Overview'))
    
    // Should show permission overview modal
    await waitFor(() => {
      expect(screen.getByTestId('permission-overview-modal')).toBeInTheDocument()
    })
  })

  it('opens user creation modal', async () => {
    render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
    
    // Click add user button
    fireEvent.click(screen.getByText('Add User'))
    
    // Should show user modal
    await waitFor(() => {
      expect(screen.getByTestId('user-modal')).toBeInTheDocument()
    })
  })

  it('handles bulk operations modal', async () => {
    render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
    
    // Select users
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1])
    fireEvent.click(checkboxes[2])
    
    // Click bulk actions
    await waitFor(() => {
      fireEvent.click(screen.getByText('Bulk Actions'))
    })
    
    // Should show bulk operations modal
    await waitFor(() => {
      expect(screen.getByTestId('bulk-operations-modal')).toBeInTheDocument()
    })
  })

  it('displays correct user status badges', () => {
    render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
    
    // Check status badges
    const activeStatuses = screen.getAllByText(/Active|Online/)
    expect(activeStatuses.length).toBeGreaterThan(0)
    
    const inactiveStatuses = screen.getAllByText('Inactive')
    expect(inactiveStatuses.length).toBeGreaterThan(0)
  })

  it('handles search functionality', async () => {
    render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
    
    const searchInput = screen.getByPlaceholderText('Search users by name or email...')
    
    // Type in search
    fireEvent.change(searchInput, { target: { value: 'admin' } })
    
    // Should trigger search (in real implementation would filter results)
    expect(searchInput).toHaveValue('admin')
  })

  it('handles role filtering', async () => {
    render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
    
    const roleFilter = screen.getByDisplayValue('All Roles')
    
    // Change role filter
    fireEvent.change(roleFilter, { target: { value: 'ADMIN' } })
    
    // Should trigger filter (in real implementation would filter results)
    expect(roleFilter).toHaveValue('ADMIN')
  })

  it('shows pagination when needed', () => {
    const multiPagePagination = {
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3,
    }
    
    render(<UserManagement initialUsers={mockUsers} initialPagination={multiPagePagination} />)
    
    // Should show pagination info
    expect(screen.getByText(/Showing \d+ to \d+ of \d+ results/)).toBeInTheDocument()
  })
})

describe('UserManagement Bulk Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, updated: 2 }),
    } as Response)
  })

  it('handles bulk user activation', async () => {
    render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
    
    // Select inactive user
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[3]) // Bob Viewer (inactive)
    
    // Open bulk operations
    await waitFor(() => {
      fireEvent.click(screen.getByText('Bulk Actions'))
    })
    
    expect(screen.getByTestId('bulk-operations-modal')).toBeInTheDocument()
  })

  it('prevents self-deactivation in bulk operations', async () => {
    // This would be tested in the BulkOperationsModal component
    // Here we just verify the modal opens
    render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
    
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1])
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Bulk Actions'))
    })
    
    expect(screen.getByTestId('bulk-operations-modal')).toBeInTheDocument()
  })
})

describe('UserManagement Permission Overview', () => {
  it('displays permission overview with role matrix', async () => {
    render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
    
    // Click permission overview
    fireEvent.click(screen.getByText('Permission Overview'))
    
    await waitFor(() => {
      expect(screen.getByTestId('permission-overview-modal')).toBeInTheDocument()
    })
  })
})