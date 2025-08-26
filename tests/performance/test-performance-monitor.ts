/**
 * Test Performance Monitor
 * Tracks test execution times, identifies slow tests, and provides optimization recommendations
 */

import fs from 'fs/promises'
import path from 'path'

export interface TestPerformanceMetrics {
  testName: string
  suiteName: string
  duration: number
  status: 'passed' | 'failed' | 'skipped'
  timestamp: number
  memoryUsage?: NodeJS.MemoryUsage
  retries?: number
}

export interface PerformanceBenchmark {
  testName: string
  averageDuration: number
  minDuration: number
  maxDuration: number
  standardDeviation: number
  executionCount: number
  lastUpdated: number
}

export interface PerformanceReport {
  totalTests: number
  totalDuration: number
  averageTestDuration: number
  slowestTests: TestPerformanceMetrics[]
  fastestTests: TestPerformanceMetrics[]
  flakyTests: string[]
  recommendations: string[]
  benchmarks: PerformanceBenchmark[]
}

export class TestPerformanceMonitor {
  private static instance: TestPerformanceMonitor
  private metrics: TestPerformanceMetrics[] = []
  private benchmarks: Map<string, PerformanceBenchmark> = new Map()
  private readonly metricsFile = path.join(process.cwd(), 'tests/performance/metrics.json')
  private readonly benchmarksFile = path.join(process.cwd(), 'tests/performance/benchmarks.json')
  private readonly reportFile = path.join(process.cwd(), 'tests/performance/report.json')

  private constructor() {
    this.loadExistingData()
  }

  static getInstance(): TestPerformanceMonitor {
    if (!TestPerformanceMonitor.instance) {
      TestPerformanceMonitor.instance = new TestPerformanceMonitor()
    }
    return TestPerformanceMonitor.instance
  }

  /**
   * Record test execution metrics
   */
  recordTest(metrics: TestPerformanceMetrics): void {
    this.metrics.push(metrics)
    this.updateBenchmark(metrics)
  }

  /**
   * Start timing a test
   */
  startTest(testName: string, suiteName: string): () => TestPerformanceMetrics {
    const startTime = Date.now()
    const startMemory = process.memoryUsage()

    return (status: 'passed' | 'failed' | 'skipped' = 'passed', retries = 0) => {
      const endTime = Date.now()
      const endMemory = process.memoryUsage()
      
      const metrics: TestPerformanceMetrics = {
        testName,
        suiteName,
        duration: endTime - startTime,
        status,
        timestamp: startTime,
        memoryUsage: {
          rss: endMemory.rss - startMemory.rss,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          external: endMemory.external - startMemory.external,
          arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
        },
        retries,
      }

      this.recordTest(metrics)
      return metrics
    }
  }

  /**
   * Update benchmark data for a test
   */
  private updateBenchmark(metrics: TestPerformanceMetrics): void {
    const key = `${metrics.suiteName}:${metrics.testName}`
    const existing = this.benchmarks.get(key)

    if (existing) {
      const durations = [existing.minDuration, existing.maxDuration, metrics.duration]
      const newCount = existing.executionCount + 1
      const newAverage = (existing.averageDuration * existing.executionCount + metrics.duration) / newCount
      
      // Calculate standard deviation
      const variance = durations.reduce((acc, duration) => acc + Math.pow(duration - newAverage, 2), 0) / durations.length
      const standardDeviation = Math.sqrt(variance)

      this.benchmarks.set(key, {
        testName: metrics.testName,
        averageDuration: newAverage,
        minDuration: Math.min(existing.minDuration, metrics.duration),
        maxDuration: Math.max(existing.maxDuration, metrics.duration),
        standardDeviation,
        executionCount: newCount,
        lastUpdated: Date.now(),
      })
    } else {
      this.benchmarks.set(key, {
        testName: metrics.testName,
        averageDuration: metrics.duration,
        minDuration: metrics.duration,
        maxDuration: metrics.duration,
        standardDeviation: 0,
        executionCount: 1,
        lastUpdated: Date.now(),
      })
    }
  }

