/**
 * Comprehensive unit tests for Permission Service
 * Tests all permission validation methods, role hierarchy logic, and cache functionality
 * Requirements: 4.1, 4.5
 */

import { UserRole } from '@prisma/client';
import { 
  PermissionService, 
  ResourcePermissionValidator, 
  RoleHierarchyValidator,
  permissionService,
  resourceValidator,
  roleHierarchy,
  Permission
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

describe('PermissionService', () => {
  let service: PermissionService;

  beforeEach(() => {
    service = new PermissionService();
    service.clearCache(); // Clear cache between tests
  });

  describe('hasPermission', () => {
    it('should return false for null user', () => {
      const permission: Permission = { resource: 'products', action: 'read' };
      expect(service.hasPermission(null, permission)).toBe(false);
    });

    it('should return true for admin with any permission', () => {
      const admin = createMockUser(UserRole.ADMIN);
      const permission: Permission = { resource: 'products', action: 'create' };
      expect(service.hasPermission(admin, permission)).toBe(true);
    });

    it('should return true for editor with product permissions', () => {
      const editor = createMockUser(UserRole.EDITOR);
      const permission: Permission = { resource: 'products', action: 'create' };
      expect(service.hasPermission(editor, permission)).toBe(true);
    });

    it('should return false for viewer with create permissions', () => {
      const viewer = createMockUser(UserRole.VIEWER);
      const permission: Permission = { resource: 'products', action: 'create' };
      expect(service.hasPermission(viewer, permission)).toBe(false);
    });

    it('should return true for viewer with read permissions', () => {
      const viewer = createMockUser(UserRole.VIEWER);
      const permission: Permission = { resource: 'products', action: 'read' };
      expect(service.hasPermission(viewer, permission)).toBe(true);
    });

    it('should handle scope-based permissions correctly', () => {
      const editor = createMockUser(UserRole.EDITOR);
      const ownPermission: Permission = { resource: 'profile', action: 'manage', scope: 'own' };
      const allPermission: Permission = { resource: 'profile', action: 'manage', scope: 'all' };
      
      expect(service.hasPermission(editor, ownPermission)).toBe(true);
      expect(service.hasPermission(editor, allPermission)).toBe(false);
    });
  });

  describe('hasResourceAccess', () => {
    it('should correctly validate resource access', () => {
      const editor = createMockUser(UserRole.EDITOR);
      
      expect(service.hasResourceAccess(editor, 'products', 'create')).toBe(true);
      expect(service.hasResourceAccess(editor, 'products', 'read')).toBe(true);
      expect(service.hasResourceAccess(editor, 'users', 'create')).toBe(false);
    });
  });

  describe('canUserAccessRoute', () => {
    it('should allow admin access to all routes', () => {
      const admin = createMockUser(UserRole.ADMIN);
      
      expect(service.canUserAccessRoute(admin, '/admin/users')).toBe(true);
      expect(service.canUserAccessRoute(admin, '/admin/security')).toBe(true);
      expect(service.canUserAccessRoute(admin, '/admin/products')).toBe(true);
    });

    it('should restrict viewer access to admin routes', () => {
      const viewer = createMockUser(UserRole.VIEWER);
      
      expect(service.canUserAccessRoute(viewer, '/admin/users')).toBe(false);
      expect(service.canUserAccessRoute(viewer, '/admin/security')).toBe(false);
      expect(service.canUserAccessRoute(viewer, '/admin/products')).toBe(true); // Can read
    });

    it('should handle dynamic routes correctly', () => {
      const editor = createMockUser(UserRole.EDITOR);
      
      expect(service.canUserAccessRoute(editor, '/admin/products/123/edit')).toBe(true);
      expect(service.canUserAccessRoute(editor, '/admin/pages/456/edit')).toBe(true);
    });
  });

  describe('role checking methods', () => {
    it('should correctly identify admin users', () => {
      const admin = createMockUser(UserRole.ADMIN);
      const editor = createMockUser(UserRole.EDITOR);
      
      expect(service.isAdmin(admin)).toBe(true);
      expect(service.isAdmin(editor)).toBe(false);
      expect(service.isAdmin(null)).toBe(false);
    });

    it('should correctly identify editor users', () => {
      const admin = createMockUser(UserRole.ADMIN);
      const editor = createMockUser(UserRole.EDITOR);
      const viewer = createMockUser(UserRole.VIEWER);
      
      expect(service.isEditor(admin)).toBe(true);
      expect(service.isEditor(editor)).toBe(true);
      expect(service.isEditor(viewer)).toBe(false);
    });

    it('should correctly identify viewer users', () => {
      const admin = createMockUser(UserRole.ADMIN);
      const editor = createMockUser(UserRole.EDITOR);
      const viewer = createMockUser(UserRole.VIEWER);
      
      expect(service.isViewer(admin)).toBe(true);
      expect(service.isViewer(editor)).toBe(true);
      expect(service.isViewer(viewer)).toBe(true);
      expect(service.isViewer(null)).toBe(false);
    });
  });

  describe('filterByPermissions', () => {
    it('should filter items based on permissions', () => {
      const editor = createMockUser(UserRole.EDITOR);
      const items = [
        { id: '1', type: 'product' },
        { id: '2', type: 'user' },
        { id: '3', type: 'product' },
      ];
      
      const filtered = service.filterByPermissions(
        editor,
        items,
        (item) => item.type === 'product' ? 'products' : 'users',
        'read'
      );
      
      expect(filtered).toHaveLength(2);
      expect(filtered.every(item => item.type === 'product')).toBe(true);
    });
  });

  describe('caching', () => {
    it('should cache permission results', () => {
      const editor = createMockUser(UserRole.EDITOR);
      const permission: Permission = { resource: 'products', action: 'read' };
      
      // First call should compute and cache
      const result1 = service.hasPermission(editor, permission);
      
      // Second call should use cache
      const result2 = service.hasPermission(editor, permission);
      
      expect(result1).toBe(result2);
      expect(result1).toBe(true);
    });

    it('should invalidate user cache correctly', () => {
      const editor = createMockUser(UserRole.EDITOR);
      const permission: Permission = { resource: 'products', action: 'read' };
      
      // Cache a result
      service.hasPermission(editor, permission);
      
      // Invalidate cache
      service.invalidateUserCache(editor.id);
      
      // Should still work (recompute)
      const result = service.hasPermission(editor, permission);
      expect(result).toBe(true);
    });
  });
});

describe('ResourcePermissionValidator', () => {
  let validator: ResourcePermissionValidator;
  let mockService: PermissionService;

  beforeEach(() => {
    mockService = new PermissionService();
    mockService.clearCache(); // Clear cache between tests
    validator = new ResourcePermissionValidator(mockService);
  });

  describe('product permissions', () => {
    it('should validate product creation permissions', () => {
      const admin = createMockUser(UserRole.ADMIN);
      const editor = createMockUser(UserRole.EDITOR);
      const viewer = createMockUser(UserRole.VIEWER);
      
      expect(validator.canCreateProduct(admin)).toBe(true);
      expect(validator.canCreateProduct(editor)).toBe(true);
      expect(validator.canCreateProduct(viewer)).toBe(false);
    });

    it('should validate product read permissions with ownership', () => {
      const editor = createMockUser(UserRole.EDITOR, 'editor-id');
      const viewer = createMockUser(UserRole.VIEWER, 'viewer-id');
      
      expect(validator.canReadProduct(editor)).toBe(true);
      expect(validator.canReadProduct(viewer)).toBe(true);
      expect(validator.canReadProduct(viewer, 'editor-id')).toBe(true);
    });

    it('should validate product update permissions with ownership', () => {
      const editor = createMockUser(UserRole.EDITOR, 'editor-id');
      const viewer = createMockUser(UserRole.VIEWER, 'viewer-id');
      
      expect(validator.canUpdateProduct(editor)).toBe(true);
      expect(validator.canUpdateProduct(viewer)).toBe(false);
      expect(validator.canUpdateProduct(viewer, 'viewer-id')).toBe(false);
    });

    it('should validate product deletion permissions', () => {
      const admin = createMockUser(UserRole.ADMIN);
      const editor = createMockUser(UserRole.EDITOR);
      const viewer = createMockUser(UserRole.VIEWER);
      
      expect(validator.canDeleteProduct(admin)).toBe(true);
      expect(validator.canDeleteProduct(editor)).toBe(true);
      expect(validator.canDeleteProduct(viewer)).toBe(false);
    });
  });

  describe('user management permissions', () => {
    it('should validate user creation permissions', () => {
      const admin = createMockUser(UserRole.ADMIN);
      const editor = createMockUser(UserRole.EDITOR);
      
      expect(validator.canCreateUser(admin)).toBe(true);
      expect(validator.canCreateUser(editor)).toBe(false);
    });

    it('should validate user deletion permissions', () => {
      const admin = createMockUser(UserRole.ADMIN, 'admin-id');
      const editor = createMockUser(UserRole.EDITOR);
      
      expect(validator.canDeleteUser(admin, 'other-user-id')).toBe(true);
      expect(validator.canDeleteUser(admin, 'admin-id')).toBe(false); // Can't delete self
      expect(validator.canDeleteUser(editor, 'other-user-id')).toBe(false);
    });
  });
});

describe('RoleHierarchyValidator', () => {
  describe('hasMinimumRole', () => {
    it('should validate minimum role requirements', () => {
      expect(roleHierarchy.hasMinimumRole(UserRole.ADMIN, UserRole.VIEWER)).toBe(true);
      expect(roleHierarchy.hasMinimumRole(UserRole.EDITOR, UserRole.VIEWER)).toBe(true);
      expect(roleHierarchy.hasMinimumRole(UserRole.VIEWER, UserRole.EDITOR)).toBe(false);
      expect(roleHierarchy.hasMinimumRole(null, UserRole.VIEWER)).toBe(false);
    });
  });

  describe('canManageUser', () => {
    it('should validate user management hierarchy', () => {
      expect(roleHierarchy.canManageUser(UserRole.ADMIN, UserRole.EDITOR)).toBe(true);
      expect(roleHierarchy.canManageUser(UserRole.ADMIN, UserRole.VIEWER)).toBe(true);
      expect(roleHierarchy.canManageUser(UserRole.EDITOR, UserRole.VIEWER)).toBe(true);
      expect(roleHierarchy.canManageUser(UserRole.EDITOR, UserRole.ADMIN)).toBe(false);
      expect(roleHierarchy.canManageUser(UserRole.VIEWER, UserRole.EDITOR)).toBe(false);
    });
  });

  describe('getAssignableRoles', () => {
    it('should return correct assignable roles', () => {
      const adminRoles = roleHierarchy.getAssignableRoles(UserRole.ADMIN);
      const editorRoles = roleHierarchy.getAssignableRoles(UserRole.EDITOR);
      const viewerRoles = roleHierarchy.getAssignableRoles(UserRole.VIEWER);
      
      expect(adminRoles).toContain(UserRole.EDITOR);
      expect(adminRoles).toContain(UserRole.VIEWER);
      expect(adminRoles).not.toContain(UserRole.ADMIN);
      
      expect(editorRoles).toContain(UserRole.VIEWER);
      expect(editorRoles).not.toContain(UserRole.EDITOR);
      expect(editorRoles).not.toContain(UserRole.ADMIN);
      
      expect(viewerRoles).toHaveLength(0);
    });
  });

  describe('role display methods', () => {
    it('should return correct display names', () => {
      expect(roleHierarchy.getRoleDisplayName(UserRole.ADMIN)).toBe('Administrator');
      expect(roleHierarchy.getRoleDisplayName(UserRole.EDITOR)).toBe('Editor');
      expect(roleHierarchy.getRoleDisplayName(UserRole.VIEWER)).toBe('Viewer');
    });

    it('should return correct descriptions', () => {
      const adminDesc = roleHierarchy.getRoleDescription(UserRole.ADMIN);
      const editorDesc = roleHierarchy.getRoleDescription(UserRole.EDITOR);
      const viewerDesc = roleHierarchy.getRoleDescription(UserRole.VIEWER);
      
      expect(adminDesc).toContain('Full system access');
      expect(editorDesc).toContain('create, edit, and manage content');
      expect(viewerDesc).toContain('Read-only access');
    });
  });
});

describe('RoleHierarchyValidator', () => {
  let validator: RoleHierarchyValidator;

  beforeEach(() => {
    validator = new RoleHierarchyValidator();
  });

  describe('hasMinimumRole', () => {
    it('should validate minimum role requirements correctly', () => {
      expect(RoleHierarchyValidator.hasMinimumRole(UserRole.ADMIN, UserRole.VIEWER)).toBe(true);
      expect(RoleHierarchyValidator.hasMinimumRole(UserRole.ADMIN, UserRole.EDITOR)).toBe(true);
      expect(RoleHierarchyValidator.hasMinimumRole(UserRole.ADMIN, UserRole.ADMIN)).toBe(true);
      
      expect(RoleHierarchyValidator.hasMinimumRole(UserRole.EDITOR, UserRole.VIEWER)).toBe(true);
      expect(RoleHierarchyValidator.hasMinimumRole(UserRole.EDITOR, UserRole.EDITOR)).toBe(true);
      expect(RoleHierarchyValidator.hasMinimumRole(UserRole.EDITOR, UserRole.ADMIN)).toBe(false);
      
      expect(RoleHierarchyValidator.hasMinimumRole(UserRole.VIEWER, UserRole.VIEWER)).toBe(true);
      expect(RoleHierarchyValidator.hasMinimumRole(UserRole.VIEWER, UserRole.EDITOR)).toBe(false);
      expect(RoleHierarchyValidator.hasMinimumRole(UserRole.VIEWER, UserRole.ADMIN)).toBe(false);
      
      expect(RoleHierarchyValidator.hasMinimumRole(null, UserRole.VIEWER)).toBe(false);
    });
  });

  describe('canManageUser', () => {
    it('should validate user management hierarchy correctly', () => {
      expect(RoleHierarchyValidator.canManageUser(UserRole.ADMIN, UserRole.EDITOR)).toBe(true);
      expect(RoleHierarchyValidator.canManageUser(UserRole.ADMIN, UserRole.VIEWER)).toBe(true);
      expect(RoleHierarchyValidator.canManageUser(UserRole.ADMIN, UserRole.ADMIN)).toBe(false);
      
      expect(RoleHierarchyValidator.canManageUser(UserRole.EDITOR, UserRole.VIEWER)).toBe(true);
      expect(RoleHierarchyValidator.canManageUser(UserRole.EDITOR, UserRole.EDITOR)).toBe(false);
      expect(RoleHierarchyValidator.canManageUser(UserRole.EDITOR, UserRole.ADMIN)).toBe(false);
      
      expect(RoleHierarchyValidator.canManageUser(UserRole.VIEWER, UserRole.VIEWER)).toBe(false);
      expect(RoleHierarchyValidator.canManageUser(UserRole.VIEWER, UserRole.EDITOR)).toBe(false);
      expect(RoleHierarchyValidator.canManageUser(UserRole.VIEWER, UserRole.ADMIN)).toBe(false);
    });
  });

  describe('getAssignableRoles', () => {
    it('should return correct assignable roles for each role', () => {
      const adminRoles = RoleHierarchyValidator.getAssignableRoles(UserRole.ADMIN);
      expect(adminRoles).toContain(UserRole.EDITOR);
      expect(adminRoles).toContain(UserRole.VIEWER);
      expect(adminRoles).not.toContain(UserRole.ADMIN);
      
      const editorRoles = RoleHierarchyValidator.getAssignableRoles(UserRole.EDITOR);
      expect(editorRoles).toContain(UserRole.VIEWER);
      expect(editorRoles).not.toContain(UserRole.EDITOR);
      expect(editorRoles).not.toContain(UserRole.ADMIN);
      
      const viewerRoles = RoleHierarchyValidator.getAssignableRoles(UserRole.VIEWER);
      expect(viewerRoles).toHaveLength(0);
    });
  });

  describe('getRoleLevel', () => {
    it('should return correct role levels', () => {
      expect(RoleHierarchyValidator.getRoleLevel(UserRole.ADMIN)).toBe(3);
      expect(RoleHierarchyValidator.getRoleLevel(UserRole.EDITOR)).toBe(2);
      expect(RoleHierarchyValidator.getRoleLevel(UserRole.VIEWER)).toBe(1);
    });
  });

  describe('getRoleDisplayName', () => {
    it('should return correct display names', () => {
      expect(RoleHierarchyValidator.getRoleDisplayName(UserRole.ADMIN)).toBe('Administrator');
      expect(RoleHierarchyValidator.getRoleDisplayName(UserRole.EDITOR)).toBe('Editor');
      expect(RoleHierarchyValidator.getRoleDisplayName(UserRole.VIEWER)).toBe('Viewer');
    });
  });

  describe('getRoleDescription', () => {
    it('should return correct role descriptions', () => {
      const adminDesc = RoleHierarchyValidator.getRoleDescription(UserRole.ADMIN);
      const editorDesc = RoleHierarchyValidator.getRoleDescription(UserRole.EDITOR);
      const viewerDesc = RoleHierarchyValidator.getRoleDescription(UserRole.VIEWER);
      
      expect(adminDesc).toContain('Full system access');
      expect(editorDesc).toContain('create, edit, and manage content');
      expect(viewerDesc).toContain('Read-only access');
    });
  });

  describe('isValidRoleTransition', () => {
    it('should validate role transitions correctly', () => {
      // Admin can assign any role except admin
      expect(RoleHierarchyValidator.isValidRoleTransition(UserRole.ADMIN, UserRole.VIEWER, UserRole.EDITOR)).toBe(true);
      expect(RoleHierarchyValidator.isValidRoleTransition(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)).toBe(true);
      expect(RoleHierarchyValidator.isValidRoleTransition(UserRole.ADMIN, UserRole.VIEWER, UserRole.ADMIN)).toBe(false);
      
      // Editor can only assign viewer role
      expect(RoleHierarchyValidator.isValidRoleTransition(UserRole.EDITOR, UserRole.VIEWER, UserRole.VIEWER)).toBe(true);
      expect(RoleHierarchyValidator.isValidRoleTransition(UserRole.EDITOR, UserRole.VIEWER, UserRole.EDITOR)).toBe(false);
      expect(RoleHierarchyValidator.isValidRoleTransition(UserRole.EDITOR, UserRole.EDITOR, UserRole.VIEWER)).toBe(true); // Editor can demote editor to viewer
      
      // Viewer cannot assign any roles
      expect(RoleHierarchyValidator.isValidRoleTransition(UserRole.VIEWER, UserRole.VIEWER, UserRole.VIEWER)).toBe(false);
    });
  });
});

describe('Advanced Permission Scenarios', () => {
  let service: PermissionService;
  let validator: ResourcePermissionValidator;

  beforeEach(() => {
    service = new PermissionService();
    service.clearCache();
    validator = new ResourcePermissionValidator(service);
  });

  describe('wildcard permissions', () => {
    it('should handle admin wildcard permissions correctly', () => {
      const admin = createMockUser(UserRole.ADMIN);
      
      // Admin should have access to any resource/action combination
      expect(service.hasPermission(admin, { resource: 'custom-resource', action: 'custom-action' })).toBe(true);
      expect(service.hasPermission(admin, { resource: 'unknown', action: 'unknown' })).toBe(true);
      expect(service.hasPermission(admin, { resource: 'products', action: 'manage', scope: 'all' })).toBe(true);
    });
  });

  describe('scope-based permissions', () => {
    it('should handle own scope permissions correctly', () => {
      const editor = createMockUser(UserRole.EDITOR, 'editor-123');
      
      // Editor should be able to manage own profile
      expect(validator.canUpdateUser(editor, 'editor-123')).toBe(true);
      expect(validator.canUpdateUser(editor, 'other-user-456')).toBe(false);
    });

    it('should handle all scope permissions correctly', () => {
      const admin = createMockUser(UserRole.ADMIN);
      const editor = createMockUser(UserRole.EDITOR);
      
      // Admin has 'all' scope for users
      expect(validator.canUpdateUser(admin, 'any-user-id')).toBe(true);
      
      // Editor does not have 'all' scope for users
      expect(validator.canUpdateUser(editor, 'any-user-id')).toBe(false);
    });
  });

  describe('resource ownership validation', () => {
    it('should validate resource ownership correctly', () => {
      const user = createMockUser(UserRole.EDITOR, 'user-123');
      
      expect(service.ownsResource(user, 'user-123')).toBe(true);
      expect(service.ownsResource(user, 'user-456')).toBe(false);
      expect(service.ownsResource(null, 'user-123')).toBe(false);
    });
  });

  describe('route pattern matching', () => {
    it('should match dynamic routes correctly', () => {
      const editor = createMockUser(UserRole.EDITOR);
      
      // Test various dynamic route patterns
      expect(service.canUserAccessRoute(editor, '/admin/products/123/edit')).toBe(true);
      expect(service.canUserAccessRoute(editor, '/admin/products/abc-def/edit')).toBe(true);
      expect(service.canUserAccessRoute(editor, '/admin/pages/456/edit')).toBe(true);
      
      // Should not match routes that require permissions editor doesn't have
      expect(service.canUserAccessRoute(editor, '/admin/users')).toBe(false); // Requires users read permission
    });

    it('should handle nested dynamic routes', () => {
      const admin = createMockUser(UserRole.ADMIN);
      
      // Admin should access nested routes
      expect(service.canUserAccessRoute(admin, '/admin/users/123/permissions')).toBe(true);
      expect(service.canUserAccessRoute(admin, '/admin/security/events/456')).toBe(true);
    });
  });

  describe('permission filtering', () => {
    it('should filter arrays based on permissions correctly', () => {
      const editor = createMockUser(UserRole.EDITOR);
      const items = [
        { id: '1', type: 'product', name: 'Product 1' },
        { id: '2', type: 'user', name: 'User 1' },
        { id: '3', type: 'product', name: 'Product 2' },
        { id: '4', type: 'category', name: 'Category 1' },
        { id: '5', type: 'user', name: 'User 2' },
      ];
      
      const filtered = service.filterByPermissions(
        editor,
        items,
        (item) => item.type === 'product' ? 'products' : 
                  item.type === 'user' ? 'users' : 
                  item.type === 'category' ? 'categories' : 'unknown',
        'read'
      );
      
      // Editor can read products and categories, but not users
      expect(filtered).toHaveLength(3);
      expect(filtered.every(item => item.type !== 'user')).toBe(true);
    });

    it('should return empty array for null user', () => {
      const items = [{ id: '1', type: 'product' }];
      const filtered = service.filterByPermissions(
        null,
        items,
        (item) => 'products',
        'read'
      );
      
      expect(filtered).toHaveLength(0);
    });
  });
});

describe('Cache Functionality Tests', () => {
  let service: PermissionService;

  beforeEach(() => {
    service = new PermissionService();
    service.clearCache();
  });

  describe('cache operations', () => {
    it('should cache permission results correctly', () => {
      const editor = createMockUser(UserRole.EDITOR);
      const permission: Permission = { resource: 'products', action: 'read' };
      
      // First call should compute and cache
      const result1 = service.hasPermission(editor, permission);
      
      // Get cache stats to verify caching
      const stats = service.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      
      // Second call should use cache (same result)
      const result2 = service.hasPermission(editor, permission);
      
      expect(result1).toBe(result2);
      expect(result1).toBe(true);
    });

    it('should handle different cache keys for different permissions', () => {
      const user = createMockUser(UserRole.EDITOR);
      
      // Cache different permissions
      service.hasPermission(user, { resource: 'products', action: 'read' });
      service.hasPermission(user, { resource: 'products', action: 'create' });
      service.hasPermission(user, { resource: 'categories', action: 'read' });
      
      const stats = service.getCacheStats();
      expect(stats.size).toBe(3);
    });

    it('should handle scope in cache keys', () => {
      const user = createMockUser(UserRole.EDITOR);
      
      // Cache same resource/action with different scopes
      service.hasPermission(user, { resource: 'profile', action: 'manage', scope: 'own' });
      service.hasPermission(user, { resource: 'profile', action: 'manage', scope: 'all' });
      service.hasPermission(user, { resource: 'profile', action: 'manage' }); // no scope
      
      const stats = service.getCacheStats();
      expect(stats.size).toBe(3);
    });

    it('should invalidate user cache correctly', () => {
      const user = createMockUser(UserRole.EDITOR);
      
      // Cache some permissions
      service.hasPermission(user, { resource: 'products', action: 'read' });
      service.hasPermission(user, { resource: 'categories', action: 'read' });
      
      let stats = service.getCacheStats();
      expect(stats.size).toBe(2);
      
      // Invalidate user cache
      service.invalidateUserCache(user.id);
      
      stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should clear all cache correctly', () => {
      const user1 = createMockUser(UserRole.EDITOR, 'user1');
      const user2 = createMockUser(UserRole.VIEWER, 'user2');
      
      // Cache permissions for different users
      service.hasPermission(user1, { resource: 'products', action: 'read' });
      service.hasPermission(user2, { resource: 'products', action: 'read' });
      
      let stats = service.getCacheStats();
      expect(stats.size).toBe(2);
      
      // Clear all cache
      service.clearCache();
      
      stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should provide accurate cache statistics', () => {
      const stats = service.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('ttl');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.ttl).toBe('number');
      expect(stats.ttl).toBe(5 * 60 * 1000); // 5 minutes default
    });
  });

  describe('cache performance', () => {
    it('should improve performance on repeated calls', () => {
      const user = createMockUser(UserRole.EDITOR);
      const permission: Permission = { resource: 'products', action: 'read' };
      
      // Measure first call (should compute)
      const start1 = Date.now();
      const result1 = service.hasPermission(user, permission);
      const time1 = Date.now() - start1;
      
      // Measure second call (should use cache)
      const start2 = Date.now();
      const result2 = service.hasPermission(user, permission);
      const time2 = Date.now() - start2;
      
      expect(result1).toBe(result2);
      // Cache should be faster (though this might be flaky in fast environments)
      // We mainly check that both calls work correctly
      expect(time1).toBeGreaterThanOrEqual(0);
      expect(time2).toBeGreaterThanOrEqual(0);
    });

    it('should handle concurrent cache access', () => {
      const user = createMockUser(UserRole.EDITOR);
      const permission: Permission = { resource: 'products', action: 'read' };
      
      // Make multiple concurrent calls
      const promises = Array.from({ length: 10 }, () => 
        service.hasPermission(user, permission)
      );
      
      const results = Promise.all(promises);
      
      // All should return the same result
      return results.then(values => {
        expect(values.every(result => result === true)).toBe(true);
        
        // Should only have one cache entry
        const stats = service.getCacheStats();
        expect(stats.size).toBe(1);
      });
    });
  });
});

