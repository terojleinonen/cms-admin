/**
 * Test Flakiness Detector
 * Identifies and tracks flaky tests to improve test reliability
 */

import fs from 'fs/promises'
import path from 'path'

export interface FlakyTestRecord {
  testName: string
  suiteName: string
  filePath: string
  failures: TestFailure[]
  successes: number
  totalRuns: number
  flakinessScore: number
  lastFailure: number
  patterns: string[]
  recommendations: string[]
}

export interface TestFailure {
  timestamp: number
  errorMessage: string
  stackTrace: string
  duration: number
  retryCount: number
  environment: string
}

export interface FlakinessReport {
  totalFlakyTests: number
  highRiskTests: FlakyTestRecord[]
  mediumRiskTests: FlakyTestRecord[]
  lowRiskTests: FlakyTestRecord[]
  commonPatterns: string[]
  recommendations: string[]
  trends: {
    improvingTests: string[]
    worseningTests: string[]
  }
}

export class FlakinessDetector {
  private static instance: FlakinessDetector
  private flakyTests: Map<string, FlakyTestRecord> = new Map()
  private readonly dataFile = path.join(process.cwd(), 'tests/performance/flaky-tests.json')
  private readonly reportFile = path.join(process.cwd(), 'tests/performance/flakiness-report.json')

  private constructor() {
    this.loadData()
  }

  static getInstance(): FlakinessDetector {
    if (!FlakinessDetector.instance) {
      FlakinessDetector.instance = new FlakinessDetector()
    }
    return FlakinessDetector.instance
  }

  /**
   * Generate unique key for a test
   */
  private getTestKey(suiteName: string, testName: string, filePath: string): string {
    return `${filePath}:${suiteName}:${testName}`
  }

  /**
   * Record test failure
   */
  recordFailure(
    suiteName: string,
    testName: string,
    filePath: string,
    errorMessage: string,
    stackTrace: string,
    duration: number,
    retryCount = 0
  ): void {
    const key = this.getTestKey(suiteName, testName, filePath)
    const existing = this.flakyTests.get(key)

    const failure: TestFailure = {
      timestamp: Date.now(),
      errorMessage,
      stackTrace,
      duration,
      retryCount,
      environment: process.env.NODE_ENV || 'test',
    }

    if (existing) {
      existing.failures.push(failure)
      existing.totalRuns++
      existing.lastFailure = Date.now()
      existing.flakinessScore = this.calculateFlakinessScore(existing)
      existing.patterns = this.identifyPatterns(existing.failures)
      existing.recommendations = this.generateRecommendations(existing)
    } else {
      const record: FlakyTestRecord = {
        testName,
        suiteName,
        filePath,
        failures: [failure],
        successes: 0,
        totalRuns: 1,
        flakinessScore: 100, // First failure gets high score
        lastFailure: Date.now(),
        patterns: [this.categorizeError(errorMessage, stackTrace)],
        recommendations: [],
      }
      record.recommendations = this.generateRecommendations(record)
      this.flakyTests.set(key, record)
    }
  }

  /**
   * Record test success
   */
  recordSuccess(suiteName: string, testName: string, filePath: string): void {
    const key = this.getTestKey(suiteName, testName, filePath)
    const existing = this.flakyTests.get(key)

    if (existing) {
      existing.successes++
      existing.totalRuns++
      existing.flakinessScore = this.calculateFlakinessScore(existing)
    }
    // Don't create records for successful tests unless they've failed before
  }

  /**
   * Calculate flakiness score (0-100, higher = more flaky)
   */
  private calculateFlakinessScore(record: FlakyTestRecord): number {
    const failureRate = record.failures.length / record.totalRuns
    const recentFailures = record.failures.filter(f => Date.now() - f.timestamp < 7 * 24 * 60 * 60 * 1000).length
    const retryFactor = record.failures.reduce((sum, f) => sum + f.retryCount, 0) / record.failures.length
    
    // Base score from failure rate
    let score = failureRate * 100
    
    // Increase score for recent failures
    score += (recentFailures / record.failures.length) * 20
    
    // Increase score for tests that require retries
    score += retryFactor * 10
    
    // Decrease score over time if no recent failures
    const daysSinceLastFailure = (Date.now() - record.lastFailure) / (24 * 60 * 60 * 1000)
    if (daysSinceLastFailure > 7) {
      score *= Math.max(0.5, 1 - (daysSinceLastFailure - 7) / 30)
    }
    
    return Math.min(100, Math.max(0, score))
  }

