/**
 * Comprehensive Permission Service for Production-Ready RBAC System
 * Implements resource-action-scope model with caching and audit logging
 */

import { UserRole } from '@prisma/client';
import { User } from './types';

// Permission model interfaces
export interface Permission {
  resource: string;    // 'products', 'users', 'analytics', etc.
  action: string;      // 'create', 'read', 'update', 'delete', 'manage'
  scope?: string;      // 'own', 'all', 'team'
}

export interface RolePermission {
  role: UserRole;
  permissions: Permission[];
}

// Cache interface
interface PermissionCacheEntry {
  userId: string;
  resource: string;
  action: string;
  scope?: string;
  result: boolean;
  expiresAt: Date;
  createdAt: Date;
}

// Basic Permission cache implementation
class PermissionCache {
  private cache = new Map<string, PermissionCacheEntry>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  private getCacheKey(userId: string, resource: string, action: string, scope?: string): string {
    return `${userId}:${resource}:${action}:${scope || 'default'}`;
  }

  get(userId: string, resource: string, action: string, scope?: string): boolean | null {
    const key = this.getCacheKey(userId, resource, action, scope);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.result;
  }

  set(userId: string, resource: string, action: string, result: boolean, scope?: string): void {
    const key = this.getCacheKey(userId, resource, action, scope);
    const entry: PermissionCacheEntry = {
      userId,
      resource,
      action,
      scope,
      result,
      expiresAt: new Date(Date.now() + this.TTL),
      createdAt: new Date()
    };
    
    this.cache.set(key, entry);
  }

  invalidateUser(userId: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.userId === userId) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; ttl: number } {
    return {
      size: this.cache.size,
      ttl: this.TTL
    };
  }
}

// Enhanced Permission Cache with Redis support for production
export interface CacheConfig {
  ttl?: number;
  redisUrl?: string;
  enableDistributed?: boolean;
}

export class EnhancedPermissionCache {
  private memoryCache = new Map<string, PermissionCacheEntry>();
  private readonly TTL: number;
  private readonly enableDistributed: boolean;
  private redisClient: any = null;

  constructor(config: CacheConfig = {}) {
    this.TTL = config.ttl || 5 * 60 * 1000; // 5 minutes default
    this.enableDistributed = config.enableDistributed || false;
    
    if (this.enableDistributed && config.redisUrl) {
      this.initializeRedis(config.redisUrl);
    }
  }

  private async initializeRedis(redisUrl: string): Promise<void> {
    try {
      // Dynamic import for Redis to avoid bundling in development
      const { createClient } = await import('redis');
      this.redisClient = createClient({ url: redisUrl });
      await this.redisClient.connect();
      console.log('Redis cache connected successfully');
    } catch (error) {
      console.warn('Failed to connect to Redis, falling back to memory cache:', error);
      this.redisClient = null;
    }
  }

  private getCacheKey(userId: string, resource: string, action: string, scope?: string): string {
    return `perm:${userId}:${resource}:${action}:${scope || 'default'}`;
  }

  async get(userId: string, resource: string, action: string, scope?: string): Promise<boolean | null> {
    const key = this.getCacheKey(userId, resource, action, scope);
    
    // Try memory cache first (fastest)
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      if (memoryEntry.expiresAt > new Date()) {
        return memoryEntry.result;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // Try Redis cache if available
    if (this.redisClient) {
      try {
        const redisValue = await this.redisClient.get(key);
        if (redisValue !== null) {
          const result = JSON.parse(redisValue);
          // Store in memory cache for faster subsequent access
          this.setMemoryCache(key, userId, resource, action, result, scope);
          return result;
        }
      } catch (error) {
        console.warn('Redis cache read error:', error);
      }
    }

    return null;
  }

  async set(userId: string, resource: string, action: string, result: boolean, scope?: string): Promise<void> {
    const key = this.getCacheKey(userId, resource, action, scope);
    
    // Always set in memory cache
    this.setMemoryCache(key, userId, resource, action, result, scope);

    // Set in Redis if available
    if (this.redisClient) {
      try {
        await this.redisClient.setEx(key, Math.floor(this.TTL / 1000), JSON.stringify(result));
      } catch (error) {
        console.warn('Redis cache write error:', error);
      }
    }
  }

  private setMemoryCache(key: string, userId: string, resource: string, action: string, result: boolean, scope?: string): void {
    const entry: PermissionCacheEntry = {
      userId,
      resource,
      action,
      scope,
      result,
      expiresAt: new Date(Date.now() + this.TTL),
      createdAt: new Date()
    };
    
    this.memoryCache.set(key, entry);
  }

  async invalidateUser(userId: string): Promise<void> {
    // Invalidate memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.userId === userId) {
        this.memoryCache.delete(key);
      }
    }

