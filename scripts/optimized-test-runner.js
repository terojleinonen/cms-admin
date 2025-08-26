#!/usr/bin/env node

/**
 * Optimized Test Runner
 * Implements parallel processing, incremental testing, and performance optimization
 */

const { spawn, exec } = require('child_process')
const path = require('path')
const fs = require('fs').promises
const os = require('os')

// Import performance utilities (will be transpiled)
const performanceDir = path.join(process.cwd(), 'tests/performance')

// Test configurations with optimization settings
const TEST_CONFIGS = {
  unit: {
    description: 'Unit Tests (Optimized)',
    project: 'node',
    coverage: true,
    parallel: true,
    cache: true,
    maxWorkers: Math.max(2, Math.floor(os.cpus().length * 0.75)),
  },
  integration: {
    description: 'Integration Tests (Optimized)',
    project: 'node',
    coverage: true,
    timeout: 60000,
    parallel: false, // Database tests need careful coordination
    cache: true,
    maxWorkers: 2,
  },
  components: {
    description: 'Component Tests (Optimized)',
    project: 'jsdom',
    coverage: true,
    parallel: true,
    cache: true,
    maxWorkers: Math.max(2, Math.floor(os.cpus().length * 0.5)),
  },
  all: {
    description: 'All Tests (Optimized)',
    coverage: true,
    parallel: true,
    cache: true,
    maxWorkers: Math.max(2, Math.floor(os.cpus().length * 0.75)),
  },
}

// Parse command line arguments
const args = process.argv.slice(2)
// Handle special commands first
if (args[0] === 'stats') {
  showPerformanceStats()
  process.exit(0)
}

if (args[0] === 'clear-cache') {
  console.log('🧹 Clearing test cache...')
  const cacheFiles = [
    'tests/performance/test-cache.json',
    'tests/performance/metrics.json',
    'tests/performance/benchmarks.json',
  ]
  
  Promise.all(cacheFiles.map(file => fs.unlink(file).catch(() => {})))
    .then(() => console.log('✅ Cache cleared'))
    .catch(err => console.error('❌ Failed to clear cache:', err))
  process.exit(0)
}

const testType = args[0] || 'all'
const watchMode = args.includes('--watch')
const verbose = args.includes('--verbose')
const updateSnapshots = args.includes('--updateSnapshot')
const skipCache = args.includes('--no-cache')
const forceRun = args.includes('--force')
const benchmark = args.includes('--benchmark')

if (!TEST_CONFIGS[testType]) {
  console.error(`Unknown test type: ${testType}`)
  console.error(`Available types: ${Object.keys(TEST_CONFIGS).join(', ')}`)
  process.exit(1)
}

const config = TEST_CONFIGS[testType]

/**
 * Get list of test files
 */
async function getTestFiles() {
  const testPatterns = [
    'tests/**/*.test.ts',
    'tests/**/*.test.tsx',
    '__tests__/**/*.test.ts',
    '__tests__/**/*.test.tsx',
  ]
  
  const { glob } = require('glob')
  const files = []
  
  for (const pattern of testPatterns) {
    const matches = await glob(pattern, { cwd: process.cwd() })
    files.push(...matches)
  }
  
  return files
}

/**
 * Load test cache manager (simplified version for Node.js)
 */
async function loadCacheManager() {
  try {
    // Simple file-based cache check
    const cacheFile = path.join(performanceDir, 'test-cache.json')
    const cacheData = await fs.readFile(cacheFile, 'utf-8').catch(() => '[]')
    return JSON.parse(cacheData)
  } catch (error) {
    return []
  }
}

/**
 * Check if test file should be skipped based on cache
 */
async function shouldSkipTest(testFile, cache) {
  if (skipCache || forceRun) return false
  
  try {
    const stats = await fs.stat(testFile)
    const testName = path.basename(testFile, '.test.ts')
    
    // Find cached entry
    const cached = cache.find(([key, entry]) => 
      key.includes(testFile) && entry.result === 'passed'
    )
    
    if (!cached) return false
    
    const [, entry] = cached
    
    // Check if file was modified after cache entry
    if (stats.mtime.getTime() > entry.timestamp) {
      return false
    }
    
    // Check if cache is too old (7 days)
    if (Date.now() - entry.timestamp > 7 * 24 * 60 * 60 * 1000) {
      return false
    }
    
    return true
  } catch (error) {
    return false
  }
}

/**
 * Run tests with optimization
 */
