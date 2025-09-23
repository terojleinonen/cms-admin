/**
 * Tests for Permission Configuration System
 */

import { UserRole } from '@prisma/client';
import {
  PermissionConfigManager,
  DEFAULT_PERMISSION_CONFIG,
  getEnvironmentConfig,
  RoleConfig,
  RouteConfig
} from '../../app/lib/permission-config';

describe('PermissionConfigManager', () => {
  let configManager: PermissionConfigManager;

  beforeEach(() => {
    // Create fresh instance with deep copy of default config
    configManager = new PermissionConfigManager(JSON.parse(JSON.stringify(DEFAULT_PERMISSION_CONFIG)));
  });

  describe('basic configuration management', () => {
    it('should initialize with default configuration', () => {
      const config = configManager.getConfig();
      
      expect(config).toBeDefined();
      expect(config.roles).toHaveLength(3);
      expect(config.resources).toHaveLength(11);
      expect(config.routes).toHaveLength(16);
    });

    it('should update configuration', () => {
      const newCacheConfig = {
        cache: {
          ttl: 10 * 60 * 1000,
          enableDistributed: true,
          warmupOnStart: false,
          cleanupInterval: 30 * 60 * 1000
        }
      };

      configManager.updateConfig(newCacheConfig);
      const config = configManager.getConfig();

      expect(config.cache.ttl).toBe(10 * 60 * 1000);
      expect(config.cache.enableDistributed).toBe(true);
      expect(config.cache.warmupOnStart).toBe(false);
    });
  });

  describe('role management', () => {
    it('should get role configuration', () => {
      const adminRole = configManager.getRoleConfig(UserRole.ADMIN);
      
      expect(adminRole).toBeDefined();
      expect(adminRole?.role).toBe(UserRole.ADMIN);
      expect(adminRole?.name).toBe('Administrator');
      expect(adminRole?.hierarchy).toBe(3);
    });

    it('should get all roles', () => {
      const roles = configManager.getAllRoles();
      
      expect(roles).toHaveLength(3);
      expect(roles.map(r => r.role)).toContain(UserRole.ADMIN);
      expect(roles.map(r => r.role)).toContain(UserRole.EDITOR);
      expect(roles.map(r => r.role)).toContain(UserRole.VIEWER);
    });

    it('should add custom role', () => {
      const customRole: RoleConfig = {
        role: 'MODERATOR' as UserRole,
        name: 'Moderator',
        description: 'Content moderation role',
        hierarchy: 1.5,
        permissions: [
          { resource: 'products', action: 'read', scope: 'all' },
          { resource: 'products', action: 'update', scope: 'all' }
        ]
      };

      configManager.addCustomRole(customRole);
      const roles = configManager.getAllRoles();

      expect(roles).toHaveLength(4);
      
      const addedRole = configManager.getRoleConfig('MODERATOR' as UserRole);
      expect(addedRole).toBeDefined();
      expect(addedRole?.isCustom).toBe(true);
      expect(addedRole?.createdAt).toBeDefined();
      expect(addedRole?.updatedAt).toBeDefined();
    });

    it('should update role permissions', () => {
      const newPermissions = [
        { resource: 'products', action: 'read', scope: 'all' }
      ];

      configManager.updateRolePermissions(UserRole.VIEWER, newPermissions);
      const viewerRole = configManager.getRoleConfig(UserRole.VIEWER);

      expect(viewerRole?.permissions).toHaveLength(1);
      expect(viewerRole?.permissions[0].resource).toBe('products');
      expect(viewerRole?.updatedAt).toBeDefined();
    });

    it('should remove custom role', () => {
      // Add custom role first
      const customRole: RoleConfig = {
        role: 'TEMP' as UserRole,
        name: 'Temporary',
        description: 'Temporary role',
        hierarchy: 0.5,
        permissions: []
      };

      configManager.addCustomRole(customRole);
      expect(configManager.getAllRoles()).toHaveLength(4);

      // Remove custom role
      const removed = configManager.removeCustomRole('TEMP' as UserRole);
      expect(removed).toBe(true);
      expect(configManager.getAllRoles()).toHaveLength(3);

      // Try to remove non-custom role
      const notRemoved = configManager.removeCustomRole(UserRole.ADMIN);
      expect(notRemoved).toBe(false);
    });
  });

  describe('resource management', () => {
    it('should get resource configuration', () => {
      const productsResource = configManager.getResourceConfig('products');
      
      expect(productsResource).toBeDefined();
      expect(productsResource?.name).toBe('products');
      expect(productsResource?.displayName).toBe('Products');
      expect(productsResource?.actions).toHaveLength(5);
      expect(productsResource?.scopes).toHaveLength(2);
    });

    it('should get all resources', () => {
      const resources = configManager.getAllResources();
      
      expect(resources).toHaveLength(11);
      expect(resources.map(r => r.name)).toContain('products');
      expect(resources.map(r => r.name)).toContain('users');
      expect(resources.map(r => r.name)).toContain('categories');
    });
  });

  describe('route management', () => {
    it('should get route configuration', () => {
      const adminRoute = configManager.getRouteConfig('/admin');
      
      expect(adminRoute).toBeDefined();
      expect(adminRoute?.pattern).toBe('/admin');
      expect(adminRoute?.permissions).toHaveLength(1);
      expect(adminRoute?.description).toBe('Admin dashboard');
    });

    it('should get all routes', () => {
      const routes = configManager.getAllRoutes();
      
      expect(routes).toHaveLength(16);
      expect(routes.map(r => r.pattern)).toContain('/admin');
      expect(routes.map(r => r.pattern)).toContain('/admin/users');
    });

    it('should add route configuration', () => {
      const newRoute: RouteConfig = {
        pattern: '/admin/reports',
        permissions: [{ resource: 'analytics', action: 'read', scope: 'all' }],
        description: 'Reports dashboard'
      };

      configManager.addRouteConfig(newRoute);
      const routes = configManager.getAllRoutes();

      expect(routes).toHaveLength(17);
      
      const addedRoute = configManager.getRouteConfig('/admin/reports');
      expect(addedRoute).toBeDefined();
      expect(addedRoute?.description).toBe('Reports dashboard');
    });
  });

  describe('configuration validation', () => {
    it('should validate valid configuration', () => {
      const validation = configManager.validateConfig();
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid configuration - no roles', () => {
      configManager.updateConfig({ roles: [] });
      const validation = configManager.validateConfig();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('At least one role must be defined');
    });

    it('should detect invalid configuration - duplicate hierarchy', () => {
      const roles = configManager.getAllRoles();
      roles[0].hierarchy = roles[1].hierarchy; // Create duplicate
      
      configManager.updateConfig({ roles });
      const validation = configManager.validateConfig();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Role hierarchy levels must be unique');
    });

    it('should detect invalid configuration - no resources', () => {
      configManager.updateConfig({ resources: [] });
      const validation = configManager.validateConfig();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('At least one resource must be defined');
    });

    it('should detect invalid configuration - duplicate resource names', () => {
      const resources = configManager.getAllResources();
      resources[0].name = resources[1].name; // Create duplicate
      
      configManager.updateConfig({ resources });
      const validation = configManager.validateConfig();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Resource names must be unique');
    });

    it('should detect invalid configuration - unknown resource reference', () => {
      const roles = configManager.getAllRoles();
      roles[0].permissions.push({ resource: 'unknown', action: 'read', scope: 'all' });
      
      configManager.updateConfig({ roles });
      const validation = configManager.validateConfig();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('unknown resource: unknown'))).toBe(true);
    });

    it('should detect invalid cache configuration', () => {
      configManager.updateConfig({
        cache: {
          ttl: -1000,
          enableDistributed: false,
          warmupOnStart: false,
          cleanupInterval: 60000
        }
      });
      
      const validation = configManager.validateConfig();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Cache TTL must be positive');
    });

    it('should detect invalid security configuration', () => {
      configManager.updateConfig({
        security: {
          enableAuditLogging: true,
          enableSecurityMonitoring: true,
          maxFailedAttempts: -1,
          lockoutDuration: -1000,
          sessionTimeout: 86400000
        }
      });
      
      const validation = configManager.validateConfig();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Max failed attempts must be positive');
      expect(validation.errors).toContain('Lockout duration must be positive');
    });
  });

  describe('import/export', () => {
    it('should export configuration to JSON', () => {
      const jsonConfig = configManager.exportConfig();
      
      expect(jsonConfig).toBeDefined();
      expect(() => JSON.parse(jsonConfig)).not.toThrow();
      
      const parsed = JSON.parse(jsonConfig);
      expect(parsed.roles).toBeDefined();
      expect(parsed.resources).toBeDefined();
      expect(parsed.routes).toBeDefined();
    });

    it('should import valid configuration from JSON', () => {
      const originalConfig = configManager.getConfig();
      const jsonConfig = configManager.exportConfig();
      
      // Modify config
      configManager.updateConfig({
        cache: { ...originalConfig.cache, ttl: 999999 }
      });
      
      // Import original config
      const result = configManager.importConfig(jsonConfig);
      
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      
      const importedConfig = configManager.getConfig();
      expect(importedConfig.cache.ttl).toBe(originalConfig.cache.ttl);
    });

    it('should handle invalid JSON import', () => {
      const result = configManager.importConfig('invalid json');
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid JSON');
    });
  });
});

