#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Test categories with optimized configurations
const testConfigs = {
  unit: {
    testMatch: [
      '**/__tests__/components/**/*.test.(js|jsx|ts|tsx)',
      '**/__tests__/lib/**/*.test.(js|jsx|ts|tsx)',
      '**/__tests__/utils/**/*.test.(js|jsx|ts|tsx)',
    ],
    maxWorkers: '75%',
    testTimeout: 15000,
  },
  
  integration: {
    testMatch: [
      '**/tests/integration/**/*.test.(js|jsx|ts|tsx)',
      '**/__tests__/api/**/*.test.(js|jsx|ts|tsx)',
    ],
    maxWorkers: '50%',
    testTimeout: 30000,
    runInBand: true, // Run serially to avoid database conflicts
  },
  
  e2e: {
    testMatch: [
      '**/tests/e2e/**/*.test.(js|jsx|ts|tsx)',
      '**/__tests__/e2e/**/*.test.(js|jsx|ts|tsx)',
    ],
    maxWorkers: 1,
    testTimeout: 60000,
    runInBand: true,
  },
  
  fast: {
    testMatch: [
      '**/__tests__/components/**/*.test.(js|jsx|ts|tsx)',
      '**/__tests__/lib/**/*.test.(js|jsx|ts|tsx)',
      '!**/__tests__/**/comprehensive.*',
      '!**/__tests__/**/performance.*',
    ],
    maxWorkers: 1, // Single worker for memory efficiency
    testTimeout: 10000,
    bail: 1, // Stop on first failure
    runInBand: true, // Force serial execution
  },
  
  memory: {
    testMatch: [
      '**/__tests__/setup-verification.test.ts',
      '**/__tests__/lib/**/*.test.(js|jsx|ts|tsx)',
    ],
    maxWorkers: 1,
    testTimeout: 8000,
    bail: 1,
    runInBand: true,
  }
};

function runTests(category = 'unit', options = {}) {
  const config = testConfigs[category] || testConfigs.unit;
  
  const jestArgs = [
    '--config', 'jest.config.js',
    '--passWithNoTests',
    '--detectOpenHandles',
    '--forceExit',
  ];
  
  // Add test pattern
  if (config.testMatch) {
    jestArgs.push('--testMatch', ...config.testMatch);
  }
  
  // Add performance options
  if (config.runInBand) {
    jestArgs.push('--runInBand');
  } else if (config.maxWorkers) {
    jestArgs.push('--maxWorkers', config.maxWorkers);
  }
  
  if (config.testTimeout) {
    jestArgs.push('--testTimeout', config.testTimeout.toString());
  }
  
  if (config.bail) {
    jestArgs.push('--bail', config.bail.toString());
  }
  
  // Add user options
  if (options.watch) {
    jestArgs.push('--watch');
  }
  
  if (options.coverage) {
    jestArgs.push('--coverage');
  } else {
    jestArgs.push('--no-coverage');
  }
  
  if (options.verbose) {
    jestArgs.push('--verbose');
  }
  
  if (options.silent) {
    jestArgs.push('--silent');
  }
  
  console.log(`🧪 Running ${category} tests...`);
  console.log(`Command: npx jest ${jestArgs.join(' ')}`);
  
  const jest = spawn('npx', ['jest', ...jestArgs], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  
  jest.on('close', (code) => {
    if (code === 0) {
      console.log(`✅ ${category} tests completed successfully`);
    } else {
      console.log(`❌ ${category} tests failed with exit code ${code}`);
    }
    process.exit(code);
  });
  
  jest.on('error', (error) => {
    console.error(`Failed to start Jest: ${error.message}`);
    process.exit(1);
  });
}

// Parse command line arguments
const args = process.argv.slice(2);
const category = args[0] || 'unit';
const options = {
  watch: args.includes('--watch'),
  coverage: args.includes('--coverage'),
  verbose: args.includes('--verbose'),
  silent: args.includes('--silent'),
};

// Validate category
if (!testConfigs[category]) {
  console.error(`❌ Unknown test category: ${category}`);
  console.log('Available categories:', Object.keys(testConfigs).join(', '));
  process.exit(1);
}

runTests(category, options);