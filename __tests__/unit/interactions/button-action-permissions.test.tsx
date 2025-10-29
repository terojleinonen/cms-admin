/**
 * Button and Action Permission Tests
 * Tests for button visibility, enablement, and action permissions
 */

import React from 'react'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession } from 'next-auth/react'
import { UserRole } from '@prisma/client'
import Button from '../../../app/components/ui/Button'
import { PermissionGate } from '../../../app/components/auth/PermissionGate'
import { RoleGuard } from '../../../app/components/auth/RoleGuard'
import UserManagement from '../../../app/components/admin/UserManagement'
import { createMockUser, createMockSession } from '../../helpers/test-helpers'
import { render } from '../../helpers/component-helpers'

// Mock next-auth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock fetch for API calls
global.fetch = jest.fn()

// Mock window.confirm
global.confirm = jest.fn()

// Mock permission components to avoid router issues
jest.mock('../../../app/components/auth/PermissionGate', () => ({
  PermissionGate: ({ children, resource, action, fallback, resourceOwnerId, allowOwnerAccess }: any) => {
    const { data: session } = useSession()
    const userRole = session?.user?.role
    const userId = session?.user?.id
    
    // Simple permission logic for testing
    const hasPermission = () => {
      if (!userRole) return false
      
      // Check ownership if specified
      if (allowOwnerAccess && resourceOwnerId && userId === resourceOwnerId) {
        return true
      }
      
      if (userRole === UserRole.ADMIN) return true
      if (userRole === UserRole.EDITOR) {
        return !['users'].includes(resource) || action !== 'delete'
      }
      if (userRole === UserRole.VIEWER) {
        return action === 'read'
      }
      return false
    }
    
    return hasPermission() ? children : (fallback || null)
  }
}))

jest.mock('../../../app/components/auth/RoleGuard', () => ({
  RoleGuard: ({ children, allowedRoles }: any) => {
    const { data: session } = useSession()
    const userRole = session?.user?.role
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return null
    }
    
    return children
  }
}))

