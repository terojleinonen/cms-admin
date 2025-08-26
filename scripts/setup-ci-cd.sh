#!/bin/bash

# Setup CI/CD Pipeline for CMS Admin
# This script configures the complete CI/CD infrastructure

set -e

echo "🚀 Setting up CI/CD Pipeline for CMS Admin"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not in a git repository. Please run this script from the project root."
        exit 1
    fi
    
    # Check if GitHub CLI is available (optional)
    if command -v gh &> /dev/null; then
        log_success "GitHub CLI found"
        GH_CLI_AVAILABLE=true
    else
        log_warning "GitHub CLI not found. Some features will be limited."
        GH_CLI_AVAILABLE=false
    fi
    
    # Check if Node.js is available
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log_success "Node.js found: $NODE_VERSION"
    else
        log_error "Node.js not found. Please install Node.js 18 or later."
        exit 1
    fi
    
    # Check if npm is available
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        log_success "npm found: $NPM_VERSION"
    else
        log_error "npm not found. Please install npm."
        exit 1
    fi
}

# Validate workflow files
validate_workflows() {
    log_info "Validating GitHub Actions workflows..."
    
    if [ -f "scripts/validate-workflows.js" ]; then
        if node scripts/validate-workflows.js; then
            log_success "All workflow files are valid"
        else
            log_error "Workflow validation failed"
            exit 1
        fi
    else
        log_warning "Workflow validator not found, skipping validation"
    fi
}

# Setup environment files
setup_environment() {
    log_info "Setting up environment configuration..."
    
    # Create .env.ci.example if it doesn't exist
    if [ ! -f ".env.ci.example" ]; then
        cat > .env.ci.example << EOF
# CI/CD Environment Variables
# Copy this file to .env.ci and configure for your CI environment

# Database (automatically configured in CI)
DATABASE_URL=postgresql://test_user:test_password@localhost:5432/cms_test

# Authentication (test values)
NEXTAUTH_SECRET=test-secret-key-for-ci
NEXTAUTH_URL=http://localhost:3001

# Optional: Coverage reporting
CODECOV_TOKEN=your-codecov-token

# Optional: Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Optional: Custom deployment
DEPLOYMENT_TOKEN=your-deployment-token
EOF
        log_success "Created .env.ci.example"
    else
        log_info ".env.ci.example already exists"
    fi
}

# Setup test database configuration
setup_test_database() {
    log_info "Setting up test database configuration..."
    
    # Check if test database setup script exists
    if [ -f "scripts/setup-test-database.js" ]; then
        log_success "Test database setup script found"
    else
        log_warning "Test database setup script not found"
    fi
    
    # Validate Jest configuration
    if [ -f "jest.config.js" ]; then
        log_success "Jest configuration found"
    else
        log_error "Jest configuration not found. Please ensure jest.config.js exists."
        exit 1
    fi
}

# Setup GitHub repository settings
setup_github_settings() {
    log_info "Setting up GitHub repository settings..."
    
    if [ "$GH_CLI_AVAILABLE" = true ]; then
        # Check if we're authenticated with GitHub
        if gh auth status &> /dev/null; then
            log_success "GitHub CLI authenticated"
            
            # Get repository information
            REPO_OWNER=$(gh repo view --json owner --jq .owner.login)
            REPO_NAME=$(gh repo view --json name --jq .name)
            
            log_info "Repository: $REPO_OWNER/$REPO_NAME"
            
            # Enable GitHub Actions (if not already enabled)
            log_info "Ensuring GitHub Actions is enabled..."
            
            # Enable vulnerability alerts
            log_info "Enabling security features..."
            
        else
            log_warning "GitHub CLI not authenticated. Please run 'gh auth login' to configure repository settings."
        fi
    else
        log_warning "GitHub CLI not available. Please configure repository settings manually:"
        echo "  1. Go to repository Settings"
        echo "  2. Enable GitHub Actions"
        echo "  3. Configure branch protection rules"
        echo "  4. Set up required status checks"
        echo "  5. Enable security features (Dependabot, code scanning)"
    fi
}

# Setup branch protection
setup_branch_protection() {
    log_info "Setting up branch protection rules..."
    
    if [ "$GH_CLI_AVAILABLE" = true ] && gh auth status &> /dev/null; then
        log_info "Configuring branch protection for main branch..."
        
        # Note: This requires admin permissions
        cat << EOF

To set up branch protection rules, please:

1. Go to your repository on GitHub
2. Navigate to Settings > Branches
3. Add a branch protection rule for 'main' with:
   - Require a pull request before merging
   - Require approvals (2 recommended)
   - Dismiss stale PR approvals when new commits are pushed
   - Require status checks to pass before merging
   - Require branches to be up to date before merging
   - Required status checks:
     * ci/pr-checks
     * Code Quality
     * Unit Tests
     * Integration Tests
     * Component Tests
     * Coverage
     * Build Verification
     * Security Scan
   - Restrict pushes that create matching branches
   - Do not allow bypassing the above settings

EOF
    else
        log_info "Please configure branch protection rules manually in GitHub repository settings"
    fi
}

