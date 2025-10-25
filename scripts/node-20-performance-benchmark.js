#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Node.js 20+ Performance Benchmark Script
 * Establishes performance baseline after Node.js upgrade
 */

async function runNode20PerformanceBenchmark() {
  console.log('🚀 Starting Node.js 20+ Performance Benchmark...\n');
  
  const startTime = Date.now();
  const nodeVersion = process.version;
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  
  console.log(`📊 Environment Information:`);
  console.log(`   Node.js Version: ${nodeVersion}`);
  console.log(`   npm Version: ${npmVersion}`);
  console.log(`   Platform: ${process.platform}`);
  console.log(`   Architecture: ${process.arch}`);
  console.log(`   Memory: ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB heap total\n`);

  // Performance metrics collection
  const performanceMetrics = {
    timestamp: new Date().toISOString(),
    nodeVersion,
    npmVersion,
    platform: process.platform,
    architecture: process.arch,
    testResults: {},
    summary: {},
    baseline: true // Mark this as a baseline measurement
  };

  try {
    // 1. Run permission system performance tests
    console.log('🔐 Running Permission System Performance Tests...');
    const permissionTestStart = performance.now();
    
    try {
      const permissionOutput = execSync(
        'npm run test -- --testPathPattern=permission-system-performance.test.ts --verbose --silent',
        { encoding: 'utf8', timeout: 120000 }
      );
      
      const permissionTestEnd = performance.now();
      const permissionDuration = permissionTestEnd - permissionTestStart;
      
      performanceMetrics.testResults.permissionSystem = {
        duration: permissionDuration,
        status: 'passed',
        avgResponseTime: extractMetric(permissionOutput, /response time.*?(\d+(?:\.\d+)?)ms/i),
        throughput: extractMetric(permissionOutput, /(\d+(?:\.\d+)?)\s*(?:ops?\/sec|rps)/i),
        cacheHitRate: extractMetric(permissionOutput, /cache hit rate.*?(\d+(?:\.\d+)?)%/i)
      };
      
      console.log(`   ✅ Permission tests completed in ${permissionDuration.toFixed(2)}ms`);
    } catch (error) {
      console.log(`   ⚠️ Permission tests had issues: ${error.message}`);
      performanceMetrics.testResults.permissionSystem = {
        duration: 0,
        status: 'failed',
        error: error.message
      };
    }

    // 2. Run cache performance tests
    console.log('💾 Running Cache Performance Tests...');
    const cacheTestStart = performance.now();
    
    try {
      const cacheOutput = execSync(
        'npm run test -- --testPathPattern=cache-performance.test.ts --verbose --silent',
        { encoding: 'utf8', timeout: 120000 }
      );
      
      const cacheTestEnd = performance.now();
      const cacheDuration = cacheTestEnd - cacheTestStart;
      
      performanceMetrics.testResults.cacheSystem = {
        duration: cacheDuration,
        status: 'passed',
        avgResponseTime: extractMetric(cacheOutput, /response time.*?(\d+(?:\.\d+)?)ms/i),
        hitRate: extractMetric(cacheOutput, /hit rate.*?(\d+(?:\.\d+)?)%/i),
        throughput: extractMetric(cacheOutput, /(\d+(?:\.\d+)?)\s*(?:ops?\/sec|rps)/i)
      };
      
      console.log(`   ✅ Cache tests completed in ${cacheDuration.toFixed(2)}ms`);
    } catch (error) {
      console.log(`   ⚠️ Cache tests had issues: ${error.message}`);
      performanceMetrics.testResults.cacheSystem = {
        duration: 0,
        status: 'failed',
        error: error.message
      };
    }

    // 3. Run concurrent user performance tests
    console.log('👥 Running Concurrent User Performance Tests...');
    const concurrentTestStart = performance.now();
    
    try {
      const concurrentOutput = execSync(
        'npm run test -- --testPathPattern=concurrent-user-performance.test.ts --verbose --silent',
        { encoding: 'utf8', timeout: 180000 }
      );
      
      const concurrentTestEnd = performance.now();
      const concurrentDuration = concurrentTestEnd - concurrentTestStart;
      
      performanceMetrics.testResults.concurrentUsers = {
        duration: concurrentDuration,
        status: 'passed',
        avgResponseTime: extractMetric(concurrentOutput, /response time.*?(\d+(?:\.\d+)?)ms/i),
        throughput: extractMetric(concurrentOutput, /(\d+(?:\.\d+)?)\s*(?:ops?\/sec|rps)/i),
        errorRate: extractMetric(concurrentOutput, /error rate.*?(\d+(?:\.\d+)?)%/i)
      };
      
      console.log(`   ✅ Concurrent user tests completed in ${concurrentDuration.toFixed(2)}ms`);
    } catch (error) {
      console.log(`   ⚠️ Concurrent user tests had issues: ${error.message}`);
      performanceMetrics.testResults.concurrentUsers = {
        duration: 0,
        status: 'failed',
        error: error.message
      };
    }

    // 4. Run load testing
    console.log('🚀 Running Load Testing...');
    const loadTestStart = performance.now();
    
    try {
      const loadOutput = execSync(
        'npm run test -- --testPathPattern=load-testing.test.ts --verbose --silent',
        { encoding: 'utf8', timeout: 300000 }
      );
      
      const loadTestEnd = performance.now();
      const loadDuration = loadTestEnd - loadTestStart;
      
      performanceMetrics.testResults.loadTesting = {
        duration: loadDuration,
        status: 'passed',
        avgResponseTime: extractMetric(loadOutput, /Avg response time: (\d+(?:\.\d+)?)ms/i),
        actualRps: extractMetric(loadOutput, /Actual RPS: (\d+(?:\.\d+)?)/i),
        errorRate: extractMetric(loadOutput, /error rate.*?(\d+(?:\.\d+)?)%/i)
      };
      
      console.log(`   ✅ Load tests completed in ${loadDuration.toFixed(2)}ms`);
    } catch (error) {
      console.log(`   ⚠️ Load tests had issues: ${error.message}`);
      performanceMetrics.testResults.loadTesting = {
        duration: 0,
        status: 'failed',
        error: error.message
      };
    }

    // 5. Application startup performance
    console.log('⚡ Testing Application Startup Performance...');
    const startupTestStart = performance.now();
    
    try {
      // Test build performance
      const buildOutput = execSync('npm run build', { 
        encoding: 'utf8', 
        timeout: 300000,
        stdio: 'pipe'
      });
      
      const startupTestEnd = performance.now();
      const buildDuration = startupTestEnd - startupTestStart;
      
      performanceMetrics.testResults.applicationStartup = {
        buildDuration: buildDuration,
        status: 'passed',
        buildSize: extractBuildSize(buildOutput)
      };
      
      console.log(`   ✅ Build completed in ${buildDuration.toFixed(2)}ms`);
    } catch (error) {
      console.log(`   ⚠️ Build test had issues: ${error.message}`);
      performanceMetrics.testResults.applicationStartup = {
        buildDuration: 0,
        status: 'failed',
        error: error.message
      };
    }

    // 6. Memory usage analysis
    console.log('💾 Analyzing Memory Usage...');
    const memoryUsage = process.memoryUsage();
    
    performanceMetrics.testResults.memoryUsage = {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
      heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024)
    };
    
    console.log(`   📊 Heap Used: ${performanceMetrics.testResults.memoryUsage.heapUsedMB}MB`);
    console.log(`   📊 Heap Total: ${performanceMetrics.testResults.memoryUsage.heapTotalMB}MB`);

    // Calculate summary metrics
    const testResults = performanceMetrics.testResults;
    const passedTests = Object.values(testResults).filter(test => test.status === 'passed').length;
    const totalTests = Object.keys(testResults).length;
    
    performanceMetrics.summary = {
      totalDuration: Date.now() - startTime,
      testsRun: totalTests,
      testsPassed: passedTests,
      testsFailed: totalTests - passedTests,
      successRate: (passedTests / totalTests) * 100,
      avgPermissionResponseTime: testResults.permissionSystem?.avgResponseTime || 0,
      avgCacheResponseTime: testResults.cacheSystem?.avgResponseTime || 0,
      maxThroughput: Math.max(
        testResults.permissionSystem?.throughput || 0,
        testResults.cacheSystem?.throughput || 0,
        testResults.concurrentUsers?.throughput || 0,
        testResults.loadTesting?.actualRps || 0
      ),
      memoryEfficiency: performanceMetrics.testResults.memoryUsage.heapUsedMB,
      buildPerformance: testResults.applicationStartup?.buildDuration || 0
    };

    // Save baseline report
    const reportsDir = 'performance-baselines';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baselineFile = path.join(reportsDir, `baseline-node-${nodeVersion}-${timestamp}.json`);
    
    fs.writeFileSync(baselineFile, JSON.stringify(performanceMetrics, null, 2));
    
    // Also save as current results for comparison
    fs.writeFileSync('performance-results.json', JSON.stringify(performanceMetrics, null, 2));

    // Generate HTML report
    const htmlReport = generateHtmlReport(performanceMetrics);
    fs.writeFileSync('node-20-performance-report.html', htmlReport);

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📈 NODE.JS 20+ PERFORMANCE BASELINE ESTABLISHED');
    console.log('='.repeat(80));
    console.log(`🕐 Total Duration: ${performanceMetrics.summary.totalDuration}ms`);
    console.log(`📊 Tests: ${performanceMetrics.summary.testsRun} total, ${performanceMetrics.summary.testsPassed} passed, ${performanceMetrics.summary.testsFailed} failed`);
    console.log(`✅ Success Rate: ${performanceMetrics.summary.successRate.toFixed(1)}%`);
    
    if (performanceMetrics.summary.avgPermissionResponseTime > 0) {
      console.log(`⚡ Avg Permission Response Time: ${performanceMetrics.summary.avgPermissionResponseTime.toFixed(2)}ms`);
    }
    
    if (performanceMetrics.summary.avgCacheResponseTime > 0) {
      console.log(`💾 Avg Cache Response Time: ${performanceMetrics.summary.avgCacheResponseTime.toFixed(2)}ms`);
    }
    
    if (performanceMetrics.summary.maxThroughput > 0) {
      console.log(`🚀 Max Throughput: ${performanceMetrics.summary.maxThroughput.toFixed(2)} ops/sec`);
    }
    
    console.log(`💾 Memory Usage: ${performanceMetrics.summary.memoryEfficiency}MB`);
    
    if (performanceMetrics.summary.buildPerformance > 0) {
      console.log(`⚡ Build Time: ${(performanceMetrics.summary.buildPerformance / 1000).toFixed(2)}s`);
    }

    console.log(`\n📄 Baseline saved to: ${baselineFile}`);
    console.log(`📄 HTML report saved to: node-20-performance-report.html`);
    console.log('='.repeat(80) + '\n');

    return performanceMetrics;

  } catch (error) {
    console.error('❌ Performance benchmark failed:', error);
    process.exit(1);
  }
}

