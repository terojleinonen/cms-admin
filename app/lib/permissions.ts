/**
 * Permission Definitions and Utilities
 * Central location for all permission-related constants and utilities
 */

import { UserRole } from '@prisma/client'

// Permission actions
export const PERMISSION_ACTIONS = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  ADMIN: 'admin'
} as const

// Permission resources
export const PERMISSION_RESOURCES = {
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  MEDIA: 'media',
  PAGES: 'pages',
  ORDERS: 'orders',
  USERS: 'users',
  SETTINGS: 'settings',
  ANALYTICS: 'analytics'
} as const

// Helper to create permission strings
export function createPermission(resource: string, action: string): string {
  return `${resource}:${action}`
}

// Common permissions
export const PERMISSIONS = {
  // Product permissions
  PRODUCTS_READ: createPermission(PERMISSION_RESOURCES.PRODUCTS, PERMISSION_ACTIONS.READ),
  PRODUCTS_WRITE: createPermission(PERMISSION_RESOURCES.PRODUCTS, PERMISSION_ACTIONS.WRITE),
  PRODUCTS_DELETE: createPermission(PERMISSION_RESOURCES.PRODUCTS, PERMISSION_ACTIONS.DELETE),

  // Category permissions
  CATEGORIES_READ: createPermission(PERMISSION_RESOURCES.CATEGORIES, PERMISSION_ACTIONS.READ),
  CATEGORIES_WRITE: createPermission(PERMISSION_RESOURCES.CATEGORIES, PERMISSION_ACTIONS.WRITE),
  CATEGORIES_DELETE: createPermission(PERMISSION_RESOURCES.CATEGORIES, PERMISSION_ACTIONS.DELETE),

  // Media permissions
  MEDIA_READ: createPermission(PERMISSION_RESOURCES.MEDIA, PERMISSION_ACTIONS.READ),
  MEDIA_WRITE: createPermission(PERMISSION_RESOURCES.MEDIA, PERMISSION_ACTIONS.WRITE),
  MEDIA_DELETE: createPermission(PERMISSION_RESOURCES.MEDIA, PERMISSION_ACTIONS.DELETE),

  // Page permissions
  PAGES_READ: createPermission(PERMISSION_RESOURCES.PAGES, PERMISSION_ACTIONS.READ),
  PAGES_WRITE: createPermission(PERMISSION_RESOURCES.PAGES, PERMISSION_ACTIONS.WRITE),
  PAGES_DELETE: createPermission(PERMISSION_RESOURCES.PAGES, PERMISSION_ACTIONS.DELETE),

  // Order permissions
  ORDERS_READ: createPermission(PERMISSION_RESOURCES.ORDERS, PERMISSION_ACTIONS.READ),
  ORDERS_WRITE: createPermission(PERMISSION_RESOURCES.ORDERS, PERMISSION_ACTIONS.WRITE),

  // User permissions
  USERS_READ: createPermission(PERMISSION_RESOURCES.USERS, PERMISSION_ACTIONS.READ),
  USERS_WRITE: createPermission(PERMISSION_RESOURCES.USERS, PERMISSION_ACTIONS.WRITE),
  USERS_DELETE: createPermission(PERMISSION_RESOURCES.USERS, PERMISSION_ACTIONS.DELETE),
  USERS_ADMIN: createPermission(PERMISSION_RESOURCES.USERS, PERMISSION_ACTIONS.ADMIN),

  // Settings permissions
  SETTINGS_READ: createPermission(PERMISSION_RESOURCES.SETTINGS, PERMISSION_ACTIONS.READ),
  SETTINGS_WRITE: createPermission(PERMISSION_RESOURCES.SETTINGS, PERMISSION_ACTIONS.WRITE),

  // Analytics permissions
  ANALYTICS_READ: createPermission(PERMISSION_RESOURCES.ANALYTICS, PERMISSION_ACTIONS.READ)
} as const

// Role-based permission matrix
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.ADMIN]: ['*'], // Admin has all permissions
  [UserRole.EDITOR]: [
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.PRODUCTS_WRITE,
    PERMISSIONS.PRODUCTS_DELETE,
    PERMISSIONS.CATEGORIES_READ,
    PERMISSIONS.CATEGORIES_WRITE,
    PERMISSIONS.CATEGORIES_DELETE,
    PERMISSIONS.MEDIA_READ,
    PERMISSIONS.MEDIA_WRITE,
    PERMISSIONS.MEDIA_DELETE,
    PERMISSIONS.PAGES_READ,
    PERMISSIONS.PAGES_WRITE,
    PERMISSIONS.PAGES_DELETE,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_WRITE
  ],
  [UserRole.VIEWER]: [
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.CATEGORIES_READ,
    PERMISSIONS.MEDIA_READ,
    PERMISSIONS.PAGES_READ,
    PERMISSIONS.ORDERS_READ
  ]
}

