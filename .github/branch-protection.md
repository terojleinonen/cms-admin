# Branch Protection Configuration

This document outlines the recommended branch protection rules for the CMS repository to ensure code quality and prevent deployment of untested code.

## Main Branch Protection Rules

### Required Status Checks
The following status checks must pass before merging to `main`:

- **ci/pr-checks** - Pull request validation and testing
- **Code Quality** - ESLint and TypeScript checks
- **Unit Tests** - All unit tests must pass
- **Integration Tests** - All integration tests must pass
- **Component Tests** - All component tests must pass
- **Coverage** - Test coverage must meet threshold (80%)
- **Build Verification** - Application must build successfully
- **Security Scan** - Security audit must pass

### Branch Protection Settings

```yaml
# GitHub Branch Protection API Configuration
protection_rules:
  main:
    required_status_checks:
      strict: true
      contexts:
        - "ci/pr-checks"
        - "Code Quality"
        - "Unit Tests"
        - "Integration Tests"
        - "Component Tests"
        - "Coverage"
        - "Build Verification"
        - "Security Scan"
    
    enforce_admins: true
    required_pull_request_reviews:
      required_approving_review_count: 2
      dismiss_stale_reviews: true
      require_code_owner_reviews: true
      require_last_push_approval: true
    
    restrictions:
      users: []
      teams: ["core-developers"]
      apps: []
    
    allow_force_pushes: false
    allow_deletions: false
    block_creations: false
    
  develop:
    required_status_checks:
      strict: true
      contexts:
        - "ci/pr-checks"
        - "Code Quality"
        - "Unit Tests"
    
    enforce_admins: false
    required_pull_request_reviews:
      required_approving_review_count: 1
      dismiss_stale_reviews: true
      require_code_owner_reviews: false
    
    allow_force_pushes: false
    allow_deletions: false
```

## Repository Settings

### General Settings
- **Default branch**: `main`
- **Allow merge commits**: ✅ Enabled
- **Allow squash merging**: ✅ Enabled (recommended)
- **Allow rebase merging**: ❌ Disabled
- **Automatically delete head branches**: ✅ Enabled

### Security Settings
- **Dependency graph**: ✅ Enabled
- **Dependabot alerts**: ✅ Enabled
- **Dependabot security updates**: ✅ Enabled
- **Code scanning alerts**: ✅ Enabled
- **Secret scanning**: ✅ Enabled

### Actions Settings
- **Actions permissions**: Allow all actions and reusable workflows
- **Artifact and log retention**: 90 days
- **Fork pull request workflows**: Require approval for first-time contributors

## CODEOWNERS File

Create a `.github/CODEOWNERS` file to automatically request reviews:

```
# Global owners
* @team-lead @senior-dev

# Frontend components
/app/components/ @frontend-team
/app/pages/ @frontend-team

# Backend API
/app/api/ @backend-team
/app/lib/ @backend-team

# Database
/prisma/ @database-team @backend-team

# CI/CD and Infrastructure
/.github/ @devops-team @team-lead
/docker* @devops-team
/scripts/ @devops-team

# Tests
/tests/ @qa-team
/__tests__/ @qa-team
*.test.* @qa-team

# Documentation
/docs/ @tech-writers @team-lead
README.md @tech-writers @team-lead
```

## Deployment Protection Rules

### Staging Environment
- **Required reviewers**: 1 team member
- **Wait timer**: 0 minutes
- **Prevent self-review**: ❌ Disabled

### Production Environment
- **Required reviewers**: 2 team members (including 1 admin)
- **Wait timer**: 10 minutes
- **Prevent self-review**: ✅ Enabled
- **Restrict to specific branches**: `main` only

## Automated Checks Configuration

### Pull Request Template
Create `.github/pull_request_template.md`:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] All tests pass locally

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Code is commented where necessary
- [ ] Documentation updated
- [ ] No new warnings introduced
- [ ] Tests cover the changes
- [ ] All CI checks pass

## Screenshots (if applicable)
Add screenshots for UI changes

## Additional Notes
Any additional information for reviewers
```

## Issue Templates

### Bug Report Template
Create `.github/ISSUE_TEMPLATE/bug_report.yml`:

```yaml
name: Bug Report
description: File a bug report
title: "[Bug]: "
labels: ["bug", "triage"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to fill out this bug report!
  
  - type: textarea
    id: what-happened
    attributes:
      label: What happened?
      description: Also tell us, what did you expect to happen?
      placeholder: Tell us what you see!
    validations:
      required: true
  
  - type: textarea
    id: steps
    attributes:
      label: Steps to Reproduce
      description: Please provide steps to reproduce the issue
      placeholder: |
        1. Go to '...'
        2. Click on '....'
        3. Scroll down to '....'
        4. See error
    validations:
      required: true
  
  - type: dropdown
    id: browsers
    attributes:
      label: What browsers are you seeing the problem on?
      multiple: true
      options:
        - Firefox
        - Chrome
        - Safari
        - Microsoft Edge
  
  - type: textarea
    id: logs
    attributes:
      label: Relevant log output
      description: Please copy and paste any relevant log output. This will be automatically formatted into code, so no need for backticks.
      render: shell
```

## Setup Instructions

1. **Apply Branch Protection Rules**:
   ```bash
   # Use GitHub CLI to apply protection rules
   gh api repos/:owner/:repo/branches/main/protection \
     --method PUT \
     --field required_status_checks='{"strict":true,"contexts":["ci/pr-checks","Code Quality","Unit Tests","Integration Tests","Component Tests","Coverage","Build Verification","Security Scan"]}' \
     --field enforce_admins=true \
     --field required_pull_request_reviews='{"required_approving_review_count":2,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
     --field allow_force_pushes=false \
     --field allow_deletions=false
   ```

2. **Create CODEOWNERS file**:
   ```bash
   # Create the CODEOWNERS file with appropriate team assignments
   cp .github/CODEOWNERS.example .github/CODEOWNERS
   # Edit with your team structure
   ```

3. **Configure Repository Settings**:
   - Go to repository Settings
   - Configure branch protection rules
   - Set up required status checks
   - Configure deployment environments

4. **Test Configuration**:
   - Create a test PR to verify all checks run
   - Verify branch protection prevents direct pushes
   - Test deployment approval process

This configuration ensures that all code changes go through proper review and testing before being merged or deployed.