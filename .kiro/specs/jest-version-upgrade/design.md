# Design Document

## Overview

This design addresses the Jest version mismatch issue and deprecated dependency warnings in the CMS Admin project. The solution involves upgrading Jest from v25 to v30, updating babel-jest to match, and resolving transitive deprecated dependencies by updating parent packages. The design ensures backward compatibility with existing tests while modernizing the testing infrastructure.

## Architecture

### Current State

- **Jest Core**: v25.0.0 (outdated, from 2020)
- **Jest Environments**: v30.0.5 (modern)
- **babel-jest**: v25.0.0 (mismatched with Jest environments)
- **Test Configuration**: Multi-project setup with 4 test suites (unit, unit-components, integration, e2e)
- **TypeScript Support**: ts-jest v29.4.1
- **Deprecated Dependencies**: Multiple transitive dependencies showing warnings

### Target State

- **Jest Core**: v30.x (latest stable)
- **Jest Environments**: v30.x (matching core)
- **babel-jest**: v30.x (matching core)
- **Test Configuration**: Preserved multi-project setup
- **TypeScript Support**: ts-jest v29.x (compatible with Jest 30)
- **Deprecated Dependencies**: Eliminated or documented with migration path

## Components and Interfaces

### 1. Package Dependency Updates

#### Jest Ecosystem Packages
```json
{
  "devDependencies": {
    "jest": "^30.0.0",
    "jest-environment-jsdom": "^30.0.0",
    "jest-environment-node": "^30.0.0",
    "babel-jest": "^30.0.0",
    "ts-jest": "^29.4.1",
    "@types/jest": "^30.0.0"
  }
}
```

**Rationale**: Aligning all Jest-related packages to v30 eliminates version conflicts and ensures compatibility. ts-jest v29 is compatible with Jest 30.

#### Babel Presets (Move to devDependencies)
```json
{
  "devDependencies": {
    "@babel/preset-env": "^7.28.3",
    "@babel/preset-react": "^7.27.1",
    "@babel/preset-typescript": "^7.27.1",
    "@babel/preset-flow": "^7.27.1"
  }
}
```

**Rationale**: Babel presets are only needed for testing, not runtime. Moving them to devDependencies clarifies their purpose and reduces production bundle size.

### 2. Jest Configuration

The existing `jest.config.cjs` will be preserved with minimal changes:

```javascript
module.exports = {
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/__tests__/unit/**/*.test.ts'],
      // ... existing configuration
    },
    {
      displayName: 'unit-components',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/__tests__/unit/**/*.test.tsx'],
      // ... existing configuration
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/__tests__/integration/**/*.test.{ts,tsx}'],
      // ... existing configuration
    },
    {
      displayName: 'e2e',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/__tests__/e2e/**/*.test.{ts,tsx}'],
      // ... existing configuration
    }
  ],
  // ... existing global configuration
}
```

**Changes Required**: None to configuration structure. The version upgrade will automatically fix the `onlyChanged` error.

### 3. Deprecated Dependency Resolution

#### Transitive Dependency Analysis

| Deprecated Package | Source Package | Resolution Strategy |
|-------------------|----------------|---------------------|
| `request@2.88.2` | Unknown (needs investigation) | Identify parent, update to fetch/axios |
| `request-promise-native@1.0.9` | Depends on request | Update parent to use modern HTTP client |
| `rimraf@2.7.1`, `rimraf@3.0.2` | Various build tools | Update parent packages to rimraf@4+ |
| `har-validator@5.1.5` | request package | Removed when request is eliminated |
| `abab@2.0.6` | jsdom or testing libraries | Update jsdom to latest |
| `domexception@1.0.1` | jsdom or polyfills | Update jsdom to latest |
| `w3c-hr-time@1.0.2` | jsdom | Update jsdom to latest |
| `uuid@3.4.0` | Unknown | Identify parent, update to uuid@11+ |

**Investigation Process**:
1. Run `npm ls <package-name>` to trace dependency tree
2. Identify direct parent packages
3. Check if parent packages have updates that remove deprecated dependencies
4. Update parent packages or replace them with modern alternatives

### 4. Babel Configuration

Create a `.babelrc.js` or `babel.config.js` for Jest:

```javascript
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
}
```

**Rationale**: Explicit Babel configuration ensures consistent transpilation for tests. The `runtime: 'automatic'` setting supports React 19's JSX transform.

## Data Models

No data model changes required. This is purely an infrastructure upgrade.

## Error Handling

### Migration Risks and Mitigations

1. **Test Failures After Upgrade**
   - **Risk**: Tests may fail due to behavior changes in Jest 30
   - **Mitigation**: Run full test suite after upgrade; fix any breaking changes incrementally
   - **Rollback**: Keep package-lock.json backup for quick rollback

2. **TypeScript Compilation Issues**
   - **Risk**: ts-jest may have compatibility issues
   - **Mitigation**: Verify ts-jest v29 compatibility with Jest 30 (confirmed compatible)
   - **Rollback**: Revert to previous versions if issues arise

3. **Deprecated Dependency Persistence**
   - **Risk**: Some deprecated dependencies may be deeply nested and hard to eliminate
   - **Mitigation**: Document remaining deprecated dependencies with justification
   - **Acceptance**: Some transitive dependencies may require waiting for upstream updates

