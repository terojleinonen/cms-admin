# Permission Hook Testing Utilities

This directory contains comprehensive testing utilities for the production-ready RBAC system. These utilities make it easy to test permission hooks, role guards, and audit logging functionality.

## Overview

The testing utilities provide:

1. **Mock Permission Providers** - Create mock users and sessions for testing
2. **Role-based Test Scenarios** - Pre-defined test scenarios for different user roles
3. **Assertion Helpers** - Easy-to-use assertion methods for permission states
4. **Audit Logger Testing** - Mock audit loggers with comprehensive testing support
5. **Test Data Generators** - Generate test data for products, users, categories, etc.

## Files

- `permission-test-utils.ts` - Core permission testing utilities
- `role-guard-test-utils.tsx` - Role guard component testing utilities
- `audit-logger-test-utils.ts` - Audit logging testing utilities
- `permission-hooks-test-examples.test.tsx` - Example tests demonstrating usage

## Quick Start

### Basic Permission Testing

```typescript
import { 
  createMockUser, 
  createMockPermissionHook, 
  PermissionAssertions 
} from '../helpers/permission-test-utils'

describe('Permission Tests', () => {
  it('should test admin permissions', () => {
    const adminUser = createMockUser({ role: UserRole.ADMIN })
    const permissions = createMockPermissionHook(adminUser)

    PermissionAssertions.expectIsAdmin(permissions)
    PermissionAssertions.expectCanCreateProduct(permissions)
    PermissionAssertions.expectCanCreateUser(permissions)
  })

  it('should test viewer permissions', () => {
    const viewerUser = createMockUser({ role: UserRole.VIEWER })
    const permissions = createMockPermissionHook(viewerUser)

    PermissionAssertions.expectIsViewer(permissions)
    PermissionAssertions.expectCanReadProduct(permissions)
    PermissionAssertions.expectCannotCreateProduct(permissions)
  })
})
```

### Custom Permission Testing

```typescript
it('should test custom permissions', () => {
  const user = createMockUser({ role: UserRole.VIEWER })
  const customPermissions = {
    'products.create': true, // Override default viewer permissions
    'users.read.all': true,
  }
  
  const permissions = createMockPermissionHook(user, customPermissions)

  PermissionAssertions.expectCanCreateProduct(permissions)
  PermissionAssertions.expectCanAccess(permissions, 'users', 'read', 'all')
})
```

### Audit Logger Testing

```typescript
import { 
  createMockAuditLogger, 
  AuditLoggerAssertions 
} from '../helpers/audit-logger-test-utils'

describe('Audit Logger Tests', () => {
  it('should test audit logging', async () => {
    const user = createMockUser({ role: UserRole.ADMIN })
    const auditLogger = createMockAuditLogger(user)

    await auditLogger.log({
      action: 'test.action',
      resource: 'test',
      details: { test: 'data' },
    })

    AuditLoggerAssertions.expectLogCalled(auditLogger, 1)
    AuditLoggerAssertions.expectLogCalledWith(auditLogger, {
      action: 'test.action',
      resource: 'test',
    })
  })
})
```

### Test Data Generation

```typescript
import { TestDataGenerators } from '../helpers/permission-test-utils'

describe('Data Tests', () => {
  it('should generate test data', () => {
    const products = TestDataGenerators.generateProducts(5, 'owner-id')
    const categories = TestDataGenerators.generateCategories(3)
    const users = TestDataGenerators.generateUsers(2, UserRole.EDITOR)

    expect(products).toHaveLength(5)
    expect(categories).toHaveLength(3)
    expect(users).toHaveLength(2)
    expect(users[0].role).toBe(UserRole.EDITOR)
  })
})
```

## Permission Test Scenarios

The utilities include pre-defined test scenarios for different user roles:

