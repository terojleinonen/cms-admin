/**
 * Client-side Permission Service
 * Lightweight version without Redis dependencies for browser usage
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
 * Client-side Permission Service
 * Lightweight version without server-side dependencies
 */
export class ClientPermissionService {
  /**
   * Check if user has specific permission
   */
  hasPermission(user: User | null, permission: Permission): boolean {
    if (!user || !user.role) return false;
    
    return this.validatePermission(user, permission);
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

// Singleton instance for client-side use
export const permissionService = new ClientPermissionService();

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
}