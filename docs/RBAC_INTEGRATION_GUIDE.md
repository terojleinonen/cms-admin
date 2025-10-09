# RBAC System Integration Guide

## Quick Start

This guide helps developers integrate with the Production RBAC system quickly and effectively.

## Installation and Setup

### 1. Environment Configuration

Add required environment variables:

```bash
# .env.local
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3001
DATABASE_URL=postgresql://user:password@localhost:5432/cms_db
REDIS_URL=redis://localhost:6379  # For production caching
```

### 2. Database Setup

Run migrations to set up RBAC tables:

```bash
npm run db:migrate
npm run db:seed  # Creates default roles and admin user
```

### 3. Middleware Configuration

The RBAC middleware is automatically configured. Verify it's working:

```typescript
// middleware.ts (already configured)
import { withAuth } from "next-auth/middleware"
import { hasRouteAccess } from "@/lib/permissions"

export default withAuth(
  function middleware(req) {
    // Route protection logic
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
}
```

## Frontend Integration

### Using Permission Hooks

```typescript
import { usePermissions } from '@/hooks/usePermissions'

function MyComponent() {
  const {
    canAccess,
    canCreate,
    canUpdate,
    canDelete,
    isAdmin,
    isEditor,
    filterByPermissions
  } = usePermissions()

  // Basic permission checks
  const canCreateProducts = canCreate('products')
  const canManageUsers = canAccess('users', 'manage')
  
  // Role checks
  if (isAdmin()) {
    // Admin-only logic
  }

  // Filter data based on permissions
  const allowedItems = filterByPermissions(items, item => `products:${item.id}`)

  return (
    <div>
      {canCreateProducts && <CreateButton />}
      {canManageUsers && <UserManagement />}
    </div>
  )
}
```

### Using Guard Components

```typescript
import { RoleGuard, PermissionGate, ConditionalRender } from '@/components/auth'

function Dashboard() {
  return (
    <div>
      {/* Role-based rendering */}
      <RoleGuard allowedRoles={['ADMIN', 'EDITOR']}>
        <AdminPanel />
      </RoleGuard>

      {/* Permission-based rendering */}
      <PermissionGate resource="products" action="create">
        <CreateProductButton />
      </PermissionGate>

      {/* Complex conditional rendering */}
      <ConditionalRender
        condition={(permissions) => 
          permissions.canAccess('analytics', 'read') || 
          permissions.isAdmin()
        }
      >
        <AnalyticsDashboard />
      </ConditionalRender>
    </div>
  )
}
```

### Navigation Integration

```typescript
import { usePermissions } from '@/hooks/usePermissions'

const navigationItems = [
  {
    name: 'Products',
    href: '/admin/products',
    requiredPermissions: [{ resource: 'products', action: 'read' }]
  },
  {
    name: 'Users',
    href: '/admin/users',
    requiredPermissions: [{ resource: 'users', action: 'read' }]
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    requiredPermissions: [{ resource: 'analytics', action: 'read' }]
  }
]

function Navigation() {
  const { canAccess } = usePermissions()

  const allowedItems = navigationItems.filter(item =>
    item.requiredPermissions.every(perm =>
      canAccess(perm.resource, perm.action)
    )
  )

  return (
    <nav>
      {allowedItems.map(item => (
        <NavLink key={item.href} href={item.href}>
          {item.name}
        </NavLink>
      ))}
    </nav>
  )
}
```

## Backend Integration

### API Route Protection

```typescript
// app/api/products/route.ts
import { withPermission } from '@/lib/api-auth'
import { NextRequest } from 'next/server'

export const GET = withPermission(
  async function handler(req: NextRequest) {
    // Your API logic here
    const products = await getProducts()
    return Response.json({ products })
  },
  { resource: 'products', action: 'read' }
)

export const POST = withPermission(
  async function handler(req: NextRequest) {
    const data = await req.json()
    const product = await createProduct(data)
    return Response.json({ product })
  },
  { resource: 'products', action: 'create' }
)
```

### Manual Permission Checking

```typescript
import { getServerSession } from 'next-auth'
import { hasPermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  const session = await getServerSession()
  
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check specific permission
  if (!hasPermission(session.user, { resource: 'analytics', action: 'read' })) {
    return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  // Your logic here
  const analytics = await getAnalytics()
  return Response.json({ analytics })
}
```

### Database Queries with Permissions

```typescript
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'

export async function getUserProducts(userId: string) {
  const session = await getServerSession()
  
  // Admin can see all products
  if (session?.user?.role === 'ADMIN') {
    return prisma.product.findMany()
  }
  
  // Editor can see all products
  if (session?.user?.role === 'EDITOR') {
    return prisma.product.findMany()
  }
  
  // Viewer can only see published products
  return prisma.product.findMany({
    where: { status: 'PUBLISHED' }
  })
}
```

## Testing Integration

### Component Testing with Permissions

```typescript
import { render, screen } from '@testing-library/react'
import { renderWithPermissions } from '@/test-utils'
import ProductManagement from './ProductManagement'

describe('ProductManagement', () => {
  it('shows create button for users with create permission', () => {
    renderWithPermissions(
      <ProductManagement />,
      [{ resource: 'products', action: 'create' }]
    )
    
    expect(screen.getByText('Create Product')).toBeInTheDocument()
  })

  it('hides create button for users without permission', () => {
    renderWithPermissions(
      <ProductManagement />,
      [{ resource: 'products', action: 'read' }]
    )
    
    expect(screen.queryByText('Create Product')).not.toBeInTheDocument()
  })
})
```

