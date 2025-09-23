/**
 * Tests for Enhanced Permission Service with caching
 */

import { UserRole } from '@prisma/client';
import { 
  EnhancedPermissionService,
  EnhancedPermissionCache,
  CacheInvalidationService,
  Permission,
  CacheConfig
} from '../../app/lib/permissions';
import { User } from '../../app/lib/types';

// Mock user factory
const createMockUser = (role: UserRole, id?: string): User => ({
  id: id || `${role.toLowerCase()}-user-${Math.random().toString(36).substr(2, 9)}`,
  email: 'test@example.com',
  name: 'Test User',
  role,
  isActive: true,
  twoFactorEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('EnhancedPermissionCache', () => {
  let cache: EnhancedPermissionCache;

  beforeEach(() => {
    cache = new EnhancedPermissionCache({
      ttl: 1000, // 1 second for testing
      enableDistributed: false // Disable Redis for unit tests
    });
  });

  describe('memory caching', () => {
    it('should cache and retrieve permission results', async () => {
      const userId = 'test-user';
      const resource = 'products';
      const action = 'read';
      
      // Should return null initially
      const initial = await cache.get(userId, resource, action);
      expect(initial).toBeNull();
      
      // Set cache
      await cache.set(userId, resource, action, true);
      
      // Should return cached value
      const cached = await cache.get(userId, resource, action);
      expect(cached).toBe(true);
    });

    it('should handle cache expiration', async () => {
      const userId = 'test-user';
      const resource = 'products';
      const action = 'read';
      
      // Set cache
      await cache.set(userId, resource, action, true);
      
      // Should return cached value immediately
      const cached = await cache.get(userId, resource, action);
      expect(cached).toBe(true);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should return null after expiration
      const expired = await cache.get(userId, resource, action);
      expect(expired).toBeNull();
    });

    it('should invalidate user cache', async () => {
      const userId = 'test-user';
      
      // Set multiple cache entries for user
      await cache.set(userId, 'products', 'read', true);
      await cache.set(userId, 'products', 'create', false);
      await cache.set(userId, 'users', 'read', true);
      
      // Verify cached
      expect(await cache.get(userId, 'products', 'read')).toBe(true);
      expect(await cache.get(userId, 'products', 'create')).toBe(false);
      expect(await cache.get(userId, 'users', 'read')).toBe(true);
      
      // Invalidate user cache
      await cache.invalidateUser(userId);
      
      // All should be null
      expect(await cache.get(userId, 'products', 'read')).toBeNull();
      expect(await cache.get(userId, 'products', 'create')).toBeNull();
      expect(await cache.get(userId, 'users', 'read')).toBeNull();
    });

    it('should invalidate resource cache', async () => {
      const userId1 = 'user1';
      const userId2 = 'user2';
      
      // Set cache entries for different users and resources
      await cache.set(userId1, 'products', 'read', true);
      await cache.set(userId1, 'users', 'read', true);
      await cache.set(userId2, 'products', 'create', false);
      await cache.set(userId2, 'users', 'create', false);
      
      // Invalidate products resource
      await cache.invalidateResource('products');
      
      // Products cache should be cleared
      expect(await cache.get(userId1, 'products', 'read')).toBeNull();
      expect(await cache.get(userId2, 'products', 'create')).toBeNull();
      
      // Users cache should remain
      expect(await cache.get(userId1, 'users', 'read')).toBe(true);
      expect(await cache.get(userId2, 'users', 'create')).toBe(false);
    });

    it('should clear all cache', async () => {
      // Set multiple cache entries
      await cache.set('user1', 'products', 'read', true);
      await cache.set('user2', 'users', 'create', false);
      
      // Clear all
      await cache.clear();
      
      // All should be null
      expect(await cache.get('user1', 'products', 'read')).toBeNull();
      expect(await cache.get('user2', 'users', 'create')).toBeNull();
    });

    it('should provide cache statistics', () => {
      const stats = cache.getStats();
      
      expect(stats).toHaveProperty('memorySize');
      expect(stats).toHaveProperty('ttl');
      expect(stats).toHaveProperty('distributed');
      expect(typeof stats.memorySize).toBe('number');
      expect(typeof stats.ttl).toBe('number');
      expect(typeof stats.distributed).toBe('boolean');
    });
  });

  describe('scope handling', () => {
    it('should handle different scopes correctly', async () => {
      const userId = 'test-user';
      const resource = 'products';
      const action = 'read';
      
      // Set different scopes
      await cache.set(userId, resource, action, true, 'all');
      await cache.set(userId, resource, action, false, 'own');
      
      // Should return different values for different scopes
      expect(await cache.get(userId, resource, action, 'all')).toBe(true);
      expect(await cache.get(userId, resource, action, 'own')).toBe(false);
      expect(await cache.get(userId, resource, action)).toBeNull(); // default scope
    });
  });
});

describe('EnhancedPermissionService', () => {
  let service: EnhancedPermissionService;

  beforeEach(() => {
    service = new EnhancedPermissionService({
      ttl: 1000,
      enableDistributed: false
    });
  });

  describe('async permission checking', () => {
    it('should check permissions asynchronously', async () => {
      const admin = createMockUser(UserRole.ADMIN);
      const permission: Permission = { resource: 'products', action: 'create' };
      
      const result = await service.hasPermission(admin, permission);
      expect(result).toBe(true);
    });

    it('should cache permission results', async () => {
      const editor = createMockUser(UserRole.EDITOR);
      const permission: Permission = { resource: 'products', action: 'read' };
      
      // First call should compute and cache
      const result1 = await service.hasPermission(editor, permission);
      
      // Second call should use cache
      const result2 = await service.hasPermission(editor, permission);
      
      expect(result1).toBe(result2);
      expect(result1).toBe(true);
    });

    it('should handle cache invalidation', async () => {
      const editor = createMockUser(UserRole.EDITOR);
      const permission: Permission = { resource: 'products', action: 'read' };
      
      // Cache a result
      await service.hasPermission(editor, permission);
      
      // Invalidate cache
      await service.invalidateUserCache(editor.id);
      
      // Should still work (recompute)
      const result = await service.hasPermission(editor, permission);
      expect(result).toBe(true);
    });

    it('should provide cache statistics', () => {
      const stats = service.getCacheStats();
      
      expect(stats).toHaveProperty('memorySize');
      expect(stats).toHaveProperty('ttl');
      expect(stats).toHaveProperty('distributed');
    });
  });

  describe('cache warming', () => {
    it('should warm cache with common permissions', async () => {
      const users = [
        createMockUser(UserRole.ADMIN),
        createMockUser(UserRole.EDITOR),
        createMockUser(UserRole.VIEWER)
      ];
      
      const commonPermissions: Permission[] = [
        { resource: 'products', action: 'read' },
        { resource: 'categories', action: 'read' },
        { resource: 'pages', action: 'read' }
      ];
      
      // This should not throw
      await service.warmCache(users, commonPermissions);
      
      // Cache should have entries
      const stats = service.getCacheStats();
      expect(stats.memorySize).toBeGreaterThan(0);
    });
  });
});

describe('CacheInvalidationService', () => {
  let service: EnhancedPermissionService;
  let invalidationService: CacheInvalidationService;

  beforeEach(() => {
    service = new EnhancedPermissionService({
      ttl: 1000,
      enableDistributed: false
    });
    invalidationService = new CacheInvalidationService(service);
  });

  it('should invalidate cache on user role change', async () => {
    const userId = 'test-user';
    
    // Mock console.log to verify it's called
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    await invalidationService.onUserRoleChange(userId, UserRole.VIEWER, UserRole.EDITOR);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(`User ${userId} role changed from VIEWER to EDITOR`)
    );
    
    consoleSpy.mockRestore();
  });

  it('should invalidate cache on permission update', async () => {
    const resource = 'products';
    
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    await invalidationService.onPermissionUpdate(resource);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Permissions updated for resource ${resource}`)
    );
    
    consoleSpy.mockRestore();
  });

  it('should invalidate cache on user deactivation', async () => {
    const userId = 'test-user';
    
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    await invalidationService.onUserDeactivation(userId);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(`User ${userId} deactivated`)
    );
    
    consoleSpy.mockRestore();
  });

  it('should handle scheduled cleanup', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    await invalidationService.cleanupExpiredEntries();
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Cleaning up expired cache entries')
    );
    
    consoleSpy.mockRestore();
  });
});

describe('Cache Configuration', () => {
  it('should use default configuration', () => {
    const cache = new EnhancedPermissionCache();
    const stats = cache.getStats();
    
    expect(stats.ttl).toBe(5 * 60 * 1000); // 5 minutes default
    expect(stats.distributed).toBe(false);
  });

  it('should use custom configuration', () => {
    const config: CacheConfig = {
      ttl: 10 * 60 * 1000, // 10 minutes
      enableDistributed: false
    };
    
    const cache = new EnhancedPermissionCache(config);
    const stats = cache.getStats();
    
    expect(stats.ttl).toBe(10 * 60 * 1000);
    expect(stats.distributed).toBe(false);
  });

  it('should handle production configuration', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    const service = new EnhancedPermissionService({
      enableDistributed: process.env.NODE_ENV === 'production'
    });
    
    // Should not throw even without Redis URL
    expect(service).toBeDefined();
    
    process.env.NODE_ENV = originalEnv;
  });
});

describe('Performance Tests', () => {
  let service: EnhancedPermissionService;

  beforeEach(() => {
    service = new EnhancedPermissionService({
      ttl: 60000, // 1 minute
      enableDistributed: false
    });
  });

  it('should handle concurrent permission checks', async () => {
    const user = createMockUser(UserRole.EDITOR);
    const permission: Permission = { resource: 'products', action: 'read' };
    
    // Create multiple concurrent permission checks
    const promises = Array.from({ length: 100 }, () => 
      service.hasPermission(user, permission)
    );
    
    const results = await Promise.all(promises);
    
    // All should return the same result
    expect(results.every(result => result === true)).toBe(true);
    
    // Cache should have the entry
    const stats = service.getCacheStats();
    expect(stats.memorySize).toBeGreaterThan(0);
  });

  it('should maintain performance under load', async () => {
    const users = Array.from({ length: 10 }, (_, i) => 
      createMockUser(UserRole.EDITOR, `user-${i}`)
    );
    
    const permissions: Permission[] = [
      { resource: 'products', action: 'read' },
      { resource: 'products', action: 'create' },
      { resource: 'categories', action: 'read' },
      { resource: 'pages', action: 'read' }
    ];
    
    const startTime = Date.now();
    
    // Perform many permission checks
    const promises = users.flatMap(user =>
      permissions.map(permission => service.hasPermission(user, permission))
    );
    
    await Promise.all(promises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete within reasonable time (adjust threshold as needed)
    expect(duration).toBeLessThan(1000); // 1 second
    
    // Cache should have entries
    const stats = service.getCacheStats();
    expect(stats.memorySize).toBeGreaterThan(0);
  });
});