### Error Messages

The current error will be resolved:
```
TypeError: Cannot read properties of undefined (reading 'onlyChanged')
```

This error occurs because Jest 25 core doesn't have the same API surface as Jest 30 environments expect.

## Testing Strategy

### Pre-Upgrade Validation

1. **Baseline Test Run**: Execute full test suite and document current pass/fail state
   ```bash
   npm run test:ci > pre-upgrade-results.txt
   ```

2. **Test Coverage Baseline**: Capture current coverage metrics
   ```bash
   npm run test:coverage > pre-upgrade-coverage.txt
   ```

### Post-Upgrade Validation

1. **Full Test Suite Execution**: Run all test projects
   ```bash
   npm run test:ci
   ```

2. **Security Test Validation**: Specifically test the failing security tests
   ```bash
   npm run test:security:ci
   ```

3. **Individual Project Testing**: Test each project separately
   ```bash
   npm run test:unit
   npm run test:integration
   npm run test:e2e
   ```

4. **Coverage Comparison**: Ensure coverage metrics are maintained or improved
   ```bash
   npm run test:coverage
   ```

### Test Categories to Validate

- **Unit Tests**: All TypeScript and TSX unit tests
- **Integration Tests**: API and middleware integration tests
- **E2E Tests**: End-to-end workflow tests
- **Component Tests**: React component tests with jsdom

### Success Criteria

- All previously passing tests continue to pass
- No new test failures introduced by the upgrade
- Security tests run without the `onlyChanged` error
- npm install completes without deprecation warnings (or with documented exceptions)
- Test execution time remains comparable (within 10% variance)

## Implementation Phases

### Phase 1: Jest Ecosystem Upgrade
1. Update Jest core and environment packages to v30
2. Update babel-jest to v30
3. Move Babel presets to devDependencies
4. Create explicit Babel configuration for Jest
5. Run test suite and fix any breaking changes

### Phase 2: Deprecated Dependency Investigation
1. Trace each deprecated dependency to its source
2. Document dependency tree for each deprecated package
3. Identify update paths for parent packages
4. Create prioritized list of updates

### Phase 3: Dependency Updates
1. Update packages that eliminate deprecated dependencies
2. Replace packages that cannot be updated with modern alternatives
3. Document any remaining deprecated dependencies with justification
4. Verify npm install runs cleanly

### Phase 4: Validation and Documentation
1. Run comprehensive test suite
2. Validate CI pipeline execution
3. Update documentation with new dependency versions
4. Create migration notes for team

## Compatibility Considerations

### Next.js 15 Compatibility
- Jest 30 is compatible with Next.js 15
- Existing module name mappings for Next.js paths will be preserved
- Server and client component testing patterns remain unchanged

### React 19 Compatibility
- Jest 30 with jsdom supports React 19
- @testing-library/react v16 (already installed) supports React 19
- Babel preset-react with automatic runtime supports React 19 JSX transform

### TypeScript Compatibility
- ts-jest v29 supports TypeScript 5.7 (currently installed)
- No changes needed to tsconfig.jest.json
- Existing path mappings will continue to work

### Node.js Compatibility
- Jest 30 requires Node.js 18+
- Project already requires Node.js 20+ (per package.json engines)
- No compatibility issues expected

## Performance Considerations

### Test Execution Performance
- Jest 30 includes performance improvements over Jest 25
- Expected test execution time: comparable or faster
- Memory usage: may increase slightly due to modern features

### Installation Performance
- Upgrading to modern packages may reduce npm install time
- Eliminating deprecated dependencies reduces dependency tree size
- Expected improvement: 5-10% faster installs

## Security Considerations

### Dependency Security
- Jest 30 includes security fixes from the past 5 years
- Eliminating deprecated dependencies reduces security risk
- Modern packages receive active security updates

### Audit Results
- Run `npm audit` after upgrade to verify security posture
- Address any high/critical vulnerabilities immediately
- Document any accepted risks with justification

## Rollback Plan

### Backup Strategy
1. Commit all changes before starting upgrade
2. Create backup of package-lock.json
3. Tag current state in git: `git tag pre-jest-upgrade`

### Rollback Procedure
If critical issues arise:
1. Revert package.json changes: `git checkout HEAD -- package.json`
2. Restore package-lock.json: `git checkout HEAD -- package-lock.json`
3. Reinstall dependencies: `npm ci`
4. Verify tests pass: `npm run test:ci`

### Rollback Triggers
- More than 10% of tests fail after upgrade
- Critical functionality breaks
- CI pipeline cannot complete
- Unresolvable compatibility issues with Next.js or React

## Documentation Updates

### Files to Update
1. **README.md**: Update testing instructions if needed
2. **docs/TESTING_GUIDELINES.md**: Update Jest version references
3. **docs/TEST_SETUP_GUIDE.md**: Update setup instructions
4. **.github/workflows/**: Update CI configuration if needed

### Team Communication
1. Announce upgrade in team channel
2. Share migration notes
3. Provide troubleshooting guide for common issues
4. Schedule knowledge sharing session if needed
