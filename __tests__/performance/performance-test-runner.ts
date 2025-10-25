/**
 * Performance Test Runner
 * Utility for running and reporting performance tests
 */

import { execSync } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface PerformanceTestResult {
  testName: string;
  duration: number;
  passed: boolean;
  metrics: {
    avgResponseTime?: number;
    throughput?: number;
    errorRate?: number;
    memoryUsage?: number;
    cacheHitRate?: number;
  };
  details?: any;
}

interface PerformanceReport {
  timestamp: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
  results: PerformanceTestResult[];
  summary: {
    avgResponseTime: number;
    avgThroughput: number;
    avgErrorRate: number;
    peakMemoryUsage: number;
  };
}

export class PerformanceTestRunner {
  private results: PerformanceTestResult[] = [];
  private startTime: number = 0;

  async runAllPerformanceTests(): Promise<PerformanceReport> {
    console.log('🚀 Starting Performance Test Suite...\n');
    this.startTime = Date.now();

    const testFiles = [
      'permission-system-performance.test.ts',
      'cache-performance.test.ts',
      'concurrent-user-performance.test.ts',
      'load-testing.test.ts',
    ];

    for (const testFile of testFiles) {
      await this.runTestFile(testFile);
    }

    const report = this.generateReport();
    this.saveReport(report);
    this.printSummary(report);

    return report;
  }

