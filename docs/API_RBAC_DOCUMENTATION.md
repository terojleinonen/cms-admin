# Production RBAC System API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Permission Model](#permission-model)
4. [Role System](#role-system)
5. [API Endpoints](#api-endpoints)
6. [Integration Guide](#integration-guide)
7. [Error Handling](#error-handling)
8. [Security Considerations](#security-considerations)
9. [Examples](#examples)

## Overview

The Production RBAC (Role-Based Access Control) System provides comprehensive access control for the Kin Workspace CMS. This API documentation covers all permission-related endpoints, authentication mechanisms, and integration patterns.

### Base URL
```
Production: https://your-domain.com/api
Development: http://localhost:3001/api
```

### API Version
Current version: `v1`

## Authentication

All API requests require authentication using NextAuth.js session tokens or API keys.

### Session Authentication
```http
Cookie: next-auth.session-token=<session-token>
```

### API Key Authentication
```http
Authorization: Bearer <api-key>
```

### Authentication Endpoints

#### POST /api/auth/login
Authenticate user and create session.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "EDITOR",
    "permissions": ["products:read", "products:create"]
  },
  "session": {
    "token": "session-token",
    "expires": "2024-01-01T00:00:00Z"
  }
}
```

#### POST /api/auth/logout
Invalidate current session.

**Response:**
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

#### GET /api/auth/me
Get current user information and permissions.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "EDITOR",
    "permissions": [
      {
        "resource": "products",
        "action": "read",
        "scope": "all"
      },
      {
        "resource": "products",
        "action": "create",
        "scope": "all"
      }
    ]
  }
}
```

## Permission Model

The RBAC system uses a Resource-Action-Scope (RAS) permission model.

### Permission Structure
```typescript
interface Permission {
  resource: string    // Resource type (e.g., 'products', 'users', 'analytics')
  action: string     // Action type (e.g., 'create', 'read', 'update', 'delete', 'manage')
  scope?: string     // Access scope (e.g., 'own', 'all', 'team')
}
```

### Supported Resources
- `products` - Product catalog management
- `categories` - Category management
- `orders` - Order processing
- `users` - User management
- `analytics` - Analytics and reporting
- `media` - Media and file management
- `pages` - Content page management
- `settings` - System settings
- `audit` - Audit logs and security

### Supported Actions
- `create` - Create new resources
- `read` - View/read resources
- `update` - Modify existing resources
- `delete` - Remove resources
- `manage` - Full administrative access
- `export` - Export data
- `import` - Import data

### Supported Scopes
- `own` - User's own resources only
- `team` - Team/department resources
- `all` - All resources (admin level)

## Role System

### Default Roles

#### ADMIN
Full system access with all permissions.

**Permissions:**
```json
[
  { "resource": "*", "action": "manage", "scope": "all" },
  { "resource": "users", "action": "create", "scope": "all" },
  { "resource": "users", "action": "update", "scope": "all" },
  { "resource": "users", "action": "delete", "scope": "all" },
  { "resource": "audit", "action": "read", "scope": "all" },
  { "resource": "settings", "action": "manage", "scope": "all" }
]
```

#### EDITOR
Content management with limited administrative access.

**Permissions:**
```json
[
  { "resource": "products", "action": "manage", "scope": "all" },
  { "resource": "categories", "action": "manage", "scope": "all" },
  { "resource": "pages", "action": "manage", "scope": "all" },
  { "resource": "media", "action": "manage", "scope": "all" },
  { "resource": "orders", "action": "read", "scope": "all" },
  { "resource": "orders", "action": "update", "scope": "all" },
  { "resource": "analytics", "action": "read", "scope": "all" }
]
```

#### VIEWER
Read-only access to most resources.

**Permissions:**
```json
[
  { "resource": "products", "action": "read", "scope": "all" },
  { "resource": "categories", "action": "read", "scope": "all" },
  { "resource": "pages", "action": "read", "scope": "all" },
  { "resource": "orders", "action": "read", "scope": "all" },
  { "resource": "analytics", "action": "read", "scope": "all" }
]
```

## API Endpoints

### Permission Management

#### GET /api/permissions/check
Check if user has specific permission.

**Query Parameters:**
- `resource` (required) - Resource name
- `action` (required) - Action name
- `scope` (optional) - Access scope
- `resourceId` (optional) - Specific resource ID for ownership checks

**Response:**
```json
{
  "success": true,
  "hasPermission": true,
  "permission": {
    "resource": "products",
    "action": "update",
    "scope": "all"
  }
}
```

#### POST /api/permissions/bulk-check
Check multiple permissions at once.

**Request Body:**
```json
{
  "permissions": [
    { "resource": "products", "action": "create" },
    { "resource": "orders", "action": "read" },
    { "resource": "users", "action": "manage" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    { "permission": { "resource": "products", "action": "create" }, "hasPermission": true },
    { "permission": { "resource": "orders", "action": "read" }, "hasPermission": true },
    { "permission": { "resource": "users", "action": "manage" }, "hasPermission": false }
  ]
}
```

#### GET /api/permissions/user/:userId
Get all permissions for a specific user.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "role": "EDITOR",
    "permissions": [
      { "resource": "products", "action": "manage", "scope": "all" },
      { "resource": "categories", "action": "manage", "scope": "all" }
    ]
  }
}
```

### Role Management

#### GET /api/admin/roles
List all available roles (Admin only).

**Response:**
```json
{
  "success": true,
  "roles": [
    {
      "id": "admin",
      "name": "ADMIN",
      "description": "Full system administrator",
      "permissions": [...]
    },
    {
      "id": "editor",
      "name": "EDITOR", 
      "description": "Content editor and manager",
      "permissions": [...]
    }
  ]
}
```

#### POST /api/admin/roles
Create custom role (Admin only).

**Request Body:**
```json
{
  "name": "CUSTOM_ROLE",
  "description": "Custom role description",
  "permissions": [
    { "resource": "products", "action": "read", "scope": "all" },
    { "resource": "products", "action": "create", "scope": "all" }
  ]
}
```

#### PUT /api/admin/roles/:roleId
Update role permissions (Admin only).

#### DELETE /api/admin/roles/:roleId
Delete custom role (Admin only).

### User Management

#### GET /api/admin/users
List users with role information (Admin only).

**Query Parameters:**
- `page` (optional) - Page number for pagination
- `limit` (optional) - Items per page
- `role` (optional) - Filter by role
- `search` (optional) - Search by email/name

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "user-id",
      "email": "user@example.com",
      "role": "EDITOR",
      "createdAt": "2024-01-01T00:00:00Z",
      "lastLogin": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

#### PUT /api/admin/users/:userId/role
Update user role (Admin only).

**Request Body:**
```json
{
  "role": "EDITOR"
}
```

#### POST /api/admin/users/bulk-operations
Perform bulk operations on users (Admin only).

**Request Body:**
```json
{
  "operation": "updateRole",
  "userIds": ["user1", "user2", "user3"],
  "data": {
    "role": "VIEWER"
  }
}
```

### Audit Logging

#### GET /api/audit-logs
Get audit logs with filtering.

**Query Parameters:**
- `userId` (optional) - Filter by user
- `resource` (optional) - Filter by resource
- `action` (optional) - Filter by action
- `startDate` (optional) - Start date filter
- `endDate` (optional) - End date filter
- `page` (optional) - Page number
- `limit` (optional) - Items per page

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": "log-id",
      "userId": "user-id",
      "action": "products:create",
      "resource": "products",
      "resourceId": "product-123",
      "details": {
        "productName": "New Product",
        "changes": {...}
      },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "timestamp": "2024-01-15T10:30:00Z",
      "success": true
    }
  ],
  "pagination": {...}
}
```

#### GET /api/audit-logs/security-events
Get security events and alerts (Admin only).

**Response:**
```json
{
  "success": true,
  "events": [
    {
      "id": "event-id",
      "type": "UNAUTHORIZED_ACCESS",
      "severity": "HIGH",
      "userId": "user-id",
      "ipAddress": "192.168.1.1",
      "details": {
        "attemptedResource": "admin/users",
        "userRole": "VIEWER"
      },
      "timestamp": "2024-01-15T10:30:00Z",
      "resolved": false
    }
  ]
}
```

### Analytics and Monitoring

#### GET /api/admin/analytics/permissions
Get permission usage analytics (Admin only).

**Response:**
```json
{
  "success": true,
  "analytics": {
    "totalPermissionChecks": 15420,
    "cacheHitRate": 0.85,
    "averageResponseTime": 45,
    "topResources": [
      { "resource": "products", "checks": 5200 },
      { "resource": "orders", "checks": 3100 }
    ],
    "roleDistribution": {
      "ADMIN": 5,
      "EDITOR": 25,
      "VIEWER": 150
    }
  }
}
```

#### GET /api/admin/monitoring/health
Get system health metrics (Admin only).

**Response:**
```json
{
  "success": true,
  "health": {
    "status": "healthy",
    "uptime": 86400,
    "permissionSystem": {
      "status": "operational",
      "cacheStatus": "healthy",
      "databaseConnections": 5
    },
    "metrics": {
      "activeUsers": 45,
      "permissionChecksPerSecond": 12.5,
      "errorRate": 0.001
    }
  }
}
```

## Integration Guide

### Frontend Integration

#### React Hook Usage
```typescript
import { usePermissions } from '@/hooks/usePermissions'

function ProductManagement() {
  const { canCreate, canUpdate, canDelete } = usePermissions()
  
  return (
    <div>
      {canCreate('products') && (
        <button>Create Product</button>
      )}
      {canUpdate('products') && (
        <button>Edit Product</button>
      )}
      {canDelete('products') && (
        <button>Delete Product</button>
      )}
    </div>
  )
}
```

#### Component Guards
```typescript
import { RoleGuard, PermissionGate } from '@/components/auth'

function AdminPanel() {
  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div>Admin-only content</div>
    </RoleGuard>
  )
}

function ProductActions() {
  return (
    <PermissionGate resource="products" action="create">
      <button>Create Product</button>
    </PermissionGate>
  )
}
```

### Backend Integration

#### API Route Protection
```typescript
import { withPermission } from '@/lib/api-auth'

export default withPermission(
  async function handler(req, res) {
    // Your API logic here
    res.json({ success: true })
  },
  { resource: 'products', action: 'create' }
)
```

#### Middleware Usage
```typescript
import { hasPermission } from '@/lib/permissions'

export async function middleware(request: NextRequest) {
  const session = await getSession(request)
  
  if (!hasPermission(session.user, { resource: 'admin', action: 'read' })) {
    return NextResponse.redirect('/unauthorized')
  }
  
  return NextResponse.next()
}
```

### Database Integration

#### Permission Queries
```typescript
import { prisma } from '@/lib/db'

// Get user with permissions
const userWithPermissions = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    role: {
      include: {
        permissions: true
      }
    }
  }
})

// Check cached permission
const cachedResult = await prisma.permissionCache.findFirst({
  where: {
    userId,
    resource,
    action,
    expiresAt: { gt: new Date() }
  }
})
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Insufficient permissions to access this resource",
    "details": {
      "requiredPermission": {
        "resource": "users",
        "action": "create"
      },
      "userRole": "VIEWER"
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `PERMISSION_DENIED` | User lacks required permission | 403 |
| `INSUFFICIENT_ROLE` | User role insufficient for action | 403 |
| `NOT_AUTHENTICATED` | User not authenticated | 401 |
| `SESSION_EXPIRED` | Authentication session expired | 401 |
| `INVALID_TOKEN` | Invalid authentication token | 401 |
| `RESOURCE_NOT_FOUND` | Requested resource not found | 404 |
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |

## Security Considerations

### Rate Limiting
- Permission checks: 100 requests per minute per user
- Authentication: 5 login attempts per 15 minutes per IP
- API endpoints: Varies by endpoint (documented per endpoint)

### Input Validation
- All inputs validated server-side using Zod schemas
- SQL injection prevention through Prisma ORM
- XSS protection via input sanitization
- CSRF protection enabled for state-changing operations

### Audit Requirements
- All permission checks logged
- Failed authentication attempts logged
- Administrative actions logged with full context
- Security events trigger real-time alerts

### Cache Security
- Permission cache TTL: 5 minutes default
- Cache invalidation on role changes
- Distributed cache encryption in production
- Cache poisoning prevention measures

## Examples

### Complete User Management Flow
```typescript
// 1. Check if user can manage users
const canManageUsers = await fetch('/api/permissions/check?resource=users&action=manage')
  .then(res => res.json())

if (!canManageUsers.hasPermission) {
  throw new Error('Insufficient permissions')
}

// 2. Get user list
const users = await fetch('/api/admin/users')
  .then(res => res.json())

// 3. Update user role
const updateResult = await fetch('/api/admin/users/user-123/role', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ role: 'EDITOR' })
})

