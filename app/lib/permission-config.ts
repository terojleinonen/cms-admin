/**
 * Permission Configuration System
 * Centralized configuration for roles, permissions, and system settings
 */

import { UserRole } from '@prisma/client';
import { Permission, RolePermission } from './types';

/**
 * Configuration interfaces
 */
export interface PermissionConfig {
  roles: RoleConfig[];
  resources: ResourceConfig[];
  routes: RouteConfig[];
  cache: CacheConfigOptions;
  security: SecurityConfig;
}

export interface RoleConfig {
  role: UserRole;
  name: string;
  description: string;
  permissions: Permission[];
  hierarchy: number;
  isCustom?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ResourceConfig {
  name: string;
  displayName: string;
  description: string;
  actions: ActionConfig[];
  scopes: ScopeConfig[];
}

export interface ActionConfig {
  name: string;
  displayName: string;
  description: string;
  requiresOwnership?: boolean;
}

export interface ScopeConfig {
  name: string;
  displayName: string;
  description: string;
}

export interface RouteConfig {
  pattern: string;
  permissions: Permission[];
  description: string;
  isPublic?: boolean;
}

export interface CacheConfigOptions {
  ttl: number;
  enableDistributed: boolean;
  redisUrl?: string;
  warmupOnStart: boolean;
  cleanupInterval: number;
}

export interface SecurityConfig {
  enableAuditLogging: boolean;
  enableSecurityMonitoring: boolean;
  maxFailedAttempts: number;
  lockoutDuration: number;
  sessionTimeout: number;
}

/**
 * Default permission configuration
 */
export const DEFAULT_PERMISSION_CONFIG: PermissionConfig = {
  roles: [
    {
      role: UserRole.ADMIN,
      name: 'Administrator',
      description: 'Full system access including user management and system settings',
      hierarchy: 3,
      permissions: [
        { resource: '*', action: 'manage', scope: 'all' },
        { resource: 'users', action: 'create', scope: 'all' },
        { resource: 'users', action: 'read', scope: 'all' },
        { resource: 'users', action: 'update', scope: 'all' },
        { resource: 'users', action: 'delete', scope: 'all' },
        { resource: 'users', action: 'manage', scope: 'all' },
        { resource: 'settings', action: 'manage', scope: 'all' },
        { resource: 'security', action: 'manage', scope: 'all' },
        { resource: 'audit', action: 'read', scope: 'all' },
        { resource: 'monitoring', action: 'read', scope: 'all' },
      ]
    },
    {
      role: UserRole.EDITOR,
      name: 'Editor',
      description: 'Can create, edit, and manage content including products, pages, and media',
      hierarchy: 2,
      permissions: [
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
        { resource: 'orders', action: 'read', scope: 'all' },
        { resource: 'profile', action: 'manage', scope: 'own' },
      ]
    },
    {
      role: UserRole.VIEWER,
      name: 'Viewer',
      description: 'Read-only access to content and basic profile management',
      hierarchy: 1,
      permissions: [
        { resource: 'products', action: 'read', scope: 'all' },
        { resource: 'categories', action: 'read', scope: 'all' },
        { resource: 'pages', action: 'read', scope: 'all' },
        { resource: 'media', action: 'read', scope: 'all' },
        { resource: 'orders', action: 'read', scope: 'all' },
        { resource: 'profile', action: 'manage', scope: 'own' },
      ]
    }
  ],

  resources: [
    {
      name: 'products',
      displayName: 'Products',
      description: 'Product catalog management',
      actions: [
        { name: 'create', displayName: 'Create', description: 'Create new products' },
        { name: 'read', displayName: 'Read', description: 'View products' },
        { name: 'update', displayName: 'Update', description: 'Edit existing products' },
        { name: 'delete', displayName: 'Delete', description: 'Remove products' },
        { name: 'manage', displayName: 'Manage', description: 'Full product management' }
      ],
      scopes: [
        { name: 'all', displayName: 'All', description: 'Access to all products' },
        { name: 'own', displayName: 'Own', description: 'Access to own products only' }
      ]
    },
    {
      name: 'categories',
      displayName: 'Categories',
      description: 'Product category management',
      actions: [
        { name: 'create', displayName: 'Create', description: 'Create new categories' },
        { name: 'read', displayName: 'Read', description: 'View categories' },
        { name: 'update', displayName: 'Update', description: 'Edit existing categories' },
        { name: 'delete', displayName: 'Delete', description: 'Remove categories' },
        { name: 'manage', displayName: 'Manage', description: 'Full category management' }
      ],
      scopes: [
        { name: 'all', displayName: 'All', description: 'Access to all categories' }
      ]
    },
    {
      name: 'pages',
      displayName: 'Pages',
      description: 'Content page management',
      actions: [
        { name: 'create', displayName: 'Create', description: 'Create new pages' },
        { name: 'read', displayName: 'Read', description: 'View pages' },
        { name: 'update', displayName: 'Update', description: 'Edit existing pages' },
        { name: 'delete', displayName: 'Delete', description: 'Remove pages' },
        { name: 'manage', displayName: 'Manage', description: 'Full page management' }
      ],
      scopes: [
        { name: 'all', displayName: 'All', description: 'Access to all pages' },
        { name: 'own', displayName: 'Own', description: 'Access to own pages only' }
      ]
    },
    {
      name: 'media',
      displayName: 'Media',
      description: 'Media file management',
      actions: [
        { name: 'create', displayName: 'Upload', description: 'Upload new media files' },
        { name: 'read', displayName: 'View', description: 'View media files' },
        { name: 'update', displayName: 'Edit', description: 'Edit media metadata' },
        { name: 'delete', displayName: 'Delete', description: 'Remove media files' },
        { name: 'manage', displayName: 'Manage', description: 'Full media management' }
      ],
      scopes: [
        { name: 'all', displayName: 'All', description: 'Access to all media' },
        { name: 'own', displayName: 'Own', description: 'Access to own media only' }
      ]
    },
    {
      name: 'users',
      displayName: 'Users',
      description: 'User account management',
      actions: [
        { name: 'create', displayName: 'Create', description: 'Create new user accounts' },
        { name: 'read', displayName: 'Read', description: 'View user accounts' },
        { name: 'update', displayName: 'Update', description: 'Edit user accounts' },
        { name: 'delete', displayName: 'Delete', description: 'Remove user accounts' },
        { name: 'manage', displayName: 'Manage', description: 'Full user management' }
      ],
      scopes: [
        { name: 'all', displayName: 'All', description: 'Access to all users' },
        { name: 'own', displayName: 'Own', description: 'Access to own account only' }
      ]
    },
    {
      name: 'orders',
      displayName: 'Orders',
      description: 'Order management',
      actions: [
        { name: 'read', displayName: 'Read', description: 'View orders' },
        { name: 'update', displayName: 'Update', description: 'Update order status' },
        { name: 'manage', displayName: 'Manage', description: 'Full order management' }
      ],
      scopes: [
        { name: 'all', displayName: 'All', description: 'Access to all orders' }
      ]
    },
    {
      name: 'profile',
      displayName: 'Profile',
      description: 'User profile management',
      actions: [
        { name: 'read', displayName: 'Read', description: 'View profile' },
        { name: 'update', displayName: 'Update', description: 'Edit profile' },
        { name: 'manage', displayName: 'Manage', description: 'Full profile management' }
      ],
      scopes: [
        { name: 'own', displayName: 'Own', description: 'Own profile only' }
      ]
    },
    {
      name: 'settings',
      displayName: 'Settings',
      description: 'System settings management',
      actions: [
        { name: 'read', displayName: 'Read', description: 'View settings' },
        { name: 'update', displayName: 'Update', description: 'Edit settings' },
        { name: 'manage', displayName: 'Manage', description: 'Full settings management' }
      ],
      scopes: [
        { name: 'all', displayName: 'All', description: 'All system settings' }
      ]
    },
    {
      name: 'security',
      displayName: 'Security',
      description: 'Security and audit management',
      actions: [
        { name: 'read', displayName: 'Read', description: 'View security logs' },
        { name: 'manage', displayName: 'Manage', description: 'Full security management' }
      ],
      scopes: [
        { name: 'all', displayName: 'All', description: 'All security features' }
      ]
    },
    {
      name: 'audit',
      displayName: 'Audit',
      description: 'Audit log access',
      actions: [
        { name: 'read', displayName: 'Read', description: 'View audit logs' }
      ],
      scopes: [
        { name: 'all', displayName: 'All', description: 'All audit logs' }
      ]
    },
    {
      name: 'monitoring',
      displayName: 'Monitoring',
      description: 'System monitoring access',
      actions: [
        { name: 'read', displayName: 'Read', description: 'View monitoring data' }
      ],
      scopes: [
        { name: 'all', displayName: 'All', description: 'All monitoring data' }
      ]
    }
  ],

  routes: [
    { pattern: '/admin', permissions: [{ resource: 'admin', action: 'read', scope: 'all' }], description: 'Admin dashboard' },
    { pattern: '/admin/users', permissions: [{ resource: 'users', action: 'read', scope: 'all' }], description: 'User management' },
    { pattern: '/admin/users/new', permissions: [{ resource: 'users', action: 'create', scope: 'all' }], description: 'Create user' },
    { pattern: '/admin/security', permissions: [{ resource: 'security', action: 'read', scope: 'all' }], description: 'Security dashboard' },
    { pattern: '/admin/analytics', permissions: [{ resource: 'analytics', action: 'read', scope: 'all' }], description: 'Analytics dashboard' },
    { pattern: '/admin/monitoring', permissions: [{ resource: 'monitoring', action: 'read', scope: 'all' }], description: 'System monitoring' },
    { pattern: '/admin/products', permissions: [{ resource: 'products', action: 'read', scope: 'all' }], description: 'Product management' },
    { pattern: '/admin/products/new', permissions: [{ resource: 'products', action: 'create', scope: 'all' }], description: 'Create product' },
    { pattern: '/admin/products/[id]/edit', permissions: [{ resource: 'products', action: 'update', scope: 'all' }], description: 'Edit product' },
    { pattern: '/admin/categories', permissions: [{ resource: 'categories', action: 'read', scope: 'all' }], description: 'Category management' },
    { pattern: '/admin/pages', permissions: [{ resource: 'pages', action: 'read', scope: 'all' }], description: 'Page management' },
    { pattern: '/admin/pages/new', permissions: [{ resource: 'pages', action: 'create', scope: 'all' }], description: 'Create page' },
    { pattern: '/admin/pages/[id]/edit', permissions: [{ resource: 'pages', action: 'update', scope: 'all' }], description: 'Edit page' },
    { pattern: '/media', permissions: [{ resource: 'media', action: 'read', scope: 'all' }], description: 'Media library' },
    { pattern: '/profile', permissions: [{ resource: 'profile', action: 'read', scope: 'own' }], description: 'User profile' },
    { pattern: '/settings', permissions: [{ resource: 'profile', action: 'update', scope: 'own' }], description: 'User settings' },
  ],

  cache: {
    ttl: 5 * 60 * 1000, // 5 minutes
    enableDistributed: process.env.NODE_ENV === 'production',
    redisUrl: process.env.REDIS_URL,
    warmupOnStart: true,
    cleanupInterval: 60 * 60 * 1000, // 1 hour
  },

  security: {
    enableAuditLogging: true,
    enableSecurityMonitoring: true,
    maxFailedAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  }
};

/**
 * Permission Configuration Manager
 */
export class PermissionConfigManager {
  private config: PermissionConfig;

