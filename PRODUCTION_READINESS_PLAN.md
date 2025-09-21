# CMS Admin Production Readiness Plan
## Role-Based Access Control & Testing Strategy

### Current Issues Identified

#### 1. **Inconsistent Role-Based Access Control**
- Header quick actions don't check user roles
- Search results don't filter by permissions
- Notifications don't respect role boundaries
- Missing middleware for route protection

#### 2. **Frontend-Backend Permission Mismatch**
- Frontend shows UI elements that backend might reject
- No consistent permission checking across components
- Role hierarchy not properly implemented

#### 3. **Missing Comprehensive Testing**
- No role-based UI testing
- No integration tests for permission flows
- No end-to-end testing for different user roles

#### 4. **Security Vulnerabilities**
- Client-side role checking only (can be bypassed)
- No route-level middleware protection
- Inconsistent API permission validation

---

## Phase 1: Core Permission System (Week 1)

### 1.1 Enhanced Permission Utilities

**Create comprehensive permission system:**

```typescript
// app/lib/permissions.ts
export interface Permission {
  resource: string
  action: 'create' | 'read' | 'update' | 'delete' | 'manage'
  scope?: 'own' | 'all'
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    { resource: '*', action: 'manage', scope: 'all' }, // Full access
  ],
  EDITOR: [
    { resource: 'products', action: 'manage', scope: 'all' },
    { resource: 'categories', action: 'manage', scope: 'all' },
    { resource: 'pages', action: 'manage', scope: 'all' },
    { resource: 'media', action: 'manage', scope: 'all' },
    { resource: 'orders', action: 'read', scope: 'all' },
    { resource: 'analytics', action: 'read', scope: 'all' },
    { resource: 'profile', action: 'manage', scope: 'own' },
  ],
  VIEWER: [
    { resource: 'products', action: 'read', scope: 'all' },
    { resource: 'categories', action: 'read', scope: 'all' },
    { resource: 'pages', action: 'read', scope: 'all' },
    { resource: 'orders', action: 'read', scope: 'all' },
    { resource: 'profile', action: 'manage', scope: 'own' },
  ]
}
```

### 1.2 Route Protection Middleware

**Create Next.js middleware for route protection:**

```typescript
// middleware.ts
import { withAuth } from 'next-auth/middleware'
import { hasResourcePermission } from '@/lib/permissions'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token
    
    // Route-to-permission mapping
    const routePermissions = {
      '/admin/products': { resource: 'products', action: 'read' },
      '/admin/users': { resource: 'users', action: 'manage' },
      '/admin/analytics': { resource: 'analytics', action: 'read' },
      // ... more routes
    }
    
    const requiredPermission = getRequiredPermission(pathname)
    if (requiredPermission && !hasResourcePermission(token, requiredPermission)) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    }
  }
)
```

### 1.3 Component-Level Permission Hooks

**Create React hooks for permission checking:**

```typescript
// app/hooks/usePermissions.ts
export function usePermissions() {
  const { data: session } = useSession()
  
  return {
    canAccess: (resource: string, action: string) => 
      hasResourcePermission(session, { resource, action }),
    canManage: (resource: string) => 
      hasResourcePermission(session, { resource, action: 'manage' }),
    isAdmin: () => session?.user?.role === 'ADMIN',
    isEditor: () => ['ADMIN', 'EDITOR'].includes(session?.user?.role),
  }
}
```

---

## Phase 2: UI Component Fixes (Week 2)

### 2.1 Role-Aware Header Component

**Fix Header.tsx with proper role checking:**

```typescript
// Enhanced Header with role-based features
export default function Header({ onMenuClick, user }: HeaderProps) {
  const permissions = usePermissions()
  
  // Filter quick actions based on permissions
  const allowedQuickActions = quickActions.filter(action => 
    permissions.canAccess(action.resource, 'create')
  )
  
  // Filter search results based on permissions
  const filterSearchResults = (results: SearchResult[]) => 
    results.filter(result => 
      permissions.canAccess(result.type, 'read')
    )
  
  // Role-based notifications
  const allowedNotifications = notifications.filter(notification =>
    permissions.canAccess(notification.resource, 'read')
  )
}
```

### 2.2 Enhanced Sidebar with Dynamic Navigation

**Update Sidebar.tsx with comprehensive role checking:**

```typescript
// Enhanced navigation with granular permissions
const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: HomeIcon,
    requiredPermissions: [{ resource: 'dashboard', action: 'read' }]
  },
  {
    name: 'Products',
    href: '/admin/products',
    icon: CubeIcon,
    requiredPermissions: [{ resource: 'products', action: 'read' }],
    badge: 'New'
  },
  // ... more items with specific permissions
]
```

### 2.3 Role-Based Page Components

**Create wrapper components for role-based rendering:**

```typescript
// app/components/auth/RoleGuard.tsx
interface RoleGuardProps {
  allowedRoles: UserRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const { data: session } = useSession()
  
  if (!session?.user?.role || !allowedRoles.includes(session.user.role)) {
    return fallback || <UnauthorizedMessage />
  }
  
  return <>{children}</>
}
```

---

## Phase 3: Comprehensive Testing Suite (Week 3)

### 3.1 Role-Based Component Testing

**Create test utilities for role testing:**

```typescript
// __tests__/utils/test-utils.tsx
export function renderWithRole(
  component: React.ReactElement,
  role: UserRole = 'VIEWER'
) {
  const mockSession = {
    user: { id: '1', name: 'Test User', email: 'test@example.com', role }
  }
  
  return render(
    <SessionProvider session={mockSession}>
      {component}
    </SessionProvider>
  )
}
```

**Test each role scenario:**

