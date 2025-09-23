# API Permission Testing Utilities

This directory contains comprehensive testing utilities for API permission validation, mock authentication, and automated security testing for all endpoints.

## Overview

The API permission testing utilities provide a complete framework for testing role-based access control (RBAC) in API endpoints. They include:

- **Mock Authentication**: Utilities for mocking NextAuth authentication in tests
- **Permission Testing**: Helpers for testing permission validation logic
- **Security Test Generation**: Automated generation of security test scenarios
- **API Testing Patterns**: Reusable patterns for CRUD, Admin, and Public API testing
- **Automated Security Testing**: Tools for discovering and testing all API endpoints

## Files

### Core Testing Utilities

#### `api-permission-test-utils.ts`
Main utility file containing:
- `TestUserFactory`: Creates mock users with different roles
- `MockAuthService`: Mocks NextAuth authentication
- `MockPermissionService`: Mocks permission validation
- `ApiRequestBuilder`: Builds mock NextRequest objects
- `ApiResponseValidator`: Validates API responses
- `SecurityTestGenerator`: Generates security test scenarios
- `ApiTestRunner`: Executes security tests
- `ApiTestSetup`: Setup and teardown utilities

#### `api-permission-patterns.ts`
Reusable testing patterns:
- `CrudApiTestPattern`: Standard CRUD operation testing
- `AdminApiTestPattern`: Admin-only endpoint testing
- `PublicApiTestPattern`: Public endpoint testing

#### `automated-security-testing.ts`
Automated security testing tools:
- `ApiEndpointDiscovery`: Discovers all API endpoints
- `AutomatedSecurityTestGenerator`: Generates comprehensive test suites
- `AutomatedSecurityTestRunner`: Executes automated tests
- `SecurityTestCLI`: Command-line interface for security testing

## Usage Examples

### Basic Permission Testing

```typescript
import { 
  TestUserFactory,
  MockAuthService,
  MockPermissionService,
  ApiRequestBuilder,
  ApiResponseValidator,
  ApiTestSetup
} from './helpers/api-permission-test-utils';

describe('API Permission Tests', () => {
  beforeEach(() => {
    ApiTestSetup.initializeAll();
  });

  afterEach(() => {
    ApiTestSetup.resetAll();
  });

  it('should test user authentication', async () => {
    // Test unauthenticated request
    MockAuthService.mockUnauthenticated();
    
    const request = ApiRequestBuilder
      .post('http://localhost:3000/api/products', { name: 'Test Product' })
      .build();
    
    const response = await apiHandler(request);
    await ApiResponseValidator.validateUnauthorizedResponse(response);
  });

  it('should test user authorization', async () => {
    const admin = TestUserFactory.createAdmin();
    MockAuthService.mockAuthenticatedUser(admin);
    MockPermissionService.mockAdminPermissions();
    
    const request = ApiRequestBuilder
      .post('http://localhost:3000/api/products', { name: 'Admin Product' })
      .build();
    
    const response = await apiHandler(request);
    const data = await ApiResponseValidator.validateSuccessResponse(response, 201);
    expect(data.name).toBe('Admin Product');
  });
});
```

### CRUD API Testing

```typescript
import { CrudApiTestPattern } from './helpers/api-permission-patterns';

// Test complete CRUD operations
CrudApiTestPattern.createCompleteCrudSuite('/api/products', {
  create: createHandler,
  read: readHandler,
  update: updateHandler,
  delete: deleteHandler
}, {
  requiredPermissions: [{ resource: 'products', action: 'manage' }],
  allowedRoles: [UserRole.ADMIN, UserRole.EDITOR],
  methods: ['GET', 'POST', 'PUT', 'DELETE']
});
```

### Admin API Testing

```typescript
import { AdminApiTestPattern } from './helpers/api-permission-patterns';

AdminApiTestPattern.createTestSuite('/api/admin/dashboard', adminHandler, {
  methods: ['GET'],
  customTests: [
    {
      name: 'should return dashboard statistics',
      user: TestUserFactory.createAdmin(),
      request: ApiRequestBuilder.get('http://localhost:3000/api/admin/dashboard').build(),
      expectedStatus: 200,
      validate: async (response) => {
        const data = await ApiResponseValidator.validateSuccessResponse(response);
        expect(data).toHaveProperty('users');
        expect(data).toHaveProperty('products');
      }
    }
  ]
});
```

