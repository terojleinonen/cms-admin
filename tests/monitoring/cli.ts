#!/usr/bin/env node

/**
 * Test Monitoring CLI
 * Command-line interface for test monitoring and maintenance
 */

import { TestHealthMonitor } from './test-health-monitor';
import { CoverageTracker } from './coverage-tracker';
import { PerformanceMonitor } from './performance-monitor';
import { TestMaintenance } from './test-maintenance';
import { QualityGates } from './quality-gates';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface CLICommand {
  name: string;
  description: string;
  execute: (args: string[]) => Promise<void>;
}

class TestMonitoringCLI {
  private commands: Map<string, CLICommand> = new Map();
  private healthMonitor: TestHealthMonitor;
  private coverageTracker: CoverageTracker;
  private performanceMonitor: PerformanceMonitor;
  private maintenance: TestMaintenance;
  private qualityGates: QualityGates;

  constructor() {
    this.healthMonitor = TestHealthMonitor.getInstance();
    this.coverageTracker = CoverageTracker.getInstance();
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.maintenance = TestMaintenance.getInstance();
    this.qualityGates = QualityGates.getInstance();

    this.registerCommands();
  }

  /**
   * Register CLI commands
   */
  private registerCommands(): void {
    this.commands.set('health', {
      name: 'health',
      description: 'Generate test health report',
      execute: this.generateHealthReport.bind(this)
    });

    this.commands.set('coverage', {
      name: 'coverage',
      description: 'Generate coverage report',
      execute: this.generateCoverageReport.bind(this)
    });

    this.commands.set('performance', {
      name: 'performance',
      description: 'Generate performance report',
      execute: this.generatePerformanceReport.bind(this)
    });

    this.commands.set('quality', {
      name: 'quality',
      description: 'Run quality gates and generate report',
      execute: this.runQualityGates.bind(this)
    });

    this.commands.set('maintenance', {
      name: 'maintenance',
      description: 'Run maintenance tasks',
      execute: this.runMaintenance.bind(this)
    });

    this.commands.set('dashboard', {
      name: 'dashboard',
      description: 'Generate comprehensive dashboard',
      execute: this.generateDashboard.bind(this)
    });

    this.commands.set('config', {
      name: 'config',
      description: 'Manage configuration',
      execute: this.manageConfig.bind(this)
    });

    this.commands.set('help', {
      name: 'help',
      description: 'Show help information',
      execute: this.showHelp.bind(this)
    });
  }

  /**
   * Execute CLI command
   */
  public async execute(args: string[]): Promise<void> {
    const commandName = args[0] || 'help';
    const command = this.commands.get(commandName);

    if (!command) {
      console.error(`Unknown command: ${commandName}`);
      await this.showHelp([]);
      process.exit(1);
    }

    try {
      await command.execute(args.slice(1));
    } catch (error) {
      console.error(`Command failed: ${error}`);
      process.exit(1);
    }
  }

  /**
   * Generate health report
   */
  private async generateHealthReport(args: string[]): Promise<void> {
    const format = args.includes('--json') ? 'json' : 'markdown';
    const output = args.find(arg => arg.startsWith('--output='))?.split('=')[1];

    console.log('Generating test health report...');
    
    const metrics = this.healthMonitor.getHealthMetrics();
    const report = this.healthMonitor.generateHealthReport();

    if (format === 'json') {
      const jsonReport = JSON.stringify(metrics, null, 2);
      if (output) {
        writeFileSync(output, jsonReport);
        console.log(`Health report saved to: ${output}`);
      } else {
        console.log(jsonReport);
      }
    } else {
      if (output) {
        writeFileSync(output, report);
        console.log(`Health report saved to: ${output}`);
      } else {
        console.log(report);
      }
    }
  }

  /**
   * Generate coverage report
   */
  private async generateCoverageReport(args: string[]): Promise<void> {
    const format = args.includes('--json') ? 'json' : 'markdown';
    const output = args.find(arg => arg.startsWith('--output='))?.split('=')[1];
    const generate = args.includes('--generate');

    console.log('Generating coverage report...');

    let coverageReport;
    if (generate) {
      coverageReport = await this.coverageTracker.generateCoverageReport();
    } else {
      coverageReport = this.coverageTracker.getLatestCoverage();
      if (!coverageReport) {
        console.log('No coverage data available. Run with --generate to create new coverage report.');
        return;
      }
    }

    if (format === 'json') {
      const jsonReport = JSON.stringify(coverageReport, null, 2);
      if (output) {
        writeFileSync(output, jsonReport);
        console.log(`Coverage report saved to: ${output}`);
      } else {
        console.log(jsonReport);
      }
    } else {
      const markdownReport = this.coverageTracker.generateMarkdownReport(coverageReport);
      if (output) {
        writeFileSync(output, markdownReport);
        console.log(`Coverage report saved to: ${output}`);
      } else {
        console.log(markdownReport);
      }
    }
  }

