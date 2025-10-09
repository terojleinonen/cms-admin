import { SystemAlert } from './system-health-monitor'
import { db } from './db'

export interface AlertNotificationConfig {
  email?: {
    enabled: boolean
    recipients: string[]
    threshold: 'medium' | 'high' | 'critical'
  }
  webhook?: {
    enabled: boolean
    url: string
    threshold: 'medium' | 'high' | 'critical'
  }
  inApp?: {
    enabled: boolean
    threshold: 'low' | 'medium' | 'high' | 'critical'
  }
}

export interface AlertRule {
  id: string
  name: string
  description: string
  condition: string // JSON string describing the condition
  severity: 'low' | 'medium' | 'high' | 'critical'
  enabled: boolean
  cooldownMinutes: number
  lastTriggered?: Date
}

export class SystemAlertService {
  private static instance: SystemAlertService
  private config: AlertNotificationConfig
  private alertRules: AlertRule[] = []

  constructor() {
    this.config = {
      email: {
        enabled: false,
        recipients: [],
        threshold: 'high'
      },
      webhook: {
        enabled: false,
        url: '',
        threshold: 'critical'
      },
      inApp: {
        enabled: true,
        threshold: 'low'
      }
    }

    // Initialize default alert rules
    this.initializeDefaultRules()
  }

  static getInstance(): SystemAlertService {
    if (!SystemAlertService.instance) {
      SystemAlertService.instance = new SystemAlertService()
    }
    return SystemAlertService.instance
  }

  private initializeDefaultRules() {
    this.alertRules = [
      {
        id: 'cache-hit-rate-low',
        name: 'Low Cache Hit Rate',
        description: 'Permission cache hit rate is below threshold',
        condition: JSON.stringify({
          metric: 'permissionSystem.cacheHitRate',
          operator: '<',
          value: 0.8
        }),
        severity: 'medium',
        enabled: true,
        cooldownMinutes: 15
      },
      {
        id: 'response-time-high',
        name: 'High Response Time',
        description: 'Permission system response time is above threshold',
        condition: JSON.stringify({
          metric: 'permissionSystem.avgResponseTime',
          operator: '>',
          value: 100
        }),
        severity: 'high',
        enabled: true,
        cooldownMinutes: 10
      },
      {
        id: 'error-rate-high',
        name: 'High Error Rate',
        description: 'Permission system error rate is above threshold',
        condition: JSON.stringify({
          metric: 'permissionSystem.errorRate',
          operator: '>',
          value: 0.05
        }),
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 5
      },
      {
        id: 'memory-usage-high',
        name: 'High Memory Usage',
        description: 'System memory usage is above threshold',
        condition: JSON.stringify({
          metric: 'memory.percentage',
          operator: '>',
          value: 0.85
        }),
        severity: 'high',
        enabled: true,
        cooldownMinutes: 10
      },
      {
        id: 'database-slow-queries',
        name: 'Database Slow Queries',
        description: 'Database has too many slow queries',
        condition: JSON.stringify({
          metric: 'database.slowQueries',
          operator: '>',
          value: 10
        }),
        severity: 'medium',
        enabled: true,
        cooldownMinutes: 20
      }
    ]
  }

  async processAlert(alert: SystemAlert): Promise<void> {
    try {
      // Store alert in database for persistence
      await this.storeAlert(alert)

      // Check if we should send notifications
      if (this.shouldNotify(alert)) {
        await this.sendNotifications(alert)
      }

      // Log alert processing
      console.log(`Processed alert: ${alert.type} - ${alert.severity} - ${alert.message}`)
    } catch (error) {
      console.error('Error processing alert:', error)
    }
  }

  private async storeAlert(alert: SystemAlert): Promise<void> {
    try {
      // In a real implementation, this would store to a dedicated alerts table
      // For now, we'll use the audit log system
      await db.auditLog.create({
        data: {
          userId: 'system',
          action: 'SYSTEM_ALERT',
          resource: 'system_health',
          details: {
            alertId: alert.id,
            type: alert.type,
            severity: alert.severity,
            message: alert.message,
            details: alert.details
          },
          ipAddress: '127.0.0.1',
          userAgent: 'System Health Monitor',
          success: true
        }
      })
    } catch (error) {
      console.error('Error storing alert:', error)
    }
  }