  /**
   * Identify slow tests based on benchmarks
   */
  getSlowTests(threshold = 5000): TestPerformanceMetrics[] {
    return this.metrics
      .filter(metric => metric.duration > threshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
  }

  /**
   * Identify flaky tests (tests with high variance in execution time or frequent retries)
   */
  getFlakyTests(): string[] {
    const flakyTests: string[] = []
    
    for (const [key, benchmark] of this.benchmarks) {
      // High variance in execution time
      if (benchmark.standardDeviation > benchmark.averageDuration * 0.5) {
        flakyTests.push(key)
      }
    }

    // Tests with frequent retries
    const testsWithRetries = this.metrics
      .filter(metric => (metric.retries || 0) > 0)
      .map(metric => `${metric.suiteName}:${metric.testName}`)

    return [...new Set([...flakyTests, ...testsWithRetries])]
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(): string[] {
    const recommendations: string[] = []
    const slowTests = this.getSlowTests()
    const flakyTests = this.getFlakyTests()

    if (slowTests.length > 0) {
      recommendations.push(`Consider optimizing ${slowTests.length} slow tests (>5s execution time)`)
      recommendations.push('Review database operations in slow integration tests')
      recommendations.push('Consider mocking external dependencies in slow tests')
    }

    if (flakyTests.length > 0) {
      recommendations.push(`Address ${flakyTests.length} flaky tests with inconsistent execution times`)
      recommendations.push('Review test isolation and cleanup procedures')
    }

    const avgDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length
    if (avgDuration > 1000) {
      recommendations.push('Consider increasing parallel test execution')
      recommendations.push('Review test setup and teardown efficiency')
    }

    const memoryIntensiveTests = this.metrics.filter(m => 
      m.memoryUsage && m.memoryUsage.heapUsed > 50 * 1024 * 1024 // 50MB
    )
    if (memoryIntensiveTests.length > 0) {
      recommendations.push(`${memoryIntensiveTests.length} tests use excessive memory (>50MB)`)
      recommendations.push('Review memory cleanup in test teardown')
    }

    return recommendations
  }

  /**
   * Generate comprehensive performance report
   */
  generateReport(): PerformanceReport {
    const sortedByDuration = [...this.metrics].sort((a, b) => b.duration - a.duration)
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0)
    
    return {
      totalTests: this.metrics.length,
      totalDuration,
      averageTestDuration: totalDuration / this.metrics.length,
      slowestTests: sortedByDuration.slice(0, 10),
      fastestTests: sortedByDuration.slice(-10).reverse(),
      flakyTests: this.getFlakyTests(),
      recommendations: this.generateRecommendations(),
      benchmarks: Array.from(this.benchmarks.values()),
    }
  }

  /**
   * Save metrics and benchmarks to disk
   */
  async saveData(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.metricsFile), { recursive: true })
      
      await Promise.all([
        fs.writeFile(this.metricsFile, JSON.stringify(this.metrics, null, 2)),
        fs.writeFile(this.benchmarksFile, JSON.stringify(Array.from(this.benchmarks.entries()), null, 2)),
        fs.writeFile(this.reportFile, JSON.stringify(this.generateReport(), null, 2)),
      ])
    } catch (error) {
      console.warn('Failed to save performance data:', error)
    }
  }

  /**
   * Load existing metrics and benchmarks
   */
  private async loadExistingData(): Promise<void> {
    try {
      const [metricsData, benchmarksData] = await Promise.all([
        fs.readFile(this.metricsFile, 'utf-8').catch(() => '[]'),
        fs.readFile(this.benchmarksFile, 'utf-8').catch(() => '[]'),
      ])

      this.metrics = JSON.parse(metricsData)
      const benchmarkEntries = JSON.parse(benchmarksData)
      this.benchmarks = new Map(benchmarkEntries)
    } catch (error) {
      // Ignore errors, start with empty data
    }
  }

  /**
   * Clear old metrics (keep last 1000 entries)
   */
  cleanup(): void {
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }
  }
}

// Global performance monitor instance
export const performanceMonitor = TestPerformanceMonitor.getInstance()