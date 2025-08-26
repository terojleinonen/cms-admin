# Test Setup and Configuration Guide

## Overview

This guide provides step-by-step instructions for setting up the testing environment for the Kin Workspace CMS. It covers initial setup, configuration, and troubleshooting common issues.

## Prerequisites

### System Requirements
- Node.js >= 18.0.0
- npm >= 8.0.0
- PostgreSQL >= 14.0
- Git

### Environment Setup
```bash
# Clone the repository
git clone <repository-url>
cd kin-workspace-cms

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

## Database Setup

### Test Database Configuration

1. **Create Test Database**
```sql
-- Connect to PostgreSQL as superuser
CREATE DATABASE kin_workspace_test;
CREATE USER test_user WITH PASSWORD 'test_password';
GRANT ALL PRIVILEGES ON DATABASE kin_workspace_test TO test_user;
```

2. **Environment Variables**
```bash
# Add to .env file
DATABASE_URL="postgresql://test_user:test_password@localhost:5432/kin_workspace_test"
TEST_DATABASE_URL="postgresql://test_user:test_password@localhost:5432/kin_workspace_test"
NEXTAUTH_SECRET="test-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

3. **Run Database Migrations**
```bash
# Generate Prisma client
npx prisma generate

# Run migrations on test database
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

## Jest Configuration

### Main Configuration File

The project uses `jest.config.js` with multiple project configurations:

```javascript
// jest.config.js
module.exports = {
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/__tests__/helpers/test-helpers.ts'],
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup-integration.ts'],
    },
    {
      displayName: 'components',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/__tests__/components/**/*.test.tsx'],
      setupFilesAfterEnv: ['<rootDir>/__tests__/helpers/test-helpers.ts'],
    }
  ],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/layout.tsx',
    '!app/**/page.tsx'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}
```

### Module Name Mapping

```javascript
// In jest.config.js
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/app/$1',
  '^@/lib/(.*)$': '<rootDir>/app/lib/$1',
  '^@/components/(.*)$': '<rootDir>/app/components/$1'
}
```

## Test Environment Setup

### Unit Test Setup

Create `__tests__/helpers/test-helpers.ts`:

```typescript
import { jest } from '@jest/globals'

// Mock NextAuth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}))

// Mock Prisma
jest.mock('@/lib/db', () => ({
  product: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}))

// Global test setup
beforeEach(() => {
  jest.clearAllMocks()
})
```

### Integration Test Setup

Create `tests/setup-integration.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL
    }
  }
})

// Global setup for integration tests
beforeAll(async () => {
  // Ensure database is clean
  await prisma.$executeRaw`TRUNCATE TABLE "User", "Product", "Category" RESTART IDENTITY CASCADE`
})

afterAll(async () => {
  await prisma.$disconnect()
})

// Clean up after each test
afterEach(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE "User", "Product", "Category" RESTART IDENTITY CASCADE`
})

export { prisma }
```

### Component Test Setup

Create `__tests__/helpers/component-helpers.tsx`:

```typescript
import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Custom render function with providers
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <div>
        {children}
      </div>
    )
  }

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...options })
  }
}

export * from '@testing-library/react'
export { customRender as render }
```

## Mock Implementations

### Prisma Mock Setup

Create `__mocks__/@/lib/prisma-mock.ts`:

```typescript
import { jest } from '@jest/globals'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'
import { PrismaClient } from '@prisma/client'

export const prismaMock = mockDeep<PrismaClient>()

beforeEach(() => {
  mockReset(prismaMock)
})

export default prismaMock
```

### NextAuth Mock Setup

Create `__mocks__/next-auth/next.js`:

```javascript
export const getServerSession = jest.fn()

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

## Running Tests

### Basic Test Commands

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:components
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- ProductForm.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="should create product"
```

### Advanced Test Commands

```bash
# Run tests with verbose output
npm test -- --verbose

# Run tests and update snapshots
npm test -- --updateSnapshot

# Run tests with specific timeout
npm test -- --testTimeout=10000

# Run tests in band (no parallel execution)
npm test -- --runInBand

# Run only changed files
npm test -- --onlyChanged
```

## Package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --selectProjects unit",
    "test:integration": "jest --selectProjects integration",
    "test:components": "jest --selectProjects components",
    "test:e2e": "jest --selectProjects e2e",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false",
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand"
  }
}
```

## IDE Configuration

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "jest.jestCommandLine": "npm test --",
  "jest.autoRun": {
    "watch": false,
    "onStartup": ["all-tests"]
  },
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### VS Code Extensions

Recommended extensions:
- Jest (orta.vscode-jest)
- Jest Runner (firsttris.vscode-jest-runner)
- TypeScript Importer (pmneo.tsimporter)
- ESLint (dbaeumer.vscode-eslint)

## Troubleshooting

### Common Setup Issues

#### 1. Module Resolution Errors
```bash
# Error: Cannot find module '@/lib/db'
# Solution: Check moduleNameMapper in jest.config.js
```

#### 2. Database Connection Issues
```bash
# Error: Connection refused
# Solution: Verify PostgreSQL is running and TEST_DATABASE_URL is correct
```

#### 3. TypeScript Compilation Errors
```bash
# Error: Cannot compile TypeScript
# Solution: Run `npx tsc --noEmit` to check for type errors
```

#### 4. Mock Import Issues
```bash
# Error: Cannot mock ES module
# Solution: Add to jest.config.js:
transformIgnorePatterns: [
  'node_modules/(?!(next-auth)/)'
]
```

### Performance Issues

#### Slow Test Execution
```bash
# Check test performance
npm test -- --verbose --detectOpenHandles

# Run tests in parallel (default)
npm test -- --maxWorkers=4

# Run tests serially for debugging
npm test -- --runInBand
```

#### Memory Issues
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm test
```

### Debugging Tests

#### Debug Mode
```bash
# Run Jest in debug mode
npm run test:debug

# Then in Chrome, go to chrome://inspect
# Click "Open dedicated DevTools for Node"
```

#### Logging
```typescript
// Add debug logging to tests
console.log('Test data:', testData)
console.log('Mock calls:', mockFunction.mock.calls)

// Use Jest's debug utilities
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    console.log(`Received: ${received}, Expected: ${floor}-${ceiling}`)
    // ... assertion logic
  }
})
```

## Continuous Integration Setup

### GitHub Actions Configuration

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: kin_workspace_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Setup test database
      run: |
        npx prisma migrate deploy
      env:
        TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/kin_workspace_test
    
    - name: Run tests
      run: npm run test:ci
      env:
        TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/kin_workspace_test
        NEXTAUTH_SECRET: test-secret
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
```

## Maintenance

### Regular Maintenance Tasks

1. **Update Dependencies**
```bash
# Check for outdated packages
npm outdated

# Update Jest and testing libraries
npm update jest @types/jest @testing-library/react
```

2. **Clean Test Cache**
```bash
# Clear Jest cache
npx jest --clearCache

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

3. **Database Maintenance**
```bash
# Reset test database
npx prisma migrate reset --force

# Update schema
npx prisma db push
```

### Performance Monitoring

```bash
# Generate test performance report
npm test -- --verbose --coverage --detectOpenHandles > test-report.txt

# Monitor test execution time
npm test -- --verbose | grep -E "(PASS|FAIL|Time:|✓|✗)"
```

This setup guide provides everything needed to configure and maintain a robust testing environment for the CMS application.