/**
 * Simplified Permission System
 * Replaces complex resource-action-scope model with basic role-based permissions
 */

import { UserRole } from '@prisma/client';
import { User } from './types';

// Simple role-based permissions
export type SimpleUserRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

// Simple permission model - just role checks
export const ROLE_PERMISSIONS: Record<SimpleUserRole, string[]> = {
  ADMIN: ['*'], // All permissions
  EDITOR: [
    'products:*', 
    'categories:*', 
    'media:*', 
    'pages:*',
    'orders:read',
    'profile:*'
  ],
  VIEWER: [
    'products:read', 
    'categories:read', 
    'media:read', 
    'pages:read',
    'orders:read',
    'profile:*'
  ]
};

/**
 * Simple Permission Service
 * Basic role-based permission checking without caching or complex abstractions
 */
export class SimplePermissionService {
  /**
   * Check if user has permission based on role
   */
  hasPermission(user: User | null, resource: string, action: string = 'read'): boolean {
    if (!user || !user.role) return false;
    
    const userPermissions = ROLE_PERMISSIONS[user.role as SimpleUserRole] || [];
    
    // Check for admin wildcard
    if (userPermissions.includes('*')) return true;
    
    // Check for resource wildcard
    if (userPermissions.includes(`${resource}:*`)) return true;
    
    // Check for specific permission
    if (userPermissions.includes(`${resource}:${action}`)) return true;
    
    return false;
  }

  /**
   * Check if user is admin
   */
  isAdmin(user: User | null): boolean {
    return user?.role === 'ADMIN';
  }

  /**
   * Check if user is editor or higher
   */
  isEditor(user: User | null): boolean {
    return user?.role === 'ADMIN' || user?.role === 'EDITOR';
  }

  /**
   * Check if user is viewer or higher (any authenticated user)
   */
  isViewer(user: User | null): boolean {
    return user?.role === 'ADMIN' || user?.role === 'EDITOR' || user?.role === 'VIEWER';
  }

  /**
   * Check if user can access route based on simple role hierarchy
   */
  canAccessRoute(user: User | null, route: string): boolean {
    if (!user) return false;
    
    // Admin can access everything
    if (this.isAdmin(user)) return true;
    
    // Simple route-based access control
    if (route.startsWith('/admin/')) {
      // Only admins can access admin routes
      return this.isAdmin(user);
    }
    
    if (route.startsWith('/api/admin/')) {
      // Only admins can access admin API routes
      return this.isAdmin(user);
    }
    
    // Editor routes
    const editorRoutes = ['/products', '/categories', '/media', '/pages'];
    if (editorRoutes.some(r => route.startsWith(r))) {
      return this.isEditor(user);
    }
    
    // All authenticated users can access profile and basic routes
    return this.isViewer(user);
  }

  /**
   * Get user's role level (for hierarchy checks)
   */
  getRoleLevel(user: User | null): number {
    if (!user) return 0;
    
    switch (user.role) {
      case 'ADMIN': return 3;
      case 'EDITOR': return 2;
      case 'VIEWER': return 1;
      default: return 0;
    }
  }

  /**
   * Check if user can manage another user (must have higher role)
   */
  canManageUser(manager: User | null, target: User | null): boolean {
    if (!manager || !target) return false;
    
    const managerLevel = this.getRoleLevel(manager);
    const targetLevel = this.getRoleLevel(target);
    
    return managerLevel > targetLevel;
  }
}

// Singleton instance
export const simplePermissionService = new SimplePermissionService();

// Legacy compatibility functions
export function hasPermission(session: { user?: User } | null, permission: string): boolean {
  if (!session?.user) return false;
  
  // Map legacy permission strings to resource:action format
  const permissionMap: Record<string, { resource: string; action: string }> = {
    'create': { resource: 'products', action: 'create' },
    'read': { resource: 'products', action: 'read' },
    'update': { resource: 'products', action: 'update' },
    'delete': { resource: 'products', action: 'delete' },
    'preview': { resource: 'pages', action: 'read' },
  };
  
  const mapped = permissionMap[permission];
  if (!mapped) return false;
  
  return simplePermissionService.hasPermission(session.user, mapped.resource, mapped.action);
}

/**
 * Simple route permission checker for middleware
 */
export function hasRoutePermissions(
  userRole: string | null,
  userId: string | null,
  route: string
): boolean {
  if (!userRole || !userId) return false;
  
  const user = { id: userId, role: userRole } as User;
  return simplePermissionService.canAccessRoute(user, route);
}

/**
 * Resource-specific permission helpers
 */
export const PermissionHelpers = {
  // Product permissions
  canCreateProduct: (user: User | null) => simplePermissionService.hasPermission(user, 'products', 'create'),
  canReadProduct: (user: User | null) => simplePermissionService.hasPermission(user, 'products', 'read'),
  canUpdateProduct: (user: User | null) => simplePermissionService.hasPermission(user, 'products', 'update'),
  canDeleteProduct: (user: User | null) => simplePermissionService.hasPermission(user, 'products', 'delete'),
  
  // Category permissions
  canCreateCategory: (user: User | null) => simplePermissionService.hasPermission(user, 'categories', 'create'),
  canReadCategory: (user: User | null) => simplePermissionService.hasPermission(user, 'categories', 'read'),
  canUpdateCategory: (user: User | null) => simplePermissionService.hasPermission(user, 'categories', 'update'),
  canDeleteCategory: (user: User | null) => simplePermissionService.hasPermission(user, 'categories', 'delete'),
  
  // Page permissions
  canCreatePage: (user: User | null) => simplePermissionService.hasPermission(user, 'pages', 'create'),
  canReadPage: (user: User | null) => simplePermissionService.hasPermission(user, 'pages', 'read'),
  canUpdatePage: (user: User | null) => simplePermissionService.hasPermission(user, 'pages', 'update'),
  canDeletePage: (user: User | null) => simplePermissionService.hasPermission(user, 'pages', 'delete'),
  
  // Media permissions
  canCreateMedia: (user: User | null) => simplePermissionService.hasPermission(user, 'media', 'create'),
  canReadMedia: (user: User | null) => simplePermissionService.hasPermission(user, 'media', 'read'),
  canUpdateMedia: (user: User | null) => simplePermissionService.hasPermission(user, 'media', 'update'),
  canDeleteMedia: (user: User | null) => simplePermissionService.hasPermission(user, 'media', 'delete'),
  
  // User management permissions
  canCreateUser: (user: User | null) => simplePermissionService.isAdmin(user),
  canReadUser: (user: User | null) => simplePermissionService.isAdmin(user),
  canUpdateUser: (user: User | null) => simplePermissionService.isAdmin(user),
  canDeleteUser: (user: User | null) => simplePermissionService.isAdmin(user),
  
  // Order permissions
  canReadOrder: (user: User | null) => simplePermissionService.hasPermission(user, 'orders', 'read'),
  
  // Analytics permissions
  canReadAnalytics: (user: User | null) => simplePermissionService.isAdmin(user),
  
  // Security permissions
  canReadSecurity: (user: User | null) => simplePermissionService.isAdmin(user),
  canManageSecurity: (user: User | null) => simplePermissionService.isAdmin(user),
  
  // System settings permissions
  canReadSettings: (user: User | null) => simplePermissionService.isAdmin(user),
  canUpdateSettings: (user: User | null) => simplePermissionService.isAdmin(user),
  canManageSettings: (user: User | null) => simplePermissionService.isAdmin(user),
};