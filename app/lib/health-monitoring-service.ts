import { systemHealthMonitor } from './system-health-monitor'
import { systemAlertService } from './system-alert-service'

export class HealthMonitoringService {
  private static instance: HealthMonitoringService
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private intervalMinutes = 1 // Collect metrics every minute

  static getInstance(): HealthMonitoringService {
    if (!HealthMonitoringService.instance) {
      HealthMonitoringService.instance = new HealthMonitoringService()
    }
    return HealthMonitoringService.instance
  }

  start(): void {
    if (this.isRunning) {
      console.log('Health monitoring service is already running')
      return
    }

    console.log('Starting health monitoring service...')
    this.isRunning = true

    // Collect initial metrics
    this.collectAndProcessMetrics()

    // Set up interval for regular collection
    this.intervalId = setInterval(() => {
      this.collectAndProcessMetrics()
    }, this.intervalMinutes * 60 * 1000)

    console.log(`Health monitoring service started with ${this.intervalMinutes}-minute intervals`)
  }

  stop(): void {
    if (!this.isRunning) {
      console.log('Health monitoring service is not running')
      return
    }

    console.log('Stopping health monitoring service...')
    
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    this.isRunning = false
    console.log('Health monitoring service stopped')
  }

  isServiceRunning(): boolean {
    return this.isRunning
  }

  setInterval(minutes: number): void {
    if (minutes < 1) {
      throw new Error('Interval must be at least 1 minute')
    }

    this.intervalMinutes = minutes

    if (this.isRunning) {
      // Restart with new interval
      this.stop()
      this.start()
    }
  }

  getInterval(): number {
    return this.intervalMinutes
  }

  private async collectAndProcessMetrics(): Promise<void> {
    try {
      console.log('Collecting health metrics...')
      
      // Collect current metrics
      const metrics = await systemHealthMonitor.collectMetrics()
      
      // Process any new alerts
      const activeAlerts = metrics.alerts.filter(alert => !alert.resolved)
      
      for (const alert of activeAlerts) {
        await systemAlertService.processAlert(alert)
      }

      console.log(`Health metrics collected. Status: ${systemHealthMonitor.getSystemStatus()}, Active alerts: ${activeAlerts.length}`)
    } catch (error) {
      console.error('Error collecting health metrics:', error)
      
      // Create a critical alert for monitoring system failure
      const monitoringAlert = {
        id: `monitoring-failure-${Date.now()}`,
        type: 'error' as const,
        severity: 'critical' as const,
        message: 'Health monitoring system encountered an error',
        timestamp: new Date(),
        resolved: false,
        details: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        }
      }

      await systemAlertService.processAlert(monitoringAlert)
    }
  }

  // Manual trigger for immediate metrics collection
  async collectNow(): Promise<void> {
    await this.collectAndProcessMetrics()
  }

  // Get service status information
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalMinutes: this.intervalMinutes,
      nextCollection: this.intervalId ? new Date(Date.now() + this.intervalMinutes * 60 * 1000) : null
    }
  }
}

// Global instance
export const healthMonitoringService = HealthMonitoringService.getInstance()

// Auto-start the service in production
if (process.env.NODE_ENV === 'production') {
  // Start monitoring after a short delay to allow the application to initialize
  setTimeout(() => {
    healthMonitoringService.start()
  }, 5000)
}