    // Invalidate Redis cache if available
    if (this.redisClient) {
      try {
        const pattern = `perm:${userId}:*`;
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      } catch (error) {
        console.warn('Redis cache invalidation error:', error);
      }
    }
  }

  async invalidateResource(resource: string): Promise<void> {
    // Invalidate memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.resource === resource) {
        this.memoryCache.delete(key);
      }
    }

    // Invalidate Redis cache if available
    if (this.redisClient) {
      try {
        const pattern = `perm:*:${resource}:*`;
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      } catch (error) {
        console.warn('Redis cache invalidation error:', error);
      }
    }
  }

  async clear(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();

    // Clear Redis cache if available
    if (this.redisClient) {
      try {
        const keys = await this.redisClient.keys('perm:*');
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      } catch (error) {
        console.warn('Redis cache clear error:', error);
      }
    }
  }

  // Cache statistics for monitoring
  getStats(): { memorySize: number; ttl: number; distributed: boolean } {
    return {
      memorySize: this.memoryCache.size,
      ttl: this.TTL,
      distributed: !!this.redisClient
    };
  }

  // Warm cache with common permissions
  async warmCache(users: User[], commonPermissions: Permission[], permissionService: PermissionService): Promise<void> {
    console.log('Warming permission cache...');
    
    for (const user of users) {
      for (const permission of commonPermissions) {
        // This will compute and cache the permission
        const result = permissionService.hasPermission(user, permission);
        await this.set(user.id, permission.resource, permission.action, result, permission.scope);
      }
    }
    
    console.log(`Cache warmed with ${users.length} users and ${commonPermissions.length} permissions`);
  }
}

// Role-based permission definitions
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    // Full system access
    { resource: '*', action: 'manage', scope: 'all' },
    // User management
    { resource: 'users', action: 'create', scope: 'all' },
    { resource: 'users', action: 'read', scope: 'all' },
    { resource: 'users', action: 'update', scope: 'all' },
    { resource: 'users', action: 'delete', scope: 'all' },
    { resource: 'users', action: 'manage', scope: 'all' },
    // System settings
    { resource: 'settings', action: 'manage', scope: 'all' },
    { resource: 'security', action: 'manage', scope: 'all' },
    { resource: 'audit', action: 'read', scope: 'all' },
    { resource: 'monitoring', action: 'read', scope: 'all' },
  ],
  
  EDITOR: [
    // Content management
    { resource: 'products', action: 'create', scope: 'all' },
    { resource: 'products', action: 'read', scope: 'all' },
    { resource: 'products', action: 'update', scope: 'all' },
    { resource: 'products', action: 'delete', scope: 'all' },
    { resource: 'products', action: 'manage', scope: 'all' },
    
    { resource: 'categories', action: 'create', scope: 'all' },
    { resource: 'categories', action: 'read', scope: 'all' },
    { resource: 'categories', action: 'update', scope: 'all' },
    { resource: 'categories', action: 'delete', scope: 'all' },
    { resource: 'categories', action: 'manage', scope: 'all' },
    
    { resource: 'pages', action: 'create', scope: 'all' },
    { resource: 'pages', action: 'read', scope: 'all' },
    { resource: 'pages', action: 'update', scope: 'all' },
    { resource: 'pages', action: 'delete', scope: 'all' },
    { resource: 'pages', action: 'manage', scope: 'all' },
    
    { resource: 'media', action: 'create', scope: 'all' },
    { resource: 'media', action: 'read', scope: 'all' },
    { resource: 'media', action: 'update', scope: 'all' },
    { resource: 'media', action: 'delete', scope: 'all' },
    { resource: 'media', action: 'manage', scope: 'all' },
    
    // Read-only access to orders
    { resource: 'orders', action: 'read', scope: 'all' },
    
    // Own profile management
    { resource: 'profile', action: 'manage', scope: 'own' },
  ],
  
  VIEWER: [
    // Read-only access
    { resource: 'products', action: 'read', scope: 'all' },
    { resource: 'categories', action: 'read', scope: 'all' },
    { resource: 'pages', action: 'read', scope: 'all' },
    { resource: 'media', action: 'read', scope: 'all' },
    { resource: 'orders', action: 'read', scope: 'all' },
    
    // Own profile management
    { resource: 'profile', action: 'manage', scope: 'own' },
  ]
};

