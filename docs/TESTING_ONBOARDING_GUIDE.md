# Testing Onboarding Guide for New Developers

## Welcome to CMS Testing

This guide will help you get up to speed with testing in the Kin Workspace CMS. Whether you're new to testing or experienced with other frameworks, this guide will walk you through our specific testing approach, tools, and best practices.

## Quick Start Checklist

### Day 1: Environment Setup
- [ ] Clone the repository and install dependencies
- [ ] Set up test database and environment variables
- [ ] Run the full test suite successfully
- [ ] Understand the test directory structure
- [ ] Run your first test in debug mode

### Week 1: Basic Testing
- [ ] Write your first unit test
- [ ] Write your first component test
- [ ] Understand mocking patterns
- [ ] Learn debugging techniques
- [ ] Complete first test-driven feature

### Month 1: Advanced Testing
- [ ] Write integration tests
- [ ] Understand performance testing
- [ ] Contribute to test infrastructure
- [ ] Mentor another developer on testing

## Getting Started

### 1. Initial Setup

```bash
# Clone and setup
git clone <repository-url>
cd kin-workspace-cms
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Setup test database
createdb kin_workspace_test
npx prisma migrate deploy

# Run tests to verify setup
npm test
```

### 2. Understanding Our Test Stack

#### Core Technologies
- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing utilities
- **Prisma**: Database ORM with mocking capabilities
- **NextAuth**: Authentication with comprehensive mocking
- **TypeScript**: Type-safe testing throughout

#### Test Types We Use
```typescript
// Unit Tests - Fast, isolated, mocked dependencies
describe('calculatePrice', () => {
  it('should calculate price with tax', () => {
    expect(calculatePrice(100, 0.1)).toBe(110)
  })
})

// Component Tests - UI behavior and interactions
describe('ProductForm', () => {
  it('should submit form with valid data', async () => {
    const mockOnSubmit = jest.fn()
    render(<ProductForm onSubmit={mockOnSubmit} />)
    
    await user.type(screen.getByLabelText(/name/i), 'Test Product')
    await user.click(screen.getByRole('button', { name: /save/i }))
    
    expect(mockOnSubmit).toHaveBeenCalled()
  })
})

// Integration Tests - Real database, complete workflows
describe('Product API Integration', () => {
  it('should create and retrieve product', async () => {
    const product = await createProduct({ name: 'Test Product' })
    const retrieved = await getProduct(product.id)
    
    expect(retrieved.name).toBe('Test Product')
  })
})
```

### 3. Your First Test

Let's write a simple test together:

```typescript
// __tests__/lib/string-utils.test.ts
import { slugify } from '@/lib/string-utils'

describe('String Utils', () => {
  describe('slugify', () => {
    it('should convert string to URL-friendly slug', () => {
      // Arrange
      const input = 'Hello World! This is a Test'
      
      // Act
      const result = slugify(input)
      
      // Assert
      expect(result).toBe('hello-world-this-is-a-test')
    })
    
    it('should handle special characters', () => {
      expect(slugify('Café & Restaurant')).toBe('cafe-restaurant')
    })
    
    it('should handle empty string', () => {
      expect(slugify('')).toBe('')
    })
  })
})
```

Now implement the function:

```typescript
// app/lib/string-utils.ts
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with single
    .trim()                   // Remove leading/trailing whitespace
}
```

Run the test:
```bash
npm test -- string-utils.test.ts
```

## Understanding Our Testing Patterns

### 1. Test-Driven Development (TDD)

We follow the Red-Green-Refactor cycle:

```typescript
// Step 1: RED - Write failing test
describe('User Registration', () => {
  it('should create user with valid email', async () => {
    const userData = { email: 'test@example.com', password: 'password123' }
    
    const user = await registerUser(userData)
    
    expect(user.email).toBe('test@example.com')
    expect(user.id).toBeDefined()
  })
})

// Step 2: GREEN - Make test pass with minimal code
export async function registerUser(userData: UserData) {
  // Minimal implementation to make test pass
  return {
    id: 'generated-id',
    email: userData.email
  }
}

// Step 3: REFACTOR - Improve implementation
export async function registerUser(userData: UserData) {
  // Proper implementation with validation, hashing, etc.
  const hashedPassword = await hashPassword(userData.password)
  
  return await db.user.create({
    data: {
      email: userData.email,
      passwordHash: hashedPassword
    }
  })
}
```

### 2. Mocking Strategies

#### Database Mocking
```typescript
// For unit tests - Mock Prisma completely
jest.mock('@/lib/db', () => ({
  product: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn()
  }
}))

// In test
import { db } from '@/lib/db'
const mockDb = db as jest.Mocked<typeof db>

beforeEach(() => {
  mockDb.product.create.mockResolvedValue({
    id: 'test-id',
    name: 'Test Product'
  })
})
```

