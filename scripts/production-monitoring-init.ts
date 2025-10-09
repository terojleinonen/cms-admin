#!/usr/bin/env tsx

/**
 * Production Monitoring Initialization Script
 * Initializes and starts all production monitoring and maintenance services
 */

import { productionHealthMonitor } from '../app/lib/production-health-monitor'
import { backupRecoverySystem } from '../app/lib/backup-recovery-system'
import { maintenanceProcedures } from '../app/lib/maintenance-procedures'

async function initializeProductionMonitoring() {
  console.log('🚀 Initializing Production Monitoring Services...')
  
  try {
    // Initialize backup system
    console.log('📦 Initializing backup and recovery system...')
    await backupRecoverySystem.initialize()
    console.log('✅ Backup system initialized')

    // Start automated backups
    console.log('⏰ Starting automated backup scheduling...')
    await backupRecoverySystem.scheduleAutomatedBackups()
    console.log('✅ Automated backups scheduled')

    // Start health monitoring
    console.log('🏥 Starting continuous health monitoring...')
    await productionHealthMonitor.startContinuousMonitoring(60000) // Every minute
    console.log('✅ Health monitoring started')

    // Start maintenance task scheduling
    console.log('🔧 Starting maintenance task scheduling...')
    await maintenanceProcedures.scheduleMaintenanceTasks()
    console.log('✅ Maintenance tasks scheduled')

    // Create initial backup
    console.log('💾 Creating initial system backup...')
    const initialBackup = await backupRecoverySystem.createRBACOnlyBackup()
    console.log(`✅ Initial backup created: ${initialBackup.id}`)

    // Run initial health check
    console.log('🔍 Running initial system health check...')
    const health = await productionHealthMonitor.getSystemHealth()
    console.log(`✅ System health: ${health.overall}`)

    if (health.overall === 'critical') {
      console.error('❌ CRITICAL: System health check failed!')
      console.error('Critical metrics:', health.metrics.filter(m => m.status === 'critical'))
      process.exit(1)
    }

    console.log('🎉 Production monitoring services initialized successfully!')
    console.log('')
    console.log('📊 Monitoring Status:')
    console.log(`   - Health Monitoring: Active (60s intervals)`)
    console.log(`   - Automated Backups: Scheduled`)
    console.log(`   - Maintenance Tasks: Scheduled`)
    console.log(`   - System Health: ${health.overall.toUpperCase()}`)
    console.log('')
    console.log('🌐 Access monitoring dashboard at: /admin/production')
    console.log('')

  } catch (error) {
    console.error('❌ Failed to initialize production monitoring:', error)
    process.exit(1)
  }
}

async function gracefulShutdown() {
  console.log('\n🛑 Shutting down production monitoring services...')
  
  try {
    await productionHealthMonitor.cleanup()
    await backupRecoverySystem.cleanup()
    await maintenanceProcedures.cleanup()
    console.log('✅ Production monitoring services shut down gracefully')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error during shutdown:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)

// Start initialization
if (require.main === module) {
  initializeProductionMonitoring().catch((error) => {
    console.error('❌ Initialization failed:', error)
    process.exit(1)
  })
}

export { initializeProductionMonitoring }