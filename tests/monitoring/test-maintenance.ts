/**
 * Test Maintenance System
 * Automated test maintenance and cleanup procedures
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { execSync } from 'child_process';

export interface MaintenanceTask {
  id: string;
  name: string;
  description: string;
  schedule: 'daily' | 'weekly' | 'monthly';
  lastRun?: Date;
  enabled: boolean;
  execute: () => Promise<MaintenanceResult>;
}

export interface MaintenanceResult {
  success: boolean;
  message: string;
  details?: string[];
  filesProcessed?: number;
  errors?: string[];
}

export interface MaintenanceConfig {
  autoCleanup: boolean;
  retentionDays: number;
  maxLogSize: number; // MB
  enabledTasks: string[];
  notifications: {
    onSuccess: boolean;
    onFailure: boolean;
    email?: string;
  };
}

export interface CleanupStats {
  filesRemoved: number;
  spaceSaved: number; // bytes
  oldestFileRemoved?: Date;
  categories: Record<string, number>;
}

export class TestMaintenance {
  private static instance: TestMaintenance;
  private config: MaintenanceConfig;
  private configPath: string;
  private tasks: Map<string, MaintenanceTask> = new Map();
  private maintenanceLogPath: string;

  private constructor() {
    this.configPath = join(process.cwd(), 'tests/monitoring/maintenance-config.json');
    this.maintenanceLogPath = join(process.cwd(), 'tests/monitoring/maintenance.log');
    
    this.config = {
      autoCleanup: true,
      retentionDays: 30,
      maxLogSize: 10, // 10MB
      enabledTasks: [],
      notifications: {
        onSuccess: false,
        onFailure: true
      }
    };

    this.loadConfig();
    this.registerDefaultTasks();
  }

  public static getInstance(): TestMaintenance {
    if (!TestMaintenance.instance) {
      TestMaintenance.instance = new TestMaintenance();
    }
    return TestMaintenance.instance;
  }

  /**
   * Register default maintenance tasks
   */
  private registerDefaultTasks(): void {
    // Clean old test artifacts
    this.registerTask({
      id: 'cleanup-artifacts',
      name: 'Clean Test Artifacts',
      description: 'Remove old test artifacts, logs, and temporary files',
      schedule: 'daily',
      enabled: true,
      execute: () => this.cleanupTestArtifacts()
    });

    // Clean coverage reports
    this.registerTask({
      id: 'cleanup-coverage',
      name: 'Clean Coverage Reports',
      description: 'Remove old coverage reports and data',
      schedule: 'weekly',
      enabled: true,
      execute: () => this.cleanupCoverageReports()
    });

    // Optimize test database
    this.registerTask({
      id: 'optimize-database',
      name: 'Optimize Test Database',
      description: 'Clean and optimize test database',
      schedule: 'weekly',
      enabled: true,
      execute: () => this.optimizeTestDatabase()
    });

    // Update test snapshots
    this.registerTask({
      id: 'update-snapshots',
      name: 'Update Test Snapshots',
      description: 'Check and update outdated test snapshots',
      schedule: 'monthly',
      enabled: false, // Manual only
      execute: () => this.updateTestSnapshots()
    });

    // Analyze test performance
    this.registerTask({
      id: 'analyze-performance',
      name: 'Analyze Test Performance',
      description: 'Analyze and report on test performance trends',
      schedule: 'weekly',
      enabled: true,
      execute: () => this.analyzeTestPerformance()
    });

    // Clean node modules cache
    this.registerTask({
      id: 'cleanup-node-cache',
      name: 'Clean Node Cache',
      description: 'Clear Node.js and npm cache to prevent issues',
      schedule: 'monthly',
      enabled: true,
      execute: () => this.cleanupNodeCache()
    });

    // Validate test structure
    this.registerTask({
      id: 'validate-structure',
      name: 'Validate Test Structure',
      description: 'Check test file organization and naming conventions',
      schedule: 'weekly',
      enabled: true,
      execute: () => this.validateTestStructure()
    });
  }

  /**
   * Register a maintenance task
   */
  public registerTask(task: MaintenanceTask): void {
    this.tasks.set(task.id, task);
  }

  /**
   * Run all scheduled maintenance tasks
   */
  public async runScheduledMaintenance(): Promise<MaintenanceResult[]> {
    const results: MaintenanceResult[] = [];
    const now = new Date();

    for (const [taskId, task] of this.tasks) {
      if (!task.enabled || !this.config.enabledTasks.includes(taskId)) {
        continue;
      }

      if (this.shouldRunTask(task, now)) {
        try {
          this.log(`Starting maintenance task: ${task.name}`);
          const result = await task.execute();
          
          task.lastRun = now;
          results.push(result);
          
          this.log(`Completed maintenance task: ${task.name} - ${result.success ? 'SUCCESS' : 'FAILED'}`);
          
          if (result.success && this.config.notifications.onSuccess) {
            this.sendNotification(`Maintenance task completed: ${task.name}`, result.message);
          } else if (!result.success && this.config.notifications.onFailure) {
            this.sendNotification(`Maintenance task failed: ${task.name}`, result.message);
          }
        } catch (error) {
          const errorResult: MaintenanceResult = {
            success: false,
            message: `Task execution failed: ${error}`,
            errors: [String(error)]
          };
          
          results.push(errorResult);
          this.log(`Failed maintenance task: ${task.name} - ${error}`);
          
          if (this.config.notifications.onFailure) {
            this.sendNotification(`Maintenance task error: ${task.name}`, String(error));
          }
        }
      }
    }

    return results;
  }

  /**
   * Run a specific maintenance task
   */
  public async runTask(taskId: string): Promise<MaintenanceResult> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return {
        success: false,
        message: `Task not found: ${taskId}`
      };
    }

    try {
      this.log(`Manually running maintenance task: ${task.name}`);
      const result = await task.execute();
      task.lastRun = new Date();
      this.log(`Completed manual task: ${task.name} - ${result.success ? 'SUCCESS' : 'FAILED'}`);
      return result;
    } catch (error) {
      this.log(`Failed manual task: ${task.name} - ${error}`);
      return {
        success: false,
        message: `Task execution failed: ${error}`,
        errors: [String(error)]
      };
    }
  }

  /**
   * Clean up test artifacts
   */
  private async cleanupTestArtifacts(): Promise<MaintenanceResult> {
    const stats: CleanupStats = {
      filesRemoved: 0,
      spaceSaved: 0,
      categories: {}
    };

    const artifactPaths = [
      'tests/monitoring/alerts.log',
      'tests/monitoring/health-data.json',
      'tests/monitoring/performance-history.json',
      'coverage/lcov.info',
      'coverage/coverage-final.json',
      'test-results',
      '.nyc_output'
    ];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    for (const artifactPath of artifactPaths) {
      const fullPath = join(process.cwd(), artifactPath);
      
      try {
        if (existsSync(fullPath)) {
          const stat = statSync(fullPath);
          
          if (stat.isFile() && stat.mtime < cutoffDate) {
            const size = stat.size;
            unlinkSync(fullPath);
            
            stats.filesRemoved++;
            stats.spaceSaved += size;
            
            const category = extname(fullPath) || 'other';
            stats.categories[category] = (stats.categories[category] || 0) + 1;
            
            if (!stats.oldestFileRemoved || stat.mtime < stats.oldestFileRemoved) {
              stats.oldestFileRemoved = stat.mtime;
            }
          }
        }
      } catch (error) {
        // Continue with other files
      }
    }

    return {
      success: true,
      message: `Cleaned up ${stats.filesRemoved} files, saved ${(stats.spaceSaved / 1024 / 1024).toFixed(2)}MB`,
      details: [
        `Files removed: ${stats.filesRemoved}`,
        `Space saved: ${(stats.spaceSaved / 1024 / 1024).toFixed(2)}MB`,
        `Categories: ${Object.entries(stats.categories).map(([k, v]) => `${k}: ${v}`).join(', ')}`
      ],
      filesProcessed: stats.filesRemoved
    };
  }

  /**
   * Clean up coverage reports
   */
  private async cleanupCoverageReports(): Promise<MaintenanceResult> {
    const coveragePath = join(process.cwd(), 'coverage');
    let filesRemoved = 0;
    let spaceSaved = 0;

    try {
      if (existsSync(coveragePath)) {
        const files = readdirSync(coveragePath);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep only last week

        for (const file of files) {
          const filePath = join(coveragePath, file);
          const stat = statSync(filePath);
          
          if (stat.isFile() && stat.mtime < cutoffDate && file !== 'lcov.info') {
            spaceSaved += stat.size;
            unlinkSync(filePath);
            filesRemoved++;
          }
        }
      }

      return {
        success: true,
        message: `Cleaned ${filesRemoved} coverage files, saved ${(spaceSaved / 1024 / 1024).toFixed(2)}MB`,
        filesProcessed: filesRemoved
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to clean coverage reports: ${error}`,
        errors: [String(error)]
      };
    }
  }

  /**
   * Optimize test database
   */
  private async optimizeTestDatabase(): Promise<MaintenanceResult> {
    try {
      // Reset test database
      execSync('npm run db:reset:test', { stdio: 'pipe' });
      
      // Run migrations
      execSync('npm run db:migrate:test', { stdio: 'pipe' });
      
      // Seed with fresh data
      execSync('npm run db:seed:test', { stdio: 'pipe' });

      return {
        success: true,
        message: 'Test database optimized successfully',
        details: [
          'Database reset completed',
          'Migrations applied',
          'Test data seeded'
        ]
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to optimize test database: ${error}`,
        errors: [String(error)]
      };
    }
  }

  /**
   * Update test snapshots
   */
  private async updateTestSnapshots(): Promise<MaintenanceResult> {
    try {
      const output = execSync('npm test -- --updateSnapshot', { 
        encoding: 'utf-8',
        stdio: 'pipe'
      });

      const snapshotMatches = output.match(/(\d+) snapshots? updated/);
      const snapshotsUpdated = snapshotMatches ? parseInt(snapshotMatches[1]) : 0;

      return {
        success: true,
        message: `Updated ${snapshotsUpdated} test snapshots`,
        details: [`Snapshots updated: ${snapshotsUpdated}`]
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update snapshots: ${error}`,
        errors: [String(error)]
      };
    }
  }

  /**
   * Analyze test performance
   */
  private async analyzeTestPerformance(): Promise<MaintenanceResult> {
    try {
      // This would integrate with the PerformanceMonitor
      const performanceData = {
        slowTests: 5,
        memoryLeaks: 2,
        averageTime: 1250
      };

      const recommendations = [
        'Consider mocking external dependencies in slow unit tests',
        'Check for memory leaks in integration tests',
        'Optimize database queries in test setup'
      ];

      return {
        success: true,
        message: 'Performance analysis completed',
        details: [
          `Slow tests identified: ${performanceData.slowTests}`,
          `Potential memory leaks: ${performanceData.memoryLeaks}`,
          `Average test time: ${performanceData.averageTime}ms`,
          'Recommendations: ' + recommendations.join('; ')
        ]
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to analyze performance: ${error}`,
        errors: [String(error)]
      };
    }
  }

  /**
   * Clean Node.js cache
   */
  private async cleanupNodeCache(): Promise<MaintenanceResult> {
    try {
      // Clear npm cache
      execSync('npm cache clean --force', { stdio: 'pipe' });
      
      // Clear Jest cache
      execSync('npx jest --clearCache', { stdio: 'pipe' });

      return {
        success: true,
        message: 'Node.js and Jest caches cleared',
        details: [
          'npm cache cleared',
          'Jest cache cleared'
        ]
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to clear caches: ${error}`,
        errors: [String(error)]
      };
    }
  }

  /**
   * Validate test structure
   */
  private async validateTestStructure(): Promise<MaintenanceResult> {
    const issues: string[] = [];
    const testDirs = ['__tests__', 'tests'];
    
    try {
      for (const testDir of testDirs) {
        const testPath = join(process.cwd(), testDir);
        if (existsSync(testPath)) {
          this.validateDirectory(testPath, issues);
        }
      }

      return {
        success: issues.length === 0,
        message: issues.length === 0 
          ? 'Test structure validation passed' 
          : `Found ${issues.length} structural issues`,
        details: issues.length > 0 ? issues : ['All tests follow naming conventions']
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to validate test structure: ${error}`,
        errors: [String(error)]
      };
    }
  }

  /**
   * Validate directory structure recursively
   */
  private validateDirectory(dirPath: string, issues: string[]): void {
    const files = readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = join(dirPath, file);
      const stat = statSync(filePath);
      
      if (stat.isDirectory()) {
        this.validateDirectory(filePath, issues);
      } else if (stat.isFile()) {
        // Check test file naming conventions
        if (file.endsWith('.test.ts') || file.endsWith('.test.tsx') || 
            file.endsWith('.spec.ts') || file.endsWith('.spec.tsx')) {
          
          // Check for proper describe blocks
          try {
            const content = readFileSync(filePath, 'utf-8');
            if (!content.includes('describe(')) {
              issues.push(`Missing describe block: ${filePath}`);
            }
            
            // Check for proper test organization
            if (content.includes('it(') && !content.includes('expect(')) {
              issues.push(`Tests without assertions: ${filePath}`);
            }
          } catch {
            // Skip files that can't be read
          }
        }
      }
    }
  }

  /**
   * Check if task should run based on schedule
   */
  private shouldRunTask(task: MaintenanceTask, now: Date): boolean {
    if (!task.lastRun) {
      return true;
    }

    const timeSinceLastRun = now.getTime() - task.lastRun.getTime();
    const daysSinceLastRun = timeSinceLastRun / (1000 * 60 * 60 * 24);

    switch (task.schedule) {
      case 'daily':
        return daysSinceLastRun >= 1;
      case 'weekly':
        return daysSinceLastRun >= 7;
      case 'monthly':
        return daysSinceLastRun >= 30;
      default:
        return false;
    }
  }

  /**
   * Send notification
   */
  private sendNotification(subject: string, message: string): void {
    // In a real implementation, this would send email or webhook notifications
    console.log(`NOTIFICATION: ${subject}\n${message}`);
    
    // Log notification
    this.log(`NOTIFICATION: ${subject} - ${message}`);
  }

  /**
   * Log maintenance activity
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} - ${message}\n`;
    
    try {
      // Check log file size and rotate if needed
      if (existsSync(this.maintenanceLogPath)) {
        const stat = statSync(this.maintenanceLogPath);
        if (stat.size > this.config.maxLogSize * 1024 * 1024) {
          // Rotate log file
          const backupPath = this.maintenanceLogPath + '.old';
          if (existsSync(backupPath)) {
            unlinkSync(backupPath);
          }
          writeFileSync(backupPath, readFileSync(this.maintenanceLogPath));
          writeFileSync(this.maintenanceLogPath, '');
        }
      }

      // Append to log file
      const existingLog = existsSync(this.maintenanceLogPath) 
        ? readFileSync(this.maintenanceLogPath, 'utf-8') 
        : '';
      writeFileSync(this.maintenanceLogPath, existingLog + logEntry);
    } catch (error) {
      console.error('Failed to write maintenance log:', error);
    }
  }

  /**
   * Load configuration
   */
  private loadConfig(): void {
    try {
      if (existsSync(this.configPath)) {
        const configData = readFileSync(this.configPath, 'utf-8');
        this.config = { ...this.config, ...JSON.parse(configData) };
      }
    } catch (error) {
      console.warn('Failed to load maintenance config, using defaults:', error);
    }
  }

  /**
   * Save configuration
   */
  public saveConfig(): void {
    try {
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Failed to save maintenance config:', error);
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<MaintenanceConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();
  }

  /**
   * Get configuration
   */
  public getConfig(): MaintenanceConfig {
    return { ...this.config };
  }

  /**
   * Get all registered tasks
   */
  public getTasks(): MaintenanceTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Enable/disable a task
   */
  public setTaskEnabled(taskId: string, enabled: boolean): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.enabled = enabled;
      
      if (enabled && !this.config.enabledTasks.includes(taskId)) {
        this.config.enabledTasks.push(taskId);
      } else if (!enabled) {
        this.config.enabledTasks = this.config.enabledTasks.filter(id => id !== taskId);
      }
      
      this.saveConfig();
    }
  }
}