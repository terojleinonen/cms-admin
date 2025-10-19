/**
 * Security Event Monitoring Service
 * Real-time security event detection, alerting, and monitoring
 */

import { PrismaClient } from '@prisma/client';
import { SecurityEventDB } from './permission-db';
import { AuditService } from './audit-service';

// Security event types
export const SECURITY_EVENT_TYPES = {
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  BRUTE_FORCE_ATTACK: 'BRUTE_FORCE_ATTACK',
  ACCOUNT_LOCKOUT: 'ACCOUNT_LOCKOUT',
  ROLE_ESCALATION: 'ROLE_ESCALATION',
  DATA_BREACH_ATTEMPT: 'DATA_BREACH_ATTEMPT',
  ANOMALOUS_BEHAVIOR: 'ANOMALOUS_BEHAVIOR',
  MULTIPLE_IP_ACCESS: 'MULTIPLE_IP_ACCESS',
  RAPID_REQUESTS: 'RAPID_REQUESTS',
  FAILED_AUTHENTICATION: 'FAILED_AUTHENTICATION',
  SESSION_HIJACKING: 'SESSION_HIJACKING',
} as const;

export type SecurityEventType = typeof SECURITY_EVENT_TYPES[keyof typeof SECURITY_EVENT_TYPES];

// Security event severity levels
export const SECURITY_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM', 
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export type SecuritySeverity = typeof SECURITY_SEVERITY[keyof typeof SECURITY_SEVERITY];

// Security alert configuration
export interface SecurityAlertConfig {
  enabled: boolean;
  threshold: number;
  timeWindow: number; // in minutes
  severity: SecuritySeverity;
  actions: AlertAction[];
}

export interface AlertAction {
  type: 'EMAIL' | 'WEBHOOK' | 'LOG' | 'BLOCK_IP' | 'LOCK_ACCOUNT';
  config: Record<string, any>;
}

// Security event data
export interface SecurityEventData {
  type: SecurityEventType;
  severity: SecuritySeverity;
  userId?: string;
  resource?: string;
  action?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  metadata?: {
    requestId?: string;
    sessionId?: string;
    timestamp?: Date;
    location?: string;
  };
}

