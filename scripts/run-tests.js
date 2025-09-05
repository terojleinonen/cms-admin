#!/usr/bin/env node

/**
 * Test Runner Script
 * Runs different types of tests with proper configuration and reporting
 */

const { spawn } = require('child_process')

// Test configurations
const TEST_CONFIGS = {
  unit: {
    description: 'Unit Tests (Utilities and Services)',
    project: 'node',
    coverage: true,
  },
  integration: {
    description: 'Integration Tests (API Endpoints and Database)',
    project: 'node',
    coverage: true,
    timeout: 60000,
  },
  components: {
    description: 'Component Tests (React Components)',
    project: 'jsdom',
    coverage: true,
  },
  all: {
    description: 'All Tests',
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

// Setup test database for integration tests
if (testType === 'integration' || testType === 'all') {
  console.log('🔧 Setting up test database...')
  try {
    const { execSync } = require('child_process')
    execSync('node scripts/setup-test-database.js', {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    })
    console.log('✅ Test database ready\n')
  } catch (error) {
    console.error('❌ Failed to setup test database:', error.message)
    process.exit(1)
  }
}

// Build Jest command
const jestArgs = [
  '--config', 'jest.config.js',
]

// Add project filter if specified
if (config.project && testType !== 'all') {
  jestArgs.push('--selectProjects', config.project)
}

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