function extractMetric(output, regex) {
  const match = output.match(regex);
  return match ? parseFloat(match[1]) : 0;
}

function extractBuildSize(buildOutput) {
  // Try to extract build size information from Next.js build output
  const sizeMatch = buildOutput.match(/Total size:\s*(\d+(?:\.\d+)?)\s*(\w+)/i);
  if (sizeMatch) {
    const size = parseFloat(sizeMatch[1]);
    const unit = sizeMatch[2].toLowerCase();
    
    // Convert to bytes
    switch (unit) {
      case 'kb': return size * 1024;
      case 'mb': return size * 1024 * 1024;
      case 'gb': return size * 1024 * 1024 * 1024;
      default: return size;
    }
  }
  return 0;
}

function generateHtmlReport(metrics) {
  const testResults = Object.entries(metrics.testResults)
    .map(([name, result]) => {
      const status = result.status === 'passed' ? '✅' : '❌';
      const duration = result.duration ? `${result.duration.toFixed(2)}ms` : 'N/A';
      return `
        <tr>
          <td>${status} ${name}</td>
          <td>${duration}</td>
          <td>${result.avgResponseTime ? result.avgResponseTime.toFixed(2) + 'ms' : 'N/A'}</td>
          <td>${result.throughput ? result.throughput.toFixed(2) + ' ops/sec' : 'N/A'}</td>
        </tr>
      `;
    }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
    <title>Node.js ${metrics.nodeVersion} Performance Baseline Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .error { color: #dc3545; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .metric-card { 
          display: inline-block; 
          background: #f8f9fa; 
          padding: 15px; 
          margin: 10px; 
          border-radius: 5px; 
          min-width: 200px;
        }
        .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .metric-label { font-size: 14px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Node.js ${metrics.nodeVersion} Performance Baseline Report</h1>
        <p><strong>Generated:</strong> ${metrics.timestamp}</p>
        <p><strong>Platform:</strong> ${metrics.platform} (${metrics.architecture})</p>
        <p><strong>npm Version:</strong> ${metrics.npmVersion}</p>
        <p><strong>Success Rate:</strong> <span class="success">${metrics.summary.successRate.toFixed(1)}%</span></p>
    </div>
    
    <h2>📊 Performance Summary</h2>
    <div style="display: flex; flex-wrap: wrap;">
        <div class="metric-card">
            <div class="metric-value">${metrics.summary.testsRun}</div>
            <div class="metric-label">Total Tests</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${metrics.summary.testsPassed}</div>
            <div class="metric-label">Tests Passed</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${(metrics.summary.totalDuration / 1000).toFixed(1)}s</div>
            <div class="metric-label">Total Duration</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${metrics.summary.memoryEfficiency}MB</div>
            <div class="metric-label">Memory Usage</div>
        </div>
        ${metrics.summary.maxThroughput > 0 ? `
        <div class="metric-card">
            <div class="metric-value">${metrics.summary.maxThroughput.toFixed(0)}</div>
            <div class="metric-label">Max Throughput (ops/sec)</div>
        </div>
        ` : ''}
    </div>
    
    <h2>🧪 Test Results</h2>
    <table>
        <thead>
            <tr>
                <th>Test Suite</th>
                <th>Duration</th>
                <th>Avg Response Time</th>
                <th>Throughput</th>
            </tr>
        </thead>
        <tbody>
            ${testResults}
        </tbody>
    </table>
    
    <h2>💾 Memory Analysis</h2>
    <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Heap Used</td><td>${metrics.testResults.memoryUsage?.heapUsedMB || 0}MB</td></tr>
        <tr><td>Heap Total</td><td>${metrics.testResults.memoryUsage?.heapTotalMB || 0}MB</td></tr>
        <tr><td>RSS</td><td>${Math.round((metrics.testResults.memoryUsage?.rss || 0) / 1024 / 1024)}MB</td></tr>
        <tr><td>External</td><td>${Math.round((metrics.testResults.memoryUsage?.external || 0) / 1024 / 1024)}MB</td></tr>
    </table>
    
    <h2>🎯 Performance Thresholds</h2>
    <p>This baseline establishes the following performance expectations for Node.js ${metrics.nodeVersion}:</p>
    <ul>
        <li><strong>Permission Checks:</strong> Target &lt; 50ms average response time</li>
        <li><strong>Cache Operations:</strong> Target &lt; 10ms average response time</li>
        <li><strong>Concurrent Operations:</strong> Target &gt; 100 ops/sec throughput</li>
        <li><strong>Memory Usage:</strong> Target &lt; 100MB for typical operations</li>
        <li><strong>Error Rate:</strong> Target &lt; 1% for all operations</li>
    </ul>
    
    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #6c757d;">
        <p>Generated by Node.js ${metrics.nodeVersion} Performance Benchmark Tool</p>
        <p>This report serves as a baseline for future performance comparisons.</p>
    </footer>
</body>
</html>
  `;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runNode20PerformanceBenchmark()
    .then(() => {
      console.log('✅ Performance benchmark completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Performance benchmark failed:', error);
      process.exit(1);
    });
}

export { runNode20PerformanceBenchmark };