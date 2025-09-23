/**
 * Route Mapping Configuration
 * Comprehensive configuration for all application routes with their permission requirements
 */

import { Permission } from './permissions';
import { RoutePermissionConfig } from './route-permissions';

/**
 * Route category definitions for organization
 */
export enum RouteCategory {
  PUBLIC = 'public',
  AUTH = 'auth',
  ADMIN = 'admin',
  CONTENT = 'content',
  USER = 'user',
  API_AUTH = 'api_auth',
  API_ADMIN = 'api_admin',
  API_CONTENT = 'api_content',
  API_USER = 'api_user',
  API_PUBLIC = 'api_public',
  SYSTEM = 'system'
}

/**
 * Extended route configuration with additional metadata
 */
export interface ExtendedRouteConfig extends RoutePermissionConfig {
  category: RouteCategory;
  tags: string[];
  deprecated?: boolean;
  version?: string;
  rateLimit?: {
    requests: number;
    window: string; // e.g., '1m', '1h', '1d'
  };
  caching?: {
    enabled: boolean;
    ttl?: number;
  };
}

/**
 * Comprehensive route mapping with all application routes
 */
export const COMPREHENSIVE_ROUTE_MAPPING: ExtendedRouteConfig[] = [
  // Public Routes
  {
    pattern: '/',
    permissions: [],
    description: 'Application home page',
    category: RouteCategory.PUBLIC,
    tags: ['home', 'public'],
    isPublic: true,
    caching: { enabled: true, ttl: 3600 }
  },
  {
    pattern: '/auth/login',
    permissions: [],
    description: 'User login page',
    category: RouteCategory.AUTH,
    tags: ['auth', 'login'],
    isPublic: true
  },
  {
    pattern: '/auth/register',
    permissions: [],
    description: 'User registration page',
    category: RouteCategory.AUTH,
    tags: ['auth', 'register'],
    isPublic: true
  },
  {
    pattern: '/auth/password-reset',
    permissions: [],
    description: 'Password reset page',
    category: RouteCategory.AUTH,
    tags: ['auth', 'password-reset'],
    isPublic: true
  },

  // Admin Dashboard Routes
  {
    pattern: '/admin',
    permissions: [{ resource: 'admin', action: 'read', scope: 'all' }],
    description: 'Admin dashboard home',
    category: RouteCategory.ADMIN,
    tags: ['admin', 'dashboard']
  },
  {
    pattern: '/admin/activity',
    permissions: [{ resource: 'audit', action: 'read', scope: 'all' }],
    description: 'Admin activity monitoring',
    category: RouteCategory.ADMIN,
    tags: ['admin', 'activity', 'audit']
  },
  {
    pattern: '/admin/analytics',
    permissions: [{ resource: 'analytics', action: 'read', scope: 'all' }],
    description: 'Admin analytics dashboard',
    category: RouteCategory.ADMIN,
    tags: ['admin', 'analytics']
  },
  {
    pattern: '/admin/analytics/search',
    permissions: [{ resource: 'analytics', action: 'read', scope: 'all' }],
    description: 'Search analytics',
    category: RouteCategory.ADMIN,
    tags: ['admin', 'analytics', 'search']
  },

  // API Management Routes
  {
    pattern: '/admin/api',
    permissions: [{ resource: 'api-keys', action: 'read', scope: 'all' }],
    description: 'API management dashboard',
    category: RouteCategory.ADMIN,
    tags: ['admin', 'api', 'management']
  },
  {
    pattern: '/admin/api/analytics',
    permissions: [{ resource: 'api-keys', action: 'read', scope: 'all' }],
    description: 'API analytics',
    category: RouteCategory.ADMIN,
    tags: ['admin', 'api', 'analytics']
  },
  {
    pattern: '/admin/api/documentation',
    permissions: [{ resource: 'api-keys', action: 'read', scope: 'all' }],
    description: 'API documentation',
    category: RouteCategory.ADMIN,
    tags: ['admin', 'api', 'documentation']
  },
  {
    pattern: '/admin/api/keys',
    permissions: [{ resource: 'api-keys', action: 'read', scope: 'all' }],
    description: 'API key management',
    category: RouteCategory.ADMIN,
    tags: ['admin', 'api', 'keys']
  },
  {
    pattern: '/admin/api/keys/new',
    permissions: [{ resource: 'api-keys', action: 'create', scope: 'all' }],
    description: 'Create new API key',
    category: RouteCategory.ADMIN,
    tags: ['admin', 'api', 'keys', 'create']
  },

  // System Management Routes
  {
    pattern: '/admin/backup',
    permissions: [{ resource: 'system', action: 'manage', scope: 'all' }],
    description: 'System backup management',
    category: RouteCategory.ADMIN,
    tags: ['admin', 'system', 'backup']
  },
  {
    pattern: '/admin/database',
    permissions: [{ resource: 'system', action: 'manage', scope: 'all' }],
    description: 'Database management',
    category: RouteCategory.ADMIN,
    tags: ['admin', 'system', 'database']
  },
  {
    pattern: '/admin/performance',
    permissions: [{ resource: 'monitoring', action: 'read', scope: 'all' }],
    description: 'Performance monitoring',
    category: RouteCategory.ADMIN,
    tags: ['admin', 'monitoring', 'performance']
  },
  {
    pattern: '/admin/security',
    permissions: [{ resource: 'security', action: 'read', scope: 'all' }],
    description: 'Security dashboard',
    category: RouteCategory.ADMIN,
    tags: ['admin', 'security']
  },

  // User Management Routes
  {
    pattern: '/admin/users',
    permissions: [{ resource: 'users', action: 'read', scope: 'all' }],
    description: 'User management dashboard',
    category: RouteCategory.ADMIN,
    tags: ['admin', 'users']
  },
  {
    pattern: '/admin/users/[id]',
    permissions: [{ resource: 'users', action: 'read', scope: 'all' }],
    description: 'View specific user',
    category: RouteCategory.ADMIN,
    tags: ['admin', 'users', 'detail']
  },

  // Content Management Routes
  {
    pattern: '/admin/categories',
    permissions: [{ resource: 'categories', action: 'read', scope: 'all' }],
    description: 'Category management',
    category: RouteCategory.CONTENT,
    tags: ['admin', 'content', 'categories']
  },
  {
    pattern: '/admin/pages',
    permissions: [{ resource: 'pages', action: 'read', scope: 'all' }],
    description: 'Page management',
    category: RouteCategory.CONTENT,
    tags: ['admin', 'content', 'pages']
  },
  {
    pattern: '/admin/pages/new',
    permissions: [{ resource: 'pages', action: 'create', scope: 'all' }],
    description: 'Create new page',
    category: RouteCategory.CONTENT,
    tags: ['admin', 'content', 'pages', 'create']
  },
  {
    pattern: '/admin/pages/[id]',
    permissions: [{ resource: 'pages', action: 'read', scope: 'all' }],
    description: 'View specific page',
    category: RouteCategory.CONTENT,
    tags: ['admin', 'content', 'pages', 'detail']
  },
  {
    pattern: '/admin/pages/[id]/edit',
    permissions: [{ resource: 'pages', action: 'update', scope: 'all' }],
    description: 'Edit specific page',
    category: RouteCategory.CONTENT,
    tags: ['admin', 'content', 'pages', 'edit']
  },

  // Product Management Routes
  {
    pattern: '/admin/products',
    permissions: [{ resource: 'products', action: 'read', scope: 'all' }],
    description: 'Product management dashboard',
    category: RouteCategory.CONTENT,
    tags: ['admin', 'content', 'products']
  },
  {
    pattern: '/admin/products/new',
    permissions: [{ resource: 'products', action: 'create', scope: 'all' }],
    description: 'Create new product',
    category: RouteCategory.CONTENT,
    tags: ['admin', 'content', 'products', 'create']
  },
  {
    pattern: '/admin/products/[id]',
    permissions: [{ resource: 'products', action: 'read', scope: 'all' }],
    description: 'View specific product',
    category: RouteCategory.CONTENT,
    tags: ['admin', 'content', 'products', 'detail']
  },
  {
    pattern: '/admin/products/[id]/edit',
    permissions: [{ resource: 'products', action: 'update', scope: 'all' }],
    description: 'Edit specific product',
    category: RouteCategory.CONTENT,
    tags: ['admin', 'content', 'products', 'edit']
  },

  // Workflow Management Routes
  {
    pattern: '/admin/workflow',
    permissions: [{ resource: 'workflow', action: 'read', scope: 'all' }],
    description: 'Workflow management',
    category: RouteCategory.ADMIN,
    tags: ['admin', 'workflow']
  },

  // Media Management Routes
  {
    pattern: '/media',
    permissions: [{ resource: 'media', action: 'read', scope: 'all' }],
    description: 'Media library',
    category: RouteCategory.CONTENT,
    tags: ['content', 'media']
  },

  // User Profile Routes
  {
    pattern: '/profile',
    permissions: [{ resource: 'profile', action: 'read', scope: 'own' }],
    description: 'User profile page',
    category: RouteCategory.USER,
    tags: ['user', 'profile'],
    requiresAuth: true
  },
  {
    pattern: '/settings',
    permissions: [{ resource: 'profile', action: 'update', scope: 'own' }],
    description: 'User settings page',
    category: RouteCategory.USER,
    tags: ['user', 'settings'],
    requiresAuth: true
  },

  // General User Routes
  {
    pattern: '/users',
    permissions: [{ resource: 'users', action: 'read', scope: 'all' }],
    description: 'User listing page',
    category: RouteCategory.USER,
    tags: ['users', 'listing']
  },
  {
    pattern: '/orders',
    permissions: [{ resource: 'orders', action: 'read', scope: 'all' }],
    description: 'Orders page',
    category: RouteCategory.USER,
    tags: ['orders']
  },

  // API Routes - Authentication
  {
    pattern: '/api/auth/[...nextauth]',
    permissions: [],
    description: 'NextAuth.js authentication endpoints',
    category: RouteCategory.API_AUTH,
    tags: ['api', 'auth', 'nextauth'],
    isPublic: true,
    methods: ['GET', 'POST']
  },
  {
    pattern: '/api/auth/login',
    permissions: [],
    description: 'Login API endpoint',
    category: RouteCategory.API_AUTH,
    tags: ['api', 'auth', 'login'],
    isPublic: true,
    methods: ['POST'],
    rateLimit: { requests: 5, window: '1m' }
  },
  {
    pattern: '/api/auth/register',
    permissions: [],
    description: 'Registration API endpoint',
    category: RouteCategory.API_AUTH,
    tags: ['api', 'auth', 'register'],
    isPublic: true,
    methods: ['POST'],
    rateLimit: { requests: 3, window: '1m' }
  },
  {
    pattern: '/api/auth/password-reset',
    permissions: [],
    description: 'Password reset API endpoint',
    category: RouteCategory.API_AUTH,
    tags: ['api', 'auth', 'password-reset'],
    isPublic: true,
    methods: ['POST'],
    rateLimit: { requests: 3, window: '5m' }
  },
  {
    pattern: '/api/auth/password-reset/verify',
    permissions: [],
    description: 'Password reset verification API endpoint',
    category: RouteCategory.API_AUTH,
    tags: ['api', 'auth', 'password-reset', 'verify'],
    isPublic: true,
    methods: ['POST']
  },
  {
    pattern: '/api/auth/me',
    permissions: [{ resource: 'profile', action: 'read', scope: 'own' }],
    description: 'Get current user info',
    category: RouteCategory.API_AUTH,
    tags: ['api', 'auth', 'profile'],
    methods: ['GET'],
    caching: { enabled: true, ttl: 300 }
  },
  {
    pattern: '/api/auth/token',
    permissions: [{ resource: 'profile', action: 'read', scope: 'own' }],
    description: 'Token management',
    category: RouteCategory.API_AUTH,
    tags: ['api', 'auth', 'token'],
    methods: ['GET', 'POST']
  },

  // API Routes - Admin Management
  {
    pattern: '/api/admin/api-keys',
    permissions: [{ resource: 'api-keys', action: 'read', scope: 'all' }],
    description: 'API key management endpoints',
    category: RouteCategory.API_ADMIN,
    tags: ['api', 'admin', 'api-keys'],
    methods: ['GET', 'POST']
  },
  {
    pattern: '/api/admin/api-keys/[id]',
    permissions: [{ resource: 'api-keys', action: 'update', scope: 'all' }],
    description: 'Specific API key management',
    category: RouteCategory.API_ADMIN,
    tags: ['api', 'admin', 'api-keys', 'detail'],
    methods: ['GET', 'PUT', 'DELETE']
  },
  {
    pattern: '/api/admin/api-keys/[id]/stats',
    permissions: [{ resource: 'api-keys', action: 'read', scope: 'all' }],
    description: 'API key statistics',
    category: RouteCategory.API_ADMIN,
    tags: ['api', 'admin', 'api-keys', 'stats'],
    methods: ['GET'],
    caching: { enabled: true, ttl: 300 }
  },

  // API Routes - Audit Logs
  {
    pattern: '/api/admin/audit-logs',
    permissions: [{ resource: 'audit', action: 'read', scope: 'all' }],
    description: 'Audit log endpoints',
    category: RouteCategory.API_ADMIN,
    tags: ['api', 'admin', 'audit'],
    methods: ['GET']
  },
  {
    pattern: '/api/admin/audit-logs/retention',
    permissions: [{ resource: 'audit', action: 'manage', scope: 'all' }],
    description: 'Audit log retention management',
    category: RouteCategory.API_ADMIN,
    tags: ['api', 'admin', 'audit', 'retention'],
    methods: ['POST', 'DELETE']
  },
  {
    pattern: '/api/admin/audit-logs/stats',
    permissions: [{ resource: 'audit', action: 'read', scope: 'all' }],
    description: 'Audit log statistics',
    category: RouteCategory.API_ADMIN,
    tags: ['api', 'admin', 'audit', 'stats'],
    methods: ['GET'],
    caching: { enabled: true, ttl: 600 }
  },

  // API Routes - System Management
  {
    pattern: '/api/admin/backup',
    permissions: [{ resource: 'system', action: 'manage', scope: 'all' }],
    description: 'System backup endpoints',
    category: RouteCategory.API_ADMIN,
    tags: ['api', 'admin', 'system', 'backup'],
    methods: ['GET', 'POST']
  },
  {
    pattern: '/api/admin/backup/restore',
    permissions: [{ resource: 'system', action: 'manage', scope: 'all' }],
    description: 'System restore endpoints',
    category: RouteCategory.API_ADMIN,
    tags: ['api', 'admin', 'system', 'restore'],
    methods: ['POST']
  },
  {
    pattern: '/api/admin/backup/status/[id]',
    permissions: [{ resource: 'system', action: 'read', scope: 'all' }],
    description: 'Backup status endpoints',
    category: RouteCategory.API_ADMIN,
    tags: ['api', 'admin', 'system', 'backup', 'status'],
    methods: ['GET']
  },

  // API Routes - Content Management
  {
    pattern: '/api/products',
    permissions: [{ resource: 'products', action: 'read', scope: 'all' }],
    description: 'Product management endpoints',
    category: RouteCategory.API_CONTENT,
    tags: ['api', 'content', 'products'],
    methods: ['GET', 'POST']
  },
  {
    pattern: '/api/products/[id]',
    permissions: [{ resource: 'products', action: 'read', scope: 'all' }],
    description: 'Specific product management',
    category: RouteCategory.API_CONTENT,
    tags: ['api', 'content', 'products', 'detail'],
    methods: ['GET', 'PUT', 'DELETE']
  },
  {
    pattern: '/api/categories',
    permissions: [{ resource: 'categories', action: 'read', scope: 'all' }],
    description: 'Category management endpoints',
    category: RouteCategory.API_CONTENT,
    tags: ['api', 'content', 'categories'],
    methods: ['GET', 'POST']
  },
  {
    pattern: '/api/pages',
    permissions: [{ resource: 'pages', action: 'read', scope: 'all' }],
    description: 'Page management endpoints',
    category: RouteCategory.API_CONTENT,
    tags: ['api', 'content', 'pages'],
    methods: ['GET', 'POST']
  },
  {
    pattern: '/api/media',
    permissions: [{ resource: 'media', action: 'read', scope: 'all' }],
    description: 'Media management endpoints',
    category: RouteCategory.API_CONTENT,
    tags: ['api', 'content', 'media'],
    methods: ['GET', 'POST']
  },

  // API Routes - Public
  {
    pattern: '/api/public/categories',
    permissions: [],
    description: 'Public category listing',
    category: RouteCategory.API_PUBLIC,
    tags: ['api', 'public', 'categories'],
    isPublic: true,
    methods: ['GET'],
    caching: { enabled: true, ttl: 1800 }
  },
  {
    pattern: '/api/public/products',
    permissions: [],
    description: 'Public product listing',
    category: RouteCategory.API_PUBLIC,
    tags: ['api', 'public', 'products'],
    isPublic: true,
    methods: ['GET'],
    caching: { enabled: true, ttl: 900 }
  },
  {
    pattern: '/api/public/products/[slug]',
    permissions: [],
    description: 'Public product details',
    category: RouteCategory.API_PUBLIC,
    tags: ['api', 'public', 'products', 'detail'],
    isPublic: true,
    methods: ['GET'],
    caching: { enabled: true, ttl: 1800 }
  },

  // System API Routes
  {
    pattern: '/api/health',
    permissions: [],
    description: 'System health check',
    category: RouteCategory.SYSTEM,
    tags: ['api', 'system', 'health'],
    isPublic: true,
    methods: ['GET'],
    caching: { enabled: false }
  },
  {
    pattern: '/api/csrf-token',
    permissions: [],
    description: 'CSRF token endpoint',
    category: RouteCategory.SYSTEM,
    tags: ['api', 'system', 'csrf'],
    isPublic: true,
    methods: ['GET']
  }
];

