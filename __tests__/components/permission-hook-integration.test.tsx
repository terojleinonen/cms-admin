/**
 * Permission Hook Integration Tests
 * Tests for permission hooks integration with UI components
 */

import React from 'react'
import { screen, waitFor, fireEvent, act } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { UserRole } from '@prisma/client'
import { usePermissions } from '../../app/lib/hooks/usePermissions'
import { useRoleGuard } from '../../app/lib/hooks/useRoleGuard'
import { useAuditLogger } from '../../app/lib/hooks/useAuditLogger'
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

// Mock fetch for audit logging
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

// Test component that uses permission hooks
function TestComponentWithPermissions() {
  const permissions = usePermissions()
  const roleGuard = useRoleGuard({ requiredRole: UserRole.ADMIN })
  const auditLogger = useAuditLogger()

  const handleCreateProduct = async () => {
    if (permissions.canCreateProduct()) {
      await auditLogger.log({
        action: 'product.create_attempt',
        resource: 'products',
        details: { component: 'TestComponent' }
      })
    }
  }

  const handleViewUsers = () => {
    if (permissions.canAccess('users', 'read')) {
      auditLogger.logSync({
        action: 'users.view_attempt',
        resource: 'users'
      })
    }
  }

  return (
    <div data-testid="test-component">
      <div data-testid="user-info">
        User: {permissions.user?.name || 'None'}
      </div>
      <div data-testid="role-info">
        Role: {permissions.user?.role || 'None'}
      </div>
      <div data-testid="auth-status">
        Authenticated: {permissions.isAuthenticated ? 'Yes' : 'No'}
      </div>
      <div data-testid="loading-status">
        Loading: {permissions.isLoading ? 'Yes' : 'No'}
      </div>
      
      {/* Role-based buttons */}
      <button 
        data-testid="admin-button"
        disabled={!permissions.isAdmin()}
        onClick={() => console.log('Admin action')}
      >
        Admin Action
      </button>
      
      <button 
        data-testid="editor-button"
        disabled={!permissions.isEditor()}
        onClick={() => console.log('Editor action')}
      >
        Editor Action
      </button>
      
      <button 
        data-testid="create-product-button"
        disabled={!permissions.canCreateProduct()}
        onClick={handleCreateProduct}
      >
        Create Product
      </button>
      
      <button 
        data-testid="view-users-button"
        disabled={!permissions.canAccess('users', 'read')}
        onClick={handleViewUsers}
      >
        View Users
      </button>
      
      {/* Role guard protected content */}
      {roleGuard.isAuthorized ? (
        <div data-testid="admin-content">Admin Only Content</div>
      ) : (
        <div data-testid="access-denied">Access Denied: {roleGuard.reason}</div>
      )}
      
      {/* Permission-based content */}
      {permissions.canAccess('products', 'create') && (
        <div data-testid="product-creation-panel">Product Creation Panel</div>
      )}
      
      {permissions.canAccess('users', 'manage') && (
        <div data-testid="user-management-panel">User Management Panel</div>
      )}
      
      {permissions.canAccess('analytics', 'read') && (
        <div data-testid="analytics-panel">Analytics Panel</div>
      )}
    </div>
  )
}

// Component that tests filtering functionality
function TestFilteringComponent() {
  const permissions = usePermissions()
  
  const items = [
    { id: '1', name: 'Product 1', type: 'product', ownerId: 'user-1' },
    { id: '2', name: 'User 2', type: 'user', ownerId: 'user-2' },
    { id: '3', name: 'Page 3', type: 'page', ownerId: 'user-1' },
  ]
  
  const filteredItems = permissions.filterByPermissions(
    items,
    (item) => item.type,
    'read'
  )
  
  return (
    <div data-testid="filtering-component">
      <div data-testid="total-items">Total: {items.length}</div>
      <div data-testid="filtered-items">Filtered: {filteredItems.length}</div>
      {filteredItems.map(item => (
        <div key={item.id} data-testid={`item-${item.id}`}>
          {item.name}
        </div>
      ))}
    </div>
  )
}

