/**
 * Test Optimizer
 * Analyzes test performance and provides optimization recommendations
 */

import fs from 'fs/promises'
import path from 'path'
import { performanceMonitor, PerformanceReport } from './test-performance-monitor'
import { testCacheManager } from './test-cache-manager'
import { flakinessDetector } from './flakiness-detector'

export interface OptimizationRecommendation {
  type: 'performance' | 'flakiness' | 'cache' | 'parallel' | 'memory'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  impact: string
  implementation: string[]
  estimatedTimeSaving?: number
}

export interface OptimizationReport {
  summary: {
    totalTests: number
    totalDuration: number
    potentialTimeSaving: number
    optimizationOpportunities: number
  }
  recommendations: OptimizationRecommendation[]
  testAnalysis: {
    slowTests: Array<{ name: string; duration: number; suggestions: string[] }>
    flakyTests: Array<{ name: string; score: number; patterns: string[] }>
    memoryIntensiveTests: Array<{ name: string; memory: number; suggestions: string[] }>
  }
  parallelizationOpportunities: {
    serialTests: string[]
    batchableTests: string[][]
    estimatedSpeedup: number
  }
}

export class TestOptimizer {
  private static instance: TestOptimizer
  private readonly configFile = path.join(process.cwd(), 'tests/performance/config.json')
  private config: any = {}

  private constructor() {
    this.loadConfig()
  }

  static getInstance(): TestOptimizer {
    if (!TestOptimizer.instance) {
      TestOptimizer.instance = new TestOptimizer()
    }
    return TestOptimizer.instance
  }

