# Test Debugging Guide

## Overview

This guide provides comprehensive troubleshooting steps for common testing issues in the Kin Workspace CMS. It covers debugging techniques, common error patterns, and solutions for various test failures.

## General Debugging Strategies

### 1. Systematic Debugging Approach

```typescript
// Step 1: Isolate the failing test
describe.only('Failing Test Suite', () => {
  it.only('specific failing test', () => {
    // Focus on one test at a time
  })
})

// Step 2: Add debug logging
it('should create product', async () => {
  console.log('Test input:', testData)
  
  const result = await createProduct(testData)
  
  console.log('Test result:', result)
  console.log('Mock calls:', mockCreate.mock.calls)
  
  expect(result).toBeDefined()
})

// Step 3: Use Jest debugging tools
it('should validate data', () => {
  const data = { name: 'Test' }
  
  // Debug assertion failures
  try {
    expect(data.name).toBe('Expected')
  } catch (error) {
    console.log('Assertion failed:', error.message)
    console.log('Actual value:', data.name)
    throw error
  }
})
```

### 2. Debug Mode Setup

```bash
# Run Jest in debug mode
npm run test:debug

# Run specific test in debug mode
npm run test:debug -- --testNamePattern="specific test name"

# Run with increased timeout for debugging
npm test -- --testTimeout=30000
```

### 3. Environment Debugging

```typescript
// Check test environment
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('Test Database URL:', process.env.TEST_DATABASE_URL)
console.log('Jest Environment:', process.env.JEST_WORKER_ID)

// Check available globals
console.log('Available globals:', Object.keys(global))
```

## Common Error Categories

### 1. Configuration Errors

#### Module Resolution Issues

**Error:**
```
Cannot resolve module '@/lib/db'
```

**Debugging Steps:**
```typescript
// 1. Check Jest configuration
console.log('Jest config moduleNameMapper:', require('./jest.config.js').moduleNameMapper)

// 2. Verify file exists
const fs = require('fs')
console.log('File exists:', fs.existsSync('./app/lib/db.ts'))

// 3. Check import path
// In test file, try absolute import
import { db } from '../../../app/lib/db'
```

**Solutions:**
```javascript
// jest.config.js - Fix module mapping
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/app/$1',
  '^@/lib/(.*)$': '<rootDir>/app/lib/$1'
}

// Or use relative imports temporarily
import { db } from '../../../app/lib/db'
```

#### TypeScript Compilation Errors

**Error:**
```
TypeScript compilation failed
```

**Debugging Steps:**
```bash
# Check TypeScript errors
npx tsc --noEmit

# Check Jest TypeScript configuration
npm test -- --showConfig

# Verify tsconfig.json paths
cat tsconfig.json | grep -A 10 "paths"
```

**Solutions:**
```json
// tsconfig.json - Ensure proper configuration
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./app/*"],
      "@/lib/*": ["./app/lib/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

#### ES Module Compatibility Issues

**Error:**
```
SyntaxError: Cannot use import statement outside a module
```

**Debugging Steps:**
```typescript
// Check if module is being transformed
console.log('Module type:', typeof require('next-auth'))

// Check Jest transform configuration
console.log('Transform ignore patterns:', 
  require('./jest.config.js').transformIgnorePatterns)
```

**Solutions:**
```javascript
// jest.config.js - Configure ES module transformation
transformIgnorePatterns: [
  'node_modules/(?!(next-auth|@next-auth)/)'
],
transform: {
  '^.+\\.(ts|tsx)$': 'ts-jest'
}
```

### 2. Database and Prisma Errors

#### Database Connection Issues

**Error:**
```
Error: Connection refused at localhost:5432
```

**Debugging Steps:**
```typescript
// Test database connection
import { PrismaClient } from '@prisma/client'

