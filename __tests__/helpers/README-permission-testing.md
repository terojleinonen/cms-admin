# Permission Hook Testing Utilities

This document provides comprehensive guidance on using the permission hook testing utilities for testing role-based access control (RBAC) functionality in the CMS application.

## Overview

The permission hook testing utilities provide a complete testing framework for:
- Permission hooks (`usePermissions`)
- Role guard hooks (`useRoleGuard`) 
- Audit logger hooks (`useAuditLogger`)
- Component-level permission testing
- Performance testing
- Integration testing

## Core Testing Utilities

### 1. MockPermissionProvider

A mock provider component that simulates the permission context for testing.

```typescript
import { MockPermissionProvider } from './permission-hook-test-utils'

// Basic usage
<MockPermissionProvider user={mockUser}>
  <ComponentToTest />
</MockPermissionProvider>

// With custom permissions
<MockPermissionProvider 
  user={mockUser}
  customPermissions={{
    'products.create': true,
    'users.delete': false
  }}
>
  <ComponentToTest />
</MockPermissionProvider>
```

### 2. renderPermissionHook

Renders permission hooks with mock providers and utilities for dynamic testing.

```typescript
import { renderPermissionHook } from './permission-hook-test-utils'
import { usePermissions } from '../../app/lib/hooks/usePermissions'

const result = renderPermissionHook(() => usePermissions(), {
  user: createMockUser({ role: UserRole.EDITOR }),
  customPermissions: { 'products.create': true }
})

// Access the hook result
const permissions = result.result.current

// Update user dynamically
result.updateUser(createMockUser({ role: UserRole.ADMIN }))

// Update permissions dynamically
result.updatePermissions({ 'users.create': true })
```

## Role-Specific Testing

### Quick Role Testing

```typescript
import { PermissionHookTestUtils } from './permission-hook-test-utils'

// Test as different roles
const adminResult = PermissionHookTestUtils.renderAsAdmin(() => usePermissions())
const editorResult = PermissionHookTestUtils.renderAsEditor(() => usePermissions())
const viewerResult = PermissionHookTestUtils.renderAsViewer(() => usePermissions())
const unauthResult = PermissionHookTestUtils.renderAsUnauthenticated(() => usePermissions())
```

### Scenario-Based Testing

```typescript
// Test with predefined scenarios
const result = PermissionHookTestUtils.renderWithScenario(
  () => usePermissions(),
  'ADMIN', // Uses PERMISSION_TEST_SCENARIOS.ADMIN
  { 'custom.permission': true } // Additional custom permissions
)
```

### Testing All Role Scenarios

```typescript
await PermissionHookTestUtils.testAllRoleScenarios(
  () => usePermissions(),
  async (result, scenario) => {
    const permissions = result.result.current
    
    // Test expected permissions for this role
    Object.entries(scenario.expectedPermissions).forEach(([method, expected]) => {
      const actual = permissions[method]()
      expect(actual).toBe(expected)
    })
  }
)
```

## Assertion Utilities

### Basic Permission Assertions

```typescript
import { PermissionHookAssertions } from './permission-hook-test-utils'

const permissions = result.result.current

// Basic access assertions
PermissionHookAssertions.expectCanAccess(permissions, 'products', 'create')
PermissionHookAssertions.expectCannotAccess(permissions, 'users', 'delete')

// Role assertions
PermissionHookAssertions.expectIsAdmin(permissions)
PermissionHookAssertions.expectIsNotEditor(permissions)
PermissionHookAssertions.expectHasMinimumRole(permissions, UserRole.EDITOR)

// Authentication assertions
PermissionHookAssertions.expectIsAuthenticated(permissions)
PermissionHookAssertions.expectIsNotLoading(permissions)
```

### Resource-Specific Assertions

```typescript
// Product permissions
PermissionHookAssertions.expectCanCreateProduct(permissions)
PermissionHookAssertions.expectCanReadProduct(permissions, 'owner-id')
PermissionHookAssertions.expectCannotDeleteProduct(permissions, 'other-user-id')

// User management permissions
PermissionHookAssertions.expectCanCreateUser(permissions)
PermissionHookAssertions.expectCannotDeleteUser(permissions, 'self-id') // Can't delete self

// System permissions
PermissionHookAssertions.expectCanManageSecurity(permissions)
PermissionHookAssertions.expectCannotReadAnalytics(permissions)
```

### Filtering Assertions