/**
 * Route mapping utilities
 */
export class RouteMappingUtils {
  private routes: ExtendedRouteConfig[];

  constructor(routes: ExtendedRouteConfig[] = COMPREHENSIVE_ROUTE_MAPPING) {
    this.routes = routes;
  }

  /**
   * Get routes by category
   */
  getRoutesByCategory(category: RouteCategory): ExtendedRouteConfig[] {
    return this.routes.filter(route => route.category === category);
  }

  /**
   * Get routes by tag
   */
  getRoutesByTag(tag: string): ExtendedRouteConfig[] {
    return this.routes.filter(route => route.tags.includes(tag));
  }

  /**
   * Get routes requiring specific permission
   */
  getRoutesByPermission(resource: string, action?: string): ExtendedRouteConfig[] {
    return this.routes.filter(route =>
      route.permissions.some(permission =>
        permission.resource === resource &&
        (!action || permission.action === action)
      )
    );
  }

  /**
   * Get public routes
   */
  getPublicRoutes(): ExtendedRouteConfig[] {
    return this.routes.filter(route => route.isPublic === true);
  }

  /**
   * Get protected routes
   */
  getProtectedRoutes(): ExtendedRouteConfig[] {
    return this.routes.filter(route => 
      route.isPublic !== true && route.permissions.length > 0
    );
  }

