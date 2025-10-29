# Testing Utilities

This directory contains consolidated testing utilities for the CMS application.

## Overview

The testing utilities provide:

1. **Mock Factories** - Create mock users, sessions, and API requests
2. **Component Testing** - React component testing with providers
3. **Test Setup** - Global mocks and environment configuration
4. **Common Assertions** - Reusable assertion helpers

## Files

- `test-utils.ts` - Core testing utilities and mock factories
- `component-test-utils.tsx` - React component testing helpers
- `test-helpers.ts` - Global test setup and configuration
- `index.ts` - Consolidated exports

## Quick Start

### Basic Testing

```typescript
import { 
  createMockUser, 
  createMockSession,
  expectSuccess,
  expectUnauthorized
} from '../helpers'

describe('API Tests', () => {
  it('should test user creation', () => {
    const user = createMockUser({ role: UserRole.ADMIN })
    const session = createMockSession({ user })
    
    expect(user.role).toBe(UserRole.ADMIN)
    expect(session.user.id).toBe(user.id)
  })

  it('should test API responses', () => {
    const successResponse = { status: 200, data: { id: '1' } }
    const unauthorizedResponse = { status: 401, error: 'Unauthorized' }
    
    expectSuccess(successResponse)
    expectUnauthorized(unauthorizedResponse)
  })
})
```

### Component Testing

```typescript
import { renderWithProviders, fillForm, submitForm } from '../helpers'

describe('Component Tests', () => {
  it('should render and interact with forms', async () => {
    const { user, getByRole } = renderWithProviders(<LoginForm />)
    
    await fillForm(user, {
      email: 'test@example.com',
      password: 'password123'
    })
    
    await submitForm(user)
    
    expect(getByRole('button')).toBeInTheDocument()
  })
})
```

## Available Utilities

### Mock Factories
- `createMockUser(options)` - Create mock user objects
- `createMockSession(userOptions)` - Create mock session objects
- `createMockRequest(options)` - Create mock API requests
- `createMockResponse(data, status)` - Create mock API responses
- `createTestData()` - Generate test data sets

### Assertions
- `expectSuccess(response)` - Assert successful response
- `expectUnauthorized(response)` - Assert 401 response
- `expectForbidden(response)` - Assert 403 response

### Component Testing
- `renderWithProviders(component, options)` - Render with test providers
- `fillForm(user, formData)` - Fill form fields
- `submitForm(user, formSelector)` - Submit forms

## Best Practices

1. **Use Descriptive Test Names** - Clearly describe what behavior is being tested
2. **Test Both Success and Error Cases** - Test both successful operations and error conditions
3. **Keep Tests Focused** - Each test should verify one specific behavior
4. **Use Mock Factories** - Use the provided factories for consistent test data
5. **Clean Up After Tests** - Use proper setup and teardown

## Example Test Structure

```typescript
describe('API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('User Management', () => {
    it('should create users successfully', () => {
      // Test successful user creation
    })

    it('should handle validation errors', () => {
      // Test error handling
    })
  })

  describe('Authentication', () => {
    it('should authenticate valid users', () => {
      // Test authentication
    })

    it('should reject invalid credentials', () => {
      // Test authentication failure
    })
  })
})
```