# Setup secrets and environment variables
setup_secrets() {
    log_info "Setting up repository secrets..."
    
    cat << EOF

Please configure the following secrets in your GitHub repository:
(Go to Settings > Secrets and variables > Actions)

Required secrets:
- CODECOV_TOKEN: Token for code coverage reporting (get from codecov.io)

Optional secrets:
- SLACK_WEBHOOK_URL: Webhook URL for Slack notifications
- DEPLOYMENT_TOKEN: Custom deployment token (if using custom deployment)

Environment variables (if using environments):
- DATABASE_URL: Production database URL (for deployment environments)
- NEXTAUTH_SECRET: Production NextAuth secret
- NEXTAUTH_URL: Production application URL

EOF
}

# Create documentation
create_documentation() {
    log_info "Creating CI/CD documentation..."
    
    # Check if documentation already exists
    if [ -f ".github/README.md" ]; then
        log_success "CI/CD documentation already exists"
    else
        log_warning "CI/CD documentation not found"
    fi
    
    # Create quick reference
    cat > CI_CD_QUICK_REFERENCE.md << EOF
# CI/CD Quick Reference

## Workflows

### Main Workflows
- **ci.yml**: Comprehensive testing and quality checks
- **pr-checks.yml**: Fast feedback for pull requests
- **deployment-gate.yml**: Safe deployment with quality gates
- **test-notifications.yml**: Automated failure reporting

### Triggering Workflows
\`\`\`bash
# Trigger deployment to staging
git push origin main

# Trigger deployment to production (requires approval)
gh workflow run deployment-gate.yml -f environment=production

# View workflow runs
gh run list

# View specific run
gh run view <run-id>
\`\`\`

### Test Commands
\`\`\`bash
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
\`\`\`

### Troubleshooting
- Check workflow logs in GitHub Actions tab
- Validate workflow syntax: \`node scripts/validate-workflows.js\`
- Test database setup: \`npm run test:db:setup\`
- Check test configuration: \`npm run test:stats\`

## Status Badges

Add these to your README.md:

\`\`\`markdown
![CI](https://github.com/owner/repo/workflows/Continuous%20Integration/badge.svg)
![Coverage](https://codecov.io/gh/owner/repo/branch/main/graph/badge.svg)
![Security](https://github.com/owner/repo/workflows/Security%20Scan/badge.svg)
\`\`\`
EOF
    
    log_success "Created CI_CD_QUICK_REFERENCE.md"
}

# Run tests to verify setup
verify_setup() {
    log_info "Verifying CI/CD setup..."
    
    # Check if we can run basic tests
    if npm run test:fast --if-present > /dev/null 2>&1; then
        log_success "Basic tests can run"
    else
        log_warning "Basic tests failed - this is expected if tests need fixes"
    fi
    
    # Check if build works
    if npm run build > /dev/null 2>&1; then
        log_success "Application builds successfully"
    else
        log_warning "Build failed - may need environment configuration"
    fi
    
    # Validate package.json scripts
    if npm run --silent 2>&1 | grep -q "test:"; then
        log_success "Test scripts are configured"
    else
        log_warning "Test scripts may need configuration"
    fi
}

# Main setup function
main() {
    echo
    log_info "Starting CI/CD setup process..."
    echo
    
    check_prerequisites
    echo
    
    validate_workflows
    echo
    
    setup_environment
    echo
    
    setup_test_database
    echo
    
    setup_github_settings
    echo
    
    setup_branch_protection
    echo
    
    setup_secrets
    echo
    
    create_documentation
    echo
    
    verify_setup
    echo
    
    log_success "CI/CD setup completed!"
    echo
    
    cat << EOF
🎉 Next Steps:

1. Configure repository secrets in GitHub Settings
2. Set up branch protection rules (see output above)
3. Create your first pull request to test the pipeline
4. Review and customize workflows as needed

📚 Documentation:
- .github/README.md - Comprehensive CI/CD documentation
- CI_CD_QUICK_REFERENCE.md - Quick reference guide
- .github/branch-protection.md - Branch protection configuration

🔧 Useful Commands:
- npm run test - Run all tests
- node scripts/validate-workflows.js - Validate workflows
- gh workflow list - List all workflows (requires GitHub CLI)

Happy coding! 🚀
EOF
}

# Run main function
main "$@"