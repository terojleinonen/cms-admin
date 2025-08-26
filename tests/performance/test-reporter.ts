/**
 * Test Execution Reporter
 * Generates comprehensive test execution reports and analytics
 */

import fs from 'fs/promises'
import path from 'path'
import { performanceMonitor, PerformanceReport } from './test-performance-monitor'
import { testCacheManager, CacheStats } from './test-cache-manager'
import { flakinessDetector, FlakinessReport } from './flakiness-detector'

export interface TestExecutionSummary {
  timestamp: number
  duration: number
  totalTests: number
  passedTests: number
  failedTests: number
  skippedTests: number
  coverage?: CoverageReport
  performance: PerformanceReport
  cache: CacheStats
  flakiness: FlakinessReport
  environment: EnvironmentInfo
  recommendations: string[]
}

export interface CoverageReport {
  lines: { total: number; covered: number; percentage: number }
  functions: { total: number; covered: number; percentage: number }
  branches: { total: number; covered: number; percentage: number }
  statements: { total: number; covered: number; percentage: number }
}

export interface EnvironmentInfo {
  nodeVersion: string
  platform: string
  arch: string
  memory: NodeJS.MemoryUsage
  cpuCount: number
  testEnvironment: string
}

export interface TrendData {
  date: string
  duration: number
  testCount: number
  passRate: number
  coverage: number
  cacheHitRate: number
  flakyTestCount: number
}

export class TestReporter {
  private static instance: TestReporter
  private readonly reportsDir = path.join(process.cwd(), 'tests/performance/reports')
  private readonly trendsFile = path.join(this.reportsDir, 'trends.json')
  private trends: TrendData[] = []

  private constructor() {
    this.loadTrends()
  }

  static getInstance(): TestReporter {
    if (!TestReporter.instance) {
      TestReporter.instance = new TestReporter()
    }
    return TestReporter.instance
  }

  /**
   * Generate comprehensive test execution report
   */
  async generateReport(
    testResults: {
      totalTests: number
      passedTests: number
      failedTests: number
      skippedTests: number
      duration: number
    },
    coverage?: CoverageReport
  ): Promise<TestExecutionSummary> {
    const performance = performanceMonitor.generateReport()
    const cache = testCacheManager.getStats()
    const flakiness = flakinessDetector.generateReport()
    
    const report: TestExecutionSummary = {
      timestamp: Date.now(),
      duration: testResults.duration,
      totalTests: testResults.totalTests,
      passedTests: testResults.passedTests,
      failedTests: testResults.failedTests,
      skippedTests: testResults.skippedTests,
      coverage,
      performance,
      cache,
      flakiness,
      environment: this.getEnvironmentInfo(),
      recommendations: this.generateRecommendations(performance, cache, flakiness, coverage),
    }

    // Update trends
    this.updateTrends(report)
    
    // Save report
    await this.saveReport(report)
    
    return report
  }