```typescript
// __tests__/components/Header.role-based.test.tsx
describe('Header Role-Based Access', () => {
  test('ADMIN sees all quick actions', () => {
    renderWithRole(<Header onMenuClick={jest.fn()} />, 'ADMIN')
    expect(screen.getByText('New Product')).toBeInTheDocument()
    expect(screen.getByText('New User')).toBeInTheDocument()
  })
  
  test('EDITOR sees limited quick actions', () => {
    renderWithRole(<Header onMenuClick={jest.fn()} />, 'EDITOR')
    expect(screen.getByText('New Product')).toBeInTheDocument()
    expect(screen.queryByText('New User')).not.toBeInTheDocument()
  })
  
  test('VIEWER sees no quick actions', () => {
    renderWithRole(<Header onMenuClick={jest.fn()} />, 'VIEWER')
    expect(screen.queryByText('New Product')).not.toBeInTheDocument()
    expect(screen.queryByText('New User')).not.toBeInTheDocument()
  })
})
```

### 3.2 API Permission Testing

**Test API endpoints with different roles:**

```typescript
// __tests__/api/products.permissions.test.ts
describe('Products API Permissions', () => {
  test('ADMIN can create products', async () => {
    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validProductData)
    
    expect(response.status).toBe(201)
  })
  
  test('VIEWER cannot create products', async () => {
    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send(validProductData)
    
    expect(response.status).toBe(403)
  })
})
```

### 3.3 End-to-End Role Testing

**Create E2E tests for complete user flows:**

```typescript
// __tests__/e2e/role-flows.test.ts
describe('Role-Based User Flows', () => {
  test('Admin complete workflow', async () => {
    await loginAs('admin')
    await navigateTo('/admin/products')
    await clickButton('New Product')
    await fillForm(productData)
    await submitForm()
    expect(await getSuccessMessage()).toContain('Product created')
  })
  
  test('Editor limited workflow', async () => {
    await loginAs('editor')
    await navigateTo('/admin/users')
    expect(await getErrorMessage()).toContain('Access denied')
  })
})
```

---

## Phase 4: Security Hardening (Week 4)

### 4.1 Server-Side Permission Validation

**Ensure all API routes have proper validation:**

```typescript
// app/lib/api-auth.ts
export function requirePermission(permission: Permission) {
  return async (req: NextRequest) => {
    const session = await auth()
    
    if (!hasResourcePermission(session, permission)) {
      throw new Error('Insufficient permissions')
    }
    
    return session
  }
}

// Usage in API routes
export async function POST(req: NextRequest) {
  const session = await requirePermission({ resource: 'products', action: 'create' })(req)
  // ... rest of the handler
}
```

### 4.2 Input Validation & Sanitization

**Add comprehensive input validation:**

```typescript
// app/lib/validation-schemas.ts
export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000),
  price: z.number().positive(),
  // ... more fields
}).refine((data) => {
  // Custom business logic validation
  return data.price > 0
})
```

### 4.3 Audit Logging

**Implement comprehensive audit logging:**

```typescript
// app/lib/audit-logger.ts
export async function logUserAction(
  userId: string,
  action: string,
  resource: string,
  details?: any
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      resource,
      details: JSON.stringify(details),
      timestamp: new Date(),
      ipAddress: getClientIP(),
      userAgent: getUserAgent()
    }
  })
}
```

---

## Phase 5: Performance & Monitoring (Week 5)

### 5.1 Performance Optimization

**Implement caching for permission checks:**

```typescript
// app/lib/permission-cache.ts
const permissionCache = new Map<string, boolean>()

export function getCachedPermission(
  userId: string, 
  permission: Permission
): boolean | null {
  const key = `${userId}:${permission.resource}:${permission.action}`
  return permissionCache.get(key) ?? null
}
```

### 5.2 Monitoring & Alerting

**Add monitoring for security events:**

```typescript
// app/lib/security-monitor.ts
export function monitorSecurityEvent(event: SecurityEvent) {
  // Log security events
  console.warn('Security Event:', event)
  
  // Send alerts for critical events
  if (event.severity === 'HIGH') {
    sendSecurityAlert(event)
  }
}
```

---

## Implementation Checklist

### Week 1: Core Permissions
- [ ] Create enhanced permission system
- [ ] Implement route protection middleware
- [ ] Create permission hooks
- [ ] Update API routes with proper validation

### Week 2: UI Components
- [ ] Fix Header component role checking
- [ ] Update Sidebar with dynamic navigation
- [ ] Create RoleGuard component
- [ ] Implement permission-aware forms

### Week 3: Testing
- [ ] Create role-based test utilities
- [ ] Write component permission tests
- [ ] Add API permission tests
- [ ] Implement E2E role testing

### Week 4: Security
- [ ] Add server-side validation
- [ ] Implement input sanitization
- [ ] Add audit logging
- [ ] Security vulnerability scanning

### Week 5: Performance
- [ ] Implement permission caching
- [ ] Add performance monitoring
- [ ] Set up security alerting
- [ ] Load testing with different roles

---

## Success Metrics

### Security Metrics
- [ ] 100% API routes have permission validation
- [ ] Zero client-side only permission checks
- [ ] All user actions logged in audit trail
- [ ] Security scan shows no critical vulnerabilities

### Functionality Metrics
- [ ] All roles can access appropriate features
- [ ] No unauthorized access possible
- [ ] UI correctly reflects user permissions
- [ ] Smooth user experience for all roles

### Testing Metrics
- [ ] 90%+ test coverage for permission logic
- [ ] All role combinations tested
- [ ] E2E tests pass for all user flows
- [ ] Performance tests meet benchmarks

This plan will transform the CMS from a development prototype into a production-ready, secure, role-based content management system.