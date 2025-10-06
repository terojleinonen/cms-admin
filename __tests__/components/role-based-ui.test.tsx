/**
 * Role-Based UI Component Tests
 * Comprehensive tests for UI components with different user roles
 */

import React from 'react'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { UserRole } from '@prisma/client'
import { usePermissions } from '../../app/lib/hooks/usePermissions'
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

// Mock UI components
jest.mock('../../app/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ size }: { size?: string }) => <div data-testid="loading-spinner">Loading {size}</div>
}))

// Test components that simulate role-based UI behavior
function MockUserManagement({ initialUsers = [] }: any) {
  const permissions = usePermissions()
  
  return (
    <div data-testid="user-management">
      <h1>User Management</h1>
      {permissions.canAccess('users', 'create') && (
        <button data-testid="add-user-btn">Add User</button>
      )}
      <div data-testid="user-count">{initialUsers.length} users</div>
      {permissions.isAdmin() && (
        <div data-testid="admin-actions">
          <button data-testid="bulk-delete">Bulk Delete</button>
          <button data-testid="export-users">Export Users</button>
        </div>
      )}
    </div>
  )
}

function MockProductForm({ product }: any) {
  const permissions = usePermissions()
  
  return (
    <div data-testid="product-form">
      <h1>{product ? 'Edit Product' : 'Create Product'}</h1>
      <input 
        data-testid="product-name" 
        placeholder="Product name"
        disabled={!permissions.canAccess('products', 'create') && !permissions.canAccess('products', 'update')}
      />
      <input 
        data-testid="product-price" 
        placeholder="Price"
        disabled={!permissions.canAccess('products', 'create') && !permissions.canAccess('products', 'update')}
      />
      <button 
        data-testid="save-product"
        disabled={!permissions.canAccess('products', 'create') && !permissions.canAccess('products', 'update')}
      >
        Save Product
      </button>
      {permissions.isAdmin() && (
        <div data-testid="advanced-settings">
          <input 
            data-testid="seo-title" 
            placeholder="SEO Title"
            disabled={!permissions.isAdmin()}
          />
          <input 
            data-testid="inventory-tracking" 
            type="checkbox"
            disabled={!permissions.isAdmin()}
          />
        </div>
      )}
    </div>
  )
}

function MockHeader({ user }: any) {
  const permissions = usePermissions()
  
  return (
    <div data-testid="header">
      <div data-testid="user-info">{user?.name} ({user?.role})</div>
      <div data-testid="quick-actions">
        {permissions.canAccess('products', 'create') && (
          <button data-testid="new-product">New Product</button>
        )}
        {permissions.canAccess('users', 'create') && (
          <button data-testid="new-user">New User</button>
        )}
        {permissions.canAccess('pages', 'create') && (
          <button data-testid="new-page">New Page</button>
        )}
      </div>
      <div data-testid="notifications">
        <span data-testid="notification-count">3</span>
      </div>
      <div data-testid="search-bar">
        <input placeholder="Search..." />
      </div>
    </div>
  )
}

