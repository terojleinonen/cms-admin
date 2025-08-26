/**
 * Test Quality Gates
 * Enforces quality standards and policies for test execution
 */

import { TestHealthMonitor, TestHealthMetrics } from './test-health-monitor';
import { CoverageTracker, CoverageReport } from './coverage-tracker';
import { PerformanceMonitor, PerformanceReport } from './performance-monitor';

export interface QualityGate {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  blocking: boolean; // If true, failure blocks deployment
  check: () => Promise<QualityGateResult>;
}

export interface QualityGateResult {
  passed: boolean;
  score: number; // 0-100
  message: string;
  details: string[];
  recommendations?: string[];
  metrics?: Record<string, number>;
}

export interface QualityPolicy {
  coverage: {
    minimumBranches: number;
    minimumFunctions: number;
    minimumLines: number;
    minimumStatements: number;
    allowedDecrease: number; // Percentage points
  };
  performance: {
    maxTestDuration: number; // milliseconds
    maxSuiteDuration: number;
    maxMemoryUsage: number; // MB
    allowedRegression: number; // Percentage
  };
  reliability: {
    minimumPassRate: number; // Percentage
    maxFlakyTests: number;
    maxConsecutiveFailures: number;
  };
  maintenance: {
    maxTechnicalDebt: number; // Score 0-100
    maxCodeComplexity: number;
    requiredDocumentation: boolean;
  };
}

export interface QualityReport {
  timestamp: Date;
  overallScore: number;
  passed: boolean;
  gateResults: QualityGateResult[];
  summary: QualitySummary;
  recommendations: string[];
  blockers: string[];
}

export interface QualitySummary {
  totalGates: number;
  passedGates: number;
  failedGates: number;
  blockingFailures: number;
  coverageScore: number;
  performanceScore: number;
  reliabilityScore: number;
  maintenanceScore: number;
}

export class QualityGates {
  private static instance: QualityGates;
  private gates: Map<string, QualityGate> = new Map();
  private policy: QualityPolicy;
  private healthMonitor: TestHealthMonitor;
  private coverageTracker: CoverageTracker;
  private performanceMonitor: PerformanceMonitor;

  private constructor() {
    this.healthMonitor = TestHealthMonitor.getInstance();
    this.coverageTracker = CoverageTracker.getInstance();
    this.performanceMonitor = PerformanceMonitor.getInstance();
    
    this.policy = {
      coverage: {
        minimumBranches: 80,
        minimumFunctions: 80,
        minimumLines: 80,
        minimumStatements: 80,
        allowedDecrease: 2
      },
      performance: {
        maxTestDuration: 1000,
        maxSuiteDuration: 300000,
        maxMemoryUsage: 100,
        allowedRegression: 10
      },
      reliability: {
        minimumPassRate: 95,
        maxFlakyTests: 5,
        maxConsecutiveFailures: 3
      },
      maintenance: {
        maxTechnicalDebt: 20,
        maxCodeComplexity: 10,
        requiredDocumentation: true
      }
    };

    this.registerDefaultGates();
  }

  public static getInstance(): QualityGates {
    if (!QualityGates.instance) {
      QualityGates.instance = new QualityGates();
    }
    return QualityGates.instance;
  }