const testConnection = async () => {
  const prisma = new PrismaClient({
    datasources: {
      db: { url: process.env.TEST_DATABASE_URL }
    }
  })
  
  try {
    await prisma.$connect()
    console.log('Database connected successfully')
    
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('Query result:', result)
  } catch (error) {
    console.error('Database connection failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run in test
beforeAll(async () => {
  await testConnection()
})
```

**Solutions:**
```bash
# 1. Verify PostgreSQL is running
pg_isready -h localhost -p 5432

# 2. Check database exists
psql -h localhost -U postgres -l | grep kin_workspace_test

# 3. Verify environment variables
echo $TEST_DATABASE_URL

# 4. Create test database if missing
createdb kin_workspace_test

# 5. Run migrations
npx prisma migrate deploy
```

#### Prisma Mock Issues

**Error:**
```
TypeError: Cannot read property 'create' of undefined
```

**Debugging Steps:**
```typescript
// Check mock setup
import { prismaMock } from '../__mocks__/@/lib/prisma-mock'

console.log('Prisma mock:', prismaMock)
console.log('Product mock:', prismaMock.product)
console.log('Create mock:', prismaMock.product.create)

// Verify mock is being used
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: prismaMock
}))
```

**Solutions:**
```typescript
// __mocks__/@/lib/db.ts - Proper mock setup
import { mockDeep } from 'jest-mock-extended'
import { PrismaClient } from '@prisma/client'

const prismaMock = mockDeep<PrismaClient>()

export default prismaMock

// In test file - Proper mock usage
import { prismaMock } from '../__mocks__/@/lib/db'

beforeEach(() => {
  // Configure mock before each test
  prismaMock.product.create.mockResolvedValue({
    id: 'test-id',
    name: 'Test Product',
    price: 99.99
  })
})
```

#### Transaction and Cleanup Issues

**Error:**
```
Unique constraint violation: Product name already exists
```

**Debugging Steps:**
```typescript
// Check test isolation
describe('Product Tests', () => {
  beforeEach(async () => {
    console.log('Before test - checking existing data')
    const existingProducts = await prisma.product.findMany()
    console.log('Existing products:', existingProducts.length)
  })
  
  afterEach(async () => {
    console.log('After test - cleaning up')
    const deletedCount = await prisma.product.deleteMany()
    console.log('Deleted products:', deletedCount.count)
  })
})
```

**Solutions:**
```typescript
// Proper test isolation with transactions
describe('Product Integration Tests', () => {
  let transaction: any
  
  beforeEach(async () => {
    // Start transaction for each test
    transaction = await prisma.$begin()
  })
  
  afterEach(async () => {
    // Rollback transaction after each test
    if (transaction) {
      await transaction.$rollback()
    }
  })
  
  it('should create product', async () => {
    const product = await transaction.product.create({
      data: { name: `Test Product ${Date.now()}`, price: 99.99 }
    })
    
    expect(product.id).toBeDefined()
  })
})
```

### 3. Authentication and Session Errors

#### NextAuth Mock Issues

**Error:**
```
TypeError: getServerSession is not a function
```

**Debugging Steps:**
```typescript
// Check NextAuth mock setup
import { getServerSession } from 'next-auth/next'

console.log('getServerSession type:', typeof getServerSession)
console.log('getServerSession mock:', getServerSession.mock)

// Verify mock is applied
console.log('Mock calls:', getServerSession.mock?.calls)
```

**Solutions:**
```typescript
// __mocks__/next-auth/next.js - Proper NextAuth mock
export const getServerSession = jest.fn()

// In test setup file
import { getServerSession } from 'next-auth/next'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

// Helper function for creating mock sessions
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

// In test file
beforeEach(() => {
  mockGetServerSession.mockResolvedValue(createMockSession())
})
```

#### Session State Issues

**Error:**
```
Expected authenticated user but got null
```

**Debugging Steps:**
```typescript
// Debug session state
it('should authenticate user', async () => {
  const mockSession = createMockSession({ role: 'ADMIN' })
  mockGetServerSession.mockResolvedValue(mockSession)
  
  console.log('Mock session configured:', mockSession)
  
  const session = await getServerSession()
  console.log('Retrieved session:', session)
  
  expect(session).not.toBeNull()
  expect(session?.user.role).toBe('ADMIN')
})
```

**Solutions:**
```typescript
// Consistent session mocking
describe('Authenticated Routes', () => {
  beforeEach(() => {
    // Always set up authentication for this suite
    const adminSession = createMockSession({ role: 'ADMIN' })
    mockGetServerSession.mockResolvedValue(adminSession)
  })
  
  it('should allow admin access', async () => {
    const request = new NextRequest('http://localhost/api/admin/products')
    const response = await GET(request)
    
    expect(response.status).toBe(200)
  })
})
```

### 4. Component Testing Errors

#### Rendering Issues

**Error:**
```
TypeError: Cannot read property 'render' of undefined
```

**Debugging Steps:**
```typescript
// Check React Testing Library setup
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

