/**
 * Jest Global Teardown
 * Cleans up the test environment after running tests
 */

module.exports = async () => {
  console.log('🧹 Cleaning up test environment...')
  
  try {
    // Import cleanup functions
    const { testDatabaseManager } = require('./helpers/test-database-manager')
    
    // Disconnect from test database
    if (testDatabaseManager.isConnected()) {
      await testDatabaseManager.disconnect()
    }
    
    console.log('✅ Test environment cleanup complete')
  } catch (error) {
    console.error('❌ Failed to cleanup test environment:', error.message)
    // Don't exit with error - cleanup should be best effort
  }
}