// Check if a role has a specific permission
export function roleHasPermission(role: UserRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] || []
  
  // Admin has all permissions
  if (permissions.includes('*')) {
    return true
  }

  // Check for exact match
  if (permissions.includes(permission)) {
    return true
  }

  // Check for wildcard match (e.g., 'products:*' matches 'products:read')
  const [resource] = permission.split(':')
  if (permissions.includes(`${resource}:*`)) {
    return true
  }

  return false
}

// Get all permissions for a role
export function getRolePermissions(role: UserRole): string[] {
  return ROLE_PERMISSIONS[role] || []
}


// Permission interface
export interface Permission {
  resource: string
  action: string
  scope?: string
}

// User interface for permissions
export interface User {
  id: string
  role: UserRole
  isActive: boolean
}

/**
 * Permission Service
 * Handles permission checking with caching
 */
export class PermissionService {
  protected cache: Map<string, boolean> = new Map()

  hasPermission(user: User | null, permission: Permission | string): boolean {
    if (!user || !user.isActive) {
      return false
    }

    const permissionString = typeof permission === 'string' 
      ? permission 
      : `${permission.resource}:${permission.action}`

    // Check cache
    const cacheKey = `${user.id}:${permissionString}`
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    // Check permission
    const result = roleHasPermission(user.role, permissionString)
    
    // Cache result
    this.cache.set(cacheKey, result)
    
    return result
  }

  hasAnyPermission(user: User | null, permissions: (Permission | string)[]): boolean {
    return permissions.some(p => this.hasPermission(user, p))
  }

  hasAllPermissions(user: User | null, permissions: (Permission | string)[]): boolean {
    return permissions.every(p => this.hasPermission(user, p))
  }

  clearCache(): void {
    this.cache.clear()
  }

  getCacheSize(): number {
    return this.cache.size
  }

  getCacheStats(): { size: number; hits: number; misses: number } {
    return {
      size: this.cache.size,
      hits: 0,
      misses: 0
    }
  }

  canUserAccessRoute(user: User | null, route: string): boolean {
    if (!user || !user.isActive) {
      return false
    }

    // Admin can access all routes
    if (user.role === UserRole.ADMIN) {
      return true
    }

    // Check route-specific permissions
    if (route.startsWith('/admin')) {
      return user.role === UserRole.ADMIN
    }

    return true
  }

  filterByPermissions(
    user: User | null,
    items: any[],
    resourceExtractor: (item: any) => string,
    action: string
  ): any[] {
    if (!user || !user.isActive) {
      return []
    }

    return items.filter(item => {
      const resource = resourceExtractor(item)
      const permission = `${resource}:${action}`
      return this.hasPermission(user, permission)
    })
  }

  warmCache(users: User[]): void {
    users.forEach(user => {
      const permissions = getRolePermissions(user.role)
      permissions.forEach(permission => {
        const cacheKey = `${user.id}:${permission}`
        this.cache.set(cacheKey, true)
      })
    })
  }

  ownsResource(user: User | null, resource: any): boolean {
    if (!user) return false
    return resource.createdBy === user.id || resource.userId === user.id
  }

  isAdmin(user: User | null): boolean {
    return user?.role === UserRole.ADMIN && user.isActive
  }

  isEditor(user: User | null): boolean {
    return user?.role === UserRole.EDITOR && user.isActive
  }

  isViewer(user: User | null): boolean {
    return user?.role === UserRole.VIEWER && user.isActive
  }