```typescript
const items = [{ id: '1' }, { id: '2' }]
const getResource = () => 'products'

// Test filtering behavior
PermissionHookAssertions.expectAllItemsFiltered(permissions, items, getResource)
PermissionHookAssertions.expectNoItemsFiltered(permissions, items, getResource)
PermissionHookAssertions.expectFilteredItems(permissions, items, getResource, 1) // Expect 1 item
```

## Role Guard Testing

### Basic Role Guard Testing

```typescript
import { RoleGuardHookTestUtils } from './permission-hook-test-utils'

const result = RoleGuardHookTestUtils.renderRoleGuardHook({
  requiredRole: UserRole.ADMIN,
  redirectTo: '/unauthorized'
}, mockUser)

expect(result.result.current.isAuthorized).toBe(true)
expect(result.result.current.reason).toBeUndefined()
```

### Role Guard Scenario Testing

```typescript
// Test a complete scenario
const results = await RoleGuardHookTestUtils.testRoleGuardScenario('ADMIN_ONLY')

// Check results for each role
const adminResult = results.find(r => r.role === UserRole.ADMIN)
expect(adminResult?.isAuthorized).toBe(true)

const editorResult = results.find(r => r.role === UserRole.EDITOR)
expect(editorResult?.isAuthorized).toBe(false)
expect(editorResult?.reason).toContain('Required role: ADMIN')
```

## Audit Logger Testing

### Basic Audit Logger Testing

```typescript
import { AuditLoggerHookTestUtils } from './permission-hook-test-utils'

const result = AuditLoggerHookTestUtils.renderAuditLoggerHook({
  enableBatching: true,
  batchSize: 5
}, mockUser)

const logger = result.getMockLogger()

// Test logging
await act(async () => {
  await logger.logAuth('login', { method: 'password' })
})

expect(logger.logAuth).toHaveBeenCalledWith('login', { method: 'password' })
```

### Audit Logger Scenario Testing

```typescript
// Test authentication scenario
const logs = await AuditLoggerHookTestUtils.testAuditLoggerScenario('AUTHENTICATION')

expect(logs.length).toBeGreaterThan(0)
logs.forEach(log => {
  expect(log.action).toMatch(/^auth\./)
  expect(log.resource).toBe('user')
})
```

## Performance Testing

### Hook Performance Testing

```typescript
const performance = await PermissionHookTestUtils.measureHookPerformance(
  () => usePermissions(),
  100, // iterations
  UserRole.EDITOR
)

expect(performance.average).toBeLessThan(50) // ms
expect(performance.median).toBeLessThan(performance.average)
```

## Comprehensive Test Suites

### Full Permission Test Suite

```typescript
import { PermissionTestSuiteRunner } from './permission-hook-test-utils'

const results = await PermissionTestSuiteRunner.runFullPermissionSuite(() => usePermissions())

// Check all role tests passed
const failedTests = results.roleTests.filter(test => !test.passed)
expect(failedTests.length).toBe(0)

// Check performance is acceptable
expect(results.performanceTests.average).toBeLessThan(100)
```

### Role Guard Test Suite

```typescript
const results = await PermissionTestSuiteRunner.runRoleGuardSuite()

expect(results.length).toBe(Object.keys(ROLE_GUARD_SCENARIOS).length)
results.forEach(result => {
  expect(result.scenario).toBeDefined()
  expect(result.results).toBeDefined()
})
```

### Audit Logger Test Suite

```typescript
const results = await PermissionTestSuiteRunner.runAuditLoggerSuite()

expect(results.length).toBe(Object.keys(AUDIT_LOG_SCENARIOS).length)
results.forEach(result => {
  expect(result.logCount).toBeGreaterThanOrEqual(0)
})
```

## Test Setup and Cleanup

### Setup

```typescript
import { PermissionHookTestCleanup } from './permission-hook-test-utils'

describe('Permission Tests', () => {
  beforeEach(() => {
    PermissionHookTestCleanup.beforeEach()
  })

  afterEach(() => {
    PermissionHookTestCleanup.afterEach()
  })

  beforeAll(() => {
    PermissionHookTestCleanup.beforeAll()
  })

  afterAll(() => {
    PermissionHookTestCleanup.afterAll()
  })
})
```

## Advanced Testing Patterns

### Dynamic Permission Updates

```typescript
const result = renderPermissionHook(() => usePermissions(), {
  user: createMockUser({ role: UserRole.VIEWER })
})

// Test initial state
PermissionHookAssertions.expectIsViewer(result.result.current)

// Update role
act(() => {
  result.updateUser(createMockUser({ role: UserRole.ADMIN }))
})

// Test updated state
PermissionHookAssertions.expectIsAdmin(result.result.current)
```

### Custom Permission Logic Testing