  /**
   * Get routes with rate limiting
   */
  getRateLimitedRoutes(): ExtendedRouteConfig[] {
    return this.routes.filter(route => route.rateLimit);
  }

  /**
   * Get cacheable routes
   */
  getCacheableRoutes(): ExtendedRouteConfig[] {
    return this.routes.filter(route => route.caching?.enabled === true);
  }

  /**
   * Get deprecated routes
   */
  getDeprecatedRoutes(): ExtendedRouteConfig[] {
    return this.routes.filter(route => route.deprecated === true);
  }

  /**
   * Generate route documentation
   */
  generateDocumentation(): {
    categories: Record<RouteCategory, ExtendedRouteConfig[]>;
    summary: {
      total: number;
      public: number;
      protected: number;
      deprecated: number;
      rateLimited: number;
      cacheable: number;
    };
  } {
    const categories = {} as Record<RouteCategory, ExtendedRouteConfig[]>;
    
    // Group by category
    Object.values(RouteCategory).forEach(category => {
      categories[category] = this.getRoutesByCategory(category);
    });

    // Generate summary
    const summary = {
      total: this.routes.length,
      public: this.getPublicRoutes().length,
      protected: this.getProtectedRoutes().length,
      deprecated: this.getDeprecatedRoutes().length,
      rateLimited: this.getRateLimitedRoutes().length,
      cacheable: this.getCacheableRoutes().length,
    };

    return { categories, summary };
  }

  /**
   * Export route mapping as JSON
   */
  exportAsJson(): string {
    return JSON.stringify(this.routes, null, 2);
  }

  /**
   * Export route mapping as CSV
   */
  exportAsCsv(): string {
    const headers = [
      'Pattern',
      'Description',
      'Category',
      'Methods',
      'Permissions',
      'Public',
      'Tags',
      'Rate Limited',
      'Cacheable'
    ];

    const rows = this.routes.map(route => [
      route.pattern,
      route.description,
      route.category,
      route.methods?.join(', ') || 'ALL',
      route.permissions.map(p => `${p.resource}:${p.action}${p.scope ? `:${p.scope}` : ''}`).join(', '),
      route.isPublic ? 'Yes' : 'No',
      route.tags.join(', '),
      route.rateLimit ? 'Yes' : 'No',
      route.caching?.enabled ? 'Yes' : 'No'
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

// Singleton instance
export const routeMappingUtils = new RouteMappingUtils();