  private shouldNotify(alert: SystemAlert): boolean {
    const { inApp, email, webhook } = this.config

    // Check in-app notifications
    if (inApp?.enabled && this.meetsSeverityThreshold(alert.severity, inApp.threshold)) {
      return true
    }

    // Check email notifications
    if (email?.enabled && this.meetsSeverityThreshold(alert.severity, email.threshold)) {
      return true
    }

    // Check webhook notifications
    if (webhook?.enabled && this.meetsSeverityThreshold(alert.severity, webhook.threshold)) {
      return true
    }

    return false
  }

  private meetsSeverityThreshold(
    alertSeverity: 'low' | 'medium' | 'high' | 'critical',
    threshold: 'low' | 'medium' | 'high' | 'critical'
  ): boolean {
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 }
    return severityLevels[alertSeverity] >= severityLevels[threshold]
  }

  private async sendNotifications(alert: SystemAlert): Promise<void> {
    const notifications: Promise<void>[] = []

    // Send email notifications
    if (this.config.email?.enabled && 
        this.meetsSeverityThreshold(alert.severity, this.config.email.threshold)) {
      notifications.push(this.sendEmailNotification(alert))
    }

    // Send webhook notifications
    if (this.config.webhook?.enabled && 
        this.meetsSeverityThreshold(alert.severity, this.config.webhook.threshold)) {
      notifications.push(this.sendWebhookNotification(alert))
    }

    // Send in-app notifications
    if (this.config.inApp?.enabled && 
        this.meetsSeverityThreshold(alert.severity, this.config.inApp.threshold)) {
      notifications.push(this.sendInAppNotification(alert))
    }

    await Promise.allSettled(notifications)
  }

  private async sendEmailNotification(alert: SystemAlert): Promise<void> {
    try {
      // In a real implementation, this would use an email service
      console.log(`Email notification sent for alert: ${alert.message}`)
      
      // Mock email sending
      const emailData = {
        to: this.config.email?.recipients || [],
        subject: `System Alert: ${alert.type} - ${alert.severity.toUpperCase()}`,
        body: `
          Alert Details:
          - Type: ${alert.type}
          - Severity: ${alert.severity}
          - Message: ${alert.message}
          - Timestamp: ${alert.timestamp}
          - Details: ${JSON.stringify(alert.details, null, 2)}
        `
      }

      // Here you would integrate with your email service (SendGrid, AWS SES, etc.)
      console.log('Email would be sent:', emailData)
    } catch (error) {
      console.error('Error sending email notification:', error)
    }
  }

  private async sendWebhookNotification(alert: SystemAlert): Promise<void> {
    try {
      if (!this.config.webhook?.url) return

      const payload = {
        alert: {
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          timestamp: alert.timestamp,
          details: alert.details
        },
        system: 'rbac-health-monitor'
      }

      const response = await fetch(this.config.webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RBAC-Health-Monitor/1.0'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`Webhook failed with status: ${response.status}`)
      }

      console.log(`Webhook notification sent for alert: ${alert.message}`)
    } catch (error) {
      console.error('Error sending webhook notification:', error)
    }
  }

  private async sendInAppNotification(alert: SystemAlert): Promise<void> {
    try {
      // In a real implementation, this would create in-app notifications
      // that users can see in the admin interface
      console.log(`In-app notification created for alert: ${alert.message}`)

      // This could integrate with a notification system or WebSocket for real-time updates
      // For now, we'll just log it
    } catch (error) {
      console.error('Error sending in-app notification:', error)
    }
  }

  // Configuration management methods
  updateConfig(newConfig: Partial<AlertNotificationConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  getConfig(): AlertNotificationConfig {
    return { ...this.config }
  }

  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const id = `custom-${Date.now()}`
    this.alertRules.push({ ...rule, id })
    return id
  }

  updateAlertRule(id: string, updates: Partial<AlertRule>): boolean {
    const index = this.alertRules.findIndex(rule => rule.id === id)
    if (index === -1) return false

    this.alertRules[index] = { ...this.alertRules[index], ...updates }
    return true
  }

  removeAlertRule(id: string): boolean {
    const index = this.alertRules.findIndex(rule => rule.id === id)
    if (index === -1) return false

    this.alertRules.splice(index, 1)
    return true
  }

  getAlertRules(): AlertRule[] {
    return [...this.alertRules]
  }

  // Test notification system
  async testNotifications(severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): Promise<void> {
    const testAlert: SystemAlert = {
      id: `test-${Date.now()}`,
      type: 'performance',
      severity,
      message: 'This is a test alert to verify the notification system is working correctly.',
      timestamp: new Date(),
      resolved: false,
      details: { test: true }
    }

    await this.processAlert(testAlert)
  }
}

export const systemAlertService = SystemAlertService.getInstance()