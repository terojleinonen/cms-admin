# CMS Admin Test Suite Documentation

## Overview

This comprehensive test suite provides thorough coverage of the CMS Admin application with automated quality gates, security scanning, and performance monitoring.

## Test Structure

```
__tests__/
├── api/                    # API endpoint integration tests
├── components/             # React component tests
├── database/              # Database operation tests
├── e2e/                   # End-to-end tests
├── helpers/               # Test utilities and factories
├── integration/           # Integration tests
├── lib/                   # Library/utility function tests
├── performance/           # Performance tests
├── security/              # Security tests
└── accessibility/         # Accessibility tests
```

## Test Categories

### 1. Unit Tests
- **Location**: `__tests__/lib/`, `__tests__/utils/`
- **Purpose**: Test individual functions and utilities in isolation
- **Coverage Target**: 90%+
- **Run Command**: `npm run test:automation:unit`

### 2. Integration Tests
- **Location**: `__tests__/api/`, `__tests__/integration/`
- **Purpose**: Test API endpoints and service integrations
- **Coverage Target**: 85%+
- **Run Command**: `npm run test:automation:integration`

### 3. Component Tests
- **Location**: `__tests__/components/`
- **Purpose**: Test React components with user interactions
- **Coverage Target**: 80%+
- **Run Command**: `npm run test:automation:components`

### 4. End-to-End Tests
- **Location**: `__tests__/e2e/`
- **Purpose**: Test complete user workflows
- **Coverage Target**: 70%+
- **Run Command**: `npm run test:automation:e2e`

## Test Data Factories

### Usage
```typescript
import { 
  createTestUser, 
  createTestProduct, 
  createTestCategory 
} from '../helpers/test-factories';

// Create test data
const user = createTestUser({ role: 'ADMIN' });
const product = createTestProduct({ name: 'Test Product' });
const category = createTestCategory({ name: 'Electronics' });
```

### Available Factories
- `createTestUser(overrides?)` - Creates test user data
- `createTestAdmin(overrides?)` - Creates admin user data
- `createTestProduct(overrides?)` - Creates product data
- `createTestCategory(overrides?)` - Creates category data
- `createTestOrder(overrides?)` - Creates order data
- `createTestApiKey(overrides?)` - Creates API key data
- `createMockRequest(method, url, body?)` - Creates mock HTTP requests
- `createMockResponse(data, status?)` - Creates mock HTTP responses

### Batch Factories
```typescript
// Create multiple test objects
const users = createTestUsers(5);
const products = createTestProducts(10, { status: 'ACTIVE' });
```

## Test Automation

### Quality Gates
The test automation system enforces quality gates:

1. **Test Success Rate**: All test suites must pass
2. **Code Coverage**: 
   - Global: 80% minimum
   - Library functions: 85% minimum
   - Utilities: 90% minimum
3. **Security Scan**: No hardcoded credentials or secrets
4. **Performance**: Tests must complete within time limits

### Running Tests

#### Full Test Suite with Quality Gates
```bash
npm run test:quality-gates
```

#### Individual Test Categories
```bash
npm run test:automation:unit
npm run test:automation:integration
npm run test:automation:components
npm run test:automation:e2e
npm run test:automation:coverage
npm run test:automation:security
```

#### Legacy Test Commands (still available)
```bash
npm run test              # Fast unit tests
npm run test:coverage     # Coverage analysis
npm run test:watch        # Watch mode
```

## Security Testing

### Automated Security Scan
The security scanner checks for:
- Hardcoded passwords, API keys, secrets, tokens
- Hardcoded URLs (should use environment variables)
- Console.log statements in production tests
- Other security anti-patterns

### Running Security Scan
```bash
npm run test:automation:security
```

## Coverage Requirements

### Global Thresholds
- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

