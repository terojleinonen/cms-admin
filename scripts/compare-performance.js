#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Compare current performance results with baseline
 */
async function comparePerformance() {
  console.log('Comparing performance with baseline...');
  
  // Read current performance results
  if (!fs.existsSync('performance-results.json')) {
    console.error('No performance results found. Run performance tests first.');
    process.exit(1);
  }
  
  const currentResults = JSON.parse(fs.readFileSync('performance-results.json'));
  
  // Find latest baseline
  const baselineDir = 'performance-baselines';
  let baseline = null;
  
  if (fs.existsSync(baselineDir)) {
    const baselineFiles = fs.readdirSync(baselineDir)
      .filter(file => file.startsWith('baseline-') && file.endsWith('.json'))
      .sort()
      .reverse();
    
    if (baselineFiles.length > 0) {
      const latestBaseline = path.join(baselineDir, baselineFiles[0]);
      baseline = JSON.parse(fs.readFileSync(latestBaseline));
      console.log(`Using baseline: ${baselineFiles[0]}`);
    }
  }
  
  if (!baseline) {
    console.log('No baseline found. Creating comparison with default thresholds.');
    baseline = createDefaultBaseline();
  }
  
  // Compare metrics
  const comparison = {
    timestamp: new Date().toISOString(),
    baselineTimestamp: baseline.timestamp,
    regressions: [],
    improvements: [],
    summary: {
      permissionChecks: currentResults.results.permissionChecks.averageTime,
      cacheOperations: currentResults.results.cacheOperations.averageTime,
      databaseQueries: currentResults.results.databaseQueries.averageTime
    }
  };
  
  // Check permission checks performance
  const permissionDiff = calculatePercentageChange(
    baseline.results.permissionChecks.averageTime,
    currentResults.results.permissionChecks.averageTime
  );
  
  if (permissionDiff > 10) { // 10% regression threshold
    comparison.regressions.push({
      test: 'Permission Checks',
      baseline: baseline.results.permissionChecks.averageTime,
      current: currentResults.results.permissionChecks.averageTime,
      change: permissionDiff
    });
  } else if (permissionDiff < -5) { // 5% improvement threshold
    comparison.improvements.push({
      test: 'Permission Checks',
      baseline: baseline.results.permissionChecks.averageTime,
      current: currentResults.results.permissionChecks.averageTime,
      change: Math.abs(permissionDiff)
    });
  }
  
  // Check cache operations performance
  const cacheDiff = calculatePercentageChange(
    baseline.results.cacheOperations.averageTime,
    currentResults.results.cacheOperations.averageTime
  );
  
  if (cacheDiff > 15) { // 15% regression threshold for cache
    comparison.regressions.push({
      test: 'Cache Operations',
      baseline: baseline.results.cacheOperations.averageTime,
      current: currentResults.results.cacheOperations.averageTime,
      change: cacheDiff
    });
  } else if (cacheDiff < -10) {
    comparison.improvements.push({
      test: 'Cache Operations',
      baseline: baseline.results.cacheOperations.averageTime,
      current: currentResults.results.cacheOperations.averageTime,
      change: Math.abs(cacheDiff)
    });
  }
  
  // Check database queries performance
  const dbDiff = calculatePercentageChange(
    baseline.results.databaseQueries.averageTime,
    currentResults.results.databaseQueries.averageTime
  );
  
  if (dbDiff > 20) { // 20% regression threshold for DB
    comparison.regressions.push({
      test: 'Database Queries',
      baseline: baseline.results.databaseQueries.averageTime,
      current: currentResults.results.databaseQueries.averageTime,
      change: dbDiff
    });
  } else if (dbDiff < -10) {
    comparison.improvements.push({
      test: 'Database Queries',
      baseline: baseline.results.databaseQueries.averageTime,
      current: currentResults.results.databaseQueries.averageTime,
      change: Math.abs(dbDiff)
    });
  }
  
  // Check API endpoints
  for (const [endpoint, currentMetrics] of Object.entries(currentResults.results.apiEndpoints)) {
    if (baseline.results.apiEndpoints[endpoint]) {
      const apiDiff = calculatePercentageChange(
        baseline.results.apiEndpoints[endpoint].averageTime,
        currentMetrics.averageTime
      );
      
      if (apiDiff > 25) { // 25% regression threshold for API
        comparison.regressions.push({
          test: `API ${endpoint}`,
          baseline: baseline.results.apiEndpoints[endpoint].averageTime,
          current: currentMetrics.averageTime,
          change: apiDiff
        });
      }
    }
  }
  
  // Save comparison results
  fs.writeFileSync('performance-comparison.json', JSON.stringify(comparison, null, 2));
  
  // Log results
  console.log('\n=== Performance Comparison Results ===');
  console.log(`Regressions: ${comparison.regressions.length}`);
  console.log(`Improvements: ${comparison.improvements.length}`);
  
  if (comparison.regressions.length > 0) {
    console.log('\n⚠️  Performance Regressions:');
    comparison.regressions.forEach(regression => {
      console.log(`  - ${regression.test}: ${regression.change.toFixed(1)}% slower (${regression.baseline}ms → ${regression.current}ms)`);
    });
  }
  
  if (comparison.improvements.length > 0) {
    console.log('\n✅ Performance Improvements:');
    comparison.improvements.forEach(improvement => {
      console.log(`  - ${improvement.test}: ${improvement.change.toFixed(1)}% faster (${improvement.baseline}ms → ${improvement.current}ms)`);
    });
  }
  
  if (comparison.regressions.length === 0) {
    console.log('\n✅ No significant performance regressions detected!');
  }
  
  return comparison.regressions.length === 0;
}

function calculatePercentageChange(baseline, current) {
  return ((current - baseline) / baseline) * 100;
}

function createDefaultBaseline() {
  return {
    timestamp: new Date().toISOString(),
    results: {
      permissionChecks: { averageTime: 20 },
      cacheOperations: { averageTime: 3 },
      databaseQueries: { averageTime: 15 },
      apiEndpoints: {
        '/api/auth/me': { averageTime: 50 },
        '/api/users': { averageTime: 80 },
        '/api/products': { averageTime: 100 },
        '/api/admin/users': { averageTime: 130 }
      }
    }
  };
}

if (require.main === module) {
  comparePerformance()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Error comparing performance:', error);
      process.exit(1);
    });
}

module.exports = { comparePerformance };