describe('Role-Based UI Components', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock permission service to return role-appropriate permissions
    mockPermissionService.hasPermission.mockImplementation((user, permission) => {
      if (!user) return false
      
      const { role } = user
      const { resource, action } = permission
      
      // Admin has all permissions
      if (role === UserRole.ADMIN) return true
      
      // Editor permissions
      if (role === UserRole.EDITOR) {
        if (resource === 'products') return true
        if (resource === 'pages') return true
        if (resource === 'categories') return true
        if (resource === 'users' && action === 'read') return true
        return false
      }
      
      // Viewer permissions (read-only)
      if (role === UserRole.VIEWER) {
        if (action === 'read') return true
        return false
      }
      
      return false
    })
    
    mockPermissionService.canUserAccessRoute.mockReturnValue(true)
  })

  describe('UserManagement Component', () => {
    describe('Admin Role', () => {
      beforeEach(() => {
        const adminUser = createMockUser({ role: UserRole.ADMIN })
        mockUseSession.mockReturnValue({
          data: createMockSession(adminUser),
          status: 'authenticated'
        })
      })

      it('should show all admin features for admin users', async () => {
        const mockUsers = [
          createMockUser({ id: '1', role: UserRole.EDITOR }),
          createMockUser({ id: '2', role: UserRole.VIEWER }),
        ]

        render(<MockUserManagement initialUsers={mockUsers} />)

        await waitFor(() => {
          expect(screen.getByTestId('user-management')).toBeInTheDocument()
          expect(screen.getByTestId('add-user-btn')).toBeInTheDocument()
          expect(screen.getByTestId('admin-actions')).toBeInTheDocument()
          expect(screen.getByTestId('bulk-delete')).toBeInTheDocument()
          expect(screen.getByTestId('export-users')).toBeInTheDocument()
        })
      })

      it('should allow admin to perform bulk operations', async () => {
        render(<MockUserManagement />)

        await waitFor(() => {
          const bulkDeleteBtn = screen.getByTestId('bulk-delete')
          expect(bulkDeleteBtn).toBeInTheDocument()
          expect(bulkDeleteBtn).not.toBeDisabled()
        })
      })

      it('should show user statistics for admin', async () => {
        const mockUsers = [
          createMockUser({ id: '1', role: UserRole.ADMIN }),
          createMockUser({ id: '2', role: UserRole.EDITOR }),
          createMockUser({ id: '3', role: UserRole.VIEWER }),
        ]

        render(<MockUserManagement initialUsers={mockUsers} />)

        await waitFor(() => {
          expect(screen.getByTestId('user-count')).toHaveTextContent('3 users')
        })
      })
    })

    describe('Editor Role', () => {
      beforeEach(() => {
        const editorUser = createMockUser({ role: UserRole.EDITOR })
        mockUseSession.mockReturnValue({
          data: createMockSession(editorUser),
          status: 'authenticated'
        })
      })

      it('should show limited features for editor users', async () => {
        render(<MockUserManagement />)

        await waitFor(() => {
          expect(screen.getByTestId('user-management')).toBeInTheDocument()
          // Editors should not see admin-only features
          expect(screen.queryByTestId('bulk-delete')).not.toBeInTheDocument()
          expect(screen.queryByTestId('add-user-btn')).not.toBeInTheDocument()
        })
      })

      it('should allow editors to view user list but not modify', async () => {
        render(<MockUserManagement />)

        await waitFor(() => {
          expect(screen.getByTestId('user-management')).toBeInTheDocument()
          expect(screen.queryByTestId('admin-actions')).not.toBeInTheDocument()
        })
      })
    })

    describe('Viewer Role', () => {
      beforeEach(() => {
        const viewerUser = createMockUser({ role: UserRole.VIEWER })
        mockUseSession.mockReturnValue({
          data: createMockSession(viewerUser),
          status: 'authenticated'
        })
      })

      it('should show read-only view for viewer users', async () => {
        render(<MockUserManagement />)

        await waitFor(() => {
          expect(screen.getByTestId('user-management')).toBeInTheDocument()
          // Viewers should only see basic information
          expect(screen.queryByTestId('add-user-btn')).not.toBeInTheDocument()
          expect(screen.queryByTestId('admin-actions')).not.toBeInTheDocument()
          expect(screen.queryByTestId('bulk-delete')).not.toBeInTheDocument()
        })
      })
    })
  })

  describe('ProductForm Component', () => {
    describe('Admin Role', () => {
      beforeEach(() => {
        const adminUser = createMockUser({ role: UserRole.ADMIN })
        mockUseSession.mockReturnValue({
          data: createMockSession(adminUser),
          status: 'authenticated'
        })
      })

      it('should show all form fields for admin users', async () => {
        render(<MockProductForm />)

        await waitFor(() => {
          expect(screen.getByTestId('product-form')).toBeInTheDocument()
          expect(screen.getByTestId('product-name')).toBeInTheDocument()
          expect(screen.getByTestId('product-price')).toBeInTheDocument()
          expect(screen.getByTestId('save-product')).toBeInTheDocument()
          expect(screen.getByTestId('advanced-settings')).toBeInTheDocument()
          expect(screen.getByTestId('seo-title')).toBeInTheDocument()
          expect(screen.getByTestId('inventory-tracking')).toBeInTheDocument()
        })
      })

      it('should allow admin to access advanced settings', async () => {
        render(<MockProductForm />)

        await waitFor(() => {
          const advancedSettings = screen.getByTestId('advanced-settings')
          expect(advancedSettings).toBeInTheDocument()
          
          const seoTitle = screen.getByTestId('seo-title')
          expect(seoTitle).not.toBeDisabled()
          
          const inventoryTracking = screen.getByTestId('inventory-tracking')
          expect(inventoryTracking).not.toBeDisabled()
        })
      })
    })

    describe('Editor Role', () => {
      beforeEach(() => {
        const editorUser = createMockUser({ role: UserRole.EDITOR })
        mockUseSession.mockReturnValue({
          data: createMockSession(editorUser),
          status: 'authenticated'
        })
      })

      it('should show basic form fields for editor users', async () => {
        render(<MockProductForm />)

        await waitFor(() => {
          expect(screen.getByTestId('product-form')).toBeInTheDocument()
          expect(screen.getByTestId('product-name')).toBeInTheDocument()
          expect(screen.getByTestId('product-price')).toBeInTheDocument()
          expect(screen.getByTestId('save-product')).toBeInTheDocument()
        })
      })

      it('should allow editors to edit basic product information', async () => {
        render(<MockProductForm />)

        await waitFor(() => {
          const productName = screen.getByTestId('product-name')
          const productPrice = screen.getByTestId('product-price')
          const saveButton = screen.getByTestId('save-product')

          expect(productName).not.toBeDisabled()
          expect(productPrice).not.toBeDisabled()
          expect(saveButton).not.toBeDisabled()
        })
      })

      it('should restrict access to advanced settings for editors', async () => {
        render(<MockProductForm />)

        await waitFor(() => {
          // Advanced settings should be hidden for editors
          const advancedSettings = screen.queryByTestId('advanced-settings')
          expect(advancedSettings).not.toBeInTheDocument()
        })
      })
    })

    describe('Viewer Role', () => {
      beforeEach(() => {
        const viewerUser = createMockUser({ role: UserRole.VIEWER })
        mockUseSession.mockReturnValue({
          data: createMockSession(viewerUser),
          status: 'authenticated'
        })
      })

      it('should show read-only form for viewer users', async () => {
        const mockProduct = {
          id: '1',
          name: 'Test Product',
          price: 99.99,
          description: 'Test description'
        }

        render(<MockProductForm product={mockProduct} />)

        await waitFor(() => {
          expect(screen.getByTestId('product-form')).toBeInTheDocument()
          
          const productName = screen.getByTestId('product-name')
          const productPrice = screen.getByTestId('product-price')
          const saveButton = screen.getByTestId('save-product')

          expect(productName).toBeDisabled()
          expect(productPrice).toBeDisabled()
          expect(saveButton).toBeDisabled()
        })
      })

      it('should not allow viewers to create new products', async () => {
        render(<MockProductForm />)

        await waitFor(() => {
          const saveButton = screen.getByTestId('save-product')
          expect(saveButton).toBeDisabled()
        })
      })
    })
  })

  describe('Header Component', () => {
    describe('Admin Role', () => {
      beforeEach(() => {
        const adminUser = createMockUser({ 
          role: UserRole.ADMIN,
          name: 'Admin User',
          email: 'admin@example.com'
        })
        mockUseSession.mockReturnValue({
          data: createMockSession(adminUser),
          status: 'authenticated'
        })
      })

      it('should show all quick actions for admin users', async () => {
        const adminUser = createMockUser({ role: UserRole.ADMIN })
        
        render(<MockHeader user={adminUser} onMenuClick={jest.fn()} />)

        await waitFor(() => {
          expect(screen.getByTestId('header')).toBeInTheDocument()
          expect(screen.getByTestId('quick-actions')).toBeInTheDocument()
          expect(screen.getByTestId('new-product')).toBeInTheDocument()
          expect(screen.getByTestId('new-user')).toBeInTheDocument()
          expect(screen.getByTestId('new-page')).toBeInTheDocument()
        })
      })

      it('should show admin user information', async () => {
        const adminUser = createMockUser({ 
          role: UserRole.ADMIN,
          name: 'Admin User'
        })
        
        render(<MockHeader user={adminUser} onMenuClick={jest.fn()} />)

        await waitFor(() => {
          expect(screen.getByTestId('user-info')).toHaveTextContent('Admin User (ADMIN)')
        })
      })

      it('should show all notifications for admin users', async () => {
        const adminUser = createMockUser({ role: UserRole.ADMIN })
        
        render(<MockHeader user={adminUser} onMenuClick={jest.fn()} />)

        await waitFor(() => {
          expect(screen.getByTestId('notifications')).toBeInTheDocument()
          expect(screen.getByTestId('notification-count')).toHaveTextContent('3')
        })
      })
    })

    describe('Editor Role', () => {
      beforeEach(() => {
        const editorUser = createMockUser({ 
          role: UserRole.EDITOR,
          name: 'Editor User',
          email: 'editor@example.com'
        })
        mockUseSession.mockReturnValue({
          data: createMockSession(editorUser),
          status: 'authenticated'
        })
      })

      it('should show limited quick actions for editor users', async () => {
        const editorUser = createMockUser({ role: UserRole.EDITOR })
        
        render(<MockHeader user={editorUser} onMenuClick={jest.fn()} />)

        await waitFor(() => {
          expect(screen.getByTestId('header')).toBeInTheDocument()
          expect(screen.getByTestId('quick-actions')).toBeInTheDocument()
          expect(screen.getByTestId('new-product')).toBeInTheDocument()
          expect(screen.getByTestId('new-page')).toBeInTheDocument()
          // Editors should not see user creation
          expect(screen.queryByTestId('new-user')).not.toBeInTheDocument()
        })
      })

      it('should show editor user information', async () => {
        const editorUser = createMockUser({ 
          role: UserRole.EDITOR,
          name: 'Editor User'
        })
        
        render(<MockHeader user={editorUser} onMenuClick={jest.fn()} />)

        await waitFor(() => {
          expect(screen.getByTestId('user-info')).toHaveTextContent('Editor User (EDITOR)')
        })
      })

      it('should show filtered notifications for editor users', async () => {
        const editorUser = createMockUser({ role: UserRole.EDITOR })
        
        render(<MockHeader user={editorUser} onMenuClick={jest.fn()} />)

        await waitFor(() => {
          expect(screen.getByTestId('notifications')).toBeInTheDocument()
          // Editors might see fewer notifications
          const notificationCount = screen.getByTestId('notification-count')
          expect(notificationCount).toBeInTheDocument()
        })
      })
    })

    describe('Viewer Role', () => {
      beforeEach(() => {
        const viewerUser = createMockUser({ 
          role: UserRole.VIEWER,
          name: 'Viewer User',
          email: 'viewer@example.com'
        })
        mockUseSession.mockReturnValue({
          data: createMockSession(viewerUser),
          status: 'authenticated'
        })
      })

      it('should show minimal quick actions for viewer users', async () => {
        const viewerUser = createMockUser({ role: UserRole.VIEWER })
        
        render(<MockHeader user={viewerUser} onMenuClick={jest.fn()} />)

        await waitFor(() => {
          expect(screen.getByTestId('header')).toBeInTheDocument()
          // Viewers should not see creation actions
          expect(screen.queryByTestId('new-product')).not.toBeInTheDocument()
          expect(screen.queryByTestId('new-user')).not.toBeInTheDocument()
          expect(screen.queryByTestId('new-page')).not.toBeInTheDocument()
        })
      })

      it('should show viewer user information', async () => {
        const viewerUser = createMockUser({ 
          role: UserRole.VIEWER,
          name: 'Viewer User'
        })
        
        render(<MockHeader user={viewerUser} onMenuClick={jest.fn()} />)

        await waitFor(() => {
          expect(screen.getByTestId('user-info')).toHaveTextContent('Viewer User (VIEWER)')
        })
      })

      it('should show search functionality for all users', async () => {
        const viewerUser = createMockUser({ role: UserRole.VIEWER })
        
        render(<MockHeader user={viewerUser} onMenuClick={jest.fn()} />)

        await waitFor(() => {
          expect(screen.getByTestId('search-bar')).toBeInTheDocument()
          const searchInput = screen.getByPlaceholderText('Search...')
          expect(searchInput).toBeInTheDocument()
          expect(searchInput).not.toBeDisabled()
        })
      })
    })
  })

  describe('Cross-Component Role Integration', () => {
    it('should maintain consistent role behavior across components', async () => {
      const adminUser = createMockUser({ role: UserRole.ADMIN })
      mockUseSession.mockReturnValue({
        data: createMockSession(adminUser),
        status: 'authenticated'
      })

      const { rerender } = render(<MockHeader user={adminUser} onMenuClick={jest.fn()} />)

      await waitFor(() => {
        expect(screen.getByTestId('new-user')).toBeInTheDocument()
      })

      // Switch to UserManagement component with same user
      rerender(<MockUserManagement />)

      await waitFor(() => {
        expect(screen.getByTestId('add-user-btn')).toBeInTheDocument()
        expect(screen.getByTestId('bulk-delete')).toBeInTheDocument()
      })
    })

    it('should handle role changes dynamically', async () => {
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      mockUseSession.mockReturnValue({
        data: createMockSession(editorUser),
        status: 'authenticated'
      })

      const { rerender } = render(<MockProductForm />)

      await waitFor(() => {
        expect(screen.getByTestId('product-name')).not.toBeDisabled()
      })

      // Simulate role change to viewer
      const viewerUser = createMockUser({ role: UserRole.VIEWER })
      mockUseSession.mockReturnValue({
        data: createMockSession(viewerUser),
        status: 'authenticated'
      })

      rerender(<MockProductForm />)

      await waitFor(() => {
        expect(screen.getByTestId('save-product')).toBeDisabled()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle missing user gracefully', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated'
      })

      render(<MockHeader onMenuClick={jest.fn()} />)

      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument()
        // Should show default state without user-specific features
        expect(screen.queryByTestId('new-product')).not.toBeInTheDocument()
        expect(screen.queryByTestId('new-user')).not.toBeInTheDocument()
        expect(screen.queryByTestId('new-page')).not.toBeInTheDocument()
      })
    })

    it('should handle invalid role gracefully', async () => {
      const invalidUser = createMockUser({ role: 'INVALID_ROLE' as UserRole })
      mockUseSession.mockReturnValue({
        data: createMockSession(invalidUser),
        status: 'authenticated'
      })

      render(<MockUserManagement />)

      await waitFor(() => {
        expect(screen.getByTestId('user-management')).toBeInTheDocument()
        // Should default to most restrictive permissions
        expect(screen.queryByTestId('admin-actions')).not.toBeInTheDocument()
      })
    })

    it('should handle session loading state', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading'
      })

      render(<MockProductForm />)

      await waitFor(() => {
        expect(screen.getByTestId('product-form')).toBeInTheDocument()
        // Should show loading state or disabled form
        const saveButton = screen.getByTestId('save-product')
        expect(saveButton).toBeDisabled()
      })
    })
  })
})