# RBAC Developer Quick Reference

## Quick Start Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Middleware configured
- [ ] Permission hooks imported
- [ ] Guard components available
- [ ] API routes protected

## Common Imports

```typescript
// Hooks
import { usePermissions } from '@/hooks/usePermissions'
import { useRoleGuard } from '@/hooks/useRoleGuard'
import { useAuditLogger } from '@/hooks/useAuditLogger'

// Components
import { RoleGuard, PermissionGate, ConditionalRender } from '@/components/auth'

// Server-side
import { hasPermission } from '@/lib/permissions'
import { withPermission } from '@/lib/api-auth'
import { getServerSession } from 'next-auth'

// Types
import type { Permission, UserRole } from '@/types/auth'
```

## Permission Patterns

### Basic Permission Checks

```typescript
// Component level
const { canCreate, canUpdate, canDelete, canManage } = usePermissions()

if (canCreate('products')) {
  // Show create button
}

if (canUpdate('products')) {
  // Enable edit functionality
}

if (canDelete('products')) {
  // Show delete option
}

if (canManage('users')) {
  // Full admin access
}
```

### Role-Based Checks

```typescript
const { isAdmin, isEditor, isViewer } = usePermissions()

// Simple role checks
if (isAdmin()) {
  // Admin-only features
}

// Multiple role check
if (isAdmin() || isEditor()) {
  // Admin or Editor features
}
```

### Resource-Specific Permissions

```typescript
const { canAccess } = usePermissions()

// Specific resource and action
if (canAccess('analytics', 'read')) {
  // Show analytics dashboard
}

if (canAccess('users', 'manage')) {
  // Show user management
}

if (canAccess('settings', 'update')) {
  // Allow settings modification
}
```

## Component Patterns

### Guard Components

```typescript
// Role-based guard
<RoleGuard allowedRoles={['ADMIN']}>
  <AdminOnlyComponent />
</RoleGuard>

// Permission-based guard
<PermissionGate resource="products" action="create">
  <CreateProductButton />
</PermissionGate>

// Multiple permissions
<PermissionGate 
  resource="products" 
  action="create"
  fallback={<div>Access denied</div>}
>
  <CreateProductForm />
</PermissionGate>

// Complex conditions
<ConditionalRender
  condition={(perms) => perms.isAdmin() || perms.canAccess('products', 'manage')}
  fallback={<ReadOnlyView />}
>
  <EditableProductView />
</ConditionalRender>
```

### Navigation Filtering

```typescript
function Navigation() {
  const { canAccess } = usePermissions()
  
  const navItems = [
    { name: 'Products', href: '/products', permission: { resource: 'products', action: 'read' } },
    { name: 'Orders', href: '/orders', permission: { resource: 'orders', action: 'read' } },
    { name: 'Users', href: '/users', permission: { resource: 'users', action: 'read' } },
    { name: 'Analytics', href: '/analytics', permission: { resource: 'analytics', action: 'read' } }
  ]
  
  return (
    <nav>
      {navItems
        .filter(item => canAccess(item.permission.resource, item.permission.action))
        .map(item => (
          <NavLink key={item.href} href={item.href}>
            {item.name}
          </NavLink>
        ))
      }
    </nav>
  )
}
```

### Form Field Permissions

```typescript
function ProductForm({ product }) {
  const { canUpdate } = usePermissions()
  
  return (
    <form>
      <input 
        name="name" 
        defaultValue={product.name}
        disabled={!canUpdate('products')} 
      />
      
      <input 
        name="description" 
        defaultValue={product.description}
        disabled={!canUpdate('products')} 
      />
      
      {canUpdate('products', 'pricing') && (
        <input name="price" type="number" defaultValue={product.price} />
      )}
      
      {canUpdate('products', 'inventory') && (
        <input name="stock" type="number" defaultValue={product.stock} />
      )}
    </form>
  )
}
```

## API Patterns

### Route Protection

```typescript
// app/api/products/route.ts
import { withPermission } from '@/lib/api-auth'

export const GET = withPermission(
  async function(req) {
    const products = await getProducts()
    return Response.json({ products })
  },
  { resource: 'products', action: 'read' }
)

export const POST = withPermission(
  async function(req) {
    const data = await req.json()
    const product = await createProduct(data)
    return Response.json({ product }, { status: 201 })
  },
  { resource: 'products', action: 'create' }
)
```

### Manual Permission Checks

```typescript
import { getServerSession } from 'next-auth'
import { hasPermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  const session = await getServerSession()
  
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!hasPermission(session.user, { resource: 'analytics', action: 'read' })) {
    return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const analytics = await getAnalytics()
  return Response.json({ analytics })
}
```

### Conditional Data Loading

```typescript
export async function GET(request: NextRequest) {
  const session = await getServerSession()
  const { searchParams } = new URL(request.url)
  
  let query = {}
  
  // Admin sees all data
  if (hasPermission(session.user, { resource: 'products', action: 'manage' })) {
    // No restrictions
  }
  // Editor sees published and draft
  else if (hasPermission(session.user, { resource: 'products', action: 'update' })) {
    query = { status: { in: ['PUBLISHED', 'DRAFT'] } }
  }
  // Viewer sees only published
  else {
    query = { status: 'PUBLISHED' }
  }
  
  const products = await prisma.product.findMany({ where: query })
  return Response.json({ products })
}
```

## Testing Patterns

### Component Testing

