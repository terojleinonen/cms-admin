# RBAC Permission Model Reference

## Overview

The Production RBAC system uses a Resource-Action-Scope (RAS) permission model that provides granular control over user access to system resources and operations.

## Permission Structure

### Core Components

```typescript
interface Permission {
  resource: string    // What resource is being accessed
  action: string     // What action is being performed
  scope?: string     // What scope of access is allowed
}
```

### Permission Examples

```typescript
// Basic permissions
{ resource: "products", action: "read" }
{ resource: "products", action: "create" }
{ resource: "users", action: "manage", scope: "all" }
{ resource: "orders", action: "update", scope: "own" }

// Wildcard permissions (admin level)
{ resource: "*", action: "manage", scope: "all" }
```

## Resources

### Core Resources

| Resource | Description | Available Actions |
|----------|-------------|-------------------|
| `products` | Product catalog management | create, read, update, delete, manage, export, import |
| `categories` | Category management | create, read, update, delete, manage, reorder |
| `orders` | Order processing and fulfillment | read, update, delete, manage, export, fulfill |
| `users` | User account management | create, read, update, delete, manage, export |
| `analytics` | Analytics and reporting | read, export, manage |
| `media` | File and image management | create, read, update, delete, manage |
| `pages` | Content page management | create, read, update, delete, manage, publish |
| `settings` | System configuration | read, update, manage |
| `audit` | Audit logs and security | read, export, manage |

### Administrative Resources

| Resource | Description | Available Actions |
|----------|-------------|-------------------|
| `admin` | Administrative interface access | read, manage |
| `roles` | Role management | create, read, update, delete, manage |
| `permissions` | Permission management | read, update, manage |
| `security` | Security monitoring | read, manage, alert |
| `monitoring` | System monitoring | read, manage |
| `backup` | Backup and restore | create, read, manage |

### Special Resources

| Resource | Description | Available Actions |
|----------|-------------|-------------------|
| `*` | All resources (wildcard) | manage |
| `api` | API access control | read, create, update, delete |
| `notifications` | Notification system | read, create, manage |
| `workflow` | Workflow management | read, update, manage |

## Actions

### Standard Actions

| Action | Description | Typical Use Cases |
|--------|-------------|-------------------|
| `create` | Create new resources | Add products, create users, upload files |
| `read` | View/access resources | View products, read orders, access dashboards |
| `update` | Modify existing resources | Edit products, update orders, change settings |
| `delete` | Remove resources | Delete products, remove users, clear data |
| `manage` | Full administrative control | Complete resource management |
| `export` | Export data | Download reports, export user data |
| `import` | Import data | Bulk upload products, import user data |

### Specialized Actions

| Action | Description | Typical Use Cases |
|--------|-------------|-------------------|
| `publish` | Publish content | Make pages live, publish products |
| `fulfill` | Process orders | Mark orders as shipped, update fulfillment |
| `reorder` | Change item order | Reorder categories, sort navigation |
| `alert` | Manage alerts | Configure security alerts, system notifications |
| `backup` | Backup operations | Create backups, schedule backup jobs |
| `restore` | Restore operations | Restore from backup, recover data |

## Scopes

### Access Scopes

| Scope | Description | Use Cases |
|-------|-------------|-----------|
| `own` | User's own resources only | Personal profile, own orders, created content |
| `team` | Team/department resources | Team projects, department analytics |
| `all` | All resources (admin level) | System-wide access, global management |

### Scope Examples

```typescript
// User can only update their own profile
{ resource: "users", action: "update", scope: "own" }

// Editor can manage all products
{ resource: "products", action: "manage", scope: "all" }

// Team lead can view team analytics
{ resource: "analytics", action: "read", scope: "team" }
```

## Role Definitions

### ADMIN Role

**Description:** Full system administrator with unrestricted access.

**Permissions:**
```typescript
[
  // Global management
  { resource: "*", action: "manage", scope: "all" },
  
  // User management
  { resource: "users", action: "create", scope: "all" },
  { resource: "users", action: "update", scope: "all" },
  { resource: "users", action: "delete", scope: "all" },
  
  // Role and permission management
  { resource: "roles", action: "manage", scope: "all" },
  { resource: "permissions", action: "manage", scope: "all" },
  
  // Security and monitoring
  { resource: "audit", action: "read", scope: "all" },
  { resource: "security", action: "manage", scope: "all" },
  { resource: "monitoring", action: "manage", scope: "all" },
  
  // System configuration
  { resource: "settings", action: "manage", scope: "all" },
  { resource: "backup", action: "manage", scope: "all" }
]
```

### EDITOR Role

**Description:** Content manager with extensive content and product management capabilities.

**Permissions:**
```typescript
[
  // Product management
  { resource: "products", action: "create", scope: "all" },
  { resource: "products", action: "read", scope: "all" },
  { resource: "products", action: "update", scope: "all" },
  { resource: "products", action: "delete", scope: "all" },
  { resource: "products", action: "export", scope: "all" },
  { resource: "products", action: "import", scope: "all" },
  
  // Category management
  { resource: "categories", action: "manage", scope: "all" },
  
  // Content management
  { resource: "pages", action: "manage", scope: "all" },
  { resource: "media", action: "manage", scope: "all" },
  
  // Order management (limited)
  { resource: "orders", action: "read", scope: "all" },
  { resource: "orders", action: "update", scope: "all" },
  { resource: "orders", action: "fulfill", scope: "all" },
  
  // Analytics access
  { resource: "analytics", action: "read", scope: "all" },
  { resource: "analytics", action: "export", scope: "all" },
  
  // Own profile management
  { resource: "users", action: "update", scope: "own" }
]
```

### VIEWER Role