  /**
   * Generate performance report
   */
  private async generatePerformanceReport(args: string[]): Promise<void> {
    const format = args.includes('--json') ? 'json' : 'markdown';
    const output = args.find(arg => arg.startsWith('--output='))?.split('=')[1];

    console.log('Generating performance report...');
    
    const performanceReport = this.performanceMonitor.generatePerformanceReport();

    if (format === 'json') {
      const jsonReport = JSON.stringify(performanceReport, null, 2);
      if (output) {
        writeFileSync(output, jsonReport);
        console.log(`Performance report saved to: ${output}`);
      } else {
        console.log(jsonReport);
      }
    } else {
      const markdownReport = this.performanceMonitor.generateMarkdownReport();
      if (output) {
        writeFileSync(output, markdownReport);
        console.log(`Performance report saved to: ${output}`);
      } else {
        console.log(markdownReport);
      }
    }
  }

  /**
   * Run quality gates
   */
  private async runQualityGates(args: string[]): Promise<void> {
    const format = args.includes('--json') ? 'json' : 'markdown';
    const output = args.find(arg => arg.startsWith('--output='))?.split('=')[1];
    const exitOnFailure = args.includes('--exit-on-failure');

    console.log('Running quality gates...');
    
    const qualityReport = await this.qualityGates.runQualityGates();

    if (format === 'json') {
      const jsonReport = JSON.stringify(qualityReport, null, 2);
      if (output) {
        writeFileSync(output, jsonReport);
        console.log(`Quality report saved to: ${output}`);
      } else {
        console.log(jsonReport);
      }
    } else {
      const markdownReport = this.qualityGates.generateMarkdownReport(qualityReport);
      if (output) {
        writeFileSync(output, markdownReport);
        console.log(`Quality report saved to: ${output}`);
      } else {
        console.log(markdownReport);
      }
    }

    // Exit with error code if quality gates failed and --exit-on-failure is set
    if (!qualityReport.passed && exitOnFailure) {
      console.error('Quality gates failed!');
      process.exit(1);
    }

    console.log(`Quality gates ${qualityReport.passed ? 'PASSED' : 'FAILED'} (Score: ${qualityReport.overallScore.toFixed(1)}/100)`);
  }

  /**
   * Run maintenance tasks
   */
  private async runMaintenance(args: string[]): Promise<void> {
    const taskId = args.find(arg => !arg.startsWith('--'));
    const listTasks = args.includes('--list');
    const scheduled = args.includes('--scheduled');

    if (listTasks) {
      console.log('Available maintenance tasks:');
      const tasks = this.maintenance.getTasks();
      tasks.forEach(task => {
        const status = task.enabled ? '✅' : '❌';
        console.log(`  ${status} ${task.id}: ${task.name} (${task.schedule})`);
        console.log(`     ${task.description}`);
      });
      return;
    }

    if (taskId) {
      console.log(`Running maintenance task: ${taskId}`);
      const result = await this.maintenance.runTask(taskId);
      
      if (result.success) {
        console.log(`✅ ${result.message}`);
        if (result.details) {
          result.details.forEach(detail => console.log(`   ${detail}`));
        }
      } else {
        console.error(`❌ ${result.message}`);
        if (result.errors) {
          result.errors.forEach(error => console.error(`   ${error}`));
        }
      }
    } else if (scheduled) {
      console.log('Running scheduled maintenance tasks...');
      const results = await this.maintenance.runScheduledMaintenance();
      
      results.forEach(result => {
        if (result.success) {
          console.log(`✅ ${result.message}`);
        } else {
          console.error(`❌ ${result.message}`);
        }
      });
      
      console.log(`Completed ${results.length} maintenance tasks`);
    } else {
      console.log('Usage: maintenance [task-id] [--list] [--scheduled]');
      console.log('Use --list to see available tasks');
    }
  }

