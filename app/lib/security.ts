/**
 * Enhanced Security Service
 * Comprehensive security monitoring, threat detection, and incident response
 */

import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

export interface SecurityEvent {
  id: string
  type: SecurityEventType
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  ipAddress: string
  userAgent?: string
  userId?: string
  metadata: Record<string, unknown>
  timestamp: Date
  resolved: boolean
}

export type SecurityEventType = 
  | 'login_attempt'
  | 'login_failed'
  | 'login_success'
  | 'logout'
  | 'password_change'
  | 'password_reset'
  | 'two_factor_enabled'
  | 'two_factor_disabled'
  | 'two_factor_failed'
  | 'account_locked'
  | 'account_unlocked'
  | 'permission_denied'
  | 'suspicious_activity'
  | 'rate_limit_exceeded'
  | 'blocked_request'
  | 'csrf_violation'
  | 'input_validation_failed'
  | 'file_upload_blocked'
  | 'api_key_created'
  | 'api_key_revoked'
  | 'admin_action'
  | 'data_export'
  | 'bulk_operation'
  | 'security_scan'
  | 'intrusion_detected'

export interface SecurityStats {
  totalEvents: number
  criticalEvents: number
  blockedRequests: number
  suspiciousActivity: number
  failedLogins: number
  successfulLogins: number
  accountLocks: number
  rateLimitViolations: number
  csrfViolations: number
  lastScan: Date
  threatLevel: 'low' | 'medium' | 'high' | 'critical'
  topThreats: Array<{ type: string; count: number }>
  ipBlacklist: string[]
  recentAlerts: SecurityEvent[]
}

