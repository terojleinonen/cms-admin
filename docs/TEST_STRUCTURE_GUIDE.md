# Test Structure and Organization Guide

## Overview

This guide defines the organizational patterns, naming conventions, and structural standards for tests in the Kin Workspace CMS. Following these patterns ensures consistency, maintainability, and ease of navigation across the test suite.

## Directory Structure

### Complete Test Organization

```
project-root/
├── __tests__/                          # Unit and component tests
│   ├── api/                           # API route unit tests
│   │   ├── analytics.test.ts
│   │   ├── auth.test.ts
│   │   ├── categories.test.ts
│   │   ├── media.test.ts
│   │   ├── products.test.ts
│   │   └── workflow.test.ts
│   ├── components/                    # Component unit tests
│   │   ├── media/
│   │   │   ├── MediaGrid.test.tsx
│   │   │   ├── MediaUpload.test.tsx
│   │   │   └── MediaPicker.test.tsx
│   │   ├── products/
│   │   │   ├── ProductForm.test.tsx
│   │   │   ├── ProductImageGallery.test.tsx
│   │   │   └── MediaPicker.test.tsx
│   │   └── ui/
│   │       ├── Button.test.tsx
│   │       ├── DataTable.test.tsx
│   │       ├── FormField.test.tsx
│   │       └── LoadingState.test.tsx
│   ├── lib/                          # Library function tests
│   │   ├── auth-utils.test.ts
│   │   ├── cache.test.ts
│   │   ├── image-processing.test.ts
│   │   ├── media-utils.test.ts
│   │   └── search.test.ts
│   ├── helpers/                      # Test helper utilities
│   │   ├── auth-helpers.ts
│   │   ├── test-helpers.ts
│   │   └── enhanced-mock-helpers.ts
│   └── e2e/                          # End-to-end tests
│       └── product-management-workflow.test.ts
├── tests/                            # Integration and specialized tests
│   ├── integration/                  # Integration tests
│   │   ├── auth-flow.test.ts
│   │   ├── media-workflow.test.ts
│   │   ├── product-management.test.ts
│   │   └── database-isolation.test.ts
│   ├── api/                          # API integration tests
│   │   ├── categories.test.ts
│   │   ├── media.test.ts
│   │   ├── products.test.ts
│   │   └── users.test.ts
│   ├── components/                   # Component integration tests
│   │   ├── categories.test.tsx
│   │   ├── media-advanced.test.tsx
│   │   ├── products.test.tsx
│   │   └── rich-text-editor.test.tsx
│   ├── database/                     # Database-specific tests
│   │   ├── connection.test.ts
│   │   ├── error-handling.test.ts
│   │   └── test-database-isolation.test.ts
│   ├── helpers/                      # Integration test helpers
│   │   ├── api-workflow-utils.ts
│   │   ├── database-cleanup-utils.ts
│   │   ├── integration-test-utils.ts
│   │   └── test-database-manager.ts
│   ├── performance/                  # Performance testing utilities
│   │   ├── test-performance-monitor.ts
│   │   ├── test-optimizer.ts
│   │   └── flakiness-detector.ts
│   └── setup files                   # Test configuration
│       ├── setup-integration.ts
│       ├── setup-nextauth.ts
│       └── jest-setup.ts
└── __mocks__/                        # Mock implementations
    ├── @/                           # Application mocks
    │   └── lib/
    │       ├── db.ts
    │       ├── prisma-mock.ts
    │       └── service-mocks.ts
    ├── next-auth/                   # NextAuth mocks
    │   ├── next.js
    │   └── providers/
    │       └── credentials.js
    └── next-auth.js                 # Main NextAuth mock
```

## Naming Conventions

### File Naming Patterns

#### Test Files
```
# Unit tests (alongside source files)
ComponentName.test.tsx          # Component tests
functionName.test.ts           # Function/utility tests
apiRoute.test.ts              # API route tests

# Integration tests (in tests/ directory)
feature-workflow.test.ts       # Integration workflow tests
api-integration.test.ts        # API integration tests
component-integration.test.tsx # Component integration tests

# E2E tests
user-workflow-name.test.ts     # End-to-end user workflows
```

#### Helper Files
```
test-helpers.ts               # General test utilities
feature-helpers.ts           # Feature-specific helpers
mock-helpers.ts              # Mock creation utilities
database-helpers.ts          # Database test utilities
```

#### Mock Files
```
__mocks__/module-name.js     # Module mocks
service-mocks.ts             # Service layer mocks
component-mocks.tsx          # Component mocks
```

### Test Suite Naming

