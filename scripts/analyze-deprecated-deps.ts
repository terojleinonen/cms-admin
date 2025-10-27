#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface DeprecatedDependency {
  name: string;
  version: string;
  deprecationMessage: string;
  parentDependencies: string[];
  replacementStrategy: 'update' | 'replace' | 'remove';
  riskLevel: 'low' | 'medium' | 'high';
}

interface DependencyAuditReport {
  timestamp: Date;
  deprecatedPackages: DeprecatedDependency[];
  resolutionStatus: {
    resolved: string[];
    pending: string[];
    blocked: string[];
  };
  riskAssessment: {
    security: 'low' | 'medium' | 'high';
    maintenance: 'low' | 'medium' | 'high';
    compatibility: 'low' | 'medium' | 'high';
  };
}

class DeprecatedDependencyAnalyzer {
  private packageLockPath: string;
  private packageJsonPath: string;
  private packageLock: any;
  private packageJson: any;

  constructor() {
    this.packageLockPath = join(process.cwd(), 'package-lock.json');
    this.packageJsonPath = join(process.cwd(), 'package.json');
    this.loadPackageFiles();
  }

  private loadPackageFiles(): void {
    try {
      this.packageLock = JSON.parse(readFileSync(this.packageLockPath, 'utf-8'));
      this.packageJson = JSON.parse(readFileSync(this.packageJsonPath, 'utf-8'));
    } catch (error) {
      throw new Error(`Failed to load package files: ${error}`);
    }
  }

  private findParentDependencies(targetPackage: string): string[] {
    const parents: string[] = [];
    const nodeModules = this.packageLock.packages;

    // Check direct dependencies
    const directDeps = {
      ...this.packageJson.dependencies,
      ...this.packageJson.devDependencies
    };

    if (directDeps[targetPackage]) {
      parents.push('ROOT');
    }

    // Check transitive dependencies
    for (const [packagePath, packageInfo] of Object.entries(nodeModules)) {
      if (packagePath === '' || packagePath === `node_modules/${targetPackage}`) continue;
      
      const deps = (packageInfo as any).dependencies || {};
      if (deps[targetPackage]) {
        const packageName = packagePath.replace('node_modules/', '').split('/')[0];
        parents.push(packageName);
      }
    }

    return parents;
  }

  private getReplacementStrategy(packageName: string): {
    strategy: 'update' | 'replace' | 'remove';
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const strategies: Record<string, { strategy: 'update' | 'replace' | 'remove'; riskLevel: 'low' | 'medium' | 'high' }> = {
      'lodash.isequal': { strategy: 'replace', riskLevel: 'low' },
      'node-domexception': { strategy: 'replace', riskLevel: 'medium' },
      'quill-delta': { strategy: 'remove', riskLevel: 'high' }, // Will be removed with Quill
      'formdata-polyfill': { strategy: 'update', riskLevel: 'medium' }
    };

    return strategies[packageName] || { strategy: 'update', riskLevel: 'medium' };
  }

  public analyzeDeprecatedDependencies(): DeprecatedDependency[] {
    const deprecated: DeprecatedDependency[] = [];
    const nodeModules = this.packageLock.packages;

    for (const [packagePath, packageInfo] of Object.entries(nodeModules)) {
      const info = packageInfo as any;
      if (info.deprecated) {
        const packageName = packagePath.replace('node_modules/', '');
        const parents = this.findParentDependencies(packageName);
        const { strategy, riskLevel } = this.getReplacementStrategy(packageName);

        deprecated.push({
          name: packageName,
          version: info.version,
          deprecationMessage: info.deprecated,
          parentDependencies: parents,
          replacementStrategy: strategy,
          riskLevel
        });
      }
    }

    return deprecated;
  }

  public generateReport(): DependencyAuditReport {
    const deprecatedPackages = this.analyzeDeprecatedDependencies();
    
    // Categorize packages by resolution status
    const resolved: string[] = [];
    const pending = deprecatedPackages.map(pkg => pkg.name);
    const blocked: string[] = [];

    // Assess overall risk
    const hasHighRisk = deprecatedPackages.some(pkg => pkg.riskLevel === 'high');
    const hasMediumRisk = deprecatedPackages.some(pkg => pkg.riskLevel === 'medium');

    return {
      timestamp: new Date(),
      deprecatedPackages,
      resolutionStatus: {
        resolved,
        pending,
        blocked
      },
      riskAssessment: {
        security: hasHighRisk ? 'high' : hasMediumRisk ? 'medium' : 'low',
        maintenance: hasHighRisk ? 'high' : 'medium',
        compatibility: deprecatedPackages.length > 3 ? 'high' : 'medium'
      }
    };
  }

