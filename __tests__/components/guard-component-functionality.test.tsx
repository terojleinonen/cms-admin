/**
 * Guard Component Functionality Tests
 * Comprehensive tests for all guard components and their functionality
 */

import React from 'react'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { UserRole } from '@prisma/client'
import { createMockUser, createMockSession } from '../helpers/test-helpers'
import { render } from '../helpers/component-helpers'

// Mock next-auth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}))

// Mock permission service
jest.mock('../../app/lib/permissions', () => ({
  permissionService: {
    hasPermission: jest.fn(),
    canUserAccessRoute: jest.fn(),
    filterByPermissions: jest.fn(),
  },
}))

const mockPermissionService = require('../../app/lib/permissions').permissionService

// Import guard components
import { RoleGuard } from '../../app/components/auth/RoleGuard'
import { PermissionGate } from '../../app/components/auth/PermissionGate'
import { ConditionalRender } from '../../app/components/auth/ConditionalRender'

// Test components for complex scenarios
function ComplexGuardScenario() {
  return (
    <div data-testid="complex-scenario">
      <RoleGuard requiredRole={UserRole.ADMIN}>
        <div data-testid="admin-section">
          <h2>Admin Section</h2>
          
          <PermissionGate resource="users" action="create">
            <button data-testid="create-user-btn">Create User</button>
          </PermissionGate>
          
          <PermissionGate resource="users" action="delete">
            <button data-testid="delete-user-btn">Delete User</button>
          </PermissionGate>
          
          <ConditionalRender 
            condition={(permissions) => 
              permissions.canAccess('system', 'configure') && 
              permissions.isAdmin()
            }
          >
            <div data-testid="system-config">System Configuration</div>
          </ConditionalRender>
        </div>
      </RoleGuard>
      
      <RoleGuard minimumRole={UserRole.EDITOR}>
        <div data-testid="editor-section">
          <h2>Editor Section</h2>
          
          <PermissionGate resource="products" action="create">
            <button data-testid="create-product-btn">Create Product</button>
          </PermissionGate>
          
          <PermissionGate resource="products" action="update">
            <button data-testid="update-product-btn">Update Product</button>
          </PermissionGate>
        </div>
      </RoleGuard>
      
      <RoleGuard minimumRole={UserRole.VIEWER}>
        <div data-testid="viewer-section">
          <h2>Viewer Section</h2>
          
          <PermissionGate resource="products" action="read">
            <div data-testid="product-list">Product List</div>
          </PermissionGate>
        </div>
      </RoleGuard>
    </div>
  )
}

function NestedGuardScenario() {
  return (
    <div data-testid="nested-scenario">
      <RoleGuard requiredRole={UserRole.ADMIN}>
        <div data-testid="outer-admin">
          <PermissionGate resource="users" action="manage">
            <div data-testid="user-management">
              <ConditionalRender 
                condition={(permissions) => permissions.canAccess('users', 'delete')}
              >
                <RoleGuard requiredRole={UserRole.ADMIN}>
                  <button data-testid="nested-delete-btn">Delete Users</button>
                </RoleGuard>
              </ConditionalRender>
            </div>
          </PermissionGate>
        </div>
      </RoleGuard>
    </div>
  )
}

function OwnershipGuardScenario({ resourceOwnerId }: { resourceOwnerId: string }) {
  return (
    <div data-testid="ownership-scenario">
      <PermissionGate 
        resource="products" 
        action="update"
        resourceOwnerId={resourceOwnerId}
        allowOwnerAccess={true}
      >
        <button data-testid="edit-own-product">Edit My Product</button>
      </PermissionGate>
      
      <PermissionGate 
        resource="products" 
        action="delete"
        resourceOwnerId={resourceOwnerId}
        allowOwnerAccess={false}
      >
        <button data-testid="delete-any-product">Delete Product (Admin Only)</button>
      </PermissionGate>
    </div>
  )
}