  /**
   * Get environment information
   */
  private getEnvironmentInfo(): EnvironmentInfo {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
      cpuCount: require('os').cpus().length,
      testEnvironment: process.env.NODE_ENV || 'test',
    }
  }

  /**
   * Generate comprehensive recommendations
   */
  private generateRecommendations(
    performance: PerformanceReport,
    cache: CacheStats,
    flakiness: FlakinessReport,
    coverage?: CoverageReport
  ): string[] {
    const recommendations: string[] = []

    // Performance recommendations
    recommendations.push(...performance.recommendations)

    // Cache recommendations
    if (cache.cacheHitRate < 20) {
      recommendations.push('Low cache hit rate - consider improving test caching strategy')
    }
    if (cache.timeSaved > 60000) {
      recommendations.push(`Test caching saved ${Math.round(cache.timeSaved / 1000)}s - consider expanding caching`)
    }

    // Flakiness recommendations
    recommendations.push(...flakiness.recommendations)

    // Coverage recommendations
    if (coverage) {
      if (coverage.lines.percentage < 80) {
        recommendations.push(`Line coverage is ${coverage.lines.percentage.toFixed(1)}% - aim for 80%+`)
      }
      if (coverage.branches.percentage < 80) {
        recommendations.push(`Branch coverage is ${coverage.branches.percentage.toFixed(1)}% - add more edge case tests`)
      }
      if (coverage.functions.percentage < 80) {
        recommendations.push(`Function coverage is ${coverage.functions.percentage.toFixed(1)}% - test more functions`)
      }
    }

    // General recommendations
    if (performance.totalDuration > 300000) { // 5 minutes
      recommendations.push('Total test execution time > 5 minutes - consider parallel execution optimization')
    }

    return recommendations
  }

  /**
   * Update trend data
   */
  private updateTrends(report: TestExecutionSummary): void {
    const today = new Date().toISOString().split('T')[0]
    
    // Remove existing entry for today if it exists
    this.trends = this.trends.filter(t => t.date !== today)
    
    // Add new trend data
    const trendData: TrendData = {
      date: today,
      duration: report.duration,
      testCount: report.totalTests,
      passRate: (report.passedTests / report.totalTests) * 100,
      coverage: report.coverage?.lines.percentage || 0,
      cacheHitRate: report.cache.cacheHitRate,
      flakyTestCount: report.flakiness.totalFlakyTests,
    }
    
    this.trends.push(trendData)
    
    // Keep only last 30 days
    this.trends = this.trends.slice(-30)
  }

  /**
   * Generate HTML report
   */
  async generateHTMLReport(report: TestExecutionSummary): Promise<string> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Execution Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; }
        .card h3 { margin: 0 0 12px 0; color: #1e293b; }
        .metric { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .metric-value { font-weight: 600; }
        .success { color: #059669; }
        .warning { color: #d97706; }
        .error { color: #dc2626; }
        .recommendations { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 16px; margin-top: 20px; }
        .recommendations h3 { color: #92400e; margin: 0 0 12px 0; }
        .recommendations ul { margin: 0; padding-left: 20px; }
        .recommendations li { margin-bottom: 4px; }
        .progress-bar { background: #e5e7eb; border-radius: 4px; height: 8px; overflow: hidden; }
        .progress-fill { height: 100%; transition: width 0.3s ease; }
        .progress-success { background: #10b981; }
        .progress-warning { background: #f59e0b; }
        .progress-error { background: #ef4444; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
        th { background: #f8fafc; font-weight: 600; }
        .flaky-high { background: #fef2f2; }
        .flaky-medium { background: #fffbeb; }
        .flaky-low { background: #f0fdf4; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Test Execution Report</h1>
            <p>Generated on ${new Date(report.timestamp).toLocaleString()}</p>
        </div>
        
        <div class="content">
            <div class="grid">
                <div class="card">
                    <h3>Test Results</h3>
                    <div class="metric">
                        <span>Total Tests:</span>
                        <span class="metric-value">${report.totalTests}</span>
                    </div>
                    <div class="metric">
                        <span>Passed:</span>
                        <span class="metric-value success">${report.passedTests}</span>
                    </div>
                    <div class="metric">
                        <span>Failed:</span>
                        <span class="metric-value error">${report.failedTests}</span>
                    </div>
                    <div class="metric">
                        <span>Skipped:</span>
                        <span class="metric-value warning">${report.skippedTests}</span>
                    </div>
                    <div class="metric">
                        <span>Duration:</span>
                        <span class="metric-value">${Math.round(report.duration / 1000)}s</span>
                    </div>
                </div>

                ${report.coverage ? `
                <div class="card">
                    <h3>Coverage</h3>
                    <div class="metric">
                        <span>Lines:</span>
                        <span class="metric-value">${report.coverage.lines.percentage.toFixed(1)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${report.coverage.lines.percentage >= 80 ? 'progress-success' : report.coverage.lines.percentage >= 60 ? 'progress-warning' : 'progress-error'}" 
                             style="width: ${report.coverage.lines.percentage}%"></div>
                    </div>
                    <div class="metric">
                        <span>Functions:</span>
                        <span class="metric-value">${report.coverage.functions.percentage.toFixed(1)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${report.coverage.functions.percentage >= 80 ? 'progress-success' : report.coverage.functions.percentage >= 60 ? 'progress-warning' : 'progress-error'}" 
                             style="width: ${report.coverage.functions.percentage}%"></div>
                    </div>
                    <div class="metric">
                        <span>Branches:</span>
                        <span class="metric-value">${report.coverage.branches.percentage.toFixed(1)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${report.coverage.branches.percentage >= 80 ? 'progress-success' : report.coverage.branches.percentage >= 60 ? 'progress-warning' : 'progress-error'}" 
                             style="width: ${report.coverage.branches.percentage}%"></div>
                    </div>
                </div>
                ` : ''}

                <div class="card">
                    <h3>Performance</h3>
                    <div class="metric">
                        <span>Average Test Duration:</span>
                        <span class="metric-value">${Math.round(report.performance.averageTestDuration)}ms</span>
                    </div>
                    <div class="metric">
                        <span>Slowest Test:</span>
                        <span class="metric-value">${report.performance.slowestTests[0]?.duration || 0}ms</span>
                    </div>
                    <div class="metric">
                        <span>Cache Hit Rate:</span>
                        <span class="metric-value">${report.cache.cacheHitRate.toFixed(1)}%</span>
                    </div>
                    <div class="metric">
                        <span>Time Saved:</span>
                        <span class="metric-value success">${Math.round(report.cache.timeSaved / 1000)}s</span>
                    </div>
                </div>

                <div class="card">
                    <h3>Flakiness</h3>
                    <div class="metric">
                        <span>Total Flaky Tests:</span>
                        <span class="metric-value">${report.flakiness.totalFlakyTests}</span>
                    </div>
                    <div class="metric">
                        <span>High Risk:</span>
                        <span class="metric-value error">${report.flakiness.highRiskTests.length}</span>
                    </div>
                    <div class="metric">
                        <span>Medium Risk:</span>
                        <span class="metric-value warning">${report.flakiness.mediumRiskTests.length}</span>
                    </div>
                    <div class="metric">
                        <span>Low Risk:</span>
                        <span class="metric-value">${report.flakiness.lowRiskTests.length}</span>
                    </div>
                </div>
            </div>

            ${report.flakiness.highRiskTests.length > 0 ? `
            <div class="card">
                <h3>High Risk Flaky Tests</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Test</th>
                            <th>Flakiness Score</th>
                            <th>Failures</th>
                            <th>Total Runs</th>
                            <th>Patterns</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.flakiness.highRiskTests.slice(0, 10).map(test => `
                        <tr class="flaky-high">
                            <td>${test.testName}</td>
                            <td>${test.flakinessScore.toFixed(1)}</td>
                            <td>${test.failures.length}</td>
                            <td>${test.totalRuns}</td>
                            <td>${test.patterns.join(', ')}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}

            ${report.performance.slowestTests.length > 0 ? `
            <div class="card">
                <h3>Slowest Tests</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Test</th>
                            <th>Suite</th>
                            <th>Duration</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.performance.slowestTests.slice(0, 10).map(test => `
                        <tr>
                            <td>${test.testName}</td>
                            <td>${test.suiteName}</td>
                            <td>${test.duration}ms</td>
                            <td class="${test.status === 'passed' ? 'success' : 'error'}">${test.status}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}

            ${report.recommendations.length > 0 ? `
            <div class="recommendations">
                <h3>Recommendations</h3>
                <ul>
                    ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
        </div>
    </div>
</body>
</html>
    `

    return html
  }

  /**
   * Save report to disk
   */
  private async saveReport(report: TestExecutionSummary): Promise<void> {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true })
      
      const timestamp = new Date(report.timestamp).toISOString().replace(/[:.]/g, '-')
      const jsonFile = path.join(this.reportsDir, `report-${timestamp}.json`)
      const htmlFile = path.join(this.reportsDir, `report-${timestamp}.html`)
      const latestFile = path.join(this.reportsDir, 'latest.json')
      const latestHtmlFile = path.join(this.reportsDir, 'latest.html')
      
      const html = await this.generateHTMLReport(report)
      
      await Promise.all([
        fs.writeFile(jsonFile, JSON.stringify(report, null, 2)),
        fs.writeFile(htmlFile, html),
        fs.writeFile(latestFile, JSON.stringify(report, null, 2)),
        fs.writeFile(latestHtmlFile, html),
        fs.writeFile(this.trendsFile, JSON.stringify(this.trends, null, 2)),
      ])
      
      console.log(`📊 Test report saved: ${htmlFile}`)
    } catch (error) {
      console.warn('Failed to save test report:', error)
    }
  }

  /**
   * Load trend data
   */
  private async loadTrends(): Promise<void> {
    try {
      const data = await fs.readFile(this.trendsFile, 'utf-8')
      this.trends = JSON.parse(data)
    } catch (error) {
      // Ignore errors, start with empty trends
    }
  }

  /**
   * Get trend data
   */
  getTrends(): TrendData[] {
    return [...this.trends]
  }

  /**
   * Print summary to console
   */
  printSummary(report: TestExecutionSummary): void {
    console.log('\n📊 Test Execution Summary')
    console.log('=' .repeat(50))
    console.log(`Tests: ${report.passedTests}/${report.totalTests} passed (${((report.passedTests / report.totalTests) * 100).toFixed(1)}%)`)
    console.log(`Duration: ${Math.round(report.duration / 1000)}s`)
    
    if (report.coverage) {
      console.log(`Coverage: ${report.coverage.lines.percentage.toFixed(1)}% lines, ${report.coverage.functions.percentage.toFixed(1)}% functions`)
    }
    
    console.log(`Cache: ${report.cache.cacheHitRate.toFixed(1)}% hit rate, ${Math.round(report.cache.timeSaved / 1000)}s saved`)
    console.log(`Flaky Tests: ${report.flakiness.totalFlakyTests} (${report.flakiness.highRiskTests.length} high risk)`)
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:')
      report.recommendations.slice(0, 5).forEach(rec => console.log(`  • ${rec}`))
      if (report.recommendations.length > 5) {
        console.log(`  ... and ${report.recommendations.length - 5} more`)
      }
    }
    
    console.log(`\n📄 Full report: tests/performance/reports/latest.html`)
  }
}

// Global test reporter instance
export const testReporter = TestReporter.getInstance()