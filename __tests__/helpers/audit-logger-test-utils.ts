/**
 * Audit Logger Testing Utilities
 * Testing utilities for audit logging hooks and functionality
 */

import { jest } from '@jest/globals'
import { User } from '../../app/lib/types'
import { AuditLogEntry, AuditLogger, AuditLoggerOptions } from '../../app/lib/hooks/useAuditLogger'
import { createMockUser } from './permission-test-utils'

// Mock fetch for audit log API calls
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock audit log entries
export interface MockAuditLogEntry extends AuditLogEntry {
  id?: string
  userId?: string
  timestamp?: Date
  success?: boolean
}

export function createMockAuditLogEntry(overrides: Partial<MockAuditLogEntry> = {}): MockAuditLogEntry {
  return {
    id: 'audit-log-id',
    action: 'test.action',
    resource: 'test',
    resourceId: 'test-resource-id',
    details: { test: 'data' },
    severity: 'low',
    userId: 'test-user-id',
    timestamp: new Date(),
    success: true,
    ...overrides,
  }
}

// Mock audit logger implementation
export class MockAuditLogger implements AuditLogger {
  private logs: MockAuditLogEntry[] = []
  private batchQueue: AuditLogEntry[] = []
  public user: User | null
  public isEnabled: boolean

  constructor(user: User | null = null, options: AuditLoggerOptions = {}) {
    this.user = user
    this.isEnabled = !!user
  }

