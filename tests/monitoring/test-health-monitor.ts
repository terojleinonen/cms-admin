/**
 * Test Health Monitor
 * Monitors test execution health, tracks failures, and provides alerting
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface TestResult {
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  timestamp: Date;
}

export interface TestSuite {
  name: string;
  results: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  coverage?: CoverageData;
}

export interface CoverageData {
  branches: number;
  functions: number;
  lines: number;
  statements: number;
}

export interface TestHealthMetrics {
  totalSuites: number;
  totalTests: number;
  passRate: number;
  averageDuration: number;
  flakyTests: string[];
  slowTests: string[];
  coverageMetrics: CoverageData;
  trends: TestTrend[];
}

export interface TestTrend {
  date: string;
  passRate: number;
  duration: number;
  coverage: CoverageData;
}

export interface AlertConfig {
  passRateThreshold: number;
  durationThreshold: number;
  coverageThreshold: CoverageData;
  flakyTestThreshold: number;
  webhookUrl?: string;
  emailRecipients?: string[];
}

export class TestHealthMonitor {
  private static instance: TestHealthMonitor;
  private healthDataPath: string;
  private alertConfig: AlertConfig;
  private testHistory: TestSuite[] = [];

  private constructor() {
    this.healthDataPath = join(process.cwd(), 'tests/monitoring/health-data.json');
    this.alertConfig = {
      passRateThreshold: 95,
      durationThreshold: 300000, // 5 minutes
      coverageThreshold: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      },
      flakyTestThreshold: 3
    };
    this.loadHealthData();
  }

  public static getInstance(): TestHealthMonitor {
    if (!TestHealthMonitor.instance) {
      TestHealthMonitor.instance = new TestHealthMonitor();
    }
    return TestHealthMonitor.instance;
  }

  /**
   * Record test suite results
   */
  public recordTestSuite(suite: TestSuite): void {
    this.testHistory.push(suite);
    this.saveHealthData();
    this.checkAlerts(suite);
  }

  /**
   * Get current health metrics
   */
  public getHealthMetrics(): TestHealthMetrics {
    const recentSuites = this.getRecentSuites(30); // Last 30 days
    
    const totalTests = recentSuites.reduce((sum, suite) => sum + suite.totalTests, 0);
    const passedTests = recentSuites.reduce((sum, suite) => sum + suite.passedTests, 0);
    const totalDuration = recentSuites.reduce((sum, suite) => sum + suite.duration, 0);

    const flakyTests = this.identifyFlakyTests();
    const slowTests = this.identifySlowTests();
    const trends = this.calculateTrends();
    const coverageMetrics = this.getLatestCoverage();

    return {
      totalSuites: recentSuites.length,
      totalTests,
      passRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
      averageDuration: recentSuites.length > 0 ? totalDuration / recentSuites.length : 0,
      flakyTests,
      slowTests,
      coverageMetrics,
      trends
    };
  }

  /**
   * Generate health report
   */
  public generateHealthReport(): string {
    const metrics = this.getHealthMetrics();
    const report = [
      '# Test Health Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Summary',
      `- Total Test Suites: ${metrics.totalSuites}`,
      `- Total Tests: ${metrics.totalTests}`,
      `- Pass Rate: ${metrics.passRate.toFixed(2)}%`,
      `- Average Duration: ${(metrics.averageDuration / 1000).toFixed(2)}s`,
      '',
      '## Coverage Metrics',
      `- Branches: ${metrics.coverageMetrics.branches}%`,
      `- Functions: ${metrics.coverageMetrics.functions}%`,
      `- Lines: ${metrics.coverageMetrics.lines}%`,
      `- Statements: ${metrics.coverageMetrics.statements}%`,
      '',
      '## Issues',
      `### Flaky Tests (${metrics.flakyTests.length})`,
      ...metrics.flakyTests.map(test => `- ${test}`),
      '',
      `### Slow Tests (${metrics.slowTests.length})`,
      ...metrics.slowTests.map(test => `- ${test}`),
      '',
      '## Trends',
      '| Date | Pass Rate | Duration | Coverage |',
      '|------|-----------|----------|----------|',
      ...metrics.trends.slice(-7).map(trend => 
        `| ${trend.date} | ${trend.passRate.toFixed(1)}% | ${(trend.duration / 1000).toFixed(1)}s | ${trend.coverage.lines}% |`
      )
    ];

    return report.join('\n');
  }

  /**
   * Check for alerts and send notifications
   */
  private checkAlerts(suite: TestSuite): void {
    const alerts: string[] = [];
    const passRate = (suite.passedTests / suite.totalTests) * 100;

    // Check pass rate
    if (passRate < this.alertConfig.passRateThreshold) {
      alerts.push(`Pass rate dropped to ${passRate.toFixed(2)}% (threshold: ${this.alertConfig.passRateThreshold}%)`);
    }

    // Check duration
    if (suite.duration > this.alertConfig.durationThreshold) {
      alerts.push(`Test duration exceeded threshold: ${(suite.duration / 1000).toFixed(2)}s (threshold: ${(this.alertConfig.durationThreshold / 1000).toFixed(2)}s)`);
    }

    // Check coverage
    if (suite.coverage) {
      const coverage = suite.coverage;
      const threshold = this.alertConfig.coverageThreshold;
      
      if (coverage.branches < threshold.branches) {
        alerts.push(`Branch coverage below threshold: ${coverage.branches}% (threshold: ${threshold.branches}%)`);
      }
      if (coverage.functions < threshold.functions) {
        alerts.push(`Function coverage below threshold: ${coverage.functions}% (threshold: ${threshold.functions}%)`);
      }
      if (coverage.lines < threshold.lines) {
        alerts.push(`Line coverage below threshold: ${coverage.lines}% (threshold: ${threshold.lines}%)`);
      }
      if (coverage.statements < threshold.statements) {
        alerts.push(`Statement coverage below threshold: ${coverage.statements}% (threshold: ${threshold.statements}%)`);
      }
    }

    if (alerts.length > 0) {
      this.sendAlerts(alerts, suite);
    }
  }

  /**
   * Send alerts via configured channels
   */
  private sendAlerts(alerts: string[], suite: TestSuite): void {
    const alertMessage = [
      `🚨 Test Health Alert - ${suite.name}`,
      `Time: ${new Date().toISOString()}`,
      '',
      'Issues detected:',
      ...alerts.map(alert => `- ${alert}`),
      '',
      `Suite: ${suite.name}`,
      `Tests: ${suite.passedTests}/${suite.totalTests} passed`,
      `Duration: ${(suite.duration / 1000).toFixed(2)}s`
    ].join('\n');

    // Log to console (in real implementation, would send to webhook/email)
    console.warn('TEST HEALTH ALERT:', alertMessage);
    
    // Save alert to file for tracking
    const alertsPath = join(process.cwd(), 'tests/monitoring/alerts.log');
    const alertEntry = `${new Date().toISOString()} - ${suite.name}\n${alertMessage}\n\n`;
    
    try {
      const existingAlerts = existsSync(alertsPath) ? readFileSync(alertsPath, 'utf-8') : '';
      writeFileSync(alertsPath, existingAlerts + alertEntry);
    } catch (error) {
      console.error('Failed to save alert:', error);
    }
  }

  /**
   * Identify flaky tests (tests that fail intermittently)
   */
  private identifyFlakyTests(): string[] {
    const testFailures: Record<string, number> = {};
    const testRuns: Record<string, number> = {};

    // Analyze recent test history
    const recentSuites = this.getRecentSuites(7); // Last 7 days
    
    recentSuites.forEach(suite => {
      suite.results.forEach(result => {
        const testKey = `${suite.name}::${result.testName}`;
        testRuns[testKey] = (testRuns[testKey] || 0) + 1;
        
        if (result.status === 'failed') {
          testFailures[testKey] = (testFailures[testKey] || 0) + 1;
        }
      });
    });

    // Identify tests that fail sometimes but not always
    const flakyTests: string[] = [];
    Object.keys(testFailures).forEach(testKey => {
      const failures = testFailures[testKey];
      const runs = testRuns[testKey];
      
      if (failures >= this.alertConfig.flakyTestThreshold && failures < runs) {
        flakyTests.push(`${testKey} (${failures}/${runs} failures)`);
      }
    });

    return flakyTests;
  }

  /**
   * Identify slow tests
   */
  private identifySlowTests(): string[] {
    const slowTests: string[] = [];
    const recentSuites = this.getRecentSuites(7);

    recentSuites.forEach(suite => {
      suite.results.forEach(result => {
        if (result.duration > 5000) { // Tests taking more than 5 seconds
          slowTests.push(`${suite.name}::${result.testName} (${(result.duration / 1000).toFixed(2)}s)`);
        }
      });
    });

    return slowTests.sort((a, b) => {
      const aDuration = parseFloat(a.match(/\((\d+\.\d+)s\)$/)?.[1] || '0');
      const bDuration = parseFloat(b.match(/\((\d+\.\d+)s\)$/)?.[1] || '0');
      return bDuration - aDuration;
    }).slice(0, 10); // Top 10 slowest
  }

  /**
   * Calculate trends over time
   */
  private calculateTrends(): TestTrend[] {
    const trends: TestTrend[] = [];
    const dailyData: Record<string, TestSuite[]> = {};

    // Group suites by date
    this.testHistory.forEach(suite => {
      const date = new Date(suite.results[0]?.timestamp || Date.now()).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = [];
      }
      dailyData[date].push(suite);
    });

    // Calculate daily metrics
    Object.keys(dailyData).sort().forEach(date => {
      const suites = dailyData[date];
      const totalTests = suites.reduce((sum, suite) => sum + suite.totalTests, 0);
      const passedTests = suites.reduce((sum, suite) => sum + suite.passedTests, 0);
      const totalDuration = suites.reduce((sum, suite) => sum + suite.duration, 0);
      
      // Get latest coverage for the day
      const latestSuite = suites[suites.length - 1];
      const coverage = latestSuite.coverage || { branches: 0, functions: 0, lines: 0, statements: 0 };

      trends.push({
        date,
        passRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
        duration: totalDuration / suites.length,
        coverage
      });
    });

    return trends;
  }

  /**
   * Get latest coverage metrics
   */
  private getLatestCoverage(): CoverageData {
    const recentSuites = this.getRecentSuites(1);
    const latestSuite = recentSuites[0];
    
    return latestSuite?.coverage || {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0
    };
  }

  /**
   * Get recent test suites within specified days
   */
  private getRecentSuites(days: number): TestSuite[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.testHistory.filter(suite => {
      const suiteDate = new Date(suite.results[0]?.timestamp || 0);
      return suiteDate >= cutoffDate;
    });
  }

  /**
   * Load health data from file
   */
  private loadHealthData(): void {
    try {
      if (existsSync(this.healthDataPath)) {
        const data = readFileSync(this.healthDataPath, 'utf-8');
        this.testHistory = JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to load health data:', error);
      this.testHistory = [];
    }
  }

  /**
   * Save health data to file
   */
  private saveHealthData(): void {
    try {
      // Keep only last 90 days of data
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      
      this.testHistory = this.testHistory.filter(suite => {
        const suiteDate = new Date(suite.results[0]?.timestamp || 0);
        return suiteDate >= cutoffDate;
      });

      writeFileSync(this.healthDataPath, JSON.stringify(this.testHistory, null, 2));
    } catch (error) {
      console.error('Failed to save health data:', error);
    }
  }

  /**
   * Update alert configuration
   */
  public updateAlertConfig(config: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
  }

  /**
   * Get alert configuration
   */
  public getAlertConfig(): AlertConfig {
    return { ...this.alertConfig };
  }
}