console.log('Render function:', typeof render)
console.log('Screen object:', typeof screen)
console.log('UserEvent:', typeof userEvent)

// Check component imports
import ProductForm from '@/components/products/ProductForm'
console.log('Component:', typeof ProductForm)
```

**Solutions:**
```typescript
// Proper component test setup
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProductForm from '@/components/products/ProductForm'

// Test wrapper for providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      {children}
    </div>
  )
}

const renderWithWrapper = (component: React.ReactElement) => {
  return render(component, { wrapper: TestWrapper })
}

describe('ProductForm', () => {
  it('should render form fields', () => {
    renderWithWrapper(<ProductForm onSubmit={jest.fn()} />)
    
    expect(screen.getByLabelText(/product name/i)).toBeInTheDocument()
  })
})
```

#### Event Handling Issues

**Error:**
```
Expected function to be called but it was not
```

**Debugging Steps:**
```typescript
// Debug event handling
it('should call onSubmit when form is submitted', async () => {
  const mockOnSubmit = jest.fn()
  const user = userEvent.setup()
  
  render(<ProductForm onSubmit={mockOnSubmit} />)
  
  // Debug form elements
  const nameInput = screen.getByLabelText(/product name/i)
  const submitButton = screen.getByRole('button', { name: /save/i })
  
  console.log('Name input:', nameInput)
  console.log('Submit button:', submitButton)
  
  // Debug user interactions
  await user.type(nameInput, 'Test Product')
  console.log('Input value after typing:', nameInput.value)
  
  await user.click(submitButton)
  console.log('Mock calls after click:', mockOnSubmit.mock.calls)
  
  expect(mockOnSubmit).toHaveBeenCalled()
})
```

**Solutions:**
```typescript
// Proper event testing
it('should handle form submission correctly', async () => {
  const mockOnSubmit = jest.fn()
  const user = userEvent.setup()
  
  render(<ProductForm onSubmit={mockOnSubmit} />)
  
  // Fill form completely
  await user.type(screen.getByLabelText(/product name/i), 'Test Product')
  await user.type(screen.getByLabelText(/price/i), '99.99')
  
  // Submit form
  await user.click(screen.getByRole('button', { name: /save/i }))
  
  // Wait for async operations
  await waitFor(() => {
    expect(mockOnSubmit).toHaveBeenCalledWith({
      name: 'Test Product',
      price: 99.99
    })
  })
})
```

### 5. Async Operation Issues

#### Promise Resolution Problems

**Error:**
```
Timeout - Async callback was not invoked within timeout
```

**Debugging Steps:**
```typescript
// Debug async operations
it('should handle async operations', async () => {
  console.log('Starting async test')
  
  const promise = asyncOperation()
  console.log('Promise created:', promise)
  
  try {
    const result = await promise
    console.log('Promise resolved:', result)
    expect(result).toBeDefined()
  } catch (error) {
    console.error('Promise rejected:', error)
    throw error
  }
}, 10000) // Increase timeout for debugging
```

**Solutions:**
```typescript
// Proper async testing
describe('Async Operations', () => {
  // Increase timeout for async tests
  jest.setTimeout(10000)
  
  it('should handle async API calls', async () => {
    // Mock async dependencies
    mockApiCall.mockResolvedValue({ success: true })
    
    const result = await performAsyncOperation()
    
    expect(result.success).toBe(true)
    expect(mockApiCall).toHaveBeenCalled()
  })
  
  it('should handle async errors', async () => {
    mockApiCall.mockRejectedValue(new Error('API Error'))
    
    await expect(performAsyncOperation()).rejects.toThrow('API Error')
  })
})
```

#### Race Condition Issues

**Error:**
```
Test results are inconsistent between runs
```

**Debugging Steps:**
```typescript
// Debug race conditions
it('should handle concurrent operations', async () => {
  console.log('Starting concurrent operations')
  
  const operations = [
    operation1(),
    operation2(),
    operation3()
  ]
  
  console.log('Operations started:', operations.length)
  
  const results = await Promise.all(operations)
  console.log('All operations completed:', results)
  
  expect(results).toHaveLength(3)
})
```

**Solutions:**
```typescript
// Proper concurrent testing
describe('Concurrent Operations', () => {
  it('should handle multiple simultaneous requests', async () => {
    // Use Promise.all for true concurrency testing
    const requests = Array(5).fill(null).map((_, index) => 
      createProduct({ name: `Product ${index}` })
    )
    
    const results = await Promise.all(requests)
    
    expect(results).toHaveLength(5)
    results.forEach((result, index) => {
      expect(result.name).toBe(`Product ${index}`)
    })
  })
})
```

## Performance Debugging

### 1. Slow Test Execution

**Debugging Steps:**
```bash
# Profile test execution
npm test -- --verbose --detectOpenHandles