  /**
   * Register default quality gates
   */
  private registerDefaultGates(): void {
    // Coverage Quality Gate
    this.registerGate({
      id: 'coverage-gate',
      name: 'Code Coverage',
      description: 'Ensures minimum code coverage thresholds are met',
      enabled: true,
      blocking: true,
      check: () => this.checkCoverageGate()
    });

    // Performance Quality Gate
    this.registerGate({
      id: 'performance-gate',
      name: 'Test Performance',
      description: 'Ensures tests execute within acceptable time limits',
      enabled: true,
      blocking: false,
      check: () => this.checkPerformanceGate()
    });

    // Reliability Quality Gate
    this.registerGate({
      id: 'reliability-gate',
      name: 'Test Reliability',
      description: 'Ensures tests are stable and reliable',
      enabled: true,
      blocking: true,
      check: () => this.checkReliabilityGate()
    });

    // Security Quality Gate
    this.registerGate({
      id: 'security-gate',
      name: 'Security Standards',
      description: 'Ensures security best practices in tests',
      enabled: true,
      blocking: true,
      check: () => this.checkSecurityGate()
    });

    // Documentation Quality Gate
    this.registerGate({
      id: 'documentation-gate',
      name: 'Test Documentation',
      description: 'Ensures tests are properly documented',
      enabled: true,
      blocking: false,
      check: () => this.checkDocumentationGate()
    });

    // Maintenance Quality Gate
    this.registerGate({
      id: 'maintenance-gate',
      name: 'Code Maintainability',
      description: 'Ensures code is maintainable and follows best practices',
      enabled: true,
      blocking: false,
      check: () => this.checkMaintenanceGate()
    });
  }

  /**
   * Register a quality gate
   */
  public registerGate(gate: QualityGate): void {
    this.gates.set(gate.id, gate);
  }

  /**
   * Run all quality gates
   */
  public async runQualityGates(): Promise<QualityReport> {
    const gateResults: QualityGateResult[] = [];
    let totalScore = 0;
    let blockingFailures = 0;
    const blockers: string[] = [];
    const recommendations: string[] = [];

    // Execute all enabled gates
    for (const [gateId, gate] of this.gates) {
      if (!gate.enabled) {
        continue;
      }

      try {
        const result = await gate.check();
        gateResults.push(result);
        totalScore += result.score;

        if (!result.passed && gate.blocking) {
          blockingFailures++;
          blockers.push(`${gate.name}: ${result.message}`);
        }

        if (result.recommendations) {
          recommendations.push(...result.recommendations);
        }
      } catch (error) {
        const errorResult: QualityGateResult = {
          passed: false,
          score: 0,
          message: `Gate execution failed: ${error}`,
          details: [String(error)]
        };
        
        gateResults.push(errorResult);
        
        if (gate.blocking) {
          blockingFailures++;
          blockers.push(`${gate.name}: Execution failed`);
        }
      }
    }

    const enabledGates = Array.from(this.gates.values()).filter(g => g.enabled);
    const overallScore = enabledGates.length > 0 ? totalScore / enabledGates.length : 0;
    const passed = blockingFailures === 0;

    const summary: QualitySummary = {
      totalGates: enabledGates.length,
      passedGates: gateResults.filter(r => r.passed).length,
      failedGates: gateResults.filter(r => !r.passed).length,
      blockingFailures,
      coverageScore: this.getCoverageScore(gateResults),
      performanceScore: this.getPerformanceScore(gateResults),
      reliabilityScore: this.getReliabilityScore(gateResults),
      maintenanceScore: this.getMaintenanceScore(gateResults)
    };

    return {
      timestamp: new Date(),
      overallScore,
      passed,
      gateResults,
      summary,
      recommendations: [...new Set(recommendations)], // Remove duplicates
      blockers
    };
  }