  /**
   * Categorize error type
   */
  private categorizeError(errorMessage: string, stackTrace: string): string {
    const message = errorMessage.toLowerCase()
    const stack = stackTrace.toLowerCase()

    if (message.includes('timeout') || message.includes('timed out')) {
      return 'timeout'
    }
    if (message.includes('connection') || message.includes('econnrefused')) {
      return 'connection'
    }
    if (message.includes('database') || message.includes('prisma')) {
      return 'database'
    }
    if (message.includes('element not found') || message.includes('not visible')) {
      return 'ui-timing'
    }
    if (message.includes('race condition') || message.includes('async')) {
      return 'race-condition'
    }
    if (message.includes('memory') || message.includes('heap')) {
      return 'memory'
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'network'
    }
    if (stack.includes('settimeout') || stack.includes('setinterval')) {
      return 'timing'
    }
    
    return 'unknown'
  }

  /**
   * Identify common patterns in failures
   */
  private identifyPatterns(failures: TestFailure[]): string[] {
    const patterns: string[] = []
    const errorTypes = failures.map(f => this.categorizeError(f.errorMessage, f.stackTrace))
    
    // Count error type frequency
    const typeCounts = errorTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // Add patterns for frequent error types
    Object.entries(typeCounts).forEach(([type, count]) => {
      if (count > 1) {
        patterns.push(type)
      }
    })
    
    // Check for time-based patterns
    const hours = failures.map(f => new Date(f.timestamp).getHours())
    const hourCounts = hours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {} as Record<number, number>)
    
    const peakHour = Object.entries(hourCounts).reduce((max, [hour, count]) => 
      count > max.count ? { hour: parseInt(hour), count } : max, { hour: 0, count: 0 })
    
    if (peakHour.count > failures.length * 0.5) {
      patterns.push(`time-sensitive-${peakHour.hour}h`)
    }
    
