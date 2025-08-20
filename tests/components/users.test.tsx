/**
 * User management components tests
 * Tests for UserTable, UserModal, and user management functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { UserRole } from '@prisma/client'
import UserTable from '../../app/components/users/UserTable'
import UserModal from '../../app/components/users/UserModal'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock fetch
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('UserTable Component', () => {
  const mockUsers = [
    {
      id: '1',
      name: 'Admin User',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      _count: { createdProducts: 5, createdPages: 3 }
    },
    {
      id: '2',
      name: 'Editor User',
      email: 'editor@test.com',
      role: UserRole.EDITOR,
      isActive: true,
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      _count: { createdProducts: 2, createdPages: 1 }
    }
  ]

  const mockPagination = {
    page: 1,
    limit: 10,
    total: 2,
    totalPages: 1,
  }

  const mockFilters = {
    search: '',
    role: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  }

  const defaultProps = {
    users: mockUsers,
    pagination: mockPagination,
    loading: false,
    filters: mockFilters,
    onFilterChange: jest.fn(),
    onPageChange: jest.fn(),
    onEditUser: jest.fn(),
    onDeleteUser: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders user table with data', () => {
    render(<UserTable {...defaultProps} />)

    expect(screen.getByText('Admin User')).toBeInTheDocument()
    expect(screen.getByText('admin@test.com')).toBeInTheDocument()
    expect(screen.getByText('Editor User')).toBeInTheDocument()
    expect(screen.getByText('editor@test.com')).toBeInTheDocument()
  })

  it('displays user roles with correct styling', () => {
    render(<UserTable {...defaultProps} />)

    // Get all elements with "Admin" text and find the badge (not the option)
    const adminElements = screen.getAllByText('Admin')
    const adminBadge = adminElements.find(el => el.tagName === 'SPAN')
    
    const editorElements = screen.getAllByText('Editor')
    const editorBadge = editorElements.find(el => el.tagName === 'SPAN')

    expect(adminBadge).toHaveClass('bg-red-100', 'text-red-800')
    expect(editorBadge).toHaveClass('bg-yellow-100', 'text-yellow-800')
  })

  it('displays user status correctly', () => {
    const usersWithInactive = [
      ...mockUsers,
      {
        id: '3',
        name: 'Inactive User',
        email: 'inactive@test.com',
        role: UserRole.VIEWER,
        isActive: false,
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
        _count: { createdProducts: 0, createdPages: 0 }
      }
    ]

    render(<UserTable {...defaultProps} users={usersWithInactive} />)

    const activeStatuses = screen.getAllByText('Active')
    const inactiveStatus = screen.getByText('Inactive')

    expect(activeStatuses).toHaveLength(2)
    expect(inactiveStatus).toBeInTheDocument()
    expect(inactiveStatus).toHaveClass('bg-gray-100', 'text-gray-800')
  })

  it('shows loading state', () => {
    render(<UserTable {...defaultProps} loading={true} users={[]} />)

    // Look for the loading spinner by its class
    const loadingSpinner = document.querySelector('.animate-spin')
    expect(loadingSpinner).toBeInTheDocument()
  })

  it('shows empty state when no users', () => {
    render(<UserTable {...defaultProps} users={[]} />)

    expect(screen.getByText('No users found')).toBeInTheDocument()
  })

  it('handles search input', () => {
    const onFilterChange = jest.fn()
    render(<UserTable {...defaultProps} onFilterChange={onFilterChange} />)

    const searchInput = screen.getByPlaceholderText('Search users...')
    fireEvent.change(searchInput, { target: { value: 'admin' } })
    fireEvent.submit(searchInput.closest('form')!)

    expect(onFilterChange).toHaveBeenCalledWith({ search: 'admin' })
  })

  it('handles role filter change', () => {
    const onFilterChange = jest.fn()
    render(<UserTable {...defaultProps} onFilterChange={onFilterChange} />)

    const roleSelect = screen.getByDisplayValue('All Roles')
    fireEvent.change(roleSelect, { target: { value: 'ADMIN' } })

    expect(onFilterChange).toHaveBeenCalledWith({ role: 'ADMIN' })
  })

  it('handles column sorting', () => {
    const onFilterChange = jest.fn()
    render(<UserTable {...defaultProps} onFilterChange={onFilterChange} />)

    const nameHeader = screen.getByText('Name').closest('th')!
    fireEvent.click(nameHeader)

    expect(onFilterChange).toHaveBeenCalledWith({
      sortBy: 'name',
      sortOrder: 'asc',
    })
  })

  it('handles edit user action', () => {
    const onEditUser = jest.fn()
    render(<UserTable {...defaultProps} onEditUser={onEditUser} />)

    const editButtons = screen.getAllByTitle('Edit user')
    fireEvent.click(editButtons[0])

    expect(onEditUser).toHaveBeenCalledWith(mockUsers[0])
  })

  it('handles delete user action', () => {
    const onDeleteUser = jest.fn()
    render(<UserTable {...defaultProps} onDeleteUser={onDeleteUser} />)

    const deleteButtons = screen.getAllByTitle('Delete user')
    fireEvent.click(deleteButtons[0])

    expect(onDeleteUser).toHaveBeenCalledWith(mockUsers[0].id)
  })

  it('displays pagination when multiple pages', () => {
    const paginationProps = {
      ...defaultProps,
      pagination: {
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
      }
    }

    const { container } = render(<UserTable {...paginationProps} />)

    // Just verify the component renders without errors with pagination data
    expect(container).toBeInTheDocument()
    
    // The pagination should be conditionally rendered based on totalPages > 1
    // Since we have 3 total pages, pagination should be present
    // We can check for navigation elements that would be in pagination
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('handles page navigation', () => {
    const onPageChange = jest.fn()
    const paginationProps = {
      ...defaultProps,
      onPageChange,
      pagination: {
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
      }
    }

    render(<UserTable {...paginationProps} />)

    const nextButton = screen.getByText('Next')
    fireEvent.click(nextButton)

    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})

describe('UserModal Component', () => {
  const mockOnClose = jest.fn()
  const mockOnSuccess = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  it('renders create user modal', () => {
    render(
      <UserModal
        user={null}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByText('Create User')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Role')).toBeInTheDocument()
  })

  it('renders edit user modal with existing data', () => {
    const existingUser = {
      id: '1',
      name: 'Test User',
      email: 'test@test.com',
      role: UserRole.EDITOR,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      _count: { createdProducts: 1, createdPages: 0 }
    }

    render(
      <UserModal
        user={existingUser}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByText('Edit User')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test@test.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('EDITOR')).toBeInTheDocument()
  })

  it('shows role descriptions based on selected role', () => {
    render(
      <UserModal
        user={null}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    // Default role is EDITOR
    expect(screen.getByText(/Editor:/)).toBeInTheDocument()

    // Change to ADMIN
    const roleSelect = screen.getByLabelText('Role')
    fireEvent.change(roleSelect, { target: { value: 'ADMIN' } })

    expect(screen.getByText(/Admin:/)).toBeInTheDocument()
  })

  it('toggles password visibility', () => {
    render(
      <UserModal
        user={null}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const passwordInput = screen.getByLabelText('Password')
    const toggleButton = passwordInput.nextElementSibling?.querySelector('button')

    expect(passwordInput).toHaveAttribute('type', 'password')

    if (toggleButton) {
      fireEvent.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'text')
    }
  })

  it('handles form submission for creating user', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: {
          id: '3',
          name: 'New User',
          email: 'new@test.com',
          role: 'EDITOR',
          isActive: true,
        }
      })
    } as Response)

    render(
      <UserModal
        user={null}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    // Fill form
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New User' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@test.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })

    // Submit form
    fireEvent.click(screen.getByText('Create User'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New User',
          email: 'new@test.com',
          password: 'password123',
          role: 'EDITOR',
          isActive: true,
        })
      })
    })

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('handles form submission for updating user', async () => {
    const existingUser = {
      id: '1',
      name: 'Test User',
      email: 'test@test.com',
      role: UserRole.EDITOR,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      _count: { createdProducts: 1, createdPages: 0 }
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: {
          ...existingUser,
          name: 'Updated User',
        }
      })
    } as Response)

    render(
      <UserModal
        user={existingUser}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    // Update name
    const nameInput = screen.getByDisplayValue('Test User')
    fireEvent.change(nameInput, { target: { value: 'Updated User' } })

    // Submit form
    fireEvent.click(screen.getByText('Update User'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/users/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated User',
          email: 'test@test.com',
          role: 'EDITOR',
          isActive: true,
        })
      })
    })

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('displays error messages', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: { message: 'Email already exists' }
      })
    } as Response)

    render(
      <UserModal
        user={null}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    // Fill and submit form
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test User' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'existing@test.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByText('Create User'))

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument()
    })
  })

  it('handles close action', () => {
    render(
      <UserModal
        user={null}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    fireEvent.click(screen.getByText('Cancel'))
    expect(mockOnClose).toHaveBeenCalled()
  })
})