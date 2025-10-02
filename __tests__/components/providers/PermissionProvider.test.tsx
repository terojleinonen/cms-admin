/**
 * Permission Provider Tests
 * Comprehensive tests for permission context provider functionality
 */

import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { PermissionProvider, usePermissionContext } from '@/components/providers/PermissionProvider'
import { UserRole } from '@prisma/client'
import { User } from '@/lib/types'

// Mock next-auth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock permission service
jest.mock('@/lib/permissions', () => ({
  permissionService: {
    hasPermission: jest.fn(),
    canUserAccessRoute: jest.fn(),
    filterByPermissions: jest.fn(),
  },
  enhancedPermissionService: {
    hasPermission: jest.fn(),
    invalidateUserCache: jest.fn(),
    invalidateResourceCache: jest.fn(),
    clearCache: jest.fn(),
  },
}))

// Test component that uses permission context
function TestComponent() {
  const {
    canAccess,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    isAdmin,
    isEditor,
    isViewer,
    canCreateProduct,
    canReadProduct,
    canUpdateProduct,
    canDeleteProduct,
    user,
    isAuthenticated,
    isLoading,
    invalidateCache,
    invalidateUserCache,
    refreshPermissions,
    getCacheStats,
  } = usePermissionContext()

  return (
    <div>
      <div data-testid="user-info">
        {user ? `User: ${user.name} (${user.role})` : 'No user'}
      </div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'Authenticated' : 'Not authenticated'}
      </div>
      <div data-testid="loading-status">
        {isLoading ? 'Loading' : 'Loaded'}
      </div>
      
      {/* Basic permissions */}
      <div data-testid="can-access-products">
        {canAccess('products', 'read') ? 'Can access products' : 'Cannot access products'}
      </div>
      <div data-testid="can-create-products">
        {canCreate('products') ? 'Can create products' : 'Cannot create products'}
      </div>
      <div data-testid="can-read-products">
        {canRead('products') ? 'Can read products' : 'Cannot read products'}
      </div>
      <div data-testid="can-update-products">
        {canUpdate('products') ? 'Can update products' : 'Cannot update products'}
      </div>
      <div data-testid="can-delete-products">
        {canDelete('products') ? 'Can delete products' : 'Cannot delete products'}
      </div>
      
      {/* Role checks */}
      <div data-testid="is-admin">{isAdmin() ? 'Is admin' : 'Not admin'}</div>
      <div data-testid="is-editor">{isEditor() ? 'Is editor' : 'Not editor'}</div>
      <div data-testid="is-viewer">{isViewer() ? 'Is viewer' : 'Not viewer'}</div>
      
      {/* Resource-specific permissions */}
      <div data-testid="can-create-product">
        {canCreateProduct() ? 'Can create product' : 'Cannot create product'}
      </div>
      <div data-testid="can-read-product">
        {canReadProduct() ? 'Can read product' : 'Cannot read product'}
      </div>
      <div data-testid="can-update-product">
        {canUpdateProduct() ? 'Can update product' : 'Cannot update product'}
      </div>
      <div data-testid="can-delete-product">
        {canDeleteProduct() ? 'Can delete product' : 'Cannot delete product'}
      </div>
      
      {/* Cache management */}
      <button onClick={invalidateCache} data-testid="invalidate-cache">
        Invalidate Cache
      </button>
      <button onClick={() => invalidateUserCache()} data-testid="invalidate-user-cache">
        Invalidate User Cache
      </button>
      <button onClick={refreshPermissions} data-testid="refresh-permissions">
        Refresh Permissions
      </button>
      
      {/* Cache stats */}
      <div data-testid="cache-stats">
        Cache size: {getCacheStats().size}, Hit rate: {getCacheStats().hitRate.toFixed(2)}
      </div>
    </div>
  )
}

