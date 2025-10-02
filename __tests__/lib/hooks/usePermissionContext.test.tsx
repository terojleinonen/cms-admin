/**
 * Enhanced Permission Context Hook Tests
 * Tests for the enhanced permission context hook with additional utilities
 */

import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { PermissionProvider } from '@/components/providers/PermissionProvider'
import { 
  usePermissionContext, 
  usePermissionGuard, 
  useResourceOwnership,
  useBatchPermissions 
} from '@/lib/hooks/usePermissionContext'
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

// Mock permission events
jest.mock('@/lib/permission-events', () => ({
  usePermissionUpdates: jest.fn(() => ({
    subscribe: jest.fn(() => jest.fn()),
    broadcast: jest.fn(),
  })),
  PermissionEventBroadcaster: {
    getInstance: jest.fn(() => ({
      subscribe: jest.fn(() => jest.fn()),
      broadcast: jest.fn(),
    })),
  },
}))

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

// Helper function to create wrapper with provider
function createWrapper(user: User | null = null, status: string = 'unauthenticated') {
  mockUseSession.mockReturnValue({
    data: user ? { user } : null,
    status: status as any,
    update: jest.fn(),
  })

  return ({ children }: { children: React.ReactNode }) => (
    <PermissionProvider>{children}</PermissionProvider>
  )
}

describe('usePermissionContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock permission service responses
    const { permissionService } = require('@/lib/permissions')
    permissionService.hasPermission.mockImplementation((user: User, permission: any) => {
      if (user.role === UserRole.ADMIN) return true
      if (user.role === UserRole.EDITOR && permission.resource === 'products') return true
      if (user.role === UserRole.VIEWER && permission.action === 'read') return true
      return false
    })
  })

  describe('Enhanced permission checking', () => {
    it('should provide checkPermission method', () => {
      const adminUser = createMockUser(UserRole.ADMIN)
      const wrapper = createWrapper(adminUser, 'authenticated')
      
      const { result } = renderHook(() => usePermissionContext(), { wrapper })
      
      expect(result.current.checkPermission('products', 'read')).toBe(true)
      expect(result.current.checkPermission('products', 'create')).toBe(true)
    })

    it('should check multiple permissions at once', () => {
      const adminUser = createMockUser(UserRole.ADMIN)
      const wrapper = createWrapper(adminUser, 'authenticated')
      
      const { result } = renderHook(() => usePermissionContext(), { wrapper })
      
      const permissions = [
        { resource: 'products', action: 'read' },
        { resource: 'products', action: 'create' },
        { resource: 'categories', action: 'read' },
      ]
      
      const results = result.current.checkMultiplePermissions(permissions)
      expect(results).toEqual([true, true, true])
    })

    it('should check if user has any of the specified permissions', () => {
      const viewerUser = createMockUser(UserRole.VIEWER)
      const wrapper = createWrapper(viewerUser, 'authenticated')
      
      const { result } = renderHook(() => usePermissionContext(), { wrapper })
      
      const permissions = [
        { resource: 'products', action: 'read' },
        { resource: 'products', action: 'create' },
      ]
      
      expect(result.current.hasAnyPermission(permissions)).toBe(true) // Has read permission
    })

    it('should check if user has all of the specified permissions', () => {
      const viewerUser = createMockUser(UserRole.VIEWER)
      const wrapper = createWrapper(viewerUser, 'authenticated')
      
      const { result } = renderHook(() => usePermissionContext(), { wrapper })
      
      const permissions = [
        { resource: 'products', action: 'read' },
        { resource: 'products', action: 'create' },
      ]
      
      expect(result.current.hasAllPermissions(permissions)).toBe(false) // Doesn't have create permission
    })

    it('should check resource ownership permissions', () => {
      const editorUser = createMockUser(UserRole.EDITOR)
      const wrapper = createWrapper(editorUser, 'authenticated')
      
      const { result } = renderHook(() => usePermissionContext(), { wrapper })
      
      // Should have global access to products
      expect(result.current.canAccessOwnResource('products', 'read')).toBe(true)
      
      // Should have access to own resource
      expect(result.current.canAccessOwnResource('products', 'read', editorUser.id)).toBe(true)
      
      // Should not have access to other user's resource for restricted actions
      expect(result.current.canAccessOwnResource('users', 'delete', 'other-user')).toBe(false)
    })
  })

  describe('Data filtering utilities', () => {
    it('should filter data by permissions', () => {
      const editorUser = createMockUser(UserRole.EDITOR)
      const wrapper = createWrapper(editorUser, 'authenticated')
      
      const { result } = renderHook(() => usePermissionContext(), { wrapper })
      
      const testData = [
        { id: '1', createdBy: editorUser.id, name: 'Own Product' },
        { id: '2', createdBy: 'other-user', name: 'Other Product' },
        { id: '3', createdBy: editorUser.id, name: 'Another Own Product' },
      ]
      
      const filtered = result.current.filterDataByPermissions(testData, 'products', 'read')
      
      // Should return all items since editor has global read access to products
      expect(filtered).toHaveLength(3)
    })

    it('should get resource permissions summary', () => {
      const editorUser = createMockUser(UserRole.EDITOR)
      const wrapper = createWrapper(editorUser, 'authenticated')
      
      const { result } = renderHook(() => usePermissionContext(), { wrapper })
      
      const permissions = result.current.getResourcePermissions('products')
      
      expect(permissions).toEqual({
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
        canManage: true,
        scope: 'all'
      })
    })

    it('should handle viewer permissions correctly', () => {
      const viewerUser = createMockUser(UserRole.VIEWER)
      const wrapper = createWrapper(viewerUser, 'authenticated')
      
      const { result } = renderHook(() => usePermissionContext(), { wrapper })
      
      const permissions = result.current.getResourcePermissions('products')
      
      expect(permissions.canRead).toBe(true)
      expect(permissions.canCreate).toBe(false)
      expect(permissions.canUpdate).toBe(false)
      expect(permissions.canDelete).toBe(false)
      expect(permissions.scope).toBe('own') // Viewer only has read access
    })
  })

  describe('Cache management with broadcasting', () => {
    it('should broadcast cache invalidation', () => {
      const adminUser = createMockUser(UserRole.ADMIN)
      const wrapper = createWrapper(adminUser, 'authenticated')
      
      const { usePermissionUpdates } = require('@/lib/permission-events')
      const mockBroadcast = jest.fn()
      usePermissionUpdates.mockReturnValue({
        subscribe: jest.fn(() => jest.fn()),
        broadcast: mockBroadcast,
      })
      
      const { result } = renderHook(() => usePermissionContext(), { wrapper })
      
      act(() => {
        result.current.invalidateCache()
      })
      
      expect(mockBroadcast).toHaveBeenCalledWith({
        type: 'CACHE_INVALIDATED',
        timestamp: expect.any(Number)
      })
    })

    it('should broadcast user cache invalidation', () => {
      const adminUser = createMockUser(UserRole.ADMIN)
      const wrapper = createWrapper(adminUser, 'authenticated')
      
      const { usePermissionUpdates } = require('@/lib/permission-events')
      const mockBroadcast = jest.fn()
      usePermissionUpdates.mockReturnValue({
        subscribe: jest.fn(() => jest.fn()),
        broadcast: mockBroadcast,
      })
      
      const { result } = renderHook(() => usePermissionContext(), { wrapper })
      
      act(() => {
        result.current.invalidateUserCache('user-123')
      })
      
      expect(mockBroadcast).toHaveBeenCalledWith({
        type: 'CACHE_INVALIDATED',
        userId: 'user-123',
        timestamp: expect.any(Number)
      })
    })

    it('should handle permission update subscriptions', () => {
      const adminUser = createMockUser(UserRole.ADMIN)
      const wrapper = createWrapper(adminUser, 'authenticated')
      
      const { usePermissionUpdates } = require('@/lib/permission-events')
      const mockSubscribe = jest.fn(() => jest.fn())
      usePermissionUpdates.mockReturnValue({
        subscribe: mockSubscribe,
        broadcast: jest.fn(),
      })
      
      const { result } = renderHook(() => usePermissionContext(), { wrapper })
      
      const callback = jest.fn()
      act(() => {
        result.current.subscribeToUpdates(callback)
      })
      
      expect(mockSubscribe).toHaveBeenCalled()
    })
  })
})