```typescript
// Feature-based organization
describe('Product Management', () => {
  describe('Product Creation', () => {
    describe('Validation', () => {
      it('should validate required fields', () => {})
      it('should validate price format', () => {})
    })
    
    describe('Database Operations', () => {
      it('should save product to database', () => {})
      it('should handle duplicate names', () => {})
    })
  })
  
  describe('Product Updates', () => {
    // Update-related tests
  })
})

// Component-based organization
describe('ProductForm Component', () => {
  describe('Rendering', () => {
    it('should render all form fields', () => {})
    it('should display validation errors', () => {})
  })
  
  describe('User Interactions', () => {
    it('should handle form submission', () => {})
    it('should validate on blur', () => {})
  })
  
  describe('Props Handling', () => {
    it('should populate form with initial data', () => {})
    it('should call onSubmit with form data', () => {})
  })
})
```

### Test Case Naming

```typescript
// Good: Descriptive behavior-focused names
it('should create product when valid data is provided', () => {})
it('should display error message when name is empty', () => {})
it('should redirect to products list after successful creation', () => {})
it('should disable submit button while saving', () => {})

// Bad: Implementation-focused or vague names
it('should call createProduct', () => {})
it('should work correctly', () => {})
it('should test the function', () => {})
it('should pass', () => {})
```

## Test Organization Patterns

### 1. Feature-Based Organization

Group tests by business features rather than technical implementation:

```typescript
// ✅ Good: Feature-based
describe('User Authentication', () => {
  describe('Login Process', () => {
    it('should authenticate with valid credentials', () => {})
    it('should reject invalid credentials', () => {})
    it('should handle account lockout', () => {})
  })
  
  describe('Session Management', () => {
    it('should maintain session across requests', () => {})
    it('should expire sessions after timeout', () => {})
  })
})

// ❌ Bad: Implementation-based
describe('AuthService', () => {
  describe('validateCredentials method', () => {})
  describe('createSession method', () => {})
})
```

### 2. Hierarchical Test Structure

Use nested describe blocks to create logical hierarchies:

```typescript
describe('Product API', () => {                    // Feature level
  describe('GET /api/products', () => {            // Endpoint level
    describe('Authentication', () => {             // Aspect level
      describe('Valid Token', () => {              // Scenario level
        it('should return products list', () => {}) // Test case level
        it('should include pagination info', () => {})
      })
      
      describe('Invalid Token', () => {
        it('should return 401 status', () => {})
        it('should include error message', () => {})
      })
    })
    
    describe('Query Parameters', () => {
      describe('Filtering', () => {
        it('should filter by category', () => {})
        it('should filter by price range', () => {})
      })
      
      describe('Sorting', () => {
        it('should sort by name ascending', () => {})
        it('should sort by price descending', () => {})
      })
    })
  })
})
```

### 3. Test Data Organization

#### Test Fixtures

```typescript
// tests/fixtures/products.ts
export const validProduct = {
  name: 'Test Product',
  description: 'A test product',
  price: 99.99,
  categoryId: 'cat-1',
  status: 'ACTIVE'
}

export const invalidProduct = {
  name: '', // Invalid: empty name
  price: -10, // Invalid: negative price
}

export const productWithImages = {
  ...validProduct,
  images: [
    { id: 'img-1', url: '/test-image-1.jpg', alt: 'Test Image 1' },
    { id: 'img-2', url: '/test-image-2.jpg', alt: 'Test Image 2' }
  ]
}
```

#### Test Data Factories

```typescript
// tests/helpers/test-data-factory.ts
export class TestDataFactory {
  static createUser(overrides = {}) {
    return {
      id: `user-${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      role: 'ADMIN',
      ...overrides
    }
  }
  
  static createProduct(overrides = {}) {
    return {
      id: `prod-${Date.now()}`,
      name: `Test Product ${Date.now()}`,
      price: 99.99,
      status: 'ACTIVE',
      ...overrides
    }
  }
  
  static createCategory(overrides = {}) {
    return {
      id: `cat-${Date.now()}`,
      name: `Test Category ${Date.now()}`,
      slug: `test-category-${Date.now()}`,
      ...overrides
    }
  }
}
```

## Test Setup Patterns

### 1. Shared Setup and Teardown

```typescript
describe('Product CRUD Operations', () => {
  let testUser: User
  let testCategory: Category
  
  beforeAll(async () => {
    // Expensive setup that can be shared
    testUser = await TestDataFactory.createUser({ role: 'ADMIN' })
    testCategory = await TestDataFactory.createCategory()
  })
  
  beforeEach(async () => {
    // Setup that needs to be fresh for each test
    await cleanupTestData()
  })
  
  afterEach(async () => {
    // Cleanup after each test
    await cleanupTestData()
  })
  
  afterAll(async () => {
    // Final cleanup
    await cleanupAllTestData()
  })
})
```

### 2. Test-Specific Setup

```typescript
describe('Product Form Validation', () => {
  const setupValidForm = () => {
    return render(<ProductForm onSubmit={jest.fn()} />)
  }
  
  const setupFormWithData = (data: Partial<Product>) => {
    return render(<ProductForm initialData={data} onSubmit={jest.fn()} />)
  }
  
  it('should validate required fields', () => {
    const { getByRole } = setupValidForm()
    // Test implementation
  })
  
  it('should populate form with initial data', () => {
    const testData = TestDataFactory.createProduct()
    const { getByDisplayValue } = setupFormWithData(testData)
    // Test implementation
  })
})
```

## Mock Organization Patterns

### 1. Centralized Mock Definitions

```typescript
// __mocks__/@/lib/service-mocks.ts
export const mockProductService = {
  create: jest.fn(),
  findById: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
}

