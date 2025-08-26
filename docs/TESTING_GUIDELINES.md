# CMS Testing Guidelines and Best Practices

## Overview

This document provides comprehensive guidelines for testing in the Kin Workspace CMS. It covers testing standards, best practices, and specific patterns for different types of tests in our Next.js application.

## Core Testing Principles

### 1. Test-First Development
- **ALWAYS write tests first** - Before implementing any feature or fix, write a test that demonstrates the expected behavior
- Use Test-Driven Development (TDD) approach for new features
- Write failing tests first, then implement code to make them pass
- Refactor with confidence knowing tests will catch regressions

### 2. Test Categories and Purpose

#### Unit Tests
- **Purpose**: Test individual functions, methods, and components in isolation
- **Speed**: Fast execution (<30 seconds total)
- **Dependencies**: Fully mocked
- **Location**: `__tests__/` directories alongside source files
- **Environment**: Node.js

#### Integration Tests
- **Purpose**: Test interactions between components and systems
- **Speed**: Medium execution (<2 minutes total)
- **Dependencies**: Real database with test data
- **Location**: `tests/integration/`
- **Environment**: Node.js with test database

#### Component Tests
- **Purpose**: Test React component behavior and user interactions
- **Speed**: Fast execution (<1 minute total)
- **Dependencies**: Mocked services and APIs
- **Location**: `__tests__/components/`
- **Environment**: JSDOM

#### End-to-End Tests
- **Purpose**: Test complete user workflows and application behavior
- **Speed**: Slower execution (<3 minutes total)
- **Dependencies**: Full application stack
- **Location**: `__tests__/e2e/`
- **Environment**: JSDOM with full app context

## Testing Standards

### Test Naming Conventions

```typescript
// Good: Descriptive test names that explain behavior
describe('ProductForm', () => {
  it('should validate required fields when submitting empty form', () => {})
  it('should save product data when form is valid', () => {})
  it('should display error message when API call fails', () => {})
})

// Bad: Vague or implementation-focused names
describe('ProductForm', () => {
  it('should work', () => {})
  it('should call handleSubmit', () => {})
  it('should render', () => {})
})
```

### Test Structure (AAA Pattern)

```typescript
it('should create new product when valid data is provided', async () => {
  // Arrange - Set up test data and mocks
  const productData = {
    name: 'Test Product',
    price: 99.99,
    categoryId: 'cat-1'
  }
  const mockCreate = jest.fn().mockResolvedValue({ id: 'prod-1', ...productData })
  
  // Act - Execute the behavior being tested
  const result = await createProduct(productData)
  
  // Assert - Verify the expected outcome
  expect(mockCreate).toHaveBeenCalledWith(productData)
  expect(result).toEqual({ id: 'prod-1', ...productData })
})
```

### Test Coverage Requirements

- **Minimum Coverage**: 80% for branches, functions, lines, and statements
- **Critical Paths**: 100% coverage for authentication, payment, and data validation
- **New Code**: All new features must include comprehensive tests
- **Bug Fixes**: Must include regression tests

### Error Testing Standards

```typescript
// Test both success and failure scenarios
describe('User Authentication', () => {
  it('should authenticate user with valid credentials', async () => {
    // Test success case
  })
  
  it('should reject authentication with invalid password', async () => {
    // Test failure case
  })
  
  it('should handle network errors gracefully', async () => {
    // Test error handling
  })
})
```

## CMS-Specific Testing Patterns

### Database Testing

```typescript
// Use transactions for test isolation
describe('Product CRUD Operations', () => {
  let transaction: PrismaTransaction
  
  beforeEach(async () => {
    transaction = await db.$begin()
  })
  
  afterEach(async () => {
    await transaction.$rollback()
  })
  
  it('should create product with valid data', async () => {
    const product = await transaction.product.create({
      data: { name: 'Test Product', price: 99.99 }
    })
    
    expect(product.name).toBe('Test Product')
  })
})
```

### Authentication Testing

