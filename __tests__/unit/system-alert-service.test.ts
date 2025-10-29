import { SystemAlertService } from '../../app/lib/system-alert-service'

// Mock dependencies
jest.mock('../../app/lib/db', () => ({
  db: {
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: 'test-audit-log' })
    }
  }
}))

// Mock fetch for webhook testing
global.fetch = jest.fn()

describe('SystemAlertService', () => {
  let alertService: SystemAlertService

  beforeEach(() => {
    alertService = SystemAlertService.getInstance()
    jest.clearAllMocks()
  })

  describe('configuration management', () => {
    it('should update configuration', () => {
      const newConfig = {
        email: {
          enabled: true,
          recipients: ['test@example.com'],
          threshold: 'medium' as const
        }
      }

      alertService.updateConfig(newConfig)
      const config = alertService.getConfig()

      expect(config.email?.enabled).toBe(true)
      expect(config.email?.recipients).toContain('test@example.com')
      expect(config.email?.threshold).toBe('medium')
    })

    it('should get current configuration', () => {
      const config = alertService.getConfig()

      expect(config).toBeDefined()
      expect(config.email).toBeDefined()
      expect(config.webhook).toBeDefined()
      expect(config.inApp).toBeDefined()
    })
  })

  describe('alert rule management', () => {
    it('should add new alert rule', () => {
      const rule = {
        name: 'Test Rule',
        description: 'Test description',
        condition: 'test > 100',
        severity: 'medium' as const,
        enabled: true,
        cooldownMinutes: 10
      }

      const ruleId = alertService.addAlertRule(rule)

      expect(ruleId).toBeDefined()
      expect(ruleId).toMatch(/^custom-\d+$/)

      const rules = alertService.getAlertRules()
      const addedRule = rules.find(r => r.id === ruleId)
      expect(addedRule).toBeDefined()
      expect(addedRule?.name).toBe('Test Rule')
    })

    it('should update existing alert rule', () => {
      const rules = alertService.getAlertRules()
      if (rules.length > 0) {
        const ruleId = rules[0].id
        const updates = { enabled: false, severity: 'high' as const }

        const updated = alertService.updateAlertRule(ruleId, updates)

        expect(updated).toBe(true)

        const updatedRules = alertService.getAlertRules()
        const updatedRule = updatedRules.find(r => r.id === ruleId)
        expect(updatedRule?.enabled).toBe(false)
        expect(updatedRule?.severity).toBe('high')
      }
    })

    it('should return false when updating non-existent rule', () => {
      const updated = alertService.updateAlertRule('non-existent', { enabled: false })
      expect(updated).toBe(false)
    })

    it('should remove alert rule', () => {
      const initialRules = alertService.getAlertRules()
      const initialCount = initialRules.length

      if (initialCount > 0) {
        const ruleId = initialRules[0].id
        const removed = alertService.removeAlertRule(ruleId)

        expect(removed).toBe(true)

        const remainingRules = alertService.getAlertRules()
        expect(remainingRules.length).toBe(initialCount - 1)
        expect(remainingRules.find(r => r.id === ruleId)).toBeUndefined()
      }
    })

    it('should return false when removing non-existent rule', () => {
      const removed = alertService.removeAlertRule('non-existent')
      expect(removed).toBe(false)
    })
  })

  describe('alert processing', () => {
    it('should process alert and store in database', async () => {
      const alert = {
        id: 'test-alert',
        type: 'performance' as const,
        severity: 'medium' as const,
        message: 'Test alert message',
        timestamp: new Date(),
        resolved: false,
        details: { test: true }
      }

      await alertService.processAlert(alert)

      // Verify database storage was called
      const { db } = require('../../app/lib/db')
      expect(db.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'system',
          action: 'SYSTEM_ALERT',
          resource: 'system_health',
          details: expect.objectContaining({
            alertId: alert.id,
            type: alert.type,
            severity: alert.severity,
            message: alert.message
          })
        })
      })
    })

    it('should send notifications when configured', async () => {
      // Configure notifications
      alertService.updateConfig({
        inApp: { enabled: true, threshold: 'low' },
        email: { enabled: true, recipients: ['test@example.com'], threshold: 'medium' },
        webhook: { enabled: true, url: 'https://example.com/webhook', threshold: 'high' }
      })

      const alert = {
        id: 'test-alert-high',
        type: 'performance' as const,
        severity: 'high' as const,
        message: 'High severity test alert',
        timestamp: new Date(),
        resolved: false
      }

      // Mock successful webhook response
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200
      })

      await alertService.processAlert(alert)

      // Verify webhook was called
      expect(fetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining(alert.id)
        })
      )
    })
  })

  describe('test notifications', () => {
    it('should send test notification', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      await alertService.testNotifications('medium')

      // Verify that processing was attempted (console logs would be called)
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })
})