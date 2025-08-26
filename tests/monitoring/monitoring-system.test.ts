/**
 * Test Monitoring System Integration Test
 * Verifies all monitoring components work together correctly
 */

import { TestHealthMonitor } from './test-health-monitor';
import { CoverageTracker } from './coverage-tracker';
import { PerformanceMonitor } from './performance-monitor';
import { TestMaintenance } from './test-maintenance';
import { QualityGates } from './quality-gates';
import { JestMonitoringIntegration } from './jest-integration';
import { GitHubActionsIntegration } from './github-actions-integration';
import { TestMonitoringCLI } from './cli';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

describe('Test Monitoring System', () => {
  let healthMonitor: TestHealthMonitor;
  let coverageTracker: CoverageTracker;
  let performanceMonitor: PerformanceMonitor;
  let maintenance: TestMaintenance;
  let qualityGates: QualityGates;
  let jestIntegration: JestMonitoringIntegration;
  let githubIntegration: GitHubActionsIntegration;
  let cli: TestMonitoringCLI;

  beforeAll(() => {
    healthMonitor = TestHealthMonitor.getInstance();
    coverageTracker = CoverageTracker.getInstance();
    performanceMonitor = PerformanceMonitor.getInstance();
    maintenance = TestMaintenance.getInstance();
    qualityGates = QualityGates.getInstance();
    jestIntegration = new JestMonitoringIntegration();
    githubIntegration = new GitHubActionsIntegration();
    cli = new TestMonitoringCLI();
  });

  afterAll(() => {
    // Clean up test files
    const testFiles = [
      'tests/monitoring/health-data.json',
      'tests/monitoring/coverage-history.json',
      'tests/monitoring/performance-history.json',
      'tests/monitoring/maintenance.log',
      'tests/monitoring/alerts.log',
      'test-dashboard.md'
    ];

    testFiles.forEach(file => {
      const fullPath = join(process.cwd(), file);
      if (existsSync(fullPath)) {
        try {
          unlinkSync(fullPath);
        } catch {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('Health Monitor', () => {
    it('should record test suite results', () => {
      const testSuite = {
        name: 'Sample Test Suite',
        results: [
          {
            testName: 'should pass test',
            status: 'passed' as const,
            duration: 100,
            timestamp: new Date()
          },
          {
            testName: 'should fail test',
            status: 'failed' as const,
            duration: 200,
            error: 'Test failed',
            timestamp: new Date()
          }
        ],
        totalTests: 2,
        passedTests: 1,
        failedTests: 1,
        skippedTests: 0,
        duration: 300
      };

      healthMonitor.recordTestSuite(testSuite);
      
      const metrics = healthMonitor.getHealthMetrics();
      expect(metrics.totalTests).toBeGreaterThan(0);
      expect(metrics.passRate).toBeLessThan(100);
    });

    it('should generate health report', () => {
      const report = healthMonitor.generateHealthReport();
      
      expect(report).toContain('# Test Health Report');
      expect(report).toContain('## Summary');
      expect(report).toContain('## Coverage Metrics');
      expect(report).toContain('## Issues');
    });

    it('should identify flaky tests', () => {
      // Record multiple runs of the same test with different outcomes
      for (let i = 0; i < 5; i++) {
        const testSuite = {
          name: 'Flaky Test Suite',
          results: [
            {
              testName: 'flaky test',
              status: i % 2 === 0 ? 'passed' as const : 'failed' as const,
              duration: 100,
              timestamp: new Date()
            }
          ],
          totalTests: 1,
          passedTests: i % 2 === 0 ? 1 : 0,
          failedTests: i % 2 === 0 ? 0 : 1,
          skippedTests: 0,
          duration: 100
        };

        healthMonitor.recordTestSuite(testSuite);
      }

      const metrics = healthMonitor.getHealthMetrics();
      expect(metrics.flakyTests.length).toBeGreaterThan(0);
    });
  });

  describe('Coverage Tracker', () => {
    it('should track coverage thresholds', () => {
      const thresholds = coverageTracker.getThresholds();
      
      expect(thresholds.branches).toBe(80);
      expect(thresholds.functions).toBe(80);
      expect(thresholds.lines).toBe(80);
      expect(thresholds.statements).toBe(80);
    });

    it('should update thresholds', () => {
      const newThresholds = {
        branches: 85,
        functions: 85
      };

      coverageTracker.updateThresholds(newThresholds);
      
      const updatedThresholds = coverageTracker.getThresholds();
      expect(updatedThresholds.branches).toBe(85);
      expect(updatedThresholds.functions).toBe(85);
      expect(updatedThresholds.lines).toBe(80); // Should remain unchanged
    });

    it('should provide coverage improvement suggestions', () => {
      const suggestions = coverageTracker.getCoverageImprovementSuggestions();
      
      expect(Array.isArray(suggestions)).toBe(true);
      // Should provide suggestions even without coverage data
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Monitor', () => {
    it('should record test metrics', () => {
      const metrics = {
        testName: 'performance test',
        suiteName: 'Performance Suite',
        duration: 1500,
        memoryUsage: process.memoryUsage(),
        timestamp: new Date(),
        type: 'unit' as const
      };

      performanceMonitor.recordTestMetrics(metrics);
      
      const report = performanceMonitor.generatePerformanceReport();
      expect(report.testCount).toBeGreaterThan(0);
    });

    it('should check performance thresholds', () => {
      const thresholdCheck = performanceMonitor.checkPerformanceThresholds();
      
      expect(thresholdCheck).toHaveProperty('passed');
      expect(thresholdCheck).toHaveProperty('violations');
      expect(thresholdCheck).toHaveProperty('warnings');
      expect(Array.isArray(thresholdCheck.violations)).toBe(true);
      expect(Array.isArray(thresholdCheck.warnings)).toBe(true);
    });

    it('should generate optimization recommendations', () => {
      const recommendations = performanceMonitor.generateOptimizationRecommendations();
      
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should track test performance with helper', () => {
      const endTest = performanceMonitor.startTest('helper test', 'Helper Suite', 'unit');
      
      // Simulate test execution
      setTimeout(() => {
        endTest();
        
        const report = performanceMonitor.generatePerformanceReport();
        expect(report.testCount).toBeGreaterThan(0);
      }, 10);
    });
  });

  describe('Test Maintenance', () => {
    it('should list available tasks', () => {
      const tasks = maintenance.getTasks();
      
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThan(0);
      
      const taskNames = tasks.map(t => t.id);
      expect(taskNames).toContain('cleanup-artifacts');
      expect(taskNames).toContain('cleanup-coverage');
      expect(taskNames).toContain('optimize-database');
    });

    it('should enable/disable tasks', () => {
      const taskId = 'cleanup-artifacts';
      
      maintenance.setTaskEnabled(taskId, false);
      let tasks = maintenance.getTasks();
      let task = tasks.find(t => t.id === taskId);
      expect(task?.enabled).toBe(false);
      
      maintenance.setTaskEnabled(taskId, true);
      tasks = maintenance.getTasks();
      task = tasks.find(t => t.id === taskId);
      expect(task?.enabled).toBe(true);
    });

    it('should update configuration', () => {
      const newConfig = {
        retentionDays: 45,
        maxLogSize: 15
      };

      maintenance.updateConfig(newConfig);
      
      const config = maintenance.getConfig();
      expect(config.retentionDays).toBe(45);
      expect(config.maxLogSize).toBe(15);
    });

    it('should run individual maintenance task', async () => {
      const result = await maintenance.runTask('validate-structure');
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
    });
  });

  describe('Quality Gates', () => {
    it('should have default gates registered', () => {
      const gates = qualityGates.getGates();
      
      expect(Array.isArray(gates)).toBe(true);
      expect(gates.length).toBeGreaterThan(0);
      
      const gateIds = gates.map(g => g.id);
      expect(gateIds).toContain('coverage-gate');
      expect(gateIds).toContain('performance-gate');
      expect(gateIds).toContain('reliability-gate');
    });

    it('should run quality gates', async () => {
      const report = await qualityGates.runQualityGates();
      
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('overallScore');
      expect(report).toHaveProperty('passed');
      expect(report).toHaveProperty('gateResults');
      expect(report).toHaveProperty('summary');
      expect(Array.isArray(report.gateResults)).toBe(true);
    });

    it('should generate markdown report', async () => {
      const report = await qualityGates.runQualityGates();
      const markdown = qualityGates.generateMarkdownReport(report);
      
      expect(markdown).toContain('# Test Quality Gates Report');
      expect(markdown).toContain('## Summary');
      expect(markdown).toContain('## Gate Results');
    });

    it('should update quality policy', () => {
      const newPolicy = {
        coverage: {
          minimumBranches: 85,
          minimumFunctions: 85,
          minimumLines: 85,
          minimumStatements: 85,
          allowedDecrease: 1
        }
      };

      qualityGates.updatePolicy(newPolicy);
      
      const policy = qualityGates.getPolicy();
      expect(policy.coverage.minimumBranches).toBe(85);
    });
  });

  describe('Jest Integration', () => {
    it('should setup Jest hooks', () => {
      expect(() => {
        jestIntegration.setupJestHooks();
      }).not.toThrow();
    });

    it('should record test results', () => {
      jestIntegration.setSuiteName('Integration Test Suite');
      
      expect(() => {
        jestIntegration.recordTestResult('test 1', 'passed', 100);
        jestIntegration.recordTestResult('test 2', 'failed', 200, 'Error message');
        jestIntegration.recordTestResult('test 3', 'skipped', 0);
      }).not.toThrow();
    });
  });

  describe('GitHub Actions Integration', () => {
    it('should generate workflow file', () => {
      const workflow = githubIntegration.generateWorkflowFile();
      
      expect(workflow).toContain('name: Test Quality Gates');
      expect(workflow).toContain('on:');
      expect(workflow).toContain('jobs:');
      expect(workflow).toContain('npm test -- --coverage');
      expect(workflow).toContain('npm run test:monitor quality');
    });

    it('should run quality gates for CI', async () => {
      const output = await githubIntegration.runQualityGatesForCI();
      
      expect(output).toHaveProperty('summary');
      expect(output).toHaveProperty('annotations');
      expect(output).toHaveProperty('artifacts');
      expect(output).toHaveProperty('jobSummary');
      expect(Array.isArray(output.annotations)).toBe(true);
      expect(Array.isArray(output.artifacts)).toBe(true);
    });
  });

  describe('CLI Integration', () => {
    it('should execute help command', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await cli.execute(['help']);
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test Monitoring CLI'));
      
      consoleSpy.mockRestore();
    });

    it('should handle unknown commands', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
      
      await cli.execute(['unknown-command']);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown command'));
      
      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });
  });

  describe('System Integration', () => {
    it('should work together as a complete system', async () => {
      // Record some test data
      const testSuite = {
        name: 'Integration Test Suite',
        results: [
          {
            testName: 'integration test 1',
            status: 'passed' as const,
            duration: 150,
            timestamp: new Date()
          },
          {
            testName: 'integration test 2',
            status: 'passed' as const,
            duration: 200,
            timestamp: new Date()
          }
        ],
        totalTests: 2,
        passedTests: 2,
        failedTests: 0,
        skippedTests: 0,
        duration: 350
      };

      healthMonitor.recordTestSuite(testSuite);

      // Record performance metrics
      performanceMonitor.recordTestMetrics({
        testName: 'integration test 1',
        suiteName: 'Integration Test Suite',
        duration: 150,
        memoryUsage: process.memoryUsage(),
        timestamp: new Date(),
        type: 'integration'
      });

      // Run quality gates
      const qualityReport = await qualityGates.runQualityGates();
      
      // Verify the system works together
      expect(qualityReport.passed).toBeDefined();
      expect(qualityReport.overallScore).toBeGreaterThanOrEqual(0);
      expect(qualityReport.gateResults.length).toBeGreaterThan(0);

      // Generate comprehensive report
      const healthReport = healthMonitor.generateHealthReport();
      const performanceReport = performanceMonitor.generateMarkdownReport();
      
      expect(healthReport).toContain('Test Health Report');
      expect(performanceReport).toContain('Test Performance Report');
    });

    it('should maintain data consistency across components', () => {
      // Verify that all components maintain their state correctly
      const healthMetrics = healthMonitor.getHealthMetrics();
      const performanceReport = performanceMonitor.generatePerformanceReport();
      const maintenanceConfig = maintenance.getConfig();
      const qualityPolicy = qualityGates.getPolicy();
      
      expect(healthMetrics).toBeDefined();
      expect(performanceReport).toBeDefined();
      expect(maintenanceConfig).toBeDefined();
      expect(qualityPolicy).toBeDefined();
      
      // Verify data types
      expect(typeof healthMetrics.passRate).toBe('number');
      expect(typeof performanceReport.averageDuration).toBe('number');
      expect(typeof maintenanceConfig.retentionDays).toBe('number');
      expect(typeof qualityPolicy.coverage.minimumBranches).toBe('number');
    });
  });
});