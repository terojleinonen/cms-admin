/**
 * Jest Integration for Test Monitoring
 * Integrates monitoring with Jest test execution
 */

import { TestHealthMonitor, TestSuite, TestResult } from './test-health-monitor';
import { PerformanceMonitor } from './performance-monitor';
import { CoverageTracker } from './coverage-tracker';

export class JestMonitoringIntegration {
  private healthMonitor: TestHealthMonitor;
  private performanceMonitor: PerformanceMonitor;
  private coverageTracker: CoverageTracker;
  private currentSuite: Partial<TestSuite> = {};
  private suiteStartTime: number = 0;

  constructor() {
    this.healthMonitor = TestHealthMonitor.getInstance();
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.coverageTracker = CoverageTracker.getInstance();
  }

  /**
   * Setup Jest hooks for monitoring
   */
  public setupJestHooks(): void {
    // Global setup
    beforeAll(() => {
      this.suiteStartTime = Date.now();
      this.currentSuite = {
        results: [],
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0
      };
    });

    // Global teardown
    afterAll(async () => {
      if (this.currentSuite.name) {
        const duration = Date.now() - this.suiteStartTime;
        
        const suite: TestSuite = {
          name: this.currentSuite.name,
          results: this.currentSuite.results || [],
          totalTests: this.currentSuite.totalTests || 0,
          passedTests: this.currentSuite.passedTests || 0,
          failedTests: this.currentSuite.failedTests || 0,
          skippedTests: this.currentSuite.skippedTests || 0,
          duration
        };

        // Record suite results
        this.healthMonitor.recordTestSuite(suite);

        // Generate coverage report if this is the last suite
        try {
          await this.coverageTracker.generateCoverageReport();
        } catch (error) {
          // Coverage generation is optional
        }
      }
    });

    // Test-level hooks
    beforeEach(() => {
      // Test setup if needed
    });

    afterEach(() => {
      // Test cleanup if needed
    });
  }

  /**
   * Record test result
   */
  public recordTestResult(testName: string, status: 'passed' | 'failed' | 'skipped', duration: number, error?: string): void {
    const result: TestResult = {
      testName,
      status,
      duration,
      error,
      timestamp: new Date()
    };

    if (!this.currentSuite.results) {
      this.currentSuite.results = [];
    }
    
    this.currentSuite.results.push(result);
    this.currentSuite.totalTests = (this.currentSuite.totalTests || 0) + 1;

    switch (status) {
      case 'passed':
        this.currentSuite.passedTests = (this.currentSuite.passedTests || 0) + 1;
        break;
      case 'failed':
        this.currentSuite.failedTests = (this.currentSuite.failedTests || 0) + 1;
        break;
      case 'skipped':
        this.currentSuite.skippedTests = (this.currentSuite.skippedTests || 0) + 1;
        break;
    }

    // Record performance metrics
    const testType = this.determineTestType(testName);
    this.performanceMonitor.recordTestMetrics({
      testName,
      suiteName: this.currentSuite.name || 'unknown',
      duration,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date(),
      type: testType
    });
  }

  /**
   * Set current suite name
   */
  public setSuiteName(name: string): void {
    this.currentSuite.name = name;
  }

  /**
   * Determine test type based on test name or file path
   */
  private determineTestType(testName: string): 'unit' | 'integration' | 'component' | 'e2e' {
    const lowerName = testName.toLowerCase();
    
    if (lowerName.includes('integration') || lowerName.includes('api')) {
      return 'integration';
    }
    
    if (lowerName.includes('component') || lowerName.includes('render')) {
      return 'component';
    }
    
    if (lowerName.includes('e2e') || lowerName.includes('end-to-end')) {
      return 'e2e';
    }
    
    return 'unit';
  }
}

// Jest reporter for monitoring integration
export class MonitoringReporter {
  private integration: JestMonitoringIntegration;

  constructor() {
    this.integration = new JestMonitoringIntegration();
  }

  onRunStart(): void {
    console.log('🔍 Test monitoring started');
  }

  onTestSuiteStart(suite: any): void {
    this.integration.setSuiteName(suite.testPath);
  }

  onTestCaseResult(test: any, testCaseResult: any): void {
    const status = testCaseResult.status === 'passed' ? 'passed' : 
                  testCaseResult.status === 'failed' ? 'failed' : 'skipped';
    
    this.integration.recordTestResult(
      testCaseResult.fullName,
      status,
      testCaseResult.duration || 0,
      testCaseResult.failureMessages?.[0]
    );
  }

  onRunComplete(): void {
    console.log('✅ Test monitoring completed');
  }
}

// Export singleton instance
export const jestMonitoring = new JestMonitoringIntegration();