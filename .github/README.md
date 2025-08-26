# CI/CD Pipeline Documentation

This directory contains the complete continuous integration and deployment pipeline for the CMS Admin application.

## Overview

The CI/CD pipeline is designed to ensure code quality, comprehensive testing, and safe deployments through automated workflows and quality gates.

## Workflows

### 1. Continuous Integration (`ci.yml`)
**Trigger**: Push to `main`/`develop`, Pull Requests
**Purpose**: Comprehensive testing and quality assurance

#### Jobs:
- **Code Quality**: ESLint, TypeScript checks, formatting validation
- **Unit Tests**: Fast, isolated tests with mocks
- **Integration Tests**: Database-backed API testing
- **Component Tests**: React component testing with JSDOM
- **Coverage**: Test coverage analysis and reporting
- **Build Verification**: Production build validation
- **Security Scan**: Dependency and code security analysis
- **Performance Tests**: Test execution performance monitoring

#### Key Features:
- Parallel job execution for faster feedback
- PostgreSQL service for integration tests
- Comprehensive coverage reporting with Codecov integration
- Artifact collection for debugging
- Coverage threshold enforcement (80% minimum)

### 2. Pull Request Checks (`pr-checks.yml`)
**Trigger**: Pull Request events
**Purpose**: Fast feedback for PR validation

#### Jobs:
- **PR Validation**: Title format, test file presence
- **Quick Tests**: Fast linting and type checking
- **Changed Files Tests**: Targeted testing of modified code
- **Coverage Comparison**: Compare PR coverage with base branch
- **PR Status Check**: Overall PR health assessment

#### Key Features:
- Semantic PR title validation
- Intelligent test selection based on changed files
- Coverage diff reporting in PR comments
- Concurrency control to cancel outdated runs

### 3. Test Notifications (`test-notifications.yml`)
**Trigger**: CI workflow completion
**Purpose**: Automated failure reporting and resolution tracking

#### Jobs:
- **Notify on Failure**: Create issues and send notifications
- **Close Resolved Issues**: Auto-close when tests pass
- **Generate Test Report**: Comprehensive test execution reports

#### Key Features:
- Automatic GitHub issue creation for test failures
- Slack notifications (when configured)
- Test execution summaries on commits
- Automatic issue resolution tracking

### 4. Deployment Gate (`deployment-gate.yml`)
**Trigger**: Push to `main`, Manual dispatch
**Purpose**: Safe, controlled deployments with quality gates

#### Jobs:
- **Pre-deployment Validation**: Environment and condition checks
- **Security Gate**: Security audits and configuration validation
- **Build for Deployment**: Full test suite and production build
- **Deployment Approval**: Manual approval for production (environment protection)
- **Create Deployment**: GitHub deployment creation and tracking
- **Post-deployment Verification**: Health checks and smoke tests
- **Rollback on Failure**: Automatic rollback and issue creation

#### Key Features:
- Environment-specific deployment logic
- Manual approval gates for production
- Comprehensive pre-deployment validation
- Automatic rollback on failure
- Deployment status tracking

## Configuration

### Environment Variables
Required environment variables for CI/CD:

```bash
# Database (automatically configured in CI)
DATABASE_URL=postgresql://test_user:test_password@localhost:5432/cms_test

# Authentication (test values)
NEXTAUTH_SECRET=test-secret-key-for-ci
NEXTAUTH_URL=http://localhost:3001

# Optional: Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Secrets Configuration
Configure these secrets in GitHub repository settings:

```bash
# Required for coverage reporting
CODECOV_TOKEN=your-codecov-token

# Optional: Slack notifications
SLACK_WEBHOOK_URL=your-slack-webhook-url