### API Testing with Permissions

```typescript
import { testApiHandler } from 'next-test-api-route-handler'
import handler from '@/app/api/products/route'
import { createMockSession } from '@/test-utils'

describe('/api/products', () => {
  it('allows product creation for editors', async () => {
    await testApiHandler({
      handler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': createMockSession({ role: 'EDITOR' })
          },
          body: JSON.stringify({
            name: 'Test Product',
            price: 99.99
          })
        })

        expect(res.status).toBe(201)
      }
    })
  })

  it('denies product creation for viewers', async () => {
    await testApiHandler({
      handler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: {
            'Cookie': createMockSession({ role: 'VIEWER' })
          }
        })

        expect(res.status).toBe(403)
      }
    })
  })
})
```

## Common Patterns

### Conditional Form Fields

```typescript
function ProductForm() {
  const { canUpdate } = usePermissions()
  
  return (
    <form>
      <input name="name" disabled={!canUpdate('products')} />
      <input name="description" disabled={!canUpdate('products')} />
      
      {canUpdate('products', 'pricing') && (
        <input name="price" type="number" />
      )}
      
      {canUpdate('products', 'inventory') && (
        <input name="stock" type="number" />
      )}
    </form>
  )
}
```

### Dynamic Action Buttons

```typescript
function ProductActions({ product }) {
  const { canUpdate, canDelete, canManage } = usePermissions()
  
  return (
    <div className="flex gap-2">
      {canUpdate('products') && (
        <button onClick={() => editProduct(product.id)}>
          Edit
        </button>
      )}
      
      {canDelete('products') && (
        <button onClick={() => deleteProduct(product.id)}>
          Delete
        </button>
      )}
      
      {canManage('products') && (
        <button onClick={() => duplicateProduct(product.id)}>
          Duplicate
        </button>
      )}
    </div>
  )
}
```

### Permission-Based Data Loading

```typescript
function useProductData() {
  const { canAccess } = usePermissions()
  const [products, setProducts] = useState([])
  
  useEffect(() => {
    async function loadProducts() {
      let endpoint = '/api/products'
      
      // Load different data based on permissions
      if (canAccess('products', 'manage')) {
        endpoint += '?includeUnpublished=true'
      }
      
      if (canAccess('analytics', 'read')) {
        endpoint += '&includeAnalytics=true'
      }
      
      const response = await fetch(endpoint)
      const data = await response.json()
      setProducts(data.products)
    }
    
    loadProducts()
  }, [canAccess])
  
  return products
}
```

## Performance Optimization

### Permission Caching

```typescript
// The system automatically caches permissions, but you can optimize further:

function useOptimizedPermissions() {
  const { canAccess } = usePermissions()
  
  // Memoize expensive permission checks
  const canManageProducts = useMemo(
    () => canAccess('products', 'manage'),
    [canAccess]
  )
  
  const canManageUsers = useMemo(
    () => canAccess('users', 'manage'),
    [canAccess]
  )
  
  return { canManageProducts, canManageUsers }
}
```

### Batch Permission Checks

```typescript
// Check multiple permissions at once
async function checkMultiplePermissions(permissions) {
  const response = await fetch('/api/permissions/bulk-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ permissions })
  })
  
  return response.json()
}

// Usage
const permissionResults = await checkMultiplePermissions([
  { resource: 'products', action: 'create' },
  { resource: 'orders', action: 'read' },
  { resource: 'users', action: 'manage' }
])
```

## Troubleshooting

### Common Issues

1. **Permission checks failing unexpectedly**
   - Verify user session is valid
   - Check role assignments in database
   - Ensure permission cache is not stale

2. **Components not re-rendering after role changes**
   - Use `invalidateUserCache()` after role updates
   - Ensure permission context is properly wrapped

3. **API routes not protected**
   - Verify middleware configuration
   - Check route patterns in middleware config
   - Ensure `withPermission` wrapper is used

### Debug Tools

```typescript
// Enable debug logging
localStorage.setItem('rbac-debug', 'true')

// Check current user permissions
console.log(await fetch('/api/auth/me').then(r => r.json()))

// Verify permission cache
console.log(await fetch('/api/permissions/cache-status').then(r => r.json()))
```

## Migration Guide

### Upgrading from Basic Auth

1. **Update components to use permission hooks**
2. **Replace role checks with permission checks**
3. **Add permission guards to sensitive components**
4. **Update API routes with permission middleware**
5. **Run database migrations for RBAC tables**

### Example Migration

```typescript
// Before (basic role check)
function AdminPanel() {
  const { data: session } = useSession()
  
  if (session?.user?.role !== 'ADMIN') {
    return <div>Access denied</div>
  }
  
  return <div>Admin content</div>
}

// After (permission-based)
function AdminPanel() {
  return (
    <PermissionGate resource="admin" action="read" fallback={<div>Access denied</div>}>
      <div>Admin content</div>
    </PermissionGate>
  )
}
```

This integration guide provides practical examples and patterns for implementing the RBAC system effectively in your application.