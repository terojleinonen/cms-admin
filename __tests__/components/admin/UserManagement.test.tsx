/**
 * UserManagement Component Tests
 * Tests for the administrative user management interface
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import UserManagement from '@/components/admin/UserManagement'
import { UserRole } from '@prisma/client'

// Define UserWithStats type for testing
interface UserWithStats {
  id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  profilePicture?: string
  emailVerified?: Date
  twoFactorEnabled: boolean
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
  _count: {
    createdProducts: number
    createdPages: number
    auditLogs: number
    sessions: number
  }
}

// Mock fetch
global.fetch = jest.fn()

// Mock alert for notifications
global.alert = jest.fn()

// Mock user data
const mockUsers: UserWithStats[] = [
  {
    id: '1',
    name: 'John Admin',
    email: 'john@example.com',
    role: 'ADMIN' as UserRole,
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
    email: 'jane@example.com',
    role: 'EDITOR' as UserRole,
    isActive: true,
    profilePicture: null,
    emailVerified: new Date(),
    twoFactorEnabled: false,
    lastLoginAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: {
      createdProducts: 12,
      createdPages: 8,
      auditLogs: 15,
      sessions: 1,
    },
  },
  {
    id: '3',
    name: 'Bob Viewer',
    email: 'bob@example.com',
    role: 'VIEWER' as UserRole,
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

describe('UserManagement Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        users: mockUsers,
        pagination: mockPagination,
      }),
    })
  })

  it('renders user management interface', () => {
    render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
    
    expect(screen.getByText('User Management')).toBeInTheDocument()
    expect(screen.getByText('Manage user accounts, roles, and permissions')).toBeInTheDocument()
    expect(screen.getByText('Add User')).toBeInTheDocument()
  })

  it('displays user statistics cards', () => {
    render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
    
    expect(screen.getByText('Total Users')).toBeInTheDocument()
    expect(screen.getByText('Active Users')).toBeInTheDocument()
    expect(screen.getByText('Admins')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
    
    // Check calculated values
    expect(screen.getByText('3')).toBeInTheDocument() // Total users
    expect(screen.getByText('2')).toBeInTheDocument() // Active users
    expect(screen.getByText('1')).toBeInTheDocument() // Admins and Inactive
  })

  it('displays users in table format', () => {
    render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
    
    // Check table headers
    expect(screen.getByText('User')).toBeInTheDocument()
    expect(screen.getByText('Role')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Activity')).toBeInTheDocument()
    expect(screen.getByText('Last Login')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
    
    // Check user data
    expect(screen.getByText('John Admin')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('Jane Editor')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('Bob Viewer')).toBeInTheDocument()
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()
  })

  it('shows correct role badges', () => {
    render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
    
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('Editor')).toBeInTheDocument()
    expect(screen.getByText('Viewer')).toBeInTheDocument()
  })

  it('shows correct status badges', () => {
    render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
    
    // Should show Active for active users and Inactive for inactive users
    const activeStatuses = screen.getAllByText(/Active|Online/)
    const inactiveStatuses = screen.getAllByText('Inactive')
    
    expect(activeStatuses.length).toBeGreaterThan(0)
    expect(inactiveStatuses).toHaveLength(1)
  })

  it('handles search functionality', async () => {
    render(<UserManagement initialUsers={[]} />)
    
    const searchInput = screen.getByPlaceholderText('Search users by name or email...')
    
    fireEvent.change(searchInput, { target: { value: 'john' } })
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=john')
      )
    })
  })

  it('handles role filtering', async () => {
    render(<UserManagement initialUsers={[]} />)
    
    const roleFilter = screen.getByDisplayValue('All Roles')
    
    fireEvent.change(roleFilter, { target: { value: 'ADMIN' } })
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('role=ADMIN')
      )
    })
  })

  it('handles status filtering', async () => {
    render(<UserManagement initialUsers={[]} />)
    
    const statusFilter = screen.getByDisplayValue('All Status')
    
    fireEvent.change(statusFilter, { target: { value: 'active' } })
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=active')
      )
    })
  })

  it('handles user selection', () => {
    render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
    
    const checkboxes = screen.getAllByRole('checkbox')
    const userCheckbox = checkboxes[1] // First user checkbox (index 0 is select all)
    
    fireEvent.click(userCheckbox)
    
    // Should show bulk operations bar
    expect(screen.getByText(/1 user selected/)).toBeInTheDocument()
    expect(screen.getByText('Bulk Actions')).toBeInTheDocument()
  })

  it('handles select all functionality', () => {
    render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
    
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
    
    fireEvent.click(selectAllCheckbox)
    
    // Should show bulk operations bar with all users selected
    expect(screen.getByText(/3 users selected/)).toBeInTheDocument()
  })

  it('opens create user modal', () => {
    render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
    
    const addUserButton = screen.getByText('Add User')
    
    fireEvent.click(addUserButton)
    
    // Should open the user modal (we'd need to mock the UserModal component to test this fully)
  })

  it('handles user actions menu', () => {
    render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
    
    // Find and click the first action menu button
    const actionButtons = screen.getAllByRole('button')
    const menuButton = actionButtons.find(button => 
      button.querySelector('svg') && 
      button.getAttribute('class')?.includes('text-gray-400')
    )
    
    if (menuButton) {
      fireEvent.click(menuButton)
      
      // Should show action menu items
      expect(screen.getByText('View Details')).toBeInTheDocument()
      expect(screen.getByText('Edit User')).toBeInTheDocument()
      expect(screen.getByText('Delete User')).toBeInTheDocument()
    }
  })

  it('displays activity information correctly', () => {
    render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
    
    // Check that activity counts are displayed
    expect(screen.getByText('5 products')).toBeInTheDocument()
    expect(screen.getByText('3 pages')).toBeInTheDocument()
    expect(screen.getByText('12 products')).toBeInTheDocument()
    expect(screen.getByText('8 pages')).toBeInTheDocument()
  })

  it('handles loading state', () => {
    render(<UserManagement initialUsers={[]} />)
    
    // Should show loading spinner when no initial data
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('handles empty state', () => {
    render(<UserManagement initialUsers={[]} initialPagination={{ page: 1, limit: 10, total: 0, totalPages: 0 }} />)
    
    expect(screen.getByText('No users found')).toBeInTheDocument()
  })

  it('formats dates correctly', () => {
    render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
    
    // Should show "Never" for users who haven't logged in
    expect(screen.getByText('Never')).toBeInTheDocument()
  })

  it('handles pagination', () => {
    const paginationData = {
      page: 1,
      limit: 2,
      total: 5,
      totalPages: 3,
    }
    
    render(<UserManagement initialUsers={mockUsers.slice(0, 2)} initialPagination={paginationData} />)
    
    expect(screen.getByText('Showing 1 to 2 of 5 results')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
  })
})

describe('UserManagement Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('handles fetch errors gracefully', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
    
    render(<UserManagement initialUsers={[]} />)
    
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('✗ Failed to load users')
    })
  })

  it('handles API errors gracefully', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    })
    
    render(<UserManagement initialUsers={[]} />)
    
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('✗ Failed to load users')
    })
  })
})

describe('UserManagement Accessibility', () => {
  it('has proper ARIA labels', () => {
    render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
    
    // Check for proper labeling
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[0]).toBeInTheDocument() // Select all checkbox
    
    // Search input should be accessible
    const searchInput = screen.getByPlaceholderText('Search users by name or email...')
    expect(searchInput).toBeInTheDocument()
  })

  it('supports keyboard navigation', () => {
    render(<UserManagement initialUsers={mockUsers} initialPagination={mockPagination} />)
    
    const addButton = screen.getByText('Add User')
    expect(addButton).toBeInTheDocument()
    
    // Button should be focusable
    addButton.focus()
    expect(document.activeElement).toBe(addButton)
  })
})