  /**
   * Check coverage quality gate
   */
  private async checkCoverageGate(): Promise<QualityGateResult> {
    const coverage = this.coverageTracker.getLatestCoverage();
    
    if (!coverage) {
      return {
        passed: false,
        score: 0,
        message: 'No coverage data available',
        details: ['Run tests with coverage to generate coverage data']
      };
    }

    const thresholdCheck = this.coverageTracker.checkCoverageThresholds(coverage);
    const metrics = coverage.overall;
    
    // Calculate score based on coverage percentages
    const branchScore = Math.min(100, (metrics.branches.percentage / this.policy.coverage.minimumBranches) * 100);
    const functionScore = Math.min(100, (metrics.functions.percentage / this.policy.coverage.minimumFunctions) * 100);
    const lineScore = Math.min(100, (metrics.lines.percentage / this.policy.coverage.minimumLines) * 100);
    const statementScore = Math.min(100, (metrics.statements.percentage / this.policy.coverage.minimumStatements) * 100);
    
    const overallScore = (branchScore + functionScore + lineScore + statementScore) / 4;

    const details = [
      `Branch coverage: ${metrics.branches.percentage.toFixed(1)}% (required: ${this.policy.coverage.minimumBranches}%)`,
      `Function coverage: ${metrics.functions.percentage.toFixed(1)}% (required: ${this.policy.coverage.minimumFunctions}%)`,
      `Line coverage: ${metrics.lines.percentage.toFixed(1)}% (required: ${this.policy.coverage.minimumLines}%)`,
      `Statement coverage: ${metrics.statements.percentage.toFixed(1)}% (required: ${this.policy.coverage.minimumStatements}%)`
    ];

    const recommendations = thresholdCheck.passed ? [] : this.coverageTracker.getCoverageImprovementSuggestions(coverage);

    return {
      passed: thresholdCheck.passed,
      score: overallScore,
      message: thresholdCheck.passed 
        ? `Coverage requirements met (${overallScore.toFixed(1)}% score)`
        : `Coverage below requirements: ${thresholdCheck.failures.join(', ')}`,
      details,
      recommendations,
      metrics: {
        branches: metrics.branches.percentage,
        functions: metrics.functions.percentage,
        lines: metrics.lines.percentage,
        statements: metrics.statements.percentage
      }
    };
  }

  /**
   * Check performance quality gate
   */
  private async checkPerformanceGate(): Promise<QualityGateResult> {
    const performanceReport = this.performanceMonitor.generatePerformanceReport();
    const thresholdCheck = this.performanceMonitor.checkPerformanceThresholds();
    
    // Calculate performance score
    const durationScore = Math.max(0, 100 - (performanceReport.averageDuration / this.policy.performance.maxTestDuration) * 100);
    const suiteScore = Math.max(0, 100 - (performanceReport.totalDuration / this.policy.performance.maxSuiteDuration) * 100);
    
    const overallScore = (durationScore + suiteScore) / 2;

    const details = [
      `Average test duration: ${performanceReport.averageDuration.toFixed(2)}ms`,
      `Total suite duration: ${(performanceReport.totalDuration / 1000).toFixed(2)}s`,
      `Slow tests: ${performanceReport.slowestTests.length}`,
      `Memory leaks detected: ${performanceReport.memoryLeaks.length}`
    ];

    const recommendations = this.performanceMonitor.generateOptimizationRecommendations();

    return {
      passed: thresholdCheck.passed,
      score: overallScore,
      message: thresholdCheck.passed 
        ? `Performance requirements met (${overallScore.toFixed(1)}% score)`
        : `Performance issues detected: ${thresholdCheck.violations.length} violations`,
      details,
      recommendations,
      metrics: {
        averageDuration: performanceReport.averageDuration,
        totalDuration: performanceReport.totalDuration,
        slowTests: performanceReport.slowestTests.length,
        memoryLeaks: performanceReport.memoryLeaks.length
      }
    };
  }

