# CI/CD Quick Reference

## Workflows

### Main Workflows
- **ci.yml**: Comprehensive testing and quality checks
- **pr-checks.yml**: Fast feedback for pull requests
- **deployment-gate.yml**: Safe deployment with quality gates
- **test-notifications.yml**: Automated failure reporting

### Triggering Workflows
```bash
# Trigger deployment to staging
git push origin main

# Trigger deployment to production (requires approval)
gh workflow run deployment-gate.yml -f environment=production

# View workflow runs
gh run list

# View specific run
gh run view <run-id>
```

### Test Commands
```bash
# Run all tests locally
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

### Troubleshooting
- Check workflow logs in GitHub Actions tab
- Validate workflow syntax: `node scripts/validate-workflows.js`
- Test database setup: `npm run test:db:setup`
- Check test configuration: `npm run test:stats`

## Status Badges

Add these to your README.md:

```markdown
![CI](https://github.com/owner/repo/workflows/Continuous%20Integration/badge.svg)
![Coverage](https://codecov.io/gh/owner/repo/branch/main/graph/badge.svg)
![Security](https://github.com/owner/repo/workflows/Security%20Scan/badge.svg)
```