  // Mock implementations
  log = jest.fn().mockImplementation(async (entry: AuditLogEntry) => {
    if (!this.isEnabled) {
      return Promise.resolve()
    }
    
    const mockEntry = createMockAuditLogEntry({
      ...entry,
      userId: this.user?.id,
      timestamp: new Date(),
    })
    
    this.logs.push(mockEntry)
    
    // Simulate API call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, data: mockEntry }),
    })
  })

  logSync = jest.fn().mockImplementation((entry: AuditLogEntry) => {
    if (!this.isEnabled) return
    
    const mockEntry = createMockAuditLogEntry({
      ...entry,
      userId: this.user?.id,
      timestamp: new Date(),
    })
    
    this.logs.push(mockEntry)
  })

  // Convenience methods
  logAuth = jest.fn().mockImplementation(async (action: string, details?: Record<string, unknown>) => {
    await this.log({
      action: `auth.${action}`,
      resource: 'user',
      resourceId: this.user?.id,
      details,
      severity: action.includes('failed') ? 'medium' : 'low',
    })
  })

  logUser = jest.fn().mockImplementation(async (action: string, targetUserId?: string, details?: Record<string, unknown>) => {
    await this.log({
      action: `user.${action}`,
      resource: 'user',
      resourceId: targetUserId,
      details,
      severity: ['deleted', 'role_changed'].includes(action) ? 'high' : 'medium',
    })
  })

  logSecurity = jest.fn().mockImplementation(async (action: string, details?: Record<string, unknown>) => {
    await this.log({
      action: `security.${action}`,
      resource: 'system',
      details,
      severity: 'high',
    })
  })

  logSystem = jest.fn().mockImplementation(async (action: string, details?: Record<string, unknown>) => {
    await this.log({
      action: `system.${action}`,
      resource: 'system',
      details,
      severity: 'medium',
    })
  })

  logResource = jest.fn().mockImplementation(async (
    action: string,
    resource: string,
    resourceId?: string,
    details?: Record<string, unknown>
  ) => {
    await this.log({
      action: `${resource}.${action}`,
      resource,
      resourceId,
      details,
      severity: action === 'delete' ? 'high' : 'low',
    })
  })

  // Permission logging
  logPermissionCheck = jest.fn().mockImplementation(async (
    permission: { resource: string; action: string; scope?: string },
    result: boolean,
    reason?: string
  ) => {
    await this.log({
      action: result ? 'permission.granted' : 'permission.denied',
      resource: permission.resource,
      details: { permission, result, reason },
      severity: result ? 'low' : 'medium',
    })
  })

  logUnauthorizedAccess = jest.fn().mockImplementation(async (
    resource: string,
    action: string,
    reason?: string
  ) => {
    await this.log({
      action: 'security.unauthorized_access',
      resource,
      details: { attemptedAction: action, reason },
      severity: 'high',
    })
  })

  // UI interaction logging
  logButtonClick = jest.fn().mockImplementation(async (
    buttonId: string,
    context?: Record<string, unknown>
  ) => {
    await this.log({
      action: 'ui.button_click',
      resource: 'ui',
      resourceId: buttonId,
      details: context,
      severity: 'low',
    })
  })

  logFormSubmit = jest.fn().mockImplementation(async (
    formId: string,
    success: boolean,
    errors?: Record<string, unknown>
  ) => {
    await this.log({
      action: success ? 'ui.form_submit_success' : 'ui.form_submit_error',
      resource: 'ui',
      resourceId: formId,
      details: { success, errors },
      severity: success ? 'low' : 'medium',
    })
  })

  logNavigation = jest.fn().mockImplementation(async (
    from: string,
    to: string,
    method?: string
  ) => {
    await this.log({
      action: 'ui.navigation',
      resource: 'ui',
      details: { from, to, method: method || 'unknown' },
      severity: 'low',
    })
  })

  logSearch = jest.fn().mockImplementation(async (
    query: string,
    results?: number,
    filters?: Record<string, unknown>
  ) => {
    await this.log({
      action: 'ui.search',
      resource: 'search',
      details: { query, results, filters },
      severity: 'low',
    })
  })

  logExport = jest.fn().mockImplementation(async (
    resource: string,
    format: string,
    filters?: Record<string, unknown>
  ) => {
    await this.log({
      action: 'data.export',
      resource,
      details: { format, filters },
      severity: 'medium',
    })
  })

  logImport = jest.fn().mockImplementation(async (
    resource: string,
    success: boolean,
    details?: Record<string, unknown>
  ) => {
    await this.log({
      action: success ? 'data.import_success' : 'data.import_error',
      resource,
      details,
      severity: success ? 'medium' : 'high',
    })
  })

  flush = jest.fn().mockImplementation(async () => {
    // Simulate batch processing
    if (this.batchQueue.length > 0) {
      const batch = [...this.batchQueue]
      this.batchQueue = []
      
      for (const entry of batch) {
        await this.log(entry)
      }
    }
  })

  // Test utilities
  getLogs(): MockAuditLogEntry[] {
    return [...this.logs]
  }

  getLogsByAction(action: string): MockAuditLogEntry[] {
    return this.logs.filter(log => log.action === action)
  }

  getLogsByResource(resource: string): MockAuditLogEntry[] {
    return this.logs.filter(log => log.resource === resource)
  }

  getLogsBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): MockAuditLogEntry[] {
    return this.logs.filter(log => log.severity === severity)
  }

  clearLogs(): void {
    this.logs = []
  }

  getCallCount(method: keyof AuditLogger): number {
    const mockMethod = this[method] as jest.Mock
    return mockMethod.mock.calls.length
  }

  getLastCall(method: keyof AuditLogger): any[] | undefined {
    const mockMethod = this[method] as jest.Mock
    const calls = mockMethod.mock.calls
    return calls[calls.length - 1]
  }
}

// Factory function for creating mock audit loggers
export function createMockAuditLogger(
  user: User | null = null,
  options: AuditLoggerOptions = {}
): MockAuditLogger {
  return new MockAuditLogger(user, options)
}

