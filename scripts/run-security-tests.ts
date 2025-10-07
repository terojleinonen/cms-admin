#!/usr/bin/env node

/**
 * Security Testing Automation Script
 * Runs comprehensive security tests and generates reports
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

interface SecurityTestResult {
  testSuite: string
  passed: number
  failed: number
  skipped: number
  duration: number
  vulnerabilities: string[]
  errors: string[]
}

interface SecurityReport {
  timestamp: string
  totalTests: number
  totalPassed: number
  totalFailed: number
  totalSkipped: number
  totalDuration: number
  testResults: SecurityTestResult[]
  summary: {
    criticalIssues: number
    highRiskIssues: number
    mediumRiskIssues: number
    lowRiskIssues: number
  }
  recommendations: string[]
}

class SecurityTestRunner {
  private results: SecurityTestResult[] = []
  private startTime: number = Date.now()

  async runAllSecurityTests(): Promise<SecurityReport> {
    console.log('🔒 Starting Security Testing Automation...\n')

    // Run automated vulnerability scanning
    await this.runTestSuite('Automated Security Scanner', [
      '__tests__/security/automated-security-scanner.test.ts'
    ])

    // Run permission boundary penetration tests
    await this.runTestSuite('Permission Boundary Penetration', [
      '__tests__/security/permission-boundary-penetration.test.ts'
    ])

    // Run security regression tests
    await this.runTestSuite('Security Regression Testing', [
      '__tests__/security/security-regression-testing.test.ts'
    ])

    // Run additional security-related tests
    await this.runTestSuite('API Security Tests', [
      '__tests__/lib/api-security.test.ts',
      '__tests__/lib/csrf-protection.test.ts',
      '__tests__/lib/input-validation.test.ts'
    ])

    await this.runTestSuite('Authentication Security', [
      '__tests__/integration/authentication-flow-integration.test.ts',
      '__tests__/middleware-security-comprehensive.test.ts'
    ])

    await this.runTestSuite('Permission System Security', [
      '__tests__/lib/permissions.test.ts',
      '__tests__/lib/enhanced-permissions.test.ts',
      '__tests__/integration/permission-system.test.ts'
    ])

    return this.generateReport()
  }

  private async runTestSuite(suiteName: string, testFiles: string[]): Promise<void> {
    console.log(`\n📋 Running ${suiteName}...`)
    
    const suiteStartTime = Date.now()
    let passed = 0
    let failed = 0
    let skipped = 0
    const vulnerabilities: string[] = []
    const errors: string[] = []

    for (const testFile of testFiles) {
      try {
        console.log(`  ⚡ Testing ${path.basename(testFile)}...`)
        
        // Check if test file exists
        if (!fs.existsSync(testFile)) {
          console.log(`    ⚠️  Test file not found: ${testFile}`)
          skipped++
          continue
        }

        // Run the test
        const result = execSync(
          `npm test -- --testPathPatterns="${testFile}" --verbose --json`,
          { 
            encoding: 'utf8',
            timeout: 60000,
            stdio: 'pipe'
          }
        )

        const testResult = JSON.parse(result)
        
        if (testResult.success) {
          passed += testResult.numPassedTests || 0
          failed += testResult.numFailedTests || 0
          
          // Analyze test output for security issues
          if (testResult.testResults) {
            for (const fileResult of testResult.testResults) {
              if (fileResult.message) {
                this.analyzeTestOutput(fileResult.message, vulnerabilities, errors)
              }
            }
          }
          
          console.log(`    ✅ Passed: ${testResult.numPassedTests || 0}, Failed: ${testResult.numFailedTests || 0}`)
        } else {
          failed++
          errors.push(`Test suite ${testFile} failed to run`)
          console.log(`    ❌ Test suite failed`)
        }

      } catch (error) {
        failed++
        errors.push(`Error running ${testFile}: ${error}`)
        console.log(`    ❌ Error: ${error}`)
      }
    }

    const duration = Date.now() - suiteStartTime

    this.results.push({
      testSuite: suiteName,
      passed,
      failed,
      skipped,
      duration,
      vulnerabilities,
      errors
    })

    console.log(`  📊 Suite completed: ${passed} passed, ${failed} failed, ${skipped} skipped (${duration}ms)`)
  }

  private analyzeTestOutput(output: string, vulnerabilities: string[], errors: string[]): void {
    // Analyze test output for security-related issues
    const securityKeywords = [
      'SQL injection',
      'XSS',
      'CSRF',
      'authentication bypass',
      'privilege escalation',
      'unauthorized access',
      'session hijacking',
      'path traversal',
      'rate limit bypass',
      'data exposure'
    ]

    for (const keyword of securityKeywords) {
      if (output.toLowerCase().includes(keyword.toLowerCase())) {
        vulnerabilities.push(`Potential ${keyword} vulnerability detected`)
      }
    }

    // Check for test failures that might indicate security issues
    if (output.includes('FAIL') || output.includes('Error')) {
      const lines = output.split('\n')
      for (const line of lines) {
        if (line.includes('FAIL') || line.includes('Error')) {
          errors.push(line.trim())
        }
      }
    }
  }

  private generateReport(): SecurityReport {
    const totalDuration = Date.now() - this.startTime
    const totalTests = this.results.reduce((sum, r) => sum + r.passed + r.failed, 0)
    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0)
    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0)
    const totalSkipped = this.results.reduce((sum, r) => sum + r.skipped, 0)

    // Analyze vulnerabilities by severity
    const allVulnerabilities = this.results.flatMap(r => r.vulnerabilities)
    const criticalIssues = allVulnerabilities.filter(v => 
      v.includes('SQL injection') || v.includes('authentication bypass')
    ).length
    const highRiskIssues = allVulnerabilities.filter(v => 
      v.includes('privilege escalation') || v.includes('XSS')
    ).length
    const mediumRiskIssues = allVulnerabilities.filter(v => 
      v.includes('CSRF') || v.includes('session hijacking')
    ).length
    const lowRiskIssues = allVulnerabilities.length - criticalIssues - highRiskIssues - mediumRiskIssues

    // Generate recommendations
    const recommendations = this.generateRecommendations(this.results)

    const report: SecurityReport = {
      timestamp: new Date().toISOString(),
      totalTests,
      totalPassed,
      totalFailed,
      totalSkipped,
      totalDuration,
      testResults: this.results,
      summary: {
        criticalIssues,
        highRiskIssues,
        mediumRiskIssues,
        lowRiskIssues
      },
      recommendations
    }

    // Save report to file
    const reportPath = path.join(process.cwd(), 'security-test-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    // Generate human-readable report
    this.generateHumanReadableReport(report)

    return report
  }

  private generateRecommendations(results: SecurityTestResult[]): string[] {
    const recommendations: string[] = []
    const allErrors = results.flatMap(r => r.errors)
    const allVulnerabilities = results.flatMap(r => r.vulnerabilities)

    if (allVulnerabilities.some(v => v.includes('SQL injection'))) {
      recommendations.push('Implement parameterized queries and input sanitization')
    }

    if (allVulnerabilities.some(v => v.includes('XSS'))) {
      recommendations.push('Implement proper output encoding and Content Security Policy')
    }

    if (allVulnerabilities.some(v => v.includes('authentication bypass'))) {
      recommendations.push('Review authentication middleware and session management')
    }

    if (allVulnerabilities.some(v => v.includes('privilege escalation'))) {
      recommendations.push('Audit role-based access control implementation')
    }

    if (allErrors.length > 0) {
      recommendations.push('Fix failing security tests to ensure proper protection')
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue regular security testing and monitoring')
    }

    return recommendations
  }

  private generateHumanReadableReport(report: SecurityReport): void {
    const reportPath = path.join(process.cwd(), 'security-test-report.md')
    
    let markdown = `# Security Test Report\n\n`
    markdown += `**Generated:** ${report.timestamp}\n\n`
    
    markdown += `## Summary\n\n`
    markdown += `- **Total Tests:** ${report.totalTests}\n`
    markdown += `- **Passed:** ${report.totalPassed} ✅\n`
    markdown += `- **Failed:** ${report.totalFailed} ❌\n`
    markdown += `- **Skipped:** ${report.totalSkipped} ⏭️\n`
    markdown += `- **Duration:** ${report.totalDuration}ms\n\n`

    markdown += `## Security Issues Summary\n\n`
    markdown += `- **Critical:** ${report.summary.criticalIssues} 🔴\n`
    markdown += `- **High Risk:** ${report.summary.highRiskIssues} 🟠\n`
    markdown += `- **Medium Risk:** ${report.summary.mediumRiskIssues} 🟡\n`
    markdown += `- **Low Risk:** ${report.summary.lowRiskIssues} 🟢\n\n`

    markdown += `## Test Suite Results\n\n`
    for (const result of report.testResults) {
      markdown += `### ${result.testSuite}\n\n`
      markdown += `- **Passed:** ${result.passed}\n`
      markdown += `- **Failed:** ${result.failed}\n`
      markdown += `- **Skipped:** ${result.skipped}\n`
      markdown += `- **Duration:** ${result.duration}ms\n`
      
      if (result.vulnerabilities.length > 0) {
        markdown += `- **Vulnerabilities:**\n`
        for (const vuln of result.vulnerabilities) {
          markdown += `  - ${vuln}\n`
        }
      }
      
      if (result.errors.length > 0) {
        markdown += `- **Errors:**\n`
        for (const error of result.errors) {
          markdown += `  - ${error}\n`
        }
      }
      
      markdown += `\n`
    }

    markdown += `## Recommendations\n\n`
    for (const recommendation of report.recommendations) {
      markdown += `- ${recommendation}\n`
    }

    fs.writeFileSync(reportPath, markdown)
    
    console.log(`\n📄 Reports generated:`)
    console.log(`  - JSON: security-test-report.json`)
    console.log(`  - Markdown: security-test-report.md`)
  }
}

// CLI execution - run directly
const runner = new SecurityTestRunner()

runner.runAllSecurityTests()
  .then(report => {
    console.log('\n🎉 Security testing completed!')
    console.log(`📊 Results: ${report.totalPassed}/${report.totalTests} tests passed`)
    
    if (report.totalFailed > 0) {
      console.log(`⚠️  ${report.totalFailed} tests failed - review security issues`)
      process.exit(1)
    } else {
      console.log('✅ All security tests passed!')
      process.exit(0)
    }
  })
  .catch(error => {
    console.error('❌ Security testing failed:', error)
    process.exit(1)
  })

export { SecurityTestRunner }