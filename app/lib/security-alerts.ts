/**
 * Security Alert Service
 * Handles automated alerting for security events
 */

import { SecurityEventType, SecuritySeverity } from './security-monitoring';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  eventType: SecurityEventType;
  conditions: AlertCondition[];
  actions: AlertAction[];
  enabled: boolean;
  cooldownMinutes: number;
}

export interface AlertCondition {
  type: 'COUNT' | 'RATE' | 'PATTERN' | 'THRESHOLD';
  field?: string;
  operator: 'GT' | 'LT' | 'EQ' | 'CONTAINS' | 'REGEX';
  value: any;
  timeWindow?: number; // minutes
}

export interface AlertAction {
  type: 'EMAIL' | 'WEBHOOK' | 'SMS' | 'SLACK' | 'LOG' | 'BLOCK_IP' | 'LOCK_ACCOUNT';
  config: Record<string, any>;
  priority: number;
}

export interface AlertInstance {
  id: string;
  ruleId: string;
  eventId: string;
  severity: SecuritySeverity;
  message: string;
  details: Record<string, any>;
  triggeredAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

/**
 * Security Alert Manager
 */
export class SecurityAlertManager {
  private rules: Map<string, AlertRule> = new Map();
  private alertCooldowns: Map<string, Date> = new Map();
  private activeAlerts: Map<string, AlertInstance> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'brute-force-detection',
        name: 'Brute Force Attack Detection',
        description: 'Detect multiple failed login attempts from same IP',
        eventType: 'FAILED_AUTHENTICATION',
        conditions: [
          {
            type: 'COUNT',
            operator: 'GT',
            value: 5,
            timeWindow: 15
          }
        ],
        actions: [
          {
            type: 'EMAIL',
            config: {
              recipients: ['security@company.com'],
              template: 'brute-force-alert'
            },
            priority: 1
          },
          {
            type: 'BLOCK_IP',
            config: {
              duration: 3600 // 1 hour
            },
            priority: 2
          }
        ],
        enabled: true,
        cooldownMinutes: 30
      },
      {
        id: 'privilege-escalation',
        name: 'Privilege Escalation Detection',
        description: 'Detect unauthorized role changes',
        eventType: 'ROLE_ESCALATION',
        conditions: [
          {
            type: 'COUNT',
            operator: 'GT',
            value: 0,
            timeWindow: 1
          }
        ],
        actions: [
          {
            type: 'EMAIL',
            config: {
              recipients: ['security@company.com', 'admin@company.com'],
              template: 'privilege-escalation-alert',
              priority: 'CRITICAL'
            },
            priority: 1
          },
          {
            type: 'WEBHOOK',
            config: {
              url: process.env.SECURITY_WEBHOOK_URL,
              method: 'POST'
            },
            priority: 2
          }
        ],
        enabled: true,
        cooldownMinutes: 0 // No cooldown for critical events
      },
      {
        id: 'data-breach-attempt',
        name: 'Data Breach Attempt',
        description: 'Detect potential data exfiltration attempts',
        eventType: 'DATA_BREACH_ATTEMPT',
        conditions: [
          {
            type: 'COUNT',
            operator: 'GT',
            value: 0,
            timeWindow: 1
          }
        ],
        actions: [
          {
            type: 'EMAIL',
            config: {
              recipients: ['security@company.com', 'ciso@company.com'],
              template: 'data-breach-alert',
              priority: 'CRITICAL'
            },
            priority: 1
          },
          {
            type: 'SLACK',
            config: {
              channel: '#security-alerts',
              webhook: process.env.SLACK_SECURITY_WEBHOOK
            },
            priority: 2
          },
          {
            type: 'LOCK_ACCOUNT',
            config: {
              reason: 'Suspected data breach attempt'
            },
            priority: 3
          }
        ],
        enabled: true,
        cooldownMinutes: 0
      },
      {
        id: 'anomalous-access-pattern',
        name: 'Anomalous Access Pattern',
        description: 'Detect unusual access patterns',
        eventType: 'ANOMALOUS_BEHAVIOR',
        conditions: [
          {
            type: 'COUNT',
            operator: 'GT',
            value: 3,
            timeWindow: 60
          }
        ],
        actions: [
          {
            type: 'EMAIL',
            config: {
              recipients: ['security@company.com'],
              template: 'anomalous-behavior-alert'
            },
            priority: 1
          },
          {
            type: 'LOG',
            config: {
              level: 'warn',
              message: 'Anomalous access pattern detected'
            },
            priority: 2
          }
        ],
        enabled: true,
        cooldownMinutes: 60
      },
      {
        id: 'multiple-ip-access',
        name: 'Multiple IP Access',
        description: 'Detect access from multiple IPs in short time',
        eventType: 'MULTIPLE_IP_ACCESS',
        conditions: [
          {
            type: 'COUNT',
            operator: 'GT',
            value: 2,
            timeWindow: 30
          }
        ],
        actions: [
          {
            type: 'EMAIL',
            config: {
              recipients: ['security@company.com'],
              template: 'multiple-ip-alert'
            },
            priority: 1
          }
        ],
        enabled: true,
        cooldownMinutes: 30
      }
    ];

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });
  }

  /**
   * Add or update an alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove an alert rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Get all alert rules
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rule by ID
   */
  getRule(ruleId: string): AlertRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Enable/disable a rule
   */
  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * Check if an event should trigger alerts
   */
  async checkAlerts(eventType: SecurityEventType, eventData: any): Promise<AlertInstance[]> {
    const triggeredAlerts: AlertInstance[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled || rule.eventType !== eventType) {
        continue;
      }

      // Check cooldown
      const cooldownKey = `${rule.id}-${eventData.userId || eventData.ipAddress || 'global'}`;
      const lastTriggered = this.alertCooldowns.get(cooldownKey);
      if (lastTriggered && rule.cooldownMinutes > 0) {
        const cooldownExpiry = new Date(lastTriggered.getTime() + (rule.cooldownMinutes * 60 * 1000));
        if (new Date() < cooldownExpiry) {
          continue; // Still in cooldown
        }
      }

      // Evaluate conditions
      const conditionsMet = await this.evaluateConditions(rule.conditions, eventType, eventData);
      
      if (conditionsMet) {
        const alert = await this.createAlert(rule, eventData);
        triggeredAlerts.push(alert);
        
        // Set cooldown
        this.alertCooldowns.set(cooldownKey, new Date());
        
        // Execute actions
        await this.executeActions(rule.actions, alert);
      }
    }

    return triggeredAlerts;
  }

  /**
   * Evaluate alert conditions
   */
  private async evaluateConditions(
    conditions: AlertCondition[],
    eventType: SecurityEventType,
    eventData: any
  ): Promise<boolean> {
    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition, eventType, eventData);
      if (!result) {
        return false; // All conditions must be met
      }
    }
    return true;
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(
    condition: AlertCondition,
    eventType: SecurityEventType,
    eventData: any
  ): Promise<boolean> {
    switch (condition.type) {
      case 'COUNT':
        return await this.evaluateCountCondition(condition, eventType, eventData);
      case 'RATE':
        return await this.evaluateRateCondition(condition, eventType, eventData);
      case 'PATTERN':
        return await this.evaluatePatternCondition(condition, eventType, eventData);
      case 'THRESHOLD':
        return await this.evaluateThresholdCondition(condition, eventType, eventData);
      default:
        return false;
    }
  }

  /**
   * Evaluate count-based condition
   */
  private async evaluateCountCondition(
    condition: AlertCondition,
    eventType: SecurityEventType,
    eventData: any
  ): Promise<boolean> {
    // This would query the database for event counts
    // For now, return a simplified check
    const mockCount = Math.floor(Math.random() * 10); // Replace with actual DB query
    
    switch (condition.operator) {
      case 'GT':
        return mockCount > condition.value;
      case 'LT':
        return mockCount < condition.value;
      case 'EQ':
        return mockCount === condition.value;
      default:
        return false;
    }
  }

  /**
   * Evaluate rate-based condition
   */
  private async evaluateRateCondition(
    condition: AlertCondition,
    eventType: SecurityEventType,
    eventData: any
  ): Promise<boolean> {
    // Calculate event rate over time window
    // Implementation would query database for events in time window
    return false; // Placeholder
  }

  /**
   * Evaluate pattern-based condition
   */
  private async evaluatePatternCondition(
    condition: AlertCondition,
    eventType: SecurityEventType,
    eventData: any
  ): Promise<boolean> {
    // Check for specific patterns in event data
    if (condition.field && eventData[condition.field]) {
      const value = eventData[condition.field];
      
      switch (condition.operator) {
        case 'CONTAINS':
          return String(value).includes(condition.value);
        case 'REGEX':
          return new RegExp(condition.value).test(String(value));
        default:
          return false;
      }
    }
    return false;
  }

  /**
   * Evaluate threshold-based condition
   */
  private async evaluateThresholdCondition(
    condition: AlertCondition,
    eventType: SecurityEventType,
    eventData: any
  ): Promise<boolean> {
    // Check if a numeric value exceeds threshold
    if (condition.field && eventData[condition.field] !== undefined) {
      const value = Number(eventData[condition.field]);
      
      switch (condition.operator) {
        case 'GT':
          return value > condition.value;
        case 'LT':
          return value < condition.value;
        case 'EQ':
          return value === condition.value;
        default:
          return false;
      }
    }
    return false;
  }

  /**
   * Create alert instance
   */
  private async createAlert(rule: AlertRule, eventData: any): Promise<AlertInstance> {
    const alert: AlertInstance = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      eventId: eventData.id || 'unknown',
      severity: this.determineSeverity(rule, eventData),
      message: this.generateAlertMessage(rule, eventData),
      details: {
        rule: rule.name,
        eventType: rule.eventType,
        eventData,
        triggeredAt: new Date()
      },
      triggeredAt: new Date(),
      acknowledged: false,
      resolved: false
    };

    this.activeAlerts.set(alert.id, alert);
    return alert;
  }

  /**
   * Determine alert severity
   */
  private determineSeverity(rule: AlertRule, eventData: any): SecuritySeverity {
    // Logic to determine severity based on rule and event data
    if (rule.eventType === 'DATA_BREACH_ATTEMPT' || rule.eventType === 'ROLE_ESCALATION') {
      return 'CRITICAL';
    }
    if (rule.eventType === 'BRUTE_FORCE_ATTACK' || rule.eventType === 'UNAUTHORIZED_ACCESS') {
      return 'HIGH';
    }
    return 'MEDIUM';
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(rule: AlertRule, eventData: any): string {
    return `Security Alert: ${rule.name} - ${rule.description}`;
  }

  /**
   * Execute alert actions
   */
  private async executeActions(actions: AlertAction[], alert: AlertInstance): Promise<void> {
    // Sort actions by priority
    const sortedActions = actions.sort((a, b) => a.priority - b.priority);

    for (const action of sortedActions) {
      try {
        await this.executeAction(action, alert);
      } catch (error) {
        console.error(`Failed to execute alert action ${action.type}:`, error);
      }
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: AlertAction, alert: AlertInstance): Promise<void> {
    switch (action.type) {
      case 'EMAIL':
        await this.sendEmailAlert(action.config, alert);
        break;
      case 'WEBHOOK':
        await this.sendWebhookAlert(action.config, alert);
        break;
      case 'SMS':
        await this.sendSMSAlert(action.config, alert);
        break;
      case 'SLACK':
        await this.sendSlackAlert(action.config, alert);
        break;
      case 'LOG':
        this.logAlert(action.config, alert);
        break;
      case 'BLOCK_IP':
        await this.blockIP(action.config, alert);
        break;
      case 'LOCK_ACCOUNT':
        await this.lockAccount(action.config, alert);
        break;
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(config: any, alert: AlertInstance): Promise<void> {
    console.log(`EMAIL ALERT: ${alert.message}`, { config, alert });
    // Implementation would integrate with email service
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(config: any, alert: AlertInstance): Promise<void> {
    if (!config.url) return;

    try {
      await fetch(config.url, {
        method: config.method || 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          alert,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to send webhook alert:', error);
    }
  }

  /**
   * Send SMS alert
   */
  private async sendSMSAlert(config: any, alert: AlertInstance): Promise<void> {
    console.log(`SMS ALERT: ${alert.message}`, { config, alert });
    // Implementation would integrate with SMS service
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(config: any, alert: AlertInstance): Promise<void> {
    if (!config.webhook) return;

    try {
      await fetch(config.webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel: config.channel,
          text: alert.message,
          attachments: [
            {
              color: alert.severity === 'CRITICAL' ? 'danger' : 'warning',
              fields: [
                {
                  title: 'Severity',
                  value: alert.severity,
                  short: true
                },
                {
                  title: 'Time',
                  value: alert.triggeredAt.toISOString(),
                  short: true
                }
              ]
            }
          ]
        })
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  /**
   * Log alert
   */
  private logAlert(config: any, alert: AlertInstance): void {
    const message = `SECURITY ALERT [${alert.severity}]: ${alert.message}`;
    
    switch (config.level) {
      case 'error':
        console.error(message, alert);
        break;
      case 'warn':
        console.warn(message, alert);
        break;
      default:
        console.log(message, alert);
    }
  }

  /**
   * Block IP address
   */
  private async blockIP(config: any, alert: AlertInstance): Promise<void> {
    const ipAddress = alert.details.eventData?.ipAddress;
    if (!ipAddress) return;

    console.log(`BLOCKING IP: ${ipAddress} for ${config.duration || 'indefinite'} seconds`);
    // Implementation would add IP to blocklist
  }

  /**
   * Lock user account
   */
  private async lockAccount(config: any, alert: AlertInstance): Promise<void> {
    const userId = alert.details.eventData?.userId;
    if (!userId) return;

    console.log(`LOCKING ACCOUNT: ${userId} - ${config.reason || 'Security alert triggered'}`);
    // Implementation would disable user account
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date();
    }
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): AlertInstance[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): AlertInstance[] {
    return Array.from(this.activeAlerts.values());
  }
}

// Export singleton instance
let alertManager: SecurityAlertManager;

export function getSecurityAlertManager(): SecurityAlertManager {
  if (!alertManager) {
    alertManager = new SecurityAlertManager();
  }
  return alertManager;
}