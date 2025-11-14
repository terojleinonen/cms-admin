/**
 * Comprehensive Route Permission Mapping System
 * Defines permission requirements for all application routes with dynamic resolution
 */

import { Permission } from './types';

/**
 * Route permission configuration interface
 */
export interface RoutePermissionConfig {
  pattern: string;
  permissions: Permission[];
  description: string;
  isPublic?: boolean;
  requiresAuth?: boolean;
  methods?: string[];
  middleware?: string[];
}

/**
 * Dynamic route matcher interface
 */
export interface RouteMatch {
  pattern: string;
  permissions: Permission[];
  params?: Record<string, string>;
  isMatch: boolean;
}

/**
 * Comprehensive route permission mappings
 */
export const ROUTE_PERMISSION_MAPPINGS: RoutePermissionConfig[] = [
  // Public routes (no authentication required)
  {
    pattern: '/',
    permissions: [],
    description: 'Home page',
    isPublic: true
  },
  {
    pattern: '/auth/login',
    permissions: [],
    description: 'Login page',
    isPublic: true
  },
  {
    pattern: '/auth/register',
    permissions: [],
    description: 'Registration page',
    isPublic: true
  },
  {
    pattern: '/auth/password-reset',
    permissions: [],
    description: 'Password reset page',
    isPublic: true
  },

  // Admin Dashboard Routes
  {
    pattern: '/admin',
    permissions: [{ resource: 'admin', action: 'read', scope: 'all' }],
    description: 'Admin dashboard home'
  },
  {
    pattern: '/admin/activity',
    permissions: [{ resource: 'audit', action: 'read', scope: 'all' }],
    description: 'Admin activity monitoring'
  },
  {
    pattern: '/admin/analytics',
    permissions: [{ resource: 'analytics', action: 'read', scope: 'all' }],
    description: 'Admin analytics dashboard'
  },
  {
    pattern: '/admin/analytics/search',
    permissions: [{ resource: 'analytics', action: 'read', scope: 'all' }],
    description: 'Search analytics'
  },

  // API Management Routes
  {
    pattern: '/admin/api',
    permissions: [{ resource: 'api-keys', action: 'read', scope: 'all' }],
    description: 'API management dashboard'
  },
  {
    pattern: '/admin/api/analytics',
    permissions: [{ resource: 'api-keys', action: 'read', scope: 'all' }],
    description: 'API analytics'
  },
  {
    pattern: '/admin/api/documentation',
    permissions: [{ resource: 'api-keys', action: 'read', scope: 'all' }],
    description: 'API documentation'
  },
  {
    pattern: '/admin/api/keys',
    permissions: [{ resource: 'api-keys', action: 'read', scope: 'all' }],
    description: 'API key management'
  },
  {
    pattern: '/admin/api/keys/new',
    permissions: [{ resource: 'api-keys', action: 'create', scope: 'all' }],
    description: 'Create new API key'
  },

  // System Management Routes
  {
    pattern: '/admin/backup',
    permissions: [{ resource: 'system', action: 'manage', scope: 'all' }],
    description: 'System backup management'
  },
  {
    pattern: '/admin/database',
    permissions: [{ resource: 'system', action: 'manage', scope: 'all' }],
    description: 'Database management'
  },
  {
    pattern: '/admin/performance',
    permissions: [{ resource: 'monitoring', action: 'read', scope: 'all' }],
    description: 'Performance monitoring'
  },
  {
    pattern: '/admin/security',
    permissions: [{ resource: 'security', action: 'read', scope: 'all' }],
    description: 'Security dashboard'
  },

  // User Management Routes
  {
    pattern: '/admin/users',
    permissions: [{ resource: 'users', action: 'read', scope: 'all' }],
    description: 'User management dashboard'
  },
  {
    pattern: '/admin/users/[id]',
    permissions: [{ resource: 'users', action: 'read', scope: 'all' }],
    description: 'View specific user'
  },

  // Content Management Routes
  {
    pattern: '/admin/categories',
    permissions: [{ resource: 'categories', action: 'read', scope: 'all' }],
    description: 'Category management'
  },
  {
    pattern: '/admin/pages',
    permissions: [{ resource: 'pages', action: 'read', scope: 'all' }],
    description: 'Page management'
  },
  {
    pattern: '/admin/pages/new',
    permissions: [{ resource: 'pages', action: 'create', scope: 'all' }],
    description: 'Create new page'
  },
  {
    pattern: '/admin/pages/[id]',
    permissions: [{ resource: 'pages', action: 'read', scope: 'all' }],
    description: 'View specific page'
  },
  {
    pattern: '/admin/pages/[id]/edit',
    permissions: [{ resource: 'pages', action: 'update', scope: 'all' }],
    description: 'Edit specific page'
  },

  // Product Management Routes
  {
    pattern: '/admin/products',
    permissions: [{ resource: 'products', action: 'read', scope: 'all' }],
    description: 'Product management dashboard'
  },
  {
    pattern: '/admin/products/new',
    permissions: [{ resource: 'products', action: 'create', scope: 'all' }],
    description: 'Create new product'
  },
  {
    pattern: '/admin/products/[id]',
    permissions: [{ resource: 'products', action: 'read', scope: 'all' }],
    description: 'View specific product'
  },
  {
    pattern: '/admin/products/[id]/edit',
    permissions: [{ resource: 'products', action: 'update', scope: 'all' }],
    description: 'Edit specific product'
  },

  // Workflow Management Routes
  {
    pattern: '/admin/workflow',
    permissions: [{ resource: 'workflow', action: 'read', scope: 'all' }],
    description: 'Workflow management'
  },

  // Media Management Routes
  {
    pattern: '/media',
    permissions: [{ resource: 'media', action: 'read', scope: 'all' }],
    description: 'Media library'
  },

  // User Profile Routes
  {
    pattern: '/profile',
    permissions: [{ resource: 'profile', action: 'read', scope: 'own' }],
    description: 'User profile page',
    requiresAuth: true
  },
  {
    pattern: '/settings',
    permissions: [{ resource: 'profile', action: 'update', scope: 'own' }],
    description: 'User settings page',
    requiresAuth: true
  },

  // General User Routes
  {
    pattern: '/users',
    permissions: [{ resource: 'users', action: 'read', scope: 'all' }],
    description: 'User listing page'
  },
  {
    pattern: '/orders',
    permissions: [{ resource: 'orders', action: 'read', scope: 'all' }],
    description: 'Orders page'
  },

  // API Routes - Authentication
  {
    pattern: '/api/auth/[...nextauth]',
    permissions: [],
    description: 'NextAuth.js authentication endpoints',
    isPublic: true,
    methods: ['GET', 'POST']
  },
  {
    pattern: '/api/auth/login',
    permissions: [],
    description: 'Login API endpoint',
    isPublic: true,
    methods: ['POST']
  },
  {
    pattern: '/api/auth/register',
    permissions: [],
    description: 'Registration API endpoint',
    isPublic: true,
    methods: ['POST']
  },
  {
    pattern: '/api/auth/password-reset',
    permissions: [],
    description: 'Password reset API endpoint',
    isPublic: true,
    methods: ['POST']
  },
  {
    pattern: '/api/auth/password-reset/verify',
    permissions: [],
    description: 'Password reset verification API endpoint',
    isPublic: true,
    methods: ['POST']
  },
  {
    pattern: '/api/auth/me',
    permissions: [{ resource: 'profile', action: 'read', scope: 'own' }],
    description: 'Get current user info',
    methods: ['GET']
  },
  {
    pattern: '/api/auth/token',
    permissions: [{ resource: 'profile', action: 'read', scope: 'own' }],
    description: 'Token management',
    methods: ['GET', 'POST']
  },

  // API Routes - Admin Management
  {
    pattern: '/api/admin/api-keys',
    permissions: [{ resource: 'api-keys', action: 'read', scope: 'all' }],
    description: 'API key management endpoints',
    methods: ['GET', 'POST']
  },
  {
    pattern: '/api/admin/api-keys/[id]',
    permissions: [{ resource: 'api-keys', action: 'update', scope: 'all' }],
    description: 'Specific API key management',
    methods: ['GET', 'PUT', 'DELETE']
  },
  {
    pattern: '/api/admin/api-keys/[id]/stats',
    permissions: [{ resource: 'api-keys', action: 'read', scope: 'all' }],
    description: 'API key statistics',
    methods: ['GET']
  },
  {
    pattern: '/api/admin/audit-logs',
    permissions: [{ resource: 'audit', action: 'read', scope: 'all' }],
    description: 'Audit log endpoints',
    methods: ['GET']
  },
  {
    pattern: '/api/admin/audit-logs/retention',
    permissions: [{ resource: 'audit', action: 'manage', scope: 'all' }],
    description: 'Audit log retention management',
    methods: ['POST', 'DELETE']
  },
  {
    pattern: '/api/admin/audit-logs/stats',
    permissions: [{ resource: 'audit', action: 'read', scope: 'all' }],
    description: 'Audit log statistics',
    methods: ['GET']
  },

  // API Routes - Backup Management
  {
    pattern: '/api/admin/backup',
    permissions: [{ resource: 'system', action: 'manage', scope: 'all' }],
    description: 'System backup endpoints',
    methods: ['GET', 'POST']
  },
  {
    pattern: '/api/admin/backup/restore',
    permissions: [{ resource: 'system', action: 'manage', scope: 'all' }],
    description: 'System restore endpoints',
    methods: ['POST']
  },
  {
    pattern: '/api/admin/backup/status/[id]',
    permissions: [{ resource: 'system', action: 'read', scope: 'all' }],
    description: 'Backup status endpoints',
    methods: ['GET']
  },

  // API Routes - Data Management
  {
    pattern: '/api/admin/data-retention/cleanup',
    permissions: [{ resource: 'system', action: 'manage', scope: 'all' }],
    description: 'Data retention cleanup',
    methods: ['POST']
  },
  {
    pattern: '/api/admin/data-retention/preview',
    permissions: [{ resource: 'system', action: 'read', scope: 'all' }],
    description: 'Data retention preview',
    methods: ['GET']
  },

  // API Routes - Database Management
  {
    pattern: '/api/admin/database/config',
    permissions: [{ resource: 'system', action: 'manage', scope: 'all' }],
    description: 'Database configuration',
    methods: ['GET', 'PUT']
  },
  {
    pattern: '/api/admin/database/health',
    permissions: [{ resource: 'system', action: 'read', scope: 'all' }],
    description: 'Database health check',
    methods: ['GET']
  },

  // API Routes - Monitoring
  {
    pattern: '/api/admin/monitoring',
    permissions: [{ resource: 'monitoring', action: 'read', scope: 'all' }],
    description: 'System monitoring endpoints',
    methods: ['GET']
  },
  {
    pattern: '/api/admin/performance',
    permissions: [{ resource: 'monitoring', action: 'read', scope: 'all' }],
    description: 'Performance monitoring',
    methods: ['GET']
  },
  {
    pattern: '/api/admin/performance/metrics',
    permissions: [{ resource: 'monitoring', action: 'read', scope: 'all' }],
    description: 'Performance metrics',
    methods: ['GET']
  },
  {
    pattern: '/api/admin/performance/slow-queries',
    permissions: [{ resource: 'monitoring', action: 'read', scope: 'all' }],
    description: 'Slow query monitoring',
    methods: ['GET']
  },

  // API Routes - Security Management
  {
    pattern: '/api/admin/security/alerts',
    permissions: [{ resource: 'security', action: 'read', scope: 'all' }],
    description: 'Security alerts',
    methods: ['GET']
  },
  {
    pattern: '/api/admin/security/events',
    permissions: [{ resource: 'security', action: 'read', scope: 'all' }],
    description: 'Security events',
    methods: ['GET']
  },
  {
    pattern: '/api/admin/security/events/[id]',
    permissions: [{ resource: 'security', action: 'read', scope: 'all' }],
    description: 'Specific security event',
    methods: ['GET']
  },
  {
    pattern: '/api/admin/security/events/[id]/resolve',
    permissions: [{ resource: 'security', action: 'manage', scope: 'all' }],
    description: 'Resolve security event',
    methods: ['POST']
  },
  {
    pattern: '/api/admin/security/stats',
    permissions: [{ resource: 'security', action: 'read', scope: 'all' }],
    description: 'Security statistics',
    methods: ['GET']
  },
  {
    pattern: '/api/admin/security/unblock-ip',
    permissions: [{ resource: 'security', action: 'manage', scope: 'all' }],
    description: 'Unblock IP address',
    methods: ['POST']
  },

  // API Routes - Two-Factor Authentication
  {
    pattern: '/api/admin/two-factor/enforce',
    permissions: [{ resource: 'security', action: 'manage', scope: 'all' }],
    description: 'Enforce two-factor authentication',
    methods: ['POST']
  },

  // API Routes - User Management
  {
    pattern: '/api/admin/users',
    permissions: [{ resource: 'users', action: 'read', scope: 'all' }],
    description: 'User management endpoints',
    methods: ['GET', 'POST']
  },
  {
    pattern: '/api/admin/users/[id]',
    permissions: [{ resource: 'users', action: 'read', scope: 'all' }],
    description: 'Specific user management',
    methods: ['GET', 'PUT', 'DELETE']
  },
  {
    pattern: '/api/admin/users/[id]/security',
    permissions: [{ resource: 'users', action: 'manage', scope: 'all' }],
    description: 'User security management',
    methods: ['GET', 'PUT']
  },
  {
    pattern: '/api/admin/users/bulk',
    permissions: [{ resource: 'users', action: 'manage', scope: 'all' }],
    description: 'Bulk user operations',
    methods: ['POST']
  },

  // API Routes - Analytics
  {
    pattern: '/api/analytics',
    permissions: [{ resource: 'analytics', action: 'read', scope: 'all' }],
    description: 'Analytics endpoints',
    methods: ['GET']
  },
  {
    pattern: '/api/analytics/dashboard',
    permissions: [{ resource: 'analytics', action: 'read', scope: 'all' }],
    description: 'Analytics dashboard data',
    methods: ['GET']
  },
  {
    pattern: '/api/analytics/export',
    permissions: [{ resource: 'analytics', action: 'read', scope: 'all' }],
    description: 'Analytics data export',
    methods: ['GET', 'POST']
  },

  // API Routes - Categories
  {
    pattern: '/api/categories',
    permissions: [{ resource: 'categories', action: 'read', scope: 'all' }],
    description: 'Category management endpoints',
    methods: ['GET', 'POST']
  },
  {
    pattern: '/api/categories/[id]',
    permissions: [{ resource: 'categories', action: 'read', scope: 'all' }],
    description: 'Specific category management',
    methods: ['GET', 'PUT', 'DELETE']
  },
  {
    pattern: '/api/categories/reorder',
    permissions: [{ resource: 'categories', action: 'update', scope: 'all' }],
    description: 'Category reordering',
    methods: ['POST']
  },

  // API Routes - Media
  {
    pattern: '/api/media',
    permissions: [{ resource: 'media', action: 'read', scope: 'all' }],
    description: 'Media management endpoints',
    methods: ['GET', 'POST']
  },
  {
    pattern: '/api/media/[id]',
    permissions: [{ resource: 'media', action: 'read', scope: 'all' }],
    description: 'Specific media management',
    methods: ['GET', 'PUT', 'DELETE']
  },

  // API Routes - Notifications
  {
    pattern: '/api/notifications',
    permissions: [{ resource: 'notifications', action: 'read', scope: 'own' }],
    description: 'User notifications',
    methods: ['GET', 'POST']
  },
  {
    pattern: '/api/notifications/[id]',
    permissions: [{ resource: 'notifications', action: 'update', scope: 'own' }],
    description: 'Specific notification management',
    methods: ['GET', 'PUT', 'DELETE']
  },

  // API Routes - Pages
  {
    pattern: '/api/pages',
    permissions: [{ resource: 'pages', action: 'read', scope: 'all' }],
    description: 'Page management endpoints',
    methods: ['GET', 'POST']
  },
  {
    pattern: '/api/pages/[id]',
    permissions: [{ resource: 'pages', action: 'read', scope: 'all' }],
    description: 'Specific page management',
    methods: ['GET', 'PUT', 'DELETE']
  },
  {
    pattern: '/api/pages/[id]/preview',
    permissions: [{ resource: 'pages', action: 'read', scope: 'all' }],
    description: 'Page preview',
    methods: ['GET']
  },
  {
    pattern: '/api/pages/preview',
    permissions: [{ resource: 'pages', action: 'read', scope: 'all' }],
    description: 'Page preview generation',
    methods: ['POST']
  },
  {
    pattern: '/api/pages/templates',
    permissions: [{ resource: 'pages', action: 'read', scope: 'all' }],
    description: 'Page templates',
    methods: ['GET']
  },

  // API Routes - Products
  {
    pattern: '/api/products',
    permissions: [{ resource: 'products', action: 'read', scope: 'all' }],
    description: 'Product management endpoints',
    methods: ['GET', 'POST']
  },
  {
    pattern: '/api/products/[id]',
    permissions: [{ resource: 'products', action: 'read', scope: 'all' }],
    description: 'Specific product management',
    methods: ['GET', 'PUT', 'DELETE']
  },
  {
    pattern: '/api/products/[id]/media',
    permissions: [{ resource: 'products', action: 'update', scope: 'all' }],
    description: 'Product media management',
    methods: ['GET', 'POST', 'DELETE']
  },

  // API Routes - Public (no authentication required)
  {
    pattern: '/api/public/categories',
    permissions: [],
    description: 'Public category listing',
    isPublic: true,
    methods: ['GET']
  },
  {
    pattern: '/api/public/products',
    permissions: [],
    description: 'Public product listing',
    isPublic: true,
    methods: ['GET']
  },
  {
    pattern: '/api/public/products/[slug]',
    permissions: [],
    description: 'Public product details',
    isPublic: true,
    methods: ['GET']
  },

  // API Routes - Search
  {
    pattern: '/api/search',
    permissions: [{ resource: 'search', action: 'read', scope: 'all' }],
    description: 'Search endpoints',
    methods: ['GET', 'POST']
  },
  {
    pattern: '/api/search/analytics',
    permissions: [{ resource: 'analytics', action: 'read', scope: 'all' }],
    description: 'Search analytics',
    methods: ['GET']
  },
  {
    pattern: '/api/search/suggestions',
    permissions: [{ resource: 'search', action: 'read', scope: 'all' }],
    description: 'Search suggestions',
    methods: ['GET']
  },

  // API Routes - User Profile
  {
    pattern: '/api/user/preferences',
    permissions: [{ resource: 'profile', action: 'update', scope: 'own' }],
    description: 'User preferences',
    methods: ['GET', 'PUT']
  },

  // API Routes - Users
  {
    pattern: '/api/users',
    permissions: [{ resource: 'users', action: 'read', scope: 'all' }],
    description: 'User endpoints',
    methods: ['GET']
  },
  {
    pattern: '/api/users/[id]',
    permissions: [{ resource: 'users', action: 'read', scope: 'all' }],
    description: 'Specific user endpoints',
    methods: ['GET', 'PUT']
  },
  {
    pattern: '/api/users/[id]/avatar',
    permissions: [{ resource: 'profile', action: 'update', scope: 'own' }],
    description: 'User avatar management',
    methods: ['POST', 'DELETE']
  },
  {
    pattern: '/api/users/[id]/deactivate',
    permissions: [{ resource: 'users', action: 'manage', scope: 'all' }],
    description: 'User deactivation',
    methods: ['POST']
  },
  {
    pattern: '/api/users/[id]/export',
    permissions: [{ resource: 'users', action: 'read', scope: 'all' }],
    description: 'User data export',
    methods: ['GET']
  },
  {
    pattern: '/api/users/[id]/notification-preferences',
    permissions: [{ resource: 'profile', action: 'update', scope: 'own' }],
    description: 'User notification preferences',
    methods: ['GET', 'PUT']
  },
  {
    pattern: '/api/users/[id]/preferences',
    permissions: [{ resource: 'profile', action: 'update', scope: 'own' }],
    description: 'User preferences',
    methods: ['GET', 'PUT']
  },
  {
    pattern: '/api/users/[id]/security',
    permissions: [{ resource: 'profile', action: 'update', scope: 'own' }],
    description: 'User security settings',
    methods: ['GET', 'PUT']
  },
  {
    pattern: '/api/users/[id]/security/monitoring',
    permissions: [{ resource: 'security', action: 'read', scope: 'all' }],
    description: 'User security monitoring',
    methods: ['GET']
  },
  {
    pattern: '/api/users/[id]/sessions',
    permissions: [{ resource: 'profile', action: 'read', scope: 'own' }],
    description: 'User session management',
    methods: ['GET', 'DELETE']
  },
  {
    pattern: '/api/users/[id]/two-factor/backup-codes',
    permissions: [{ resource: 'profile', action: 'update', scope: 'own' }],
    description: 'Two-factor backup codes',
    methods: ['GET', 'POST']
  },
  {
    pattern: '/api/users/[id]/two-factor/disable',
    permissions: [{ resource: 'profile', action: 'update', scope: 'own' }],
    description: 'Disable two-factor authentication',
    methods: ['POST']
  },
  {
    pattern: '/api/users/[id]/two-factor/setup',
    permissions: [{ resource: 'profile', action: 'update', scope: 'own' }],
    description: 'Setup two-factor authentication',
    methods: ['POST']
  },
  {
    pattern: '/api/users/[id]/two-factor/status',
    permissions: [{ resource: 'profile', action: 'read', scope: 'own' }],
    description: 'Two-factor authentication status',
    methods: ['GET']
  },
  {
    pattern: '/api/users/[id]/two-factor/verify',
    permissions: [{ resource: 'profile', action: 'update', scope: 'own' }],
    description: 'Verify two-factor authentication',
    methods: ['POST']
  },

  // API Routes - Workflow
  {
    pattern: '/api/workflow',
    permissions: [{ resource: 'workflow', action: 'read', scope: 'all' }],
    description: 'Workflow management endpoints',
    methods: ['GET', 'POST']
  },
  {
    pattern: '/api/workflow/revisions',
    permissions: [{ resource: 'workflow', action: 'read', scope: 'all' }],
    description: 'Workflow revisions',
    methods: ['GET']
  },

  // System API Routes
  {
    pattern: '/api/health',
    permissions: [],
    description: 'System health check',
    isPublic: true,
    methods: ['GET']
  },
  {
    pattern: '/api/csrf-token',
    permissions: [],
    description: 'CSRF token endpoint',
    isPublic: true,
    methods: ['GET']
  }
];