describe('Button and Action Permission Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
    ;(global.confirm as jest.Mock).mockReturnValue(true)
  })

  describe('Basic Button Permission Tests', () => {
    it('should render enabled button for authorized users', async () => {
      const adminUser = createMockUser({ role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(adminUser),
        status: 'authenticated'
      })

      const mockOnClick = jest.fn()
      render(
        <PermissionGate resource="products" action="create">
          <Button onClick={mockOnClick}>Create Product</Button>
        </PermissionGate>
      )

      const button = screen.getByRole('button', { name: /create product/i })
      expect(button).toBeEnabled()
      expect(button).toBeVisible()
    })

    it('should hide button for unauthorized users', async () => {
      const viewerUser = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(viewerUser),
        status: 'authenticated'
      })

      const mockOnClick = jest.fn()
      render(
        <PermissionGate resource="products" action="create">
          <Button onClick={mockOnClick}>Create Product</Button>
        </PermissionGate>
      )

      const button = screen.queryByRole('button', { name: /create product/i })
      expect(button).not.toBeInTheDocument()
    })

    it('should show fallback for unauthorized users when specified', async () => {
      const viewerUser = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(viewerUser),
        status: 'authenticated'
      })

      const mockOnClick = jest.fn()
      render(
        <PermissionGate 
          resource="products" 
          action="create"
          fallback={<Button disabled>Insufficient Permissions</Button>}
        >
          <Button onClick={mockOnClick}>Create Product</Button>
        </PermissionGate>
      )

      const button = screen.getByRole('button', { name: /insufficient permissions/i })
      expect(button).toBeDisabled()
      expect(button).toBeVisible()
    })

    it('should execute action when authorized user clicks button', async () => {
      const user = userEvent.setup()
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })

      const mockOnClick = jest.fn()
      render(
        <PermissionGate resource="products" action="create">
          <Button onClick={mockOnClick}>Create Product</Button>
        </PermissionGate>
      )

      const button = screen.getByRole('button', { name: /create product/i })
      await user.click(button)

      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Role-Based Button Visibility', () => {
    it('should show admin-only buttons to admin users', async () => {
      const adminUser = createMockUser({ role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(adminUser),
        status: 'authenticated'
      })

      render(
        <RoleGuard allowedRoles={[UserRole.ADMIN]}>
          <Button>Admin Action</Button>
        </RoleGuard>
      )

      expect(screen.getByRole('button', { name: /admin action/i })).toBeInTheDocument()
    })

    it('should hide admin-only buttons from non-admin users', async () => {
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })

      render(
        <RoleGuard allowedRoles={[UserRole.ADMIN]}>
          <Button>Admin Action</Button>
        </RoleGuard>
      )

      expect(screen.queryByRole('button', { name: /admin action/i })).not.toBeInTheDocument()
    })

    it('should show buttons to multiple allowed roles', async () => {
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })

      render(
        <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.EDITOR]}>
          <Button>Content Action</Button>
        </RoleGuard>
      )

      expect(screen.getByRole('button', { name: /content action/i })).toBeInTheDocument()
    })
  })

  describe('Conditional Button States', () => {
    it('should disable button during loading state', async () => {
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })

      render(
        <PermissionGate resource="products" action="create">
          <Button loading>Creating...</Button>
        </PermissionGate>
      )

      const button = screen.getByRole('button', { name: /creating/i })
      expect(button).toBeDisabled()
    })

    it('should show loading spinner when loading', async () => {
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })

      render(
        <PermissionGate resource="products" action="create">
          <Button loading>Creating...</Button>
        </PermissionGate>
      )

      const button = screen.getByRole('button', { name: /creating/i })
      const spinner = button.querySelector('svg')
      expect(spinner).toBeInTheDocument()
    })

    it('should handle disabled state with permissions', async () => {
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })

      render(
        <PermissionGate resource="products" action="create">
          <Button disabled>Disabled Action</Button>
        </PermissionGate>
      )

      const button = screen.getByRole('button', { name: /disabled action/i })
      expect(button).toBeDisabled()
    })
  })

  describe('Action Button Groups', () => {
    it('should show appropriate action buttons based on permissions', async () => {
      const adminUser = createMockUser({ role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(adminUser),
        status: 'authenticated'
      })

      render(
        <div>
          <PermissionGate resource="products" action="create">
            <Button>Create</Button>
          </PermissionGate>
          <PermissionGate resource="products" action="update">
            <Button>Edit</Button>
          </PermissionGate>
          <PermissionGate resource="products" action="delete">
            <Button variant="danger">Delete</Button>
          </PermissionGate>
        </div>
      )

      // Admin should see all buttons
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    })

    it('should show limited action buttons for editors', async () => {
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })

      render(
        <div>
          <PermissionGate resource="products" action="create">
            <Button>Create</Button>
          </PermissionGate>
          <PermissionGate resource="products" action="update">
            <Button>Edit</Button>
          </PermissionGate>
          <PermissionGate resource="users" action="delete">
            <Button variant="danger">Delete User</Button>
          </PermissionGate>
        </div>
      )

      // Editor should see create and edit, but not delete user
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /delete user/i })).not.toBeInTheDocument()
    })

    it('should show minimal action buttons for viewers', async () => {
      const viewerUser = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(viewerUser),
        status: 'authenticated'
      })

      render(
        <div>
          <PermissionGate resource="products" action="read">
            <Button>View</Button>
          </PermissionGate>
          <PermissionGate resource="products" action="create">
            <Button>Create</Button>
          </PermissionGate>
          <PermissionGate resource="products" action="delete">
            <Button variant="danger">Delete</Button>
          </PermissionGate>
        </div>
      )

      // Viewer should only see view button
      expect(screen.getByRole('button', { name: /view/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /create/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })
  })

  describe('Destructive Action Confirmations', () => {
    it('should require confirmation for destructive actions', async () => {
      const user = userEvent.setup()
      const adminUser = createMockUser({ role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(adminUser),
        status: 'authenticated'
      })

      const mockOnDelete = jest.fn()
      
      const DeleteButton = () => {
        const handleDelete = () => {
          if (confirm('Are you sure you want to delete this item?')) {
            mockOnDelete()
          }
        }
        
        return (
          <PermissionGate resource="products" action="delete">
            <Button onClick={handleDelete} variant="danger">
              Delete Product
            </Button>
          </PermissionGate>
        )
      }

      render(<DeleteButton />)

      const deleteButton = screen.getByRole('button', { name: /delete product/i })
      await user.click(deleteButton)

      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this item?')
      expect(mockOnDelete).toHaveBeenCalledTimes(1)
    })

    it('should not execute action if confirmation is cancelled', async () => {
      const user = userEvent.setup()
      const adminUser = createMockUser({ role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(adminUser),
        status: 'authenticated'
      })

      // Mock confirm to return false (cancelled)
      ;(global.confirm as jest.Mock).mockReturnValue(false)

      const mockOnDelete = jest.fn()
      
      const DeleteButton = () => {
        const handleDelete = () => {
          if (confirm('Are you sure you want to delete this item?')) {
            mockOnDelete()
          }
        }
        
        return (
          <PermissionGate resource="products" action="delete">
            <Button onClick={handleDelete} variant="danger">
              Delete Product
            </Button>
          </PermissionGate>
        )
      }

      render(<DeleteButton />)

      const deleteButton = screen.getByRole('button', { name: /delete product/i })
      await user.click(deleteButton)

      expect(global.confirm).toHaveBeenCalled()
      expect(mockOnDelete).not.toHaveBeenCalled()
    })
  })

  describe('Bulk Action Permissions', () => {
    it('should show bulk actions for authorized users', async () => {
      const adminUser = createMockUser({ role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(adminUser),
        status: 'authenticated'
      })

      render(
        <div>
          <PermissionGate resource="products" action="update">
            <Button>Bulk Edit</Button>
          </PermissionGate>
          <PermissionGate resource="products" action="delete">
            <Button variant="danger">Bulk Delete</Button>
          </PermissionGate>
        </div>
      )

      expect(screen.getByRole('button', { name: /bulk edit/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /bulk delete/i })).toBeInTheDocument()
    })

    it('should hide bulk actions for unauthorized users', async () => {
      const viewerUser = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(viewerUser),
        status: 'authenticated'
      })

      render(
        <div>
          <PermissionGate resource="products" action="update">
            <Button>Bulk Edit</Button>
          </PermissionGate>
          <PermissionGate resource="products" action="delete">
            <Button variant="danger">Bulk Delete</Button>
          </PermissionGate>
        </div>
      )

      expect(screen.queryByRole('button', { name: /bulk edit/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /bulk delete/i })).not.toBeInTheDocument()
    })
  })

  describe('Context-Sensitive Actions', () => {
    it('should show different actions based on resource ownership', async () => {
      const user = createMockUser({ id: 'user-123', role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(user),
        status: 'authenticated'
      })

      render(
        <div>
          {/* User can edit their own profile */}
          <PermissionGate 
            resource="users" 
            action="update" 
            resourceOwnerId="user-123"
            allowOwnerAccess={true}
          >
            <Button>Edit Profile</Button>
          </PermissionGate>
          
          {/* User cannot edit other users */}
          <PermissionGate 
            resource="users" 
            action="update" 
            resourceOwnerId="user-456"
            allowOwnerAccess={true}
          >
            <Button>Edit Other User</Button>
          </PermissionGate>
        </div>
      )

      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /edit other user/i })).not.toBeInTheDocument()
    })

    it('should show admin actions regardless of ownership', async () => {
      const adminUser = createMockUser({ id: 'admin-123', role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(adminUser),
        status: 'authenticated'
      })

      render(
        <div>
          <PermissionGate 
            resource="users" 
            action="update" 
            resourceOwnerId="user-456"
            allowOwnerAccess={true}
          >
            <Button>Edit User</Button>
          </PermissionGate>
          
          <PermissionGate resource="users" action="delete">
            <Button variant="danger">Delete User</Button>
          </PermissionGate>
        </div>
      )

      // Admin should see both buttons
      expect(screen.getByRole('button', { name: /edit user/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /delete user/i })).toBeInTheDocument()
    })
  })

  describe('Button State Management', () => {
    it('should handle async action states', async () => {
      const user = userEvent.setup()
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })

      // Mock slow API response
      ;(global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          }), 100)
        )
      )

      const AsyncButton = () => {
        const [loading, setLoading] = React.useState(false)
        
        const handleClick = async () => {
          setLoading(true)
          try {
            await fetch('/api/products', { method: 'POST' })
          } finally {
            setLoading(false)
          }
        }
        
        return (
          <PermissionGate resource="products" action="create">
            <Button loading={loading} onClick={handleClick}>
              {loading ? 'Creating...' : 'Create Product'}
            </Button>
          </PermissionGate>
        )
      }

      render(<AsyncButton />)

      const button = screen.getByRole('button', { name: /create product/i })
      await user.click(button)

      // Button should show loading state
      expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled()

      // Wait for action to complete
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create product/i })).toBeEnabled()
      }, { timeout: 200 })
    })

    it('should handle error states in actions', async () => {
      const user = userEvent.setup()
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })

      // Mock API error
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

      const ErrorButton = () => {
        const [error, setError] = React.useState<string | null>(null)
        
        const handleClick = async () => {
          try {
            setError(null)
            await fetch('/api/products', { method: 'POST' })
          } catch (err) {
            setError('Failed to create product')
          }
        }
        
        return (
          <div>
            <PermissionGate resource="products" action="create">
              <Button onClick={handleClick}>Create Product</Button>
            </PermissionGate>
            {error && <div data-testid="error-message">{error}</div>}
          </div>
        )
      }

      render(<ErrorButton />)

      const button = screen.getByRole('button', { name: /create product/i })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to create product')
      })
    })
  })
})