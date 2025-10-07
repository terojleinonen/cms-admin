/**
 * Security Testing Utilities
 * Helper functions for security test automation
 */

import { UserRole } from '@prisma/client'
import { createMockUser, createMockSession } from './permission-test-utils'

export interface SecurityTestConfig {
  timeout: number
  retries: number
  skipSlowTests: boolean
  mockExternalServices: boolean
}

export interface VulnerabilityTestCase {
  name: string
  payload: string
  expectedStatus: number[]
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
}

export interface PermissionTestCase {
  role: UserRole
  resource: string
  action: string
  expectedResult: boolean
  description: string
}

export class SecurityTestRunner {
  private config: SecurityTestConfig

  constructor(config: Partial<SecurityTestConfig> = {}) {
    this.config = {
      timeout: 30000,
      retries: 2,
      skipSlowTests: false,
      mockExternalServices: true,
      ...config
    }
  }

  /**
   * Generate SQL injection test cases
   */
  generateSQLInjectionTests(): VulnerabilityTestCase[] {
    return [
      {
        name: 'Basic SQL injection',
        payload: "'; DROP TABLE users; --",
        expectedStatus: [400, 403, 422],
        severity: 'critical',
        category: 'sql-injection'
      },
      {
        name: 'Union-based SQL injection',
        payload: "1' UNION SELECT * FROM users --",
        expectedStatus: [400, 403, 422],
        severity: 'critical',
        category: 'sql-injection'
      },
      {
        name: 'Boolean-based blind SQL injection',
        payload: "1' OR '1'='1",
        expectedStatus: [400, 403, 422],
        severity: 'critical',
        category: 'sql-injection'
      },
      {
        name: 'Time-based blind SQL injection',
        payload: "1'; WAITFOR DELAY '00:00:05' --",
        expectedStatus: [400, 403, 422],
        severity: 'high',
        category: 'sql-injection'
      },
      {
        name: 'Stacked queries SQL injection',
        payload: "1; DELETE FROM users WHERE 1=1; --",
        expectedStatus: [400, 403, 422],
        severity: 'critical',
        category: 'sql-injection'
      }
    ]
  }

  /**
   * Generate XSS test cases
   */
  generateXSSTests(): VulnerabilityTestCase[] {
    return [
      {
        name: 'Script tag XSS',
        payload: '<script>alert("XSS")</script>',
        expectedStatus: [200, 201], // Should be sanitized, not rejected
        severity: 'high',
        category: 'xss'
      },
      {
        name: 'Image onerror XSS',
        payload: '<img src="x" onerror="alert(1)">',
        expectedStatus: [200, 201],
        severity: 'high',
        category: 'xss'
      },
      {
        name: 'JavaScript protocol XSS',
        payload: 'javascript:alert("XSS")',
        expectedStatus: [200, 201],
        severity: 'medium',
        category: 'xss'
      },
      {
        name: 'SVG onload XSS',
        payload: '<svg onload="alert(1)">',
        expectedStatus: [200, 201],
        severity: 'high',
        category: 'xss'
      },
      {
        name: 'Event handler XSS',
        payload: '<div onmouseover="alert(1)">Hover me</div>',
        expectedStatus: [200, 201],
        severity: 'medium',
        category: 'xss'
      }
    ]
  }

  /**
   * Generate path traversal test cases
   */
  generatePathTraversalTests(): VulnerabilityTestCase[] {
    return [
      {
        name: 'Unix path traversal',
        payload: '../../../etc/passwd',
        expectedStatus: [400, 403, 404],
        severity: 'high',
        category: 'path-traversal'
      },
      {
        name: 'Windows path traversal',
        payload: '..\\..\\..\\windows\\system32\\config\\sam',
        expectedStatus: [400, 403, 404],
        severity: 'high',
        category: 'path-traversal'
      },
      {
        name: 'Double encoded path traversal',
        payload: '....//....//....//etc/passwd',
        expectedStatus: [400, 403, 404],
        severity: 'medium',
        category: 'path-traversal'
      },
      {
        name: 'URL encoded path traversal',
        payload: '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        expectedStatus: [400, 403, 404],
        severity: 'medium',
        category: 'path-traversal'
      }
    ]
  }