#### Authentication Mocking
```typescript
// Mock NextAuth for protected routes
import { getServerSession } from 'next-auth/next'
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

beforeEach(() => {
  mockGetServerSession.mockResolvedValue({
    user: { id: 'user-1', role: 'ADMIN' }
  })
})
```

### 3. Component Testing Patterns

```typescript
// Testing user interactions
describe('ProductForm', () => {
  it('should validate required fields', async () => {
    const user = userEvent.setup()
    render(<ProductForm onSubmit={jest.fn()} />)
    
    // Try to submit empty form
    await user.click(screen.getByRole('button', { name: /save/i }))
    
    // Check for validation errors
    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
  })
  
  it('should call onSubmit with form data', async () => {
    const mockOnSubmit = jest.fn()
    const user = userEvent.setup()
    
    render(<ProductForm onSubmit={mockOnSubmit} />)
    
    // Fill out form
    await user.type(screen.getByLabelText(/name/i), 'Test Product')
    await user.type(screen.getByLabelText(/price/i), '99.99')
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /save/i }))
    
    // Verify submission
    expect(mockOnSubmit).toHaveBeenCalledWith({
      name: 'Test Product',
      price: 99.99
    })
  })
})
```

## Common Testing Scenarios

### 1. Testing API Routes

```typescript
// __tests__/api/products.test.ts
import { GET, POST } from '@/app/api/products/route'
import { NextRequest } from 'next/server'

describe('/api/products', () => {
  describe('GET', () => {
    it('should return products list', async () => {
      // Mock database response
      mockDb.product.findMany.mockResolvedValue([
        { id: '1', name: 'Product 1', price: 99.99 },
        { id: '2', name: 'Product 2', price: 149.99 }
      ])
      
      const request = new NextRequest('http://localhost/api/products')
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.products).toHaveLength(2)
    })
  })
  
  describe('POST', () => {
    it('should create new product', async () => {
      const productData = { name: 'New Product', price: 199.99 }
      
      mockDb.product.create.mockResolvedValue({
        id: 'new-id',
        ...productData
      })
      
      const request = new NextRequest('http://localhost/api/products', {
        method: 'POST',
        body: JSON.stringify(productData)
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(201)
      expect(data.product.name).toBe('New Product')
    })
  })
})
```

### 2. Testing Authentication

```typescript
// __tests__/api/auth.test.ts
describe('Authentication', () => {
  it('should allow access with valid session', async () => {
    // Mock authenticated session
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', role: 'ADMIN' }
    })
    
    const request = new NextRequest('http://localhost/api/admin/products')
    const response = await GET(request)
    
    expect(response.status).toBe(200)
  })
  
  it('should deny access without session', async () => {
    // Mock no session
    mockGetServerSession.mockResolvedValue(null)
    
    const request = new NextRequest('http://localhost/api/admin/products')
    const response = await GET(request)
    
    expect(response.status).toBe(401)
  })
})
```

### 3. Testing Forms and Validation

```typescript
// __tests__/components/ProductForm.test.tsx
describe('ProductForm Validation', () => {
  it('should show error for invalid price', async () => {
    const user = userEvent.setup()
    render(<ProductForm onSubmit={jest.fn()} />)
    
    // Enter invalid price
    await user.type(screen.getByLabelText(/price/i), '-10')
    await user.tab() // Trigger blur validation
    
    expect(screen.getByText(/price must be positive/i)).toBeInTheDocument()
  })
  
  it('should disable submit button while saving', async () => {
    const mockOnSubmit = jest.fn(() => new Promise(resolve => 
      setTimeout(resolve, 100)
    ))
    
    const user = userEvent.setup()
    render(<ProductForm onSubmit={mockOnSubmit} />)
    
    // Fill form and submit
    await user.type(screen.getByLabelText(/name/i), 'Test Product')
    const submitButton = screen.getByRole('button', { name: /save/i })
    await user.click(submitButton)
    
    // Button should be disabled while saving
    expect(submitButton).toBeDisabled()
  })
})
```

## Best Practices for New Developers

### 1. Writing Good Tests

#### Do's ✅
```typescript
// Good: Descriptive test names
it('should display error message when API call fails', () => {})

// Good: Test behavior, not implementation
expect(screen.getByText(/error occurred/i)).toBeInTheDocument()

// Good: Use meaningful test data
const validProduct = { name: 'Gaming Laptop', price: 1299.99 }

// Good: Test edge cases
it('should handle empty product list', () => {})
it('should handle network timeout', () => {})
```

#### Don'ts ❌
```typescript
// Bad: Vague test names
it('should work', () => {})

// Bad: Testing implementation details
expect(mockFunction).toHaveBeenCalledTimes(1)

// Bad: Magic numbers and strings
expect(result.price).toBe(123.45)

// Bad: Only testing happy path
it('should create product', () => {}) // What about errors?
```

