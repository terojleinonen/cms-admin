#!/usr/bin/env node

/**
 * Security Testing CI/CD Integration
 * Integrates security tests into continuous integration pipeline
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

class SecurityCIIntegration {
  constructor() {
    this.config = {
      failOnCritical: true,
      failOnHigh: true,
      failOnMedium: false,
      maxFailedTests: 0,
      reportFormats: ['json', 'junit', 'markdown'],
      slackWebhook: process.env.SLACK_SECURITY_WEBHOOK,
      emailNotifications: process.env.SECURITY_EMAIL_NOTIFICATIONS
    }
  }

  async runSecurityPipeline() {
    console.log('🔒 Starting Security CI/CD Pipeline...\n')

    try {
      // Step 1: Run security tests
      console.log('📋 Step 1: Running security tests...')
      const testResults = await this.runSecurityTests()

      // Step 2: Generate reports
      console.log('📄 Step 2: Generating reports...')
      await this.generateReports(testResults)

      // Step 3: Analyze results
      console.log('🔍 Step 3: Analyzing results...')
      const analysis = this.analyzeResults(testResults)

      // Step 4: Send notifications
      console.log('📢 Step 4: Sending notifications...')
      await this.sendNotifications(analysis)

      // Step 5: Determine pipeline status
      console.log('✅ Step 5: Determining pipeline status...')
      const shouldFail = this.shouldFailPipeline(analysis)

      if (shouldFail) {
        console.log('❌ Security pipeline failed - critical issues found')
        process.exit(1)
      } else {
        console.log('✅ Security pipeline passed')
        process.exit(0)
      }

    } catch (error) {
      console.error('❌ Security pipeline error:', error)
      await this.sendErrorNotification(error)
      process.exit(1)
    }
  }

  async runSecurityTests() {
    const testCommand = 'npm run test:security'
    
    try {
      // Run security test suite
      const output = execSync(testCommand, { 
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 300000 // 5 minutes timeout
      })

      return this.parseTestOutput(output)
    } catch (error) {
      // Handle test failures
      if (error.stdout) {
        return this.parseTestOutput(error.stdout)
      }
      throw new Error(`Security tests failed to run: ${error.message}`)
    }
  }

  parseTestOutput(output) {
    // Parse Jest/test output to extract results
    const lines = output.split('\n')
    const results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      testSuites: [],
      vulnerabilities: [],
      errors: []
    }

    let currentSuite = null

    for (const line of lines) {
      // Parse test suite information
      if (line.includes('PASS') || line.includes('FAIL')) {
        if (currentSuite) {
          results.testSuites.push(currentSuite)
        }
        
        currentSuite = {
          name: line.split(' ').pop(),
          status: line.includes('PASS') ? 'PASS' : 'FAIL',
          tests: []
        }
      }

      // Parse individual test results
      if (line.includes('✓') || line.includes('✗')) {
        const testName = line.replace(/[✓✗]/g, '').trim()
        const status = line.includes('✓') ? 'PASS' : 'FAIL'
        
        if (currentSuite) {
          currentSuite.tests.push({ name: testName, status })
        }

        if (status === 'PASS') {
          results.passedTests++
        } else {
          results.failedTests++
        }
        results.totalTests++
      }

      // Parse security-specific information
      if (line.toLowerCase().includes('vulnerability') || 
          line.toLowerCase().includes('security issue')) {
        results.vulnerabilities.push(line.trim())
      }

      if (line.toLowerCase().includes('error') && 
          !line.toLowerCase().includes('no errors')) {
        results.errors.push(line.trim())
      }
    }

    if (currentSuite) {
      results.testSuites.push(currentSuite)
    }

    return results
  }

  async generateReports(testResults) {
    const timestamp = new Date().toISOString()
    const reportsDir = path.join(process.cwd(), 'security-reports')

    // Ensure reports directory exists
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true })
    }

    // Generate JSON report
    if (this.config.reportFormats.includes('json')) {
      const jsonReport = {
        timestamp,
        results: testResults,
        metadata: {
          branch: process.env.GITHUB_REF || process.env.CI_COMMIT_REF_NAME || 'unknown',
          commit: process.env.GITHUB_SHA || process.env.CI_COMMIT_SHA || 'unknown',
          buildNumber: process.env.GITHUB_RUN_NUMBER || process.env.CI_PIPELINE_ID || 'unknown'
        }
      }

      fs.writeFileSync(
        path.join(reportsDir, 'security-report.json'),
        JSON.stringify(jsonReport, null, 2)
      )
    }

    // Generate JUnit XML report
    if (this.config.reportFormats.includes('junit')) {
      const junitXml = this.generateJUnitXML(testResults)
      fs.writeFileSync(path.join(reportsDir, 'security-junit.xml'), junitXml)
    }

    // Generate Markdown report
    if (this.config.reportFormats.includes('markdown')) {
      const markdownReport = this.generateMarkdownReport(testResults)
      fs.writeFileSync(path.join(reportsDir, 'security-report.md'), markdownReport)
    }
  }

  generateJUnitXML(testResults) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += `<testsuites tests="${testResults.totalTests}" failures="${testResults.failedTests}" time="0">\n`

    for (const suite of testResults.testSuites) {
      xml += `  <testsuite name="${suite.name}" tests="${suite.tests.length}">\n`
      
      for (const test of suite.tests) {
        xml += `    <testcase name="${test.name}" classname="${suite.name}">\n`
        
        if (test.status === 'FAIL') {
          xml += `      <failure message="Security test failed">Test failed</failure>\n`
        }
        
        xml += `    </testcase>\n`
      }
      
      xml += `  </testsuite>\n`
    }

    xml += '</testsuites>\n'
    return xml
  }

  generateMarkdownReport(testResults) {
    let markdown = '# Security Test Report\n\n'
    markdown += `**Generated:** ${new Date().toISOString()}\n\n`
    
    markdown += '## Summary\n\n'
    markdown += `- Total Tests: ${testResults.totalTests}\n`
    markdown += `- Passed: ${testResults.passedTests} ✅\n`
    markdown += `- Failed: ${testResults.failedTests} ❌\n`
    markdown += `- Skipped: ${testResults.skippedTests} ⏭️\n\n`

    if (testResults.vulnerabilities.length > 0) {
      markdown += '## Vulnerabilities Found\n\n'
      for (const vuln of testResults.vulnerabilities) {
        markdown += `- ${vuln}\n`
      }
      markdown += '\n'
    }

    if (testResults.errors.length > 0) {
      markdown += '## Errors\n\n'
      for (const error of testResults.errors) {
        markdown += `- ${error}\n`
      }
      markdown += '\n'
    }

    markdown += '## Test Suites\n\n'
    for (const suite of testResults.testSuites) {
      markdown += `### ${suite.name} (${suite.status})\n\n`
      
      for (const test of suite.tests) {
        const icon = test.status === 'PASS' ? '✅' : '❌'
        markdown += `- ${icon} ${test.name}\n`
      }
      
      markdown += '\n'
    }

    return markdown
  }

  analyzeResults(testResults) {
    const analysis = {
      criticalIssues: 0,
      highRiskIssues: 0,
      mediumRiskIssues: 0,
      lowRiskIssues: 0,
      failedTests: testResults.failedTests,
      totalTests: testResults.totalTests,
      passRate: (testResults.passedTests / testResults.totalTests) * 100,
      recommendations: []
    }

    // Analyze vulnerabilities by severity
    for (const vuln of testResults.vulnerabilities) {
      const lowerVuln = vuln.toLowerCase()
      
      if (lowerVuln.includes('sql injection') || 
          lowerVuln.includes('authentication bypass') ||
          lowerVuln.includes('remote code execution')) {
        analysis.criticalIssues++
      } else if (lowerVuln.includes('privilege escalation') || 
                 lowerVuln.includes('xss') ||
                 lowerVuln.includes('csrf')) {
        analysis.highRiskIssues++
      } else if (lowerVuln.includes('session') || 
                 lowerVuln.includes('rate limit')) {
        analysis.mediumRiskIssues++
      } else {
        analysis.lowRiskIssues++
      }
    }

    // Generate recommendations
    if (analysis.criticalIssues > 0) {
      analysis.recommendations.push('URGENT: Fix critical security vulnerabilities immediately')
    }
    
    if (analysis.highRiskIssues > 0) {
      analysis.recommendations.push('HIGH PRIORITY: Address high-risk security issues')
    }
    
    if (analysis.failedTests > 0) {
      analysis.recommendations.push('Fix failing security tests to ensure proper protection')
    }
    
    if (analysis.passRate < 95) {
      analysis.recommendations.push('Improve security test coverage and reliability')
    }

    return analysis
  }

  shouldFailPipeline(analysis) {
    if (this.config.failOnCritical && analysis.criticalIssues > 0) {
      return true
    }
    
    if (this.config.failOnHigh && analysis.highRiskIssues > 0) {
      return true
    }
    
    if (this.config.failOnMedium && analysis.mediumRiskIssues > 0) {
      return true
    }
    
    if (analysis.failedTests > this.config.maxFailedTests) {
      return true
    }

    return false
  }

  async sendNotifications(analysis) {
    const message = this.formatNotificationMessage(analysis)

    // Send Slack notification
    if (this.config.slackWebhook) {
      try {
        await this.sendSlackNotification(message, analysis)
      } catch (error) {
        console.warn('Failed to send Slack notification:', error.message)
      }
    }

    // Send email notification
    if (this.config.emailNotifications) {
      try {
        await this.sendEmailNotification(message, analysis)
      } catch (error) {
        console.warn('Failed to send email notification:', error.message)
      }
    }
  }

  formatNotificationMessage(analysis) {
    const status = this.shouldFailPipeline(analysis) ? '❌ FAILED' : '✅ PASSED'
    const branch = process.env.GITHUB_REF || process.env.CI_COMMIT_REF_NAME || 'unknown'
    
    let message = `Security Pipeline ${status}\n\n`
    message += `Branch: ${branch}\n`
    message += `Tests: ${analysis.totalTests} (${analysis.failedTests} failed)\n`
    message += `Pass Rate: ${analysis.passRate.toFixed(1)}%\n\n`
    
    if (analysis.criticalIssues > 0) {
      message += `🔴 Critical Issues: ${analysis.criticalIssues}\n`
    }
    
    if (analysis.highRiskIssues > 0) {
      message += `🟠 High Risk Issues: ${analysis.highRiskIssues}\n`
    }
    
    if (analysis.mediumRiskIssues > 0) {
      message += `🟡 Medium Risk Issues: ${analysis.mediumRiskIssues}\n`
    }

    if (analysis.recommendations.length > 0) {
      message += '\nRecommendations:\n'
      for (const rec of analysis.recommendations) {
        message += `- ${rec}\n`
      }
    }

    return message
  }

  async sendSlackNotification(message, analysis) {
    const webhook = this.config.slackWebhook
    const color = this.shouldFailPipeline(analysis) ? 'danger' : 'good'

    const payload = {
      text: 'Security Test Results',
      attachments: [{
        color,
        text: message,
        footer: 'Security CI/CD Pipeline',
        ts: Math.floor(Date.now() / 1000)
      }]
    }

    // In a real implementation, you would use fetch or axios to send to Slack
    console.log('Slack notification payload:', JSON.stringify(payload, null, 2))
  }

  async sendEmailNotification(message, analysis) {
    // In a real implementation, you would use nodemailer or similar
    console.log('Email notification:', message)
  }

  async sendErrorNotification(error) {
    const message = `Security Pipeline Error: ${error.message}`
    
    if (this.config.slackWebhook) {
      const payload = {
        text: 'Security Pipeline Error',
        attachments: [{
          color: 'danger',
          text: message,
          footer: 'Security CI/CD Pipeline',
          ts: Math.floor(Date.now() / 1000)
        }]
      }
      
      console.log('Error notification payload:', JSON.stringify(payload, null, 2))
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const integration = new SecurityCIIntegration()
  integration.runSecurityPipeline()
}

export { SecurityCIIntegration }