// Route to permission mapping
const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  // Admin routes
  '/admin': [{ resource: 'admin', action: 'read', scope: 'all' }],
  '/admin/users': [{ resource: 'users', action: 'read', scope: 'all' }],
  '/admin/users/new': [{ resource: 'users', action: 'create', scope: 'all' }],
  '/admin/security': [{ resource: 'security', action: 'read', scope: 'all' }],
  '/admin/analytics': [{ resource: 'analytics', action: 'read', scope: 'all' }],
  '/admin/monitoring': [{ resource: 'monitoring', action: 'read', scope: 'all' }],
  
  // Product management
  '/admin/products': [{ resource: 'products', action: 'read', scope: 'all' }],
  '/admin/products/new': [{ resource: 'products', action: 'create', scope: 'all' }],
  '/admin/products/[id]/edit': [{ resource: 'products', action: 'update', scope: 'all' }],
  
  // Category management
  '/admin/categories': [{ resource: 'categories', action: 'read', scope: 'all' }],
  
  // Page management
  '/admin/pages': [{ resource: 'pages', action: 'read', scope: 'all' }],
  '/admin/pages/new': [{ resource: 'pages', action: 'create', scope: 'all' }],
  '/admin/pages/[id]/edit': [{ resource: 'pages', action: 'update', scope: 'all' }],
  
  // Media management
  '/media': [{ resource: 'media', action: 'read', scope: 'all' }],
  
  // Profile
  '/profile': [{ resource: 'profile', action: 'read', scope: 'own' }],
  '/settings': [{ resource: 'profile', action: 'update', scope: 'own' }],
};

/**
 * Comprehensive Permission Service
 * Central service for all permission operations with caching and validation
 */
export class PermissionService {
  private cache = new PermissionCache();
  
  /**
   * Check if user has specific permission
   */
  hasPermission(user: User | null, permission: Permission): boolean {
    if (!user || !user.role) return false;
    
    // Check cache first
    const cached = this.cache.get(user.id, permission.resource, permission.action, permission.scope);
    if (cached !== null) return cached;
    
    const result = this.validatePermission(user, permission);
    
    // Cache the result
    this.cache.set(user.id, permission.resource, permission.action, result, permission.scope);
    
    return result;
  }

  /**
   * Check if user has access to specific resource and action
   */
  hasResourceAccess(user: User | null, resource: string, action: string, scope?: string): boolean {
    return this.hasPermission(user, { resource, action, scope });
  }

  /**
   * Get all permissions for a role
   */
  getRolePermissions(role: UserRole): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Check if user can access a specific route
   */
  canUserAccessRoute(user: User | null, route: string): boolean {
    if (!user) return false;
    
    const requiredPermissions = this.getRoutePermissions(route);
    if (!requiredPermissions.length) return true; // No specific permissions required
    
    return requiredPermissions.some(permission => this.hasPermission(user, permission));
  }

  /**
   * Get required permissions for a route
   */
  getRoutePermissions(route: string): Permission[] {
    // Direct match
    if (ROUTE_PERMISSIONS[route]) {
      return ROUTE_PERMISSIONS[route];
    }
    
    // Pattern matching for dynamic routes
    for (const [pattern, permissions] of Object.entries(ROUTE_PERMISSIONS)) {
      if (this.matchRoute(pattern, route)) {
        return permissions;
      }
    }
    
    return [];
  }

  /**
   * Invalidate user's permission cache
   */
  invalidateUserCache(userId: string): void {
    this.cache.invalidateUser(userId);
  }

  /**
   * Clear all permission cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Check if user is admin
   */
  isAdmin(user: User | null): boolean {
    return user?.role === UserRole.ADMIN;
  }

  /**
   * Check if user is editor or higher
   */
  isEditor(user: User | null): boolean {
    return user?.role === UserRole.ADMIN || user?.role === UserRole.EDITOR;
  }

