#!/usr/bin/env node

/**
 * User Management Test Suite Runner
 * Comprehensive test execution for all user management functionality
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

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

// Test categories and their patterns
const testCategories = {
  'Unit Tests - Components': [
    '__tests__/components/users/AccountSettings.comprehensive.test.tsx',
    '__tests__/components/users/SecuritySettings.comprehensive.test.tsx',
    '__tests__/components/users/ProfilePictureManager.test.tsx',
    '__tests__/components/admin/UserManagement.comprehensive.test.tsx',
    '__tests__/components/admin/UserActivityMonitor.test.tsx',
  ],
  'Unit Tests - Libraries': [
    '__tests__/lib/user-profile-utilities.test.ts',
    '__tests__/lib/audit-service-comprehensive.test.ts',
    '__tests__/lib/session-management.test.ts',
    '__tests__/lib/two-factor-auth.test.ts',
    '__tests__/lib/password-utils.test.ts',
  ],
  'Integration Tests - API': [
    '__tests__/api/user-management-integration.test.ts',
    '__tests__/api/user-profile-enhanced.test.ts',
    '__tests__/api/user-preferences.test.ts',
    '__tests__/api/user-security.test.ts',
    '__tests__/api/user-avatar.test.ts',
    '__tests__/api/session-management.test.ts',
    '__tests__/api/two-factor-auth.test.ts',
    '__tests__/api/account-deactivation.test.ts',
  ],
  'Security Tests': [
    '__tests__/security/user-management-security.test.ts',
  ],
  'Performance Tests': [
    '__tests__/performance/user-management-performance.test.ts',
  ],
}

// Test execution configuration
const testConfig = {
  timeout: 30000, // 30 seconds per test file
  maxWorkers: 4,
  coverage: true,
  verbose: true,
}

class TestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      categories: {},
    }
    this.startTime = Date.now()
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`)
  }

  logHeader(message) {
    const border = '='.repeat(60)
    this.log(border, 'cyan')
    this.log(`  ${message}`, 'cyan')
    this.log(border, 'cyan')
  }

  logSection(message) {
    this.log(`\n${colors.bright}${message}${colors.reset}`)
    this.log('-'.repeat(40), 'blue')
  }

  async runTestCategory(categoryName, testFiles) {
    this.logSection(`Running ${categoryName}`)
    
    const categoryResults = {
      total: testFiles.length,
      passed: 0,
      failed: 0,
      skipped: 0,
      files: [],
    }

    for (const testFile of testFiles) {
      const filePath = path.resolve(testFile)
      
      // Check if test file exists
      if (!fs.existsSync(filePath)) {
        this.log(`  ⚠️  Skipping ${testFile} (file not found)`, 'yellow')
        categoryResults.skipped++
        categoryResults.files.push({
          file: testFile,
          status: 'skipped',
          reason: 'File not found',
        })
        continue
      }

      try {
        this.log(`  🧪 Running ${testFile}...`, 'blue')
        
        const command = [
          'npx jest',
          `"${testFile}"`,
          '--passWithNoTests',
          '--silent',
          testConfig.coverage ? '--coverage=false' : '', // Individual runs without coverage
          `--maxWorkers=${testConfig.maxWorkers}`,
          `--testTimeout=${testConfig.timeout}`,
        ].filter(Boolean).join(' ')

        const startTime = Date.now()
        execSync(command, { 
          stdio: 'pipe',
          cwd: process.cwd(),
        })
        const duration = Date.now() - startTime

        this.log(`  ✅ ${testFile} (${duration}ms)`, 'green')
        categoryResults.passed++
        categoryResults.files.push({
          file: testFile,
          status: 'passed',
          duration,
        })

      } catch (error) {
        this.log(`  ❌ ${testFile} - FAILED`, 'red')
        categoryResults.failed++
        categoryResults.files.push({
          file: testFile,
          status: 'failed',
          error: error.message,
        })
      }
    }

    this.results.categories[categoryName] = categoryResults
    this.results.total += categoryResults.total
    this.results.passed += categoryResults.passed
    this.results.failed += categoryResults.failed
    this.results.skipped += categoryResults.skipped

    // Category summary
    const passRate = categoryResults.total > 0 
      ? ((categoryResults.passed / categoryResults.total) * 100).toFixed(1)
      : '0.0'
    
    this.log(`\n📊 ${categoryName} Summary:`, 'bright')
    this.log(`   Total: ${categoryResults.total}`)
    this.log(`   Passed: ${categoryResults.passed}`, 'green')
    this.log(`   Failed: ${categoryResults.failed}`, categoryResults.failed > 0 ? 'red' : 'reset')
    this.log(`   Skipped: ${categoryResults.skipped}`, categoryResults.skipped > 0 ? 'yellow' : 'reset')
    this.log(`   Pass Rate: ${passRate}%`, passRate === '100.0' ? 'green' : 'yellow')
  }

  async runCoverageReport() {
    this.logSection('Generating Coverage Report')
    
    try {
      // Run all tests with coverage
      const allTestFiles = Object.values(testCategories).flat()
      const existingFiles = allTestFiles.filter(file => fs.existsSync(path.resolve(file)))
      
      if (existingFiles.length === 0) {
        this.log('  ⚠️  No test files found for coverage report', 'yellow')
        return
      }

      const command = [
        'npx jest',
        ...existingFiles.map(f => `"${f}"`),
        '--coverage',
        '--coverageReporters=text',
        '--coverageReporters=html',
        '--coverageDirectory=coverage/user-management',
        '--collectCoverageFrom="app/components/users/**/*.{ts,tsx}"',
        '--collectCoverageFrom="app/components/admin/**/*.{ts,tsx}"',
        '--collectCoverageFrom="app/lib/user-*.ts"',
        '--collectCoverageFrom="app/lib/profile-*.ts"',
        '--collectCoverageFrom="app/lib/audit-*.ts"',
        '--collectCoverageFrom="app/lib/session-*.ts"',
        '--collectCoverageFrom="app/lib/two-factor-*.ts"',
        '--collectCoverageFrom="app/api/users/**/*.ts"',
        '--passWithNoTests',
        '--silent',
      ].join(' ')

      this.log('  📈 Generating comprehensive coverage report...', 'blue')
      execSync(command, { 
        stdio: 'inherit',
        cwd: process.cwd(),
      })

      this.log('  ✅ Coverage report generated in coverage/user-management/', 'green')
      
    } catch (error) {
      this.log('  ❌ Failed to generate coverage report', 'red')
      this.log(`     Error: ${error.message}`, 'red')
    }
  }

  generateDetailedReport() {
    this.logSection('Detailed Test Report')

    // Overall statistics
    const totalDuration = Date.now() - this.startTime
    const overallPassRate = this.results.total > 0 
      ? ((this.results.passed / this.results.total) * 100).toFixed(1)
      : '0.0'

    this.log(`📋 Overall Test Results:`, 'bright')
    this.log(`   Total Tests: ${this.results.total}`)
    this.log(`   Passed: ${this.results.passed}`, 'green')
    this.log(`   Failed: ${this.results.failed}`, this.results.failed > 0 ? 'red' : 'reset')
    this.log(`   Skipped: ${this.results.skipped}`, this.results.skipped > 0 ? 'yellow' : 'reset')
    this.log(`   Pass Rate: ${overallPassRate}%`, overallPassRate === '100.0' ? 'green' : 'yellow')
    this.log(`   Duration: ${(totalDuration / 1000).toFixed(2)}s`)

    // Category breakdown
    this.log(`\n📊 Category Breakdown:`, 'bright')
    Object.entries(this.results.categories).forEach(([category, results]) => {
      const passRate = results.total > 0 
        ? ((results.passed / results.total) * 100).toFixed(1)
        : '0.0'
      
      this.log(`\n   ${category}:`)
      this.log(`     Passed: ${results.passed}/${results.total} (${passRate}%)`, 
        passRate === '100.0' ? 'green' : 'yellow')
      
      // Show failed tests
      const failedFiles = results.files.filter(f => f.status === 'failed')
      if (failedFiles.length > 0) {
        this.log(`     Failed tests:`, 'red')
        failedFiles.forEach(file => {
          this.log(`       - ${file.file}`, 'red')
        })
      }

      // Show skipped tests
      const skippedFiles = results.files.filter(f => f.status === 'skipped')
      if (skippedFiles.length > 0) {
        this.log(`     Skipped tests:`, 'yellow')
        skippedFiles.forEach(file => {
          this.log(`       - ${file.file} (${file.reason})`, 'yellow')
        })
      }
    })

    // Performance insights
    this.log(`\n⚡ Performance Insights:`, 'bright')
    const allFiles = Object.values(this.results.categories)
      .flatMap(cat => cat.files)
      .filter(f => f.status === 'passed' && f.duration)
      .sort((a, b) => b.duration - a.duration)

    if (allFiles.length > 0) {
      this.log(`   Slowest tests:`)
      allFiles.slice(0, 3).forEach((file, index) => {
        this.log(`     ${index + 1}. ${file.file} (${file.duration}ms)`)
      })

      const avgDuration = allFiles.reduce((sum, f) => sum + f.duration, 0) / allFiles.length
      this.log(`   Average test duration: ${avgDuration.toFixed(0)}ms`)
    }

    // Recommendations
    this.log(`\n💡 Recommendations:`, 'bright')
    if (this.results.failed > 0) {
      this.log(`   - Fix ${this.results.failed} failing test(s)`, 'red')
    }
    if (this.results.skipped > 0) {
      this.log(`   - Implement ${this.results.skipped} missing test file(s)`, 'yellow')
    }
    if (overallPassRate < 90) {
      this.log(`   - Improve test coverage (current: ${overallPassRate}%)`, 'yellow')
    }
    if (this.results.failed === 0 && this.results.skipped === 0) {
      this.log(`   - All tests passing! Consider adding more edge case tests`, 'green')
    }
  }

  async run() {
    this.logHeader('User Management Test Suite')
    this.log('🚀 Starting comprehensive user management tests...\n')

    // Run each test category
    for (const [categoryName, testFiles] of Object.entries(testCategories)) {
      await this.runTestCategory(categoryName, testFiles)
    }

    // Generate coverage report if requested
    if (testConfig.coverage) {
      await this.runCoverageReport()
    }

    // Generate detailed report
    this.generateDetailedReport()

    // Final status
    const success = this.results.failed === 0
    this.logHeader(success ? 'All Tests Completed Successfully! 🎉' : 'Some Tests Failed ❌')

    // Exit with appropriate code
    process.exit(success ? 0 : 1)
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const options = {
  category: args.find(arg => arg.startsWith('--category='))?.split('=')[1],
  noCoverage: args.includes('--no-coverage'),
  verbose: args.includes('--verbose'),
  help: args.includes('--help') || args.includes('-h'),
}

if (options.help) {
  console.log(`
User Management Test Suite Runner

Usage: node user-management-test-suite.js [options]

Options:
  --category=<name>    Run only specific test category
  --no-coverage        Skip coverage report generation
  --verbose            Enable verbose output
  --help, -h          Show this help message

Available categories:
${Object.keys(testCategories).map(cat => `  - "${cat}"`).join('\n')}

Examples:
  node user-management-test-suite.js
  node user-management-test-suite.js --category="Unit Tests - Components"
  node user-management-test-suite.js --no-coverage
`)
  process.exit(0)
}

// Override config based on options
if (options.noCoverage) {
  testConfig.coverage = false
}

// Run specific category if requested
if (options.category) {
  if (!testCategories[options.category]) {
    console.error(`❌ Unknown category: ${options.category}`)
    console.error(`Available categories: ${Object.keys(testCategories).join(', ')}`)
    process.exit(1)
  }
  
  // Run only the specified category
  const singleCategory = { [options.category]: testCategories[options.category] }
  Object.keys(testCategories).forEach(key => {
    if (key !== options.category) {
      delete testCategories[key]
    }
  })
}

// Start the test runner
const runner = new TestRunner()
runner.run().catch(error => {
  console.error('❌ Test runner failed:', error)
  process.exit(1)
})