    return patterns
  }

  /**
   * Generate recommendations for fixing flaky test
   */
  private generateRecommendations(record: FlakyTestRecord): string[] {
    const recommendations: string[] = []
    const patterns = record.patterns
    
    if (patterns.includes('timeout')) {
      recommendations.push('Increase test timeout or optimize slow operations')
      recommendations.push('Add explicit waits instead of fixed delays')
    }
    
    if (patterns.includes('connection') || patterns.includes('database')) {
      recommendations.push('Improve database connection handling and cleanup')
      recommendations.push('Use database transactions for test isolation')
      recommendations.push('Add connection retry logic')
    }
    
    if (patterns.includes('ui-timing')) {
      recommendations.push('Use proper wait conditions instead of fixed delays')
      recommendations.push('Ensure elements are fully loaded before interaction')
    }
    
    if (patterns.includes('race-condition')) {
      recommendations.push('Add proper synchronization mechanisms')
      recommendations.push('Use async/await consistently')
      recommendations.push('Avoid shared state between tests')
    }
    
    if (patterns.includes('memory')) {
      recommendations.push('Improve memory cleanup in test teardown')
      recommendations.push('Reduce test data size or use streaming')
    }
    
    if (patterns.includes('network')) {
      recommendations.push('Mock network requests for reliability')
      recommendations.push('Add network retry logic')
    }
    
    if (patterns.some(p => p.startsWith('time-sensitive'))) {
      recommendations.push('Test may be sensitive to system load or time of day')
      recommendations.push('Consider mocking time-dependent functionality')
    }
    
    if (record.flakinessScore > 80) {
      recommendations.push('Consider temporarily skipping this test until fixed')
      recommendations.push('Add detailed logging to identify root cause')
    }
    
    if (record.failures.some(f => f.retryCount > 0)) {
      recommendations.push('Review test retry logic and conditions')
    }
    
    return recommendations
  }

  /**
   * Get flaky tests by risk level
   */
  getFlakyTestsByRisk(): {
    high: FlakyTestRecord[]
    medium: FlakyTestRecord[]
    low: FlakyTestRecord[]
  } {
    const tests = Array.from(this.flakyTests.values())
    
    return {
      high: tests.filter(t => t.flakinessScore >= 70).sort((a, b) => b.flakinessScore - a.flakinessScore),
      medium: tests.filter(t => t.flakinessScore >= 30 && t.flakinessScore < 70).sort((a, b) => b.flakinessScore - a.flakinessScore),
      low: tests.filter(t => t.flakinessScore < 30).sort((a, b) => b.flakinessScore - a.flakinessScore),
    }
  }

  /**
   * Get common failure patterns across all tests
   */
  getCommonPatterns(): string[] {
    const allPatterns: string[] = []
    
    for (const record of this.flakyTests.values()) {
      allPatterns.push(...record.patterns)
    }
    
    const patternCounts = allPatterns.reduce((acc, pattern) => {
      acc[pattern] = (acc[pattern] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(patternCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([pattern]) => pattern)
  }

  /**
   * Generate comprehensive flakiness report
   */
  generateReport(): FlakinessReport {
    const riskLevels = this.getFlakyTestsByRisk()
    const commonPatterns = this.getCommonPatterns()
    
    // Analyze trends (comparing last 7 days vs previous 7 days)
    const now = Date.now()
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000
    
    const improvingTests: string[] = []
    const worseningTests: string[] = []
    
    for (const [key, record] of this.flakyTests) {
      const recentFailures = record.failures.filter(f => f.timestamp > weekAgo).length
      const previousFailures = record.failures.filter(f => f.timestamp > twoWeeksAgo && f.timestamp <= weekAgo).length
      
      if (previousFailures > 0 && recentFailures < previousFailures) {
        improvingTests.push(key)
      } else if (recentFailures > previousFailures) {
        worseningTests.push(key)
      }
    }
    
    return {
      totalFlakyTests: this.flakyTests.size,
      highRiskTests: riskLevels.high,
      mediumRiskTests: riskLevels.medium,
      lowRiskTests: riskLevels.low,
      commonPatterns,
      recommendations: this.generateGlobalRecommendations(commonPatterns, riskLevels),
      trends: {
        improvingTests,
        worseningTests,
      },
    }
  }

  /**
   * Generate global recommendations based on patterns
   */
  private generateGlobalRecommendations(patterns: string[], riskLevels: any): string[] {
    const recommendations: string[] = []
    
    if (riskLevels.high.length > 0) {
      recommendations.push(`Address ${riskLevels.high.length} high-risk flaky tests immediately`)
    }
    
    if (patterns.includes('timeout')) {
      recommendations.push('Review global test timeout settings')
      recommendations.push('Implement test performance monitoring')
    }
    
    if (patterns.includes('database')) {
      recommendations.push('Improve database test isolation strategy')
      recommendations.push('Consider using test database transactions')
    }
    
    if (patterns.includes('race-condition')) {
      recommendations.push('Review async/await usage across test suite')
      recommendations.push('Implement better test synchronization')
    }
    
    if (this.flakyTests.size > 10) {
      recommendations.push('Consider implementing automatic test retry for flaky tests')
      recommendations.push('Add flakiness monitoring to CI/CD pipeline')
    }
    
    return recommendations
  }

  /**
   * Save flakiness data
   */
  async saveData(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.dataFile), { recursive: true })
      
      const data = Array.from(this.flakyTests.entries())
      const report = this.generateReport()
      
      await Promise.all([
        fs.writeFile(this.dataFile, JSON.stringify(data, null, 2)),
        fs.writeFile(this.reportFile, JSON.stringify(report, null, 2)),
      ])
    } catch (error) {
      console.warn('Failed to save flakiness data:', error)
    }
  }

  /**
   * Load flakiness data
   */
  private async loadData(): Promise<void> {
    try {
      const data = await fs.readFile(this.dataFile, 'utf-8')
      const entries = JSON.parse(data)
      this.flakyTests = new Map(entries)
    } catch (error) {
      // Ignore errors, start with empty data
    }
  }

  /**
   * Clean up old data
   */
  cleanup(): void {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000 // 30 days
    
    for (const [key, record] of this.flakyTests) {
      // Remove old failures
      record.failures = record.failures.filter(f => f.timestamp > cutoff)
      
      // Remove records with no recent failures and low scores
      if (record.failures.length === 0 && record.flakinessScore < 10) {
        this.flakyTests.delete(key)
      }
    }
  }
}

// Global flakiness detector instance
export const flakinessDetector = FlakinessDetector.getInstance()