**Description:** Read-only access to most content with limited modification rights.

**Permissions:**
```typescript
[
  // Read-only product access
  { resource: "products", action: "read", scope: "all" },
  
  // Read-only category access
  { resource: "categories", action: "read", scope: "all" },
  
  // Read-only content access
  { resource: "pages", action: "read", scope: "all" },
  
  // Read-only order access
  { resource: "orders", action: "read", scope: "all" },
  
  // Limited analytics access
  { resource: "analytics", action: "read", scope: "all" },
  
  // Own profile management
  { resource: "users", action: "update", scope: "own" }
]
```

## Permission Inheritance

### Role Hierarchy

```
ADMIN
├── Full system access
├── All EDITOR permissions
└── All VIEWER permissions

EDITOR
├── Content management access
├── Limited administrative access
└── All VIEWER permissions (read access)

VIEWER
├── Read-only access
└── Own profile management
```

### Inheritance Rules

1. **Higher roles inherit lower role permissions**
2. **Explicit permissions override inherited permissions**
3. **Deny permissions take precedence over allow permissions**
4. **Scope restrictions apply even with inherited permissions**

## Custom Permissions

### Creating Custom Permissions

```typescript
// Custom permission for specific feature
{ resource: "inventory", action: "adjust", scope: "all" }

// Custom permission for API access
{ resource: "api", action: "create", scope: "webhooks" }

// Custom permission for reporting
{ resource: "reports", action: "schedule", scope: "own" }
```

### Custom Role Example

```typescript
// Inventory Manager Role
const inventoryManagerPermissions = [
  { resource: "products", action: "read", scope: "all" },
  { resource: "products", action: "update", scope: "inventory" },
  { resource: "inventory", action: "manage", scope: "all" },
  { resource: "orders", action: "read", scope: "all" },
  { resource: "analytics", action: "read", scope: "inventory" }
]
```

## Permission Validation

### Validation Rules

1. **Resource must be defined in system**
2. **Action must be valid for the resource**
3. **Scope must be appropriate for the action**
4. **User must have active session**
5. **Permission must not be expired (if TTL is set)**

### Validation Examples

```typescript
// Valid permissions
✅ { resource: "products", action: "read" }
✅ { resource: "users", action: "update", scope: "own" }
✅ { resource: "*", action: "manage", scope: "all" }

// Invalid permissions
❌ { resource: "invalid", action: "read" }        // Unknown resource
❌ { resource: "products", action: "invalid" }    // Unknown action
❌ { resource: "products", action: "delete", scope: "invalid" } // Invalid scope
```

## Permission Checking Logic

### Check Algorithm

```typescript
function hasPermission(user: User, requiredPermission: Permission): boolean {
  // 1. Check if user is authenticated
  if (!user || !user.role) return false
  
  // 2. Get user's role permissions
  const rolePermissions = getRolePermissions(user.role)
  
  // 3. Check for exact match
  const exactMatch = rolePermissions.find(p => 
    p.resource === requiredPermission.resource &&
    p.action === requiredPermission.action &&
    (!requiredPermission.scope || p.scope === requiredPermission.scope)
  )
  if (exactMatch) return true
  
  // 4. Check for wildcard resource permission
  const wildcardMatch = rolePermissions.find(p =>
    p.resource === "*" &&
    (p.action === "manage" || p.action === requiredPermission.action)
  )
  if (wildcardMatch) return true
  
  // 5. Check for manage action (implies all actions)
  const manageMatch = rolePermissions.find(p =>
    p.resource === requiredPermission.resource &&
    p.action === "manage" &&
    (!requiredPermission.scope || p.scope === requiredPermission.scope)
  )
  if (manageMatch) return true
  
  return false
}
```

### Scope Resolution

```typescript
function checkScope(userScope: string, requiredScope: string, resourceId?: string): boolean {
  // No scope required - allow
  if (!requiredScope) return true
  
  // User has 'all' scope - allow everything
  if (userScope === "all") return true
  
  // Exact scope match
  if (userScope === requiredScope) return true
  
  // 'own' scope requires resource ownership check
  if (requiredScope === "own" && resourceId) {
    return checkResourceOwnership(userId, resourceId)
  }
  
  return false
}
```

## Performance Considerations

### Caching Strategy

```typescript
interface PermissionCacheEntry {
  userId: string
  permission: Permission
  result: boolean
  expiresAt: Date
  createdAt: Date
}

// Cache key format
const cacheKey = `perm:${userId}:${resource}:${action}:${scope || 'none'}`
```

### Cache TTL Settings

| Permission Type | TTL | Reason |
|----------------|-----|---------|
| Basic permissions | 5 minutes | Balance performance and consistency |
| Admin permissions | 10 minutes | Admin changes are less frequent |
| Own scope permissions | 2 minutes | User data changes more frequently |
| Wildcard permissions | 15 minutes | Rarely change, safe to cache longer |

### Optimization Tips

1. **Batch permission checks when possible**
2. **Use permission hooks for component-level caching**
3. **Implement intelligent cache warming**
4. **Monitor cache hit rates and adjust TTL accordingly**
5. **Use Redis for distributed caching in production**

## Security Considerations

### Permission Security

1. **Always validate permissions server-side**
2. **Never trust client-side permission checks**
3. **Log all permission denials for security monitoring**
4. **Implement rate limiting on permission checks**
5. **Use secure session management**

### Audit Requirements

```typescript
interface PermissionAuditLog {
  userId: string
  permission: Permission
  result: boolean
  timestamp: Date
  ipAddress: string
  userAgent: string
  context?: Record<string, any>
}
```

This permission model provides a flexible, secure, and scalable foundation for the RBAC system while maintaining clear boundaries and audit capabilities.