/**
 * Dynamic Route Permission Resolver
 * Handles pattern matching and permission resolution for dynamic routes
 */
export class RoutePermissionResolver {
  private routeConfigs: RoutePermissionConfig[];

  constructor(routeConfigs: RoutePermissionConfig[] = ROUTE_PERMISSION_MAPPINGS) {
    this.routeConfigs = routeConfigs;
  }

  /**
   * Get permissions required for a specific route
   */
  getRoutePermissions(pathname: string, method?: string): Permission[] {
    // Normalize pathname by removing trailing slash (except for root)
    const normalizedPath = pathname === '/' ? pathname : pathname.replace(/\/$/, '');
    const match = this.findRouteMatch(normalizedPath, method);
    return match ? match.permissions : [];
  }

  /**
   * Check if a route is public (no authentication required)
   */
  isPublicRoute(pathname: string): boolean {
    // Normalize pathname by removing trailing slash (except for root)
    const normalizedPath = pathname === '/' ? pathname : pathname.replace(/\/$/, '');
    const config = this.findRouteConfig(normalizedPath);
    return config?.isPublic === true;
  }

  /**
   * Check if a route requires authentication but no specific permissions
   */
  requiresAuthOnly(pathname: string): boolean {
    // Normalize pathname by removing trailing slash (except for root)
    const normalizedPath = pathname === '/' ? pathname : pathname.replace(/\/$/, '');
    const config = this.findRouteConfig(normalizedPath);
    return config?.requiresAuth === true && (!config.permissions || config.permissions.length === 0);
  }