  constructor(config: PermissionConfig = DEFAULT_PERMISSION_CONFIG) {
    this.config = config;
  }

  /**
   * Get current configuration
   */
  getConfig(): PermissionConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PermissionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get role configuration
   */
  getRoleConfig(role: UserRole): RoleConfig | undefined {
    return this.config.roles.find(r => r.role === role);
  }

  /**
   * Get all roles
   */
  getAllRoles(): RoleConfig[] {
    return this.config.roles;
  }

  /**
   * Add custom role
   */
  addCustomRole(roleConfig: RoleConfig): void {
    roleConfig.isCustom = true;
    roleConfig.createdAt = new Date();
    roleConfig.updatedAt = new Date();
    this.config.roles.push(roleConfig);
  }

  /**
   * Update role permissions
   */
  updateRolePermissions(role: UserRole, permissions: Permission[]): void {
    const roleConfig = this.getRoleConfig(role);
    if (roleConfig) {
      roleConfig.permissions = permissions;
      roleConfig.updatedAt = new Date();
    }
  }

  /**
   * Remove custom role
   */
  removeCustomRole(role: UserRole): boolean {
    const index = this.config.roles.findIndex(r => r.role === role && r.isCustom);
    if (index !== -1) {
      this.config.roles.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get resource configuration
   */
  getResourceConfig(resourceName: string): ResourceConfig | undefined {
    return this.config.resources.find(r => r.name === resourceName);
  }

  /**
   * Get all resources
   */
  getAllResources(): ResourceConfig[] {
    return this.config.resources;
  }

  /**
   * Get route configuration
   */
  getRouteConfig(pattern: string): RouteConfig | undefined {
    return this.config.routes.find(r => r.pattern === pattern);
  }

  /**
   * Get all routes
   */
  getAllRoutes(): RouteConfig[] {
    return this.config.routes;
  }

  /**
   * Add route configuration
   */
  addRouteConfig(routeConfig: RouteConfig): void {
    this.config.routes.push(routeConfig);
  }

  /**
   * Validate configuration
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate roles
    if (!this.config.roles || this.config.roles.length === 0) {
      errors.push('At least one role must be defined');
    }

    // Validate role hierarchy
    const hierarchyLevels = this.config.roles.map(r => r.hierarchy);
    const uniqueLevels = new Set(hierarchyLevels);
    if (hierarchyLevels.length !== uniqueLevels.size) {
      errors.push('Role hierarchy levels must be unique');
    }

    // Validate resources
    if (!this.config.resources || this.config.resources.length === 0) {
      errors.push('At least one resource must be defined');
    }

    // Validate resource names are unique
    const resourceNames = this.config.resources.map(r => r.name);
    const uniqueResourceNames = new Set(resourceNames);
    if (resourceNames.length !== uniqueResourceNames.size) {
      errors.push('Resource names must be unique');
    }

    // Validate permissions reference valid resources
    for (const role of this.config.roles) {
      for (const permission of role.permissions) {
        if (permission.resource !== '*' && !this.getResourceConfig(permission.resource)) {
          errors.push(`Role ${role.role} references unknown resource: ${permission.resource}`);
        }
      }
    }

    // Validate cache configuration
    if (this.config.cache.ttl <= 0) {
      errors.push('Cache TTL must be positive');
    }

    // Validate security configuration
    if (this.config.security.maxFailedAttempts <= 0) {
      errors.push('Max failed attempts must be positive');
    }

    if (this.config.security.lockoutDuration <= 0) {
      errors.push('Lockout duration must be positive');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Export configuration to JSON
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  importConfig(jsonConfig: string): { success: boolean; errors: string[] } {
    try {
      const config = JSON.parse(jsonConfig) as PermissionConfig;
      
      // Temporarily set the config to validate it
      const originalConfig = this.config;
      this.config = config;
      const validation = this.validateConfig();
      
      if (validation.isValid) {
        // Keep the new config
        return { success: true, errors: [] };
      } else {
        // Restore original config
        this.config = originalConfig;
        return { success: false, errors: validation.errors };
      }
    } catch (error) {
      return { 
        success: false, 
        errors: [`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }
}

// Singleton instance
export const permissionConfigManager = new PermissionConfigManager();

// Environment-based configuration
export function getEnvironmentConfig(): Partial<PermissionConfig> {
  return {
    cache: {
      ttl: process.env.PERMISSION_CACHE_TTL ? parseInt(process.env.PERMISSION_CACHE_TTL) : 5 * 60 * 1000,
      enableDistributed: process.env.NODE_ENV === 'production',
      redisUrl: process.env.REDIS_URL,
      warmupOnStart: process.env.PERMISSION_CACHE_WARMUP === 'true',
      cleanupInterval: process.env.PERMISSION_CACHE_CLEANUP_INTERVAL ? parseInt(process.env.PERMISSION_CACHE_CLEANUP_INTERVAL) : 60 * 60 * 1000,
    },
    security: {
      enableAuditLogging: process.env.ENABLE_AUDIT_LOGGING !== 'false',
      enableSecurityMonitoring: process.env.ENABLE_SECURITY_MONITORING !== 'false',
      maxFailedAttempts: process.env.MAX_FAILED_ATTEMPTS ? parseInt(process.env.MAX_FAILED_ATTEMPTS) : 5,
      lockoutDuration: process.env.LOCKOUT_DURATION ? parseInt(process.env.LOCKOUT_DURATION) : 15 * 60 * 1000,
      sessionTimeout: process.env.SESSION_TIMEOUT ? parseInt(process.env.SESSION_TIMEOUT) : 24 * 60 * 60 * 1000,
    }
  };
}