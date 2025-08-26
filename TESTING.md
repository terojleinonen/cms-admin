# CMS Testing Guide

This document provides comprehensive information about the testing strategy, setup, and execution for the CMS application.

## 📚 Complete Testing Documentation

For detailed testing information, see our comprehensive testing documentation:

### [📋 Testing Documentation Index](./docs/TESTING_DOCUMENTATION_INDEX.md)
**Complete guide to all testing documentation and resources**

### Key Documents:
- **[Testing Guidelines & Best Practices](./docs/TESTING_GUIDELINES.md)** - Core standards, patterns, and best practices
- **[Test Setup & Configuration Guide](./docs/TEST_SETUP_GUIDE.md)** - Environment setup and configuration
- **[Test Structure & Organization Guide](./docs/TEST_STRUCTURE_GUIDE.md)** - File organization and naming conventions
- **[Test Debugging Guide](./docs/TEST_DEBUGGING_GUIDE.md)** - Troubleshooting and debugging techniques
- **[Testing Onboarding Guide](./docs/TESTING_ONBOARDING_GUIDE.md)** - New developer learning path

---

## Quick Reference

## Testing Strategy

Our testing approach follows the testing pyramid with four main layers:

### 1. Unit Tests
- **Purpose**: Test individual functions, utilities, and services in isolation
- **Location**: `__tests__/lib/`
- **Coverage**: All utility functions, services, and business logic
- **Run with**: `npm run test:unit`

### 2. Integration Tests
- **Purpose**: Test API endpoints and database interactions
- **Location**: `__tests__/api/`
- **Coverage**: All API routes, authentication, and data persistence
- **Run with**: `npm run test:integration`

### 3. Component Tests
- **Purpose**: Test React components with user interactions
- **Location**: `__tests__/components/`
- **Coverage**: UI components, forms, and user interactions
- **Run with**: `npm run test:components`

### 4. End-to-End Tests
- **Purpose**: Test complete user workflows and business processes
- **Location**: `__tests__/e2e/`
- **Coverage**: Critical user journeys and system integration
- **Run with**: `npm run test:e2e`

## Test Structure

```
__tests__/
├── api/                    # API integration tests
│   ├── categories-integration.test.ts
│   ├── products-integration.test.ts
│   └── ...
├── components/             # React component tests
│   ├── MediaGrid.test.tsx
│   ├── ProductForm.test.tsx
│   └── ...
├── e2e/                   # End-to-end workflow tests
│   ├── product-management-workflow.test.ts
│   ├── user-authentication-flow.test.ts
│   └── ...
├── lib/                   # Unit tests for utilities
│   ├── auth-utils.test.ts
│   ├── media-utils.test.ts
│   ├── password-utils.test.ts
│   ├── search.test.ts
│   └── ...
└── helpers/               # Test utilities and helpers
    ├── test-helpers.ts
    └── auth-helpers.ts
```

## Running Tests

### Quick Commands

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit          # Unit tests only
npm run test:integration   # API integration tests
npm run test:components    # React component tests
npm run test:e2e          # End-to-end tests

# Development commands
npm run test:watch        # Watch mode for development
npm run test:coverage     # Generate coverage report
npm run test:verbose      # Verbose output for debugging
```

### Advanced Usage

```bash
# Run specific test file
npx jest __tests__/lib/password-utils.test.ts

# Run tests matching pattern
npx jest --testNamePattern="should validate password"

# Run tests with coverage for specific files
npx jest --coverage --collectCoverageFrom="app/lib/password-utils.ts"

# Update snapshots
npx jest --updateSnapshot

