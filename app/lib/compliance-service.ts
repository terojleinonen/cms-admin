/**
 * Compliance and Reporting Service
 * Handles compliance reporting, audit trail exports, and user activity analysis
 */

import { PrismaClient, Prisma } from '@prisma/client'
import { AuditService, AuditLogWithUser } from './audit-service'

export interface ComplianceReportOptions {
  startDate: Date
  endDate: Date
  userId?: string
  actions?: string[]
  resources?: string[]
  includeFailures?: boolean
  format?: 'json' | 'csv' | 'pdf'
}

export interface UserActivityReport {
  userId: string
  userName: string
  userEmail: string
  userRole: string
  totalActions: number
  loginCount: number
  failedLoginCount: number
  resourcesAccessed: string[]
  riskScore: number
  lastActivity: Date
  activityTimeline: Array<{
    date: string
    actionCount: number
    actions: Record<string, number>
  }>
}

export interface ComplianceMetrics {
  totalUsers: number
  activeUsers: number
  totalActions: number
  failedActions: number
  securityIncidents: number
  dataExports: number
  privilegedActions: number
  complianceScore: number
}

export interface SecurityStandardReport {
  standard: 'SOC2' | 'ISO27001' | 'GDPR' | 'HIPAA'
  requirements: Array<{
    id: string
    title: string
    status: 'compliant' | 'non-compliant' | 'partial'
    evidence: string[]
    gaps: string[]
    recommendations: string[]
  }>
  overallCompliance: number
  lastAssessment: Date
}

export class ComplianceService {
  private prisma: PrismaClient | Prisma.TransactionClient
  private auditService: AuditService

  constructor(prisma: PrismaClient | Prisma.TransactionClient) {
    this.prisma = prisma
    this.auditService = new AuditService(prisma)
  }

