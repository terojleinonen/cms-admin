#!/usr/bin/env tsx

/**
 * Security Testing CLI Script
 * Command-line interface for running automated API security tests
 */

import { SecurityTestCLI } from '../__tests__/helpers/automated-security-testing';
import { program } from 'commander';

// CLI configuration
program
  .name('security-tests')
  .description('Run automated API security tests')
  .version('1.0.0');

program
  .command('run')
  .description('Run security tests for all endpoints')
  .option('-e, --endpoint <endpoint>', 'Test specific endpoint')
  .option('-v, --verbose', 'Verbose output')
  .option('-o, --output <file>', 'Save report to file')
  .action(async (options) => {
    try {
      await SecurityTestCLI.run({
        endpoint: options.endpoint,
        verbose: options.verbose,
        output: options.output,
      });
    } catch (error) {
      console.error('❌ Security tests failed:', error);
      process.exit(1);
    }
  });

program
  .command('discover')
  .description('Discover all API endpoints')
  .action(async () => {
    try {
      const { ApiEndpointDiscovery } = await import('../__tests__/helpers/automated-security-testing');
      const endpoints = await ApiEndpointDiscovery.discoverEndpoints();
      
      console.log('🔍 Discovered API Endpoints:');
      endpoints.forEach(endpoint => {
        console.log(`  ${endpoint}`);
      });
      
      console.log(`\n📊 Total endpoints: ${endpoints.length}`);
    } catch (error) {
      console.error('❌ Failed to discover endpoints:', error);
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('Analyze endpoint security configuration')
  .argument('<endpoint>', 'Endpoint to analyze')
  .action(async (endpoint) => {
    try {
      const { ApiEndpointDiscovery } = await import('../__tests__/helpers/automated-security-testing');
      const metadata = await ApiEndpointDiscovery.getEndpointMetadata(endpoint);
      
      console.log(`🔍 Analyzing endpoint: ${endpoint}`);
      console.log('📋 Metadata:');
      console.log(`  Methods: ${metadata.methods.join(', ')}`);
      console.log(`  Requires Auth: ${metadata.requiresAuth}`);
      console.log(`  Is Public: ${metadata.isPublic}`);
      console.log(`  Allowed Roles: ${metadata.allowedRoles.join(', ')}`);
      console.log(`  Required Permissions: ${metadata.requiredPermissions.length}`);
      
      if (metadata.requiredPermissions.length > 0) {
        metadata.requiredPermissions.forEach(perm => {
          console.log(`    - ${perm.resource}:${perm.action}${perm.scope ? `:${perm.scope}` : ''}`);
        });
      }
    } catch (error) {
      console.error('❌ Failed to analyze endpoint:', error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();