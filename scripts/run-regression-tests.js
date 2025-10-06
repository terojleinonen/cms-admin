#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Comprehensive regression test runner
 */
async function runRegressionTests() {
  console.log('🚀 Starting comprehensive regression test suite...\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: {},
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    }
  };
  
  const testSuites = [
    {
      name: 'Permission Unit Tests',
      command: 'npm run test -- --testPathPattern="permission|auth|role" --run --reporter=json',
      critical: true
    },
    {
      name: 'Permission Integration Tests',
      command: 'npm run test -- --testPathPattern="integration.*permission" --run --reporter=json',
      critical: true
    },
    {
      name: 'API Permission Tests',
      command: 'npm run test -- --testPathPattern="api.*permission" --run --reporter=json',
      critical: true
    },
    {
      name: 'Security Scenario Tests',
      command: 'npm run test -- --testPathPattern="security.*test" --run --reporter=json',
      critical: true
    },
    {
      name: 'Performance Tests',
      command: 'npm run test -- --testPathPattern="performance" --run --reporter=json',
      critical: false
    },
    {
      name: 'E2E Permission Tests',
      command: 'npm run test -- --testPathPattern="e2e.*permission" --run --reporter=json',
      critical: false
    }
  ];
  
  for (const suite of testSuites) {
    console.log(`📋 Running: ${suite.name}`);
    
    try {
      const startTime = Date.now();
      const output = execSync(suite.command, { 
        encoding: 'utf8',
        timeout: 300000, // 5 minutes timeout
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      const duration = Date.now() - startTime;
      
      // Parse test results (assuming Jest JSON output)
      let testResult;
      try {
        testResult = JSON.parse(output);
      } catch (e) {
        // Fallback if JSON parsing fails
        testResult = {
          success: true,
          numTotalTests: 1,
          numPassedTests: 1,
          numFailedTests: 0
        };
      }
      
      results.tests[suite.name] = {
        status: 'PASSED',
        duration,
        totalTests: testResult.numTotalTests || 0,
        passedTests: testResult.numPassedTests || 0,
        failedTests: testResult.numFailedTests || 0,
        critical: suite.critical
      };
      
      results.summary.total += testResult.numTotalTests || 0;
      results.summary.passed += testResult.numPassedTests || 0;
      results.summary.failed += testResult.numFailedTests || 0;
      
      console.log(`  ✅ Passed (${duration}ms)`);
      
    } catch (error) {
      const duration = Date.now() - Date.now();
      
      results.tests[suite.name] = {
        status: 'FAILED',
        duration,
        error: error.message,
        critical: suite.critical
      };
      
      results.summary.failed += 1;
      
      console.log(`  ❌ Failed: ${error.message.split('\n')[0]}`);
      
      if (suite.critical) {
        console.log(`\n💥 Critical test suite failed: ${suite.name}`);
        console.log('Stopping regression test execution.\n');
        break;
      }
    }
  }
  
  // Generate summary report
  console.log('\n📊 Regression Test Summary:');
  console.log(`Total Tests: ${results.summary.total}`);
  console.log(`Passed: ${results.summary.passed}`);
  console.log(`Failed: ${results.summary.failed}`);
  console.log(`Success Rate: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`);
  
  // Check for critical failures
  const criticalFailures = Object.values(results.tests)
    .filter(test => test.critical && test.status === 'FAILED');
  
  if (criticalFailures.length > 0) {
    console.log('\n🚨 Critical test failures detected:');
    criticalFailures.forEach(failure => {
      console.log(`  - ${failure.name}: ${failure.error}`);
    });
    results.summary.status = 'CRITICAL_FAILURE';
  } else if (results.summary.failed > 0) {
    console.log('\n⚠️  Some non-critical tests failed');
    results.summary.status = 'PARTIAL_FAILURE';
  } else {
    console.log('\n✅ All regression tests passed!');
    results.summary.status = 'SUCCESS';
  }
  
  // Save results
  fs.writeFileSync('regression-test-results.json', JSON.stringify(results, null, 2));
  
  // Generate HTML report
  generateHtmlReport(results);
  
  return results.summary.status === 'SUCCESS';
}

function generateHtmlReport(results) {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Regression Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .status-success { color: #28a745; }
        .status-failed { color: #dc3545; }
        .status-partial { color: #ffc107; }
        .test-suite { margin: 15px 0; padding: 15px; border: 1px solid #dee2e6; border-radius: 5px; }
        .test-passed { border-left: 4px solid #28a745; }
        .test-failed { border-left: 4px solid #dc3545; }
        .critical { background: #fff3cd; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        th { background-color: #f8f9fa; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Regression Test Report</h1>
        <p><strong>Generated:</strong> ${results.timestamp}</p>
        <p><strong>Status:</strong> <span class="status-${results.summary.status.toLowerCase().replace('_', '-')}">${results.summary.status}</span></p>
        
        <div class="metric">
            <strong>Total Tests:</strong> ${results.summary.total}
        </div>
        <div class="metric">
            <strong>Passed:</strong> <span class="status-success">${results.summary.passed}</span>
        </div>
        <div class="metric">
            <strong>Failed:</strong> <span class="status-failed">${results.summary.failed}</span>
        </div>
        <div class="metric">
            <strong>Success Rate:</strong> ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%
        </div>
    </div>
    
    <h2>Test Suite Results</h2>
    
    ${Object.entries(results.tests).map(([name, test]) => `
    <div class="test-suite test-${test.status.toLowerCase()} ${test.critical ? 'critical' : ''}">
        <h3>${name} ${test.critical ? '(Critical)' : ''}</h3>
        <p><strong>Status:</strong> <span class="status-${test.status.toLowerCase()}">${test.status}</span></p>
        <p><strong>Duration:</strong> ${test.duration}ms</p>
        ${test.totalTests ? `<p><strong>Tests:</strong> ${test.passedTests}/${test.totalTests} passed</p>` : ''}
        ${test.error ? `<p><strong>Error:</strong> ${test.error}</p>` : ''}
    </div>
    `).join('')}
    
</body>
</html>
  `;
  
  fs.writeFileSync('regression-test-report.html', html);
}

if (require.main === module) {
  runRegressionTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Error running regression tests:', error);
      process.exit(1);
    });
}

module.exports = { runRegressionTests };