export class SecurityService {
  private static instance: SecurityService
  private prisma: PrismaClient
  private events: SecurityEvent[] = []
  private blockedIPs: Set<string> = new Set()
  private suspiciousIPs: Map<string, { count: number; lastSeen: Date }> = new Map()
  private failedLoginAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map()

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient()
    this.startSecurityMonitoring()
  }

  static getInstance(prisma?: PrismaClient): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService(prisma)
    }
    return SecurityService.instance
  }

  /**
   * Start continuous security monitoring
   */
  private startSecurityMonitoring(): void {
    // Run security scans every 5 minutes
    setInterval(async () => {
      await this.performSecurityScan()
    }, 5 * 60 * 1000)

    // Clean up old events every hour
    setInterval(() => {
      this.cleanupOldEvents()
    }, 60 * 60 * 1000)

    // Analyze threat patterns every 15 minutes
    setInterval(() => {
      this.analyzeThreatPatterns()
    }, 15 * 60 * 1000)

    console.log('Security monitoring started')
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    type: SecurityEventType,
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    ipAddress: string,
    metadata: Record<string, unknown> = {},
    userId?: string,
    userAgent?: string
  ): Promise<SecurityEvent> {
    const event: SecurityEvent = {
      id: crypto.randomUUID(),
      type,
      severity,
      message,
      ipAddress,
      userAgent,
      userId,
      metadata,
      timestamp: new Date(),
      resolved: false
    }

    // Store in memory for quick access
    this.events.unshift(event)
    
    // Keep only last 1000 events in memory
    if (this.events.length > 1000) {
      this.events = this.events.slice(0, 1000)
    }

    // Store in database for persistence
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: `security.${type}`,
          resource: 'security',
          details: {
            severity,
            message,
            ipAddress,
            userAgent,
            ...metadata
          },
          ipAddress
        }
      })
    } catch (error) {
      console.error('Failed to store security event in database:', error)
    }

    // Handle critical events immediately
    if (severity === 'critical') {
      await this.handleCriticalEvent(event)
    }

    // Update threat tracking
    this.updateThreatTracking(event)

    return event
  }

  /**
   * Handle critical security events
   */
  private async handleCriticalEvent(event: SecurityEvent): Promise<void> {
    console.log(`🚨 CRITICAL SECURITY EVENT: ${event.message}`)
    
    // Auto-block IP for certain critical events
    if (['intrusion_detected', 'multiple_failed_logins', 'csrf_violation'].includes(event.type)) {
      this.blockIP(event.ipAddress, `Critical security event: ${event.type}`)
    }

    // Send immediate notification (in production, this would be email/Slack/etc.)
    await this.sendSecurityAlert(event)
  }

  /**
   * Update threat tracking
   */
  private updateThreatTracking(event: SecurityEvent): void {
    // Track suspicious IPs
    if (['login_failed', 'permission_denied', 'blocked_request'].includes(event.type)) {
      const current = this.suspiciousIPs.get(event.ipAddress) || { count: 0, lastSeen: new Date() }
      current.count++
      current.lastSeen = new Date()
      this.suspiciousIPs.set(event.ipAddress, current)

      // Auto-block after threshold
      if (current.count >= 10) {
        this.blockIP(event.ipAddress, 'Suspicious activity threshold exceeded')
      }
    }

    // Track failed login attempts
    if (event.type === 'login_failed') {
      const key = event.userId || event.ipAddress
      const current = this.failedLoginAttempts.get(key) || { count: 0, lastAttempt: new Date() }
      current.count++
      current.lastAttempt = new Date()
      this.failedLoginAttempts.set(key, current)

      // Lock account after threshold
      if (current.count >= 5) {
        this.logSecurityEvent(
          'account_locked',
          'high',
          `Account locked due to multiple failed login attempts`,
          event.ipAddress,
          { reason: 'multiple_failed_logins', attempts: current.count },
          event.userId
        )
      }
    }

    // Reset failed attempts on successful login
    if (event.type === 'login_success' && event.userId) {
      this.failedLoginAttempts.delete(event.userId)
      this.failedLoginAttempts.delete(event.ipAddress)
    }
  }

  /**
   * Block IP address
   */
  blockIP(ip: string, reason: string): void {
    this.blockedIPs.add(ip)
    this.logSecurityEvent(
      'blocked_request',
      'high',
      `IP address blocked: ${reason}`,
      ip,
      { reason, blockedAt: new Date() }
    )
  }

  /**
   * Unblock IP address
   */
  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip)
    this.logSecurityEvent(
      'admin_action',
      'medium',
      `IP address unblocked by admin`,
      ip,
      { action: 'unblock_ip', unblockedAt: new Date() }
    )
  }

  /**
   * Check if IP is blocked
   */
  isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip)
  }

  /**
   * Perform security scan
   */
  private async performSecurityScan(): Promise<void> {
    try {
      const scanResults = {
        timestamp: new Date(),
        eventsScanned: this.events.length,
        threatsDetected: 0,
        newBlocks: 0
      }

      // Analyze recent events for patterns
      const recentEvents = this.events.filter(
        event => Date.now() - event.timestamp.getTime() < 15 * 60 * 1000 // Last 15 minutes
      )

      // Check for brute force attacks
      const ipLoginAttempts = new Map<string, number>()
      recentEvents
        .filter(event => event.type === 'login_failed')
        .forEach(event => {
          const count = ipLoginAttempts.get(event.ipAddress) || 0
          ipLoginAttempts.set(event.ipAddress, count + 1)
        })

      for (const [ip, attempts] of ipLoginAttempts.entries()) {
        if (attempts >= 5 && !this.blockedIPs.has(ip)) {
          this.blockIP(ip, 'Brute force attack detected')
          scanResults.threatsDetected++
          scanResults.newBlocks++
        }
      }

      // Log scan results
      await this.logSecurityEvent(
        'security_scan',
        'low',
        `Security scan completed`,
        'system',
        scanResults
      )

    } catch (error) {
      console.error('Security scan failed:', error)
      await this.logSecurityEvent(
        'security_scan',
        'medium',
        `Security scan failed: ${error.message}`,
        'system',
        { error: error.message }
      )
    }
  }

  /**
   * Analyze threat patterns
   */
  private analyzeThreatPatterns(): void {
    const now = Date.now()
    const oneHourAgo = now - (60 * 60 * 1000)
    
    const recentEvents = this.events.filter(
      event => event.timestamp.getTime() > oneHourAgo
    )

    // Analyze event patterns
    const eventCounts = new Map<SecurityEventType, number>()
    recentEvents.forEach(event => {
      const count = eventCounts.get(event.type) || 0
      eventCounts.set(event.type, count + 1)
    })

    // Detect anomalies
    const anomalies: string[] = []
    
    if ((eventCounts.get('login_failed') || 0) > 20) {
      anomalies.push('High number of failed login attempts')
    }
    
    if ((eventCounts.get('permission_denied') || 0) > 10) {
      anomalies.push('High number of permission denied events')
    }
    
    if ((eventCounts.get('rate_limit_exceeded') || 0) > 50) {
      anomalies.push('High number of rate limit violations')
    }

    if (anomalies.length > 0) {
      this.logSecurityEvent(
        'suspicious_activity',
        'medium',
        `Threat pattern detected: ${anomalies.join(', ')}`,
        'system',
        { anomalies, eventCounts: Object.fromEntries(eventCounts) }
      )
    }
  }

  /**
   * Send security alert
   */
  private async sendSecurityAlert(event: SecurityEvent): Promise<void> {
    // In production, this would send emails, Slack messages, etc.
    console.log(`🚨 Security Alert: ${event.message}`)
    console.log(`Severity: ${event.severity.toUpperCase()}`)
    console.log(`IP: ${event.ipAddress}`)
    console.log(`Time: ${event.timestamp.toISOString()}`)
    
    if (event.metadata) {
      console.log(`Metadata:`, JSON.stringify(event.metadata, null, 2))
    }
  }

  /**
   * Clean up old events
   */
  private cleanupOldEvents(): void {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    
    this.events = this.events.filter(
      event => event.timestamp.getTime() > oneWeekAgo
    )

    // Clean up old tracking data
    for (const [ip, data] of this.suspiciousIPs.entries()) {
      if (Date.now() - data.lastSeen.getTime() > 24 * 60 * 60 * 1000) {
        this.suspiciousIPs.delete(ip)
      }
    }

    for (const [key, data] of this.failedLoginAttempts.entries()) {
      if (Date.now() - data.lastAttempt.getTime() > 60 * 60 * 1000) {
        this.failedLoginAttempts.delete(key)
      }
    }
  }

  /**
   * Get security statistics
   */
  async getSecurityStats(): Promise<SecurityStats> {
    const now = Date.now()
    const oneDayAgo = now - (24 * 60 * 60 * 1000)
    
    const recentEvents = this.events.filter(
      event => event.timestamp.getTime() > oneDayAgo
    )

    const eventCounts = new Map<SecurityEventType, number>()
    recentEvents.forEach(event => {
      const count = eventCounts.get(event.type) || 0
      eventCounts.set(event.type, count + 1)
    })

    const criticalEvents = recentEvents.filter(event => event.severity === 'critical')
    const suspiciousActivity = recentEvents.filter(event => 
      ['suspicious_activity', 'intrusion_detected', 'permission_denied'].includes(event.type)
    )

    // Determine threat level
    let threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
    if (criticalEvents.length > 0) {
      threatLevel = 'critical'
    } else if (suspiciousActivity.length > 10) {
      threatLevel = 'high'
    } else if (suspiciousActivity.length > 5) {
      threatLevel = 'medium'
    }

    // Get top threats
    const topThreats = Array.from(eventCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }))

    return {
      totalEvents: recentEvents.length,
      criticalEvents: criticalEvents.length,
      blockedRequests: eventCounts.get('blocked_request') || 0,
      suspiciousActivity: suspiciousActivity.length,
      failedLogins: eventCounts.get('login_failed') || 0,
      successfulLogins: eventCounts.get('login_success') || 0,
      accountLocks: eventCounts.get('account_locked') || 0,
      rateLimitViolations: eventCounts.get('rate_limit_exceeded') || 0,
      csrfViolations: eventCounts.get('csrf_violation') || 0,
      lastScan: new Date(),
      threatLevel,
      topThreats,
      ipBlacklist: Array.from(this.blockedIPs),
      recentAlerts: criticalEvents.slice(0, 10)
    }
  }

  /**
   * Get security events
   */
  async getSecurityEvents(limit = 50, severity?: string, type?: SecurityEventType): Promise<SecurityEvent[]> {
    let filteredEvents = this.events

    if (severity) {
      filteredEvents = filteredEvents.filter(event => event.severity === severity)
    }

    if (type) {
      filteredEvents = filteredEvents.filter(event => event.type === type)
    }

    return filteredEvents.slice(0, limit)
  }

  /**
   * Resolve security event
   */
  async resolveSecurityEvent(eventId: string, userId: string): Promise<boolean> {
    const event = this.events.find(e => e.id === eventId)
    if (!event) return false

    event.resolved = true
    
    await this.logSecurityEvent(
      'admin_action',
      'low',
      `Security event resolved by admin`,
      'system',
      { resolvedEventId: eventId, resolvedBy: userId },
      userId
    )

    return true
  }

  /**
   * Generate CSRF token
   */
  generateCSRFToken(sessionId: string): string {
    const token = crypto.randomBytes(32).toString('hex')
    const timestamp = Date.now()
    const signature = crypto
      .createHmac('sha256', process.env.NEXTAUTH_SECRET || 'fallback-secret')
      .update(`${sessionId}:${token}:${timestamp}`)
      .digest('hex')
    
    return `${token}.${timestamp}.${signature}`
  }

  /**
   * Validate CSRF token
   */
  validateCSRFToken(sessionId: string, token: string): boolean {
    try {
      const [tokenPart, timestampPart, signaturePart] = token.split('.')
      
      if (!tokenPart || !timestampPart || !signaturePart) {
        return false
      }

      const timestamp = parseInt(timestampPart)
      const now = Date.now()
      
      // Token expires after 24 hours
      if (now - timestamp > 24 * 60 * 60 * 1000) {
        return false
      }

      const expectedSignature = crypto
        .createHmac('sha256', process.env.NEXTAUTH_SECRET || 'fallback-secret')
        .update(`${sessionId}:${tokenPart}:${timestamp}`)
        .digest('hex')

      return crypto.timingSafeEqual(
        Buffer.from(signaturePart, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      )
    } catch {
      return false
    }
  }
}