# CMS Admin Testing Guidelines

## Core Testing Principle
**ALWAYS write tests first** - Before implementing any feature or fix, write a test that demonstrates the expected behavior.

## Testing Standards
- Write tests for all new features and bug fixes
- Use descriptive test names that explain the behavior being tested
- Include both positive and negative test cases
- Test edge cases and error conditions
- Keep tests focused and isolated
- Use proper setup and teardown for database tests

## CMS-Specific Testing
- Test CRUD operations for all entities (products, orders, users)
- Test authentication and authorization flows
- Test form validation and error handling
- Test file upload functionality
- Test API endpoints with proper authentication
- Test role-based access control

## Database Testing
- Always clean up test data between tests
- Use transactions or separate test databases when possible
- Test both successful operations and constraint violations
- Verify data persistence and retrieval accuracy
- Test database migrations and schema changes

## Test Structure
- Use `describe` blocks to group related tests
- Use `beforeEach`/`afterEach` for test setup/cleanup
- Use `beforeAll`/`afterAll` for expensive setup operations
- Mock external dependencies when appropriate
- Use meaningful assertions with clear error messages

## Integration Testing
- Test API endpoints end-to-end
- Test authentication flows
- Test file upload and processing
- Test database operations with real data
- Test error handling and edge cases