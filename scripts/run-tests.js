#!/usr/bin/env node

/**
 * Test Runner Script
 * Runs different types of tests with proper configuration and reporting
 */

const { spawn } = require('child_process')
const path = require('path')

// Test configurations
const TEST_CONFIGS = {
  unit: {
    description: 'Unit Tests (Utilities and Services)',
    pattern: '__tests__/lib/**/*.test.ts',
    coverage: true,
  },
  integration: {
    description: 'Integration Tests (API Endpoints)',
    pattern: '__tests__/api/**/*.test.ts',
    coverage: true,
    timeout: 30000,
  },
  components: {
    description: 'Component Tests (React Components)',
    pattern: '__tests__/components/**/*.test.tsx',
    coverage: true,
    environment: 'jsdom',
  },
  e2e: {
    description: 'End-to-End Tests (User Workflows)',
    pattern: '__tests__/e2e/**/*.test.ts',
    coverage: false,
    timeout: 60000,
  },
  all: {
    description: 'All Tests',
    pattern: '__tests__/**/*.test.{ts,tsx}',
    coverage: true,
  },
}

// Parse command line arguments
const args = process.argv.slice(2)
const testType = args[0] || 'all'
const watchMode = args.includes('--watch')
const verbose = args.includes('--verbose')
const updateSnapshots = args.includes('--updateSnapshot')

if (!TEST_CONFIGS[testType]) {
  console.error(`Unknown test type: ${testType}`)
  console.error(`Available types: ${Object.keys(TEST_CONFIGS).join(', ')}`)
  process.exit(1)
}

const config = TEST_CONFIGS[testType]

console.log(`\n🧪 Running ${config.description}...\n`)

// Build Jest command
const jestArgs = [
  '--config', 'jest.config.js',
  config.pattern,
]

if (config.coverage) {
  jestArgs.push('--coverage')
}

if (config.timeout) {
  jestArgs.push('--testTimeout', config.timeout.toString())
}

if (watchMode) {
  jestArgs.push('--watch')
}

if (verbose) {
  jestArgs.push('--verbose')
}

if (updateSnapshots) {
  jestArgs.push('--updateSnapshot')
}

// Add environment-specific args
if (config.environment) {
  jestArgs.push('--testEnvironment', config.environment)
}

// Run Jest
const jest = spawn('npx', ['jest', ...jestArgs], {
  stdio: 'inherit',
  cwd: process.cwd(),
})

jest.on('close', (code) => {
  if (code === 0) {
    console.log(`\n✅ ${config.description} completed successfully!`)
    
    if (config.coverage) {
      console.log('\n📊 Coverage report generated in ./coverage/')
      console.log('   Open ./coverage/lcov-report/index.html to view detailed coverage')
    }
  } else {
    console.error(`\n❌ ${config.description} failed with exit code ${code}`)
  }
  
  process.exit(code)
})

jest.on('error', (error) => {
  console.error(`\n❌ Failed to start tests: ${error.message}`)
  process.exit(1)
})