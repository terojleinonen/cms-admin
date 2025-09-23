# Route Mapping System Guide

This guide explains how to use the comprehensive route mapping system for the production-ready RBAC implementation.

## Overview

The route mapping system provides:
- **Comprehensive route definitions** with permission requirements
- **Dynamic route resolution** for Next.js dynamic routes
- **API route protection** utilities
- **Validation and testing** tools
- **Configuration management** capabilities

## Core Components

### 1. Route Permission Resolver (`app/lib/route-permissions.ts`)

The main service for resolving route permissions:

```typescript
import { routePermissionResolver } from '@/app/lib/route-permissions';

// Get permissions for a route
const permissions = routePermissionResolver.getRoutePermissions('/admin/users');
// Returns: [{ resource: 'users', action: 'read', scope: 'all' }]

// Check if route is public
const isPublic = routePermissionResolver.isPublicRoute('/auth/login');
// Returns: true

// Find route configuration
const config = routePermissionResolver.findRouteConfig('/admin/products/123');
// Returns route config with extracted parameters
```

### 2. API Route Protection (`app/lib/api-route-protection.ts`)

Utilities for protecting API routes:

```typescript
import { withApiProtection, protectApiRoute } from '@/app/lib/api-route-protection';

// Method 1: Higher-order function
export const GET = withApiProtection(
  async (request, { user }) => {
    // Your route logic here
    return NextResponse.json({ data: 'success' });
  },
  {
    permissions: [{ resource: 'products', action: 'read', scope: 'all' }],
    allowedMethods: ['GET']
  }
);

// Method 2: Manual protection
export async function POST(request: NextRequest) {
  const { user, error } = await protectApiRoute(request, {
    permissions: [{ resource: 'products', action: 'create', scope: 'all' }]
  });
  
  if (error) return error;
  
  // Your route logic here
  return NextResponse.json({ success: true });
}
```

### 3. Route Configuration (`app/lib/route-mapping-config.ts`)

Comprehensive route definitions with metadata:

```typescript
import { routeMappingUtils } from '@/app/lib/route-mapping-config';

// Get routes by category
const adminRoutes = routeMappingUtils.getRoutesByCategory(RouteCategory.ADMIN);

// Get routes by permission
const userRoutes = routeMappingUtils.getRoutesByPermission('users');

// Generate documentation
const docs = routeMappingUtils.generateDocumentation();
```

## Route Configuration Format

Each route is defined with the following structure:

```typescript
interface ExtendedRouteConfig {
  pattern: string;                    // Route pattern (e.g., '/admin/users/[id]')
  permissions: Permission[];          // Required permissions
  description: string;                // Human-readable description
  category: RouteCategory;            // Route category for organization
  tags: string[];                     // Tags for filtering and search
  isPublic?: boolean;                 // Whether route is public
  requiresAuth?: boolean;             // Requires auth but no specific permissions
  methods?: string[];                 // Allowed HTTP methods
  deprecated?: boolean;               // Whether route is deprecated
  version?: string;                   // API version
  rateLimit?: {                       // Rate limiting configuration
    requests: number;
    window: string;
  };
  caching?: {                         // Caching configuration
    enabled: boolean;
    ttl?: number;
  };
}
```

## Adding New Routes

### 1. Add to Route Configuration

Add your route to `COMPREHENSIVE_ROUTE_MAPPING` in `app/lib/route-mapping-config.ts`:

```typescript
{
  pattern: '/admin/new-feature',
  permissions: [{ resource: 'new-feature', action: 'read', scope: 'all' }],
  description: 'New feature management',
  category: RouteCategory.ADMIN,
  tags: ['admin', 'new-feature'],
  methods: ['GET', 'POST']
}
```

### 2. Update Permission Configuration

Add the new resource to your permission configuration in `app/lib/permission-config.ts`:

```typescript
{
  name: 'new-feature',
  displayName: 'New Feature',
  description: 'New feature management',
  actions: [
    { name: 'read', displayName: 'Read', description: 'View new feature' },
    { name: 'create', displayName: 'Create', description: 'Create new feature' },
    // ... other actions
  ],
  scopes: [
    { name: 'all', displayName: 'All', description: 'Access to all features' }
  ]
}
```

### 3. Update Role Permissions

Add the new permissions to appropriate roles:

```typescript
EDITOR: [
  // ... existing permissions
  { resource: 'new-feature', action: 'read', scope: 'all' },
  { resource: 'new-feature', action: 'create', scope: 'all' },
]
```

## Dynamic Routes

The system supports Next.js dynamic routes with parameter extraction:

```typescript
// Route pattern: '/admin/products/[id]/edit'
// Actual path: '/admin/products/123/edit'

const match = routePermissionResolver.findRouteMatch('/admin/products/123/edit');
// Returns: { 
//   pattern: '/admin/products/[id]/edit',
//   permissions: [...],
//   params: { id: '123' },
//   isMatch: true 
// }
```

### Supported Dynamic Route Patterns