  /**
   * Check if user is viewer or higher
   */
  isViewer(user: User | null): boolean {
    return user?.role === UserRole.ADMIN || user?.role === UserRole.EDITOR || user?.role === UserRole.VIEWER;
  }

  /**
   * Filter array of items based on user's read permissions
   */
  filterByPermissions<T>(
    user: User | null,
    items: T[],
    getResource: (item: T) => string,
    action: string = 'read'
  ): T[] {
    if (!user) return [];
    
    return items.filter(item => {
      const resource = getResource(item);
      return this.hasResourceAccess(user, resource, action);
    });
  }

  /**
   * Check if user owns a resource (for scope-based permissions)
   */
  ownsResource(user: User | null, resourceOwnerId: string): boolean {
    return user?.id === resourceOwnerId;
  }

  // Private methods

  private validatePermission(user: User, permission: Permission): boolean {
    const userPermissions = this.getRolePermissions(user.role);
    
    return userPermissions.some(userPerm => {
      // Check for wildcard permissions (admin)
      if (userPerm.resource === '*' && userPerm.action === 'manage') {
        return true;
      }
      
      // Check resource match
      if (userPerm.resource !== permission.resource) {
        return false;
      }
      
      // Check action match (manage includes all actions)
      if (userPerm.action === 'manage' || userPerm.action === permission.action) {
        // Check scope match
        return this.validateScope(user, userPerm.scope, permission.scope);
      }
      
      return false;
    });
  }

  private validateScope(user: User, userScope?: string, requiredScope?: string): boolean {
    // If no scope specified in requirement, allow if user has permission (any scope)
    if (!requiredScope) {
      return true;
    }
    
    // If user has 'all' scope, allow access to any scope
    if (userScope === 'all') return true;
    
    // If user has 'own' scope, only allow 'own' access
    if (userScope === 'own' && requiredScope === 'own') return true;
    
    // Default to matching scopes
    return userScope === requiredScope;
  }

  private matchRoute(pattern: string, route: string): boolean {
    // Convert Next.js dynamic route pattern to regex
    const regexPattern = pattern
      .replace(/\[([^\]]+)\]/g, '([^/]+)') // [id] -> ([^/]+)
      .replace(/\//g, '\\/'); // Escape forward slashes
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(route);
  }
}

/**
 * Enhanced Permission Service with advanced caching
 */
export class EnhancedPermissionService extends PermissionService {
  private enhancedCache: EnhancedPermissionCache;
  private useDatabase: boolean;

  constructor(cacheConfig?: CacheConfig & { useDatabase?: boolean }) {
    super();
    this.enhancedCache = new EnhancedPermissionCache(cacheConfig);
    this.useDatabase = cacheConfig?.useDatabase || false;
  }

  async hasPermission(user: User | null, permission: Permission): Promise<boolean> {
    if (!user || !user.role) return false;
    
    let cached: boolean | null = null;
    
    if (this.useDatabase) {
      // Use database cache for production
      const { PermissionCacheDB } = await import('./permission-db');
      cached = await PermissionCacheDB.get(user.id, permission.resource, permission.action, permission.scope);
    } else {
      // Use in-memory cache for development/testing
      cached = await this.enhancedCache.get(user.id, permission.resource, permission.action, permission.scope);
    }
    
    if (cached !== null) return cached;
    
    const result = this.validatePermission(user, permission);
    
    // Cache the result
    if (this.useDatabase) {
      const { PermissionCacheDB } = await import('./permission-db');
      await PermissionCacheDB.set(user.id, permission.resource, permission.action, result, 5 * 60 * 1000, permission.scope);
    } else {
      await this.enhancedCache.set(user.id, permission.resource, permission.action, result, permission.scope);
    }
    
    return result;
  }

  async invalidateUserCache(userId: string): Promise<void> {
    if (this.useDatabase) {
      const { PermissionCacheDB } = await import('./permission-db');
      await PermissionCacheDB.invalidateUser(userId);
    } else {
      await this.enhancedCache.invalidateUser(userId);
    }
  }

  async invalidateResourceCache(resource: string): Promise<void> {
    if (this.useDatabase) {
      const { PermissionCacheDB } = await import('./permission-db');
      await PermissionCacheDB.invalidateResource(resource);
    } else {
      await this.enhancedCache.invalidateResource(resource);
    }
  }