describe('usePermissionGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    const { permissionService } = require('@/lib/permissions')
    permissionService.hasPermission.mockImplementation((user: User, permission: any) => {
      if (user.role === UserRole.ADMIN) return true
      if (user.role === UserRole.EDITOR && permission.resource === 'products') return true
      return false
    })
  })

  it('should return permission status for resource', () => {
    const editorUser = createMockUser(UserRole.EDITOR)
    const wrapper = createWrapper(editorUser, 'authenticated')
    
    const { result } = renderHook(
      () => usePermissionGuard('products', 'read'),
      { wrapper }
    )
    
    expect(result.current.canAccess).toBe(true)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.user).toEqual(editorUser)
  })

  it('should deny access for insufficient permissions', () => {
    const viewerUser = createMockUser(UserRole.VIEWER)
    const wrapper = createWrapper(viewerUser, 'authenticated')
    
    const { result } = renderHook(
      () => usePermissionGuard('products', 'create'),
      { wrapper }
    )
    
    expect(result.current.canAccess).toBe(false)
  })

  it('should handle loading state', () => {
    const wrapper = createWrapper(null, 'loading')
    
    const { result } = renderHook(
      () => usePermissionGuard('products', 'read'),
      { wrapper }
    )
    
    expect(result.current.isLoading).toBe(true)
    expect(result.current.canAccess).toBe(false)
  })
})