```typescript
import { renderWithPermissions } from '@/test-utils'

describe('ProductManagement', () => {
  it('shows create button for editors', () => {
    renderWithPermissions(
      <ProductManagement />,
      [{ resource: 'products', action: 'create' }]
    )
    
    expect(screen.getByText('Create Product')).toBeInTheDocument()
  })
  
  it('hides admin features for non-admins', () => {
    renderWithPermissions(
      <ProductManagement />,
      [{ resource: 'products', action: 'read' }]
    )
    
    expect(screen.queryByText('Delete All')).not.toBeInTheDocument()
  })
})
```

### API Testing

```typescript
import { createMockSession } from '@/test-utils'

describe('/api/products', () => {
  it('allows product creation for editors', async () => {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': createMockSession({ role: 'EDITOR' })
      },
      body: JSON.stringify({ name: 'Test Product' })
    })
    
    expect(response.status).toBe(201)
  })
  
  it('denies access for insufficient permissions', async () => {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Cookie': createMockSession({ role: 'VIEWER' })
      }
    })
    
    expect(response.status).toBe(403)
  })
})
```

## Error Handling

### Frontend Error Handling

```typescript
function ProductActions() {
  const { canDelete } = usePermissions()
  
  const handleDelete = async (productId: string) => {
    if (!canDelete('products')) {
      toast.error('You do not have permission to delete products')
      return
    }
    
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE'
      })
      
      if (response.status === 403) {
        toast.error('Permission denied')
        return
      }
      
      if (!response.ok) {
        throw new Error('Failed to delete product')
      }
      
      toast.success('Product deleted successfully')
    } catch (error) {
      toast.error('An error occurred while deleting the product')
    }
  }
  
  return (
    <button onClick={() => handleDelete(product.id)}>
      Delete
    </button>
  )
}
```

### API Error Responses

```typescript
// Standardized error responses
export function createErrorResponse(code: string, message: string, status: number) {
  return Response.json({
    success: false,
    error: {
      code,
      message,
      timestamp: new Date().toISOString()
    }
  }, { status })
}

// Usage in API routes
if (!hasPermission(user, permission)) {
  return createErrorResponse(
    'PERMISSION_DENIED',
    'Insufficient permissions to access this resource',
    403
  )
}
```

## Performance Tips

### Memoization

```typescript
function ProductDashboard() {
  const { canAccess } = usePermissions()
  
  // Memoize expensive permission checks
  const permissions = useMemo(() => ({
    canCreateProducts: canAccess('products', 'create'),
    canManageUsers: canAccess('users', 'manage'),
    canViewAnalytics: canAccess('analytics', 'read')
  }), [canAccess])
  
  return (
    <div>
      {permissions.canCreateProducts && <CreateButton />}
      {permissions.canManageUsers && <UserManagement />}
      {permissions.canViewAnalytics && <Analytics />}
    </div>
  )
}
```

### Batch Permission Checks

```typescript
// Check multiple permissions at once
async function checkMultiplePermissions() {
  const permissions = [
    { resource: 'products', action: 'create' },
    { resource: 'orders', action: 'read' },
    { resource: 'users', action: 'manage' }
  ]
  
  const response = await fetch('/api/permissions/bulk-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ permissions })
  })
  
  return response.json()
}
```

## Common Gotchas

### 1. Client vs Server Permission Checks

```typescript
// ❌ Wrong - Only client-side check
function DeleteButton() {
  const { canDelete } = usePermissions()
  
  if (!canDelete('products')) return null
  
  return <button onClick={deleteProduct}>Delete</button>
}

// ✅ Correct - Both client and server checks
function DeleteButton() {
  const { canDelete } = usePermissions()
  
  const handleDelete = async () => {
    // Server will also validate permissions
    const response = await fetch('/api/products/123', { method: 'DELETE' })
    if (response.status === 403) {
      alert('Permission denied')
    }
  }
  
  if (!canDelete('products')) return null
  
  return <button onClick={handleDelete}>Delete</button>
}
```

### 2. Permission Cache Invalidation

```typescript
// ❌ Wrong - Not invalidating cache after role change
async function updateUserRole(userId: string, newRole: string) {
  await updateRole(userId, newRole)
  // Cache still has old permissions!
}

// ✅ Correct - Invalidate cache after changes
async function updateUserRole(userId: string, newRole: string) {
  await updateRole(userId, newRole)
  await invalidateUserCache(userId)
  // Refresh current user's permissions if needed
  if (userId === currentUser.id) {
    await refreshSession()
  }
}
```

### 3. Scope Handling

```typescript
// ❌ Wrong - Not considering scope
if (canUpdate('users')) {
  // User might only be able to update their own profile!
}

// ✅ Correct - Check appropriate scope
if (canUpdate('users', 'all')) {
  // Can update any user
} else if (canUpdate('users', 'own') && userId === currentUser.id) {
  // Can only update own profile
}
```

## Debugging

### Debug Utilities

```typescript
// Enable debug mode
localStorage.setItem('rbac-debug', 'true')

// Check current permissions
console.log(await fetch('/api/auth/me').then(r => r.json()))

// Check specific permission
console.log(await fetch('/api/permissions/check?resource=products&action=create').then(r => r.json()))

// View permission cache
console.log(await fetch('/api/permissions/cache-status').then(r => r.json()))
```

### Common Debug Commands

```bash
# Check user roles in database
npx prisma studio

# View audit logs
curl -H "Cookie: session-token" /api/audit-logs

# Test permission endpoint
curl -H "Cookie: session-token" "/api/permissions/check?resource=products&action=create"

# Check middleware logs
tail -f logs/middleware.log
```

This reference guide provides quick access to the most common RBAC patterns and solutions for typical development scenarios.