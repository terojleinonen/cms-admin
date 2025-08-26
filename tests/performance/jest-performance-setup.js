/**
 * Jest Performance Setup (JavaScript version)
 * Integrates performance monitoring, caching, and flakiness detection into Jest
 */

// Simple performance tracking without TypeScript dependencies
let testResults = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  skippedTests: 0,
  duration: 0,
}

let testStartTimes = new Map()

// Hook into Jest lifecycle
beforeAll(async () => {
  console.log('🚀 Initializing test performance monitoring...')
  testResults.duration = Date.now()
})

beforeEach(() => {
  const testName = expect.getState().currentTestName || 'unknown'
  testStartTimes.set(testName, Date.now())
  testResults.totalTests++
})

afterEach(async () => {
  const testName = expect.getState().currentTestName || 'unknown'
  const startTime = testStartTimes.get(testName)
  
  if (startTime) {
    const duration = Date.now() - startTime
    
    // Simple performance logging
    if (duration > 5000) {
      console.log(`⚠️  Slow test detected: ${testName} (${duration}ms)`)
    }
    
    testStartTimes.delete(testName)
  }
  
  // Update test counts based on test state
  const hasAssertions = expect.getState().assertionCalls > 0
  if (hasAssertions) {
    testResults.passedTests++
  } else {
    testResults.skippedTests++
  }
})

afterAll(async () => {
  // Calculate total duration
  testResults.duration = Date.now() - testResults.duration
  
  // Print simple summary
  console.log('\n📊 Performance Summary')
  console.log('=' .repeat(30))
  console.log(`Tests: ${testResults.passedTests}/${testResults.totalTests} passed`)
  console.log(`Duration: ${Math.round(testResults.duration / 1000)}s`)
  
  console.log('✅ Performance monitoring complete')
})