  /**
   * Generate permission test cases for all role combinations
   */
  generatePermissionTests(): PermissionTestCase[] {
    const resources = ['products', 'users', 'categories', 'orders', 'analytics', 'admin']
    const actions = ['create', 'read', 'update', 'delete', 'manage']
    const roles = [UserRole.VIEWER, UserRole.EDITOR, UserRole.ADMIN]

    const testCases: PermissionTestCase[] = []

    // Define expected permissions for each role
    const rolePermissions = {
      [UserRole.VIEWER]: {
        products: ['read'],
        categories: ['read'],
        orders: ['read'],
        users: [],
        analytics: [],
        admin: []
      },
      [UserRole.EDITOR]: {
        products: ['create', 'read', 'update', 'delete'],
        categories: ['create', 'read', 'update', 'delete'],
        orders: ['read', 'update'],
        users: [],
        analytics: ['read'],
        admin: []
      },
      [UserRole.ADMIN]: {
        products: ['create', 'read', 'update', 'delete', 'manage'],
        categories: ['create', 'read', 'update', 'delete', 'manage'],
        orders: ['create', 'read', 'update', 'delete', 'manage'],
        users: ['create', 'read', 'update', 'delete', 'manage'],
        analytics: ['create', 'read', 'update', 'delete', 'manage'],
        admin: ['create', 'read', 'update', 'delete', 'manage']
      }
    }

    for (const role of roles) {
      for (const resource of resources) {
        for (const action of actions) {
          const allowedActions = rolePermissions[role][resource] || []
          const expectedResult = allowedActions.includes(action) || allowedActions.includes('manage')

          testCases.push({
            role,
            resource,
            action,
            expectedResult,
            description: `${role} should ${expectedResult ? 'be able to' : 'not be able to'} ${action} ${resource}`
          })
        }
      }
    }

    return testCases
  }

  /**
   * Test API endpoint for vulnerability
   */
  async testEndpointVulnerability(
    endpoint: string,
    method: string,
    testCase: VulnerabilityTestCase,
    headers: Record<string, string> = {}
  ): Promise<{ passed: boolean; response: Response; error?: string }> {
    try {
      const body = method !== 'GET' ? JSON.stringify({ 
        test: testCase.payload,
        name: testCase.payload,
        description: testCase.payload 
      }) : undefined

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body
      })

      const passed = testCase.expectedStatus.includes(response.status)

      return { passed, response }
    } catch (error) {
      return { 
        passed: false, 
        response: new Response('', { status: 500 }), 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Test permission boundary
   */
  async testPermissionBoundary(testCase: PermissionTestCase): Promise<{
    passed: boolean
    actualResult: boolean
    error?: string
  }> {
    try {
      const user = await createMockUser(testCase.role)
      const session = createMockSession(user)

      // Construct endpoint based on resource and action
      const endpoint = this.getEndpointForResourceAction(testCase.resource, testCase.action)
      const method = this.getMethodForAction(testCase.action)

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: method !== 'GET' ? JSON.stringify({}) : undefined
      })

      const actualResult = response.status < 400
      const passed = actualResult === testCase.expectedResult

      return { passed, actualResult }
    } catch (error) {
      return {
        passed: false,
        actualResult: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Run rate limiting tests
   */
  async testRateLimiting(
    endpoint: string,
    requestCount: number = 50,
    timeWindow: number = 1000
  ): Promise<{ rateLimited: boolean; rateLimitedAfter: number }> {
    const requests = Array.from({ length: requestCount }, (_, i) =>
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: `request-${i}` })
      })
    )

    const responses = await Promise.all(requests)
    const rateLimitedResponses = responses.filter(r => r.status === 429)
    const firstRateLimitedIndex = responses.findIndex(r => r.status === 429)

    return {
      rateLimited: rateLimitedResponses.length > 0,
      rateLimitedAfter: firstRateLimitedIndex >= 0 ? firstRateLimitedIndex : requestCount
    }
  }

  /**
   * Test session security
   */
  async testSessionSecurity(user: any): Promise<{
    sessionFixation: boolean
    sessionHijacking: boolean
    concurrentSessions: boolean
  }> {
    const session1 = createMockSession(user)
    const session2 = createMockSession(user)

    // Test session fixation
    const fixationResponse = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'sessionId=fixed-session-123'
      },
      body: JSON.stringify({
        email: user.email,
        password: 'password123'
      })
    })

    const sessionFixation = !fixationResponse.headers.get('Set-Cookie')?.includes('fixed-session-123')

    // Test session hijacking protection
    const hijackingResponse = await fetch('/api/user/profile', {
      headers: {
        'Authorization': `Bearer ${session1.accessToken}`,
        'X-User-ID': '999999' // Different user ID
      }
    })

    const sessionHijacking = hijackingResponse.status === 403

    // Test concurrent sessions
    const concurrent1 = await fetch('/api/user/profile', {
      headers: { 'Authorization': `Bearer ${session1.accessToken}` }
    })

    const concurrent2 = await fetch('/api/user/profile', {
      headers: { 'Authorization': `Bearer ${session2.accessToken}` }
    })

    const concurrentSessions = concurrent1.status === 200 && concurrent2.status === 200

    return { sessionFixation, sessionHijacking, concurrentSessions }
  }

  private getEndpointForResourceAction(resource: string, action: string): string {
    const baseEndpoints = {
      products: '/api/products',
      users: '/api/users',
      categories: '/api/categories',
      orders: '/api/orders',
      analytics: '/api/analytics',
      admin: '/api/admin/users'
    }

    const endpoint = baseEndpoints[resource] || '/api/test'

    if (action === 'read') {
      return endpoint
    } else if (['update', 'delete'].includes(action)) {
      return `${endpoint}/1`
    }

    return endpoint
  }

  private getMethodForAction(action: string): string {
    const methodMap = {
      create: 'POST',
      read: 'GET',
      update: 'PUT',
      delete: 'DELETE',
      manage: 'GET'
    }

    return methodMap[action] || 'GET'
  }
}