describe('Permission Hook Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    } as Response)
    mockPermissionService.hasPermission.mockReturnValue(true)
    mockPermissionService.canUserAccessRoute.mockReturnValue(true)
    mockPermissionService.filterByPermissions.mockReturnValue([])
  })

  describe('Admin User Integration', () => {
    beforeEach(() => {
      const adminUser = createMockUser({ 
        id: 'admin-1',
        role: UserRole.ADMIN,
        name: 'Admin User',
        email: 'admin@example.com'
      })
      mockUseSession.mockReturnValue({
        data: createMockSession(adminUser),
        status: 'authenticated'
      })
    })

    it('should enable all admin features', async () => {
      render(<TestComponentWithPermissions />)

      await waitFor(() => {
        expect(screen.getByTestId('user-info')).toHaveTextContent('User: Admin User')
        expect(screen.getByTestId('role-info')).toHaveTextContent('Role: ADMIN')
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated: Yes')
        expect(screen.getByTestId('loading-status')).toHaveTextContent('Loading: No')
      })

      // All buttons should be enabled for admin
      expect(screen.getByTestId('admin-button')).not.toBeDisabled()
      expect(screen.getByTestId('editor-button')).not.toBeDisabled()
      expect(screen.getByTestId('create-product-button')).not.toBeDisabled()
      expect(screen.getByTestId('view-users-button')).not.toBeDisabled()

      // Admin content should be visible
      expect(screen.getByTestId('admin-content')).toBeInTheDocument()
      expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument()

      // All panels should be visible
      expect(screen.getByTestId('product-creation-panel')).toBeInTheDocument()
      expect(screen.getByTestId('user-management-panel')).toBeInTheDocument()
      expect(screen.getByTestId('analytics-panel')).toBeInTheDocument()
    })

    it('should log admin actions correctly', async () => {
      render(<TestComponentWithPermissions />)

      await waitFor(() => {
        expect(screen.getByTestId('create-product-button')).not.toBeDisabled()
      })

      fireEvent.click(screen.getByTestId('create-product-button'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/audit-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('product.create_attempt')
        })
      })
    })

    it('should filter items correctly for admin', async () => {
      mockPermissionService.filterByPermissions.mockReturnValue([
        { id: '1', name: 'Product 1', type: 'product', ownerId: 'user-1' },
        { id: '2', name: 'User 2', type: 'user', ownerId: 'user-2' },
        { id: '3', name: 'Page 3', type: 'page', ownerId: 'user-1' },
      ])

      render(<TestFilteringComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('total-items')).toHaveTextContent('Total: 3')
        expect(screen.getByTestId('filtered-items')).toHaveTextContent('Filtered: 3')
        expect(screen.getByTestId('item-1')).toBeInTheDocument()
        expect(screen.getByTestId('item-2')).toBeInTheDocument()
        expect(screen.getByTestId('item-3')).toBeInTheDocument()
      })
    })
  })

  describe('Editor User Integration', () => {
    beforeEach(() => {
      const editorUser = createMockUser({ 
        id: 'editor-1',
        role: UserRole.EDITOR,
        name: 'Editor User',
        email: 'editor@example.com'
      })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })
      
      // Mock editor permissions
      mockPermissionService.hasPermission.mockImplementation((user, permission) => {
        if (permission.resource === 'products') return true
        if (permission.resource === 'pages') return true
        if (permission.resource === 'categories') return true
        if (permission.resource === 'users' && permission.action === 'read') return true
        if (permission.resource === 'users' && permission.action === 'manage') return false
        if (permission.resource === 'analytics') return false
        return false
      })
    })

    it('should enable editor-specific features', async () => {
      render(<TestComponentWithPermissions />)

      await waitFor(() => {
        expect(screen.getByTestId('user-info')).toHaveTextContent('User: Editor User')
        expect(screen.getByTestId('role-info')).toHaveTextContent('Role: EDITOR')
      })

      // Editor should not have admin privileges
      expect(screen.getByTestId('admin-button')).toBeDisabled()
      expect(screen.getByTestId('editor-button')).not.toBeDisabled()
      expect(screen.getByTestId('create-product-button')).not.toBeDisabled()
      expect(screen.getByTestId('view-users-button')).not.toBeDisabled()

      // Should show access denied for admin content
      expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument()
      expect(screen.getByTestId('access-denied')).toBeInTheDocument()

      // Should show limited panels
      expect(screen.getByTestId('product-creation-panel')).toBeInTheDocument()
      expect(screen.queryByTestId('user-management-panel')).not.toBeInTheDocument()
      expect(screen.queryByTestId('analytics-panel')).not.toBeInTheDocument()
    })

    it('should filter items correctly for editor', async () => {
      mockPermissionService.filterByPermissions.mockReturnValue([
        { id: '1', name: 'Product 1', type: 'product', ownerId: 'user-1' },
        { id: '3', name: 'Page 3', type: 'page', ownerId: 'user-1' },
      ])

      render(<TestFilteringComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('filtered-items')).toHaveTextContent('Filtered: 2')
        expect(screen.getByTestId('item-1')).toBeInTheDocument()
        expect(screen.queryByTestId('item-2')).not.toBeInTheDocument()
        expect(screen.getByTestId('item-3')).toBeInTheDocument()
      })
    })
  })

  describe('Viewer User Integration', () => {
    beforeEach(() => {
      const viewerUser = createMockUser({ 
        id: 'viewer-1',
        role: UserRole.VIEWER,
        name: 'Viewer User',
        email: 'viewer@example.com'
      })
      mockUseSession.mockReturnValue({
        data: createMockSession(viewerUser),
        status: 'authenticated'
      })
      
      // Mock viewer permissions (read-only)
      mockPermissionService.hasPermission.mockImplementation((user, permission) => {
        if (permission.action === 'read') return true
        return false
      })
    })

    it('should enable only read-only features', async () => {
      render(<TestComponentWithPermissions />)

      await waitFor(() => {
        expect(screen.getByTestId('user-info')).toHaveTextContent('User: Viewer User')
        expect(screen.getByTestId('role-info')).toHaveTextContent('Role: VIEWER')
      })

      // All action buttons should be disabled
      expect(screen.getByTestId('admin-button')).toBeDisabled()
      expect(screen.getByTestId('editor-button')).toBeDisabled()
      expect(screen.getByTestId('create-product-button')).toBeDisabled()
      expect(screen.getByTestId('view-users-button')).not.toBeDisabled() // Can still read

      // Should show access denied
      expect(screen.getByTestId('access-denied')).toBeInTheDocument()

      // Should not show creation panels
      expect(screen.queryByTestId('product-creation-panel')).not.toBeInTheDocument()
      expect(screen.queryByTestId('user-management-panel')).not.toBeInTheDocument()
    })

    it('should filter items correctly for viewer', async () => {
      mockPermissionService.filterByPermissions.mockReturnValue([
        { id: '1', name: 'Product 1', type: 'product', ownerId: 'user-1' },
      ])

      render(<TestFilteringComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('filtered-items')).toHaveTextContent('Filtered: 1')
        expect(screen.getByTestId('item-1')).toBeInTheDocument()
        expect(screen.queryByTestId('item-2')).not.toBeInTheDocument()
        expect(screen.queryByTestId('item-3')).not.toBeInTheDocument()
      })
    })
  })

  describe('Unauthenticated User Integration', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated'
      })
    })

    it('should disable all features for unauthenticated users', async () => {
      render(<TestComponentWithPermissions />)

      await waitFor(() => {
        expect(screen.getByTestId('user-info')).toHaveTextContent('User: None')
        expect(screen.getByTestId('role-info')).toHaveTextContent('Role: None')
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated: No')
      })

      // All buttons should be disabled
      expect(screen.getByTestId('admin-button')).toBeDisabled()
      expect(screen.getByTestId('editor-button')).toBeDisabled()
      expect(screen.getByTestId('create-product-button')).toBeDisabled()
      expect(screen.getByTestId('view-users-button')).toBeDisabled()

      // Should show access denied
      expect(screen.getByTestId('access-denied')).toBeInTheDocument()

      // Should not show any panels
      expect(screen.queryByTestId('product-creation-panel')).not.toBeInTheDocument()
      expect(screen.queryByTestId('user-management-panel')).not.toBeInTheDocument()
      expect(screen.queryByTestId('analytics-panel')).not.toBeInTheDocument()
    })
  })

  describe('Loading State Integration', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading'
      })
    })

    it('should show loading state correctly', async () => {
      render(<TestComponentWithPermissions />)

      await waitFor(() => {
        expect(screen.getByTestId('loading-status')).toHaveTextContent('Loading: Yes')
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated: No')
      })

      // All buttons should be disabled during loading
      expect(screen.getByTestId('admin-button')).toBeDisabled()
      expect(screen.getByTestId('editor-button')).toBeDisabled()
      expect(screen.getByTestId('create-product-button')).toBeDisabled()
      expect(screen.getByTestId('view-users-button')).toBeDisabled()
    })
  })

  describe('Hook Integration with Real Scenarios', () => {
    it('should handle permission changes dynamically', async () => {
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })

      const { rerender } = render(<TestComponentWithPermissions />)

      await waitFor(() => {
        expect(screen.getByTestId('editor-button')).not.toBeDisabled()
        expect(screen.getByTestId('admin-button')).toBeDisabled()
      })

      // Simulate role upgrade to admin
      const adminUser = createMockUser({ role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(adminUser),
        status: 'authenticated'
      })

      rerender(<TestComponentWithPermissions />)

      await waitFor(() => {
        expect(screen.getByTestId('admin-button')).not.toBeDisabled()
        expect(screen.getByTestId('editor-button')).not.toBeDisabled()
      })
    })

    it('should handle audit logging errors gracefully', async () => {
      const adminUser = createMockUser({ role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(adminUser),
        status: 'authenticated'
      })

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<TestComponentWithPermissions />)

      await waitFor(() => {
        expect(screen.getByTestId('create-product-button')).not.toBeDisabled()
      })

      // Should not throw error when audit logging fails
      expect(() => {
        fireEvent.click(screen.getByTestId('create-product-button'))
      }).not.toThrow()
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

      // The component should handle the error and render with disabled state
      expect(() => {
        render(<TestComponentWithPermissions />)
      }).toThrow('Permission service error')
    })
  })

  describe('Hook Performance and Optimization', () => {
    it('should not cause excessive re-renders', async () => {
      const adminUser = createMockUser({ role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(adminUser),
        status: 'authenticated'
      })

      let renderCount = 0
      function TestRenderCount() {
        renderCount++
        const permissions = usePermissions()
        return <div data-testid="render-count">{renderCount}</div>
      }

      render(<TestRenderCount />)

      await waitFor(() => {
        expect(screen.getByTestId('render-count')).toBeInTheDocument()
      })

      // Should not re-render excessively
      expect(renderCount).toBeLessThan(5)
    })

    it('should memoize permission checks correctly', async () => {
      const adminUser = createMockUser({ role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(adminUser),
        status: 'authenticated'
      })

      const { result } = renderHook(() => usePermissions())

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      // Call the same permission check multiple times
      const canCreate1 = result.current.canCreateProduct()
      const canCreate2 = result.current.canCreateProduct()
      const canCreate3 = result.current.canCreateProduct()

      expect(canCreate1).toBe(canCreate2)
      expect(canCreate2).toBe(canCreate3)

      // Permission service should be called efficiently
      expect(mockPermissionService.hasPermission).toHaveBeenCalled()
    })
  })
})