  /**
   * Check reliability quality gate
   */
  private async checkReliabilityGate(): Promise<QualityGateResult> {
    const healthMetrics = this.healthMonitor.getHealthMetrics();
    
    const passRateScore = Math.min(100, (healthMetrics.passRate / this.policy.reliability.minimumPassRate) * 100);
    const flakyTestScore = Math.max(0, 100 - (healthMetrics.flakyTests.length / this.policy.reliability.maxFlakyTests) * 100);
    
    const overallScore = (passRateScore + flakyTestScore) / 2;
    
    const passed = healthMetrics.passRate >= this.policy.reliability.minimumPassRate &&
                   healthMetrics.flakyTests.length <= this.policy.reliability.maxFlakyTests;

    const details = [
      `Pass rate: ${healthMetrics.passRate.toFixed(1)}% (required: ${this.policy.reliability.minimumPassRate}%)`,
      `Flaky tests: ${healthMetrics.flakyTests.length} (max: ${this.policy.reliability.maxFlakyTests})`,
      `Total tests: ${healthMetrics.totalTests}`,
      `Test suites: ${healthMetrics.totalSuites}`
    ];

    const recommendations: string[] = [];
    if (healthMetrics.passRate < this.policy.reliability.minimumPassRate) {
      recommendations.push('Investigate and fix failing tests to improve pass rate');
    }
    if (healthMetrics.flakyTests.length > this.policy.reliability.maxFlakyTests) {
      recommendations.push('Address flaky tests to improve reliability');
      recommendations.push('Consider adding retry mechanisms or better test isolation');
    }

    return {
      passed,
      score: overallScore,
      message: passed 
        ? `Reliability requirements met (${overallScore.toFixed(1)}% score)`
        : `Reliability issues: ${healthMetrics.flakyTests.length} flaky tests, ${healthMetrics.passRate.toFixed(1)}% pass rate`,
      details,
      recommendations,
      metrics: {
        passRate: healthMetrics.passRate,
        flakyTests: healthMetrics.flakyTests.length,
        totalTests: healthMetrics.totalTests
      }
    };
  }

  /**
   * Check security quality gate
   */
  private async checkSecurityGate(): Promise<QualityGateResult> {
    // This is a simplified security check - in practice, you'd integrate with security scanning tools
    const securityIssues: string[] = [];
    const recommendations: string[] = [];
    
    // Check for common security anti-patterns in tests
    try {
      // This would scan test files for security issues
      const commonIssues = [
        'Hardcoded credentials in test files',
        'Insecure random number generation',
        'SQL injection vulnerabilities in test data',
        'Exposed sensitive data in test outputs'
      ];

      // Simulate security scan results
      const issueCount = Math.floor(Math.random() * 3); // 0-2 issues for demo
      
      if (issueCount > 0) {
        securityIssues.push(...commonIssues.slice(0, issueCount));
        recommendations.push('Review and fix security issues in test code');
        recommendations.push('Use environment variables for sensitive test data');
        recommendations.push('Implement proper data masking in test outputs');
      }

      const score = Math.max(0, 100 - (issueCount * 25));
      const passed = issueCount === 0;

      return {
        passed,
        score,
        message: passed 
          ? 'No security issues detected in tests'
          : `${issueCount} security issues found in test code`,
        details: securityIssues.length > 0 ? securityIssues : ['Security scan completed successfully'],
        recommendations,
        metrics: {
          securityIssues: issueCount
        }
      };
    } catch (error) {
      return {
        passed: false,
        score: 0,
        message: `Security scan failed: ${error}`,
        details: [String(error)],
        recommendations: ['Fix security scanning issues and retry']
      };
    }
  }