```typescript
// Mock authentication for different user roles
describe('Admin Product Management', () => {
  it('should allow admin to create products', async () => {
    const mockSession = createMockSession({ role: 'ADMIN' })
    mockGetServerSession.mockResolvedValue(mockSession)
    
    const response = await POST(mockRequest)
    expect(response.status).toBe(201)
  })
  
  it('should deny product creation for non-admin users', async () => {
    const mockSession = createMockSession({ role: 'VIEWER' })
    mockGetServerSession.mockResolvedValue(mockSession)
    
    const response = await POST(mockRequest)
    expect(response.status).toBe(403)
  })
})
```

### API Testing

```typescript
// Test API endpoints with proper authentication
describe('Products API', () => {
  it('should return products list for authenticated user', async () => {
    const request = new NextRequest('http://localhost/api/products', {
      headers: { authorization: 'Bearer valid-token' }
    })
    
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.products).toBeInstanceOf(Array)
  })
})
```

### Component Testing

```typescript
// Test component behavior and user interactions
describe('ProductForm Component', () => {
  it('should submit form when valid data is entered', async () => {
    const mockOnSubmit = jest.fn()
    render(<ProductForm onSubmit={mockOnSubmit} />)
    
    await user.type(screen.getByLabelText(/product name/i), 'Test Product')
    await user.type(screen.getByLabelText(/price/i), '99.99')
    await user.click(screen.getByRole('button', { name: /save/i }))
    
    expect(mockOnSubmit).toHaveBeenCalledWith({
      name: 'Test Product',
      price: 99.99
    })
  })
})
```

## Mock Implementation Guidelines

### Service Mocking

```typescript
// Create comprehensive service mocks
jest.mock('@/lib/db', () => ({
  product: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}))
```

### NextAuth Mocking

```typescript
// Mock authentication consistently
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

// Helper for creating mock sessions
export const createMockSession = (overrides = {}) => ({
  user: {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'ADMIN',
    ...overrides
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
})
```

## Performance Guidelines

### Test Execution Speed
- Unit tests: <30 seconds total
- Component tests: <60 seconds total
- Integration tests: <120 seconds total
- E2E tests: <180 seconds total

### Optimization Strategies
- Use `describe.skip()` or `it.skip()` for temporarily disabled tests
- Group related tests in `describe` blocks for better organization
- Use `beforeAll` for expensive setup operations
- Use `beforeEach` for test-specific setup
- Clean up resources in `afterEach` and `afterAll`

## Debugging Test Failures

### Common Issues and Solutions

#### 1. Module Resolution Errors
```bash
# Error: Cannot resolve module '@/lib/db'
# Solution: Check Jest moduleNameMapper configuration
```

#### 2. Database Connection Issues
```bash
# Error: Connection refused
# Solution: Ensure test database is running and accessible
```

#### 3. Authentication Mock Issues
```bash
# Error: getServerSession is not a function
# Solution: Verify NextAuth mocks are properly configured
```

#### 4. Component Rendering Issues
```bash
# Error: Cannot read property of undefined
# Solution: Check component props and mock implementations
```

### Debugging Tools

```typescript
// Add debug logging to tests
console.log('Test data:', testData)
console.log('Mock calls:', mockFunction.mock.calls)

// Use Jest debugging
jest.setTimeout(30000) // Increase timeout for debugging
```

## Continuous Integration

### GitHub Actions Integration
- Tests run automatically on pull requests
- Coverage reports generated and published
- Test failures block deployment
- Performance benchmarks tracked

### Quality Gates
- All tests must pass before merge
- Coverage must meet minimum thresholds
- No new test failures allowed
- Performance regressions flagged

## Best Practices Summary

### Do's
✅ Write tests before implementing features
✅ Use descriptive test names
✅ Test both success and failure scenarios
✅ Keep tests focused and isolated
✅ Use proper setup and teardown
✅ Mock external dependencies
✅ Test edge cases and error conditions
✅ Maintain high test coverage
✅ Use meaningful assertions
✅ Document complex test scenarios

### Don'ts
❌ Skip writing tests for "simple" code
❌ Write tests that depend on other tests
❌ Use real external services in tests
❌ Ignore test failures
❌ Write overly complex tests
❌ Test implementation details
❌ Use magic numbers or strings
❌ Leave commented-out test code
❌ Write tests without clear assertions
❌ Ignore test performance

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [NextAuth Testing](https://next-auth.js.org/tutorials/testing)