// Security monitoring configuration
const DEFAULT_ALERT_CONFIGS: Record<SecurityEventType, SecurityAlertConfig> = {
  [SECURITY_EVENT_TYPES.UNAUTHORIZED_ACCESS]: {
    enabled: true,
    threshold: 3,
    timeWindow: 15,
    severity: SECURITY_SEVERITY.HIGH,
    actions: [
      { type: 'EMAIL', config: { recipients: ['security@company.com'] } },
      { type: 'LOG', config: { level: 'error' } }
    ]
  },
  [SECURITY_EVENT_TYPES.PERMISSION_DENIED]: {
    enabled: true,
    threshold: 5,
    timeWindow: 10,
    severity: SECURITY_SEVERITY.MEDIUM,
    actions: [
      { type: 'LOG', config: { level: 'warn' } }
    ]
  },
  [SECURITY_EVENT_TYPES.SUSPICIOUS_ACTIVITY]: {
    enabled: true,
    threshold: 2,
    timeWindow: 30,
    severity: SECURITY_SEVERITY.HIGH,
    actions: [
      { type: 'EMAIL', config: { recipients: ['security@company.com'] } },
      { type: 'LOG', config: { level: 'error' } }
    ]
  },
  [SECURITY_EVENT_TYPES.BRUTE_FORCE_ATTACK]: {
    enabled: true,
    threshold: 5,
    timeWindow: 5,
    severity: SECURITY_SEVERITY.CRITICAL,
    actions: [
      { type: 'EMAIL', config: { recipients: ['security@company.com'] } },
      { type: 'BLOCK_IP', config: { duration: 3600 } },
      { type: 'LOG', config: { level: 'error' } }
    ]
  },
  [SECURITY_EVENT_TYPES.ACCOUNT_LOCKOUT]: {
    enabled: true,
    threshold: 1,
    timeWindow: 1,
    severity: SECURITY_SEVERITY.HIGH,
    actions: [
      { type: 'EMAIL', config: { recipients: ['security@company.com'] } },
      { type: 'LOG', config: { level: 'error' } }
    ]
  },
  [SECURITY_EVENT_TYPES.ROLE_ESCALATION]: {
    enabled: true,
    threshold: 1,
    timeWindow: 1,
    severity: SECURITY_SEVERITY.CRITICAL,
    actions: [
      { type: 'EMAIL', config: { recipients: ['security@company.com'] } },
      { type: 'LOG', config: { level: 'error' } }
    ]
  },
  [SECURITY_EVENT_TYPES.DATA_BREACH_ATTEMPT]: {
    enabled: true,
    threshold: 1,
    timeWindow: 1,
    severity: SECURITY_SEVERITY.CRITICAL,
    actions: [
      { type: 'EMAIL', config: { recipients: ['security@company.com'] } },
      { type: 'WEBHOOK', config: { url: process.env.SECURITY_WEBHOOK_URL } },
      { type: 'LOG', config: { level: 'error' } }
    ]
  },
  [SECURITY_EVENT_TYPES.ANOMALOUS_BEHAVIOR]: {
    enabled: true,
    threshold: 3,
    timeWindow: 60,
    severity: SECURITY_SEVERITY.MEDIUM,
    actions: [
      { type: 'LOG', config: { level: 'warn' } }
    ]
  },
  [SECURITY_EVENT_TYPES.MULTIPLE_IP_ACCESS]: {
    enabled: true,
    threshold: 3,
    timeWindow: 30,
    severity: SECURITY_SEVERITY.HIGH,
    actions: [
      { type: 'EMAIL', config: { recipients: ['security@company.com'] } },
      { type: 'LOG', config: { level: 'warn' } }
    ]
  },
  [SECURITY_EVENT_TYPES.RAPID_REQUESTS]: {
    enabled: true,
    threshold: 50,
    timeWindow: 5,
    severity: SECURITY_SEVERITY.MEDIUM,
    actions: [
      { type: 'LOG', config: { level: 'warn' } }
    ]
  },
  [SECURITY_EVENT_TYPES.FAILED_AUTHENTICATION]: {
    enabled: true,
    threshold: 5,
    timeWindow: 15,
    severity: SECURITY_SEVERITY.MEDIUM,
    actions: [
      { type: 'LOG', config: { level: 'warn' } }
    ]
  },
  [SECURITY_EVENT_TYPES.SESSION_HIJACKING]: {
    enabled: true,
    threshold: 1,
    timeWindow: 1,
    severity: SECURITY_SEVERITY.CRITICAL,
    actions: [
      { type: 'EMAIL', config: { recipients: ['security@company.com'] } },
      { type: 'LOCK_ACCOUNT', config: {} },
      { type: 'LOG', config: { level: 'error' } }
    ]
  }
};

/**
 * Security Monitoring Service
 */