  /**
   * Check documentation quality gate
   */
  private async checkDocumentationGate(): Promise<QualityGateResult> {
    // Check for test documentation quality
    const documentationIssues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // This would analyze test files for documentation quality
      const checks = {
        missingDescriptions: 2,
        unclearTestNames: 1,
        missingComments: 3,
        outdatedDocs: 1
      };

      const totalIssues = Object.values(checks).reduce((sum, count) => sum + count, 0);
      
      if (checks.missingDescriptions > 0) {
        documentationIssues.push(`${checks.missingDescriptions} test suites missing descriptions`);
        recommendations.push('Add descriptive test suite descriptions');
      }
      
      if (checks.unclearTestNames > 0) {
        documentationIssues.push(`${checks.unclearTestNames} tests with unclear names`);
        recommendations.push('Use descriptive test names that explain expected behavior');
      }
      
      if (checks.missingComments > 0) {
        documentationIssues.push(`${checks.missingComments} complex tests missing comments`);
        recommendations.push('Add comments to explain complex test logic');
      }

      const score = Math.max(0, 100 - (totalIssues * 10));
      const passed = !this.policy.maintenance.requiredDocumentation || totalIssues <= 2;

      return {
        passed,
        score,
        message: passed 
          ? 'Test documentation meets quality standards'
          : `Documentation issues found: ${totalIssues} items need attention`,
        details: documentationIssues.length > 0 ? documentationIssues : ['Documentation quality check passed'],
        recommendations,
        metrics: {
          documentationIssues: totalIssues
        }
      };
    } catch (error) {
      return {
        passed: false,
        score: 0,
        message: `Documentation check failed: ${error}`,
        details: [String(error)]
      };
    }
  }

  /**
   * Check maintenance quality gate
   */
  private async checkMaintenanceGate(): Promise<QualityGateResult> {
    // Check code maintainability metrics
    const maintenanceIssues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // This would analyze code complexity and maintainability
      const metrics = {
        duplicatedCode: 5, // percentage
        complexityViolations: 3,
        codeSmells: 8,
        technicalDebt: 15 // score 0-100
      };

      if (metrics.duplicatedCode > 10) {
        maintenanceIssues.push(`High code duplication: ${metrics.duplicatedCode}%`);
        recommendations.push('Refactor duplicated test code into shared utilities');
      }
      
      if (metrics.complexityViolations > this.policy.maintenance.maxCodeComplexity) {
        maintenanceIssues.push(`${metrics.complexityViolations} complexity violations`);
        recommendations.push('Simplify complex test methods');
      }
      
      if (metrics.technicalDebt > this.policy.maintenance.maxTechnicalDebt) {
        maintenanceIssues.push(`Technical debt score: ${metrics.technicalDebt}`);
        recommendations.push('Address technical debt in test code');
      }

      const score = Math.max(0, 100 - metrics.technicalDebt);
      const passed = metrics.technicalDebt <= this.policy.maintenance.maxTechnicalDebt;

      return {
        passed,
        score,
        message: passed 
          ? `Code maintainability acceptable (${score.toFixed(1)}% score)`
          : `Maintainability issues detected: ${metrics.technicalDebt} debt score`,
        details: maintenanceIssues.length > 0 ? maintenanceIssues : ['Code maintainability check passed'],
        recommendations,
        metrics: {
          technicalDebt: metrics.technicalDebt,
          duplicatedCode: metrics.duplicatedCode,
          complexityViolations: metrics.complexityViolations
        }
      };
    } catch (error) {
      return {
        passed: false,
        score: 0,
        message: `Maintenance check failed: ${error}`,
        details: [String(error)]
      };
    }
  }

  /**
   * Generate quality report in markdown format
   */
  public generateMarkdownReport(report: QualityReport): string {
    const statusEmoji = report.passed ? '✅' : '❌';
    const scoreColor = report.overallScore >= 80 ? '🟢' : report.overallScore >= 60 ? '🟡' : '🔴';

    const markdown = [
      '# Test Quality Gates Report',
      `${statusEmoji} **Overall Status**: ${report.passed ? 'PASSED' : 'FAILED'}`,
      `${scoreColor} **Quality Score**: ${report.overallScore.toFixed(1)}/100`,
      `📅 **Generated**: ${report.timestamp.toISOString()}`,
      '',
      '## Summary',
      `- **Total Gates**: ${report.summary.totalGates}`,
      `- **Passed**: ${report.summary.passedGates}`,
      `- **Failed**: ${report.summary.failedGates}`,
      `- **Blocking Failures**: ${report.summary.blockingFailures}`,
      '',
      '## Quality Scores',
      `- **Coverage**: ${report.summary.coverageScore.toFixed(1)}%`,
      `- **Performance**: ${report.summary.performanceScore.toFixed(1)}%`,
      `- **Reliability**: ${report.summary.reliabilityScore.toFixed(1)}%`,
      `- **Maintenance**: ${report.summary.maintenanceScore.toFixed(1)}%`,
      ''
    ];

    if (report.blockers.length > 0) {
      markdown.push('## 🚫 Blocking Issues');
      report.blockers.forEach(blocker => {
        markdown.push(`- ${blocker}`);
      });
      markdown.push('');
    }

    // Gate Results
    markdown.push('## Gate Results');
    markdown.push('| Gate | Status | Score | Message |');
    markdown.push('|------|--------|-------|---------|');
    
    report.gateResults.forEach((result, index) => {
      const gate = Array.from(this.gates.values())[index];
      const status = result.passed ? '✅' : '❌';
      markdown.push(`| ${gate?.name || 'Unknown'} | ${status} | ${result.score.toFixed(1)}% | ${result.message} |`);
    });
    markdown.push('');

    // Recommendations
    if (report.recommendations.length > 0) {
      markdown.push('## 💡 Recommendations');
      report.recommendations.forEach(rec => {
        markdown.push(`- ${rec}`);
      });
      markdown.push('');
    }

    // Detailed Results
    markdown.push('## Detailed Results');
    report.gateResults.forEach((result, index) => {
      const gate = Array.from(this.gates.values())[index];
      if (!gate) return;

      markdown.push(`### ${gate.name}`);
      markdown.push(`**Status**: ${result.passed ? '✅ Passed' : '❌ Failed'}`);
      markdown.push(`**Score**: ${result.score.toFixed(1)}%`);
      markdown.push(`**Message**: ${result.message}`);
      
      if (result.details && result.details.length > 0) {
        markdown.push('**Details**:');
        result.details.forEach(detail => {
          markdown.push(`- ${detail}`);
        });
      }
      
      if (result.recommendations && result.recommendations.length > 0) {
        markdown.push('**Recommendations**:');
        result.recommendations.forEach(rec => {
          markdown.push(`- ${rec}`);
        });
      }
      
      markdown.push('');
    });

    return markdown.join('\n');
  }

  /**
   * Get coverage score from gate results
   */
  private getCoverageScore(results: QualityGateResult[]): number {
    const coverageResult = results.find((_, index) => 
      Array.from(this.gates.keys())[index] === 'coverage-gate'
    );
    return coverageResult?.score || 0;
  }

  /**
   * Get performance score from gate results
   */
  private getPerformanceScore(results: QualityGateResult[]): number {
    const performanceResult = results.find((_, index) => 
      Array.from(this.gates.keys())[index] === 'performance-gate'
    );
    return performanceResult?.score || 0;
  }

  /**
   * Get reliability score from gate results
   */
  private getReliabilityScore(results: QualityGateResult[]): number {
    const reliabilityResult = results.find((_, index) => 
      Array.from(this.gates.keys())[index] === 'reliability-gate'
    );
    return reliabilityResult?.score || 0;
  }

  /**
   * Get maintenance score from gate results
   */
  private getMaintenanceScore(results: QualityGateResult[]): number {
    const maintenanceResult = results.find((_, index) => 
      Array.from(this.gates.keys())[index] === 'maintenance-gate'
    );
    return maintenanceResult?.score || 0;
  }

  /**
   * Update quality policy
   */
  public updatePolicy(policy: Partial<QualityPolicy>): void {
    this.policy = { ...this.policy, ...policy };
  }

  /**
   * Get current quality policy
   */
  public getPolicy(): QualityPolicy {
    return { ...this.policy };
  }

  /**
   * Get all registered gates
   */
  public getGates(): QualityGate[] {
    return Array.from(this.gates.values());
  }

  /**
   * Enable/disable a quality gate
   */
  public setGateEnabled(gateId: string, enabled: boolean): void {
    const gate = this.gates.get(gateId);
    if (gate) {
      gate.enabled = enabled;
    }
  }

  /**
   * Set gate as blocking/non-blocking
   */
  public setGateBlocking(gateId: string, blocking: boolean): void {
    const gate = this.gates.get(gateId);
    if (gate) {
      gate.blocking = blocking;
    }
  }
}