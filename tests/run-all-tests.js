#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Task 19 - Testing Implementation
 * 
 * This script runs all test suites in the correct order and provides
 * detailed reporting for the CMS testing implementation.
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

// Test configuration
const testSuites = [
  {
    name: 'Unit Tests',
    command: 'npm run test -- --selectProjects=unit',
    description: 'Tests for utility functions and services',
    critical: true
  },
  {
    name: 'Database Tests',
    command: 'npm run test -- --selectProjects=database',
    description: 'Database connection and error handling tests',
    critical: true
  },
  {
    name: 'API Tests',
    command: 'npm run test -- --selectProjects=api',
    description: 'API endpoint tests with mocked dependencies',
    critical: true
  },
  {
    name: 'Component Tests',
    command: 'npm run test -- --selectProjects=components',
    description: 'React component tests with React Testing Library',
    critical: false
  },
  {
    name: 'Integration Tests',
    command: 'npm run test -- --selectProjects=integration',
    description: 'End-to-end workflow tests with real database',
    critical: true
  },
  {
    name: 'E2E Tests',
    command: 'npm run test -- --selectProjects=e2e',
    description: 'Critical user workflow tests',
    critical: true
  }
]

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logHeader(message) {
  const border = '='.repeat(message.length + 4)
  log(border, 'cyan')
  log(`  ${message}  `, 'cyan')
  log(border, 'cyan')
}

function logSubHeader(message) {
  log(`\n${colors.bright}${message}${colors.reset}`)
  log('-'.repeat(message.length), 'blue')
}

function runCommand(command, description) {
  try {
    log(`\n${colors.yellow}Running:${colors.reset} ${command}`)
    log(`${colors.blue}Description:${colors.reset} ${description}`)
    
    const output = execSync(command, { 
      stdio: 'pipe',
      encoding: 'utf8',
      cwd: process.cwd()
    })
    
    log(`${colors.green}✓ Success${colors.reset}`)
    return { success: true, output }
  } catch (error) {
    log(`${colors.red}✗ Failed${colors.reset}`)
    log(`${colors.red}Error:${colors.reset} ${error.message}`)
    return { success: false, error: error.message, output: error.stdout }
  }
}

function generateTestReport(results) {
  const reportPath = path.join(__dirname, '../test-report.md')
  const timestamp = new Date().toISOString()
  
  let report = `# CMS Testing Implementation Report\n\n`
  report += `**Generated:** ${timestamp}\n`
  report += `**Task:** 19 - Testing Implementation\n\n`
  
  report += `## Test Suite Results\n\n`
  
  let totalTests = 0
  let passedTests = 0
  let criticalFailures = 0
  
  results.forEach(result => {
    const status = result.success ? '✅ PASSED' : '❌ FAILED'
    const critical = result.critical ? ' (Critical)' : ''
    
    report += `### ${result.name}${critical}\n`
    report += `**Status:** ${status}\n`
    report += `**Description:** ${result.description}\n`
    
    if (result.success) {
      passedTests++
    } else if (result.critical) {
      criticalFailures++
    }
    
    totalTests++
    
    if (result.output) {
      report += `\n**Output:**\n\`\`\`\n${result.output.slice(0, 1000)}${result.output.length > 1000 ? '...' : ''}\n\`\`\`\n`
    }
    
    report += `\n---\n\n`
  })
  
  report += `## Summary\n\n`
  report += `- **Total Test Suites:** ${totalTests}\n`
  report += `- **Passed:** ${passedTests}\n`
  report += `- **Failed:** ${totalTests - passedTests}\n`
  report += `- **Critical Failures:** ${criticalFailures}\n`
  report += `- **Success Rate:** ${Math.round((passedTests / totalTests) * 100)}%\n\n`
  
  if (criticalFailures === 0 && passedTests === totalTests) {
    report += `## ✅ Task 19 Status: COMPLETED\n\n`
    report += `All test suites are passing successfully. The testing implementation meets the requirements:\n\n`
    report += `- ✅ Unit tests for all utility functions and services\n`
    report += `- ✅ Integration tests for API endpoints\n`
    report += `- ✅ Component tests for React components\n`
    report += `- ✅ End-to-end tests for critical user workflows\n`
    report += `- ✅ Continuous testing pipeline setup\n`
  } else {
    report += `## ❌ Task 19 Status: IN PROGRESS\n\n`
    report += `Some test suites are failing. Please review the failures above and fix the issues.\n\n`
    
    if (criticalFailures > 0) {
      report += `**Critical failures detected!** These must be resolved before task completion.\n\n`
    }
  }
  
  report += `## Test Coverage\n\n`
  report += `Run \`npm run test:coverage\` to generate detailed coverage reports.\n`
  report += `Target coverage: 80% for branches, functions, lines, and statements.\n\n`
  
  report += `## Next Steps\n\n`
  if (criticalFailures === 0 && passedTests === totalTests) {
    report += `1. Review coverage reports and ensure 80%+ coverage\n`
    report += `2. Set up CI/CD pipeline integration\n`
    report += `3. Document testing procedures for the team\n`
    report += `4. Mark Task 19 as completed\n`
  } else {
    report += `1. Fix failing tests (prioritize critical failures)\n`
    report += `2. Re-run test suite\n`
    report += `3. Ensure all tests pass before marking task complete\n`
  }
  
  fs.writeFileSync(reportPath, report)
  log(`\n${colors.green}Test report generated:${colors.reset} ${reportPath}`)
}