describe('useResourceOwnership', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    const { permissionService } = require('@/lib/permissions')
    permissionService.hasPermission.mockImplementation((user: User, permission: any) => {
      if (user.role === UserRole.ADMIN) return true
      if (user.role === UserRole.EDITOR && permission.resource === 'products') return true
      if (permission.scope === 'own' && permission.action === 'read') return true
      return false
    })
  })

  it('should identify resource ownership', () => {
    const editorUser = createMockUser(UserRole.EDITOR)
    const wrapper = createWrapper(editorUser, 'authenticated')
    
    const resource = {
      id: 'product-1',
      createdBy: editorUser.id,
      name: 'Test Product'
    }
    
    const { result } = renderHook(
      () => useResourceOwnership(resource, 'products'),
      { wrapper }
    )
    
    expect(result.current.isOwner).toBe(true)
    expect(result.current.canRead).toBe(true)
    expect(result.current.canUpdate).toBe(true)
    expect(result.current.canDelete).toBe(true)
  })

  it('should handle non-owned resources', () => {
    const editorUser = createMockUser(UserRole.EDITOR)
    const wrapper = createWrapper(editorUser, 'authenticated')
    
    const resource = {
      id: 'product-1',
      createdBy: 'other-user',
      name: 'Test Product'
    }
    
    const { result } = renderHook(
      () => useResourceOwnership(resource, 'products'),
      { wrapper }
    )
    
    expect(result.current.isOwner).toBe(false)
    // Editor should still have access to all products
    expect(result.current.canRead).toBe(true)
    expect(result.current.canUpdate).toBe(true)
  })

  it('should handle null resource', () => {
    const editorUser = createMockUser(UserRole.EDITOR)
    const wrapper = createWrapper(editorUser, 'authenticated')
    
    const { result } = renderHook(
      () => useResourceOwnership(null, 'products'),
      { wrapper }
    )
    
    expect(result.current.isOwner).toBe(false)
    expect(result.current.canRead).toBe(false)
    expect(result.current.canUpdate).toBe(false)
    expect(result.current.canDelete).toBe(false)
  })
})

describe('useBatchPermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    const { permissionService } = require('@/lib/permissions')
    permissionService.hasPermission.mockImplementation((user: User, permission: any) => {
      if (user.role === UserRole.ADMIN) return true
      if (user.role === UserRole.EDITOR && permission.resource === 'products') return true
      if (user.role === UserRole.VIEWER && permission.action === 'read') return true
      return false
    })
  })

  it('should check multiple permissions efficiently', () => {
    const editorUser = createMockUser(UserRole.EDITOR)
    const wrapper = createWrapper(editorUser, 'authenticated')
    
    const permissions = [
      { resource: 'products', action: 'read' },
      { resource: 'products', action: 'create' },
      { resource: 'users', action: 'read' },
      { resource: 'users', action: 'create' },
    ]
    
    const { result } = renderHook(
      () => useBatchPermissions(permissions),
      { wrapper }
    )
    
    expect(result.current.results).toEqual([true, true, false, false])
    expect(result.current.hasAny).toBe(true)
    expect(result.current.hasAll).toBe(false)
    expect(result.current.isLoading).toBe(false)
  })

  it('should handle admin user with all permissions', () => {
    const adminUser = createMockUser(UserRole.ADMIN)
    const wrapper = createWrapper(adminUser, 'authenticated')
    
    const permissions = [
      { resource: 'products', action: 'read' },
      { resource: 'products', action: 'create' },
      { resource: 'users', action: 'read' },
      { resource: 'users', action: 'create' },
    ]
    
    const { result } = renderHook(
      () => useBatchPermissions(permissions),
      { wrapper }
    )
    
    expect(result.current.results).toEqual([true, true, true, true])
    expect(result.current.hasAny).toBe(true)
    expect(result.current.hasAll).toBe(true)
  })

  it('should handle viewer user with limited permissions', () => {
    const viewerUser = createMockUser(UserRole.VIEWER)
    const wrapper = createWrapper(viewerUser, 'authenticated')
    
    const permissions = [
      { resource: 'products', action: 'read' },
      { resource: 'products', action: 'create' },
      { resource: 'users', action: 'read' },
    ]
    
    const { result } = renderHook(
      () => useBatchPermissions(permissions),
      { wrapper }
    )
    
    expect(result.current.results).toEqual([true, false, true])
    expect(result.current.hasAny).toBe(true)
    expect(result.current.hasAll).toBe(false)
  })

  it('should handle empty permissions array', () => {
    const adminUser = createMockUser(UserRole.ADMIN)
    const wrapper = createWrapper(adminUser, 'authenticated')
    
    const { result } = renderHook(
      () => useBatchPermissions([]),
      { wrapper }
    )
    
    expect(result.current.results).toEqual([])
    expect(result.current.hasAny).toBe(false)
    expect(result.current.hasAll).toBe(true) // Vacuous truth
  })
})