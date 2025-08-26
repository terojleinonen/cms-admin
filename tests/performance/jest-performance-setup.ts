/**
 * Jest Performance Setup
 * Integrates performance monitoring, caching, and flakiness detection into Jest
 */

import { performanceMonitor } from './test-performance-monitor'
import { testCacheManager } from './test-cache-manager'
import { flakinessDetector } from './flakiness-detector'
import { testReporter } from './test-reporter'

// Global test state
let currentTestStart: (() => any) | null = null
let testResults = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  skippedTests: 0,
  duration: 0,
}

// Hook into Jest lifecycle
beforeAll(async () => {
  // Initialize performance monitoring
  console.log('🚀 Initializing test performance monitoring...')
  
  // Clean up old data
  performanceMonitor.cleanup()
  testCacheManager.cleanup()
  flakinessDetector.cleanup()
  
  testResults.duration = Date.now()
})

beforeEach(() => {
  // Start timing for each test
  const testName = expect.getState().currentTestName || 'unknown'
  const suiteName = expect.getState().testPath?.split('/').pop()?.replace('.test.ts', '') || 'unknown'
  
  currentTestStart = performanceMonitor.startTest(testName, suiteName)
  testResults.totalTests++
})

afterEach(async () => {
  if (!currentTestStart) return
  
  const testName = expect.getState().currentTestName || 'unknown'
  const suiteName = expect.getState().testPath?.split('/').pop()?.replace('.test.ts', '') || 'unknown'
  const testPath = expect.getState().testPath || 'unknown'
  
  // Determine test result
  const testResult = expect.getState().assertionCalls > 0 ? 'passed' : 'skipped'
  
  // Record performance metrics
  const metrics = currentTestStart(testResult)
  
  // Update test counts
  if (testResult === 'passed') {
    testResults.passedTests++
    flakinessDetector.recordSuccess(suiteName, testName, testPath)
  } else if (testResult === 'skipped') {
    testResults.skippedTests++
  }
  
  // Cache successful test results
  if (testResult === 'passed') {
    await testCacheManager.cacheResult({
      testPath,
      testName,
      fileHash: '', // Will be calculated by cache manager
      result: testResult,
      duration: metrics.duration,
    })
  }
  
  currentTestStart = null
})

// Handle test failures
const originalIt = global.it
global.it = function(name: string, fn?: jest.ProvidesCallback, timeout?: number) {
  return originalIt(name, async function(this: any, ...args: any[]) {
    try {
      if (fn) {
        await fn.apply(this, args)
      }
    } catch (error) {
      // Record test failure for flakiness detection
      const suiteName = expect.getState().testPath?.split('/').pop()?.replace('.test.ts', '') || 'unknown'
      const testPath = expect.getState().testPath || 'unknown'
      
      flakinessDetector.recordFailure(
        suiteName,
        name,
        testPath,
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack || '' : '',
        Date.now() - (performance.now() || 0),
        0 // retry count - would need to be tracked separately
      )
      
      testResults.failedTests++
      throw error
    }
  }, timeout)
}

// Handle describe blocks for better suite tracking
const originalDescribe = global.describe
global.describe = function(name: string, fn: () => void) {
  return originalDescribe(name, fn)
}

afterAll(async () => {
  // Calculate total duration
  testResults.duration = Date.now() - testResults.duration
  
  // Save all performance data
  await Promise.all([
    performanceMonitor.saveData(),
    testCacheManager.saveCache(),
    flakinessDetector.saveData(),
  ])
  
  // Generate and save comprehensive report
  const report = await testReporter.generateReport(testResults)
  
  // Print summary to console
  testReporter.printSummary(report)
  
  console.log('✅ Performance monitoring complete')
})

// Export utilities for manual use in tests
export {
  performanceMonitor,
  testCacheManager,
  flakinessDetector,
  testReporter,
}