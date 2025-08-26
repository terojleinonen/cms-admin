/**
 * Performance Monitor
 * Monitors test execution performance and provides optimization recommendations
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface PerformanceMetrics {
  testName: string;
  suiteName: string;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: Date;
  type: 'unit' | 'integration' | 'component' | 'e2e';
}

export interface PerformanceReport {
  timestamp: Date;
  totalDuration: number;
  testCount: number;
  averageDuration: number;
  slowestTests: PerformanceMetrics[];
  memoryLeaks: MemoryLeak[];
  recommendations: string[];
  trends: PerformanceTrend[];
}

export interface MemoryLeak {
  testName: string;
  suiteName: string;
  memoryIncrease: number;
  timestamp: Date;
}

export interface PerformanceTrend {
  date: string;
  averageDuration: number;
  testCount: number;
  memoryUsage: number;
}

export interface PerformanceThresholds {
  unitTestDuration: number; // milliseconds
  integrationTestDuration: number;
  componentTestDuration: number;
  e2eTestDuration: number;
  totalSuiteDuration: number;
  memoryUsageThreshold: number; // MB
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metricsHistory: PerformanceMetrics[] = [];
  private performanceHistoryPath: string;
  private thresholds: PerformanceThresholds;
  private baselineMemory: NodeJS.MemoryUsage;

  private constructor() {
    this.performanceHistoryPath = join(process.cwd(), 'tests/monitoring/performance-history.json');
    this.thresholds = {
      unitTestDuration: 1000, // 1 second
      integrationTestDuration: 5000, // 5 seconds
      componentTestDuration: 3000, // 3 seconds
      e2eTestDuration: 10000, // 10 seconds
      totalSuiteDuration: 300000, // 5 minutes
      memoryUsageThreshold: 100 // 100 MB
    };
    this.baselineMemory = process.memoryUsage();
    this.loadPerformanceHistory();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Record test performance metrics
   */
  public recordTestMetrics(metrics: PerformanceMetrics): void {
    this.metricsHistory.push(metrics);
    this.savePerformanceHistory();
  }

  /**
   * Start performance tracking for a test
   */
  public startTest(testName: string, suiteName: string, type: PerformanceMetrics['type']): () => void {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    return () => {
      const endTime = Date.now();
      const endMemory = process.memoryUsage();
      
      const metrics: PerformanceMetrics = {
        testName,
        suiteName,
        duration: endTime - startTime,
        memoryUsage: {
          rss: endMemory.rss - startMemory.rss,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          external: endMemory.external - startMemory.external,
          arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers
        },
        timestamp: new Date(),
        type
      };

      this.recordTestMetrics(metrics);
    };
  }

  /**
   * Generate performance report
   */
  public generatePerformanceReport(): PerformanceReport {
    const recentMetrics = this.getRecentMetrics(7); // Last 7 days
    
    const totalDuration = recentMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    const testCount = recentMetrics.length;
    const averageDuration = testCount > 0 ? totalDuration / testCount : 0;

    const slowestTests = this.identifySlowTests(recentMetrics);
    const memoryLeaks = this.identifyMemoryLeaks(recentMetrics);
    const recommendations = this.generateRecommendations(recentMetrics);
    const trends = this.calculatePerformanceTrends();

    return {
      timestamp: new Date(),
      totalDuration,
      testCount,
      averageDuration,
      slowestTests,
      memoryLeaks,
      recommendations,
      trends
    };
  }

  /**
   * Check performance thresholds
   */
  public checkPerformanceThresholds(): {
    passed: boolean;
    violations: string[];
    warnings: string[];
  } {
    const recentMetrics = this.getRecentMetrics(1); // Last day
    const violations: string[] = [];
    const warnings: string[] = [];

    // Check individual test durations
    recentMetrics.forEach(metric => {
      let threshold: number;
      
      switch (metric.type) {
        case 'unit':
          threshold = this.thresholds.unitTestDuration;
          break;
        case 'integration':
          threshold = this.thresholds.integrationTestDuration;
          break;
        case 'component':
          threshold = this.thresholds.componentTestDuration;
          break;
        case 'e2e':
          threshold = this.thresholds.e2eTestDuration;
          break;
        default:
          threshold = this.thresholds.unitTestDuration;
      }

      if (metric.duration > threshold) {
        violations.push(`${metric.suiteName}::${metric.testName} exceeded ${metric.type} test threshold: ${metric.duration}ms > ${threshold}ms`);
      }

      // Check memory usage
      const memoryUsageMB = metric.memoryUsage.heapUsed / (1024 * 1024);
      if (memoryUsageMB > this.thresholds.memoryUsageThreshold) {
        warnings.push(`${metric.suiteName}::${metric.testName} high memory usage: ${memoryUsageMB.toFixed(2)}MB`);
      }
    });

    // Check total suite duration
    const totalDuration = recentMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    if (totalDuration > this.thresholds.totalSuiteDuration) {
      violations.push(`Total test suite duration exceeded threshold: ${(totalDuration / 1000).toFixed(2)}s > ${(this.thresholds.totalSuiteDuration / 1000).toFixed(2)}s`);
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings
    };
  }

  /**
   * Generate performance optimization recommendations
   */
  public generateOptimizationRecommendations(): string[] {
    const recentMetrics = this.getRecentMetrics(7);
    const recommendations: string[] = [];

    // Identify slow tests by type
    const slowUnitTests = recentMetrics.filter(m => 
      m.type === 'unit' && m.duration > this.thresholds.unitTestDuration / 2
    );
    
    const slowIntegrationTests = recentMetrics.filter(m => 
      m.type === 'integration' && m.duration > this.thresholds.integrationTestDuration / 2
    );

    if (slowUnitTests.length > 0) {
      recommendations.push(`Optimize ${slowUnitTests.length} slow unit tests - consider mocking external dependencies`);
      recommendations.push(`Slowest unit tests: ${slowUnitTests.slice(0, 3).map(t => t.testName).join(', ')}`);
    }

    if (slowIntegrationTests.length > 0) {
      recommendations.push(`Optimize ${slowIntegrationTests.length} slow integration tests - consider database connection pooling`);
    }

    // Check for memory-intensive tests
    const memoryIntensiveTests = recentMetrics.filter(m => 
      m.memoryUsage.heapUsed > 50 * 1024 * 1024 // 50MB
    );

    if (memoryIntensiveTests.length > 0) {
      recommendations.push(`${memoryIntensiveTests.length} tests using excessive memory - check for memory leaks`);
    }

    // Check for test parallelization opportunities
    const totalSequentialTime = recentMetrics.reduce((sum, m) => sum + m.duration, 0);
    const estimatedParallelTime = Math.max(...recentMetrics.map(m => m.duration));
    
    if (totalSequentialTime > estimatedParallelTime * 2) {
      recommendations.push('Consider running tests in parallel to reduce total execution time');
    }

    // Check for database-heavy tests
    const dbHeavyTests = recentMetrics.filter(m => 
      m.type === 'integration' && m.duration > 3000
    );

    if (dbHeavyTests.length > 0) {
      recommendations.push('Use database transactions and proper cleanup for faster integration tests');
    }

    // Check for component test optimization
    const slowComponentTests = recentMetrics.filter(m => 
      m.type === 'component' && m.duration > 1000
    );

    if (slowComponentTests.length > 0) {
      recommendations.push('Optimize component tests by using shallow rendering and mocking child components');
    }

    return recommendations;
  }

  /**
   * Generate markdown performance report
   */
  public generateMarkdownReport(): string {
    const report = this.generatePerformanceReport();
    const thresholdCheck = this.checkPerformanceThresholds();
    const optimizations = this.generateOptimizationRecommendations();

    const markdown = [
      '# Test Performance Report',
      `Generated: ${report.timestamp.toISOString()}`,
      '',
      '## Summary',
      `- **Total Tests**: ${report.testCount}`,
      `- **Total Duration**: ${(report.totalDuration / 1000).toFixed(2)}s`,
      `- **Average Duration**: ${report.averageDuration.toFixed(2)}ms`,
      `- **Performance Status**: ${thresholdCheck.passed ? '✅ Passed' : '❌ Failed'}`,
      '',
      '## Thresholds',
      '| Test Type | Threshold | Status |',
      '|-----------|-----------|--------|',
      `| Unit Tests | ${this.thresholds.unitTestDuration}ms | ${this.getThresholdStatus('unit', report)} |`,
      `| Integration Tests | ${this.thresholds.integrationTestDuration}ms | ${this.getThresholdStatus('integration', report)} |`,
      `| Component Tests | ${this.thresholds.componentTestDuration}ms | ${this.getThresholdStatus('component', report)} |`,
      `| E2E Tests | ${this.thresholds.e2eTestDuration}ms | ${this.getThresholdStatus('e2e', report)} |`,
      ''
    ];

    if (thresholdCheck.violations.length > 0) {
      markdown.push('## Performance Violations');
      thresholdCheck.violations.forEach(violation => {
        markdown.push(`- ❌ ${violation}`);
      });
      markdown.push('');
    }

    if (thresholdCheck.warnings.length > 0) {
      markdown.push('## Warnings');
      thresholdCheck.warnings.forEach(warning => {
        markdown.push(`- ⚠️ ${warning}`);
      });
      markdown.push('');
    }

    if (report.slowestTests.length > 0) {
      markdown.push('## Slowest Tests');
      markdown.push('| Test | Suite | Duration | Type |');
      markdown.push('|------|-------|----------|------|');
      report.slowestTests.slice(0, 10).forEach(test => {
        markdown.push(`| ${test.testName} | ${test.suiteName} | ${test.duration}ms | ${test.type} |`);
      });
      markdown.push('');
    }

    if (report.memoryLeaks.length > 0) {
      markdown.push('## Potential Memory Leaks');
      report.memoryLeaks.forEach(leak => {
        markdown.push(`- ${leak.suiteName}::${leak.testName}: +${(leak.memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      });
      markdown.push('');
    }

    if (optimizations.length > 0) {
      markdown.push('## Optimization Recommendations');
      optimizations.forEach(rec => {
        markdown.push(`- ${rec}`);
      });
      markdown.push('');
    }

    if (report.trends.length > 1) {
      markdown.push('## Performance Trends (Last 7 Days)');
      markdown.push('| Date | Avg Duration | Test Count | Memory Usage |');
      markdown.push('|------|--------------|------------|--------------|');
      report.trends.slice(-7).forEach(trend => {
        markdown.push(`| ${trend.date} | ${trend.averageDuration.toFixed(2)}ms | ${trend.testCount} | ${trend.memoryUsage.toFixed(2)}MB |`);
      });
    }

    return markdown.join('\n');
  }

  /**
   * Identify slow tests
   */
  private identifySlowTests(metrics: PerformanceMetrics[]): PerformanceMetrics[] {
    return metrics
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 20); // Top 20 slowest
  }

  /**
   * Identify potential memory leaks
   */
  private identifyMemoryLeaks(metrics: PerformanceMetrics[]): MemoryLeak[] {
    const leaks: MemoryLeak[] = [];
    
    // Group by test name and look for increasing memory usage
    const testGroups: Record<string, PerformanceMetrics[]> = {};
    
    metrics.forEach(metric => {
      const key = `${metric.suiteName}::${metric.testName}`;
      if (!testGroups[key]) {
        testGroups[key] = [];
      }
      testGroups[key].push(metric);
    });

    Object.keys(testGroups).forEach(testKey => {
      const testMetrics = testGroups[testKey].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      if (testMetrics.length >= 3) {
        const recent = testMetrics.slice(-3);
        const avgRecentMemory = recent.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / recent.length;
        
        const older = testMetrics.slice(0, -3);
        if (older.length > 0) {
          const avgOlderMemory = older.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / older.length;
          const memoryIncrease = avgRecentMemory - avgOlderMemory;
          
          if (memoryIncrease > 10 * 1024 * 1024) { // 10MB increase
            const [suiteName, testName] = testKey.split('::');
            leaks.push({
              testName,
              suiteName,
              memoryIncrease,
              timestamp: recent[recent.length - 1].timestamp
            });
          }
        }
      }
    });

    return leaks.sort((a, b) => b.memoryIncrease - a.memoryIncrease);
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: PerformanceMetrics[]): string[] {
    const recommendations: string[] = [];
    
    // Check for slow unit tests
    const slowUnitTests = metrics.filter(m => 
      m.type === 'unit' && m.duration > this.thresholds.unitTestDuration / 2
    );

    if (slowUnitTests.length > 0) {
      recommendations.push(`${slowUnitTests.length} unit tests are slower than expected - consider better mocking`);
    }

    // Check for memory usage
    const highMemoryTests = metrics.filter(m => 
      m.memoryUsage.heapUsed > 50 * 1024 * 1024
    );

    if (highMemoryTests.length > 0) {
      recommendations.push(`${highMemoryTests.length} tests using high memory - check for leaks`);
    }

    return recommendations;
  }

  /**
   * Calculate performance trends
   */
  private calculatePerformanceTrends(): PerformanceTrend[] {
    const trends: PerformanceTrend[] = [];
    const dailyData: Record<string, PerformanceMetrics[]> = {};

    // Group metrics by date
    this.metricsHistory.forEach(metric => {
      const date = new Date(metric.timestamp).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = [];
      }
      dailyData[date].push(metric);
    });

    // Calculate daily trends
    Object.keys(dailyData).sort().forEach(date => {
      const dayMetrics = dailyData[date];
      const totalDuration = dayMetrics.reduce((sum, m) => sum + m.duration, 0);
      const totalMemory = dayMetrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0);

      trends.push({
        date,
        averageDuration: totalDuration / dayMetrics.length,
        testCount: dayMetrics.length,
        memoryUsage: totalMemory / dayMetrics.length / 1024 / 1024 // MB
      });
    });

    return trends;
  }

  /**
   * Get threshold status for test type
   */
  private getThresholdStatus(type: PerformanceMetrics['type'], report: PerformanceReport): string {
    const typeTests = this.getRecentMetrics(1).filter(m => m.type === type);
    if (typeTests.length === 0) return '➖ No tests';

    let threshold: number;
    switch (type) {
      case 'unit': threshold = this.thresholds.unitTestDuration; break;
      case 'integration': threshold = this.thresholds.integrationTestDuration; break;
      case 'component': threshold = this.thresholds.componentTestDuration; break;
      case 'e2e': threshold = this.thresholds.e2eTestDuration; break;
      default: threshold = this.thresholds.unitTestDuration;
    }

    const violations = typeTests.filter(t => t.duration > threshold);
    return violations.length === 0 ? '✅ Passed' : `❌ ${violations.length} violations`;
  }

  /**
   * Get recent metrics within specified days
   */
  private getRecentMetrics(days: number): PerformanceMetrics[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.metricsHistory.filter(metric => 
      new Date(metric.timestamp) >= cutoffDate
    );
  }

  /**
   * Load performance history from file
   */
  private loadPerformanceHistory(): void {
    try {
      if (existsSync(this.performanceHistoryPath)) {
        const data = readFileSync(this.performanceHistoryPath, 'utf-8');
        this.metricsHistory = JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to load performance history:', error);
      this.metricsHistory = [];
    }
  }

  /**
   * Save performance history to file
   */
  private savePerformanceHistory(): void {
    try {
      // Keep only last 30 days of data
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      
      this.metricsHistory = this.metricsHistory.filter(metric => 
        new Date(metric.timestamp) >= cutoffDate
      );

      writeFileSync(this.performanceHistoryPath, JSON.stringify(this.metricsHistory, null, 2));
    } catch (error) {
      console.error('Failed to save performance history:', error);
    }
  }

  /**
   * Update performance thresholds
   */
  public updateThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Get current thresholds
   */
  public getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }
}