function CallbackGuardScenario() {
  const [authCount, setAuthCount] = React.useState(0)
  const [unauthCount, setUnauthCount] = React.useState(0)
  
  return (
    <div data-testid="callback-scenario">
      <div data-testid="auth-count">Authorized: {authCount}</div>
      <div data-testid="unauth-count">Unauthorized: {unauthCount}</div>
      
      <RoleGuard 
        requiredRole={UserRole.ADMIN}
        onAuthorized={() => setAuthCount(prev => prev + 1)}
        onUnauthorized={() => setUnauthCount(prev => prev + 1)}
      >
        <div data-testid="callback-content">Admin Content</div>
      </RoleGuard>
    </div>
  )
}

describe('Guard Component Functionality Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPermissionService.hasPermission.mockReturnValue(true)
    mockPermissionService.canUserAccessRoute.mockReturnValue(true)
  })

  describe('RoleGuard Component', () => {
    describe('Basic Role Requirements', () => {
      it('should allow access with exact role match', async () => {
        const adminUser = createMockUser({ role: UserRole.ADMIN })
        mockUseSession.mockReturnValue({
          data: createMockSession(adminUser),
          status: 'authenticated'
        })

        render(
          <RoleGuard requiredRole={UserRole.ADMIN}>
            <div data-testid="admin-content">Admin Content</div>
          </RoleGuard>
        )

        await waitFor(() => {
          expect(screen.getByTestId('admin-content')).toBeInTheDocument()
        })
      })

      it('should deny access with insufficient role', async () => {
        const viewerUser = createMockUser({ role: UserRole.VIEWER })
        mockUseSession.mockReturnValue({
          data: createMockSession(viewerUser),
          status: 'authenticated'
        })

        render(
          <RoleGuard 
            requiredRole={UserRole.ADMIN}
            fallback={<div data-testid="access-denied">Access Denied</div>}
          >
            <div data-testid="admin-content">Admin Content</div>
          </RoleGuard>
        )

        await waitFor(() => {
          expect(screen.getByTestId('access-denied')).toBeInTheDocument()
          expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument()
        })
      })

      it('should work with minimum role requirements', async () => {
        const editorUser = createMockUser({ role: UserRole.EDITOR })
        mockUseSession.mockReturnValue({
          data: createMockSession(editorUser),
          status: 'authenticated'
        })

        render(
          <RoleGuard minimumRole={UserRole.VIEWER}>
            <div data-testid="content">Content for Viewer+</div>
          </RoleGuard>
        )

        await waitFor(() => {
          expect(screen.getByTestId('content')).toBeInTheDocument()
        })
      })

      it('should work with allowed roles array', async () => {
        const editorUser = createMockUser({ role: UserRole.EDITOR })
        mockUseSession.mockReturnValue({
          data: createMockSession(editorUser),
          status: 'authenticated'
        })

        render(
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.EDITOR]}>
            <div data-testid="content">Multi-Role Content</div>
          </RoleGuard>
        )

        await waitFor(() => {
          expect(screen.getByTestId('content')).toBeInTheDocument()
        })
      })
    })

    describe('Permission Requirements', () => {
      it('should check required permissions', async () => {
        const editorUser = createMockUser({ role: UserRole.EDITOR })
        mockUseSession.mockReturnValue({
          data: createMockSession(editorUser),
          status: 'authenticated'
        })

        render(
          <RoleGuard requiredPermissions={[{ resource: 'products', action: 'create' }]}>
            <div data-testid="content">Create Products</div>
          </RoleGuard>
        )

        await waitFor(() => {
          expect(screen.getByTestId('content')).toBeInTheDocument()
          expect(mockPermissionService.hasPermission).toHaveBeenCalledWith(
            editorUser,
            { resource: 'products', action: 'create' }
          )
        })
      })

      it('should handle multiple permissions with AND logic', async () => {
        const adminUser = createMockUser({ role: UserRole.ADMIN })
        mockUseSession.mockReturnValue({
          data: createMockSession(adminUser),
          status: 'authenticated'
        })

        render(
          <RoleGuard 
            requiredPermissions={[
              { resource: 'products', action: 'create' },
              { resource: 'users', action: 'manage' }
            ]}
            requireAllPermissions={true}
          >
            <div data-testid="content">Multi-Permission Content</div>
          </RoleGuard>
        )

        await waitFor(() => {
          expect(screen.getByTestId('content')).toBeInTheDocument()
          expect(mockPermissionService.hasPermission).toHaveBeenCalledTimes(2)
        })
      })

      it('should handle multiple permissions with OR logic', async () => {
        const editorUser = createMockUser({ role: UserRole.EDITOR })
        mockUseSession.mockReturnValue({
          data: createMockSession(editorUser),
          status: 'authenticated'
        })

        mockPermissionService.hasPermission
          .mockReturnValueOnce(true)  // products.create
          .mockReturnValueOnce(false) // users.manage

        render(
          <RoleGuard 
            requiredPermissions={[
              { resource: 'products', action: 'create' },
              { resource: 'users', action: 'manage' }
            ]}
            requireAllPermissions={false}
          >
            <div data-testid="content">OR Permission Content</div>
          </RoleGuard>
        )

        await waitFor(() => {
          expect(screen.getByTestId('content')).toBeInTheDocument()
        })
      })
    })

    describe('Error Handling and Edge Cases', () => {
      it('should handle unauthenticated users', async () => {
        mockUseSession.mockReturnValue({
          data: null,
          status: 'unauthenticated'
        })

        render(
          <RoleGuard 
            requiredRole={UserRole.VIEWER}
            fallback={<div data-testid="login-required">Login Required</div>}
          >
            <div data-testid="content">Protected Content</div>
          </RoleGuard>
        )

        await waitFor(() => {
          expect(screen.getByTestId('login-required')).toBeInTheDocument()
          expect(screen.queryByTestId('content')).not.toBeInTheDocument()
        })
      })

      it('should show loading state when session is loading', () => {
        mockUseSession.mockReturnValue({
          data: null,
          status: 'loading'
        })

        render(
          <RoleGuard requiredRole={UserRole.ADMIN}>
            <div data-testid="content">Protected Content</div>
          </RoleGuard>
        )

        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      })

      it('should handle permission service errors gracefully', async () => {
        const adminUser = createMockUser({ role: UserRole.ADMIN })
        mockUseSession.mockReturnValue({
          data: createMockSession(adminUser),
          status: 'authenticated'
        })

        mockPermissionService.hasPermission.mockImplementation(() => {
          throw new Error('Permission service error')
        })

        render(
          <RoleGuard 
            requiredPermissions={[{ resource: 'products', action: 'create' }]}
            fallback={<div data-testid="error-fallback">Error</div>}
          >
            <div data-testid="content">Protected Content</div>
          </RoleGuard>
        )

        await waitFor(() => {
          expect(screen.getByTestId('error-fallback')).toBeInTheDocument()
          expect(screen.queryByTestId('content')).not.toBeInTheDocument()
        })
      })
    })
  })

  describe('PermissionGate Component', () => {
    describe('Basic Permission Checks', () => {
      it('should allow access with correct permission', async () => {
        const editorUser = createMockUser({ role: UserRole.EDITOR })
        mockUseSession.mockReturnValue({
          data: createMockSession(editorUser),
          status: 'authenticated'
        })

        render(
          <PermissionGate resource="products" action="create">
            <div data-testid="create-product">Create Product</div>
          </PermissionGate>
        )

        await waitFor(() => {
          expect(screen.getByTestId('create-product')).toBeInTheDocument()
          expect(mockPermissionService.hasPermission).toHaveBeenCalledWith(
            editorUser,
            { resource: 'products', action: 'create' }
          )
        })
      })

      it('should deny access without permission', async () => {
        const viewerUser = createMockUser({ role: UserRole.VIEWER })
        mockUseSession.mockReturnValue({
          data: createMockSession(viewerUser),
          status: 'authenticated'
        })

        mockPermissionService.hasPermission.mockReturnValue(false)

        render(
          <PermissionGate 
            resource="products" 
            action="create"
            fallback={<div data-testid="no-permission">No Permission</div>}
          >
            <div data-testid="create-product">Create Product</div>
          </PermissionGate>
        )

        await waitFor(() => {
          expect(screen.getByTestId('no-permission')).toBeInTheDocument()
          expect(screen.queryByTestId('create-product')).not.toBeInTheDocument()
        })
      })
    })

    describe('Ownership-Based Access', () => {
      it('should allow owner access when enabled', async () => {
        const user = createMockUser({ id: 'user-123', role: UserRole.VIEWER })
        mockUseSession.mockReturnValue({
          data: createMockSession(user),
          status: 'authenticated'
        })

        mockPermissionService.hasPermission.mockReturnValue(false) // No general permission

        render(
          <OwnershipGuardScenario resourceOwnerId="user-123" />
        )

        await waitFor(() => {
          expect(screen.getByTestId('edit-own-product')).toBeInTheDocument()
        })
      })

      it('should deny owner access when disabled', async () => {
        const user = createMockUser({ id: 'user-123', role: UserRole.VIEWER })
        mockUseSession.mockReturnValue({
          data: createMockSession(user),
          status: 'authenticated'
        })

        mockPermissionService.hasPermission.mockReturnValue(false)

        render(
          <OwnershipGuardScenario resourceOwnerId="user-123" />
        )

        await waitFor(() => {
          expect(screen.queryByTestId('delete-any-product')).not.toBeInTheDocument()
        })
      })

      it('should deny access for non-owners', async () => {
        const user = createMockUser({ id: 'user-123', role: UserRole.VIEWER })
        mockUseSession.mockReturnValue({
          data: createMockSession(user),
          status: 'authenticated'
        })

        mockPermissionService.hasPermission.mockReturnValue(false)

        render(
          <OwnershipGuardScenario resourceOwnerId="user-456" />
        )

        await waitFor(() => {
          expect(screen.queryByTestId('edit-own-product')).not.toBeInTheDocument()
          expect(screen.queryByTestId('delete-any-product')).not.toBeInTheDocument()
        })
      })
    })

    describe('Multiple Permissions', () => {
      it('should handle multiple permissions with AND logic', async () => {
        const adminUser = createMockUser({ role: UserRole.ADMIN })
        mockUseSession.mockReturnValue({
          data: createMockSession(adminUser),
          status: 'authenticated'
        })

        render(
          <PermissionGate 
            permissions={[
              { resource: 'products', action: 'create' },
              { resource: 'products', action: 'update' }
            ]}
            requireAllPermissions={true}
          >
            <div data-testid="multi-permission">Multi Permission Content</div>
          </PermissionGate>
        )

        await waitFor(() => {
          expect(screen.getByTestId('multi-permission')).toBeInTheDocument()
          expect(mockPermissionService.hasPermission).toHaveBeenCalledTimes(2)
        })
      })

      it('should handle multiple permissions with OR logic', async () => {
        const editorUser = createMockUser({ role: UserRole.EDITOR })
        mockUseSession.mockReturnValue({
          data: createMockSession(editorUser),
          status: 'authenticated'
        })

        mockPermissionService.hasPermission
          .mockReturnValueOnce(true)  // products.create
          .mockReturnValueOnce(false) // users.create

        render(
          <PermissionGate 
            permissions={[
              { resource: 'products', action: 'create' },
              { resource: 'users', action: 'create' }
            ]}
            requireAllPermissions={false}
          >
            <div data-testid="or-permission">OR Permission Content</div>
          </PermissionGate>
        )

        await waitFor(() => {
          expect(screen.getByTestId('or-permission')).toBeInTheDocument()
        })
      })
    })
  })

  describe('ConditionalRender Component', () => {
    describe('Basic Conditional Logic', () => {
      it('should render when condition is true', async () => {
        const adminUser = createMockUser({ role: UserRole.ADMIN })
        mockUseSession.mockReturnValue({
          data: createMockSession(adminUser),
          status: 'authenticated'
        })

        const condition = jest.fn().mockReturnValue(true)

        render(
          <ConditionalRender condition={condition}>
            <div data-testid="conditional-content">Conditional Content</div>
          </ConditionalRender>
        )

        await waitFor(() => {
          expect(condition).toHaveBeenCalled()
          expect(screen.getByTestId('conditional-content')).toBeInTheDocument()
        })
      })

      it('should not render when condition is false', async () => {
        const viewerUser = createMockUser({ role: UserRole.VIEWER })
        mockUseSession.mockReturnValue({
          data: createMockSession(viewerUser),
          status: 'authenticated'
        })

        const condition = jest.fn().mockReturnValue(false)

        render(
          <ConditionalRender 
            condition={condition}
            fallback={<div data-testid="fallback">Fallback</div>}
          >
            <div data-testid="conditional-content">Conditional Content</div>
          </ConditionalRender>
        )

        await waitFor(() => {
          expect(condition).toHaveBeenCalled()
          expect(screen.getByTestId('fallback')).toBeInTheDocument()
          expect(screen.queryByTestId('conditional-content')).not.toBeInTheDocument()
        })
      })
    })

    describe('Complex Conditional Logic', () => {
      it('should handle complex permission conditions', async () => {
        const adminUser = createMockUser({ role: UserRole.ADMIN })
        mockUseSession.mockReturnValue({
          data: createMockSession(adminUser),
          status: 'authenticated'
        })

        render(
          <ConditionalRender 
            condition={(permissions) => 
              permissions.isAdmin() && 
              permissions.canAccess('system', 'configure')
            }
          >
            <div data-testid="complex-condition">Complex Condition Met</div>
          </ConditionalRender>
        )

        await waitFor(() => {
          expect(screen.getByTestId('complex-condition')).toBeInTheDocument()
        })
      })

      it('should handle error in condition gracefully', async () => {
        const user = createMockUser({ role: UserRole.VIEWER })
        mockUseSession.mockReturnValue({
          data: createMockSession(user),
          status: 'authenticated'
        })

        const errorCondition = jest.fn().mockImplementation(() => {
          throw new Error('Condition error')
        })

        render(
          <ConditionalRender 
            condition={errorCondition}
            fallback={<div data-testid="error-fallback">Error Fallback</div>}
          >
            <div data-testid="conditional-content">Conditional Content</div>
          </ConditionalRender>
        )

        await waitFor(() => {
          expect(screen.getByTestId('error-fallback')).toBeInTheDocument()
          expect(screen.queryByTestId('conditional-content')).not.toBeInTheDocument()
        })
      })
    })
  })

  describe('Complex Guard Scenarios', () => {
    describe('Hierarchical Role Access', () => {
      it('should show appropriate sections for admin users', async () => {
        const adminUser = createMockUser({ role: UserRole.ADMIN })
        mockUseSession.mockReturnValue({
          data: createMockSession(adminUser),
          status: 'authenticated'
        })

        render(<ComplexGuardScenario />)

        await waitFor(() => {
          expect(screen.getByTestId('admin-section')).toBeInTheDocument()
          expect(screen.getByTestId('editor-section')).toBeInTheDocument()
          expect(screen.getByTestId('viewer-section')).toBeInTheDocument()
          expect(screen.getByTestId('create-user-btn')).toBeInTheDocument()
          expect(screen.getByTestId('delete-user-btn')).toBeInTheDocument()
          expect(screen.getByTestId('system-config')).toBeInTheDocument()
        })
      })

      it('should show appropriate sections for editor users', async () => {
        const editorUser = createMockUser({ role: UserRole.EDITOR })
        mockUseSession.mockReturnValue({
          data: createMockSession(editorUser),
          status: 'authenticated'
        })

        render(<ComplexGuardScenario />)

        await waitFor(() => {
          expect(screen.queryByTestId('admin-section')).not.toBeInTheDocument()
          expect(screen.getByTestId('editor-section')).toBeInTheDocument()
          expect(screen.getByTestId('viewer-section')).toBeInTheDocument()
          expect(screen.getByTestId('create-product-btn')).toBeInTheDocument()
          expect(screen.getByTestId('update-product-btn')).toBeInTheDocument()
        })
      })

      it('should show appropriate sections for viewer users', async () => {
        const viewerUser = createMockUser({ role: UserRole.VIEWER })
        mockUseSession.mockReturnValue({
          data: createMockSession(viewerUser),
          status: 'authenticated'
        })

        render(<ComplexGuardScenario />)

        await waitFor(() => {
          expect(screen.queryByTestId('admin-section')).not.toBeInTheDocument()
          expect(screen.queryByTestId('editor-section')).not.toBeInTheDocument()
          expect(screen.getByTestId('viewer-section')).toBeInTheDocument()
          expect(screen.getByTestId('product-list')).toBeInTheDocument()
        })
      })
    })

    describe('Nested Guard Components', () => {
      it('should handle deeply nested guards correctly', async () => {
        const adminUser = createMockUser({ role: UserRole.ADMIN })
        mockUseSession.mockReturnValue({
          data: createMockSession(adminUser),
          status: 'authenticated'
        })

        render(<NestedGuardScenario />)

        await waitFor(() => {
          expect(screen.getByTestId('outer-admin')).toBeInTheDocument()
          expect(screen.getByTestId('user-management')).toBeInTheDocument()
          expect(screen.getByTestId('nested-delete-btn')).toBeInTheDocument()
        })
      })

      it('should fail at appropriate nesting level', async () => {
        const editorUser = createMockUser({ role: UserRole.EDITOR })
        mockUseSession.mockReturnValue({
          data: createMockSession(editorUser),
          status: 'authenticated'
        })

        render(<NestedGuardScenario />)

        await waitFor(() => {
          expect(screen.queryByTestId('outer-admin')).not.toBeInTheDocument()
          expect(screen.queryByTestId('user-management')).not.toBeInTheDocument()
          expect(screen.queryByTestId('nested-delete-btn')).not.toBeInTheDocument()
        })
      })
    })

    describe('Callback Functionality', () => {
      it('should call onAuthorized callback when access is granted', async () => {
        const adminUser = createMockUser({ role: UserRole.ADMIN })
        mockUseSession.mockReturnValue({
          data: createMockSession(adminUser),
          status: 'authenticated'
        })

        render(<CallbackGuardScenario />)

        await waitFor(() => {
          expect(screen.getByTestId('auth-count')).toHaveTextContent('Authorized: 1')
          expect(screen.getByTestId('unauth-count')).toHaveTextContent('Unauthorized: 0')
          expect(screen.getByTestId('callback-content')).toBeInTheDocument()
        })
      })

      it('should call onUnauthorized callback when access is denied', async () => {
        const viewerUser = createMockUser({ role: UserRole.VIEWER })
        mockUseSession.mockReturnValue({
          data: createMockSession(viewerUser),
          status: 'authenticated'
        })

        render(<CallbackGuardScenario />)

        await waitFor(() => {
          expect(screen.getByTestId('auth-count')).toHaveTextContent('Authorized: 0')
          expect(screen.getByTestId('unauth-count')).toHaveTextContent('Unauthorized: 1')
          expect(screen.queryByTestId('callback-content')).not.toBeInTheDocument()
        })
      })
    })
  })

  describe('Performance and Optimization', () => {
    it('should not cause excessive re-renders with multiple guards', async () => {
      const adminUser = createMockUser({ role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(adminUser),
        status: 'authenticated'
      })

      let renderCount = 0
      function TestMultipleGuards() {
        renderCount++
        return (
          <div>
            <RoleGuard requiredRole={UserRole.ADMIN}>
              <div>Admin 1</div>
            </RoleGuard>
            <RoleGuard requiredRole={UserRole.ADMIN}>
              <div>Admin 2</div>
            </RoleGuard>
            <PermissionGate resource="products" action="create">
              <div>Create Product</div>
            </PermissionGate>
          </div>
        )
      }

      render(<TestMultipleGuards />)

      await waitFor(() => {
        expect(screen.getByText('Admin 1')).toBeInTheDocument()
      })

      // Should not re-render excessively
      expect(renderCount).toBeLessThan(5)
    })

    it('should handle rapid permission changes efficiently', async () => {
      const adminUser = createMockUser({ role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(adminUser),
        status: 'authenticated'
      })

      const { rerender } = render(
        <RoleGuard requiredRole={UserRole.ADMIN}>
          <div data-testid="admin-content">Admin Content</div>
        </RoleGuard>
      )

      await waitFor(() => {
        expect(screen.getByTestId('admin-content')).toBeInTheDocument()
      })

      // Rapidly change user role
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })

      rerender(
        <RoleGuard requiredRole={UserRole.ADMIN}>
          <div data-testid="admin-content">Admin Content</div>
        </RoleGuard>
      )

      await waitFor(() => {
        expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument()
      })
    })
  })
})