async function runOptimizedTests() {
  console.log(`\n🚀 Running ${config.description}...\n`)
  
  const startTime = Date.now()
  
  // Setup test database for integration tests
  if (testType === 'integration' || testType === 'all') {
    console.log('🔧 Setting up test database...')
    try {
      const { execSync } = require('child_process')
      execSync('node scripts/setup-test-database.js', {
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'test' }
      })
      console.log('✅ Test database ready\n')
    } catch (error) {
      console.error('❌ Failed to setup test database:', error.message)
      process.exit(1)
    }
  }
  
  // Get test files and apply caching
  let testFiles = await getTestFiles()
  let skippedFiles = []
  
  if (config.cache && !watchMode) {
    console.log('📦 Checking test cache...')
    const cache = await loadCacheManager()
    const originalCount = testFiles.length
    
    const filesToRun = []
    for (const file of testFiles) {
      if (await shouldSkipTest(file, cache)) {
        skippedFiles.push(file)
      } else {
        filesToRun.push(file)
      }
    }
    
    testFiles = filesToRun
    
    if (skippedFiles.length > 0) {
      console.log(`⚡ Skipping ${skippedFiles.length}/${originalCount} cached tests`)
      console.log(`📊 Estimated time saved: ${Math.round(skippedFiles.length * 0.5)}s\n`)
    }
  }
  
  // Build Jest command
  const jestArgs = [
    '--config', 'jest.config.js',
    '--setupFilesAfterEnv', path.join(process.cwd(), 'tests/performance/jest-performance-setup.js'),
  ]
  
  // Add project filter if specified
  if (config.project && testType !== 'all') {
    jestArgs.push('--selectProjects', config.project)
  }
  
  // Optimize worker configuration
  if (config.parallel && !watchMode) {
    jestArgs.push('--maxWorkers', config.maxWorkers.toString())
  } else if (!config.parallel) {
    jestArgs.push('--runInBand')
  }
  
  if (config.coverage) {
    jestArgs.push('--coverage')
  }
  
  if (config.timeout) {
    jestArgs.push('--testTimeout', config.timeout.toString())
  }
  
  if (watchMode) {
    jestArgs.push('--watch')
  }
  
  if (verbose) {
    jestArgs.push('--verbose')
  }
  
  if (updateSnapshots) {
    jestArgs.push('--updateSnapshot')
  }
  
  // Add performance optimizations
  if (!watchMode) {
    jestArgs.push('--cache')
    jestArgs.push('--cacheDirectory', path.join(process.cwd(), 'node_modules/.cache/jest'))
  }
  
  // Add specific test files if using incremental testing
  if (testFiles.length > 0 && testFiles.length < 50) {
    jestArgs.push(...testFiles)
  }
  
  // Add benchmark mode
  if (benchmark) {
    jestArgs.push('--detectOpenHandles')
    jestArgs.push('--forceExit')
  }
  
  console.log(`🧪 Running ${testFiles.length} test files with ${config.maxWorkers} workers...\n`)
  
  // Run Jest
  const jest = spawn('npx', ['jest', ...jestArgs], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=4096', // Increase memory for large test suites
    },
  })
  
  jest.on('close', async (code) => {
    const duration = Date.now() - startTime
    
    if (code === 0) {
      console.log(`\n✅ ${config.description} completed successfully!`)
      console.log(`⏱️  Total time: ${Math.round(duration / 1000)}s`)
      
      if (skippedFiles.length > 0) {
        console.log(`⚡ Cache saved: ${Math.round(skippedFiles.length * 0.5)}s`)
      }
      
      if (config.coverage) {
        console.log('\n📊 Coverage report generated in ./coverage/')
        console.log('   Open ./coverage/lcov-report/index.html to view detailed coverage')
      }
      
      // Show performance report location
      console.log('\n📈 Performance report: tests/performance/reports/latest.html')
      
    } else {
      console.error(`\n❌ ${config.description} failed with exit code ${code}`)
      console.error(`⏱️  Duration: ${Math.round(duration / 1000)}s`)
    }
    
    process.exit(code)
  })
  
  jest.on('error', (error) => {
    console.error(`\n❌ Failed to start tests: ${error.message}`)
    process.exit(1)
  })
}

/**
 * Show performance statistics
 */
async function showPerformanceStats() {
  try {
    const reportsDir = path.join(performanceDir, 'reports')
    const latestReport = path.join(reportsDir, 'latest.json')
    
    const reportData = await fs.readFile(latestReport, 'utf-8')
    const report = JSON.parse(reportData)
    
    console.log('\n📊 Recent Performance Statistics')
    console.log('=' .repeat(50))
    console.log(`Average test duration: ${Math.round(report.performance.averageTestDuration)}ms`)
    console.log(`Cache hit rate: ${report.cache.cacheHitRate.toFixed(1)}%`)
    console.log(`Time saved by caching: ${Math.round(report.cache.timeSaved / 1000)}s`)
    console.log(`Flaky tests: ${report.flakiness.totalFlakyTests}`)
    
    if (report.flakiness.highRiskTests.length > 0) {
      console.log(`\n⚠️  High-risk flaky tests:`)
      report.flakiness.highRiskTests.slice(0, 5).forEach(test => {
        console.log(`   • ${test.testName} (${test.flakinessScore.toFixed(1)} score)`)
      })
    }
    
    if (report.performance.slowestTests.length > 0) {
      console.log(`\n🐌 Slowest tests:`)
      report.performance.slowestTests.slice(0, 5).forEach(test => {
        console.log(`   • ${test.testName}: ${test.duration}ms`)
      })
    }
    
  } catch (error) {
    console.log('No performance data available yet. Run tests first.')
  }
}



// Run optimized tests
runOptimizedTests().catch(error => {
  console.error('❌ Test runner failed:', error)
  process.exit(1)
})