  /**
   * Escape all regex meta-characters in a string, including backslashes.
   */
  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * Find matching route configuration
   */
  findRouteConfig(pathname: string, method?: string): RoutePermissionConfig | null {
    // Normalize pathname by removing trailing slash (except for root)
    const normalizedPath = pathname === '/' ? pathname : pathname.replace(/\/$/, '');
    const normalizedMethod = method?.toUpperCase();
    
    // Direct match first
    const directMatch = this.routeConfigs.find(config => 
      config.pattern === normalizedPath && 
      (!normalizedMethod || !config.methods || config.methods.includes(normalizedMethod))
    );
    
    if (directMatch) return directMatch;

    // Pattern matching for dynamic routes
    for (const config of this.routeConfigs) {
      if (this.matchRoutePattern(config.pattern, normalizedPath) && 
          (!normalizedMethod || !config.methods || config.methods.includes(normalizedMethod))) {
        return config;
      }
    }

    return null;
  }

  /**
   * Find route match with extracted parameters
   */
  findRouteMatch(pathname: string, method?: string): RouteMatch | null {
    const config = this.findRouteConfig(pathname, method);
    if (!config) return null;

    const params = this.extractRouteParams(config.pattern, pathname);
    
    return {
      pattern: config.pattern,
      permissions: config.permissions,
      params,
      isMatch: true
    };
  }

