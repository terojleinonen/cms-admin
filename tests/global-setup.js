/**
 * Jest Global Setup
 * Sets up the test database environment before running tests
 */

const { execSync } = require('child_process')

module.exports = async () => {
  console.log('🚀 Setting up test environment...')
  
  try {
    // Set test environment
    process.env.NODE_ENV = 'test'
    
    // Setup test database
    execSync('node scripts/setup-test-database.js', {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    })
    
    console.log('✅ Test environment setup complete')
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error.message)
    process.exit(1)
  }
}