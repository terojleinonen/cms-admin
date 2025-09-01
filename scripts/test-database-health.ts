#!/usr/bin/env tsx

/**
 * Database Health Check Test Script
 * Tests the enhanced database health monitoring functionality
 */

import { getDatabaseHealth, DatabaseConnectionManager, testDatabaseConnection } from '../app/lib/db'

async function testDatabaseHealth() {
  console.log('🔍 Testing Database Health Monitoring...\n')

  try {
    // Test basic connection
    console.log('1. Testing basic database connection...')
    const isConnected = await testDatabaseConnection()
    console.log(`   ✅ Connection test: ${isConnected ? 'PASSED' : 'FAILED'}\n`)

    if (!isConnected) {
      console.log('❌ Database connection failed. Please check your DATABASE_URL.')
      process.exit(1)
    }

    // Test comprehensive health check
    console.log('2. Testing comprehensive health check...')
    const health = await getDatabaseHealth()
    console.log('   📊 Health Status:')
    console.log(`      Connected: ${health.connected}`)
    console.log(`      Latency: ${health.latency}ms`)
    
    if (health.database) {
      console.log(`      Database: ${health.database.name}`)
      console.log(`      Version: ${health.database.version}`)
      console.log(`      Size: ${health.database.size}`)
    }
    
    if (health.connectionPool) {
      console.log(`      Active Connections: ${health.connectionPool.active}`)
      console.log(`      Idle Connections: ${health.connectionPool.idle}`)
      console.log(`      Total Connections: ${health.connectionPool.total}`)
    }
    
    console.log('')

    // Test connection manager
    console.log('3. Testing connection manager...')
    const connectionManager = DatabaseConnectionManager.getInstance()
    
    const connectionStats = await connectionManager.getConnectionStats()
    console.log('   🔗 Connection Statistics:')
    console.log(`      Current: ${connectionStats.current}`)
    console.log(`      Max: ${connectionStats.max}`)
    console.log(`      Available: ${connectionStats.available}`)
    console.log(`      Health: ${connectionStats.health}`)
    console.log('')

    const performanceMetrics = await connectionManager.getPerformanceMetrics()
    console.log('   ⚡ Performance Metrics:')
    console.log(`      Slow Queries: ${performanceMetrics.slowQueries}`)
    console.log(`      Avg Query Time: ${performanceMetrics.avgQueryTime}ms`)
    console.log(`      Cache Hit Ratio: ${performanceMetrics.cacheHitRatio}%`)
    console.log(`      Index Usage: ${performanceMetrics.indexUsage}%`)
    console.log('')

    console.log('🎉 All database health tests passed!')
    console.log('')
    console.log('📋 Summary:')
    console.log(`   • Database: ${health.database?.name || 'Unknown'}`)
    console.log(`   • Version: ${health.database?.version || 'Unknown'}`)
    console.log(`   • Size: ${health.database?.size || 'Unknown'}`)
    console.log(`   • Latency: ${health.latency}ms`)
    console.log(`   • Connection Health: ${connectionStats.health}`)
    console.log(`   • Cache Hit Ratio: ${performanceMetrics.cacheHitRatio.toFixed(1)}%`)

  } catch (error) {
    console.error('❌ Database health test failed:', error.message)
    process.exit(1)
  }
}

// Run the test
testDatabaseHealth()