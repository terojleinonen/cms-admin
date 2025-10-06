/**
 * Permission Hook Testing Utilities
 * Comprehensive testing utilities for permission hooks and role-based components
 */

import React from 'react'
import { UserRole } from '@prisma/client'
import { jest } from '@jest/globals'
import { User, Permission } from '../../app/lib/types'

// Mock user factory
export interface MockUserOptions {
  id?: string
  email?: string
  name?: string
  role?: UserRole
  isActive?: boolean
  emailVerified?: Date
  twoFactorEnabled?: boolean
  createdAt?: Date
  updatedAt?: Date
}

export function createMockUser(options: MockUserOptions = {}): User {
  return {
    id: options.id || 'test-user-id',
    email: options.email || 'test@example.com',
    name: options.name || 'Test User',
    role: options.role || UserRole.VIEWER,
    isActive: options.isActive ?? true,
    emailVerified: options.emailVerified || new Date(),
    twoFactorEnabled: options.twoFactorEnabled || false,
    createdAt: options.createdAt || new Date(),
    updatedAt: options.updatedAt || new Date(),
  }
}

// Mock session factory
export interface MockSessionOptions {
  user?: User
  expires?: string
}

export function createMockSession(userOptions: MockUserOptions = {}) {
  return {
    user: createMockUser(userOptions),
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }
}

// Permission test scenarios
export const PERMISSION_TEST_SCENARIOS = {
  ADMIN: {
    role: UserRole.ADMIN,
    description: 'Admin user with full system access',
    expectedPermissions: {
      canCreateProduct: true,
      canReadProduct: true,
      canUpdateProduct: true,
      canDeleteProduct: true,
      canCreateUser: true,
      canReadUser: true,
      canUpdateUser: true,
      canDeleteUser: true,
      canReadAnalytics: true,
      canManageSecurity: true,
      canManageSettings: true,
    },
  },
  EDITOR: {
    role: UserRole.EDITOR,
    description: 'Editor user with content management access',
    expectedPermissions: {
      canCreateProduct: true,
      canReadProduct: true,
      canUpdateProduct: true,
      canDeleteProduct: true,
      canCreateUser: false,
      canReadUser: false,
      canUpdateUser: false,
      canDeleteUser: false,
      canReadAnalytics: false,
      canManageSecurity: false,
      canManageSettings: false,
    },
  },
  VIEWER: {
    role: UserRole.VIEWER,
    description: 'Viewer user with read-only access',
    expectedPermissions: {
      canCreateProduct: false,
      canReadProduct: true,
      canUpdateProduct: false,
      canDeleteProduct: false,
      canCreateUser: false,
      canReadUser: false,
      canUpdateUser: false,
      canDeleteUser: false,
      canReadAnalytics: false,
      canManageSecurity: false,
      canManageSettings: false,
    },
  },
  UNAUTHENTICATED: {
    role: null,
    description: 'Unauthenticated user with no access',
    expectedPermissions: {
      canCreateProduct: false,
      canReadProduct: false,
      canUpdateProduct: false,
      canDeleteProduct: false,
      canCreateUser: false,
      canReadUser: false,
      canUpdateUser: false,
      canDeleteUser: false,
      canReadAnalytics: false,
      canManageSecurity: false,
      canManageSettings: false,
    },
  },
} as const

// Mock permission service
export class MockPermissionService {
  private permissions: Map<string, boolean> = new Map()

  setPermission(userId: string, resource: string, action: string, result: boolean, scope?: string): void {
    const key = `${userId}:${resource}:${action}:${scope || 'default'}`
    this.permissions.set(key, result)
  }

  hasPermission(user: User | null, permission: Permission): boolean {
    if (!user) return false
    
    const key = `${user.id}:${permission.resource}:${permission.action}:${permission.scope || 'default'}`
    return this.permissions.get(key) ?? this.getDefaultPermission(user.role, permission)
  }