- `[id]` - Single parameter
- `[slug]` - Single parameter (typically for SEO-friendly URLs)
- `[...params]` - Catch-all routes
- Nested dynamic routes: `/api/users/[id]/posts/[postId]`

## API Route Protection Examples

### Basic Protection

```typescript
// app/api/products/route.ts
import { withApiProtection } from '@/app/lib/api-route-protection';

export const GET = withApiProtection(
  async (request, { user }) => {
    // Automatically uses route-based permissions
    const products = await getProducts();
    return NextResponse.json({ data: products });
  }
);
```

### Custom Permissions

```typescript
export const POST = withApiProtection(
  async (request, { user }) => {
    const body = await request.json();
    const product = await createProduct(body);
    return NextResponse.json({ data: product });
  },
  {
    permissions: [{ resource: 'products', action: 'create', scope: 'all' }],
    allowedMethods: ['POST']
  }
);
```

### Custom Validation

```typescript
export const PUT = withApiProtection(
  async (request, { user, params }) => {
    // Custom logic here
    return NextResponse.json({ success: true });
  },
  {
    customValidator: async (user, request) => {
      // Custom validation logic
      const productId = request.url.split('/').pop();
      const product = await getProduct(productId);
      
      // Check if user owns the product or is admin
      return product.ownerId === user?.id || user?.role === 'ADMIN';
    }
  }
);
```

## Middleware Integration

The middleware automatically uses the route mapping system:

```typescript
// middleware.ts
import { routePermissionResolver } from './app/lib/route-permissions';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  
  // Check if route is public
  if (routePermissionResolver.isPublicRoute(pathname)) {
    return NextResponse.next();
  }
  
  // Get required permissions
  const requiredPermissions = routePermissionResolver.getRoutePermissions(pathname, method);
  
  // Validate permissions...
}
```

## Validation and Testing

### Validate Route Configuration

```typescript
import { routeMappingValidator } from '@/app/lib/route-mapping-validator';

const validation = routeMappingValidator.validateRouteConfigurations();

if (!validation.isValid) {
  console.error('Route configuration errors:', validation.errors);
}
```

### Test Route Resolution

```typescript
import { DEFAULT_TEST_CASES } from '@/app/lib/route-mapping-validator';

const testResults = routeMappingValidator.testRouteResolution(DEFAULT_TEST_CASES);
console.log(`Tests passed: ${testResults.passed}/${testResults.passed + testResults.failed}`);
```

### Generate Test Cases

```typescript
const testCases = routeMappingValidator.generateTestCases();
const results = routeMappingValidator.testRouteResolution(testCases);
```

## Configuration Management

### Export Configuration

```typescript
// Export as JSON
const json = routePermissionResolver.exportRouteConfigs();

// Export as CSV (from utils)
const csv = routeMappingUtils.exportAsCsv();
```

### Import Configuration

```typescript
const result = routePermissionResolver.importRouteConfigs(jsonString);

if (!result.success) {
  console.error('Import errors:', result.errors);
}
```

### Runtime Configuration Updates

```typescript
// Add new route
routePermissionResolver.addRouteConfig({
  pattern: '/admin/new-route',
  permissions: [{ resource: 'admin', action: 'read', scope: 'all' }],
  description: 'New admin route'
});

// Update existing route
routePermissionResolver.updateRouteConfig('/admin/users', {
  description: 'Updated description'
});

// Remove route
routePermissionResolver.removeRouteConfig('/admin/old-route');
```

## Best Practices

### 1. Route Organization

- Use consistent naming patterns
- Group related routes by category
- Use descriptive tags for filtering

### 2. Permission Granularity

- Define specific permissions for each action
- Use appropriate scopes (`all`, `own`, `team`)
- Avoid overly broad permissions

### 3. API Route Protection

- Always protect API routes with appropriate permissions
- Use method-specific permissions when needed
- Implement custom validation for complex scenarios

### 4. Testing

- Write tests for new route configurations
- Validate route resolution regularly
- Test permission boundaries

### 5. Documentation

- Keep route descriptions up to date
- Document any custom validation logic
- Maintain changelog for route changes

## Troubleshooting

### Common Issues

1. **Route not found**: Check pattern matching and ensure route is defined
2. **Permission denied**: Verify user has required permissions and correct scope
3. **Dynamic route not matching**: Ensure parameter names match pattern
4. **Method not allowed**: Check if HTTP method is included in route configuration

### Debugging

```typescript
// Debug route resolution
const config = routePermissionResolver.findRouteConfig('/your/route');
console.log('Route config:', config);

const permissions = routePermissionResolver.getRoutePermissions('/your/route');
console.log('Required permissions:', permissions);

// Validate configuration
const validation = routeMappingValidator.validateRouteConfigurations();
console.log('Validation result:', validation);
```

## Performance Considerations

- Route resolution is optimized with direct matching first
- Pattern matching is cached for dynamic routes
- Consider using route-level caching for frequently accessed routes
- Monitor route resolution performance in production

## Security Considerations

- Always validate permissions server-side
- Use specific permissions rather than broad access
- Implement rate limiting for sensitive routes
- Log access attempts for security monitoring
- Regularly audit route configurations