# Run tests serially to identify slow tests
npm test -- --runInBand --verbose

# Check for memory leaks
npm test -- --detectLeaks
```

**Solutions:**
```typescript
// Optimize test performance
describe('Performance Optimized Tests', () => {
  // Use beforeAll for expensive setup
  beforeAll(async () => {
    await expensiveSetup()
  })
  
  // Use beforeEach only for test-specific setup
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  // Clean up resources
  afterAll(async () => {
    await cleanupResources()
  })
})
```

### 2. Memory Leaks

**Debugging Steps:**
```typescript
// Monitor memory usage
describe('Memory Leak Detection', () => {
  it('should not leak memory', async () => {
    const initialMemory = process.memoryUsage().heapUsed
    
    // Perform operations that might leak memory
    for (let i = 0; i < 100; i++) {
      await createAndDeleteProduct()
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }
    
    const finalMemory = process.memoryUsage().heapUsed
    const memoryIncrease = finalMemory - initialMemory
    
    console.log('Memory increase:', memoryIncrease / 1024 / 1024, 'MB')
    
    // Memory increase should be reasonable
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024) // 10MB
  })
})
```

## Debugging Tools and Utilities

### 1. Custom Debug Helpers

```typescript
// tests/helpers/debug-helpers.ts
export const debugTest = (testName: string, data: any) => {
  if (process.env.DEBUG_TESTS) {
    console.log(`[DEBUG] ${testName}:`, JSON.stringify(data, null, 2))
  }
}

export const debugMockCalls = (mockFn: jest.MockedFunction<any>, name: string) => {
  if (process.env.DEBUG_TESTS) {
    console.log(`[DEBUG] ${name} mock calls:`, mockFn.mock.calls)
    console.log(`[DEBUG] ${name} mock results:`, mockFn.mock.results)
  }
}

export const debugAsyncOperation = async <T>(
  operation: Promise<T>,
  name: string
): Promise<T> => {
  if (process.env.DEBUG_TESTS) {
    console.log(`[DEBUG] Starting ${name}`)
    const start = Date.now()
    
    try {
      const result = await operation
      const duration = Date.now() - start
      console.log(`[DEBUG] ${name} completed in ${duration}ms`)
      return result
    } catch (error) {
      const duration = Date.now() - start
      console.log(`[DEBUG] ${name} failed after ${duration}ms:`, error)
      throw error
    }
  }
  
  return operation
}
```

### 2. Test Environment Debugging

```bash
# Enable debug mode
export DEBUG_TESTS=true
npm test

# Run with Node.js debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# Run with increased verbosity
npm test -- --verbose --no-cache --detectOpenHandles
```

### 3. IDE Integration

```json
// .vscode/launch.json - VS Code debugging configuration
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Jest Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache", "--testNamePattern=${input:testName}"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "env": {
        "DEBUG_TESTS": "true"
      }
    }
  ],
  "inputs": [
    {
      "id": "testName",
      "description": "Test name pattern",
      "default": "",
      "type": "promptString"
    }
  ]
}
```

## Quick Reference

### Common Commands
```bash
# Debug specific test
npm test -- --testNamePattern="test name" --verbose

# Run with debugging
npm run test:debug

# Check test configuration
npm test -- --showConfig

# Clear Jest cache
npx jest --clearCache

# Run tests with coverage and debugging
npm test -- --coverage --verbose --detectOpenHandles
```

### Environment Variables
```bash
# Enable debug logging
export DEBUG_TESTS=true

# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"

# Enable garbage collection
export NODE_OPTIONS="--expose-gc"
```

This debugging guide provides comprehensive solutions for the most common testing issues you'll encounter in the CMS application.