export const mockUserService = {
  authenticate: jest.fn(),
  findById: jest.fn(),
  create: jest.fn()
}

// Reset all mocks
export const resetAllMocks = () => {
  Object.values(mockProductService).forEach(mock => mock.mockReset())
  Object.values(mockUserService).forEach(mock => mock.mockReset())
}
```

### 2. Test-Specific Mock Configurations

```typescript
describe('Product API Tests', () => {
  beforeEach(() => {
    // Configure mocks for this test suite
    mockProductService.findMany.mockResolvedValue([
      TestDataFactory.createProduct({ name: 'Product 1' }),
      TestDataFactory.createProduct({ name: 'Product 2' })
    ])
  })
  
  it('should return products list', async () => {
    // Test uses the configured mock
    const response = await GET(mockRequest)
    const data = await response.json()
    
    expect(data.products).toHaveLength(2)
    expect(mockProductService.findMany).toHaveBeenCalledTimes(1)
  })
})
```

## Test Documentation Patterns

### 1. Test Suite Documentation

```typescript
/**
 * Product Management Test Suite
 * 
 * Tests the complete product management workflow including:
 * - Product creation and validation
 * - Product updates and status changes
 * - Product deletion and soft delete
 * - Product search and filtering
 * - Image management and associations
 * 
 * @requires TestDataFactory for test data creation
 * @requires mockProductService for service layer mocking
 * @requires cleanupTestData for test isolation
 */
describe('Product Management', () => {
  // Test implementation
})
```

### 2. Complex Test Documentation

```typescript
it('should handle concurrent product updates without data corruption', async () => {
  /**
   * This test verifies that concurrent updates to the same product
   * are handled correctly using database transactions and optimistic locking.
   * 
   * Test scenario:
   * 1. Create a product with version 1
   * 2. Simulate two concurrent update requests
   * 3. Verify that only one update succeeds
   * 4. Verify that the failed update returns appropriate error
   * 5. Verify that data integrity is maintained
   */
  
  // Test implementation with detailed comments
})
```

## Performance Testing Patterns

### 1. Performance Test Organization

```typescript
// tests/performance/product-api-performance.test.ts
describe('Product API Performance', () => {
  describe('GET /api/products', () => {
    it('should respond within 200ms for 100 products', async () => {
      const startTime = Date.now()
      await GET(mockRequest)
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(200)
    })
    
    it('should handle 50 concurrent requests', async () => {
      const requests = Array(50).fill(null).map(() => GET(mockRequest))
      const responses = await Promise.all(requests)
      
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })
  })
})
```

### 2. Memory and Resource Testing

```typescript
describe('Memory Usage Tests', () => {
  it('should not leak memory during bulk operations', async () => {
    const initialMemory = process.memoryUsage().heapUsed
    
    // Perform bulk operations
    for (let i = 0; i < 1000; i++) {
      await createProduct(TestDataFactory.createProduct())
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }
    
    const finalMemory = process.memoryUsage().heapUsed
    const memoryIncrease = finalMemory - initialMemory
    
    // Memory increase should be reasonable
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024) // 50MB
  })
})
```

## Best Practices Summary

### Test Organization Do's
✅ Group tests by business features
✅ Use descriptive test and suite names
✅ Maintain consistent directory structure
✅ Create reusable test utilities
✅ Document complex test scenarios
✅ Use factories for test data creation
✅ Organize mocks centrally
✅ Separate unit, integration, and e2e tests

### Test Organization Don'ts
❌ Group tests by technical implementation
❌ Use vague or generic test names
❌ Mix different types of tests in same files
❌ Duplicate test setup code
❌ Leave tests undocumented
❌ Hardcode test data in tests
❌ Scatter mock definitions across files
❌ Mix test types without clear separation

This structure guide ensures that tests are organized in a way that makes them easy to find, understand, and maintain as the application grows.