  private getDefaultPermission(role: UserRole, permission: Permission): boolean {
    // Default permission logic based on role
    switch (role) {
      case UserRole.ADMIN:
        return true // Admin has all permissions
      case UserRole.EDITOR:
        return ['products', 'categories', 'pages', 'media', 'orders'].includes(permission.resource) &&
               ['create', 'read', 'update', 'delete', 'manage'].includes(permission.action)
      case UserRole.VIEWER:
        return permission.action === 'read' && 
               ['products', 'categories', 'pages', 'media', 'orders'].includes(permission.resource)
      default:
        return false
    }
  }

  clear(): void {
    this.permissions.clear()
  }
}

// Mock permission hook interface
export interface MockPermissionHook {
  canAccess: jest.Mock
  canManage: jest.Mock
  canCreate: jest.Mock
  canRead: jest.Mock
  canUpdate: jest.Mock
  canDelete: jest.Mock
  isAdmin: jest.Mock
  isEditor: jest.Mock
  isViewer: jest.Mock
  hasRole: jest.Mock
  hasMinimumRole: jest.Mock
  canAccessRoute: jest.Mock
  filterByPermissions: jest.Mock
  canCreateProduct: jest.Mock
  canReadProduct: jest.Mock
  canUpdateProduct: jest.Mock
  canDeleteProduct: jest.Mock
  canCreateCategory: jest.Mock
  canReadCategory: jest.Mock
  canUpdateCategory: jest.Mock
  canDeleteCategory: jest.Mock
  canCreatePage: jest.Mock
  canReadPage: jest.Mock
  canUpdatePage: jest.Mock
  canDeletePage: jest.Mock
  canCreateMedia: jest.Mock
  canReadMedia: jest.Mock
  canUpdateMedia: jest.Mock
  canDeleteMedia: jest.Mock
  canCreateUser: jest.Mock
  canReadUser: jest.Mock
  canUpdateUser: jest.Mock
  canDeleteUser: jest.Mock
  canReadOrder: jest.Mock
  canUpdateOrder: jest.Mock
  canReadAnalytics: jest.Mock
  canReadSecurityLogs: jest.Mock
  canManageSecurity: jest.Mock
  canReadSettings: jest.Mock
  canUpdateSettings: jest.Mock
  canManageSettings: jest.Mock
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

// Mock permission hook factory
export function createMockPermissionHook(user: User | null, customPermissions?: Record<string, boolean>): MockPermissionHook {
  const mockService = new MockPermissionService()
  
  // Set custom permissions if provided
  if (user && customPermissions) {
    Object.entries(customPermissions).forEach(([key, value]) => {
      const [resource, action, scope] = key.split('.')
      mockService.setPermission(user.id, resource, action, value, scope)
    })
  }

  return {
    // Basic permission checks
    canAccess: jest.fn().mockImplementation((resource: string, action: string, scope?: string) => {
      return mockService.hasPermission(user, { resource, action, scope })
    }),
    canManage: jest.fn().mockImplementation((resource: string) => {
      return mockService.hasPermission(user, { resource, action: 'manage' })
    }),
    canCreate: jest.fn().mockImplementation((resource: string) => {
      return mockService.hasPermission(user, { resource, action: 'create' })
    }),
    canRead: jest.fn().mockImplementation((resource: string, scope?: string) => {
      return mockService.hasPermission(user, { resource, action: 'read', scope })
    }),
    canUpdate: jest.fn().mockImplementation((resource: string, scope?: string) => {
      return mockService.hasPermission(user, { resource, action: 'update', scope })
    }),
    canDelete: jest.fn().mockImplementation((resource: string, scope?: string) => {
      return mockService.hasPermission(user, { resource, action: 'delete', scope })
    }),

    // Role checks
    isAdmin: jest.fn().mockReturnValue(user?.role === UserRole.ADMIN),
    isEditor: jest.fn().mockReturnValue(user?.role === UserRole.EDITOR || user?.role === UserRole.ADMIN),
    isViewer: jest.fn().mockReturnValue(!!user?.role),
    hasRole: jest.fn().mockImplementation((role: UserRole) => user?.role === role),
    hasMinimumRole: jest.fn().mockImplementation((minimumRole: UserRole) => {
      if (!user?.role) return false
      const hierarchy = { [UserRole.VIEWER]: 1, [UserRole.EDITOR]: 2, [UserRole.ADMIN]: 3 }
      return hierarchy[user.role] >= hierarchy[minimumRole]
    }),

    // Route checks
    canAccessRoute: jest.fn().mockImplementation((route: string) => {
      if (!user) return false
      if (user.role === UserRole.ADMIN) return true
      if (route.startsWith('/admin/users')) return false
      return true
    }),

    // UI helpers
    filterByPermissions: jest.fn().mockImplementation((items: any[], getResource: (item: any) => string) => {
      if (!user) return []
      return items.filter(item => {
        const resource = getResource(item)
        return mockService.hasPermission(user, { resource, action: 'read' })
      })
    }),

    // Resource-specific permissions
    canCreateProduct: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'products', action: 'create' })
    ),
    canReadProduct: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'products', action: 'read' })
    ),
    canUpdateProduct: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'products', action: 'update' })
    ),
    canDeleteProduct: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'products', action: 'delete' })
    ),

    canCreateCategory: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'categories', action: 'create' })
    ),
    canReadCategory: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'categories', action: 'read' })
    ),
    canUpdateCategory: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'categories', action: 'update' })
    ),
    canDeleteCategory: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'categories', action: 'delete' })
    ),

    canCreatePage: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'pages', action: 'create' })
    ),
    canReadPage: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'pages', action: 'read' })
    ),
    canUpdatePage: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'pages', action: 'update' })
    ),
    canDeletePage: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'pages', action: 'delete' })
    ),

    canCreateMedia: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'media', action: 'create' })
    ),
    canReadMedia: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'media', action: 'read' })
    ),
    canUpdateMedia: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'media', action: 'update' })
    ),
    canDeleteMedia: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'media', action: 'delete' })
    ),

    canCreateUser: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'users', action: 'create' })
    ),
    canReadUser: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'users', action: 'read' })
    ),
    canUpdateUser: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'users', action: 'update' })
    ),
    canDeleteUser: jest.fn().mockImplementation((targetUserId?: string) => {
      if (user?.role !== UserRole.ADMIN) return false
      if (user?.id === targetUserId) return false // Can't delete self
      return mockService.hasPermission(user, { resource: 'users', action: 'delete' })
    }),

    canReadOrder: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'orders', action: 'read' })
    ),
    canUpdateOrder: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'orders', action: 'update' })
    ),

    canReadAnalytics: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'analytics', action: 'read' })
    ),
    canReadSecurityLogs: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'security', action: 'read' })
    ),
    canManageSecurity: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'security', action: 'manage' })
    ),
    canReadSettings: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'settings', action: 'read' })
    ),
    canUpdateSettings: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'settings', action: 'update' })
    ),
    canManageSettings: jest.fn().mockImplementation(() => 
      mockService.hasPermission(user, { resource: 'settings', action: 'manage' })
    ),

    // User and session info
    user,
    isAuthenticated: !!user,
    isLoading: false,
  }
}