### 2. Debugging Tests

When tests fail, follow this process:

```typescript
// 1. Isolate the failing test
describe.only('Failing Feature', () => {
  it.only('specific failing test', () => {
    // Focus on this test only
  })
})

// 2. Add debug logging
it('should create product', async () => {
  console.log('Input data:', productData)
  
  const result = await createProduct(productData)
  
  console.log('Result:', result)
  console.log('Mock calls:', mockCreate.mock.calls)
  
  expect(result).toBeDefined()
})

// 3. Use debugger
it('should process data', () => {
  debugger // Will pause execution in debug mode
  
  const result = processData(input)
  expect(result).toBe(expected)
})
```

### 3. Test Organization

```typescript
// Organize tests by feature, not by file structure
describe('Product Management', () => {
  describe('Product Creation', () => {
    describe('Validation', () => {
      it('should require product name', () => {})
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
```

## Learning Path

### Week 1: Foundations
1. **Day 1-2**: Setup environment, run existing tests
2. **Day 3-4**: Write first unit tests for utility functions
3. **Day 5**: Write first component test

### Week 2: Core Patterns
1. **Day 1-2**: Learn mocking patterns (database, auth)
2. **Day 3-4**: Write API route tests
3. **Day 5**: Debug failing tests

### Week 3: Integration
1. **Day 1-2**: Write integration tests
2. **Day 3-4**: Test complete workflows
3. **Day 5**: Performance and optimization

### Week 4: Advanced Topics
1. **Day 1-2**: E2E testing patterns
2. **Day 3-4**: Test infrastructure improvements
3. **Day 5**: Mentoring and knowledge sharing

## Common Mistakes to Avoid

### 1. Testing Implementation Instead of Behavior
```typescript
// ❌ Bad: Testing implementation
expect(mockFunction).toHaveBeenCalledWith(specificParams)

// ✅ Good: Testing behavior
expect(screen.getByText(/success message/i)).toBeInTheDocument()
```

### 2. Not Cleaning Up After Tests
```typescript
// ❌ Bad: No cleanup
it('should create user', async () => {
  await createUser(userData)
  // User remains in database
})

// ✅ Good: Proper cleanup
afterEach(async () => {
  await cleanupTestData()
})
```

### 3. Overly Complex Tests
```typescript
// ❌ Bad: Testing too much at once
it('should handle complete user workflow', () => {
  // 50 lines of test code testing multiple features
})

// ✅ Good: Focused tests
it('should create user account', () => {})
it('should send welcome email', () => {})
it('should redirect to dashboard', () => {})
```

## Getting Help

### 1. Documentation Resources
- [Testing Guidelines](./TESTING_GUIDELINES.md) - Comprehensive testing standards
- [Setup Guide](./TEST_SETUP_GUIDE.md) - Environment configuration
- [Structure Guide](./TEST_STRUCTURE_GUIDE.md) - Test organization patterns
- [Debugging Guide](./TEST_DEBUGGING_GUIDE.md) - Troubleshooting help

### 2. Code Examples
Look at existing tests for patterns:
- `__tests__/lib/` - Utility function examples
- `__tests__/components/` - Component testing examples
- `tests/integration/` - Integration test examples

### 3. Team Resources
- Ask questions in team chat
- Pair programming sessions for complex tests
- Code review feedback on test quality
- Weekly testing knowledge sharing sessions

### 4. External Resources
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Your First Assignment

To get hands-on experience, try implementing this feature with tests:

### Feature: Product Price Calculator

1. **Write the test first** (TDD approach):
```typescript
// __tests__/lib/price-calculator.test.ts
describe('Price Calculator', () => {
  it('should calculate price with tax', () => {
    const result = calculatePriceWithTax(100, 0.1)
    expect(result).toBe(110)
  })
  
  it('should handle zero tax rate', () => {
    const result = calculatePriceWithTax(100, 0)
    expect(result).toBe(100)
  })
  
  it('should throw error for negative price', () => {
    expect(() => calculatePriceWithTax(-10, 0.1)).toThrow('Price cannot be negative')
  })
})
```

2. **Implement the function**:
```typescript
// app/lib/price-calculator.ts
export function calculatePriceWithTax(price: number, taxRate: number): number {
  if (price < 0) {
    throw new Error('Price cannot be negative')
  }
  
  return price * (1 + taxRate)
}
```

3. **Run the tests**:
```bash
npm test -- price-calculator.test.ts
```

4. **Add more test cases** for edge cases and different scenarios

## Conclusion

Testing is a crucial skill that will make you a more confident and effective developer. Start with simple unit tests, gradually work up to integration tests, and always remember:

- **Write tests first** (TDD approach)
- **Test behavior, not implementation**
- **Keep tests simple and focused**
- **Clean up after your tests**
- **Ask for help when stuck**

Welcome to the team, and happy testing! 🧪✨