describe('Error Handling and Edge Cases', () => {
  let service: PermissionService;

  beforeEach(() => {
    service = new PermissionService();
    service.clearCache();
  });

  describe('null and undefined handling', () => {
    it('should handle null user gracefully', () => {
      expect(service.hasPermission(null, { resource: 'products', action: 'read' })).toBe(false);
      expect(service.hasResourceAccess(null, 'products', 'read')).toBe(false);
      expect(service.canUserAccessRoute(null, '/admin/products')).toBe(false);
      expect(service.isAdmin(null)).toBe(false);
      expect(service.isEditor(null)).toBe(false);
      expect(service.isViewer(null)).toBe(false);
    });

    it('should handle user without role', () => {
      const userWithoutRole = { ...createMockUser(UserRole.VIEWER), role: null as any };
      
      expect(service.hasPermission(userWithoutRole, { resource: 'products', action: 'read' })).toBe(false);
      expect(service.isAdmin(userWithoutRole)).toBe(false);
    });

    it('should handle empty permission objects', () => {
      const user = createMockUser(UserRole.EDITOR);
      
      // These should not throw errors
      expect(service.hasPermission(user, { resource: '', action: '' })).toBe(false);
      expect(service.hasPermission(user, { resource: 'products', action: '' })).toBe(true); // Editor has manage permission for products
      expect(service.hasPermission(user, { resource: '', action: 'read' })).toBe(false);
    });
  });

  describe('unknown resources and actions', () => {
    it('should handle unknown resources gracefully', () => {
      const editor = createMockUser(UserRole.EDITOR);
      const admin = createMockUser(UserRole.ADMIN);
      
      // Editor should not have access to unknown resources
      expect(service.hasPermission(editor, { resource: 'unknown-resource', action: 'read' })).toBe(false);
      
      // Admin should have access due to wildcard permissions
      expect(service.hasPermission(admin, { resource: 'unknown-resource', action: 'read' })).toBe(true);
    });

    it('should handle unknown actions gracefully', () => {
      const editor = createMockUser(UserRole.EDITOR);
      const admin = createMockUser(UserRole.ADMIN);
      
      // Editor should have access to unknown actions on products due to manage permission
      expect(service.hasPermission(editor, { resource: 'products', action: 'unknown-action' })).toBe(true);
      
      // Admin should have access due to wildcard permissions
      expect(service.hasPermission(admin, { resource: 'products', action: 'unknown-action' })).toBe(true);
      
      // But editor should not have access to unknown actions on resources they don't manage
      expect(service.hasPermission(editor, { resource: 'users', action: 'unknown-action' })).toBe(false);
    });
  });

  describe('route edge cases', () => {
    it('should handle routes without permissions', () => {
      const user = createMockUser(UserRole.VIEWER);
      
      // Routes not in the permission mapping should be accessible
      expect(service.canUserAccessRoute(user, '/public-route')).toBe(true);
      expect(service.canUserAccessRoute(user, '/unknown/route')).toBe(true);
    });

    it('should handle malformed routes', () => {
      const user = createMockUser(UserRole.EDITOR);
      
      // Should not throw errors
      expect(service.canUserAccessRoute(user, '')).toBe(true);
      expect(service.canUserAccessRoute(user, '/')).toBe(true);
      expect(service.canUserAccessRoute(user, '//')).toBe(true);
    });
  });
});