/**
 * Security test result analyzer
 */
export class SecurityTestAnalyzer {
  analyzeVulnerabilityResults(results: Array<{
    testCase: VulnerabilityTestCase
    passed: boolean
    response: Response
  }>): {
    totalTests: number
    passedTests: number
    failedTests: number
    criticalIssues: number
    highRiskIssues: number
    mediumRiskIssues: number
    lowRiskIssues: number
    vulnerabilities: string[]
  } {
    const analysis = {
      totalTests: results.length,
      passedTests: results.filter(r => r.passed).length,
      failedTests: results.filter(r => !r.passed).length,
      criticalIssues: 0,
      highRiskIssues: 0,
      mediumRiskIssues: 0,
      lowRiskIssues: 0,
      vulnerabilities: [] as string[]
    }

    for (const result of results) {
      if (!result.passed) {
        analysis.vulnerabilities.push(`${result.testCase.category}: ${result.testCase.name}`)
        
        switch (result.testCase.severity) {
          case 'critical':
            analysis.criticalIssues++
            break
          case 'high':
            analysis.highRiskIssues++
            break
          case 'medium':
            analysis.mediumRiskIssues++
            break
          case 'low':
            analysis.lowRiskIssues++
            break
        }
      }
    }

    return analysis
  }

  analyzePermissionResults(results: Array<{
    testCase: PermissionTestCase
    passed: boolean
    actualResult: boolean
  }>): {
    totalTests: number
    passedTests: number
    failedTests: number
    privilegeEscalations: number
    unauthorizedAccess: number
    permissionViolations: string[]
  } {
    const analysis = {
      totalTests: results.length,
      passedTests: results.filter(r => r.passed).length,
      failedTests: results.filter(r => !r.passed).length,
      privilegeEscalations: 0,
      unauthorizedAccess: 0,
      permissionViolations: [] as string[]
    }

    for (const result of results) {
      if (!result.passed) {
        const violation = `${result.testCase.role} ${result.actualResult ? 'gained' : 'lost'} ${result.testCase.action} access to ${result.testCase.resource}`
        analysis.permissionViolations.push(violation)

        if (result.actualResult && !result.testCase.expectedResult) {
          analysis.privilegeEscalations++
        } else if (!result.actualResult && result.testCase.expectedResult) {
          analysis.unauthorizedAccess++
        }
      }
    }

    return analysis
  }
}

export const securityTestUtils = {
  SecurityTestRunner,
  SecurityTestAnalyzer
}