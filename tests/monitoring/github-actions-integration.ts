/**
 * GitHub Actions Integration
 * Integrates test monitoring with GitHub Actions CI/CD
 */

import { QualityGates } from './quality-gates';
import { TestHealthMonitor } from './test-health-monitor';
import { CoverageTracker } from './coverage-tracker';
import { PerformanceMonitor } from './performance-monitor';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface GitHubActionsOutput {
  summary: string;
  annotations: GitHubAnnotation[];
  artifacts: GitHubArtifact[];
  jobSummary: string;
}

export interface GitHubAnnotation {
  level: 'notice' | 'warning' | 'error';
  title: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
}

export interface GitHubArtifact {
  name: string;
  path: string;
  description: string;
}

export class GitHubActionsIntegration {
  private qualityGates: QualityGates;
  private healthMonitor: TestHealthMonitor;
  private coverageTracker: CoverageTracker;
  private performanceMonitor: PerformanceMonitor;

  constructor() {
    this.qualityGates = QualityGates.getInstance();
    this.healthMonitor = TestHealthMonitor.getInstance();
    this.coverageTracker = CoverageTracker.getInstance();
    this.performanceMonitor = PerformanceMonitor.getInstance();
  }

  /**
   * Run quality gates and generate GitHub Actions output
   */
  public async runQualityGatesForCI(): Promise<GitHubActionsOutput> {
    console.log('🔍 Running quality gates for CI/CD...');

    // Run quality gates
    const qualityReport = await this.qualityGates.runQualityGates();
    
    // Generate reports
    const healthReport = this.healthMonitor.generateHealthReport();
    const coverageReport = this.coverageTracker.generateMarkdownReport();
    const performanceReport = this.performanceMonitor.generateMarkdownReport();
    const qualityMarkdown = this.qualityGates.generateMarkdownReport(qualityReport);

    // Create artifacts directory
    const artifactsDir = join(process.cwd(), 'test-artifacts');
    if (!existsSync(artifactsDir)) {
      mkdirSync(artifactsDir, { recursive: true });
    }

    // Save reports as artifacts
    const artifacts: GitHubArtifact[] = [
      {
        name: 'quality-report',
        path: join(artifactsDir, 'quality-report.md'),
        description: 'Test quality gates report'
      },
      {
        name: 'health-report',
        path: join(artifactsDir, 'health-report.md'),
        description: 'Test health monitoring report'
      },
      {
        name: 'coverage-report',
        path: join(artifactsDir, 'coverage-report.md'),
        description: 'Test coverage analysis report'
      },
      {
        name: 'performance-report',
        path: join(artifactsDir, 'performance-report.md'),
        description: 'Test performance analysis report'
      }
    ];

    // Write artifact files
    writeFileSync(artifacts[0].path, qualityMarkdown);
    writeFileSync(artifacts[1].path, healthReport);
    writeFileSync(artifacts[2].path, coverageReport || 'No coverage data available');
    writeFileSync(artifacts[3].path, performanceReport);

    // Generate annotations
    const annotations = this.generateAnnotations(qualityReport);

    // Generate job summary
    const jobSummary = this.generateJobSummary(qualityReport);

    // Generate summary for GitHub Actions
    const summary = this.generateSummary(qualityReport);

    // Set GitHub Actions outputs
    this.setGitHubActionsOutputs(qualityReport, summary);

    return {
      summary,
      annotations,
      artifacts,
      jobSummary
    };
  }

  /**
   * Generate GitHub Actions annotations
   */
  private generateAnnotations(qualityReport: any): GitHubAnnotation[] {
    const annotations: GitHubAnnotation[] = [];

    // Add annotations for failed quality gates
    qualityReport.gateResults.forEach((result: any, index: number) => {
      const gates = this.qualityGates.getGates();
      const gate = gates[index];
      
      if (!result.passed && gate) {
        annotations.push({
          level: gate.blocking ? 'error' : 'warning',
          title: `Quality Gate Failed: ${gate.name}`,
          message: result.message
        });
      }
    });

    // Add annotations for coverage issues
    const coverage = this.coverageTracker.getLatestCoverage();
    if (coverage) {
      const thresholdCheck = this.coverageTracker.checkCoverageThresholds(coverage);
      
      thresholdCheck.failures.forEach(failure => {
        annotations.push({
          level: 'error',
          title: 'Coverage Threshold Failed',
          message: failure
        });
      });

      thresholdCheck.warnings.forEach(warning => {
        annotations.push({
          level: 'warning',
          title: 'Coverage Warning',
          message: warning
        });
      });
    }

    // Add annotations for performance issues
    const performanceCheck = this.performanceMonitor.checkPerformanceThresholds();
    
    performanceCheck.violations.forEach(violation => {
      annotations.push({
        level: 'error',
        title: 'Performance Threshold Exceeded',
        message: violation
      });
    });

    performanceCheck.warnings.forEach(warning => {
      annotations.push({
        level: 'warning',
        title: 'Performance Warning',
        message: warning
      });
    });

    return annotations;
  }