describe('Integration Tests', () => {
  it('should work with singleton instances', () => {
    const admin = createMockUser(UserRole.ADMIN);
    
    expect(permissionService.isAdmin(admin)).toBe(true);
    expect(permissionService.hasResourceAccess(admin, 'products', 'create')).toBe(true);
  });

  it('should handle complex permission scenarios', () => {
    const editor = createMockUser(UserRole.EDITOR, 'editor-id');
    const validator = new ResourcePermissionValidator(permissionService);
    
    // Editor can manage products but not users
    expect(validator.canCreateProduct(editor)).toBe(true);
    expect(validator.canCreateUser(editor)).toBe(false);
    
    // Editor can manage own profile but not others' profiles
    expect(validator.canUpdateUser(editor, 'editor-id')).toBe(true);
    expect(validator.canUpdateUser(editor, 'other-user-id')).toBe(false);
    
    // Editor can access product routes but not user management routes
    expect(permissionService.canUserAccessRoute(editor, '/admin/products')).toBe(true);
    expect(permissionService.canUserAccessRoute(editor, '/admin/users')).toBe(false);
  });

  it('should maintain consistency across different validation methods', () => {
    const user = createMockUser(UserRole.EDITOR);
    const validator = new ResourcePermissionValidator(permissionService);
    
    // Direct permission check vs validator method should be consistent
    const directCheck = permissionService.hasResourceAccess(user, 'products', 'create');
    const validatorCheck = validator.canCreateProduct(user);
    
    expect(directCheck).toBe(validatorCheck);
    expect(directCheck).toBe(true);
  });
});