# Optional: Custom deployment tokens
DEPLOYMENT_TOKEN=your-deployment-token
```

### Branch Protection
The pipeline enforces branch protection rules:

- **Main Branch**: Requires all status checks, 2 approving reviews
- **Develop Branch**: Requires basic checks, 1 approving review
- **Feature Branches**: No restrictions, but CI runs on PRs

## Test Execution Strategy

### Test Categories
1. **Unit Tests** (`npm run test:unit`)
   - Fast execution (<30 seconds)
   - Mocked dependencies
   - High isolation

2. **Integration Tests** (`npm run test:integration`)
   - Real database connections
   - API endpoint testing
   - Moderate execution time (<2 minutes)

3. **Component Tests** (`npm run test:components`)
   - React Testing Library
   - JSDOM environment
   - UI interaction testing

4. **E2E Tests** (`npm run test:e2e`)
   - Complete user workflows
   - Full application context
   - Slower execution (<3 minutes)

### Coverage Requirements
- **Minimum Coverage**: 80% across all metrics
- **Coverage Types**: Branches, Functions, Lines, Statements
- **Exclusions**: Layout files, page components, type definitions
- **Reporting**: HTML reports, LCOV for CI integration

## Deployment Strategy

### Environments
1. **Staging**: Automatic deployment from `main` branch
2. **Production**: Manual approval required, triggered from `main`

### Deployment Gates
- All tests must pass
- Security scans must complete successfully
- Build must succeed
- Manual approval for production
- Post-deployment health checks

### Rollback Strategy
- Automatic rollback on deployment failure
- GitHub issue creation for tracking
- Deployment status updates
- Health check validation

## Monitoring and Alerts

### Test Failure Notifications
- GitHub issues for persistent failures
- Slack notifications (when configured)
- Commit status updates
- PR comment updates

### Performance Monitoring
- Test execution time tracking
- Flaky test detection
- Performance regression alerts
- Resource usage monitoring

### Coverage Tracking
- Coverage trend analysis
- Threshold enforcement
- PR coverage comparison
- Historical coverage data

## Usage Examples

### Running Tests Locally
```bash
# Run all tests
npm run test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:components

# Run with coverage
npm run test:coverage

# Run performance tests
npm run test:perf
```

### Manual Deployment
```bash
# Trigger staging deployment
gh workflow run deployment-gate.yml -f environment=staging

# Trigger production deployment (requires approval)
gh workflow run deployment-gate.yml -f environment=production
```

### Checking CI Status
```bash
# View recent workflow runs
gh run list

# View specific run details
gh run view <run-id>

# Download artifacts
gh run download <run-id>
```

## Troubleshooting

### Common Issues

#### Test Failures
1. **Database Connection Issues**:
   - Check PostgreSQL service configuration
   - Verify DATABASE_URL format
   - Ensure test database setup scripts run

2. **Mock Issues**:
   - Verify mock implementations are up to date
   - Check mock reset between tests
   - Validate mock expectations

3. **Coverage Issues**:
   - Check coverage exclusions
   - Verify test file patterns
   - Review coverage threshold settings

#### Deployment Issues
1. **Build Failures**:
   - Check environment variable configuration
   - Verify dependency installation
   - Review build logs for errors

2. **Approval Issues**:
   - Ensure reviewers have proper permissions
   - Check environment protection rules
   - Verify approval requirements

### Debug Commands
```bash
# Check workflow syntax
gh workflow view ci.yml

# Validate workflow files
act --list

# Run workflows locally (with act)
act push

# Check repository settings
gh api repos/:owner/:repo/branches/main/protection
```

## Maintenance

### Regular Tasks
- Review and update dependency versions
- Monitor test execution performance
- Update coverage thresholds as needed
- Review and optimize workflow efficiency

### Quarterly Reviews
- Analyze test failure patterns
- Review deployment success rates
- Update security scanning tools
- Optimize CI/CD performance

### Annual Updates
- Update Node.js and PostgreSQL versions
- Review and update workflow actions
- Assess and improve deployment strategies
- Update documentation and procedures

## Contributing

### Adding New Tests
1. Follow existing test patterns
2. Ensure proper categorization (unit/integration/component)
3. Add appropriate coverage expectations
4. Update CI configuration if needed

### Modifying Workflows
1. Test changes in feature branches
2. Validate workflow syntax
3. Update documentation
4. Get approval from DevOps team

### Security Considerations
- Never commit secrets to repository
- Use GitHub secrets for sensitive data
- Regularly audit workflow permissions
- Keep actions and dependencies updated

## Support

For issues with the CI/CD pipeline:
1. Check existing GitHub issues
2. Review workflow run logs
3. Consult this documentation
4. Contact the DevOps team

For urgent production issues:
1. Check deployment status
2. Review rollback procedures
3. Contact on-call engineer
4. Follow incident response procedures