describe('DEFAULT_PERMISSION_CONFIG', () => {
  let freshConfig: typeof DEFAULT_PERMISSION_CONFIG;

  beforeEach(() => {
    // Create a fresh copy for each test
    freshConfig = JSON.parse(JSON.stringify(DEFAULT_PERMISSION_CONFIG));
  });

  it('should have valid default configuration', () => {
    const configManager = new PermissionConfigManager(freshConfig);
    const validation = configManager.validateConfig();
    
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should have all required roles', () => {
    expect(freshConfig.roles).toHaveLength(3);
    
    const roleNames = freshConfig.roles.map(r => r.role);
    expect(roleNames).toContain(UserRole.ADMIN);
    expect(roleNames).toContain(UserRole.EDITOR);
    expect(roleNames).toContain(UserRole.VIEWER);
  });

  it('should have proper role hierarchy', () => {
    const admin = freshConfig.roles.find(r => r.role === UserRole.ADMIN);
    const editor = freshConfig.roles.find(r => r.role === UserRole.EDITOR);
    const viewer = freshConfig.roles.find(r => r.role === UserRole.VIEWER);
    
    expect(admin?.hierarchy).toBe(3);
    expect(editor?.hierarchy).toBe(2);
    expect(viewer?.hierarchy).toBe(1);
  });

  it('should have comprehensive resource definitions', () => {
    const resourceNames = freshConfig.resources.map(r => r.name);
    
    expect(resourceNames).toContain('products');
    expect(resourceNames).toContain('categories');
    expect(resourceNames).toContain('pages');
    expect(resourceNames).toContain('media');
    expect(resourceNames).toContain('users');
    expect(resourceNames).toContain('orders');
    expect(resourceNames).toContain('profile');
    expect(resourceNames).toContain('settings');
    expect(resourceNames).toContain('security');
    expect(resourceNames).toContain('audit');
    expect(resourceNames).toContain('monitoring');
  });
});

