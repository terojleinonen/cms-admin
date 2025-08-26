#!/usr/bin/env node

/**
 * Test Performance CLI
 * Command-line interface for managing test performance optimization
 */

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs').promises

const commands = {
  analyze: 'Analyze test performance and generate optimization recommendations',
  benchmark: 'Run performance benchmarks on the test suite',
  cache: 'Manage test result caching',
  flaky: 'Analyze and report on flaky tests',
  optimize: 'Apply automatic optimizations to test configuration',
  report: 'Generate comprehensive performance reports',
  stats: 'Show current performance statistics',
  trends: 'Show performance trends over time',
}

const args = process.argv.slice(2)
const command = args[0]
const subcommand = args[1]

if (!command || command === 'help') {
  showHelp()
  process.exit(0)
}

if (!commands[command]) {
  console.error(`Unknown command: ${command}`)
  showHelp()
  process.exit(1)
}

/**
 * Show help information
 */
function showHelp() {
  console.log('Test Performance CLI')
  console.log('===================')
  console.log('')
  console.log('Usage: node scripts/test-performance-cli.js <command> [options]')
  console.log('')
  console.log('Commands:')
  Object.entries(commands).forEach(([cmd, desc]) => {
    console.log(`  ${cmd.padEnd(12)} ${desc}`)
  })
  console.log('')
  console.log('Examples:')
  console.log('  node scripts/test-performance-cli.js analyze')
  console.log('  node scripts/test-performance-cli.js benchmark --iterations 5')
  console.log('  node scripts/test-performance-cli.js cache clear')
  console.log('  node scripts/test-performance-cli.js flaky --threshold 70')
  console.log('  node scripts/test-performance-cli.js report --format html')
}

/**
 * Run TypeScript file with tsx
 */
function runTypeScript(file, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', file, ...args], {
      stdio: 'inherit',
      cwd: process.cwd(),
    })
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(code)
      } else {
        reject(new Error(`Process exited with code ${code}`))
      }
    })
    
    child.on('error', reject)
  })
}

/**
 * Load and display performance data
 */
async function loadPerformanceData(file) {
  try {
    const data = await fs.readFile(path.join(process.cwd(), 'tests/performance', file), 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.log(`No ${file} found. Run tests first to generate performance data.`)
    return null
  }
}

/**
 * Handle analyze command
 */
async function handleAnalyze() {
  console.log('🔍 Analyzing test performance...')
  
  try {
    // Create a simple analyzer script
    const analyzerScript = `
const { testOptimizer } = require('./tests/performance/test-optimizer.ts')

async function analyze() {
  try {
    const report = await testOptimizer.generateOptimizationReport()
    console.log('Analysis complete!')
  } catch (error) {
    console.error('Analysis failed:', error.message)
    process.exit(1)
  }
}

analyze()
`
    
    const tempFile = path.join(process.cwd(), 'temp-analyzer.js')
    await fs.writeFile(tempFile, analyzerScript)
    
    await runTypeScript(tempFile)
    
    // Clean up
    await fs.unlink(tempFile).catch(() => {})
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message)
    process.exit(1)
  }
}

/**
 * Handle benchmark command
 */