  /**
   * Match route pattern with actual path
   */
  private matchRoutePattern(pattern: string, route: string): boolean {
    // Convert Next.js dynamic route pattern to regex
    const regexPattern = this.escapeRegExp(pattern)
      .replace(/\[([^\]]+)\]/g, '([^/]+)') // [id] -> ([^/]+)
      .replace(/\[\.\.\.([^\]]+)\]/g, '(.*)') // [...slug] -> (.*)
      .replace(/\//g, '\\/'); // Escape forward slashes
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(route);
  }

  /**
   * Escape RegExp meta-characters in a string, including backslash
   */
  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Extract parameters from dynamic route
   */
  private extractRouteParams(pattern: string, route: string): Record<string, string> {
    const params: Record<string, string> = {};
    
    // Extract parameter names from pattern
    const paramNames: string[] = [];
    const paramRegex = /\[([^\]]+)\]/g;
    let match;
    
    while ((match = paramRegex.exec(pattern)) !== null) {
      paramNames.push(match[1]);
    }
    
    if (paramNames.length === 0) return params;
    
    // Create regex to extract values
    const escapedPattern = pattern.replace(/\\/g, '\\\\');
    const regexPattern = escapedPattern
      .replace(/\[([^\]]+)\]/g, '([^/]+)')
      .replace(/\[\.\.\.([^\]]+)\]/g, '(.*)')
      .replace(/\//g, '\\/');
    
    const regex = new RegExp(`^${regexPattern}$`);
    const values = route.match(regex);
    
    if (values) {
      paramNames.forEach((name, index) => {
        if (values[index + 1] !== undefined) {
          params[name] = values[index + 1];
        }
      });
    }
    
    return params;
  }

  /**
   * Get all route configurations
   */
  getAllRouteConfigs(): RoutePermissionConfig[] {
    return this.routeConfigs;
  }

  /**
   * Get route configurations by resource
   */
  getRoutesByResource(resource: string): RoutePermissionConfig[] {
    return this.routeConfigs.filter(config =>
      config.permissions.some(permission => permission.resource === resource)
    );
  }

  /**
   * Get route configurations by action
   */
  getRoutesByAction(action: string): RoutePermissionConfig[] {
    return this.routeConfigs.filter(config =>
      config.permissions.some(permission => permission.action === action)
    );
  }

  /**
   * Get public routes
   */
  getPublicRoutes(): RoutePermissionConfig[] {
    return this.routeConfigs.filter(config => config.isPublic === true);
  }

  /**
   * Get protected routes
   */
  getProtectedRoutes(): RoutePermissionConfig[] {
    return this.routeConfigs.filter(config => 
      config.isPublic !== true && config.permissions.length > 0
    );
  }

  /**
   * Add new route configuration
   */
  addRouteConfig(config: RoutePermissionConfig): void {
    this.routeConfigs.push(config);
  }

  /**
   * Update existing route configuration
   */
  updateRouteConfig(pattern: string, updates: Partial<RoutePermissionConfig>): boolean {
    const index = this.routeConfigs.findIndex(config => config.pattern === pattern);
    if (index !== -1) {
      this.routeConfigs[index] = { ...this.routeConfigs[index], ...updates };
      return true;
    }
    return false;
  }

  /**
   * Remove route configuration
   */
  removeRouteConfig(pattern: string): boolean {
    const index = this.routeConfigs.findIndex(config => config.pattern === pattern);
    if (index !== -1) {
      this.routeConfigs.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Validate route configuration
   */
  validateRouteConfig(config: RoutePermissionConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.pattern) {
      errors.push('Route pattern is required');
    }

    if (!config.description) {
      errors.push('Route description is required');
    }

    if (!Array.isArray(config.permissions)) {
      errors.push('Permissions must be an array');
    }

    // Validate permission structure
    config.permissions.forEach((permission, index) => {
      if (!permission.resource) {
        errors.push(`Permission ${index}: resource is required`);
      }
      if (!permission.action) {
        errors.push(`Permission ${index}: action is required`);
      }
    });

    // Validate HTTP methods if specified
    if (config.methods) {
      const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
      config.methods.forEach(method => {
        if (!validMethods.includes(method.toUpperCase())) {
          errors.push(`Invalid HTTP method: ${method}`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Export route configurations to JSON
   */
  exportRouteConfigs(): string {
    return JSON.stringify(this.routeConfigs, null, 2);
  }

  /**
   * Import route configurations from JSON
   */
  importRouteConfigs(jsonConfig: string): { success: boolean; errors: string[] } {
    try {
      const configs = JSON.parse(jsonConfig) as RoutePermissionConfig[];
      
      if (!Array.isArray(configs)) {
        return { success: false, errors: ['Configuration must be an array'] };
      }

      const errors: string[] = [];
      
      // Validate each configuration
      configs.forEach((config, index) => {
        const validation = this.validateRouteConfig(config);
        if (!validation.isValid) {
          errors.push(`Config ${index}: ${validation.errors.join(', ')}`);
        }
      });

      if (errors.length === 0) {
        this.routeConfigs = configs;
        return { success: true, errors: [] };
      } else {
        return { success: false, errors };
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
export const routePermissionResolver = new RoutePermissionResolver();

// Helper functions for backward compatibility
export function getRoutePermissions(pathname: string, method?: string): Permission[] {
  return routePermissionResolver.getRoutePermissions(pathname, method);
}

export function isPublicRoute(pathname: string): boolean {
  return routePermissionResolver.isPublicRoute(pathname);
}

export function requiresAuthOnly(pathname: string): boolean {
  return routePermissionResolver.requiresAuthOnly(pathname);
}

export function matchRoutePattern(pattern: string, route: string): boolean {
  return routePermissionResolver['matchRoutePattern'](pattern, route);
}