describe('getEnvironmentConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return default values when no env vars set', () => {
    delete process.env.PERMISSION_CACHE_TTL;
    delete process.env.NODE_ENV;
    delete process.env.REDIS_URL;
    
    const config = getEnvironmentConfig();
    
    expect(config.cache?.ttl).toBe(5 * 60 * 1000);
    expect(config.cache?.enableDistributed).toBe(false);
    expect(config.cache?.redisUrl).toBeUndefined();
  });

  it('should use environment variables when set', () => {
    process.env.PERMISSION_CACHE_TTL = '600000';
    process.env.NODE_ENV = 'production';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.PERMISSION_CACHE_WARMUP = 'true';
    process.env.MAX_FAILED_ATTEMPTS = '3';
    
    const config = getEnvironmentConfig();
    
    expect(config.cache?.ttl).toBe(600000);
    expect(config.cache?.enableDistributed).toBe(true);
    expect(config.cache?.redisUrl).toBe('redis://localhost:6379');
    expect(config.cache?.warmupOnStart).toBe(true);
    expect(config.security?.maxFailedAttempts).toBe(3);
  });

  it('should handle boolean environment variables', () => {
    process.env.ENABLE_AUDIT_LOGGING = 'false';
    process.env.ENABLE_SECURITY_MONITORING = 'false';
    
    const config = getEnvironmentConfig();
    
    expect(config.security?.enableAuditLogging).toBe(false);
    expect(config.security?.enableSecurityMonitoring).toBe(false);
  });
});