async function handleBenchmark() {
  const iterations = args.includes('--iterations') ? 
    parseInt(args[args.indexOf('--iterations') + 1]) || 3 : 3
  
  console.log(`🏃 Running performance benchmark (${iterations} iterations)...`)
  
  const results = []
  
  for (let i = 1; i <= iterations; i++) {
    console.log(`\nIteration ${i}/${iterations}`)
    const startTime = Date.now()
    
    try {
      await new Promise((resolve, reject) => {
        const child = spawn('npm', ['run', 'test', '--', '--silent'], {
          stdio: 'pipe',
          cwd: process.cwd(),
        })
        
        child.on('close', (code) => {
          const duration = Date.now() - startTime
          results.push({ iteration: i, duration, success: code === 0 })
          resolve()
        })
        
        child.on('error', reject)
      })
    } catch (error) {
      console.error(`Iteration ${i} failed:`, error.message)
      results.push({ iteration: i, duration: Date.now() - startTime, success: false })
    }
  }
  
  // Calculate statistics
  const successfulRuns = results.filter(r => r.success)
  if (successfulRuns.length === 0) {
    console.error('❌ All benchmark iterations failed')
    process.exit(1)
  }
  
  const durations = successfulRuns.map(r => r.duration)
  const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length
  const minDuration = Math.min(...durations)
  const maxDuration = Math.max(...durations)
  
  console.log('\n📊 Benchmark Results')
  console.log('===================')
  console.log(`Successful runs: ${successfulRuns.length}/${iterations}`)
  console.log(`Average duration: ${Math.round(avgDuration / 1000)}s`)
  console.log(`Fastest run: ${Math.round(minDuration / 1000)}s`)
  console.log(`Slowest run: ${Math.round(maxDuration / 1000)}s`)
  console.log(`Variance: ${Math.round((maxDuration - minDuration) / 1000)}s`)
  
  // Save benchmark results
  const benchmarkFile = path.join(process.cwd(), 'tests/performance/benchmark-results.json')
  await fs.writeFile(benchmarkFile, JSON.stringify({
    timestamp: Date.now(),
    iterations,
    results,
    statistics: {
      avgDuration,
      minDuration,
      maxDuration,
      successRate: (successfulRuns.length / iterations) * 100,
    },
  }, null, 2))
  
  console.log(`\n💾 Results saved to: ${benchmarkFile}`)
}

/**
 * Handle cache command
 */
async function handleCache() {
  if (subcommand === 'clear') {
    console.log('🧹 Clearing test cache...')
    
    const cacheFiles = [
      'tests/performance/test-cache.json',
      'tests/performance/cache-stats.json',
    ]
    
    let cleared = 0
    for (const file of cacheFiles) {
      try {
        await fs.unlink(path.join(process.cwd(), file))
        cleared++
      } catch (error) {
        // File doesn't exist, ignore
      }
    }
    
    console.log(`✅ Cleared ${cleared} cache files`)
    
  } else if (subcommand === 'stats') {
    const stats = await loadPerformanceData('cache-stats.json')
    if (stats) {
      console.log('\n📦 Cache Statistics')
      console.log('==================')
      console.log(`Total tests: ${stats.totalTests}`)
      console.log(`Cached tests: ${stats.cachedTests}`)
      console.log(`Cache hit rate: ${stats.cacheHitRate.toFixed(1)}%`)
      console.log(`Time saved: ${Math.round(stats.timeSaved / 1000)}s`)
      console.log(`Last cleanup: ${new Date(stats.lastCleanup).toLocaleString()}`)
    }
    
  } else {
    console.log('Cache commands: clear, stats')
  }
}

/**
 * Handle flaky command
 */
async function handleFlaky() {
  const threshold = args.includes('--threshold') ? 
    parseInt(args[args.indexOf('--threshold') + 1]) || 70 : 70
  
  const report = await loadPerformanceData('flakiness-report.json')
  if (!report) return
  
  console.log('\n⚠️  Flaky Test Analysis')
  console.log('======================')
  console.log(`Total flaky tests: ${report.totalFlakyTests}`)
  console.log(`High risk tests: ${report.highRiskTests.length}`)
  console.log(`Medium risk tests: ${report.mediumRiskTests.length}`)
  console.log(`Low risk tests: ${report.lowRiskTests.length}`)
  
  const highRiskTests = report.highRiskTests.filter(test => test.flakinessScore >= threshold)
  
  if (highRiskTests.length > 0) {
    console.log(`\n🚨 Tests above ${threshold} flakiness threshold:`)
    highRiskTests.forEach(test => {
      console.log(`  • ${test.testName} (${test.flakinessScore.toFixed(1)} score)`)
      console.log(`    Patterns: ${test.patterns.join(', ')}`)
      if (test.recommendations.length > 0) {
        console.log(`    Recommendation: ${test.recommendations[0]}`)
      }
    })
  }
  
  if (report.commonPatterns.length > 0) {
    console.log('\n📊 Common failure patterns:')
    report.commonPatterns.forEach(pattern => {
      console.log(`  • ${pattern}`)
    })
  }
}