### Security Test Scenarios

```typescript
import { SecurityTestGenerator, ApiTestRunner } from './helpers/api-permission-test-utils';

const scenarios = SecurityTestGenerator.generateComprehensiveTestSuite({
  allowedRoles: [UserRole.ADMIN, UserRole.EDITOR],
  deniedRoles: [UserRole.VIEWER],
  allowedMethods: ['GET', 'POST'],
  includeAuthTests: true
});

for (const scenario of scenarios) {
  const request = ApiRequestBuilder.get('http://localhost:3000/api/products').build();
  await ApiTestRunner.runSecurityScenario(scenario, apiHandler, request);
}
```

### Automated Security Testing

```typescript
import { runAutomatedSecurityTests } from './helpers/automated-security-testing';

// Run automated tests for all endpoints
const report = await runAutomatedSecurityTests();
console.log(`Tests: ${report.totalTests}, Passed: ${report.passedTests}, Failed: ${report.failedTests}`);
```

## CLI Usage

The utilities include a CLI script for running automated security tests:

```bash
# Run security tests for all endpoints
npm run test:security

# Test specific endpoint
npm run test:security:endpoint /api/products

# Discover all API endpoints
npm run test:security:discover

# Analyze endpoint security configuration
npm run test:security:analyze /api/admin/users
```

## Test User Factory

Create test users with different roles:

```typescript
// Create users with specific roles
const admin = TestUserFactory.createAdmin();
const editor = TestUserFactory.createEditor();
const viewer = TestUserFactory.createViewer();

// Create user with custom options
const customUser = TestUserFactory.createUser({
  id: 'custom-123',
  email: 'custom@example.com',
  role: UserRole.EDITOR,
  isActive: true
});

// Create complete user set
const { admin, editor, viewer } = TestUserFactory.createUserSet();
```

## Mock Services

### Authentication Mocking

```typescript
// Mock authenticated user
const user = TestUserFactory.createAdmin();
MockAuthService.mockAuthenticatedUser(user);

// Mock unauthenticated request
MockAuthService.mockUnauthenticated();

// Mock expired token
MockAuthService.mockExpiredToken(user);

// Mock invalid token
MockAuthService.mockInvalidToken();
```

### Permission Mocking

```typescript
// Mock specific permission
MockPermissionService.mockPermission(
  { resource: 'products', action: 'create' },
  true
);

// Mock multiple permissions
MockPermissionService.mockPermissions({
  'products:create:all': true,
  'products:read:all': true,
  'products:update:own': true,
  'products:delete:all': false
});

// Mock role permissions
MockPermissionService.mockRolePermissions(UserRole.EDITOR, true);

// Mock admin permissions (allow all)
MockPermissionService.mockAdminPermissions();

// Mock no permissions (deny all)
MockPermissionService.mockNoPermissions();
```

## API Request Builder

Build mock NextRequest objects:

```typescript
// GET request
const getRequest = ApiRequestBuilder
  .get('http://localhost:3000/api/products')
  .build();

// POST request with JSON body
const postRequest = ApiRequestBuilder
  .post('http://localhost:3000/api/products', { name: 'Test Product' })
  .build();

// PUT request with custom headers
const putRequest = ApiRequestBuilder
  .put('http://localhost:3000/api/products/123', { name: 'Updated' })
  .addHeader('X-Custom-Header', 'value')
  .build();

// DELETE request
const deleteRequest = ApiRequestBuilder
  .delete('http://localhost:3000/api/products/123')
  .build();
```

## Response Validation

Validate API responses:

```typescript
// Validate success response
const data = await ApiResponseValidator.validateSuccessResponse(response, 201);
expect(data.id).toBeDefined();

// Validate error response
const error = await ApiResponseValidator.validateErrorResponse(response, 400, 'VALIDATION_ERROR');
expect(error.message).toContain('required');

// Validate specific error types
await ApiResponseValidator.validateUnauthorizedResponse(response);
await ApiResponseValidator.validateForbiddenResponse(response);
await ApiResponseValidator.validateMethodNotAllowedResponse(response);
```

## Security Test Scenarios

Generate comprehensive security test scenarios:

