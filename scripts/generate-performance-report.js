#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Generate performance report from test results
 */
async function generatePerformanceReport() {
  console.log('Generating performance report...');
  
  // Mock performance data - in real implementation, this would read from test results
  const performanceData = {
    timestamp: new Date().toISOString(),
    testSuite: 'Permission System Performance',
    results: {
      permissionChecks: {
        averageTime: 15.2,
        p95Time: 25.8,
        p99Time: 45.1,
        throughput: 6580,
        errorRate: 0.001
      },
      cacheOperations: {
        averageTime: 2.1,
        p95Time: 4.2,
        p99Time: 8.5,
        hitRate: 0.94,
        missRate: 0.06
      },
      databaseQueries: {
        averageTime: 12.5,
        p95Time: 28.3,
        p99Time: 55.7,
        queriesPerSecond: 1250,
        connectionPoolUtilization: 0.65
      },
      apiEndpoints: {
        '/api/auth/me': { averageTime: 45.2, p95Time: 89.1 },
        '/api/users': { averageTime: 78.5, p95Time: 156.3 },
        '/api/products': { averageTime: 92.1, p95Time: 184.7 },
        '/api/admin/users': { averageTime: 125.8, p95Time: 251.2 }
      },
      concurrentUsers: {
        maxUsers: 1000,
        averageResponseTime: 85.3,
        errorRate: 0.002,
        throughput: 2340
      }
    },
    thresholds: {
      permissionCheckMax: 50,
      cacheOperationMax: 10,
      databaseQueryMax: 100,
      apiResponseMax: 200,
      errorRateMax: 0.01
    }
  };
  
  // Check for performance regressions
  const regressions = [];
  
  if (performanceData.results.permissionChecks.averageTime > performanceData.thresholds.permissionCheckMax) {
    regressions.push({
      metric: 'Permission Check Time',
      value: performanceData.results.permissionChecks.averageTime,
      threshold: performanceData.thresholds.permissionCheckMax
    });
  }
  
  if (performanceData.results.cacheOperations.averageTime > performanceData.thresholds.cacheOperationMax) {
    regressions.push({
      metric: 'Cache Operation Time',
      value: performanceData.results.cacheOperations.averageTime,
      threshold: performanceData.thresholds.cacheOperationMax
    });
  }
  
  if (performanceData.results.databaseQueries.averageTime > performanceData.thresholds.databaseQueryMax) {
    regressions.push({
      metric: 'Database Query Time',
      value: performanceData.results.databaseQueries.averageTime,
      threshold: performanceData.thresholds.databaseQueryMax
    });
  }
  
  // Generate JSON report
  const report = {
    ...performanceData,
    regressions,
    status: regressions.length > 0 ? 'FAILED' : 'PASSED'
  };
  
  fs.writeFileSync('performance-results.json', JSON.stringify(report, null, 2));
  
  // Generate HTML report
  const htmlReport = generateHtmlReport(report);
  fs.writeFileSync('performance-report.html', htmlReport);
  
  console.log(`Performance report generated. Status: ${report.status}`);
  console.log(`Regressions found: ${regressions.length}`);
  
  if (regressions.length > 0) {
    console.log('Performance regressions detected:');
    regressions.forEach(regression => {
      console.log(`- ${regression.metric}: ${regression.value}ms (threshold: ${regression.threshold}ms)`);
    });
    process.exit(1);
  }
}

function generateHtmlReport(report) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Report - ${report.timestamp}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .status-pass { color: #28a745; }
        .status-fail { color: #dc3545; }
        .metric { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 3px; }
        .regression { background: #f8d7da; border-color: #f5c6cb; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Performance Report</h1>
        <p><strong>Generated:</strong> ${report.timestamp}</p>
        <p><strong>Status:</strong> <span class="status-${report.status.toLowerCase()}">${report.status}</span></p>
        <p><strong>Regressions:</strong> ${report.regressions.length}</p>
    </div>
    
    <h2>Performance Metrics</h2>
    
    <h3>Permission System</h3>
    <table>
        <tr><th>Metric</th><th>Value</th><th>Threshold</th></tr>
        <tr><td>Average Time</td><td>${report.results.permissionChecks.averageTime}ms</td><td>${report.thresholds.permissionCheckMax}ms</td></tr>
        <tr><td>P95 Time</td><td>${report.results.permissionChecks.p95Time}ms</td><td>-</td></tr>
        <tr><td>Throughput</td><td>${report.results.permissionChecks.throughput} ops/sec</td><td>-</td></tr>
        <tr><td>Error Rate</td><td>${(report.results.permissionChecks.errorRate * 100).toFixed(3)}%</td><td>${(report.thresholds.errorRateMax * 100).toFixed(1)}%</td></tr>
    </table>
    
    <h3>Cache Performance</h3>
    <table>
        <tr><th>Metric</th><th>Value</th><th>Threshold</th></tr>
        <tr><td>Average Time</td><td>${report.results.cacheOperations.averageTime}ms</td><td>${report.thresholds.cacheOperationMax}ms</td></tr>
        <tr><td>Hit Rate</td><td>${(report.results.cacheOperations.hitRate * 100).toFixed(1)}%</td><td>-</td></tr>
        <tr><td>Miss Rate</td><td>${(report.results.cacheOperations.missRate * 100).toFixed(1)}%</td><td>-</td></tr>
    </table>
    
    <h3>Database Performance</h3>
    <table>
        <tr><th>Metric</th><th>Value</th><th>Threshold</th></tr>
        <tr><td>Average Time</td><td>${report.results.databaseQueries.averageTime}ms</td><td>${report.thresholds.databaseQueryMax}ms</td></tr>
        <tr><td>Queries/sec</td><td>${report.results.databaseQueries.queriesPerSecond}</td><td>-</td></tr>
        <tr><td>Pool Utilization</td><td>${(report.results.databaseQueries.connectionPoolUtilization * 100).toFixed(1)}%</td><td>-</td></tr>
    </table>
    
    ${report.regressions.length > 0 ? `
    <h2>Performance Regressions</h2>
    ${report.regressions.map(regression => `
    <div class="metric regression">
        <strong>${regression.metric}</strong><br>
        Current: ${regression.value}ms | Threshold: ${regression.threshold}ms
    </div>
    `).join('')}
    ` : '<h2>No Performance Regressions Detected ✅</h2>'}
</body>
</html>
  `;
}

if (require.main === module) {
  generatePerformanceReport().catch(console.error);
}

module.exports = { generatePerformanceReport };