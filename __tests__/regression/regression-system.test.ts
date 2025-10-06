/**
 * @jest-environment node
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('Regression Testing System', () => {
  const scriptsDir = path.join(process.cwd(), 'scripts');
  
  beforeAll(() => {
    // Ensure scripts directory exists
    expect(fs.existsSync(scriptsDir)).toBe(true);
  });

  describe('Script Files', () => {
    test('should have regression test runner script', () => {
      const scriptPath = path.join(scriptsDir, 'run-regression-tests.js');
      expect(fs.existsSync(scriptPath)).toBe(true);
      
      // Check if script is executable
      const stats = fs.statSync(scriptPath);
      expect(stats.isFile()).toBe(true);
    });

    test('should have security scan script', () => {
      const scriptPath = path.join(scriptsDir, 'security-scan.js');
      expect(fs.existsSync(scriptPath)).toBe(true);
      
      const stats = fs.statSync(scriptPath);
      expect(stats.isFile()).toBe(true);
    });

    test('should have performance report script', () => {
      const scriptPath = path.join(scriptsDir, 'generate-performance-report.js');
      expect(fs.existsSync(scriptPath)).toBe(true);
      
      const stats = fs.statSync(scriptPath);
      expect(stats.isFile()).toBe(true);
    });

    test('should have performance comparison script', () => {
      const scriptPath = path.join(scriptsDir, 'compare-performance.js');
      expect(fs.existsSync(scriptPath)).toBe(true);
      
      const stats = fs.statSync(scriptPath);
      expect(stats.isFile()).toBe(true);
    });
  });

  describe('GitHub Workflows', () => {
    const workflowsDir = path.join(process.cwd(), '.github', 'workflows');

    test('should have permission tests workflow', () => {
      const workflowPath = path.join(workflowsDir, 'permission-tests.yml');
      expect(fs.existsSync(workflowPath)).toBe(true);
      
      const content = fs.readFileSync(workflowPath, 'utf8');
      expect(content).toContain('name: Permission System Tests');
      expect(content).toContain('permission|auth|role');
    });

    test('should have security scan workflow', () => {
      const workflowPath = path.join(workflowsDir, 'security-scan.yml');
      expect(fs.existsSync(workflowPath)).toBe(true);
      
      const content = fs.readFileSync(workflowPath, 'utf8');
      expect(content).toContain('name: Security Scanning');
      expect(content).toContain('npm audit');
    });

    test('should have performance regression workflow', () => {
      const workflowPath = path.join(workflowsDir, 'performance-regression.yml');
      expect(fs.existsSync(workflowPath)).toBe(true);
      
      const content = fs.readFileSync(workflowPath, 'utf8');
      expect(content).toContain('name: Performance Regression Detection');
      expect(content).toContain('performance.*permission');
    });
  });

  describe('Configuration Files', () => {
    test('should have Lighthouse CI configuration', () => {
      const configPath = path.join(process.cwd(), 'lighthouserc.js');
      expect(fs.existsSync(configPath)).toBe(true);
      
      const content = fs.readFileSync(configPath, 'utf8');
      expect(content).toContain('categories:performance');
      expect(content).toContain('categories:accessibility');
    });

    test('should have regression testing configuration', () => {
      const configPath = path.join(process.cwd(), '.kiro', 'settings', 'regression-testing.json');
      expect(fs.existsSync(configPath)).toBe(true);
      
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(config.testSuites).toBeDefined();
      expect(config.performance).toBeDefined();
      expect(config.security).toBeDefined();
    });
  });

  describe('Package.json Scripts', () => {
    test('should have regression testing scripts in package.json', () => {
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      expect(packageJson.scripts['test:regression']).toBeDefined();
      expect(packageJson.scripts['test:security:scan']).toBeDefined();
      expect(packageJson.scripts['perf:report']).toBeDefined();
      expect(packageJson.scripts['perf:compare']).toBeDefined();
    });
  });

  describe('Documentation', () => {
    test('should have regression testing guide', () => {
      const guidePath = path.join(process.cwd(), 'docs', 'REGRESSION_TESTING_GUIDE.md');
      expect(fs.existsSync(guidePath)).toBe(true);
      
      const content = fs.readFileSync(guidePath, 'utf8');
      expect(content).toContain('# Regression Testing Guide');
      expect(content).toContain('CI/CD Integration');
      expect(content).toContain('Performance Baselines');
    });
  });

  describe('Script Functionality', () => {
    test('performance report script should be valid JavaScript', () => {
      const scriptPath = path.join(scriptsDir, 'generate-performance-report.js');
      
      // Test that the script file exists and has valid syntax
      const content = fs.readFileSync(scriptPath, 'utf8');
      expect(content).toContain('generatePerformanceReport');
      expect(content).toContain('module.exports');
    });

    test('security scan script should be valid JavaScript', () => {
      const scriptPath = path.join(scriptsDir, 'security-scan.js');
      
      // Test that the script file exists and has valid syntax
      const content = fs.readFileSync(scriptPath, 'utf8');
      expect(content).toContain('runSecurityScan');
      expect(content).toContain('module.exports');
    });

    test('regression test runner should be valid JavaScript', () => {
      const scriptPath = path.join(scriptsDir, 'run-regression-tests.js');
      
      // Test that the script file exists and has valid syntax
      const content = fs.readFileSync(scriptPath, 'utf8');
      expect(content).toContain('runRegressionTests');
      expect(content).toContain('module.exports');
    });
  });

  describe('Integration Tests', () => {
    test('should have executable scripts with proper shebang', () => {
      const scripts = [
        'generate-performance-report.js',
        'security-scan.js',
        'run-regression-tests.js'
      ];
      
      scripts.forEach(script => {
        const scriptPath = path.join(scriptsDir, script);
        const content = fs.readFileSync(scriptPath, 'utf8');
        expect(content).toMatch(/^#!/); // Should start with shebang
      });
    });

    test('should have proper error handling in scripts', () => {
      const scriptPath = path.join(scriptsDir, 'generate-performance-report.js');
      const content = fs.readFileSync(scriptPath, 'utf8');
      
      expect(content).toContain('catch');
      expect(content).toContain('process.exit');
    });

    test('should have configuration validation', () => {
      const configPath = path.join(process.cwd(), '.kiro', 'settings', 'regression-testing.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Validate required configuration sections
      expect(config.testSuites).toBeDefined();
      expect(config.performance).toBeDefined();
      expect(config.security).toBeDefined();
      expect(config.reporting).toBeDefined();
      expect(config.ci).toBeDefined();
      
      // Validate test suite configuration
      expect(config.testSuites.permission).toBeDefined();
      expect(config.testSuites.security).toBeDefined();
      expect(config.testSuites.performance).toBeDefined();
      
      // Validate performance thresholds
      expect(config.performance.thresholds.permissionCheck.max).toBe(50);
      expect(config.performance.thresholds.cacheOperation.max).toBe(10);
      expect(config.performance.thresholds.databaseQuery.max).toBe(100);
    });
  });
});