  /**
   * Generate comprehensive dashboard
   */
  private async generateDashboard(args: string[]): Promise<void> {
    const output = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'test-dashboard.md';

    console.log('Generating comprehensive test dashboard...');

    // Collect all reports
    const healthReport = this.healthMonitor.generateHealthReport();
    const coverageReport = this.coverageTracker.generateMarkdownReport();
    const performanceReport = this.performanceMonitor.generateMarkdownReport();
    const qualityReport = await this.qualityGates.runQualityGates();
    const qualityMarkdown = this.qualityGates.generateMarkdownReport(qualityReport);

    // Generate dashboard
    const dashboard = [
      '# Test Monitoring Dashboard',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Overview',
      `- **Quality Score**: ${qualityReport.overallScore.toFixed(1)}/100`,
      `- **Status**: ${qualityReport.passed ? '✅ PASSED' : '❌ FAILED'}`,
      `- **Coverage**: ${this.coverageTracker.getLatestCoverage()?.overall.lines.percentage.toFixed(1) || 'N/A'}%`,
      `- **Performance**: ${this.performanceMonitor.generatePerformanceReport().averageDuration.toFixed(2)}ms avg`,
      '',
      '---',
      '',
      qualityMarkdown,
      '',
      '---',
      '',
      healthReport,
      '',
      '---',
      '',
      coverageReport || '# Coverage Report\n\nNo coverage data available.',
      '',
      '---',
      '',
      performanceReport,
      '',
      '## Maintenance Status',
      'Last maintenance run: ' + new Date().toISOString(),
      'Next scheduled maintenance: Daily cleanup, weekly optimization'
    ].join('\n');

    writeFileSync(output, dashboard);
    console.log(`Dashboard saved to: ${output}`);
  }

  /**
   * Manage configuration
   */
  private async manageConfig(args: string[]): Promise<void> {
    const action = args[0];
    
    switch (action) {
      case 'show':
        console.log('Current Configuration:');
        console.log('\nHealth Monitor:');
        console.log(JSON.stringify(this.healthMonitor.getAlertConfig(), null, 2));
        console.log('\nCoverage Tracker:');
        console.log(JSON.stringify(this.coverageTracker.getThresholds(), null, 2));
        console.log('\nPerformance Monitor:');
        console.log(JSON.stringify(this.performanceMonitor.getThresholds(), null, 2));
        console.log('\nMaintenance:');
        console.log(JSON.stringify(this.maintenance.getConfig(), null, 2));
        console.log('\nQuality Gates:');
        console.log(JSON.stringify(this.qualityGates.getPolicy(), null, 2));
        break;
        
      case 'export':
        const configOutput = args[1] || 'test-monitoring-config.json';
        const config = {
          health: this.healthMonitor.getAlertConfig(),
          coverage: this.coverageTracker.getThresholds(),
          performance: this.performanceMonitor.getThresholds(),
          maintenance: this.maintenance.getConfig(),
          quality: this.qualityGates.getPolicy()
        };
        writeFileSync(configOutput, JSON.stringify(config, null, 2));
        console.log(`Configuration exported to: ${configOutput}`);
        break;
        
      default:
        console.log('Usage: config [show|export] [output-file]');
        console.log('  show: Display current configuration');
        console.log('  export: Export configuration to JSON file');
    }
  }

  /**
   * Show help information
   */
  private async showHelp(args: string[]): Promise<void> {
    console.log('Test Monitoring CLI');
    console.log('');
    console.log('Usage: npm run test:monitor <command> [options]');
    console.log('');
    console.log('Commands:');
    
    for (const [name, command] of this.commands) {
      console.log(`  ${name.padEnd(12)} ${command.description}`);
    }
    
    console.log('');
    console.log('Options:');
    console.log('  --json           Output in JSON format');
    console.log('  --output=<file>  Save output to file');
    console.log('  --generate       Generate new data (for coverage)');
    console.log('  --exit-on-failure Exit with error code on failure');
    console.log('  --list           List available items');
    console.log('  --scheduled      Run scheduled tasks only');
    console.log('');
    console.log('Examples:');
    console.log('  npm run test:monitor health --output=health.md');
    console.log('  npm run test:monitor coverage --generate --json');
    console.log('  npm run test:monitor quality --exit-on-failure');
    console.log('  npm run test:monitor maintenance --list');
    console.log('  npm run test:monitor dashboard');
  }
}

// CLI entry point
if (require.main === module) {
  const cli = new TestMonitoringCLI();
  const args = process.argv.slice(2);
  
  cli.execute(args).catch(error => {
    console.error('CLI execution failed:', error);
    process.exit(1);
  });
}

export { TestMonitoringCLI };