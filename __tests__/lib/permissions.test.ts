/**
 * Comprehensive unit tests for Permission Service
 * Tests all permission validation methods and role hierarchy logic
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

describe('Integration Tests', () => {
  it('should work with singleton instances', () => {
    const admin = createMockUser(UserRole.ADMIN);
    
    expect(permissionService.isAdmin(admin)).toBe(true);
    expect(resourceValidator.canCreateProduct(admin)).toBe(true);
    expect(roleHierarchy.hasMinimumRole(UserRole.ADMIN, UserRole.VIEWER)).toBe(true);
  });

  it('should handle complex permission scenarios', () => {
    const editor = createMockUser(UserRole.EDITOR, 'editor-id');
    
    // Editor can manage products but not users
    expect(resourceValidator.canCreateProduct(editor)).toBe(true);
    expect(resourceValidator.canCreateUser(editor)).toBe(false);
    
    // Editor can manage own profile but not others' profiles
    expect(resourceValidator.canUpdateUser(editor, 'editor-id')).toBe(true);
    expect(resourceValidator.canUpdateUser(editor, 'other-user-id')).toBe(false);
    
    // Editor can access product routes but not user management routes
    expect(permissionService.canUserAccessRoute(editor, '/admin/products')).toBe(true);
    expect(permissionService.canUserAccessRoute(editor, '/admin/users')).toBe(false);
  });
});