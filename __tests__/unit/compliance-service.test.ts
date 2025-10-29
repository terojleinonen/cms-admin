/**
 * Compliance Service Tests
 * Tests for compliance reporting and audit trail export functionality
 */

import { ComplianceService } from '@/lib/compliance-service'

// Mock Prisma client
const mockPrisma = {
  auditLog: {
    count: jest.fn(),
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
  user: {
    count: jest.fn(),
    findUnique: jest.fn(),
  },
} as any

// Mock AuditService
jest.mock('@/lib/audit-service', () => ({
  AuditService: jest.fn().mockImplementation(() => ({
    getComplianceReport: jest.fn(),
    getSecurityIncidents: jest.fn(),
    validateIntegrity: jest.fn(),
  })),
}))

describe('ComplianceService', () => {
  let complianceService: ComplianceService
  let mockAuditService: any

  beforeEach(() => {
    jest.clearAllMocks()
    complianceService = new ComplianceService(mockPrisma)
    mockAuditService = (complianceService as any).auditService
  })

  describe('generateComplianceReport', () => {
    it('should generate a comprehensive compliance report', async () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')
      
      // Mock audit service responses
      mockAuditService.getComplianceReport.mockResolvedValue({
        logs: [
          {
            id: '1',
            userId: 'user1',
            action: 'auth.login',
            resource: 'user',
            createdAt: new Date(),
            user: { id: 'user1', name: 'Test User', email: 'test@example.com', role: 'ADMIN' },
          },
        ],
        summary: {
          totalActions: 100,
          uniqueUsers: 5,
          failedActions: 2,
          criticalEvents: 0,
        },
      })

      mockAuditService.getSecurityIncidents.mockResolvedValue({
        recentIncidents: [],
      })

      mockAuditService.validateIntegrity.mockResolvedValue({
        isValid: true,
        issues: [],
        totalLogs: 100,
        validLogs: 100,
      })

      // Mock user activity data
      mockPrisma.auditLog.groupBy.mockResolvedValue([
        { userId: 'user1', _count: { userId: 50 } },
      ])

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'ADMIN',
      })

      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: '1',
          userId: 'user1',
          action: 'auth.login',
          resource: 'user',
          createdAt: new Date(),
        },
      ])

      // Mock compliance metrics calculations
      mockPrisma.user.count.mockResolvedValue(10)
      mockPrisma.auditLog.count
        .mockResolvedValueOnce(100) // totalActions
        .mockResolvedValueOnce(2)   // failedActions
        .mockResolvedValueOnce(0)   // securityIncidents
        .mockResolvedValueOnce(1)   // dataExports
        .mockResolvedValueOnce(5)   // privilegedActions

      const report = await complianceService.generateComplianceReport({
        startDate,
        endDate,
        includeFailures: true,
      })

      expect(report).toHaveProperty('metadata')
      expect(report).toHaveProperty('summary')
      expect(report).toHaveProperty('auditTrail')
      expect(report).toHaveProperty('userActivity')
      expect(report).toHaveProperty('securityEvents')
      expect(report).toHaveProperty('dataIntegrity')

      expect(report.metadata.reportPeriod.start).toEqual(startDate)
      expect(report.metadata.reportPeriod.end).toEqual(endDate)
      expect(report.metadata.totalRecords).toBe(1)
      expect(report.metadata.reportId).toMatch(/^compliance-/)
    })
  })

  describe('generateSecurityStandardReport', () => {
    it('should generate SOC2 compliance report', async () => {
      const report = await complianceService.generateSecurityStandardReport('SOC2')

      expect(report.standard).toBe('SOC2')
      expect(report.requirements).toBeDefined()
      expect(report.requirements.length).toBeGreaterThan(0)
      expect(report.overallCompliance).toBeGreaterThanOrEqual(0)
      expect(report.overallCompliance).toBeLessThanOrEqual(100)
      expect(report.lastAssessment).toBeInstanceOf(Date)
    })
  })
})