  private async runTestFile(testFile: string): Promise<void> {
    console.log(`📊 Running ${testFile}...`);
    
    try {
      const testPath = join('__tests__/performance', testFile);
      const startTime = Date.now();
      
      // Run the test file
      const output = execSync(
        `npm run test -- --testPathPattern=${testPath} --verbose --silent`,
        { 
          encoding: 'utf8',
          timeout: 120000, // 2 minutes timeout
        }
      );

      const duration = Date.now() - startTime;
      const passed = !output.includes('FAIL') && !output.includes('failed');

      // Parse basic metrics from output (simplified)
      const metrics = this.parseTestOutput(output);

      this.results.push({
        testName: testFile.replace('.test.ts', ''),
        duration,
        passed,
        metrics,
        details: { output: output.slice(-500) } // Keep last 500 chars
      });

      console.log(`✅ ${testFile} completed in ${duration}ms`);
      
    } catch (error) {
      console.error(`❌ ${testFile} failed:`, error);
      
      this.results.push({
        testName: testFile.replace('.test.ts', ''),
        duration: 0,
        passed: false,
        metrics: {},
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  private parseTestOutput(output: string): any {
    const metrics: any = {};
    
    // Extract basic metrics from test output
    // This is a simplified parser - in a real implementation,
    // you might want to use structured logging or test reporters
    
    const responseTimeMatch = output.match(/response time.*?(\d+(?:\.\d+)?)ms/i);
    if (responseTimeMatch) {
      metrics.avgResponseTime = parseFloat(responseTimeMatch[1]);
    }

    const throughputMatch = output.match(/(\d+(?:\.\d+)?)\s*(?:ops?\/sec|rps)/i);
    if (throughputMatch) {
      metrics.throughput = parseFloat(throughputMatch[1]);
    }

    const errorRateMatch = output.match(/error rate.*?(\d+(?:\.\d+)?)%/i);
    if (errorRateMatch) {
      metrics.errorRate = parseFloat(errorRateMatch[1]);
    }

    return metrics;
  }

  private generateReport(): PerformanceReport {
    const totalDuration = Date.now() - this.startTime;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = this.results.length - passedTests;

    // Calculate summary metrics
    const validMetrics = this.results.filter(r => r.metrics.avgResponseTime);
    const avgResponseTime = validMetrics.length > 0 
      ? validMetrics.reduce((sum, r) => sum + (r.metrics.avgResponseTime || 0), 0) / validMetrics.length
      : 0;

    const throughputMetrics = this.results.filter(r => r.metrics.throughput);
    const avgThroughput = throughputMetrics.length > 0
      ? throughputMetrics.reduce((sum, r) => sum + (r.metrics.throughput || 0), 0) / throughputMetrics.length
      : 0;

    const errorRateMetrics = this.results.filter(r => r.metrics.errorRate !== undefined);
    const avgErrorRate = errorRateMetrics.length > 0
      ? errorRateMetrics.reduce((sum, r) => sum + (r.metrics.errorRate || 0), 0) / errorRateMetrics.length
      : 0;

    const memoryMetrics = this.results.filter(r => r.metrics.memoryUsage);
    const peakMemoryUsage = memoryMetrics.length > 0
      ? Math.max(...memoryMetrics.map(r => r.metrics.memoryUsage || 0))
      : 0;

    return {
      timestamp: new Date().toISOString(),
      totalTests: this.results.length,
      passedTests,
      failedTests,
      totalDuration,
      results: this.results,
      summary: {
        avgResponseTime,
        avgThroughput,
        avgErrorRate,
        peakMemoryUsage,
      }
    };
  }

  private saveReport(report: PerformanceReport): void {
    const reportsDir = join(process.cwd(), 'performance-reports');
    
    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = join(reportsDir, `performance-report-${timestamp}.json`);
    
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Performance report saved to: ${reportPath}`);
  }

  private printSummary(report: PerformanceReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('📈 PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`🕐 Total Duration: ${report.totalDuration}ms`);
    console.log(`📊 Tests: ${report.totalTests} total, ${report.passedTests} passed, ${report.failedTests} failed`);
    
    if (report.summary.avgResponseTime > 0) {
      console.log(`⚡ Avg Response Time: ${report.summary.avgResponseTime.toFixed(2)}ms`);
    }
    
    if (report.summary.avgThroughput > 0) {
      console.log(`🚀 Avg Throughput: ${report.summary.avgThroughput.toFixed(2)} ops/sec`);
    }
    
    if (report.summary.avgErrorRate >= 0) {
      console.log(`❌ Avg Error Rate: ${report.summary.avgErrorRate.toFixed(2)}%`);
    }
    
    if (report.summary.peakMemoryUsage > 0) {
      console.log(`💾 Peak Memory: ${(report.summary.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
    }

    console.log('\n📋 Test Results:');
    report.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      console.log(`  ${status} ${result.testName.padEnd(30)} ${duration.padStart(8)}`);
    });

    // Performance thresholds check
    console.log('\n🎯 Performance Thresholds:');
    this.checkThresholds(report);
    
    console.log('='.repeat(60) + '\n');
  }

  private checkThresholds(report: PerformanceReport): void {
    const thresholds = {
      maxAvgResponseTime: 50, // ms
      minThroughput: 100, // ops/sec
      maxErrorRate: 5, // %
      maxMemoryUsage: 100, // MB
    };

    const checks = [
      {
        name: 'Response Time',
        value: report.summary.avgResponseTime,
        threshold: thresholds.maxAvgResponseTime,
        unit: 'ms',
        passed: report.summary.avgResponseTime <= thresholds.maxAvgResponseTime || report.summary.avgResponseTime === 0,
      },
      {
        name: 'Throughput',
        value: report.summary.avgThroughput,
        threshold: thresholds.minThroughput,
        unit: 'ops/sec',
        passed: report.summary.avgThroughput >= thresholds.minThroughput || report.summary.avgThroughput === 0,
      },
      {
        name: 'Error Rate',
        value: report.summary.avgErrorRate,
        threshold: thresholds.maxErrorRate,
        unit: '%',
        passed: report.summary.avgErrorRate <= thresholds.maxErrorRate,
      },
      {
        name: 'Memory Usage',
        value: report.summary.peakMemoryUsage / 1024 / 1024,
        threshold: thresholds.maxMemoryUsage,
        unit: 'MB',
        passed: (report.summary.peakMemoryUsage / 1024 / 1024) <= thresholds.maxMemoryUsage || report.summary.peakMemoryUsage === 0,
      },
    ];

    checks.forEach(check => {
      const status = check.passed ? '✅' : '⚠️';
      const value = check.value > 0 ? check.value.toFixed(2) : 'N/A';
      console.log(`  ${status} ${check.name}: ${value} ${check.unit} (threshold: ${check.threshold} ${check.unit})`);
    });
  }
}

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new PerformanceTestRunner();
  
  runner.runAllPerformanceTests()
    .then(report => {
      const exitCode = report.failedTests > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('Performance test runner failed:', error);
      process.exit(1);
    });
}