  /**
   * Generate comprehensive compliance report
   */
  async generateComplianceReport(options: ComplianceReportOptions): Promise<{
    metadata: {
      generatedAt: Date
      reportPeriod: { start: Date; end: Date }
      totalRecords: number
      reportId: string
    }
    summary: ComplianceMetrics
    auditTrail: AuditLogWithUser[]
    userActivity: UserActivityReport[]
    securityEvents: any[]
    dataIntegrity: {
      isValid: boolean
      issues: string[]
      validationDate: Date
    }
  }> {
    const reportId = `compliance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Get audit trail for the period
    const auditResult = await this.auditService.getComplianceReport(options)
    
    // Generate user activity reports
    const userActivity = await this.generateUserActivityReports(options.startDate, options.endDate)
    
    // Get security events
    const securityEvents = await this.auditService.getSecurityIncidents(
      Math.ceil((options.endDate.getTime() - options.startDate.getTime()) / (1000 * 60 * 60 * 24))
    )
    
    // Validate data integrity
    const dataIntegrity = await this.auditService.validateIntegrity(options.startDate, options.endDate)
    
    // Calculate compliance metrics
    const complianceMetrics = await this.calculateComplianceMetrics(options.startDate, options.endDate)
    
    return {
      metadata: {
        generatedAt: new Date(),
        reportPeriod: { start: options.startDate, end: options.endDate },
        totalRecords: auditResult.logs.length,
        reportId,
      },
      summary: complianceMetrics,
      auditTrail: auditResult.logs,
      userActivity,
      securityEvents: securityEvents.recentIncidents,
      dataIntegrity: {
        ...dataIntegrity,
        validationDate: new Date(),
      },
    }
  }

  /**
   * Export audit trail in various formats
   */
  async exportAuditTrail(options: ComplianceReportOptions): Promise<{
    data: string | Buffer
    filename: string
    contentType: string
  }> {
    const report = await this.generateComplianceReport(options)
    const timestamp = new Date().toISOString().split('T')[0]
    
    switch (options.format) {
      case 'csv':
        return {
          data: this.formatAuditTrailAsCSV(report.auditTrail),
          filename: `audit-trail-${timestamp}.csv`,
          contentType: 'text/csv',
        }
      
      case 'pdf':
        return {
          data: await this.formatAuditTrailAsPDF(report),
          filename: `compliance-report-${timestamp}.pdf`,
          contentType: 'application/pdf',
        }
      
      default: // json
        return {
          data: JSON.stringify(report, null, 2),
          filename: `compliance-report-${timestamp}.json`,
          contentType: 'application/json',
        }
    }
  }

  /**
   * Generate user activity analysis reports
   */
  async generateUserActivityReports(startDate: Date, endDate: Date): Promise<UserActivityReport[]> {
    // Get all users who had activity in the period
    const activeUsers = await this.prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        userId: true,
      },
    })

    const reports: UserActivityReport[] = []

    for (const userStat of activeUsers) {
      const user = await this.prisma.user.findUnique({
        where: { id: userStat.userId },
        select: { id: true, name: true, email: true, role: true },
      })

      if (!user) continue

      // Get detailed activity for this user
      const userLogs = await this.prisma.auditLog.findMany({
        where: {
          userId: userStat.userId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      // Calculate metrics
      const loginCount = userLogs.filter(log => log.action.includes('auth.login')).length
      const failedLoginCount = userLogs.filter(log => log.action.includes('auth.login_failed')).length
      const resourcesAccessed = [...new Set(userLogs.map(log => log.resource))]
      const lastActivity = userLogs[0]?.createdAt || startDate

      // Calculate risk score based on various factors
      const riskScore = this.calculateUserRiskScore(userLogs, failedLoginCount, resourcesAccessed)

      // Generate activity timeline
      const activityTimeline = this.generateActivityTimeline(userLogs, startDate, endDate)

      reports.push({
        userId: user.id,
        userName: user.name || 'Unknown',
        userEmail: user.email || 'Unknown',
        userRole: user.role,
        totalActions: userLogs.length,
        loginCount,
        failedLoginCount,
        resourcesAccessed,
        riskScore,
        lastActivity,
        activityTimeline,
      })
    }

    return reports.sort((a, b) => b.riskScore - a.riskScore)
  }

  /**
   * Generate security standards compliance report
   */
  async generateSecurityStandardReport(standard: 'SOC2' | 'ISO27001' | 'GDPR' | 'HIPAA'): Promise<SecurityStandardReport> {
    const requirements = await this.getSecurityRequirements(standard)
    const assessmentResults = await this.assessCompliance(requirements)
    
    const overallCompliance = assessmentResults.reduce((sum, req) => {
      return sum + (req.status === 'compliant' ? 1 : req.status === 'partial' ? 0.5 : 0)
    }, 0) / assessmentResults.length * 100

    return {
      standard,
      requirements: assessmentResults,
      overallCompliance,
      lastAssessment: new Date(),
    }
  }

  /**
   * Calculate compliance metrics
   */
  private async calculateComplianceMetrics(startDate: Date, endDate: Date): Promise<ComplianceMetrics> {
    const [
      totalUsers,
      activeUsers,
      totalActions,
      failedActions,
      securityIncidents,
      dataExports,
      privilegedActions,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }).then(result => result.length),
      this.prisma.auditLog.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.auditLog.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          details: {
            path: ['success'],
            equals: false,
          },
        },
      }),
      this.prisma.auditLog.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          action: { contains: 'security.' },
        },
      }),
      this.prisma.auditLog.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          action: { contains: 'data_export' },
        },
      }),
      this.prisma.auditLog.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          OR: [
            { action: { contains: 'user.role_changed' } },
            { action: { contains: 'system.' } },
            { action: { contains: 'security.' } },
          ],
        },
      }),
    ])

    // Calculate compliance score based on various factors
    const failureRate = totalActions > 0 ? failedActions / totalActions : 0
    const securityIncidentRate = totalActions > 0 ? securityIncidents / totalActions : 0
    const complianceScore = Math.max(0, 100 - (failureRate * 50) - (securityIncidentRate * 30))

    return {
      totalUsers,
      activeUsers,
      totalActions,
      failedActions,
      securityIncidents,
      dataExports,
      privilegedActions,
      complianceScore: Math.round(complianceScore),
    }
  }

  /**
   * Calculate user risk score
   */
  private calculateUserRiskScore(logs: any[], failedLogins: number, resourcesAccessed: string[]): number {
    let riskScore = 0

    // Failed login attempts (higher risk)
    riskScore += failedLogins * 10

    // Number of different resources accessed (moderate risk if excessive)
    if (resourcesAccessed.length > 10) {
      riskScore += (resourcesAccessed.length - 10) * 2
    }

    // Security-related actions (higher risk)
    const securityActions = logs.filter(log => log.action.includes('security.')).length
    riskScore += securityActions * 5

    // Administrative actions (moderate risk)
    const adminActions = logs.filter(log => 
      log.action.includes('user.') || log.action.includes('system.')
    ).length
    riskScore += adminActions * 3

    // Activity outside business hours (moderate risk)
    const outsideHoursActions = logs.filter(log => {
      const hour = new Date(log.createdAt).getHours()
      return hour < 8 || hour > 18
    }).length
    riskScore += outsideHoursActions * 1

    return Math.min(100, riskScore)
  }

  /**
   * Generate activity timeline
   */
  private generateActivityTimeline(logs: any[], startDate: Date, endDate: Date): Array<{
    date: string
    actionCount: number
    actions: Record<string, number>
  }> {
    const timeline: Record<string, { actionCount: number; actions: Record<string, number> }> = {}

    // Initialize timeline with all dates in range
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      timeline[dateStr] = { actionCount: 0, actions: {} }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Populate timeline with actual data
    logs.forEach(log => {
      const dateStr = new Date(log.createdAt).toISOString().split('T')[0]
      if (timeline[dateStr]) {
        timeline[dateStr].actionCount++
        timeline[dateStr].actions[log.action] = (timeline[dateStr].actions[log.action] || 0) + 1
      }
    })

    return Object.entries(timeline).map(([date, data]) => ({
      date,
      ...data,
    }))
  }

  /**
   * Format audit trail as CSV
   */
  private formatAuditTrailAsCSV(logs: AuditLogWithUser[]): string {
    const headers = [
      'Timestamp',
      'User ID',
      'User Name',
      'User Email',
      'User Role',
      'Action',
      'Resource',
      'Resource ID',
      'Success',
      'IP Address',
      'User Agent',
      'Details',
    ]

    const rows = logs.map(log => [
      log.createdAt.toISOString(),
      log.userId,
      log.user.name || '',
      log.user.email || '',
      log.user.role,
      log.action,
      log.resource,
      (log.details as any)?.resourceId || '',
      (log.details as any)?.success !== false ? 'Yes' : 'No',
      log.ipAddress || '',
      log.userAgent || '',
      JSON.stringify(log.details || {}),
    ])

    return [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
  }

  /**
   * Format audit trail as PDF (placeholder - would need PDF library)
   */
  private async formatAuditTrailAsPDF(report: any): Promise<Buffer> {
    // This would require a PDF generation library like puppeteer or jsPDF
    // For now, return a simple text representation
    const content = `
COMPLIANCE REPORT
Generated: ${report.metadata.generatedAt.toISOString()}
Period: ${report.metadata.reportPeriod.start.toISOString()} to ${report.metadata.reportPeriod.end.toISOString()}
Total Records: ${report.metadata.totalRecords}

SUMMARY:
- Total Users: ${report.summary.totalUsers}
- Active Users: ${report.summary.activeUsers}
- Total Actions: ${report.summary.totalActions}
- Failed Actions: ${report.summary.failedActions}
- Security Incidents: ${report.summary.securityIncidents}
- Compliance Score: ${report.summary.complianceScore}%

AUDIT TRAIL:
${report.auditTrail.map((log: any) => 
  `${log.createdAt.toISOString()} - ${log.user.name} (${log.user.email}) - ${log.action} on ${log.resource}`
).join('\n')}
    `

    return Buffer.from(content, 'utf-8')
  }

  /**
   * Get security requirements for a standard
   */
  private async getSecurityRequirements(standard: string): Promise<Array<{
    id: string
    title: string
    description: string
  }>> {
    const requirements: Record<string, Array<{ id: string; title: string; description: string }>> = {
      SOC2: [
        {
          id: 'CC6.1',
          title: 'Logical and Physical Access Controls',
          description: 'The entity implements logical and physical access controls to protect against threats from sources outside its system boundaries.',
        },
        {
          id: 'CC6.2',
          title: 'Access Control Management',
          description: 'Prior to issuing system credentials and granting system access, the entity registers and authorizes new internal and external users.',
        },
        {
          id: 'CC6.3',
          title: 'User Access Provisioning',
          description: 'The entity authorizes, modifies, or removes access to data, software, functions, and other protected information assets.',
        },
        {
          id: 'CC7.1',
          title: 'System Monitoring',
          description: 'To meet its objectives, the entity uses detection and monitoring procedures to identify anomalies.',
        },
      ],
      GDPR: [
        {
          id: 'Art.5',
          title: 'Principles of Processing',
          description: 'Personal data shall be processed lawfully, fairly and in a transparent manner.',
        },
        {
          id: 'Art.25',
          title: 'Data Protection by Design',
          description: 'The controller shall implement appropriate technical and organisational measures.',
        },
        {
          id: 'Art.32',
          title: 'Security of Processing',
          description: 'The controller and processor shall implement appropriate technical and organisational measures.',
        },
      ],
    }

    return requirements[standard] || []
  }

  /**
   * Assess compliance against requirements
   */
  private async assessCompliance(requirements: Array<{
    id: string
    title: string
    description: string
  }>): Promise<Array<{
    id: string
    title: string
    status: 'compliant' | 'non-compliant' | 'partial'
    evidence: string[]
    gaps: string[]
    recommendations: string[]
  }>> {
    // This would be a complex assessment based on audit logs and system configuration
    // For now, return a simplified assessment
    return requirements.map(req => ({
      id: req.id,
      title: req.title,
      status: 'compliant' as const,
      evidence: [
        'Audit logging implemented',
        'Access controls in place',
        'Regular monitoring active',
      ],
      gaps: [],
      recommendations: [
        'Continue regular monitoring',
        'Review access controls quarterly',
      ],
    }))
  }
}