  /**
   * Generate job summary for GitHub Actions
   */
  private generateJobSummary(qualityReport: any): string {
    const statusEmoji = qualityReport.passed ? '✅' : '❌';
    const scoreColor = qualityReport.overallScore >= 80 ? '🟢' : 
                      qualityReport.overallScore >= 60 ? '🟡' : '🔴';

    const summary = [
      `# ${statusEmoji} Test Quality Report`,
      '',
      `${scoreColor} **Overall Score**: ${qualityReport.overallScore.toFixed(1)}/100`,
      `📊 **Status**: ${qualityReport.passed ? 'PASSED' : 'FAILED'}`,
      '',
      '## Quick Stats',
      `- **Gates Passed**: ${qualityReport.summary.passedGates}/${qualityReport.summary.totalGates}`,
      `- **Coverage**: ${qualityReport.summary.coverageScore.toFixed(1)}%`,
      `- **Performance**: ${qualityReport.summary.performanceScore.toFixed(1)}%`,
      `- **Reliability**: ${qualityReport.summary.reliabilityScore.toFixed(1)}%`,
      '',
    ];

    if (qualityReport.blockers.length > 0) {
      summary.push('## 🚫 Blocking Issues');
      qualityReport.blockers.forEach((blocker: string) => {
        summary.push(`- ${blocker}`);
      });
      summary.push('');
    }

    if (qualityReport.recommendations.length > 0) {
      summary.push('## 💡 Top Recommendations');
      qualityReport.recommendations.slice(0, 5).forEach((rec: string) => {
        summary.push(`- ${rec}`);
      });
      summary.push('');
    }

    summary.push('## 📋 Gate Results');
    summary.push('| Gate | Status | Score |');
    summary.push('|------|--------|-------|');
    
    const gates = this.qualityGates.getGates();
    qualityReport.gateResults.forEach((result: any, index: number) => {
      const gate = gates[index];
      const status = result.passed ? '✅' : '❌';
      summary.push(`| ${gate?.name || 'Unknown'} | ${status} | ${result.score.toFixed(1)}% |`);
    });

    return summary.join('\n');
  }

  /**
   * Generate summary for GitHub Actions
   */
  private generateSummary(qualityReport: any): string {
    const status = qualityReport.passed ? 'PASSED' : 'FAILED';
    const score = qualityReport.overallScore.toFixed(1);
    
    return `Quality Gates ${status} (${score}/100) - ${qualityReport.summary.passedGates}/${qualityReport.summary.totalGates} gates passed`;
  }

  /**
   * Set GitHub Actions outputs
   */
  private setGitHubActionsOutputs(qualityReport: any, summary: string): void {
    // Set outputs for GitHub Actions
    if (process.env.GITHUB_OUTPUT) {
      const outputs = [
        `quality-passed=${qualityReport.passed}`,
        `quality-score=${qualityReport.overallScore.toFixed(1)}`,
        `coverage-score=${qualityReport.summary.coverageScore.toFixed(1)}`,
        `performance-score=${qualityReport.summary.performanceScore.toFixed(1)}`,
        `reliability-score=${qualityReport.summary.reliabilityScore.toFixed(1)}`,
        `gates-passed=${qualityReport.summary.passedGates}`,
        `gates-total=${qualityReport.summary.totalGates}`,
        `blocking-failures=${qualityReport.summary.blockingFailures}`,
        `summary=${summary}`
      ];

      writeFileSync(process.env.GITHUB_OUTPUT, outputs.join('\n') + '\n', { flag: 'a' });
    }

    // Set step summary
    if (process.env.GITHUB_STEP_SUMMARY) {
      const jobSummary = this.generateJobSummary(qualityReport);
      writeFileSync(process.env.GITHUB_STEP_SUMMARY, jobSummary);
    }
  }

  /**
   * Generate GitHub Actions workflow file
   */
  public generateWorkflowFile(): string {
    return `name: Test Quality Gates

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test-quality:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests with coverage
      run: npm test -- --coverage
      
    - name: Run quality gates
      id: quality-gates
      run: |
        npm run test:monitor quality --exit-on-failure
      continue-on-error: true
      
    - name: Upload test artifacts
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: test-reports
        path: test-artifacts/
        
    - name: Comment PR with results
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v7
      with:
        script: |
          const fs = require('fs');
          const summary = fs.readFileSync('test-artifacts/quality-report.md', 'utf8');
          
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: summary
          });
          
    - name: Fail if quality gates failed
      if: steps.quality-gates.outcome == 'failure'
      run: |
        echo "Quality gates failed!"
        exit 1
`;
  }

  /**
   * Save workflow file
   */
  public saveWorkflowFile(): void {
    const workflowDir = join(process.cwd(), '.github', 'workflows');
    if (!existsSync(workflowDir)) {
      mkdirSync(workflowDir, { recursive: true });
    }

    const workflowPath = join(workflowDir, 'test-quality-gates.yml');
    const workflowContent = this.generateWorkflowFile();
    
    writeFileSync(workflowPath, workflowContent);
    console.log(`GitHub Actions workflow saved to: ${workflowPath}`);
  }
}

// CLI integration for GitHub Actions
if (require.main === module) {
  const integration = new GitHubActionsIntegration();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'run':
      integration.runQualityGatesForCI()
        .then(output => {
          console.log('✅ Quality gates completed for CI/CD');
          console.log(output.summary);
        })
        .catch(error => {
          console.error('❌ Quality gates failed:', error);
          process.exit(1);
        });
      break;
      
    case 'generate-workflow':
      integration.saveWorkflowFile();
      break;
      
    default:
      console.log('Usage: node github-actions-integration.js [run|generate-workflow]');
      process.exit(1);
  }
}

// Export is already done above