  async clearCache(): Promise<void> {
    if (this.useDatabase) {
      const { PermissionCacheDB } = await import('./permission-db');
      await PermissionCacheDB.clearExpired();
    } else {
      await this.enhancedCache.clear();
    }
  }

  getCacheStats() {
    return this.enhancedCache.getStats();
  }

  async warmCache(users: User[], commonPermissions: Permission[]): Promise<void> {
    await this.enhancedCache.warmCache(users, commonPermissions, this);
  }
}

/**
 * Cache invalidation utilities
 */
export class CacheInvalidationService {
  constructor(private permissionService: EnhancedPermissionService) {}

  /**
   * Invalidate cache when user role changes
   */
  async onUserRoleChange(userId: string, oldRole: UserRole, newRole: UserRole): Promise<void> {
    console.log(`User ${userId} role changed from ${oldRole} to ${newRole}, invalidating cache`);
    await this.permissionService.invalidateUserCache(userId);
  }

  /**
   * Invalidate cache when permissions are updated
   */
  async onPermissionUpdate(resource: string): Promise<void> {
    console.log(`Permissions updated for resource ${resource}, invalidating cache`);
    await this.permissionService.invalidateResourceCache(resource);
  }

  /**
   * Invalidate cache when user is deactivated
   */
  async onUserDeactivation(userId: string): Promise<void> {
    console.log(`User ${userId} deactivated, invalidating cache`);
    await this.permissionService.invalidateUserCache(userId);
  }

  /**
   * Scheduled cache cleanup for expired entries
   */
  async cleanupExpiredEntries(): Promise<void> {
    // This would be called by a scheduled job
    console.log('Cleaning up expired cache entries');
    // The TTL mechanism in Redis and memory cache handles this automatically
  }
}

// Singleton instance (basic)
export const permissionService = new PermissionService();

// Production-ready singleton with enhanced caching
export const enhancedPermissionService = new EnhancedPermissionService({
  ttl: process.env.PERMISSION_CACHE_TTL ? parseInt(process.env.PERMISSION_CACHE_TTL) : 5 * 60 * 1000,
  redisUrl: process.env.REDIS_URL,
  enableDistributed: process.env.NODE_ENV === 'production'
});

export const cacheInvalidationService = new CacheInvalidationService(enhancedPermissionService);

// Legacy compatibility - maintain existing hasPermission function
export function hasPermission(session: { user?: User } | null, permission: string): boolean {
  if (!session?.user) return false;
  
  // Map legacy permission strings to new permission model
  const permissionMap: Record<string, Permission> = {
    'create': { resource: 'products', action: 'create' },
    'read': { resource: 'products', action: 'read' },
    'update': { resource: 'products', action: 'update' },
    'delete': { resource: 'products', action: 'delete' },
    'preview': { resource: 'pages', action: 'read' },
  };
  
  const mappedPermission = permissionMap[permission];
  if (!mappedPermission) return false;
  
  return permissionService.hasPermission(session.user, mappedPermission);
}/*
*
 * Resource-specific permission validation methods
 */
export class ResourcePermissionValidator {
  constructor(private permissionService: PermissionService) {}

  // Product permissions
  canCreateProduct(user: User | null): boolean {
    return this.permissionService.hasResourceAccess(user, 'products', 'create');
  }

  canReadProduct(user: User | null, productOwnerId?: string): boolean {
    if (this.permissionService.hasResourceAccess(user, 'products', 'read', 'all')) {
      return true;
    }
    if (productOwnerId && this.permissionService.ownsResource(user, productOwnerId)) {
      return this.permissionService.hasResourceAccess(user, 'products', 'read', 'own');
    }
    return this.permissionService.hasResourceAccess(user, 'products', 'read');
  }

  canUpdateProduct(user: User | null, productOwnerId?: string): boolean {
    if (this.permissionService.hasResourceAccess(user, 'products', 'update', 'all')) {
      return true;
    }
    if (productOwnerId && this.permissionService.ownsResource(user, productOwnerId)) {
      return this.permissionService.hasResourceAccess(user, 'products', 'update', 'own');
    }
    return false;
  }

