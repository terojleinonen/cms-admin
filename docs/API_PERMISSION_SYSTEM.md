# API Permission System Documentation

## Overview

The API Permission System provides comprehensive, production-ready permission validation for all API routes in the CMS. It implements a centralized middleware approach that ensures consistent security across the entire application.

## Features

- **Centralized Permission Validation**: Single middleware handles all permission checks
- **Role-Based Access Control (RBAC)**: Support for Admin, Editor, and Viewer roles
- **Resource-Action-Scope Model**: Granular permission control
- **Consistent Error Responses**: Standardized API error format
- **Audit Logging**: Comprehensive logging of access attempts and security events
- **Performance Optimized**: Built-in caching and efficient validation
- **Type-Safe**: Full TypeScript support with proper type definitions

## Architecture

### Core Components

1. **ApiPermissionMiddleware**: Main middleware class for permission validation
2. **withApiPermissions**: Higher-order function to wrap API route handlers
3. **Permission Decorators**: Convenient decorators for common permission patterns
4. **Route Permission Resolver**: Maps routes to required permissions
5. **Audit Service Integration**: Logs all access attempts and security events

### Permission Model

```typescript
interface Permission {
  resource: string;    // 'products', 'users', 'analytics', etc.
  action: string;      // 'create', 'read', 'update', 'delete', 'manage'
  scope?: string;      // 'own', 'all', 'team'
}
```

### Role Hierarchy

- **ADMIN**: Full system access, can manage all resources
- **EDITOR**: Content management access, can manage products, categories, pages, media
- **VIEWER**: Read-only access to most resources, can manage own profile

## Usage

### Basic Usage

```typescript
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware';

export const GET = withApiPermissions(
  async (request: NextRequest, { user }) => {
    // Your route logic here
    const data = await fetchData();
    return createApiSuccessResponse(data);
  },
  {
    permissions: [{ resource: 'products', action: 'read', scope: 'all' }]
  }
);
```

### Advanced Usage with Custom Validation

```typescript
export const PUT = withApiPermissions(
  async (request: NextRequest, { user, params }) => {
    // Route logic with guaranteed user access
    const updatedItem = await updateItem(params.id, user.id);
    return createApiSuccessResponse(updatedItem);
  },
  {
    permissions: [{ resource: 'products', action: 'update', scope: 'all' }],
    allowedMethods: ['PUT'],
    customValidator: async (user, request) => {
      // Additional validation logic
      return user.isActive && !user.isBlocked;
    },
    allowOwnerAccess: true,
    resourceIdParam: 'id',
    resourceOwnerField: 'createdBy'
  }
);
```

### Using Decorators

```typescript
import { requireAdmin, requireEditor, allowOwnerOrAdmin } from '@/lib/api-permission-middleware';

// Require admin role
export const DELETE = requireAdmin()(
  async (request, { user }) => {
    // Only admins can access this
  }
);

// Require editor role or higher
export const POST = requireEditor()(
  async (request, { user }) => {
    // Editors and admins can access this
  }
);

// Allow resource owner or admin
export const PUT = allowOwnerOrAdmin('id', 'createdBy')()(
  async (request, { user, params }) => {
    // Resource owner or admin can access this
  }
);
```

## Configuration Options

### PermissionValidationOptions

```typescript
interface PermissionValidationOptions {
  permissions?: Permission[];           // Required permissions
  requireAuth?: boolean;               // Require authentication (default: true)
  allowedMethods?: string[];           // Allowed HTTP methods
  customValidator?: Function;          // Custom validation function
  skipPermissionCheck?: boolean;       // Skip permission validation
  allowOwnerAccess?: boolean;          // Allow resource owner access
  resourceIdParam?: string;            // Resource ID parameter name
  resourceOwnerField?: string;         // Resource owner field name
}
```

## Error Handling

### Standardized Error Response Format

```typescript
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
  };
  success: false;
}
```

### Common Error Codes

- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `METHOD_NOT_ALLOWED`: HTTP method not allowed
- `VALIDATION_ERROR`: Request validation failed
- `TOKEN_ERROR`: Authentication token error
- `INTERNAL_ERROR`: Internal server error

### Success Response Format

```typescript
interface ApiSuccessResponse<T> {
  data: T;
  success: true;
  timestamp?: string;
}
```

## Security Features

### Audit Logging

