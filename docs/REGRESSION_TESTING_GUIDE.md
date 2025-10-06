# Regression Testing Guide

This guide covers the automated regression testing system for the production-ready RBAC system.

## Overview

The regression testing system provides comprehensive automated testing to prevent regressions in:
- Permission system functionality
- Security vulnerabilities
- Performance characteristics
- API endpoint behavior

## Components

### 1. CI/CD Integration

#### GitHub Actions Workflows

- **Permission Tests** (`.github/workflows/permission-tests.yml`)
  - Runs on every push and PR
  - Executes all permission-related tests
  - Provides coverage reports
  - Comments on PRs with test results

- **Security Scanning** (`.github/workflows/security-scan.yml`)
  - Daily automated security scans
  - Dependency vulnerability scanning with Snyk
  - Code security analysis with CodeQL
  - Docker image security scanning with Trivy

- **Performance Regression** (`.github/workflows/performance-regression.yml`)
  - Daily performance baseline testing
  - Compares performance against baselines
  - Lighthouse CI for frontend performance
  - Comments on PRs with performance impact

### 2. Test Scripts

#### Regression Test Runner (`scripts/run-regression-tests.js`)

Comprehensive test suite runner that executes:
- Permission unit tests
- Permission integration tests
- API permission tests
- Security scenario tests
- Performance tests
- E2E permission tests

```bash
npm run test:regression
```

#### Security Scanner (`scripts/security-scan.js`)

Automated security vulnerability scanner:
- NPM audit for dependency vulnerabilities
- Permission boundary testing
- Authentication security testing
- SQL injection protection testing
- XSS protection testing
- CSRF protection testing

```bash
npm run test:security:scan
```

#### Performance Analysis (`scripts/generate-performance-report.js`)

Performance monitoring and regression detection:
- Permission check latency monitoring
- Cache performance analysis
- Database query performance
- API endpoint response times
- Concurrent user testing

```bash
npm run perf:report
npm run perf:compare
```

## Usage

### Running Tests Locally

```bash
# Run complete regression test suite
npm run test:regression

# Run security scan
npm run test:security:scan

# Generate performance report
npm run perf:report

# Compare performance with baseline
npm run perf:compare
```

### CI/CD Integration

The workflows automatically run on:
- Every push to `main` or `develop` branches
- Every pull request to `main`
- Daily scheduled runs at 2-4 AM UTC

### Performance Baselines

Performance baselines are automatically stored when tests run on the `main` branch:
- Stored in `performance-baselines/` directory
- Named with date: `baseline-YYYYMMDD.json`
- Used for regression detection in PRs

### Thresholds and Alerts

#### Performance Thresholds
- Permission checks: < 50ms average
- Cache operations: < 10ms average
- Database queries: < 100ms average
- API responses: < 200ms average
- Error rate: < 1%

#### Regression Thresholds
- Permission checks: 10% slower than baseline
- Cache operations: 15% slower than baseline
- Database queries: 20% slower than baseline
- API endpoints: 25% slower than baseline

#### Security Thresholds
- No critical or high severity vulnerabilities
- No failed security boundary tests
- No authentication bypass vulnerabilities

## Reports

### Test Reports

Generated after each run:
- `regression-test-results.json` - Machine-readable results
- `regression-test-report.html` - Human-readable HTML report

### Security Reports

Generated after security scans:
- `security-scan-results.json` - Machine-readable results
- `security-scan-report.html` - Human-readable HTML report

### Performance Reports

Generated after performance tests:
- `performance-results.json` - Current performance metrics
- `performance-report.html` - Performance analysis report
- `performance-comparison.json` - Baseline comparison (PRs only)

## Configuration

### Environment Variables

Required for CI/CD:
```bash
DATABASE_URL=postgresql://user:pass@host:port/db
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
SNYK_TOKEN=your-snyk-token  # For security scanning
LHCI_GITHUB_APP_TOKEN=your-lighthouse-token  # For Lighthouse CI
```

### Lighthouse CI Configuration

Configure in `lighthouserc.js`:
- Performance thresholds
- Accessibility requirements
- Best practices checks
- SEO requirements

### Test Configuration

Configure test patterns in scripts:
- Permission tests: `--testPathPattern="permission|auth|role"`
- Security tests: `--testPathPattern="security.*test"`
- Performance tests: `--testPathPattern="performance"`

## Troubleshooting

### Common Issues

1. **Tests Timeout**
   - Increase timeout in workflow files
   - Check database connection
   - Verify test environment setup

2. **Performance Regressions**
   - Check recent code changes
   - Review database query performance
   - Analyze cache hit rates

3. **Security Scan Failures**
   - Update dependencies with `npm audit fix`
   - Review security test failures
   - Check for new vulnerabilities

### Debug Commands

```bash
# Run specific test pattern
npm test -- --testPathPattern="permission" --verbose

# Run with debug output
npm test -- --testPathPattern="security" --verbose --detectOpenHandles

# Check test coverage
npm run test:coverage
```

## Best Practices

### Writing Regression Tests

1. **Test Critical Paths**
   - Focus on permission-critical functionality
   - Test edge cases and boundary conditions
   - Include negative test cases

2. **Performance Testing**
   - Test with realistic data volumes
   - Include concurrent user scenarios
   - Monitor resource usage

3. **Security Testing**
   - Test permission boundaries
   - Verify authentication flows
   - Check for common vulnerabilities

### Maintaining Baselines

1. **Update Baselines**
   - After legitimate performance improvements
   - When adding new features
   - During major refactoring

2. **Monitor Trends**
   - Track performance over time
   - Identify gradual degradation
   - Set up alerting for significant changes

## Integration with Development Workflow

### Pre-commit Hooks

Consider adding pre-commit hooks for:
- Running critical permission tests
- Security vulnerability checks
- Performance smoke tests

### Code Review Process

1. **Automated Checks**
   - All CI checks must pass
   - Performance impact reviewed
   - Security scan results reviewed

2. **Manual Review**
   - Review test coverage changes
   - Verify new tests for new features
   - Check for test quality and maintainability

This regression testing system ensures the RBAC system maintains its security, performance, and functionality characteristics as the codebase evolves.