  canDeleteProduct(user: User | null, productOwnerId?: string): boolean {
    if (this.permissionService.hasResourceAccess(user, 'products', 'delete', 'all')) {
      return true;
    }
    if (productOwnerId && this.permissionService.ownsResource(user, productOwnerId)) {
      return this.permissionService.hasResourceAccess(user, 'products', 'delete', 'own');
    }
    return false;
  }

  // Category permissions
  canCreateCategory(user: User | null): boolean {
    return this.permissionService.hasResourceAccess(user, 'categories', 'create');
  }

  canReadCategory(user: User | null): boolean {
    return this.permissionService.hasResourceAccess(user, 'categories', 'read');
  }

  canUpdateCategory(user: User | null): boolean {
    return this.permissionService.hasResourceAccess(user, 'categories', 'update');
  }

  canDeleteCategory(user: User | null): boolean {
    return this.permissionService.hasResourceAccess(user, 'categories', 'delete');
  }

  // Page permissions
  canCreatePage(user: User | null): boolean {
    return this.permissionService.hasResourceAccess(user, 'pages', 'create');
  }

  canReadPage(user: User | null, pageOwnerId?: string): boolean {
    if (this.permissionService.hasResourceAccess(user, 'pages', 'read', 'all')) {
      return true;
    }
    if (pageOwnerId && this.permissionService.ownsResource(user, pageOwnerId)) {
      return this.permissionService.hasResourceAccess(user, 'pages', 'read', 'own');
    }
    return false;
  }

  canUpdatePage(user: User | null, pageOwnerId?: string): boolean {
    if (this.permissionService.hasResourceAccess(user, 'pages', 'update', 'all')) {
      return true;
    }
    if (pageOwnerId && this.permissionService.ownsResource(user, pageOwnerId)) {
      return this.permissionService.hasResourceAccess(user, 'pages', 'update', 'own');
    }
    return false;
  }

  canDeletePage(user: User | null, pageOwnerId?: string): boolean {
    if (this.permissionService.hasResourceAccess(user, 'pages', 'delete', 'all')) {
      return true;
    }
    if (pageOwnerId && this.permissionService.ownsResource(user, pageOwnerId)) {
      return this.permissionService.hasResourceAccess(user, 'pages', 'delete', 'own');
    }
    return false;
  }

  // Media permissions
  canCreateMedia(user: User | null): boolean {
    return this.permissionService.hasResourceAccess(user, 'media', 'create');
  }

  canReadMedia(user: User | null, mediaOwnerId?: string): boolean {
    if (this.permissionService.hasResourceAccess(user, 'media', 'read', 'all')) {
      return true;
    }
    if (mediaOwnerId && this.permissionService.ownsResource(user, mediaOwnerId)) {
      return this.permissionService.hasResourceAccess(user, 'media', 'read', 'own');
    }
    return false;
  }

  canUpdateMedia(user: User | null, mediaOwnerId?: string): boolean {
    if (this.permissionService.hasResourceAccess(user, 'media', 'update', 'all')) {
      return true;
    }
    if (mediaOwnerId && this.permissionService.ownsResource(user, mediaOwnerId)) {
      return this.permissionService.hasResourceAccess(user, 'media', 'update', 'own');
    }
    return false;
  }

  canDeleteMedia(user: User | null, mediaOwnerId?: string): boolean {
    if (this.permissionService.hasResourceAccess(user, 'media', 'delete', 'all')) {
      return true;
    }
    if (mediaOwnerId && this.permissionService.ownsResource(user, mediaOwnerId)) {
      return this.permissionService.hasResourceAccess(user, 'media', 'delete', 'own');
    }
    return false;
  }

  // User management permissions
  canCreateUser(user: User | null): boolean {
    return this.permissionService.hasResourceAccess(user, 'users', 'create');
  }

  canReadUser(user: User | null, targetUserId?: string): boolean {
    if (this.permissionService.hasResourceAccess(user, 'users', 'read', 'all')) {
      return true;
    }
    if (targetUserId && this.permissionService.ownsResource(user, targetUserId)) {
      return this.permissionService.hasResourceAccess(user, 'users', 'read', 'own');
    }
    return false;
  }