All API access attempts are logged with the following information:
- User ID and role
- Requested resource and action
- IP address and user agent
- Timestamp and result (success/failure)
- Additional context and details

### Security Event Monitoring

The system automatically detects and logs security events:
- Unauthorized access attempts
- Permission violations
- Suspicious activity patterns
- Token manipulation attempts

### Rate Limiting Integration

The middleware integrates with rate limiting to prevent abuse:
- Per-user request limits
- IP-based rate limiting
- Endpoint-specific limits
- Automatic blocking of suspicious IPs

## Performance Considerations

### Caching

- Permission results are cached to reduce database queries
- Cache invalidation on role changes
- Distributed caching support for production environments

### Optimization

- Efficient permission checking algorithms
- Minimal database queries
- Lazy loading of permission data
- Connection pooling for database operations

## Testing

### Unit Tests

```typescript
import { ApiPermissionMiddleware } from '@/lib/api-permission-middleware';

describe('API Permission Middleware', () => {
  it('should allow access with correct permissions', async () => {
    // Test implementation
  });

  it('should deny access without permissions', async () => {
    // Test implementation
  });
});
```

### Integration Tests

```typescript
import { withApiPermissions } from '@/lib/api-permission-middleware';

describe('API Route Protection', () => {
  it('should protect product creation endpoint', async () => {
    // Test API endpoint with different user roles
  });
});
```

## Migration Guide

### Updating Existing Routes

1. **Add Import**: Import the middleware functions
2. **Remove Auth Checks**: Remove manual authentication checks
3. **Wrap Handler**: Use `withApiPermissions` to wrap your handler
4. **Update Responses**: Use standardized response functions
5. **Add Permissions**: Define required permissions for the route

### Before (Old Pattern)

```typescript
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Route logic
  return NextResponse.json({ data });
}
```

### After (New Pattern)

```typescript
export const GET = withApiPermissions(
  async (request: NextRequest, { user }) => {
    // Route logic
    return createApiSuccessResponse(data);
  },
  {
    permissions: [{ resource: 'products', action: 'read', scope: 'all' }]
  }
);
```

## Best Practices

### Permission Design

1. **Principle of Least Privilege**: Grant minimum necessary permissions
2. **Resource-Specific Permissions**: Use specific resource names
3. **Scope Appropriately**: Use 'own', 'all', or 'team' scopes correctly
4. **Regular Audits**: Review and update permissions regularly

### Error Handling

1. **Consistent Responses**: Always use standardized response formats
2. **Meaningful Messages**: Provide clear error messages
3. **Security Considerations**: Don't leak sensitive information in errors
4. **Logging**: Log all security-related events

### Performance

1. **Cache Permissions**: Use caching for frequently checked permissions
2. **Batch Operations**: Group permission checks when possible
3. **Monitor Performance**: Track permission check latency
4. **Optimize Queries**: Use efficient database queries

## Troubleshooting

### Common Issues

1. **Permission Denied**: Check user role and required permissions
2. **Token Errors**: Verify authentication configuration
3. **Method Not Allowed**: Check allowed methods configuration
4. **Cache Issues**: Clear permission cache if needed

### Debug Mode

Enable debug logging to troubleshoot permission issues:

```typescript
process.env.DEBUG_PERMISSIONS = 'true';
```

### Monitoring

Monitor the following metrics:
- Permission check latency
- Cache hit/miss ratios
- Security event frequency
- Error rates by endpoint

## API Reference

### Main Functions

- `withApiPermissions(handler, options)`: Wrap API route handler
- `validateApiPermissions(request, options)`: Validate permissions directly
- `createApiSuccessResponse(data, status)`: Create success response
- `requireAdmin(options)`: Require admin role decorator
- `requireEditor(options)`: Require editor role decorator
- `allowOwnerOrAdmin(resourceId, ownerField)`: Allow owner or admin decorator

### Configuration

- `ROUTE_PERMISSION_MAPPINGS`: Route to permission mappings
- `ROLE_PERMISSIONS`: Role to permission mappings
- Permission cache configuration
- Audit logging configuration

## Examples

See the `examples/` directory for complete implementation examples:
- Basic CRUD operations
- Complex permission scenarios
- Custom validation patterns
- Error handling examples
- Testing patterns

## Support

For questions or issues with the API Permission System:
1. Check this documentation
2. Review the test files for examples
3. Check the troubleshooting section
4. Contact the development team