### Library-Specific Thresholds
- **app/lib/**: 85% (higher standard for core utilities)
- **utils/**: 90% (highest standard for utility functions)

### Coverage Reports
Coverage reports are generated in multiple formats:
- **Text**: Console output
- **HTML**: `coverage/lcov-report/index.html`
- **JSON**: `coverage/coverage-final.json`
- **LCOV**: `coverage/lcov.info`

## Test Environment Setup

### Database Configuration
Tests use a separate test database to avoid conflicts:
- **Test DB**: Configured in `.env.test`
- **Isolation**: Each test suite runs in isolation
- **Cleanup**: Automatic cleanup between tests

### Mock Configuration
- **API Mocks**: Located in `__mocks__/`
- **Component Mocks**: Inline mocks in test files
- **Service Mocks**: Comprehensive service layer mocks

## Writing Tests

### Test Structure
```typescript
describe('Component/Function Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('Feature Group', () => {
    it('should do something specific', () => {
      // Test implementation
    });
  });
});
```

### Best Practices

#### 1. Descriptive Test Names
```typescript
// Good
it('should create product with valid data and return 201 status')

// Bad
it('should work')
```

#### 2. Use Test Factories
```typescript
// Good
const user = createTestUser({ role: 'ADMIN' });

// Bad
const user = { id: '123', email: 'test@test.com', ... };
```

#### 3. Test Edge Cases
```typescript
describe('Edge Cases', () => {
  it('should handle empty input');
  it('should handle null values');
  it('should handle very large inputs');
  it('should handle special characters');
});
```

#### 4. Accessibility Testing
```typescript
it('should be keyboard navigable', async () => {
  // Test keyboard navigation
});

it('should have proper ARIA labels', () => {
  // Test accessibility attributes
});
```

#### 5. Performance Testing
```typescript
it('should complete within acceptable time', async () => {
  const startTime = performance.now();
  await performOperation();
  const endTime = performance.now();
  
  expect(endTime - startTime).toBeLessThan(1000);
});
```

## Debugging Tests

### Common Issues

#### 1. Module Resolution Errors
- Check `jest.config.js` moduleNameMapper
- Ensure imports use correct paths
- Verify mock files exist

#### 2. Database Connection Issues
- Check `.env.test` configuration
- Ensure test database is running
- Verify database permissions

#### 3. Component Rendering Issues
- Check for missing providers (Router, Theme, etc.)
- Verify component props are correct
- Ensure all dependencies are mocked

### Debug Commands
```bash
# Run tests with verbose output
npm run test:verbose

# Run specific test file
npm test -- ProductForm.test.tsx

# Run tests in watch mode
npm run test:watch

# Debug with Node.js debugger
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Continuous Integration

### GitHub Actions Integration
The test suite integrates with CI/CD pipelines:

```yaml
- name: Run Test Suite
  run: npm run test:quality-gates

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

### Quality Gates in CI
- All tests must pass
- Coverage thresholds must be met
- Security scan must pass
- No performance regressions

## Reporting

### Test Reports
- **JSON Report**: `test-artifacts/test-report.json`
- **HTML Report**: `test-artifacts/test-report.html`
- **Coverage Report**: `coverage/lcov-report/index.html`

### Metrics Tracked
- Test execution time
- Coverage percentages
- Test success rates
- Security scan results
- Performance benchmarks

## Maintenance

### Regular Tasks
1. **Update Test Data**: Refresh test factories with realistic data
2. **Review Coverage**: Identify areas needing more tests
3. **Security Audit**: Regular security scans
4. **Performance Review**: Monitor test execution times

### Adding New Tests
1. Create test file in appropriate directory
2. Use test factories for data creation
3. Follow naming conventions
4. Include edge cases and error scenarios
5. Add accessibility tests for components
6. Update documentation if needed

## Troubleshooting

### Memory Issues
If tests consume too much memory:
```bash
# Use memory-optimized configuration
npm run test:memory-config

# Monitor memory usage
npm run test:memory-monitor
```

### Slow Tests
If tests run slowly:
```bash
# Run performance analysis
npm run test:perf:analyze

# Identify slow tests
npm run test:perf:benchmark
```

### Flaky Tests
If tests are inconsistent:
```bash
# Identify flaky tests
npm run test:perf:flaky

# Run tests multiple times
npm run test -- --repeat=10
```

## Contributing

### Test Contribution Guidelines
1. All new features must include tests
2. Bug fixes must include regression tests
3. Tests must pass quality gates
4. Follow established patterns and conventions
5. Update documentation for significant changes

### Code Review Checklist
- [ ] Tests cover happy path and edge cases
- [ ] Test names are descriptive
- [ ] No hardcoded values or credentials
- [ ] Proper cleanup and teardown
- [ ] Accessibility considerations included
- [ ] Performance implications considered

## Resources

### Documentation
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### Tools
- **Jest**: Test runner and assertion library
- **Testing Library**: React component testing utilities
- **Faker.js**: Test data generation
- **MSW**: API mocking (if needed)

### Support
For questions or issues with the test suite:
1. Check this documentation
2. Review existing test examples
3. Check Jest and Testing Library documentation
4. Create an issue with detailed reproduction steps