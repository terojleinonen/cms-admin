/**
 * Coverage Tracker
 * Tracks test coverage metrics and provides reporting and analysis
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

export interface CoverageReport {
  timestamp: Date;
  overall: CoverageMetrics;
  files: FileCoverage[];
  uncoveredLines: UncoveredLine[];
  summary: CoverageSummary;
}

export interface CoverageMetrics {
  branches: CoverageDetail;
  functions: CoverageDetail;
  lines: CoverageDetail;
  statements: CoverageDetail;
}

export interface CoverageDetail {
  total: number;
  covered: number;
  percentage: number;
}

export interface FileCoverage {
  path: string;
  metrics: CoverageMetrics;
  size: number;
  complexity?: number;
}

export interface UncoveredLine {
  file: string;
  line: number;
  type: 'statement' | 'branch' | 'function';
  reason?: string;
}

export interface CoverageSummary {
  totalFiles: number;
  wellCoveredFiles: number; // >90% coverage
  poorlyCoveredFiles: number; // <50% coverage
  newUncoveredLines: number;
  coverageTrend: 'improving' | 'declining' | 'stable';
  recommendations: string[];
}

export interface CoverageThreshold {
  branches: number;
  functions: number;
  lines: number;
  statements: number;
  perFile?: {
    branches: number;
    functions: number;
    lines: number;
    statements: number;
  };
}

export class CoverageTracker {
  private static instance: CoverageTracker;
  private coverageHistoryPath: string;
  private coverageHistory: CoverageReport[] = [];
  private thresholds: CoverageThreshold;

  private constructor() {
    this.coverageHistoryPath = join(process.cwd(), 'tests/monitoring/coverage-history.json');
    this.thresholds = {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
      perFile: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70
      }
    };
    this.loadCoverageHistory();
  }

  public static getInstance(): CoverageTracker {
    if (!CoverageTracker.instance) {
      CoverageTracker.instance = new CoverageTracker();
    }
    return CoverageTracker.instance;
  }

  /**
   * Generate coverage report from Jest coverage data
   */
  public async generateCoverageReport(): Promise<CoverageReport> {
    try {
      // Run Jest with coverage
      execSync('npm test -- --coverage --silent', { 
        stdio: 'pipe',
        cwd: process.cwd()
      });

      // Read coverage data
      const coverageData = this.readJestCoverage();
      const report = this.processCoverageData(coverageData);
      
      // Store in history
      this.coverageHistory.push(report);
      this.saveCoverageHistory();

      return report;
    } catch (error) {
      console.error('Failed to generate coverage report:', error);
      throw error;
    }
  }

  /**
   * Get latest coverage report
   */
  public getLatestCoverage(): CoverageReport | null {
    return this.coverageHistory.length > 0 
      ? this.coverageHistory[this.coverageHistory.length - 1]
      : null;
  }

  /**
   * Get coverage trends over time
   */
  public getCoverageTrends(days: number = 30): CoverageReport[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.coverageHistory.filter(report => 
      new Date(report.timestamp) >= cutoffDate
    );
  }

  /**
   * Check if coverage meets thresholds
   */
  public checkCoverageThresholds(report?: CoverageReport): {
    passed: boolean;
    failures: string[];
    warnings: string[];
  } {
    const coverage = report || this.getLatestCoverage();
    if (!coverage) {
      return {
        passed: false,
        failures: ['No coverage data available'],
        warnings: []
      };
    }

    const failures: string[] = [];
    const warnings: string[] = [];

    // Check overall thresholds
    const overall = coverage.overall;
    
    if (overall.branches.percentage < this.thresholds.branches) {
      failures.push(`Branch coverage ${overall.branches.percentage.toFixed(1)}% below threshold ${this.thresholds.branches}%`);
    }
    
    if (overall.functions.percentage < this.thresholds.functions) {
      failures.push(`Function coverage ${overall.functions.percentage.toFixed(1)}% below threshold ${this.thresholds.functions}%`);
    }
    
    if (overall.lines.percentage < this.thresholds.lines) {
      failures.push(`Line coverage ${overall.lines.percentage.toFixed(1)}% below threshold ${this.thresholds.lines}%`);
    }
    
    if (overall.statements.percentage < this.thresholds.statements) {
      failures.push(`Statement coverage ${overall.statements.percentage.toFixed(1)}% below threshold ${this.thresholds.statements}%`);
    }

    // Check per-file thresholds
    if (this.thresholds.perFile) {
      const poorFiles = coverage.files.filter(file => 
        file.metrics.lines.percentage < this.thresholds.perFile!.lines
      );

      if (poorFiles.length > 0) {
        warnings.push(`${poorFiles.length} files below per-file coverage threshold`);
        poorFiles.slice(0, 5).forEach(file => {
          warnings.push(`  - ${file.path}: ${file.metrics.lines.percentage.toFixed(1)}% line coverage`);
        });
      }
    }

    return {
      passed: failures.length === 0,
      failures,
      warnings
    };
  }

  /**
   * Generate coverage report in markdown format
   */
  public generateMarkdownReport(report?: CoverageReport): string {
    const coverage = report || this.getLatestCoverage();
    if (!coverage) {
      return '# Coverage Report\n\nNo coverage data available.';
    }

    const thresholdCheck = this.checkCoverageThresholds(coverage);
    const trends = this.getCoverageTrends(7);
    const trend = this.calculateTrend(trends);

    const markdown = [
      '# Test Coverage Report',
      `Generated: ${coverage.timestamp}`,
      '',
      '## Overall Coverage',
      '| Metric | Coverage | Threshold | Status |',
      '|--------|----------|-----------|--------|',
      `| Branches | ${coverage.overall.branches.percentage.toFixed(1)}% | ${this.thresholds.branches}% | ${coverage.overall.branches.percentage >= this.thresholds.branches ? '✅' : '❌'} |`,
      `| Functions | ${coverage.overall.functions.percentage.toFixed(1)}% | ${this.thresholds.functions}% | ${coverage.overall.functions.percentage >= this.thresholds.functions ? '✅' : '❌'} |`,
      `| Lines | ${coverage.overall.lines.percentage.toFixed(1)}% | ${this.thresholds.lines}% | ${coverage.overall.lines.percentage >= this.thresholds.lines ? '✅' : '❌'} |`,
      `| Statements | ${coverage.overall.statements.percentage.toFixed(1)}% | ${this.thresholds.statements}% | ${coverage.overall.statements.percentage >= this.thresholds.statements ? '✅' : '❌'} |`,
      '',
      '## Summary',
      `- **Total Files**: ${coverage.summary.totalFiles}`,
      `- **Well Covered Files** (>90%): ${coverage.summary.wellCoveredFiles}`,
      `- **Poorly Covered Files** (<50%): ${coverage.summary.poorlyCoveredFiles}`,
      `- **Coverage Trend**: ${trend} ${this.getTrendEmoji(trend)}`,
      '',
      '## Threshold Status',
      thresholdCheck.passed ? '✅ **All thresholds passed**' : '❌ **Some thresholds failed**',
      ''
    ];

    if (thresholdCheck.failures.length > 0) {
      markdown.push('### Failures');
      thresholdCheck.failures.forEach(failure => {
        markdown.push(`- ❌ ${failure}`);
      });
      markdown.push('');
    }

    if (thresholdCheck.warnings.length > 0) {
      markdown.push('### Warnings');
      thresholdCheck.warnings.forEach(warning => {
        markdown.push(`- ⚠️ ${warning}`);
      });
      markdown.push('');
    }

    if (coverage.summary.recommendations.length > 0) {
      markdown.push('## Recommendations');
      coverage.summary.recommendations.forEach(rec => {
        markdown.push(`- ${rec}`);
      });
      markdown.push('');
    }

    // Top uncovered files
    const uncoveredFiles = coverage.files
      .filter(file => file.metrics.lines.percentage < 80)
      .sort((a, b) => a.metrics.lines.percentage - b.metrics.lines.percentage)
      .slice(0, 10);

    if (uncoveredFiles.length > 0) {
      markdown.push('## Files Needing Attention');
      markdown.push('| File | Line Coverage | Function Coverage | Branch Coverage |');
      markdown.push('|------|---------------|-------------------|-----------------|');
      uncoveredFiles.forEach(file => {
        markdown.push(`| ${file.path} | ${file.metrics.lines.percentage.toFixed(1)}% | ${file.metrics.functions.percentage.toFixed(1)}% | ${file.metrics.branches.percentage.toFixed(1)}% |`);
      });
      markdown.push('');
    }

    // Recent trends
    if (trends.length > 1) {
      markdown.push('## Recent Trends (Last 7 Days)');
      markdown.push('| Date | Lines | Functions | Branches | Statements |');
      markdown.push('|------|-------|-----------|----------|------------|');
      trends.slice(-7).forEach(report => {
        const date = new Date(report.timestamp).toISOString().split('T')[0];
        markdown.push(`| ${date} | ${report.overall.lines.percentage.toFixed(1)}% | ${report.overall.functions.percentage.toFixed(1)}% | ${report.overall.branches.percentage.toFixed(1)}% | ${report.overall.statements.percentage.toFixed(1)}% |`);
      });
    }

    return markdown.join('\n');
  }

  /**
   * Get coverage improvement suggestions
   */
  public getCoverageImprovementSuggestions(report?: CoverageReport): string[] {
    const coverage = report || this.getLatestCoverage();
    if (!coverage) {
      return ['Generate coverage report first'];
    }

    const suggestions: string[] = [];

    // Identify files with low coverage
    const lowCoverageFiles = coverage.files
      .filter(file => file.metrics.lines.percentage < 70)
      .sort((a, b) => a.metrics.lines.percentage - b.metrics.lines.percentage);

    if (lowCoverageFiles.length > 0) {
      suggestions.push(`Focus on ${lowCoverageFiles.length} files with <70% line coverage`);
      suggestions.push(`Start with: ${lowCoverageFiles.slice(0, 3).map(f => f.path).join(', ')}`);
    }

    // Check for missing function coverage
    const lowFunctionCoverage = coverage.files
      .filter(file => file.metrics.functions.percentage < coverage.overall.functions.percentage - 10);

    if (lowFunctionCoverage.length > 0) {
      suggestions.push('Add tests for uncovered functions in: ' + 
        lowFunctionCoverage.slice(0, 3).map(f => f.path).join(', '));
    }

    // Check for missing branch coverage
    const lowBranchCoverage = coverage.files
      .filter(file => file.metrics.branches.percentage < coverage.overall.branches.percentage - 10);

    if (lowBranchCoverage.length > 0) {
      suggestions.push('Add tests for uncovered branches (error cases, edge conditions)');
    }

    // Check for large uncovered files
    const largeUncoveredFiles = coverage.files
      .filter(file => file.size > 1000 && file.metrics.lines.percentage < 60);

    if (largeUncoveredFiles.length > 0) {
      suggestions.push('Break down large files with low coverage for easier testing');
    }

    return suggestions;
  }

  /**
   * Read Jest coverage data
   */
  private readJestCoverage(): any {
    const coveragePath = join(process.cwd(), 'coverage/coverage-final.json');
    
    if (!existsSync(coveragePath)) {
      throw new Error('Coverage data not found. Run tests with --coverage flag first.');
    }

    return JSON.parse(readFileSync(coveragePath, 'utf-8'));
  }

  /**
   * Process raw coverage data into structured report
   */
  private processCoverageData(coverageData: any): CoverageReport {
    const files: FileCoverage[] = [];
    let totalBranches = 0, coveredBranches = 0;
    let totalFunctions = 0, coveredFunctions = 0;
    let totalLines = 0, coveredLines = 0;
    let totalStatements = 0, coveredStatements = 0;

    // Process each file
    Object.keys(coverageData).forEach(filePath => {
      const fileData = coverageData[filePath];
      
      // Skip node_modules and test files
      if (filePath.includes('node_modules') || filePath.includes('.test.') || filePath.includes('.spec.')) {
        return;
      }

      const fileCoverage = this.processFileCoverage(filePath, fileData);
      files.push(fileCoverage);

      // Aggregate totals
      totalBranches += fileCoverage.metrics.branches.total;
      coveredBranches += fileCoverage.metrics.branches.covered;
      totalFunctions += fileCoverage.metrics.functions.total;
      coveredFunctions += fileCoverage.metrics.functions.covered;
      totalLines += fileCoverage.metrics.lines.total;
      coveredLines += fileCoverage.metrics.lines.covered;
      totalStatements += fileCoverage.metrics.statements.total;
      coveredStatements += fileCoverage.metrics.statements.covered;
    });

    const overall: CoverageMetrics = {
      branches: {
        total: totalBranches,
        covered: coveredBranches,
        percentage: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0
      },
      functions: {
        total: totalFunctions,
        covered: coveredFunctions,
        percentage: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0
      },
      lines: {
        total: totalLines,
        covered: coveredLines,
        percentage: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0
      },
      statements: {
        total: totalStatements,
        covered: coveredStatements,
        percentage: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0
      }
    };

    const summary = this.generateSummary(files, overall);
    const uncoveredLines = this.findUncoveredLines(coverageData);

    return {
      timestamp: new Date(),
      overall,
      files,
      uncoveredLines,
      summary
    };
  }

  /**
   * Process coverage data for a single file
   */
  private processFileCoverage(filePath: string, fileData: any): FileCoverage {
    const branches = fileData.b || {};
    const functions = fileData.f || {};
    const statements = fileData.s || {};
    const lines = fileData.l || {};

    // Calculate branch coverage
    const branchValues = Object.values(branches).flat() as number[];
    const totalBranches = branchValues.length;
    const coveredBranches = branchValues.filter(count => count > 0).length;

    // Calculate function coverage
    const functionValues = Object.values(functions) as number[];
    const totalFunctions = functionValues.length;
    const coveredFunctions = functionValues.filter(count => count > 0).length;

    // Calculate statement coverage
    const statementValues = Object.values(statements) as number[];
    const totalStatements = statementValues.length;
    const coveredStatements = statementValues.filter(count => count > 0).length;

    // Calculate line coverage
    const lineValues = Object.values(lines) as number[];
    const totalLines = lineValues.length;
    const coveredLines = lineValues.filter(count => count > 0).length;

    // Get file size
    let fileSize = 0;
    try {
      const fileContent = readFileSync(filePath, 'utf-8');
      fileSize = fileContent.split('\n').length;
    } catch {
      fileSize = 0;
    }

    return {
      path: filePath.replace(process.cwd(), ''),
      metrics: {
        branches: {
          total: totalBranches,
          covered: coveredBranches,
          percentage: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0
        },
        functions: {
          total: totalFunctions,
          covered: coveredFunctions,
          percentage: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0
        },
        lines: {
          total: totalLines,
          covered: coveredLines,
          percentage: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0
        },
        statements: {
          total: totalStatements,
          covered: coveredStatements,
          percentage: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0
        }
      },
      size: fileSize
    };
  }

  /**
   * Generate coverage summary
   */
  private generateSummary(files: FileCoverage[], overall: CoverageMetrics): CoverageSummary {
    const wellCoveredFiles = files.filter(file => file.metrics.lines.percentage > 90).length;
    const poorlyCoveredFiles = files.filter(file => file.metrics.lines.percentage < 50).length;
    
    const trends = this.getCoverageTrends(7);
    const coverageTrend = this.calculateTrend(trends);
    
    const recommendations = this.getCoverageImprovementSuggestions();

    return {
      totalFiles: files.length,
      wellCoveredFiles,
      poorlyCoveredFiles,
      newUncoveredLines: 0, // Would need to compare with previous report
      coverageTrend,
      recommendations
    };
  }

  /**
   * Find uncovered lines in the codebase
   */
  private findUncoveredLines(coverageData: any): UncoveredLine[] {
    const uncoveredLines: UncoveredLine[] = [];

    Object.keys(coverageData).forEach(filePath => {
      const fileData = coverageData[filePath];
      
      // Skip test files and node_modules
      if (filePath.includes('.test.') || filePath.includes('node_modules')) {
        return;
      }

      // Find uncovered statements
      const statements = fileData.s || {};
      const statementMap = fileData.statementMap || {};
      
      Object.keys(statements).forEach(statementId => {
        if (statements[statementId] === 0) {
          const location = statementMap[statementId];
          if (location && location.start) {
            uncoveredLines.push({
              file: filePath.replace(process.cwd(), ''),
              line: location.start.line,
              type: 'statement'
            });
          }
        }
      });
    });

    return uncoveredLines.slice(0, 100); // Limit to first 100
  }

  /**
   * Calculate coverage trend
   */
  private calculateTrend(trends: CoverageReport[]): 'improving' | 'declining' | 'stable' {
    if (trends.length < 2) {
      return 'stable';
    }

    const recent = trends.slice(-3);
    const avgRecent = recent.reduce((sum, report) => sum + report.overall.lines.percentage, 0) / recent.length;
    
    const older = trends.slice(-6, -3);
    if (older.length === 0) {
      return 'stable';
    }
    
    const avgOlder = older.reduce((sum, report) => sum + report.overall.lines.percentage, 0) / older.length;
    
    const diff = avgRecent - avgOlder;
    
    if (diff > 1) return 'improving';
    if (diff < -1) return 'declining';
    return 'stable';
  }

  /**
   * Get trend emoji
   */
  private getTrendEmoji(trend: string): string {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  }

  /**
   * Load coverage history from file
   */
  private loadCoverageHistory(): void {
    try {
      if (existsSync(this.coverageHistoryPath)) {
        const data = readFileSync(this.coverageHistoryPath, 'utf-8');
        this.coverageHistory = JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to load coverage history:', error);
      this.coverageHistory = [];
    }
  }

  /**
   * Save coverage history to file
   */
  private saveCoverageHistory(): void {
    try {
      // Keep only last 90 days of data
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      
      this.coverageHistory = this.coverageHistory.filter(report => 
        new Date(report.timestamp) >= cutoffDate
      );

      writeFileSync(this.coverageHistoryPath, JSON.stringify(this.coverageHistory, null, 2));
    } catch (error) {
      console.error('Failed to save coverage history:', error);
    }
  }

  /**
   * Update coverage thresholds
   */
  public updateThresholds(thresholds: Partial<CoverageThreshold>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Get current thresholds
   */
  public getThresholds(): CoverageThreshold {
    return { ...this.thresholds };
  }
}