// Test scenarios for audit logging
export const AUDIT_LOG_SCENARIOS = {
  AUTHENTICATION: {
    description: 'Authentication events',
    actions: ['login', 'logout', 'login_failed', 'password_changed'],
    expectedSeverity: 'medium',
    expectedResource: 'user',
  },
  USER_MANAGEMENT: {
    description: 'User management events',
    actions: ['created', 'updated', 'deleted', 'role_changed', 'deactivated'],
    expectedSeverity: 'high',
    expectedResource: 'user',
  },
  SECURITY: {
    description: 'Security events',
    actions: ['unauthorized_access', 'permission_denied', 'suspicious_activity'],
    expectedSeverity: 'high',
    expectedResource: 'system',
  },
  CONTENT_MANAGEMENT: {
    description: 'Content management events',
    actions: ['created', 'updated', 'deleted', 'published'],
    expectedSeverity: 'low',
    resources: ['products', 'categories', 'pages', 'media'],
  },
  UI_INTERACTIONS: {
    description: 'UI interaction events',
    actions: ['button_click', 'form_submit_success', 'form_submit_error', 'navigation', 'search'],
    expectedSeverity: 'low',
    expectedResource: 'ui',
  },
  DATA_OPERATIONS: {
    description: 'Data import/export events',
    actions: ['export', 'import_success', 'import_error'],
    expectedSeverity: 'medium',
    resources: ['products', 'users', 'orders'],
  },
} as const

// Audit logger test utilities
export const AuditLoggerTestUtils = {
  // Setup utilities
  setupMockFetch: (responses: Array<{ ok: boolean; status: number; data?: any }> = []) => {
    mockFetch.mockClear()
    
    responses.forEach((response, index) => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: response.ok,
          status: response.status,
          json: () => Promise.resolve(response.data || { success: response.ok }),
        })
      )
    })
    
    // Default successful response for any additional calls
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      })
    )
  },

  // Create test users with different roles
  createTestUsers: () => ({
    admin: createMockUser({ id: 'admin-id', role: 'ADMIN' as any, name: 'Admin User' }),
    editor: createMockUser({ id: 'editor-id', role: 'EDITOR' as any, name: 'Editor User' }),
    viewer: createMockUser({ id: 'viewer-id', role: 'VIEWER' as any, name: 'Viewer User' }),
  }),

  // Simulate batch logging
  simulateBatchLogging: async (logger: MockAuditLogger, entries: AuditLogEntry[]) => {
    for (const entry of entries) {
      logger.logSync(entry)
    }
    await logger.flush()
  },

  // Generate test audit entries
  generateTestEntries: (count: number, resource: string = 'test'): AuditLogEntry[] => {
    return Array.from({ length: count }, (_, i) => ({
      action: `${resource}.action_${i}`,
      resource,
      resourceId: `${resource}-${i}`,
      details: { index: i, timestamp: new Date() },
      severity: i % 2 === 0 ? 'low' : 'medium' as const,
    }))
  },
}