```typescript
const customPermissions = {
  'products.create': true,
  'products.delete': false,
  'custom.action': true
}

const result = renderPermissionHook(() => usePermissions(), {
  user: createMockUser({ role: UserRole.EDITOR }),
  customPermissions
})

// Test custom permissions override default role permissions
PermissionHookAssertions.expectCanAccess(result.result.current, 'custom', 'action')
PermissionHookAssertions.expectCannotAccess(result.result.current, 'products', 'delete')
```

### Integration Testing

```typescript
// Test multiple hooks working together
const user = createMockUser({ role: UserRole.ADMIN })

const permissionsResult = renderPermissionHook(() => usePermissions(), { user })
const roleGuardResult = RoleGuardHookTestUtils.renderRoleGuardHook({
  requiredRole: UserRole.ADMIN
}, user)
const auditLoggerResult = AuditLoggerHookTestUtils.renderAuditLoggerHook({}, user)

// All should work together consistently
PermissionHookAssertions.expectIsAdmin(permissionsResult.result.current)
expect(roleGuardResult.result.current.isAuthorized).toBe(true)
expect(auditLoggerResult.result.current.isEnabled).toBe(true)
```

## Best Practices

### 1. Use Descriptive Test Names

```typescript
it('should allow admin to create users but not delete themselves', () => {
  // Test implementation
})

it('should filter products based on read permissions for viewer role', () => {
  // Test implementation
})
```

### 2. Test Edge Cases

```typescript
it('should handle null user gracefully', () => {
  const result = renderPermissionHook(() => usePermissions(), { user: null })
  PermissionHookAssertions.expectIsNotAuthenticated(result.result.current)
})

it('should handle rapid user role changes', () => {
  const result = renderPermissionHook(() => usePermissions(), {
    user: createMockUser({ role: UserRole.VIEWER })
  })

  act(() => {
    result.updateUser(createMockUser({ role: UserRole.ADMIN }))
    result.updateUser(null)
    result.updateUser(createMockUser({ role: UserRole.EDITOR }))
  })

  PermissionHookAssertions.expectIsEditor(result.result.current)
})
```

### 3. Test Performance

```typescript
it('should perform permission checks efficiently', async () => {
  const performance = await PermissionHookTestUtils.measureHookPerformance(
    () => usePermissions(),
    50
  )

  expect(performance.average).toBeLessThan(10) // Should be very fast
})
```

### 4. Use Comprehensive Test Suites

```typescript
it('should pass all permission scenarios', async () => {
  const results = await PermissionTestSuiteRunner.runFullPermissionSuite(() => usePermissions())
  
  const failedTests = results.roleTests.filter(test => !test.passed)
  if (failedTests.length > 0) {
    console.log('Failed permission tests:', failedTests)
  }
  
  expect(failedTests.length).toBe(0)
})
```

## Common Testing Scenarios

### 1. Testing Ownership-Based Permissions

```typescript
it('should allow users to edit their own content but not others', () => {
  const user = createMockUser({ id: 'user-123', role: UserRole.EDITOR })
  const result = renderPermissionHook(() => usePermissions(), { user })
  const permissions = result.result.current

  // Can edit own content
  PermissionHookAssertions.expectCanUpdateProduct(permissions, 'user-123')
  
  // Cannot edit others' content (unless admin)
  PermissionHookAssertions.expectCannotUpdateProduct(permissions, 'other-user')
})
```

### 2. Testing Route Access

```typescript
it('should control route access based on permissions', () => {
  const editorResult = PermissionHookTestUtils.renderAsEditor(() => usePermissions())
  const viewerResult = PermissionHookTestUtils.renderAsViewer(() => usePermissions())

  // Editor can access product management
  PermissionHookAssertions.expectCanAccessRoute(editorResult.result.current, '/admin/products')
  
  // Viewer cannot access user management
  PermissionHookAssertions.expectCannotAccessRoute(viewerResult.result.current, '/admin/users')
})
```

### 3. Testing Permission Caching

```typescript
it('should cache permission results for performance', () => {
  const result = renderPermissionHook(() => usePermissions(), {
    user: createMockUser({ role: UserRole.EDITOR })
  })

  const permissions = result.result.current

  // First call
  const firstResult = permissions.canCreateProduct()
  
  // Second call should use cache
  const secondResult = permissions.canCreateProduct()
  
  expect(firstResult).toBe(secondResult)
  // In a real implementation, you'd verify cache usage
})
```

This comprehensive testing framework ensures that all permission-related functionality is thoroughly tested with consistent, reliable, and maintainable test code.