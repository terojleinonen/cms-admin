/**
 * Automated Security Testing Utilities
 * Provides automated security test generation and execution
 */

import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { ApiTestRunner, TestUserFactory } from '../../helpers/api-permission-test-utils'

export interface SecurityTestConfig {
  endpoint: string
  method: string
  allowedRoles: UserRole[]
  handler: (request: NextRequest) => Promise<NextResponse>
}

export interface SecurityTestResult {
  passed: number
  failed: number
  total: number
  results: TestResult[]
}

export interface TestResult {
  role: UserRole
  passed: boolean
  expectedStatus: number
  actualStatus: number
  description: string
}

/**
 * Run automated security tests for an API endpoint
 */
export async function runAutomatedSecurityTests(
  config: SecurityTestConfig
): Promise<SecurityTestResult> {
  const runner = new ApiTestRunner()
  const allRoles = [UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER]
  const results: TestResult[] = []

  for (const role of allRoles) {
    const shouldSucceed = config.allowedRoles.includes(role)
    const expectedStatus = shouldSucceed ? 200 : 403

    try {
      const response = await runner.runRoleTest(
        role,
        config.endpoint,
        config.method,
        config.handler,
        shouldSucceed
      )

      const actualStatus = response.status
      const passed = actualStatus === expectedStatus

      results.push({
        role,
        passed,
        expectedStatus,
        actualStatus,
        description: `${role} ${shouldSucceed ? 'should' : 'should not'} access ${config.endpoint}`
      })
    } catch (error) {
      results.push({
        role,
        passed: false,
        expectedStatus,
        actualStatus: 500,
        description: `${role} test failed with error: ${error}`
      })
    }
  }

  runner.cleanup()

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length

  return {
    passed,
    failed,
    total: results.length,
    results
  }
}

/**
 * Generate security test suite for multiple endpoints
 */
export function generateSecurityTestSuite(configs: SecurityTestConfig[]) {
  return async () => {
    const allResults: SecurityTestResult[] = []

    for (const config of configs) {
      const result = await runAutomatedSecurityTests(config)
      allResults.push(result)
    }

    return allResults
  }
}