  /**
   * Load optimization configuration
   */
  private async loadConfig(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configFile, 'utf-8')
      this.config = JSON.parse(configData)
    } catch (error) {
      // Use default config
      this.config = {
        performance: { slowTestThreshold: 5000 },
        flakiness: { highRiskThreshold: 70 },
        cache: { enabled: true },
      }
    }
  }

  /**
   * Analyze test performance and generate optimization recommendations
   */
  async analyzeAndOptimize(): Promise<OptimizationReport> {
    const performance = performanceMonitor.generateReport()
    const cache = testCacheManager.getStats()
    const flakiness = flakinessDetector.generateReport()

    const recommendations: OptimizationRecommendation[] = []
    let potentialTimeSaving = 0

    // Analyze slow tests
    const slowTests = this.analyzeSlowTests(performance)
    recommendations.push(...this.generatePerformanceRecommendations(slowTests))
    potentialTimeSaving += slowTests.reduce((sum, test) => sum + Math.max(0, test.duration - 1000), 0)

    // Analyze flaky tests
    const flakyTests = this.analyzeFlakyTests(flakiness)
    recommendations.push(...this.generateFlakinessRecommendations(flakyTests))

    // Analyze memory usage
    const memoryIntensiveTests = this.analyzeMemoryUsage(performance)
    recommendations.push(...this.generateMemoryRecommendations(memoryIntensiveTests))

    // Analyze caching opportunities
    recommendations.push(...this.generateCacheRecommendations(cache))
    potentialTimeSaving += this.estimateCacheTimeSaving(cache)

    // Analyze parallelization opportunities
    const parallelization = this.analyzeParallelization(performance)
    recommendations.push(...this.generateParallelizationRecommendations(parallelization))
    potentialTimeSaving += parallelization.estimatedSpeedup

    return {
      summary: {
        totalTests: performance.totalTests,
        totalDuration: performance.totalDuration,
        potentialTimeSaving,
        optimizationOpportunities: recommendations.length,
      },
      recommendations: recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      }),
      testAnalysis: {
        slowTests,
        flakyTests,
        memoryIntensiveTests,
      },
      parallelizationOpportunities: parallelization,
    }
  }

  /**
   * Analyze slow tests
   */
  private analyzeSlowTests(performance: PerformanceReport) {
    const threshold = this.config.performance?.slowTestThreshold || 5000
    
    return performance.slowestTests
      .filter(test => test.duration > threshold)
      .map(test => ({
        name: `${test.suiteName}:${test.testName}`,
        duration: test.duration,
        suggestions: this.generateSlowTestSuggestions(test),
      }))
  }

  /**
   * Generate suggestions for slow tests
   */
  private generateSlowTestSuggestions(test: any): string[] {
    const suggestions: string[] = []
    
    if (test.duration > 10000) {
      suggestions.push('Consider breaking into smaller, focused tests')
      suggestions.push('Review database operations and add proper indexing')
    }
    
    if (test.suiteName.includes('integration')) {
      suggestions.push('Mock external dependencies where possible')
      suggestions.push('Use database transactions for faster cleanup')
    }
    
    if (test.suiteName.includes('component')) {
      suggestions.push('Use shallow rendering for unit tests')
      suggestions.push('Mock heavy components and focus on behavior')
    }
    
    if (test.duration > 5000) {
      suggestions.push('Add performance profiling to identify bottlenecks')
      suggestions.push('Consider using test.concurrent for independent operations')
    }
    
    return suggestions
  }

  /**
   * Analyze flaky tests
   */
  private analyzeFlakyTests(flakiness: any) {
    return flakiness.highRiskTests.map((test: any) => ({
      name: `${test.suiteName}:${test.testName}`,
      score: test.flakinessScore,
      patterns: test.patterns,
    }))
  }

  /**
   * Analyze memory usage
   */
  private analyzeMemoryUsage(performance: PerformanceReport) {
    const threshold = this.config.performance?.memoryThreshold || 50 * 1024 * 1024 // 50MB
    
    return performance.slowestTests
      .filter(test => test.memoryUsage && test.memoryUsage.heapUsed > threshold)
      .map(test => ({
        name: `${test.suiteName}:${test.testName}`,
        memory: test.memoryUsage?.heapUsed || 0,
        suggestions: this.generateMemorySuggestions(test),
      }))
  }

  /**
   * Generate memory optimization suggestions
   */
  private generateMemorySuggestions(test: any): string[] {
    const suggestions: string[] = []
    
    suggestions.push('Review test data size and use minimal datasets')
    suggestions.push('Ensure proper cleanup in afterEach/afterAll hooks')
    suggestions.push('Consider using streaming for large data operations')
    suggestions.push('Check for memory leaks in mocks and stubs')
    
    if (test.suiteName.includes('integration')) {
      suggestions.push('Use database transactions to avoid large datasets')
    }
    
    return suggestions
  }

  /**
   * Analyze parallelization opportunities
   */
  private analyzeParallelization(performance: PerformanceReport) {
    const serialTests: string[] = []
    const batchableTests: string[][] = []
    
    // Group tests by suite for potential batching
    const testsBySuite = new Map<string, any[]>()
    
    performance.slowestTests.forEach(test => {
      const suite = test.suiteName
      if (!testsBySuite.has(suite)) {
        testsBySuite.set(suite, [])
      }
      testsBySuite.get(suite)!.push(test)
    })
    
    // Identify tests that could be parallelized
    for (const [suite, tests] of testsBySuite) {
      if (tests.length > 1 && !suite.includes('integration')) {
        batchableTests.push(tests.map(t => `${t.suiteName}:${t.testName}`))
      }
      
      if (suite.includes('integration') && tests.length > 3) {
        serialTests.push(...tests.map(t => `${t.suiteName}:${t.testName}`))
      }
    }
    
    // Estimate speedup from parallelization
    const totalSequentialTime = performance.totalDuration
    const estimatedParallelTime = totalSequentialTime * 0.6 // Assume 40% speedup
    const estimatedSpeedup = totalSequentialTime - estimatedParallelTime
    
    return {
      serialTests,
      batchableTests,
      estimatedSpeedup,
    }
  }

  /**
   * Generate performance recommendations
   */
  private generatePerformanceRecommendations(slowTests: any[]): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = []
    
    if (slowTests.length > 0) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        title: `Optimize ${slowTests.length} slow tests`,
        description: `${slowTests.length} tests are taking longer than expected to execute`,
        impact: `Could save ${Math.round(slowTests.reduce((sum, test) => sum + Math.max(0, test.duration - 1000), 0) / 1000)}s per test run`,
        implementation: [
          'Review database operations and add proper indexing',
          'Mock external dependencies where possible',
          'Break large tests into smaller, focused tests',
          'Use database transactions for faster cleanup',
        ],
        estimatedTimeSaving: slowTests.reduce((sum, test) => sum + Math.max(0, test.duration - 1000), 0),
      })
    }
    
    return recommendations
  }

  /**
   * Generate flakiness recommendations
   */
  private generateFlakinessRecommendations(flakyTests: any[]): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = []
    
    if (flakyTests.length > 0) {
      recommendations.push({
        type: 'flakiness',
        priority: 'high',
        title: `Fix ${flakyTests.length} flaky tests`,
        description: `${flakyTests.length} tests are showing inconsistent behavior`,
        impact: 'Improves test reliability and reduces false failures',
        implementation: [
          'Add proper wait conditions instead of fixed delays',
          'Improve test isolation and cleanup procedures',
          'Use database transactions for test isolation',
          'Add retry logic for network-dependent tests',
        ],
      })
    }
    
    return recommendations
  }

  /**
   * Generate memory recommendations
   */
  private generateMemoryRecommendations(memoryIntensiveTests: any[]): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = []
    
    if (memoryIntensiveTests.length > 0) {
      recommendations.push({
        type: 'memory',
        priority: 'medium',
        title: `Optimize memory usage in ${memoryIntensiveTests.length} tests`,
        description: `${memoryIntensiveTests.length} tests are using excessive memory`,
        impact: 'Reduces memory pressure and improves test stability',
        implementation: [
          'Review test data size and use minimal datasets',
          'Ensure proper cleanup in test hooks',
          'Consider using streaming for large data operations',
          'Check for memory leaks in mocks and stubs',
        ],
      })
    }
    
    return recommendations
  }

  /**
   * Generate cache recommendations
   */
  private generateCacheRecommendations(cache: any): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = []
    
    if (cache.cacheHitRate < 20) {
      recommendations.push({
        type: 'cache',
        priority: 'medium',
        title: 'Improve test caching strategy',
        description: `Cache hit rate is only ${cache.cacheHitRate.toFixed(1)}%`,
        impact: 'Could significantly reduce test execution time',
        implementation: [
          'Review cache invalidation strategy',
          'Improve dependency tracking for cache keys',
          'Consider caching at test suite level',
          'Optimize cache storage and retrieval',
        ],
      })
    }
    
    return recommendations
  }

  /**
   * Generate parallelization recommendations
   */
  private generateParallelizationRecommendations(parallelization: any): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = []
    
    if (parallelization.batchableTests.length > 0) {
      recommendations.push({
        type: 'parallel',
        priority: 'medium',
        title: 'Optimize test parallelization',
        description: `${parallelization.batchableTests.length} test suites could benefit from better parallelization`,
        impact: `Could save approximately ${Math.round(parallelization.estimatedSpeedup / 1000)}s per test run`,
        implementation: [
          'Increase maxWorkers for independent test suites',
          'Use test.concurrent for independent operations',
          'Optimize database test isolation',
          'Consider test sharding for large suites',
        ],
        estimatedTimeSaving: parallelization.estimatedSpeedup,
      })
    }
    
    return recommendations
  }

  /**
   * Estimate time saving from improved caching
   */
  private estimateCacheTimeSaving(cache: any): number {
    if (cache.cacheHitRate < 50) {
      // Estimate potential improvement
      const potentialHitRate = 70 // Target 70% hit rate
      const improvement = (potentialHitRate - cache.cacheHitRate) / 100
      return cache.totalTests * 500 * improvement // Assume 500ms average per test
    }
    return 0
  }

  /**
   * Generate optimization report and save to file
   */
  async generateOptimizationReport(): Promise<OptimizationReport> {
    const report = await this.analyzeAndOptimize()
    
    try {
      const reportFile = path.join(process.cwd(), 'tests/performance/optimization-report.json')
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2))
      
      console.log('📊 Optimization report generated: tests/performance/optimization-report.json')
      this.printOptimizationSummary(report)
    } catch (error) {
      console.warn('Failed to save optimization report:', error)
    }
    
    return report
  }

  /**
   * Print optimization summary to console
   */
  private printOptimizationSummary(report: OptimizationReport): void {
    console.log('\n🚀 Test Optimization Analysis')
    console.log('=' .repeat(50))
    console.log(`Total tests: ${report.summary.totalTests}`)
    console.log(`Total duration: ${Math.round(report.summary.totalDuration / 1000)}s`)
    console.log(`Potential time saving: ${Math.round(report.summary.potentialTimeSaving / 1000)}s`)
    console.log(`Optimization opportunities: ${report.summary.optimizationOpportunities}`)
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Top Recommendations:')
      report.recommendations.slice(0, 5).forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`)
        console.log(`   ${rec.impact}`)
      })
    }
    
    if (report.testAnalysis.slowTests.length > 0) {
      console.log('\n🐌 Slowest Tests:')
      report.testAnalysis.slowTests.slice(0, 3).forEach(test => {
        console.log(`   • ${test.name}: ${test.duration}ms`)
      })
    }
    
    if (report.testAnalysis.flakyTests.length > 0) {
      console.log('\n⚠️  Flaky Tests:')
      report.testAnalysis.flakyTests.slice(0, 3).forEach(test => {
        console.log(`   • ${test.name}: ${test.score.toFixed(1)} flakiness score`)
      })
    }
  }
}

// Global test optimizer instance
export const testOptimizer = TestOptimizer.getInstance()