// 4. Verify audit log created
const auditLogs = await fetch('/api/audit-logs?userId=user-123&action=role:update')
  .then(res => res.json())
```

### Permission-Based Data Filtering
```typescript
// Frontend component with permission filtering
function ProductList() {
  const { filterByPermissions } = usePermissions()
  const [products, setProducts] = useState([])
  
  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        // Filter products based on user permissions
        const allowedProducts = filterByPermissions(
          data.products,
          (product) => `products:${product.id}`
        )
        setProducts(allowedProducts)
      })
  }, [])
  
  return (
    <div>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

### Custom Permission Validation
```typescript
// Custom permission check with resource ownership
async function checkResourceOwnership(userId: string, resourceId: string, resourceType: string) {
  const response = await fetch('/api/permissions/check', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      resource: resourceType,
      action: 'update',
      scope: 'own',
      resourceId: resourceId
    })
  })
  
  const result = await response.json()
  return result.hasPermission
}
```

---

## Support and Resources

- **Documentation**: [Full API Documentation](./API_DOCUMENTATION.md)
- **Security Guide**: [Security Best Practices](./SECURITY_GUIDE.md)
- **Testing Guide**: [Permission Testing Guide](./TESTING_GUIDELINES.md)
- **Deployment**: [Production Deployment Guide](./DEPLOYMENT_CHECKLIST.md)

For additional support or questions about the RBAC API, please refer to the developer documentation or contact the development team.