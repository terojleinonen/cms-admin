/**
 * Comprehensive UserManagement Component Tests
 * Complete test suite for admin user management functionality
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { SessionProvider } from 'next-auth/react'
import UserManagement from '@/components/admin/UserManagement'
import { UserRole } from '@prisma/client'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  ...jest.requireActual('next-auth/react'),
  useSession: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

const mockAdminSession = {
  user: {
    id: 'admin-123',
    name: 'Admin User',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  },
  expires: '2024-01-01',
}

const mockUsers = [
  {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    role: UserRole.EDITOR,
    isActive: true,
    profilePicture: null,
    lastLoginAt: new Date('2024-01-01'),
    createdAt: new Date('2023-01-01'),
    _count: {
      createdProducts: 15,
      createdPages: 8,
    },
  },
  {
    id: 'user-2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: UserRole.VIEWER,
    isActive: false,
    profilePicture: 'profile-2.webp',
    lastLoginAt: new Date('2023-12-15'),
    createdAt: new Date('2023-06-01'),
    _count: {
      createdProducts: 3,
      createdPages: 12,
    },
  },
  {
    id: 'user-3',
    name: 'Bob Wilson',
    email: 'bob@example.com',
    role: UserRole.ADMIN,
    isActive: true,
    profilePicture: null,
    lastLoginAt: new Date('2024-01-02'),
    createdAt: new Date('2022-01-01'),
    _count: {
      createdProducts: 45,
      createdPages: 23,
    },
  },
]

const mockPagination = {
  page: 1,
  limit: 20,
  total: 3,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
}

describe('UserManagement Component', () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful users fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ 
        users: mockUsers, 
        pagination: mockPagination 
      }),
    } as Response)

    // Mock useSession
    require('next-auth/react').useSession.mockReturnValue({
      data: mockAdminSession,
      status: 'authenticated',
    })
  })

  const renderComponent = (props = {}) => {
    return render(
      <SessionProvider session={mockAdminSession}>
        <UserManagement 
          initialUsers={mockUsers}
          initialPagination={mockPagination}
          {...props} 
        />
      </SessionProvider>
    )
  }

  describe('Initial Rendering', () => {
    it('renders user management interface', () => {
      renderComponent()

      expect(screen.getByText('User Management')).toBeInTheDocument()
      expect(screen.getByText('Manage system users, roles, and permissions')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument()
      expect(screen.getByText('Add User')).toBeInTheDocument()
    })

    it('displays user list with correct data', () => {
      renderComponent()

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('jane@example.com')).toBeInTheDocument()
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
      expect(screen.getByText('bob@example.com')).toBeInTheDocument()
    })

    it('shows user roles and status correctly', () => {
      renderComponent()

      expect(screen.getByText('Editor')).toBeInTheDocument()
      expect(screen.getByText('Viewer')).toBeInTheDocument()
      expect(screen.getByText('Admin')).toBeInTheDocument()
      
      // Check active/inactive status
      const activeStatuses = screen.getAllByText('Active')
      const inactiveStatuses = screen.getAllByText('Inactive')
      expect(activeStatuses).toHaveLength(2)
      expect(inactiveStatuses).toHaveLength(1)
    })

    it('displays user statistics', () => {
      renderComponent()

      expect(screen.getByText('15 products')).toBeInTheDocument()
      expect(screen.getByText('8 pages')).toBeInTheDocument()
      expect(screen.getByText('3 products')).toBeInTheDocument()
      expect(screen.getByText('12 pages')).toBeInTheDocument()
    })
  })

  describe('Search and Filtering', () => {
    it('allows searching users by name', async () => {
      renderComponent()

      const searchInput = screen.getByPlaceholderText('Search users...')
      await user.type(searchInput, 'John')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/users?search=John'),
          expect.any(Object)
        )
      })
    })

    it('allows searching users by email', async () => {
      renderComponent()

      const searchInput = screen.getByPlaceholderText('Search users...')
      await user.type(searchInput, 'jane@example.com')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/users?search=jane%40example.com'),
          expect.any(Object)
        )
      })
    })

    it('allows filtering by role', async () => {
      renderComponent()

      const roleFilter = screen.getByDisplayValue('All Roles')
      await user.selectOptions(roleFilter, 'EDITOR')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/users?role=EDITOR'),
          expect.any(Object)
        )
      })
    })

    it('allows filtering by status', async () => {
      renderComponent()

      const statusFilter = screen.getByDisplayValue('All Status')
      await user.selectOptions(statusFilter, 'active')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/users?status=active'),
          expect.any(Object)
        )
      })
    })

    it('combines search and filters', async () => {
      renderComponent()

      const searchInput = screen.getByPlaceholderText('Search users...')
      const roleFilter = screen.getByDisplayValue('All Roles')

      await user.type(searchInput, 'John')
      await user.selectOptions(roleFilter, 'EDITOR')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/users?search=John&role=EDITOR'),
          expect.any(Object)
        )
      })
    })

    it('clears search when clear button is clicked', async () => {
      renderComponent()

      const searchInput = screen.getByPlaceholderText('Search users...')
      await user.type(searchInput, 'John')

      const clearButton = screen.getByLabelText('Clear search')
      await user.click(clearButton)

      expect(searchInput).toHaveValue('')
    })
  })

  describe('User Selection and Bulk Operations', () => {
    it('allows selecting individual users', async () => {
      renderComponent()

      const checkboxes = screen.getAllByRole('checkbox')
      const userCheckbox = checkboxes.find(cb => 
        cb.getAttribute('aria-label')?.includes('John Doe')
      )

      expect(userCheckbox).toBeInTheDocument()
      await user.click(userCheckbox!)

      expect(userCheckbox).toBeChecked()
    })

    it('allows selecting all users', async () => {
      renderComponent()

      const selectAllCheckbox = screen.getByLabelText('Select all users')
      await user.click(selectAllCheckbox)

      expect(selectAllCheckbox).toBeChecked()
      
      // All individual checkboxes should be checked
      const userCheckboxes = screen.getAllByRole('checkbox').filter(cb =>
        cb.getAttribute('aria-label')?.includes('Select user')
      )
      userCheckboxes.forEach(checkbox => {
        expect(checkbox).toBeChecked()
      })
    })

    it('shows bulk actions when users are selected', async () => {
      renderComponent()

      const userCheckbox = screen.getAllByRole('checkbox')[1] // First user checkbox
      await user.click(userCheckbox)

      expect(screen.getByText('1 user selected')).toBeInTheDocument()
      expect(screen.getByText('Bulk Actions')).toBeInTheDocument()
      expect(screen.getByText('Activate Selected')).toBeInTheDocument()
      expect(screen.getByText('Deactivate Selected')).toBeInTheDocument()
      expect(screen.getByText('Change Role')).toBeInTheDocument()
    })

    it('performs bulk activation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Users activated successfully' }),
      } as Response)

      renderComponent()

      // Select inactive user
      const userCheckboxes = screen.getAllByRole('checkbox')
      const inactiveUserCheckbox = userCheckboxes[2] // Jane Smith (inactive)
      await user.click(inactiveUserCheckbox)

      const activateButton = screen.getByText('Activate Selected')
      await user.click(activateButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/users/bulk',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('activate'),
          })
        )
      })

      expect(screen.getByText('Users activated successfully')).toBeInTheDocument()
    })

    it('performs bulk deactivation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Users deactivated successfully' }),
      } as Response)

      renderComponent()

      // Select active user
      const userCheckboxes = screen.getAllByRole('checkbox')
      const activeUserCheckbox = userCheckboxes[1] // John Doe (active)
      await user.click(activeUserCheckbox)

      const deactivateButton = screen.getByText('Deactivate Selected')
      await user.click(deactivateButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/users/bulk',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('deactivate'),
          })
        )
      })

      expect(screen.getByText('Users deactivated successfully')).toBeInTheDocument()
    })

    it('performs bulk role change', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'User roles updated successfully' }),
      } as Response)

      renderComponent()

      // Select user
      const userCheckboxes = screen.getAllByRole('checkbox')
      await user.click(userCheckboxes[1])

      const changeRoleButton = screen.getByText('Change Role')
      await user.click(changeRoleButton)

      // Select new role in modal
      const roleSelect = screen.getByDisplayValue('Select role...')
      await user.selectOptions(roleSelect, 'ADMIN')

      const confirmButton = screen.getByText('Update Roles')
      await user.click(confirmButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/users/bulk',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('ADMIN'),
          })
        )
      })
    })
  })

  describe('Individual User Actions', () => {
    it('opens user detail modal when user is clicked', async () => {
      renderComponent()

      const userRow = screen.getByText('John Doe').closest('tr')
      await user.click(userRow!)

      expect(screen.getByText('User Details')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('Editor')).toBeInTheDocument()
    })

    it('allows editing user from detail modal', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          user: { ...mockUsers[0], name: 'John Updated' }
        }),
      } as Response)

      renderComponent()

      const userRow = screen.getByText('John Doe').closest('tr')
      await user.click(userRow!)

      const editButton = screen.getByText('Edit User')
      await user.click(editButton)

      const nameInput = screen.getByDisplayValue('John Doe')
      await user.clear(nameInput)
      await user.type(nameInput, 'John Updated')

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/users/user-1',
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('John Updated'),
          })
        )
      })
    })

    it('allows deleting user with confirmation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'User deleted successfully' }),
      } as Response)

      renderComponent()

      const userRow = screen.getByText('John Doe').closest('tr')
      await user.click(userRow!)

      const deleteButton = screen.getByText('Delete User')
      await user.click(deleteButton)

      // Confirm deletion
      const confirmButton = screen.getByText('Yes, Delete User')
      await user.click(confirmButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/users/user-1',
          expect.objectContaining({
            method: 'DELETE',
          })
        )
      })

      expect(screen.getByText('User deleted successfully')).toBeInTheDocument()
    })

    it('shows user activity when activity tab is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          logs: [
            {
              id: 'log-1',
              action: 'LOGIN',
              timestamp: new Date(),
              ipAddress: '192.168.1.1',
            }
          ]
        }),
      } as Response)

      renderComponent()

      const userRow = screen.getByText('John Doe').closest('tr')
      await user.click(userRow!)

      const activityTab = screen.getByText('Activity')
      await user.click(activityTab)

      await waitFor(() => {
        expect(screen.getByText('LOGIN')).toBeInTheDocument()
        expect(screen.getByText('192.168.1.1')).toBeInTheDocument()
      })
    })
  })

  describe('Add New User', () => {
    it('opens add user modal when add button is clicked', async () => {
      renderComponent()

      const addButton = screen.getByText('Add User')
      await user.click(addButton)

      expect(screen.getByText('Add New User')).toBeInTheDocument()
      expect(screen.getByLabelText('Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Role')).toBeInTheDocument()
    })

    it('creates new user successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          user: {
            id: 'user-4',
            name: 'New User',
            email: 'newuser@example.com',
            role: UserRole.EDITOR,
            isActive: true,
          }
        }),
      } as Response)

      renderComponent()

      const addButton = screen.getByText('Add User')
      await user.click(addButton)

      const nameInput = screen.getByLabelText('Name')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const roleSelect = screen.getByLabelText('Role')

      await user.type(nameInput, 'New User')
      await user.type(emailInput, 'newuser@example.com')
      await user.type(passwordInput, 'SecurePassword123!')
      await user.selectOptions(roleSelect, 'EDITOR')

      const createButton = screen.getByText('Create User')
      await user.click(createButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/users',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('New User'),
          })
        )
      })

      expect(screen.getByText('User created successfully')).toBeInTheDocument()
    })

    it('validates required fields', async () => {
      renderComponent()

      const addButton = screen.getByText('Add User')
      await user.click(addButton)

      const createButton = screen.getByText('Create User')
      await user.click(createButton)

      expect(screen.getByText('Name is required')).toBeInTheDocument()
      expect(screen.getByText('Email is required')).toBeInTheDocument()
      expect(screen.getByText('Password is required')).toBeInTheDocument()
    })

    it('validates email format', async () => {
      renderComponent()

      const addButton = screen.getByText('Add User')
      await user.click(addButton)

      const emailInput = screen.getByLabelText('Email')
      await user.type(emailInput, 'invalid-email')

      const createButton = screen.getByText('Create User')
      await user.click(createButton)

      expect(screen.getByText('Invalid email format')).toBeInTheDocument()
    })

    it('validates password strength', async () => {
      renderComponent()

      const addButton = screen.getByText('Add User')
      await user.click(addButton)

      const passwordInput = screen.getByLabelText('Password')
      await user.type(passwordInput, 'weak')

      expect(screen.getByText(/Password is too weak/)).toBeInTheDocument()
    })
  })

  describe('Pagination', () => {
    it('shows pagination controls', () => {
      const paginationProps = {
        initialPagination: {
          ...mockPagination,
          total: 100,
          totalPages: 5,
          hasNext: true,
          hasPrev: false,
        }
      }

      renderComponent(paginationProps)

      expect(screen.getByText('Page 1 of 5')).toBeInTheDocument()
      expect(screen.getByLabelText('Next page')).toBeInTheDocument()
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument()
    })

    it('navigates to next page', async () => {
      const paginationProps = {
        initialPagination: {
          ...mockPagination,
          total: 100,
          totalPages: 5,
          hasNext: true,
        }
      }

      renderComponent(paginationProps)

      const nextButton = screen.getByLabelText('Next page')
      await user.click(nextButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/users?page=2'),
          expect.any(Object)
        )
      })
    })

    it('changes page size', async () => {
      renderComponent()

      const pageSizeSelect = screen.getByDisplayValue('20')
      await user.selectOptions(pageSizeSelect, '50')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/users?limit=50'),
          expect.any(Object)
        )
      })
    })
  })

  describe('Error Handling', () => {
    it('handles fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      renderComponent({ initialUsers: [], initialPagination: mockPagination })

      const searchInput = screen.getByPlaceholderText('Search users...')
      await user.type(searchInput, 'test')

      await waitFor(() => {
        expect(screen.getByText('Failed to load users')).toBeInTheDocument()
      })
    })

    it('handles API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: 'Server error' } }),
      } as Response)

      renderComponent()

      const addButton = screen.getByText('Add User')
      await user.click(addButton)

      const nameInput = screen.getByLabelText('Name')
      await user.type(nameInput, 'Test User')

      const createButton = screen.getByText('Create User')
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderComponent()

      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getByLabelText('Search users...')).toBeInTheDocument()
      expect(screen.getByLabelText('Filter by role')).toBeInTheDocument()
      expect(screen.getByLabelText('Filter by status')).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      renderComponent()

      const searchInput = screen.getByPlaceholderText('Search users...')
      searchInput.focus()
      expect(searchInput).toHaveFocus()

      await user.keyboard('{Tab}')
      const roleFilter = screen.getByDisplayValue('All Roles')
      expect(roleFilter).toHaveFocus()
    })

    it('has proper table headers', () => {
      renderComponent()

      expect(screen.getByRole('columnheader', { name: /select all/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /user/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /role/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /activity/i })).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('applies custom className', () => {
      const { container } = renderComponent({ className: 'custom-class' })
      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('handles mobile layout', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      renderComponent()

      // On mobile, some columns should be hidden or stacked
      expect(screen.getByText('User Management')).toBeInTheDocument()
    })
  })
})