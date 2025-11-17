# Jest Upgrade Baseline - Pre-Upgrade State

## Date
November 15, 2025

## Current Jest Versions
- **jest**: v25.0.0
- **jest-environment-jsdom**: v30.0.5
- **jest-environment-node**: v30.0.5
- **babel-jest**: v25.0.0
- **ts-jest**: v29.4.1
- **@types/jest**: v30.0.0

## Version Mismatch Issue
The project has a critical version mismatch between Jest core (v25) and Jest environments (v30). This causes all Jest commands to fail with:

```
TypeError: Cannot read properties of undefined (reading 'onlyChanged')
    at _default (/Users/teroleinonen/software projects/cms-admin/node_modules/@jest/core/build/getChangedFilesPromise.js:49:20)
```

## Test Suite Status
**UNABLE TO RUN** - All test commands fail due to version mismatch:
- `npm run test:ci` - FAILS
- `npm run test` - FAILS
- `npm run test:unit` - FAILS (also unsupported CLI option in v25)
- `npm run test:integration` - FAILS
- `npm run test:e2e` - FAILS
- `npm run test:coverage` - FAILS

## Test Configuration
- Multi-project setup with 4 test suites:
  1. **unit** - Node environment for TypeScript tests
  2. **unit-components** - jsdom environment for React component tests
  3. **integration** - Node environment for integration tests
  4. **e2e** - jsdom environment for end-to-end tests

## Backup Status
✅ Git tag created: `pre-jest-upgrade`
✅ package-lock.json backed up to: `package-lock.json.backup`

## Coverage Baseline
**UNABLE TO CAPTURE** - Cannot run tests due to version mismatch

## Expected Coverage Thresholds (from jest.config.cjs)
- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

## Test Files Count
Based on directory structure:
- Unit tests: ~60+ test files in `__tests__/unit/`
- Integration tests: ~10+ test files in `__tests__/integration/`
- E2E tests: ~7 test files in `__tests__/e2e/`

## Babel Presets (Currently in dependencies, should be devDependencies)
- @babel/preset-env: ^7.28.3
- @babel/preset-react: ^7.27.1
- @babel/preset-typescript: ^7.27.1
- @babel/preset-flow: ^7.27.1 (already in devDependencies)

## Next Steps
1. Upgrade Jest ecosystem to v30
2. Move Babel presets to devDependencies
3. Create explicit Babel configuration
4. Run tests and verify all pass
5. Capture post-upgrade coverage metrics for comparison

## Notes
- The current state is completely broken for testing
- Any test execution will be an improvement over the current state
- Post-upgrade validation will establish the true baseline