  invalidateUserCache(userId: string): void {
    const keysToDelete: string[] = []
    this.cache.forEach((_, key) => {
      if (key.startsWith(`${userId}:`)) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach(key => this.cache.delete(key))
  }
}

/**
 * Resource Permission Validator
 */
export class ResourcePermissionValidator {
  canAccessResource(user: User | null, resource: string, action: string): boolean {
    if (!user || !user.isActive) {
      return false
    }

    const permission = `${resource}:${action}`
    return roleHasPermission(user.role, permission)
  }

  getAccessibleResources(user: User | null): string[] {
    if (!user || !user.isActive) {
      return []
    }

    const permissions = getRolePermissions(user.role)
    const resources = new Set<string>()

    permissions.forEach(p => {
      if (p === '*') {
        Object.values(PERMISSION_RESOURCES).forEach(r => resources.add(r))
      } else {
        const [resource] = p.split(':')
        if (resource) {
          resources.add(resource)
        }
      }
    })

    return Array.from(resources)
  }

  canCreateProduct(user: User | null): boolean {
    return this.canAccessResource(user, PERMISSION_RESOURCES.PRODUCTS, PERMISSION_ACTIONS.WRITE)
  }

  canReadProduct(user: User | null): boolean {
    return this.canAccessResource(user, PERMISSION_RESOURCES.PRODUCTS, PERMISSION_ACTIONS.READ)
  }

  canUpdateProduct(user: User | null): boolean {
    return this.canAccessResource(user, PERMISSION_RESOURCES.PRODUCTS, PERMISSION_ACTIONS.WRITE)
  }

  canDeleteProduct(user: User | null): boolean {
    return this.canAccessResource(user, PERMISSION_RESOURCES.PRODUCTS, PERMISSION_ACTIONS.DELETE)
  }

  canCreateUser(user: User | null): boolean {
    return this.canAccessResource(user, PERMISSION_RESOURCES.USERS, PERMISSION_ACTIONS.WRITE)
  }

  canUpdateUser(user: User | null): boolean {
    return this.canAccessResource(user, PERMISSION_RESOURCES.USERS, PERMISSION_ACTIONS.WRITE)
  }

  canDeleteUser(user: User | null): boolean {
    return this.canAccessResource(user, PERMISSION_RESOURCES.USERS, PERMISSION_ACTIONS.DELETE)
  }
}

/**
 * Role Hierarchy Validator
 */
export class RoleHierarchyValidator {
  private roleHierarchy: Record<UserRole, number> = {
    [UserRole.ADMIN]: 3,
    [UserRole.EDITOR]: 2,
    [UserRole.VIEWER]: 1
  }

  isHigherRole(role1: UserRole, role2: UserRole): boolean {
    return this.roleHierarchy[role1] > this.roleHierarchy[role2]
  }

  isEqualOrHigherRole(role1: UserRole, role2: UserRole): boolean {
    return this.roleHierarchy[role1] >= this.roleHierarchy[role2]
  }

  getRoleLevel(role: UserRole): number {
    return this.roleHierarchy[role]
  }
}

// Singleton instances
export const permissionService = new PermissionService()
export const resourceValidator = new ResourcePermissionValidator()
export const roleHierarchy = new RoleHierarchyValidator()


/**
 * Enhanced Permission Service with advanced features
 */
export class EnhancedPermissionService extends PermissionService {
  private roleCache: Map<string, UserRole> = new Map()

  constructor() {
    super()
  }

  hasPermissionWithCache(user: User | null, permission: Permission | string): boolean {
    return this.hasPermission(user, permission)
  }

  invalidateUserCache(userId: string): void {
    // Clear all cache entries for this user
    const keysToDelete: string[] = []
    this.cache.forEach((_, key) => {
      if (key.startsWith(`${userId}:`)) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach(key => this.cache.delete(key))
  }
}

/**
 * Enhanced Permission Cache
 */
export class EnhancedPermissionCache {
  private cache: Map<string, any> = new Map()
  private ttl: number = 5 * 60 * 1000 // 5 minutes

  set(key: string, value: any, customTtl?: number): void {
    const expiresAt = Date.now() + (customTtl || this.ttl)
    this.cache.set(key, { value, expiresAt })
  }

  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.value
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  getStats(): { size: number; hits: number; misses: number; hitRate: number } {
    return {
      size: this.cache.size,
      hits: 0,
      misses: 0,
      hitRate: 0
    }
  }
}

/**
 * Permission Cache Warmer
 */
export class PermissionCacheWarmer {
  private cache: EnhancedPermissionCache

  constructor(cache?: EnhancedPermissionCache) {
    this.cache = cache || new EnhancedPermissionCache()
  }

  async warmCache(users: User[]): Promise<void> {
    users.forEach(user => {
      const permissions = getRolePermissions(user.role)
      this.cache.set(`user:${user.id}:permissions`, permissions)
    })
  }

  getCache(): EnhancedPermissionCache {
    return this.cache
  }
}


/**
 * Cache Invalidation Service
 */
export class CacheInvalidationService {
  private cache: EnhancedPermissionCache

  constructor(cache?: EnhancedPermissionCache) {
    this.cache = cache || new EnhancedPermissionCache()
  }

  invalidateUser(userId: string): void {
    this.cache.delete(`user:${userId}:permissions`)
  }

  invalidateRole(role: UserRole): void {
    this.cache.delete(`role:${role}:permissions`)
  }

  invalidateAll(): void {
    this.cache.clear()
  }

  invalidatePattern(pattern: string): void {
    // Simple pattern matching - in production would use more sophisticated matching
    this.cache.clear()
  }
}