export class SecurityMonitoringService {
  private prisma: PrismaClient;
  private auditService: AuditService;
  private alertConfigs: Record<SecurityEventType, SecurityAlertConfig>;
  private blockedIPs: Set<string> = new Set();
  private rateLimitCache: Map<string, { count: number; resetTime: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(prisma: PrismaClient, auditService: AuditService) {
    this.prisma = prisma;
    this.auditService = auditService;
    this.alertConfigs = { ...DEFAULT_ALERT_CONFIGS };
    
    // Set up periodic cleanup to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredData();
    }, 5 * 60 * 1000); // Cleanup every 5 minutes
  }

  /**
   * Cleanup expired data to prevent memory leaks
   */
  private cleanupExpiredData(): void {
    const now = Date.now();
    
    // Clean up expired rate limit cache entries
    for (const [key, data] of this.rateLimitCache.entries()) {
      if (now > data.resetTime) {
        this.rateLimitCache.delete(key);
      }
    }
    
    // Note: blockedIPs are cleaned up by setTimeout in blockIP method
    // so no additional cleanup needed here
  }

  /**
   * Cleanup resources when service is destroyed
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.blockedIPs.clear();
    this.rateLimitCache.clear();
  }

  /**
   * Log a security event and trigger monitoring
   */
  async logSecurityEvent(eventData: SecurityEventData, skipAnalysis: boolean = false): Promise<string> {
    try {
      // Rate limiting to prevent excessive logging
      const rateLimitKey = `${eventData.type}-${eventData.userId || eventData.ipAddress || 'global'}`;
      if (this.isRateLimited(rateLimitKey)) {
        console.warn(`Security event rate limited: ${eventData.type}`);
        throw new Error('Security event rate limited');
      }

      // Create security event in database
      const eventId = await SecurityEventDB.create({
        type: eventData.type,
        severity: eventData.severity,
        userId: eventData.userId,
        resource: eventData.resource,
        action: eventData.action,
        ipAddress: eventData.ipAddress,
        userAgent: eventData.userAgent,
        details: {
          ...eventData.details,
          metadata: eventData.metadata
        }
      });

      // Log to audit trail
      if (eventData.userId) {
        await this.auditService.logSecurity(
          eventData.userId,
          'SUSPICIOUS_ACTIVITY',
          {
            securityEventId: eventId,
            type: eventData.type,
            severity: eventData.severity,
            ...eventData.details
          },
          eventData.ipAddress,
          eventData.userAgent
        );
      }

      // Check for alert conditions
      await this.checkAlertConditions(eventData);

      // Perform real-time analysis only for original events, not derived ones
      if (!skipAnalysis) {
        await this.performRealTimeAnalysis(eventData);
      }

      console.log(`Security event logged: ${eventData.type} (${eventData.severity}) - ID: ${eventId}`);
      
      return eventId;
    } catch (error) {
      console.error('Failed to log security event:', error);
      throw error;
    }
  }

  /**
   * Check if rate limited for security event logging
   */
  private isRateLimited(key: string): boolean {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxEvents = 10; // Max 10 events per minute per key

    const cached = this.rateLimitCache.get(key);
    
    if (!cached || now > cached.resetTime) {
      // Reset or initialize
      this.rateLimitCache.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return false;
    }

    if (cached.count >= maxEvents) {
      return true; // Rate limited
    }

    cached.count++;
    return false;
  }

  /**
   * Check if alert conditions are met and trigger alerts
   */
  private async checkAlertConditions(eventData: SecurityEventData): Promise<void> {
    const config = this.alertConfigs[eventData.type];
    if (!config.enabled) return;

    try {
      // Count recent events of the same type
      const timeWindow = new Date(Date.now() - (config.timeWindow * 60 * 1000));
      const recentEvents = await this.prisma.securityEvent.count({
        where: {
          type: eventData.type,
          createdAt: { gte: timeWindow },
          ...(eventData.userId && { userId: eventData.userId }),
          ...(eventData.ipAddress && { ipAddress: eventData.ipAddress })
        }
      });

      // Trigger alert if threshold exceeded
      if (recentEvents >= config.threshold) {
        await this.triggerAlert(eventData, config, recentEvents);
      }
    } catch (error) {
      console.error('Failed to check alert conditions:', error);
    }
  }

  /**
   * Trigger security alert
   */
  private async triggerAlert(
    eventData: SecurityEventData,
    config: SecurityAlertConfig,
    eventCount: number
  ): Promise<void> {
    const alertData = {
      type: eventData.type,
      severity: config.severity,
      eventCount,
      timeWindow: config.timeWindow,
      userId: eventData.userId,
      ipAddress: eventData.ipAddress,
      details: eventData.details,
      timestamp: new Date()
    };

    // Execute alert actions
    for (const action of config.actions) {
      try {
        await this.executeAlertAction(action, alertData);
      } catch (error) {
        console.error(`Failed to execute alert action ${action.type}:`, error);
      }
    }

    console.log(`Security alert triggered: ${eventData.type} (${eventCount} events in ${config.timeWindow}m)`);
  }

  /**
   * Execute specific alert action
   */
  private async executeAlertAction(action: AlertAction, alertData: any): Promise<void> {
    switch (action.type) {
      case 'EMAIL':
        await this.sendEmailAlert(action.config, alertData);
        break;
      case 'WEBHOOK':
        await this.sendWebhookAlert(action.config, alertData);
        break;
      case 'LOG':
        this.logAlert(action.config, alertData);
        break;
      case 'BLOCK_IP':
        await this.blockIP(alertData.ipAddress, action.config);
        break;
      case 'LOCK_ACCOUNT':
        await this.lockAccount(alertData.userId, action.config);
        break;
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(config: any, alertData: any): Promise<void> {
    // Implementation would integrate with email service
    console.log(`EMAIL ALERT: ${alertData.type} - ${alertData.severity}`, {
      recipients: config.recipients,
      alertData
    });
    
    // In a real implementation, this would send actual emails
    // Example: await emailService.send({
    //   to: config.recipients,
    //   subject: `Security Alert: ${alertData.type}`,
    //   body: this.formatAlertEmail(alertData)
    // });
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(config: any, alertData: any): Promise<void> {
    if (!config.url) return;

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SecurityMonitoring/1.0'
        },
        body: JSON.stringify({
          event: 'security_alert',
          data: alertData,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send webhook alert:', error);
    }
  }

  /**
   * Log alert to console/file
   */
  private logAlert(config: any, alertData: any): void {
    const message = `SECURITY ALERT [${alertData.severity}]: ${alertData.type} - ${alertData.eventCount} events`;
    
    switch (config.level) {
      case 'error':
        console.error(message, alertData);
        break;
      case 'warn':
        console.warn(message, alertData);
        break;
      default:
        console.log(message, alertData);
    }
  }

  /**
   * Block IP address
   */
  private async blockIP(ipAddress: string, config: any): Promise<void> {
    if (!ipAddress) return;

    this.blockedIPs.add(ipAddress);
    
    // Set timeout to unblock IP
    if (config.duration) {
      setTimeout(() => {
        this.blockedIPs.delete(ipAddress);
        console.log(`IP unblocked: ${ipAddress}`);
      }, config.duration * 1000);
    }

    console.log(`IP blocked: ${ipAddress} for ${config.duration || 'indefinite'} seconds`);
  }

  /**
   * Lock user account
   */
  private async lockAccount(userId: string, config: any): Promise<void> {
    if (!userId) return;

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isActive: false }
      });

      console.log(`Account locked: ${userId}`);
    } catch (error) {
      console.error('Failed to lock account:', error);
    }
  }

  /**
   * Perform real-time security analysis
   */
  private async performRealTimeAnalysis(eventData: SecurityEventData): Promise<void> {
    try {
      // Analyze patterns for the user
      if (eventData.userId) {
        await this.analyzeUserBehavior(eventData.userId, eventData);
      }

      // Analyze patterns for the IP
      if (eventData.ipAddress) {
        await this.analyzeIPBehavior(eventData.ipAddress, eventData);
      }

      // Check for coordinated attacks
      await this.checkCoordinatedAttacks(eventData);

    } catch (error) {
      console.error('Failed to perform real-time analysis:', error);
    }
  }

  /**
   * Analyze user behavior patterns
   */
  private async analyzeUserBehavior(userId: string, eventData: SecurityEventData): Promise<void> {
    const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000));

    // Check for multiple failed attempts
    const failedAttempts = await this.prisma.securityEvent.count({
      where: {
        userId,
        type: SECURITY_EVENT_TYPES.FAILED_AUTHENTICATION,
        createdAt: { gte: oneHourAgo }
      }
    });

    if (failedAttempts >= 5) {
      await this.logSecurityEvent({
        type: SECURITY_EVENT_TYPES.BRUTE_FORCE_ATTACK,
        severity: SECURITY_SEVERITY.HIGH,
        userId,
        ipAddress: eventData.ipAddress,
        details: {
          reason: 'Multiple failed authentication attempts',
          count: failedAttempts,
          timeWindow: '1 hour'
        }
      }, true); // Skip analysis to prevent infinite loop
    }

    // Check for multiple IP addresses
    const recentIPs = await this.prisma.securityEvent.findMany({
      where: {
        userId,
        createdAt: { gte: oneHourAgo },
        ipAddress: { not: null }
      },
      select: { ipAddress: true },
      distinct: ['ipAddress']
    });

    if (recentIPs.length >= 3) {
      await this.logSecurityEvent({
        type: SECURITY_EVENT_TYPES.MULTIPLE_IP_ACCESS,
        severity: SECURITY_SEVERITY.HIGH,
        userId,
        ipAddress: eventData.ipAddress,
        details: {
          reason: 'Access from multiple IP addresses',
          ipAddresses: recentIPs.map(r => r.ipAddress),
          count: recentIPs.length
        }
      }, true); // Skip analysis to prevent infinite loop
    }
  }

  /**
   * Analyze IP behavior patterns
   */
  private async analyzeIPBehavior(ipAddress: string, eventData: SecurityEventData): Promise<void> {
    const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000));

    // Check for multiple users from same IP
    const usersFromIP = await this.prisma.securityEvent.findMany({
      where: {
        ipAddress,
        createdAt: { gte: oneHourAgo },
        userId: { not: null }
      },
      select: { userId: true },
      distinct: ['userId']
    });

    if (usersFromIP.length >= 5) {
      await this.logSecurityEvent({
        type: SECURITY_EVENT_TYPES.SUSPICIOUS_ACTIVITY,
        severity: SECURITY_SEVERITY.MEDIUM,
        ipAddress,
        details: {
          reason: 'Multiple users from same IP',
          userIds: usersFromIP.map(u => u.userId),
          count: usersFromIP.length
        }
      }, true); // Skip analysis to prevent infinite loop
    }

    // Check request rate
    const recentRequests = await this.prisma.securityEvent.count({
      where: {
        ipAddress,
        createdAt: { gte: new Date(Date.now() - (5 * 60 * 1000)) } // Last 5 minutes
      }
    });

    if (recentRequests >= 50) {
      await this.logSecurityEvent({
        type: SECURITY_EVENT_TYPES.RAPID_REQUESTS,
        severity: SECURITY_SEVERITY.MEDIUM,
        ipAddress,
        details: {
          reason: 'High request rate',
          count: recentRequests,
          timeWindow: '5 minutes'
        }
      }, true); // Skip analysis to prevent infinite loop
    }
  }

  /**
   * Check for coordinated attacks
   */
  private async checkCoordinatedAttacks(eventData: SecurityEventData): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - (5 * 60 * 1000));

    // Check for similar events from multiple IPs
    const similarEvents = await this.prisma.securityEvent.findMany({
      where: {
        type: eventData.type,
        createdAt: { gte: fiveMinutesAgo },
        ipAddress: { not: null }
      },
      select: { ipAddress: true },
      distinct: ['ipAddress']
    });

    if (similarEvents.length >= 5) {
      await this.logSecurityEvent({
        type: SECURITY_EVENT_TYPES.SUSPICIOUS_ACTIVITY,
        severity: SECURITY_SEVERITY.HIGH,
        details: {
          reason: 'Coordinated attack detected',
          eventType: eventData.type,
          ipAddresses: similarEvents.map(e => e.ipAddress),
          count: similarEvents.length
        }
      }, true); // Skip analysis to prevent infinite loop
    }
  }

  /**
   * Check if IP is blocked
   */
  isIPBlocked(ipAddress: string): boolean {
    return this.blockedIPs.has(ipAddress);
  }

  /**
   * Get security dashboard data
   */
  async getDashboardData(days: number = 7): Promise<{
    summary: {
      totalEvents: number;
      criticalEvents: number;
      unresolvedEvents: number;
      blockedIPs: number;
    };
    eventsByType: Array<{ type: string; count: number }>;
    eventsBySeverity: Array<{ severity: string; count: number }>;
    recentEvents: any[];
    topThreats: Array<{ type: string; count: number }>;
    affectedUsers: Array<{ userId: string; count: number }>;
    timeline: Array<{ date: string; count: number }>;
  }> {
    try {
      const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

      const [stats, recentEvents] = await Promise.all([
        SecurityEventDB.getStats(days),
        SecurityEventDB.getEvents({
          limit: 20,
          startDate
        })
      ]);

      // Get timeline data
      const timeline = await this.prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM security_events
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `;

      return {
        summary: {
          totalEvents: stats.totalEvents,
          criticalEvents: stats.eventsBySeverity.find(s => s.severity === 'CRITICAL')?.count || 0,
          unresolvedEvents: stats.unresolvedEvents,
          blockedIPs: this.blockedIPs.size
        },
        eventsByType: stats.eventsByType,
        eventsBySeverity: stats.eventsBySeverity,
        recentEvents: recentEvents.events,
        topThreats: stats.eventsByType.slice(0, 5),
        affectedUsers: [], // Would need additional query
        timeline: timeline.map(t => ({
          date: t.date,
          count: Number(t.count)
        }))
      };
    } catch (error) {
      console.error('Failed to get dashboard data:', error);
      throw error;
    }
  }

  /**
   * Update alert configuration
   */
  updateAlertConfig(eventType: SecurityEventType, config: Partial<SecurityAlertConfig>): void {
    this.alertConfigs[eventType] = {
      ...this.alertConfigs[eventType],
      ...config
    };
  }

  /**
   * Get current alert configurations
   */
  getAlertConfigs(): Record<SecurityEventType, SecurityAlertConfig> {
    return { ...this.alertConfigs };
  }

  /**
   * Resolve security event
   */
  async resolveSecurityEvent(eventId: string, resolvedBy: string): Promise<void> {
    await SecurityEventDB.resolve(eventId, resolvedBy);
  }

  /**
   * Get security incidents summary
   */
  async getSecurityIncidents(days: number = 7) {
    return await this.auditService.getSecurityIncidents(days);
  }
}

// Export singleton instance
let securityMonitoringService: SecurityMonitoringService;

export function getSecurityMonitoringService(prisma?: PrismaClient, auditService?: AuditService): SecurityMonitoringService {
  if (!securityMonitoringService && prisma && auditService) {
    securityMonitoringService = new SecurityMonitoringService(prisma, auditService);
  }
  return securityMonitoringService;
}

// SecurityMonitoringService class is already exported above