/**
 * Handle stats command
 */
async function handleStats() {
  const report = await loadPerformanceData('reports/latest.json')
  if (!report) return
  
  console.log('\n📊 Performance Statistics')
  console.log('=========================')
  console.log(`Total tests: ${report.totalTests}`)
  console.log(`Test duration: ${Math.round(report.duration / 1000)}s`)
  console.log(`Average test time: ${Math.round(report.performance.averageTestDuration)}ms`)
  console.log(`Cache hit rate: ${report.cache.cacheHitRate.toFixed(1)}%`)
  console.log(`Time saved by cache: ${Math.round(report.cache.timeSaved / 1000)}s`)
  
  if (report.coverage) {
    console.log(`\nCoverage:`)
    console.log(`  Lines: ${report.coverage.lines.percentage.toFixed(1)}%`)
    console.log(`  Functions: ${report.coverage.functions.percentage.toFixed(1)}%`)
    console.log(`  Branches: ${report.coverage.branches.percentage.toFixed(1)}%`)
  }
  
  if (report.performance.slowestTests.length > 0) {
    console.log('\n🐌 Slowest tests:')
    report.performance.slowestTests.slice(0, 5).forEach(test => {
      console.log(`  • ${test.testName}: ${test.duration}ms`)
    })
  }
  
  if (report.flakiness.highRiskTests.length > 0) {
    console.log('\n⚠️  High-risk flaky tests:')
    report.flakiness.highRiskTests.slice(0, 5).forEach(test => {
      console.log(`  • ${test.testName}: ${test.flakinessScore.toFixed(1)} score`)
    })
  }
}

/**
 * Handle trends command
 */
async function handleTrends() {
  const trends = await loadPerformanceData('reports/trends.json')
  if (!trends || trends.length === 0) {
    console.log('No trend data available. Run tests over multiple days to see trends.')
    return
  }
  
  console.log('\n📈 Performance Trends (Last 30 days)')
  console.log('====================================')
  
  const recent = trends.slice(-7) // Last 7 days
  if (recent.length > 1) {
    const first = recent[0]
    const last = recent[recent.length - 1]
    
    const durationChange = ((last.duration - first.duration) / first.duration) * 100
    const coverageChange = last.coverage - first.coverage
    const cacheChange = last.cacheHitRate - first.cacheHitRate
    
    console.log(`Duration trend: ${durationChange > 0 ? '+' : ''}${durationChange.toFixed(1)}%`)
    console.log(`Coverage trend: ${coverageChange > 0 ? '+' : ''}${coverageChange.toFixed(1)}%`)
    console.log(`Cache hit rate trend: ${cacheChange > 0 ? '+' : ''}${cacheChange.toFixed(1)}%`)
  }
  
  console.log('\nRecent data:')
  recent.forEach(day => {
    console.log(`  ${day.date}: ${Math.round(day.duration / 1000)}s, ${day.passRate.toFixed(1)}% pass rate, ${day.coverage.toFixed(1)}% coverage`)
  })
}

/**
 * Main command handler
 */
async function main() {
  try {
    switch (command) {
      case 'analyze':
        await handleAnalyze()
        break
      case 'benchmark':
        await handleBenchmark()
        break
      case 'cache':
        await handleCache()
        break
      case 'flaky':
        await handleFlaky()
        break
      case 'stats':
        await handleStats()
        break
      case 'trends':
        await handleTrends()
        break
      default:
        console.error(`Command '${command}' not implemented yet`)
        process.exit(1)
    }
  } catch (error) {
    console.error(`❌ Command failed:`, error.message)
    process.exit(1)
  }
}

main()