  canUpdateUser(user: User | null, targetUserId?: string): boolean {
    if (this.permissionService.hasResourceAccess(user, 'users', 'update', 'all')) {
      return true;
    }
    if (targetUserId && this.permissionService.ownsResource(user, targetUserId)) {
      return this.permissionService.hasResourceAccess(user, 'profile', 'manage', 'own');
    }
    return false;
  }

  canDeleteUser(user: User | null, targetUserId?: string): boolean {
    // Only admins can delete users, and they can't delete themselves
    if (!this.permissionService.isAdmin(user)) return false;
    if (user?.id === targetUserId) return false; // Can't delete self
    return this.permissionService.hasResourceAccess(user, 'users', 'delete', 'all');
  }

  // Order permissions
  canReadOrder(user: User | null): boolean {
    return this.permissionService.hasResourceAccess(user, 'orders', 'read');
  }

  canUpdateOrder(user: User | null): boolean {
    return this.permissionService.hasResourceAccess(user, 'orders', 'update');
  }

  // Analytics permissions
  canReadAnalytics(user: User | null): boolean {
    return this.permissionService.hasResourceAccess(user, 'analytics', 'read');
  }

  // Security permissions
  canReadSecurityLogs(user: User | null): boolean {
    return this.permissionService.hasResourceAccess(user, 'security', 'read');
  }

  canManageSecurity(user: User | null): boolean {
    return this.permissionService.hasResourceAccess(user, 'security', 'manage');
  }

  // System settings permissions
  canReadSettings(user: User | null): boolean {
    return this.permissionService.hasResourceAccess(user, 'settings', 'read');
  }

  canUpdateSettings(user: User | null): boolean {
    return this.permissionService.hasResourceAccess(user, 'settings', 'update');
  }

  canManageSettings(user: User | null): boolean {
    return this.permissionService.hasResourceAccess(user, 'settings', 'manage');
  }
}

/**
 * Role hierarchy validation
 */
export class RoleHierarchyValidator {
  private static readonly ROLE_HIERARCHY: Record<UserRole, number> = {
    [UserRole.VIEWER]: 1,
    [UserRole.EDITOR]: 2,
    [UserRole.ADMIN]: 3,
  };

  /**
   * Check if user has sufficient role level
   */
  static hasMinimumRole(userRole: UserRole | null, minimumRole: UserRole): boolean {
    if (!userRole) return false;
    
    const userLevel = this.ROLE_HIERARCHY[userRole] || 0;
    const minimumLevel = this.ROLE_HIERARCHY[minimumRole] || 0;
    
    return userLevel >= minimumLevel;
  }

  /**
   * Check if user can manage another user (must have higher role)
   */
  static canManageUser(managerRole: UserRole | null, targetRole: UserRole): boolean {
    if (!managerRole) return false;
    
    const managerLevel = this.ROLE_HIERARCHY[managerRole] || 0;
    const targetLevel = this.ROLE_HIERARCHY[targetRole] || 0;
    
    return managerLevel > targetLevel;
  }

  /**
   * Get all roles that a user can assign to others
   */
  static getAssignableRoles(userRole: UserRole | null): UserRole[] {
    if (!userRole) return [];
    
    const userLevel = this.ROLE_HIERARCHY[userRole] || 0;
    
    return Object.entries(this.ROLE_HIERARCHY)
      .filter(([_, level]) => level < userLevel)
      .map(([role, _]) => role as UserRole);
  }

  /**
   * Get role display name
   */
  static getRoleDisplayName(role: UserRole): string {
    const displayNames: Record<UserRole, string> = {
      [UserRole.ADMIN]: 'Administrator',
      [UserRole.EDITOR]: 'Editor',
      [UserRole.VIEWER]: 'Viewer',
    };
    
    return displayNames[role] || role;
  }

  /**
   * Get role description
   */
  static getRoleDescription(role: UserRole): string {
    const descriptions: Record<UserRole, string> = {
      [UserRole.ADMIN]: 'Full system access including user management and system settings',
      [UserRole.EDITOR]: 'Can create, edit, and manage content including products, pages, and media',
      [UserRole.VIEWER]: 'Read-only access to content and basic profile management',
    };
    
    return descriptions[role] || 'Unknown role';
  }
}

// Export singleton instances
export const resourceValidator = new ResourcePermissionValidator(permissionService);
export const roleHierarchy = RoleHierarchyValidator;

// Export types for external use
export type { Permission, RolePermission, CacheConfig };