# Run tests in specific environment
npx jest --testEnvironment=jsdom __tests__/components/
```

## Test Configuration

### Jest Configuration
- **Config file**: `jest.config.js`
- **Environments**: Node.js for API/unit tests, jsdom for component tests
- **Coverage threshold**: 70% for branches, functions, lines, and statements
- **Timeout**: 30 seconds for most tests, 60 seconds for E2E tests

### Environment Setup
- **Database**: Uses test database with automatic cleanup
- **Authentication**: Mocked NextAuth sessions
- **File system**: Mocked for media operations
- **External APIs**: Mocked to avoid external dependencies

## Writing Tests

### Test Structure Guidelines

```typescript
describe('Feature/Component Name', () => {
  // Setup and teardown
  beforeEach(() => {
    // Reset mocks, create test data
  })

  afterEach(() => {
    // Cleanup test data
  })

  describe('Specific functionality', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test input'
      
      // Act
      const result = functionUnderTest(input)
      
      // Assert
      expect(result).toBe('expected output')
    })

    it('should handle error cases', () => {
      // Test error scenarios
      expect(() => functionUnderTest(null)).toThrow()
    })
  })
})
```

### Unit Test Examples

```typescript
// Testing utility functions
describe('Password Utilities', () => {
  it('should hash password securely', async () => {
    const password = 'testPassword123!'
    const hash = await hashPassword(password)
    
    expect(hash).toBeDefined()
    expect(hash).not.toBe(password)
    expect(await verifyPassword(password, hash)).toBe(true)
  })
})
```

### Integration Test Examples

```typescript
// Testing API endpoints
describe('Products API', () => {
  it('should create product with valid data', async () => {
    const productData = {
      name: 'Test Product',
      price: 99.99,
      status: 'PUBLISHED'
    }

    const request = new NextRequest('/api/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
    
    const result = await response.json()
    expect(result.product.name).toBe(productData.name)
  })
})
```

### Component Test Examples

```typescript
// Testing React components
describe('MediaGrid Component', () => {
  it('should render media items', () => {
    render(<MediaGrid media={mockMedia} />)
    
    expect(screen.getByText('Image 1.jpg')).toBeInTheDocument()
    expect(screen.getByText('1.0 MB')).toBeInTheDocument()
  })

  it('should handle media selection', async () => {
    const onSelect = jest.fn()
    render(<MediaGrid media={mockMedia} onMediaSelect={onSelect} />)
    
    await userEvent.click(screen.getByRole('checkbox'))
    expect(onSelect).toHaveBeenCalledWith(mockMedia[0])
  })
})
```

### E2E Test Examples

```typescript
// Testing complete workflows
describe('Product Management Workflow', () => {
  it('should create product with categories and media', async () => {
    // 1. Create category
    const categoryResponse = await createCategory(categoryData)
    
    // 2. Upload media
    const mediaResponse = await uploadMedia(mediaData)
    
    // 3. Create product with relationships
    const productResponse = await createProduct({
      ...productData,
      categoryIds: [category.id],
      mediaIds: [media.id]
    })
    
    // 4. Verify complete product creation
    expect(productResponse.status).toBe(201)
    // ... additional assertions
  })
})
```

## Test Helpers and Utilities

### Available Helpers

```typescript
// Test data creation
const user = await createTestUser({ role: 'ADMIN' })
const product = await createTestProduct({ name: 'Test Product' })
const category = await createTestCategory({ name: 'Test Category' })

// Authentication mocking
const session = createTestSession(user)
mockGetServerSession(session)

// Database cleanup
await cleanupTestData()

// API response assertions
await assertApiResponse(response, 200, {
  product: { name: 'Test Product' }
})
```

### Custom Matchers

```typescript
// UUID validation
expect(result.id).toBeValidUUID()

// Email validation
expect(user.email).toBeValidEmail()
```

## Mocking Strategy

### External Dependencies
- **NextAuth**: Mocked for authentication testing
- **Prisma**: Mocked for unit tests, real database for integration tests
- **File System**: Mocked to avoid actual file operations
- **Sharp**: Mocked for image processing tests
- **External APIs**: Mocked to ensure test isolation

### Mock Examples

```typescript
// Mock NextAuth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}))

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn()
    }
  }
}))

// Mock file operations
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    unlink: jest.fn()
  }
}))
```

## Coverage Requirements

### Minimum Coverage Thresholds
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Coverage Reports
- **HTML Report**: `coverage/lcov-report/index.html`
- **LCOV Report**: `coverage/lcov.info`
- **Text Summary**: Displayed in terminal

### Excluded from Coverage
- Type definitions (`*.d.ts`)
- Layout components (`layout.tsx`)
- Page components (`page.tsx`)
- Loading and error components

## Continuous Integration

### GitHub Actions Integration
```yaml
- name: Run Tests
  run: |
    npm run test:unit
    npm run test:integration
    npm run test:components

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

### Pre-commit Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:unit && npm run lint"
    }
  }
}
```

## Debugging Tests

### Common Issues and Solutions

1. **Test Database Connection**
   ```bash
   # Ensure test database is running
   docker run -d --name postgres-test -p 5433:5432 -e POSTGRES_DB=test postgres:16
   ```

2. **Mock Issues**
   ```typescript
   // Clear mocks between tests
   beforeEach(() => {
     jest.clearAllMocks()
   })
   ```

3. **Async Test Issues**
   ```typescript
   // Use proper async/await
   it('should handle async operation', async () => {
     await expect(asyncFunction()).resolves.toBe(expected)
   })
   ```

4. **Component Test Issues**
   ```typescript
   // Wait for async updates
   await waitFor(() => {
     expect(screen.getByText('Updated')).toBeInTheDocument()
   })
   ```

### Debug Commands

```bash
# Run single test with debug output
npx jest --verbose __tests__/lib/password-utils.test.ts

# Run tests with Node.js debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Run tests with coverage for specific file
npx jest --coverage --collectCoverageFrom="app/lib/auth-utils.ts" __tests__/lib/auth-utils.test.ts
```

## Best Practices

### Test Organization
- Group related tests with `describe` blocks
- Use descriptive test names that explain the expected behavior
- Follow the AAA pattern: Arrange, Act, Assert
- Keep tests focused and test one thing at a time

### Test Data Management
- Use test helpers for consistent data creation
- Clean up test data after each test
- Use realistic but minimal test data
- Avoid hardcoded IDs or timestamps

### Mocking Guidelines
- Mock external dependencies, not internal code
- Use real implementations for integration tests
- Keep mocks simple and focused
- Reset mocks between tests

### Performance Considerations
- Run unit tests frequently during development
- Run integration tests before commits
- Run E2E tests in CI/CD pipeline
- Use test parallelization for faster execution

## Troubleshooting

### Common Error Messages

1. **"Cannot find module"**
   - Check import paths and module resolution
   - Ensure mock files are in correct location

2. **"Database connection failed"**
   - Verify test database is running
   - Check DATABASE_URL environment variable

3. **"Timeout exceeded"**
   - Increase test timeout for slow operations
   - Check for unresolved promises

4. **"Mock function not called"**
   - Verify mock setup and implementation
   - Check if function is actually being called

### Getting Help

- Check existing tests for examples
- Review Jest documentation for advanced features
- Use `console.log` for debugging test data
- Run tests with `--verbose` flag for detailed output

## Future Improvements

### Planned Enhancements
- Visual regression testing with Chromatic
- Performance testing with Lighthouse CI
- Accessibility testing with jest-axe
- API contract testing with Pact
- Load testing with Artillery

### Test Automation
- Automatic test generation for new API endpoints
- Snapshot testing for component props
- Property-based testing for complex algorithms
- Mutation testing for test quality assessment