// Main execution
async function main() {
  logHeader('CMS Testing Implementation - Task 19')
  
  log(`${colors.bright}This script will run all test suites for the CMS testing implementation.${colors.reset}`)
  log(`${colors.yellow}Please ensure the database is running and environment is properly configured.${colors.reset}\n`)
  
  // Check if database is accessible
  logSubHeader('Pre-flight Checks')
  
  const dbCheck = runCommand('npm run db:generate', 'Checking database connection')
  if (!dbCheck.success) {
    log(`${colors.red}Database check failed. Please ensure PostgreSQL is running and configured.${colors.reset}`)
    process.exit(1)
  }
  
  // Run all test suites
  const results = []
  
  for (const suite of testSuites) {
    logSubHeader(`Running ${suite.name}`)
    
    const result = runCommand(suite.command, suite.description)
    results.push({
      ...suite,
      ...result
    })
    
    // If a critical test fails, we might want to continue but flag it
    if (!result.success && suite.critical) {
      log(`${colors.red}Critical test suite failed!${colors.reset}`)
    }
  }
  
  // Generate comprehensive report
  logSubHeader('Generating Test Report')
  generateTestReport(results)
  
  // Final summary
  logHeader('Test Execution Complete')
  
  const totalSuites = results.length
  const passedSuites = results.filter(r => r.success).length
  const criticalFailures = results.filter(r => !r.success && r.critical).length
  
  log(`Total Suites: ${totalSuites}`)
  log(`Passed: ${passedSuites}`, passedSuites === totalSuites ? 'green' : 'yellow')
  log(`Failed: ${totalSuites - passedSuites}`, totalSuites - passedSuites === 0 ? 'green' : 'red')
  log(`Critical Failures: ${criticalFailures}`, criticalFailures === 0 ? 'green' : 'red')
  
  if (criticalFailures === 0 && passedSuites === totalSuites) {
    log(`\n${colors.green}🎉 All tests passed! Task 19 implementation is complete.${colors.reset}`)
    process.exit(0)
  } else {
    log(`\n${colors.red}❌ Some tests failed. Please review the report and fix issues.${colors.reset}`)
    process.exit(1)
  }
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  log(`${colors.red}Uncaught Exception: ${error.message}${colors.reset}`)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  log(`${colors.red}Unhandled Rejection at: ${promise}, reason: ${reason}${colors.reset}`)
  process.exit(1)
})

// Run the main function
main().catch(error => {
  log(`${colors.red}Script execution failed: ${error.message}${colors.reset}`)
  process.exit(1)
})