// Assertion helpers for permission states
export const PermissionAssertions = {
  expectCanAccess: (permissions: MockPermissionHook, resource: string, action: string, scope?: string) => {
    expect(permissions.canAccess(resource, action, scope)).toBe(true)
  },

  expectCannotAccess: (permissions: MockPermissionHook, resource: string, action: string, scope?: string) => {
    expect(permissions.canAccess(resource, action, scope)).toBe(false)
  },

  expectHasRole: (permissions: MockPermissionHook, role: UserRole) => {
    expect(permissions.hasRole(role)).toBe(true)
  },

  expectDoesNotHaveRole: (permissions: MockPermissionHook, role: UserRole) => {
    expect(permissions.hasRole(role)).toBe(false)
  },

  expectIsAdmin: (permissions: MockPermissionHook) => {
    expect(permissions.isAdmin()).toBe(true)
  },

  expectIsNotAdmin: (permissions: MockPermissionHook) => {
    expect(permissions.isAdmin()).toBe(false)
  },

  expectIsEditor: (permissions: MockPermissionHook) => {
    expect(permissions.isEditor()).toBe(true)
  },

  expectIsNotEditor: (permissions: MockPermissionHook) => {
    expect(permissions.isEditor()).toBe(false)
  },

  expectIsViewer: (permissions: MockPermissionHook) => {
    expect(permissions.isViewer()).toBe(true)
  },

  expectIsNotViewer: (permissions: MockPermissionHook) => {
    expect(permissions.isViewer()).toBe(false)
  },

  expectCanAccessRoute: (permissions: MockPermissionHook, route: string) => {
    expect(permissions.canAccessRoute(route)).toBe(true)
  },

  expectCannotAccessRoute: (permissions: MockPermissionHook, route: string) => {
    expect(permissions.canAccessRoute(route)).toBe(false)
  },

  expectIsAuthenticated: (permissions: MockPermissionHook) => {
    expect(permissions.isAuthenticated).toBe(true)
    expect(permissions.user).not.toBeNull()
  },

  expectIsNotAuthenticated: (permissions: MockPermissionHook) => {
    expect(permissions.isAuthenticated).toBe(false)
    expect(permissions.user).toBeNull()
  },

  expectIsLoading: (permissions: MockPermissionHook) => {
    expect(permissions.isLoading).toBe(true)
  },

  expectIsNotLoading: (permissions: MockPermissionHook) => {
    expect(permissions.isLoading).toBe(false)
  },

  // Resource-specific assertions
  expectCanCreateProduct: (permissions: MockPermissionHook) => {
    expect(permissions.canCreateProduct()).toBe(true)
  },

  expectCannotCreateProduct: (permissions: MockPermissionHook) => {
    expect(permissions.canCreateProduct()).toBe(false)
  },

  expectCanReadProduct: (permissions: MockPermissionHook, ownerId?: string) => {
    expect(permissions.canReadProduct(ownerId)).toBe(true)
  },

  expectCannotReadProduct: (permissions: MockPermissionHook, ownerId?: string) => {
    expect(permissions.canReadProduct(ownerId)).toBe(false)
  },

  expectCanUpdateProduct: (permissions: MockPermissionHook, ownerId?: string) => {
    expect(permissions.canUpdateProduct(ownerId)).toBe(true)
  },

  expectCannotUpdateProduct: (permissions: MockPermissionHook, ownerId?: string) => {
    expect(permissions.canUpdateProduct(ownerId)).toBe(false)
  },

  expectCanDeleteProduct: (permissions: MockPermissionHook, ownerId?: string) => {
    expect(permissions.canDeleteProduct(ownerId)).toBe(true)
  },

  expectCannotDeleteProduct: (permissions: MockPermissionHook, ownerId?: string) => {
    expect(permissions.canDeleteProduct(ownerId)).toBe(false)
  },

  // User-specific assertions
  expectCanCreateUser: (permissions: MockPermissionHook) => {
    expect(permissions.canCreateUser()).toBe(true)
  },

  expectCannotCreateUser: (permissions: MockPermissionHook) => {
    expect(permissions.canCreateUser()).toBe(false)
  },
}