```typescript
import { PERMISSION_TEST_SCENARIOS } from '../helpers/permission-test-utils'

// Available scenarios:
// - PERMISSION_TEST_SCENARIOS.ADMIN
// - PERMISSION_TEST_SCENARIOS.EDITOR  
// - PERMISSION_TEST_SCENARIOS.VIEWER
// - PERMISSION_TEST_SCENARIOS.UNAUTHENTICATED

describe('Role Scenarios', () => {
  it('should validate all role scenarios', () => {
    Object.entries(PERMISSION_TEST_SCENARIOS).forEach(([scenarioName, scenario]) => {
      if (scenario.role === null) return // Skip unauthenticated

      const user = createMockUser({ role: scenario.role })
      const permissions = createMockPermissionHook(user)

      // Test expected permissions for this role
      Object.entries(scenario.expectedPermissions).forEach(([method, expected]) => {
        expect((permissions as any)[method]()).toBe(expected)
      })
    })
  })
})
```

## Available Assertion Methods

### Basic Assertions
- `expectCanAccess(permissions, resource, action, scope?)`
- `expectCannotAccess(permissions, resource, action, scope?)`
- `expectHasRole(permissions, role)`
- `expectDoesNotHaveRole(permissions, role)`

### Role Assertions
- `expectIsAdmin(permissions)`
- `expectIsNotAdmin(permissions)`
- `expectIsEditor(permissions)`
- `expectIsNotEditor(permissions)`
- `expectIsViewer(permissions)`
- `expectIsNotViewer(permissions)`

### Resource-Specific Assertions
- `expectCanCreateProduct(permissions)`
- `expectCannotCreateProduct(permissions)`
- `expectCanReadProduct(permissions, ownerId?)`
- `expectCannotReadProduct(permissions, ownerId?)`
- `expectCanUpdateProduct(permissions, ownerId?)`
- `expectCannotUpdateProduct(permissions, ownerId?)`
- `expectCanDeleteProduct(permissions, ownerId?)`
- `expectCannotDeleteProduct(permissions, ownerId?)`
- `expectCanCreateUser(permissions)`
- `expectCannotCreateUser(permissions)`

### Authentication Assertions
- `expectIsAuthenticated(permissions)`
- `expectIsNotAuthenticated(permissions)`
- `expectIsLoading(permissions)`
- `expectIsNotLoading(permissions)`

### Route Assertions
- `expectCanAccessRoute(permissions, route)`
- `expectCannotAccessRoute(permissions, route)`

## Audit Logger Assertions

### Basic Audit Assertions
- `expectLogCalled(logger, times?)`
- `expectLogNotCalled(logger)`
- `expectLogCalledWith(logger, expectedEntry)`

### Convenience Method Assertions
- `expectAuthLogCalled(logger, action, details?)`
- `expectUserLogCalled(logger, action, targetUserId?, details?)`
- `expectSecurityLogCalled(logger, action, details?)`
- `expectPermissionLogCalled(logger, permission, result, reason?)`
- `expectUnauthorizedAccessLogCalled(logger, resource, action, reason?)`

### UI Interaction Assertions
- `expectUILogCalled(logger, method, ...args)`
- `expectDataLogCalled(logger, method, ...args)`

### Log Content Assertions
- `expectLogCount(logger, expectedCount)`
- `expectLogsByAction(logger, action, expectedCount)`
- `expectLogsByResource(logger, resource, expectedCount)`
- `expectLogsBySeverity(logger, severity, expectedCount)`

## Best Practices

1. **Use Descriptive Test Names** - Clearly describe what behavior is being tested
2. **Test Both Positive and Negative Cases** - Test both allowed and denied permissions
3. **Use Appropriate Assertions** - Use specific assertion methods for better error messages
4. **Test Edge Cases** - Test boundary conditions and error scenarios
5. **Keep Tests Focused** - Each test should verify one specific behavior
6. **Use Test Data Generators** - Use the provided generators for consistent test data

## Example Test Structure

```typescript
describe('Component Permission Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Admin User', () => {
    it('should allow all operations', () => {
      // Test admin permissions
    })
  })

  describe('Editor User', () => {
    it('should allow content operations', () => {
      // Test editor permissions
    })

    it('should deny user management', () => {
      // Test denied permissions
    })
  })

  describe('Viewer User', () => {
    it('should only allow read operations', () => {
      // Test viewer permissions
    })
  })

  describe('Unauthenticated User', () => {
    it('should deny all operations', () => {
      // Test unauthenticated state
    })
  })
})
```

This testing framework provides comprehensive coverage for all permission-related functionality while maintaining clean, readable test code.