  public generateDetailedReport(): string {
    const report = this.generateReport();
    const lines: string[] = [];

    lines.push('# Deprecated Dependencies Analysis Report');
    lines.push(`Generated: ${report.timestamp.toISOString()}`);
    lines.push('');

    lines.push('## Summary');
    lines.push(`- Total deprecated packages: ${report.deprecatedPackages.length}`);
    lines.push(`- Security risk: ${report.riskAssessment.security}`);
    lines.push(`- Maintenance risk: ${report.riskAssessment.maintenance}`);
    lines.push(`- Compatibility risk: ${report.riskAssessment.compatibility}`);
    lines.push('');

    lines.push('## Deprecated Packages');
    lines.push('');

    for (const pkg of report.deprecatedPackages) {
      lines.push(`### ${pkg.name}@${pkg.version}`);
      lines.push(`**Risk Level:** ${pkg.riskLevel.toUpperCase()}`);
      lines.push(`**Strategy:** ${pkg.replacementStrategy}`);
      lines.push(`**Deprecation Message:** ${pkg.deprecationMessage}`);
      lines.push(`**Parent Dependencies:** ${pkg.parentDependencies.join(', ')}`);
      lines.push('');

      // Add specific replacement guidance
      switch (pkg.name) {
        case 'lodash.isequal':
          lines.push('**Replacement:** Use Node.js native `util.isDeepStrictEqual()`');
          lines.push('**Impact:** Low - Direct function replacement available');
          break;
        case 'node-domexception':
          lines.push('**Replacement:** Use platform-native `DOMException`');
          lines.push('**Impact:** Medium - May require polyfill updates');
          break;
        default:
          lines.push('**Replacement:** Update to latest version or find alternative');
      }
      lines.push('');
    }

    lines.push('## Resolution Plan');
    lines.push('');
    lines.push('1. **Phase 1:** Replace lodash.isequal with native util.isDeepStrictEqual');
    lines.push('2. **Phase 2:** Replace node-domexception with native DOMException');
    lines.push('3. **Phase 3:** Update or replace remaining deprecated packages');
    lines.push('4. **Phase 4:** Implement prevention measures (ESLint rules, CI checks)');
    lines.push('');

    return lines.join('\n');
  }

  public saveReport(outputPath?: string): void {
    const reportPath = outputPath || join(process.cwd(), 'deprecated-dependencies-report.md');
    const report = this.generateDetailedReport();
    writeFileSync(reportPath, report, 'utf-8');
    console.log(`Report saved to: ${reportPath}`);
  }
}

// CLI execution
if (process.argv[1] && process.argv[1].endsWith('analyze-deprecated-deps.ts')) {
  try {
    const analyzer = new DeprecatedDependencyAnalyzer();
    const report = analyzer.generateReport();
    
    console.log('🔍 Deprecated Dependencies Analysis');
    console.log('=====================================');
    console.log(`Found ${report.deprecatedPackages.length} deprecated packages:`);
    console.log('');

    for (const pkg of report.deprecatedPackages) {
      console.log(`📦 ${pkg.name}@${pkg.version} (${pkg.riskLevel} risk)`);
      console.log(`   Strategy: ${pkg.replacementStrategy}`);
      console.log(`   Parents: ${pkg.parentDependencies.join(', ')}`);
      console.log(`   Message: ${pkg.deprecationMessage}`);
      console.log('');
    }

    console.log('Risk Assessment:');
    console.log(`- Security: ${report.riskAssessment.security}`);
    console.log(`- Maintenance: ${report.riskAssessment.maintenance}`);
    console.log(`- Compatibility: ${report.riskAssessment.compatibility}`);
    console.log('');

    // Save detailed report
    analyzer.saveReport();
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

export { DeprecatedDependencyAnalyzer, type DeprecatedDependency, type DependencyAuditReport };