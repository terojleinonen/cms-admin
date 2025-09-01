#!/usr/bin/env node

/**
 * Test Automation Script
 * 
 * Comprehensive test automation with quality gates and reporting
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  coverageThreshold: {
    statements: 80,
    branches: 80,
    functions: 80,
    lines: 80,
  },
  testTimeout: 300000, // 5 minutes
  maxRetries: 3,
  reportDir: './test-artifacts',
  coverageDir: './coverage',
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Logger utility
 */
class Logger {
  static info(message) {
    console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
  }

  static success(message) {
    console.log(`${colors.green}✓${colors.reset} ${message}`);
  }

  static warning(message) {
    console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
  }

  static error(message) {
    console.log(`${colors.red}✗${colors.reset} ${message}`);
  }

  static section(title) {
    console.log(`\n${colors.bright}${colors.cyan}=== ${title} ===${colors.reset}\n`);
  }
}

/**
 * Test runner with retry logic
 */
class TestRunner {
  constructor() {
    this.results = {
      unit: null,
      integration: null,
      e2e: null,
      coverage: null,
    };
  }

  async runCommand(command, description, retries = CONFIG.maxRetries) {
    Logger.info(`Running: ${description}`);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const output = execSync(command, {
          encoding: 'utf8',
          timeout: CONFIG.testTimeout,
          stdio: 'pipe',
        });
        
        Logger.success(`${description} completed successfully`);
        return { success: true, output, attempt };
      } catch (error) {
        Logger.warning(`Attempt ${attempt}/${retries} failed: ${error.message}`);
        
        if (attempt === retries) {
          Logger.error(`${description} failed after ${retries} attempts`);
          return { success: false, error: error.message, attempt };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  async runUnitTests() {
    Logger.section('Unit Tests');
    
    const result = await this.runCommand(
      'npm run test -- --testPathPattern="__tests__/(lib|utils|helpers)" --coverage=false --verbose',
      'Unit tests'
    );
    
    this.results.unit = result;
    return result;
  }

  async runIntegrationTests() {
    Logger.section('Integration Tests');
    
    const result = await this.runCommand(
      'npm run test -- --testPathPattern="__tests__/(api|integration)" --coverage=false --verbose',
      'Integration tests'
    );
    
    this.results.integration = result;
    return result;
  }

  async runComponentTests() {
    Logger.section('Component Tests');
    
    const result = await this.runCommand(
      'npm run test -- --testPathPattern="__tests__/components" --coverage=false --verbose',
      'Component tests'
    );
    
    this.results.components = result;
    return result;
  }

  async runE2ETests() {
    Logger.section('End-to-End Tests');
    
    const result = await this.runCommand(
      'npm run test -- --testPathPattern="__tests__/e2e" --coverage=false --verbose',
      'E2E tests'
    );
    
    this.results.e2e = result;
    return result;
  }

  async runCoverageTests() {
    Logger.section('Coverage Analysis');
    
    const result = await this.runCommand(
      'npm run test -- --coverage --coverageReporters=json-summary --coverageReporters=text --watchAll=false',
      'Coverage analysis'
    );
    
    this.results.coverage = result;
    return result;
  }

  async runAllTests() {
    Logger.section('Starting Comprehensive Test Suite');
    
    // Ensure directories exist
    this.ensureDirectories();
    
    // Run test suites
    const unitResult = await this.runUnitTests();
    const integrationResult = await this.runIntegrationTests();
    const componentResult = await this.runComponentTests();
    const e2eResult = await this.runE2ETests();
    const coverageResult = await this.runCoverageTests();
    
    // Generate reports
    await this.generateReports();
    
    // Check quality gates
    const qualityGatesPassed = await this.checkQualityGates();
    
    // Summary
    this.printSummary();
    
    return qualityGatesPassed;
  }

  ensureDirectories() {
    const dirs = [CONFIG.reportDir, CONFIG.coverageDir];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        Logger.info(`Created directory: ${dir}`);
      }
    });
  }

  async generateReports() {
    Logger.section('Generating Reports');
    
    try {
      // Generate test report
      const testReport = {
        timestamp: new Date().toISOString(),
        results: this.results,
        summary: this.generateSummary(),
      };
      
      const reportPath = path.join(CONFIG.reportDir, 'test-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(testReport, null, 2));
      Logger.success(`Test report generated: ${reportPath}`);
      
      // Generate HTML report
      await this.generateHTMLReport(testReport);
      
    } catch (error) {
      Logger.error(`Failed to generate reports: ${error.message}`);
    }
  }

  async generateHTMLReport(testReport) {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report - CMS Admin</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .success { background: #d4edda; border-color: #c3e6cb; }
        .failure { background: #f8d7da; border-color: #f5c6cb; }
        .warning { background: #fff3cd; border-color: #ffeaa7; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #e9ecef; border-radius: 3px; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>CMS Admin Test Report</h1>
        <p>Generated: ${testReport.timestamp}</p>
    </div>
    
    <div class="section">
        <h2>Test Summary</h2>
        <div class="metric">
            <strong>Unit Tests:</strong> ${testReport.results.unit?.success ? 'PASSED' : 'FAILED'}
        </div>
        <div class="metric">
            <strong>Integration Tests:</strong> ${testReport.results.integration?.success ? 'PASSED' : 'FAILED'}
        </div>
        <div class="metric">
            <strong>Component Tests:</strong> ${testReport.results.components?.success ? 'PASSED' : 'FAILED'}
        </div>
        <div class="metric">
            <strong>E2E Tests:</strong> ${testReport.results.e2e?.success ? 'PASSED' : 'FAILED'}
        </div>
    </div>
    
    <div class="section">
        <h2>Coverage Metrics</h2>
        <p>Coverage analysis results will be displayed here when available.</p>
    </div>
    
    <div class="section">
        <h2>Quality Gates</h2>
        <p>Quality gate results will be displayed here.</p>
    </div>
</body>
</html>`;

    const htmlPath = path.join(CONFIG.reportDir, 'test-report.html');
    fs.writeFileSync(htmlPath, htmlContent);
    Logger.success(`HTML report generated: ${htmlPath}`);
  }

  async checkQualityGates() {
    Logger.section('Quality Gates');
    
    let allPassed = true;
    
    // Check test results
    const testSuites = ['unit', 'integration', 'components', 'e2e'];
    
    testSuites.forEach(suite => {
      const result = this.results[suite];
      if (result && !result.success) {
        Logger.error(`Quality gate failed: ${suite} tests`);
        allPassed = false;
      } else if (result && result.success) {
        Logger.success(`Quality gate passed: ${suite} tests`);
      }
    });
    
    // Check coverage thresholds
    const coveragePassed = await this.checkCoverageThresholds();
    if (!coveragePassed) {
      allPassed = false;
    }
    
    if (allPassed) {
      Logger.success('All quality gates passed!');
    } else {
      Logger.error('Some quality gates failed!');
    }
    
    return allPassed;
  }

  async checkCoverageThresholds() {
    try {
      const coveragePath = path.join(CONFIG.coverageDir, 'coverage-summary.json');
      
      if (!fs.existsSync(coveragePath)) {
        Logger.warning('Coverage summary not found, skipping coverage quality gates');
        return true;
      }
      
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      const total = coverage.total;
      
      let coveragePassed = true;
      
      Object.entries(CONFIG.coverageThreshold).forEach(([metric, threshold]) => {
        const actual = total[metric]?.pct || 0;
        
        if (actual >= threshold) {
          Logger.success(`Coverage quality gate passed: ${metric} ${actual}% >= ${threshold}%`);
        } else {
          Logger.error(`Coverage quality gate failed: ${metric} ${actual}% < ${threshold}%`);
          coveragePassed = false;
        }
      });
      
      return coveragePassed;
    } catch (error) {
      Logger.error(`Failed to check coverage thresholds: ${error.message}`);
      return false;
    }
  }

  generateSummary() {
    const summary = {
      totalSuites: 0,
      passedSuites: 0,
      failedSuites: 0,
    };
    
    Object.values(this.results).forEach(result => {
      if (result) {
        summary.totalSuites++;
        if (result.success) {
          summary.passedSuites++;
        } else {
          summary.failedSuites++;
        }
      }
    });
    
    return summary;
  }

  printSummary() {
    Logger.section('Test Execution Summary');
    
    const summary = this.generateSummary();
    
    Logger.info(`Total test suites: ${summary.totalSuites}`);
    Logger.success(`Passed: ${summary.passedSuites}`);
    
    if (summary.failedSuites > 0) {
      Logger.error(`Failed: ${summary.failedSuites}`);
    }
    
    const successRate = summary.totalSuites > 0 
      ? Math.round((summary.passedSuites / summary.totalSuites) * 100)
      : 0;
    
    Logger.info(`Success rate: ${successRate}%`);
    
    if (successRate >= 80) {
      Logger.success('Test execution completed with good success rate');
    } else {
      Logger.warning('Test execution completed with low success rate');
    }
  }
}

/**
 * Security scanner for test files
 */
class SecurityScanner {
  static async scanTestFiles() {
    Logger.section('Security Scan');
    
    const testFiles = this.findTestFiles();
    const issues = [];
    
    for (const file of testFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const fileIssues = this.scanFileContent(content, file);
      issues.push(...fileIssues);
    }
    
    if (issues.length === 0) {
      Logger.success('No security issues found in test files');
    } else {
      Logger.error(`Found ${issues.length} security issues in test files:`);
      issues.forEach(issue => {
        Logger.error(`  ${issue.file}: ${issue.message}`);
      });
    }
    
    return issues.length === 0;
  }

  static findTestFiles() {
    const testDirs = ['__tests__', 'tests'];
    const files = [];
    
    testDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        const dirFiles = this.getFilesRecursively(dir);
        files.push(...dirFiles.filter(f => f.match(/\.(test|spec)\.(js|jsx|ts|tsx)$/)));
      }
    });
    
    return files;
  }

  static getFilesRecursively(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getFilesRecursively(fullPath));
      } else {
        files.push(fullPath);
      }
    });
    
    return files;
  }

  static scanFileContent(content, filePath) {
    const issues = [];
    const lines = content.split('\n');
    
    // Security patterns to check
    const patterns = [
      { regex: /password\s*[:=]\s*['"][^'"]+['"]/i, message: 'Hardcoded password detected' },
      { regex: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i, message: 'Hardcoded API key detected' },
      { regex: /secret\s*[:=]\s*['"][^'"]+['"]/i, message: 'Hardcoded secret detected' },
      { regex: /token\s*[:=]\s*['"][^'"]+['"]/i, message: 'Hardcoded token detected' },
      { regex: /localhost:\d+/g, message: 'Hardcoded localhost URL (consider using environment variables)' },
      { regex: /console\.log\(/g, message: 'Console.log statement (should be removed in production tests)' },
    ];
    
    lines.forEach((line, index) => {
      patterns.forEach(pattern => {
        if (pattern.regex.test(line)) {
          // Skip if it's in a comment or test factory
          if (!line.trim().startsWith('//') && !line.includes('createTest') && !line.includes('faker')) {
            issues.push({
              file: filePath,
              line: index + 1,
              message: `${pattern.message} at line ${index + 1}`,
            });
          }
        }
      });
    });
    
    return issues;
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';
  
  const runner = new TestRunner();
  
  try {
    switch (command) {
      case 'unit':
        await runner.runUnitTests();
        break;
      case 'integration':
        await runner.runIntegrationTests();
        break;
      case 'components':
        await runner.runComponentTests();
        break;
      case 'e2e':
        await runner.runE2ETests();
        break;
      case 'coverage':
        await runner.runCoverageTests();
        break;
      case 'security':
        await SecurityScanner.scanTestFiles();
        break;
      case 'all':
      default:
        // Run security scan first
        const securityPassed = await SecurityScanner.scanTestFiles();
        if (!securityPassed) {
          Logger.error('Security scan failed, aborting test execution');
          process.exit(1);
        }
        
        // Run all tests
        const allPassed = await runner.runAllTests();
        process.exit(allPassed ? 0 : 1);
    }
  } catch (error) {
    Logger.error(`Test automation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { TestRunner, SecurityScanner, Logger };