```typescript
// Authentication tests
const authTests = SecurityTestGenerator.generateAuthTestScenarios();

// Role-based tests
const roleTests = SecurityTestGenerator.generateRoleTestScenarios(
  [UserRole.ADMIN, UserRole.EDITOR], // allowed
  [UserRole.VIEWER] // denied
);

// Permission tests
const permissionTests = SecurityTestGenerator.generatePermissionTestScenarios([
  { resource: 'products', action: 'create' }
]);

// HTTP method tests
const methodTests = SecurityTestGenerator.generateMethodTestScenarios(
  ['GET', 'POST'], // allowed
  ['PUT', 'DELETE', 'PATCH'] // denied
);

// Comprehensive test suite
const allTests = SecurityTestGenerator.generateComprehensiveTestSuite({
  allowedRoles: [UserRole.ADMIN, UserRole.EDITOR],
  deniedRoles: [UserRole.VIEWER],
  requiredPermissions: [{ resource: 'products', action: 'manage' }],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  includeAuthTests: true
});
```

## Best Practices

1. **Always initialize and reset mocks**:
   ```typescript
   beforeEach(() => ApiTestSetup.initializeAll());
   afterEach(() => ApiTestSetup.resetAll());
   ```

2. **Use descriptive test names**:
   ```typescript
   it('should deny VIEWER role from creating products', async () => {
     // Test implementation
   });
   ```

3. **Test both positive and negative scenarios**:
   ```typescript
   // Test allowed access
   it('should allow ADMIN to delete products', async () => { /* ... */ });
   
   // Test denied access
   it('should deny EDITOR from deleting products', async () => { /* ... */ });
   ```

4. **Validate response structure**:
   ```typescript
   const data = await ApiResponseValidator.validateSuccessResponse(response);
   expect(data).toHaveProperty('id');
   expect(data).toHaveProperty('name');
   ```

5. **Test edge cases**:
   ```typescript
   it('should handle malformed JSON gracefully', async () => {
     const request = new NextRequest('http://localhost:3000/api/products', {
       method: 'POST',
       body: 'invalid json{',
       headers: { 'Content-Type': 'application/json' }
     });
     
     const response = await handler(request);
     expect(response.status).toBe(400);
   });
   ```

## Integration with Real API Routes

To test actual API routes, import the route handlers:

```typescript
// Import actual route handlers
import { GET, POST, PUT, DELETE } from '../app/api/products/route';

// Test with real handlers
CrudApiTestPattern.createCompleteCrudSuite('/api/products', {
  create: POST,
  read: GET,
  update: PUT,
  delete: DELETE
});
```

## Performance Testing

Test performance and concurrency:

```typescript
it('should handle concurrent requests', async () => {
  const requests = Array.from({ length: 10 }, () =>
    ApiRequestBuilder.post('http://localhost:3000/api/products', { name: 'Test' }).build()
  );

  const startTime = Date.now();
  const responses = await Promise.all(
    requests.map(request => handler(request))
  );
  const endTime = Date.now();

  expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
  responses.forEach(response => {
    expect(response.status).toBeLessThan(400);
  });
});
```

## Error Handling Testing

Test error scenarios:

```typescript
it('should handle database errors gracefully', async () => {
  // Mock database error
  const errorHandler = async (request: NextRequest) => {
    throw new Error('Database connection failed');
  };

  const request = ApiRequestBuilder.get('http://localhost:3000/api/products').build();
  
  try {
    await errorHandler(request);
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Database connection failed');
  }
});
```

## Requirements Covered

This implementation covers the following requirements from task 12:

✅ **Build test helpers for API permission validation**
- Complete set of utilities for testing authentication and authorization
- Mock services for NextAuth and permission validation
- Request builders and response validators

✅ **Create mock authentication for API tests**
- `MockAuthService` with support for authenticated, unauthenticated, expired, and invalid tokens
- Integration with NextAuth JWT mocking
- User factory for creating test users with different roles

✅ **Add automated security testing for all endpoints**
- `ApiEndpointDiscovery` for finding all API routes
- `AutomatedSecurityTestGenerator` for creating comprehensive test suites
- `AutomatedSecurityTestRunner` for executing tests
- CLI interface for running automated security tests

The utilities provide a comprehensive framework for testing API security and permissions, ensuring that all endpoints are properly protected and behave correctly under different authentication and authorization scenarios.