// Test data generators
export const TestDataGenerators = {
  generateProducts: (count: number, ownerId?: string) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `product-${i + 1}`,
      name: `Product ${i + 1}`,
      createdBy: ownerId || 'test-user-id',
    }))
  },

  generateCategories: (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `category-${i + 1}`,
      name: `Category ${i + 1}`,
    }))
  },

  generateUsers: (count: number, role: UserRole = UserRole.VIEWER) => {
    return Array.from({ length: count }, (_, i) => 
      createMockUser({
        id: `user-${i + 1}`,
        email: `user${i + 1}@example.com`,
        name: `User ${i + 1}`,
        role,
      })
    )
  },
}

// Permission Provider Wrapper for testing
export interface PermissionProviderWrapperProps {
  user?: User | null
  children: React.ReactNode
  enableRealTimeUpdates?: boolean
  cacheConfig?: {
    ttl?: number
    maxSize?: number
  }
}

// Note: This is a placeholder interface. The actual implementation is in permission-hook-test-utils.tsx
export function createPermissionProviderWrapper(props: PermissionProviderWrapperProps) {
  // This is a factory function that returns the wrapper component
  // The actual JSX implementation is in the .tsx file
  return props
}

export default {
  createMockUser,
  createMockSession,
  createMockPermissionHook,
  PermissionAssertions,
  TestDataGenerators,
  PERMISSION_TEST_SCENARIOS,
  createPermissionProviderWrapper,
}