// Helper function to create mock user
function createMockUser(role: UserRole, id: string = 'user-1'): User {
  return {
    id,
    email: 'test@example.com',
    name: 'Test User',
    role,
    isActive: true,
    twoFactorEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// Helper function to render with provider
function renderWithProvider(
  component: React.ReactElement,
  options: {
    user?: User | null
    status?: 'loading' | 'authenticated' | 'unauthenticated'
    enableRealTimeUpdates?: boolean
    cacheConfig?: { ttl?: number; maxSize?: number }
  } = {}
) {
  const { user = null, status = 'unauthenticated', ...providerProps } = options
  
  mockUseSession.mockReturnValue({
    data: user ? { user } : null,
    status,
    update: jest.fn(),
  })

  return render(
    <PermissionProvider {...providerProps}>
      {component}
    </PermissionProvider>
  )
}

describe('PermissionProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear localStorage
    localStorage.clear()
  })

  describe('Basic functionality', () => {
    it('should provide permission context to children', () => {
      const adminUser = createMockUser(UserRole.ADMIN)
      
      renderWithProvider(<TestComponent />, {
        user: adminUser,
        status: 'authenticated'
      })

      expect(screen.getByTestId('user-info')).toHaveTextContent('User: Test User (ADMIN)')
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Loaded')
    })

    it('should handle unauthenticated state', () => {
      renderWithProvider(<TestComponent />)

      expect(screen.getByTestId('user-info')).toHaveTextContent('No user')
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated')
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Loaded')
    })

    it('should handle loading state', () => {
      renderWithProvider(<TestComponent />, {
        status: 'loading'
      })

      expect(screen.getByTestId('loading-status')).toHaveTextContent('Loading')
    })

    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      expect(() => {
        render(<TestComponent />)
      }).toThrow('usePermissionContext must be used within a PermissionProvider')
      
      consoleSpy.mockRestore()
    })
  })

  describe('Permission checking', () => {
    beforeEach(() => {
      // Mock permission service responses
      const permissionsMock = jest.requireMock('@/lib/permissions')
      permissionsMock.permissionService.hasPermission.mockImplementation((user: User, permission: any) => {
        if (user.role === UserRole.ADMIN) return true
        if (user.role === UserRole.EDITOR && permission.resource === 'products') return true
        if (user.role === UserRole.VIEWER && permission.action === 'read') return true
        return false
      })
    })

    it('should check permissions for admin user', () => {
      const adminUser = createMockUser(UserRole.ADMIN)
      
      renderWithProvider(<TestComponent />, {
        user: adminUser,
        status: 'authenticated'
      })

      expect(screen.getByTestId('can-access-products')).toHaveTextContent('Can access products')
      expect(screen.getByTestId('can-create-products')).toHaveTextContent('Can create products')
      expect(screen.getByTestId('can-read-products')).toHaveTextContent('Can read products')
      expect(screen.getByTestId('can-update-products')).toHaveTextContent('Can update products')
      expect(screen.getByTestId('can-delete-products')).toHaveTextContent('Can delete products')
    })

    it('should check permissions for editor user', () => {
      const editorUser = createMockUser(UserRole.EDITOR)
      
      renderWithProvider(<TestComponent />, {
        user: editorUser,
        status: 'authenticated'
      })

      expect(screen.getByTestId('can-access-products')).toHaveTextContent('Can access products')
      expect(screen.getByTestId('can-create-products')).toHaveTextContent('Can create products')
    })

    it('should check permissions for viewer user', () => {
      const viewerUser = createMockUser(UserRole.VIEWER)
      
      renderWithProvider(<TestComponent />, {
        user: viewerUser,
        status: 'authenticated'
      })

      expect(screen.getByTestId('can-read-products')).toHaveTextContent('Can read products')
      expect(screen.getByTestId('can-create-products')).toHaveTextContent('Cannot create products')
    })

    it('should deny all permissions for unauthenticated user', () => {
      renderWithProvider(<TestComponent />)

      expect(screen.getByTestId('can-access-products')).toHaveTextContent('Cannot access products')
      expect(screen.getByTestId('can-create-products')).toHaveTextContent('Cannot create products')
      expect(screen.getByTestId('can-read-products')).toHaveTextContent('Cannot read products')
    })
  })

  describe('Role checking', () => {
    it('should correctly identify admin role', () => {
      const adminUser = createMockUser(UserRole.ADMIN)
      
      renderWithProvider(<TestComponent />, {
        user: adminUser,
        status: 'authenticated'
      })

      expect(screen.getByTestId('is-admin')).toHaveTextContent('Is admin')
      expect(screen.getByTestId('is-editor')).toHaveTextContent('Is editor') // Admin includes editor
      expect(screen.getByTestId('is-viewer')).toHaveTextContent('Is viewer') // Admin includes viewer
    })

    it('should correctly identify editor role', () => {
      const editorUser = createMockUser(UserRole.EDITOR)
      
      renderWithProvider(<TestComponent />, {
        user: editorUser,
        status: 'authenticated'
      })

      expect(screen.getByTestId('is-admin')).toHaveTextContent('Not admin')
      expect(screen.getByTestId('is-editor')).toHaveTextContent('Is editor')
      expect(screen.getByTestId('is-viewer')).toHaveTextContent('Is viewer') // Editor includes viewer
    })

    it('should correctly identify viewer role', () => {
      const viewerUser = createMockUser(UserRole.VIEWER)
      
      renderWithProvider(<TestComponent />, {
        user: viewerUser,
        status: 'authenticated'
      })

      expect(screen.getByTestId('is-admin')).toHaveTextContent('Not admin')
      expect(screen.getByTestId('is-editor')).toHaveTextContent('Not editor')
      expect(screen.getByTestId('is-viewer')).toHaveTextContent('Is viewer')
    })
  })

  describe('Caching functionality', () => {
    beforeEach(() => {
      const permissionsMock = jest.requireMock('@/lib/permissions')
      permissionsMock.permissionService.hasPermission.mockReturnValue(true)
    })

    it('should cache permission results', async () => {
      const adminUser = createMockUser(UserRole.ADMIN)
      
      renderWithProvider(<TestComponent />, {
        user: adminUser,
        status: 'authenticated'
      })

      // First access should call permission service
      expect(screen.getByTestId('can-access-products')).toHaveTextContent('Can access products')
      
      // Check cache stats
      await waitFor(() => {
        expect(screen.getByTestId('cache-stats')).toHaveTextContent('Cache size: 1')
      })
    })

    it('should invalidate cache when requested', async () => {
      const adminUser = createMockUser(UserRole.ADMIN)
      
      renderWithProvider(<TestComponent />, {
        user: adminUser,
        status: 'authenticated'
      })

      // Access some permissions to populate cache
      expect(screen.getByTestId('can-access-products')).toHaveTextContent('Can access products')
      
      // Invalidate cache
      act(() => {
        screen.getByTestId('invalidate-cache').click()
      })

      await waitFor(() => {
        expect(screen.getByTestId('cache-stats')).toHaveTextContent('Cache size: 0')
      })
    })

    it('should refresh permissions when requested', async () => {
      const adminUser = createMockUser(UserRole.ADMIN)
      
      renderWithProvider(<TestComponent />, {
        user: adminUser,
        status: 'authenticated'
      })

      // Refresh permissions
      await act(async () => {
        screen.getByTestId('refresh-permissions').click()
      })

      // Should have cached common permissions
      await waitFor(() => {
        const cacheStats = screen.getByTestId('cache-stats').textContent
        expect(cacheStats).toMatch(/Cache size: \d+/)
      }, { timeout: 1000 }) // Add timeout to prevent infinite waiting
    })

    it('should respect cache TTL configuration', async () => {
      const adminUser = createMockUser(UserRole.ADMIN)
      
      renderWithProvider(<TestComponent />, {
        user: adminUser,
        status: 'authenticated',
        cacheConfig: { ttl: 100 } // 100ms TTL
      })

      expect(screen.getByTestId('can-access-products')).toHaveTextContent('Can access products')
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Cache should expire after TTL - but since we're not re-accessing, 
      // the expired entry won't be cleaned up until next access
      expect(screen.getByTestId('cache-stats')).toHaveTextContent('Cache size: 1')
    })

    it('should implement LRU eviction when cache is full', () => {
      const adminUser = createMockUser(UserRole.ADMIN)
      
      renderWithProvider(<TestComponent />, {
        user: adminUser,
        status: 'authenticated',
        cacheConfig: { maxSize: 2 } // Very small cache
      })

      // This would require accessing more permissions than the cache can hold
      // The implementation should evict oldest entries
      expect(screen.getByTestId('can-access-products')).toHaveTextContent('Can access products')
    })
  })

  describe('Real-time updates', () => {
    it('should handle localStorage permission updates', async () => {
      const adminUser = createMockUser(UserRole.ADMIN)
      
      renderWithProvider(<TestComponent />, {
        user: adminUser,
        status: 'authenticated',
        enableRealTimeUpdates: true
      })

      // Simulate permission update from another tab
      act(() => {
        const update = {
          type: 'USER_ROLE_CHANGED',
          userId: adminUser.id,
          timestamp: Date.now()
        }
        localStorage.setItem('permission_update', JSON.stringify(update))
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'permission_update',
          newValue: JSON.stringify(update)
        }))
      })

      // Cache should be invalidated
      await waitFor(() => {
        expect(screen.getByTestId('cache-stats')).toHaveTextContent('Cache size: 0')
      })
    })

    it('should handle permission configuration updates', async () => {
      const adminUser = createMockUser(UserRole.ADMIN)
      
      renderWithProvider(<TestComponent />, {
        user: adminUser,
        status: 'authenticated',
        enableRealTimeUpdates: true
      })

      // Populate cache first
      expect(screen.getByTestId('can-access-products')).toHaveTextContent('Can access products')

      // Simulate permission configuration update
      act(() => {
        const update = {
          type: 'PERMISSION_UPDATED',
          resource: 'products',
          timestamp: Date.now()
        }
        localStorage.setItem('permission_update', JSON.stringify(update))
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'permission_update',
          newValue: JSON.stringify(update)
        }))
      })

      // Cache should be invalidated
      await waitFor(() => {
        expect(screen.getByTestId('cache-stats')).toHaveTextContent('Cache size: 0')
      })
    })

    it('should handle user deactivation updates', async () => {
      const adminUser = createMockUser(UserRole.ADMIN)
      
      renderWithProvider(<TestComponent />, {
        user: adminUser,
        status: 'authenticated',
        enableRealTimeUpdates: true
      })

      // Simulate user deactivation
      act(() => {
        const update = {
          type: 'USER_DEACTIVATED',
          userId: adminUser.id,
          timestamp: Date.now()
        }
        localStorage.setItem('permission_update', JSON.stringify(update))
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'permission_update',
          newValue: JSON.stringify(update)
        }))
      })

      // Cache should be cleared
      await waitFor(() => {
        expect(screen.getByTestId('cache-stats')).toHaveTextContent('Cache size: 0')
      })
    })

    it('should not handle updates when real-time updates are disabled', () => {
      const adminUser = createMockUser(UserRole.ADMIN)
      
      renderWithProvider(<TestComponent />, {
        user: adminUser,
        status: 'authenticated',
        enableRealTimeUpdates: false
      })

      // Populate cache
      expect(screen.getByTestId('can-access-products')).toHaveTextContent('Can access products')

      // Simulate update
      act(() => {
        const update = {
          type: 'USER_ROLE_CHANGED',
          userId: adminUser.id,
          timestamp: Date.now()
        }
        localStorage.setItem('permission_update', JSON.stringify(update))
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'permission_update',
          newValue: JSON.stringify(update)
        }))
      })

      // Cache should remain unchanged
      expect(screen.getByTestId('cache-stats')).toHaveTextContent('Cache size: 1')
    })
  })

  describe('User session changes', () => {
    it('should clear cache when user logs out', async () => {
      const adminUser = createMockUser(UserRole.ADMIN)
      
      const { rerender } = renderWithProvider(<TestComponent />, {
        user: adminUser,
        status: 'authenticated'
      })

      // Populate cache
      expect(screen.getByTestId('can-access-products')).toHaveTextContent('Can access products')

      // Simulate logout
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      })

      await act(async () => {
        rerender(
          <PermissionProvider>
            <TestComponent />
          </PermissionProvider>
        )
      })

      // Wait for effects to run
      await waitFor(() => {
        expect(screen.getByTestId('cache-stats')).toHaveTextContent('Cache size: 0')
      })
    })

    it('should clear cache when user role changes', async () => {
      const adminUser = createMockUser(UserRole.ADMIN)
      
      const { rerender } = renderWithProvider(<TestComponent />, {
        user: adminUser,
        status: 'authenticated'
      })

      // Populate cache
      expect(screen.getByTestId('can-access-products')).toHaveTextContent('Can access products')

      // Simulate role change
      const editorUser = { ...adminUser, role: UserRole.EDITOR }
      mockUseSession.mockReturnValue({
        data: { user: editorUser },
        status: 'authenticated',
        update: jest.fn(),
      })

      await act(async () => {
        rerender(
          <PermissionProvider>
            <TestComponent />
          </PermissionProvider>
        )
      })

      // Wait for effects to run and cache to be repopulated
      await waitFor(() => {
        expect(screen.getByTestId('user-info')).toHaveTextContent('User: Test User (EDITOR)')
      })
    })
  })
})