// Assertion utilities for audit logging
export const AuditLoggerAssertions = {
  expectLogCalled: (logger: MockAuditLogger, times: number = 1) => {
    expect(logger.log).toHaveBeenCalledTimes(times)
  },

  expectLogNotCalled: (logger: MockAuditLogger) => {
    expect(logger.log).not.toHaveBeenCalled()
  },

  expectLogCalledWith: (logger: MockAuditLogger, expectedEntry: Partial<AuditLogEntry>) => {
    expect(logger.log).toHaveBeenCalledWith(expect.objectContaining(expectedEntry))
  },

  expectAuthLogCalled: (logger: MockAuditLogger, action: string, details?: Record<string, unknown>) => {
    expect(logger.logAuth).toHaveBeenCalledWith(action, details)
  },

  expectUserLogCalled: (logger: MockAuditLogger, action: string, targetUserId?: string, details?: Record<string, unknown>) => {
    expect(logger.logUser).toHaveBeenCalledWith(action, targetUserId, details)
  },

  expectSecurityLogCalled: (logger: MockAuditLogger, action: string, details?: Record<string, unknown>) => {
    expect(logger.logSecurity).toHaveBeenCalledWith(action, details)
  },

  expectPermissionLogCalled: (
    logger: MockAuditLogger,
    permission: { resource: string; action: string; scope?: string },
    result: boolean,
    reason?: string
  ) => {
    if (reason === undefined) {
      expect(logger.logPermissionCheck).toHaveBeenCalledWith(permission, result)
    } else {
      expect(logger.logPermissionCheck).toHaveBeenCalledWith(permission, result, reason)
    }
  },

  expectUnauthorizedAccessLogCalled: (logger: MockAuditLogger, resource: string, action: string, reason?: string) => {
    expect(logger.logUnauthorizedAccess).toHaveBeenCalledWith(resource, action, reason)
  },

  expectUILogCalled: (logger: MockAuditLogger, method: 'logButtonClick' | 'logFormSubmit' | 'logNavigation' | 'logSearch', ...args: any[]) => {
    expect(logger[method]).toHaveBeenCalledWith(...args)
  },

  expectDataLogCalled: (logger: MockAuditLogger, method: 'logExport' | 'logImport', ...args: any[]) => {
    expect(logger[method]).toHaveBeenCalledWith(...args)
  },

  expectFlushCalled: (logger: MockAuditLogger, times: number = 1) => {
    expect(logger.flush).toHaveBeenCalledTimes(times)
  },

  expectFetchCalled: (times: number = 1) => {
    expect(mockFetch).toHaveBeenCalledTimes(times)
  },

  expectFetchCalledWith: (url: string, options?: RequestInit) => {
    expect(mockFetch).toHaveBeenCalledWith(url, options)
  },

  expectLogCount: (logger: MockAuditLogger, expectedCount: number) => {
    expect(logger.getLogs()).toHaveLength(expectedCount)
  },

  expectLogsByAction: (logger: MockAuditLogger, action: string, expectedCount: number) => {
    expect(logger.getLogsByAction(action)).toHaveLength(expectedCount)
  },

  expectLogsByResource: (logger: MockAuditLogger, resource: string, expectedCount: number) => {
    expect(logger.getLogsByResource(resource)).toHaveLength(expectedCount)
  },

  expectLogsBySeverity: (logger: MockAuditLogger, severity: 'low' | 'medium' | 'high' | 'critical', expectedCount: number) => {
    expect(logger.getLogsBySeverity(severity)).toHaveLength(expectedCount)
  },

  expectLogContains: (logger: MockAuditLogger, expectedFields: Partial<MockAuditLogEntry>) => {
    const logs = logger.getLogs()
    expect(logs).toContainEqual(expect.objectContaining(expectedFields))
  },

  expectLogDoesNotContain: (logger: MockAuditLogger, unexpectedFields: Partial<MockAuditLogEntry>) => {
    const logs = logger.getLogs()
    expect(logs).not.toContainEqual(expect.objectContaining(unexpectedFields))
  },
}

// Performance testing utilities
export const AuditLoggerPerformanceUtils = {
  measureLogPerformance: async (logger: MockAuditLogger, entryCount: number) => {
    const entries = AuditLoggerTestUtils.generateTestEntries(entryCount)
    
    const start = performance.now()
    
    for (const entry of entries) {
      await logger.log(entry)
    }
    
    const end = performance.now()
    
    return {
      totalTime: end - start,
      averageTime: (end - start) / entryCount,
      entriesPerSecond: entryCount / ((end - start) / 1000),
    }
  },

  measureBatchPerformance: async (logger: MockAuditLogger, batchSize: number, batchCount: number) => {
    const start = performance.now()
    
    for (let i = 0; i < batchCount; i++) {
      const entries = AuditLoggerTestUtils.generateTestEntries(batchSize)
      await AuditLoggerTestUtils.simulateBatchLogging(logger, entries)
    }
    
    const end = performance.now()
    const totalEntries = batchSize * batchCount
    
    return {
      totalTime: end - start,
      averageTime: (end - start) / totalEntries,
      entriesPerSecond: totalEntries / ((end - start) / 1000),
      batchesPerSecond: batchCount / ((end - start) / 1000),
    }
  },
}

// Test cleanup utilities
export const AuditLoggerTestCleanup = {
  beforeEach: () => {
    jest.clearAllMocks()
    mockFetch.mockClear()
    AuditLoggerTestUtils.setupMockFetch()
  },

  afterEach: () => {
    // Clean up any pending timers or async operations
  },
}

export default {
  createMockAuditLogEntry,
  MockAuditLogger,
  createMockAuditLogger,
  AuditLoggerTestUtils,
  AuditLoggerAssertions,
  AuditLoggerPerformanceUtils,
  AuditLoggerTestCleanup,
  AUDIT_LOG_SCENARIOS,
}