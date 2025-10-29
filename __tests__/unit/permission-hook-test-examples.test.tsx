/**
 * Permission Hook Testing Utilities - Example Tests
 * Demonstrates how to use the comprehensive permission hook testing utilities
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { UserRole } from '@prisma/client'
import { usePermissions } from '../../app/lib/hooks/usePermissions'
import { useRoleGuard } from '../../app/lib/hooks/useRoleGuard'
import { useAuditLogger } from '../../app/lib/hooks/useAuditLogger'
import {
  MockPermissionProvider,
  renderPermissionHook,
  PermissionHookTestUtils,
  PermissionHookAssertions,
  RoleGuardHookTestUtils,
  AuditLoggerHookTestUtils,
  PermissionTestSuiteRunner,
  PermissionHookTestCleanup
} from './permission-hook-test-utils'
import { createMockUser, PERMISSION_TEST_SCENARIOS } from './permission-test-utils'
import { ROLE_GUARD_SCENARIOS } from './role-guard-test-utils'
import { AUDIT_LOG_SCENARIOS } from './audit-logger-test-utils'

describe('Permission Hook Testing Utilities Examples', () => {
  beforeEach(() => {
    PermissionHookTestCleanup.beforeEach()
  })

  afterEach(() => {
    PermissionHookTestCleanup.afterEach()
  })

  describe('usePermissions Hook Testing', () => {
    it('should test permissions with different roles using utility functions', () => {
      // Test as admin
      const adminResult = PermissionHookTestUtils.renderAsAdmin(() => usePermissions())
      PermissionHookAssertions.expectIsAdmin(adminResult.result.current)
      PermissionHookAssertions.expectCanCreateProduct(adminResult.result.current)
      PermissionHookAssertions.expectCanCreateUser(adminResult.result.current)
      PermissionHookAssertions.expectCanManageSecurity(adminResult.result.current)

      // Test as editor
      const editorResult = PermissionHookTestUtils.renderAsEditor(() => usePermissions())
      PermissionHookAssertions.expectIsNotAdmin(editorResult.result.current)
      PermissionHookAssertions.expectIsEditor(editorResult.result.current)
      PermissionHookAssertions.expectCanCreateProduct(editorResult.result.current)
      PermissionHookAssertions.expectCannotCreateUser(editorResult.result.current)
      PermissionHookAssertions.expectCannotManageSecurity(editorResult.result.current)

      // Test as viewer
      const viewerResult = PermissionHookTestUtils.renderAsViewer(() => usePermissions())
      PermissionHookAssertions.expectIsNotAdmin(viewerResult.result.current)
      PermissionHookAssertions.expectIsNotEditor(viewerResult.result.current)
      PermissionHookAssertions.expectIsViewer(viewerResult.result.current)
      PermissionHookAssertions.expectCannotCreateProduct(viewerResult.result.current)
      PermissionHookAssertions.expectCanReadProduct(viewerResult.result.current)

      // Test unauthenticated
      const unauthResult = PermissionHookTestUtils.renderAsUnauthenticated(() => usePermissions())
      PermissionHookAssertions.expectIsNotAuthenticated(unauthResult.result.current)
      PermissionHookAssertions.expectCannotCreateProduct(unauthResult.result.current)
      PermissionHookAssertions.expectCannotReadProduct(unauthResult.result.current)
    })

    it('should test custom permissions using renderPermissionHook', () => {
      const customPermissions = {
        'products.create': true,
        'products.delete': false,
        'users.read': true,
      }

      const result = renderPermissionHook(() => usePermissions(), {
        user: createMockUser({ role: UserRole.EDITOR }),
        customPermissions
      })

      const permissions = result.result.current

      // Test custom permissions
      PermissionHookAssertions.expectCanAccess(permissions, 'products', 'create')
      PermissionHookAssertions.expectCannotAccess(permissions, 'products', 'delete')
      PermissionHookAssertions.expectCanAccess(permissions, 'users', 'read')
    })

    it('should test loading states', () => {
      const result = PermissionHookTestUtils.renderWithLoading(() => usePermissions())
      PermissionHookAssertions.expectIsLoading(result.result.current)
    })

    it('should test permission scenarios', () => {
      const result = PermissionHookTestUtils.renderWithScenario(
        () => usePermissions(),
        'ADMIN'
      )

      const permissions = result.result.current
      const scenario = PERMISSION_TEST_SCENARIOS.ADMIN

      // Test all expected permissions for admin scenario
      Object.entries(scenario.expectedPermissions).forEach(([method, expected]) => {
        const actual = (permissions as any)[method]()
        expect(actual).toBe(expected)
      })
    })

    it('should test ownership-based permissions', () => {
      const user = createMockUser({ id: 'user-123', role: UserRole.EDITOR })
      const result = renderPermissionHook(() => usePermissions(), { user })

      const permissions = result.result.current

      // Test ownership scenarios
      PermissionHookAssertions.expectCanReadProduct(permissions, 'user-123') // Own product
      PermissionHookAssertions.expectCanUpdateProduct(permissions, 'user-123') // Own product
      PermissionHookAssertions.expectCannotDeleteProduct(permissions, 'other-user') // Other's product
    })

    it('should test filtering functionality', () => {
      const result = PermissionHookTestUtils.renderAsEditor(() => usePermissions())
      const permissions = result.result.current

      const products = [
        { id: '1', name: 'Product 1' },
        { id: '2', name: 'Product 2' },
        { id: '3', name: 'Product 3' },
      ]

      const getResource = () => 'products'

      // Editor should see all products
      PermissionHookAssertions.expectAllItemsFiltered(permissions, products, getResource)

      // Test with viewer (should also see all for read)
      const viewerResult = PermissionHookTestUtils.renderAsViewer(() => usePermissions())
      const viewerPermissions = viewerResult.result.current
      PermissionHookAssertions.expectAllItemsFiltered(viewerPermissions, products, getResource, 'read')

      // Test with unauthenticated (should see none)
      const unauthResult = PermissionHookTestUtils.renderAsUnauthenticated(() => usePermissions())
      const unauthPermissions = unauthResult.result.current
      PermissionHookAssertions.expectNoItemsFiltered(unauthPermissions, products, getResource)
    })

    it('should test dynamic permission updates', () => {
      const result = renderPermissionHook(() => usePermissions(), {
        user: createMockUser({ role: UserRole.VIEWER })
      })

      // Initially viewer
      PermissionHookAssertions.expectIsViewer(result.result.current)
      PermissionHookAssertions.expectCannotCreateProduct(result.result.current)

      // Update to editor
      act(() => {
        result.updateUser(createMockUser({ role: UserRole.EDITOR }))
      })

      PermissionHookAssertions.expectIsEditor(result.result.current)
      PermissionHookAssertions.expectCanCreateProduct(result.result.current)

      // Update permissions
      act(() => {
        result.updatePermissions({ 'products.create': false })
      })

      PermissionHookAssertions.expectCannotCreateProduct(result.result.current)
    })
  })

  describe('useRoleGuard Hook Testing', () => {
    it('should test role guard scenarios', async () => {
      const results = await RoleGuardHookTestUtils.testRoleGuardScenario('ADMIN_ONLY')
      
      // Check that admin is authorized
      const adminResult = results.find(r => r.role === UserRole.ADMIN)
      expect(adminResult?.isAuthorized).toBe(true)

      // Check that editor is not authorized
      const editorResult = results.find(r => r.role === UserRole.EDITOR)
      expect(editorResult?.isAuthorized).toBe(false)
      expect(editorResult?.reason).toContain('Required role: ADMIN')

      // Check that unauthenticated is not authorized
      const unauthResult = results.find(r => r.role === null)
      expect(unauthResult?.isAuthorized).toBe(false)
      expect(unauthResult?.reason).toBe('Not authenticated')
    })

    it('should test custom role guard options', () => {
      const user = createMockUser({ role: UserRole.EDITOR })
      const result = RoleGuardHookTestUtils.renderRoleGuardHook({
        requiredPermissions: [{ resource: 'products', action: 'create' }],
        redirectTo: '/unauthorized',
        redirectOnUnauthorized: true
      }, user)

      expect(result.result.current.isAuthorized).toBe(true)
      expect(result.result.current.user).toEqual(user)

      // Test redirect functionality
      act(() => {
        result.updateUser(createMockUser({ role: UserRole.VIEWER }))
      })

      expect(result.result.current.isAuthorized).toBe(false)
      expect(result.result.current.reason).toContain('Missing required permission')
    })
  })

  describe('useAuditLogger Hook Testing', () => {
    it('should test audit logger scenarios', async () => {
      const logs = await AuditLoggerHookTestUtils.testAuditLoggerScenario('AUTHENTICATION')
      
      expect(logs.length).toBeGreaterThan(0)
      
      // Check that all logs have the expected properties
      logs.forEach(log => {
        expect(log.action).toMatch(/^auth\./)
        expect(log.resource).toBe('user')
        expect(log.userId).toBeDefined()
        expect(log.timestamp).toBeDefined()
      })
    })

    it('should test audit logger with different users', () => {
      const adminUser = createMockUser({ role: UserRole.ADMIN })
      const result = AuditLoggerHookTestUtils.renderAuditLoggerHook({}, adminUser)
      const logger = result.getMockLogger()

      expect(logger.isEnabled).toBe(true)
      expect(logger.user).toEqual(adminUser)

      // Test logging
      act(() => {
        logger.logAuth('login', { method: 'password' })
      })

      expect(logger.logAuth).toHaveBeenCalledWith('login', { method: 'password' })

      // Update to unauthenticated
      act(() => {
        result.updateUser(null)
      })

      expect(logger.isEnabled).toBe(false)
      expect(logger.user).toBeNull()
    })
  })

  describe('Performance Testing', () => {
    it('should measure hook performance', async () => {
      const performance = await PermissionHookTestUtils.measureHookPerformance(
        () => usePermissions(),
        50, // 50 iterations
        UserRole.EDITOR
      )

      expect(performance.average).toBeLessThan(100) // Should be fast
      expect(performance.min).toBeGreaterThan(0)
      expect(performance.max).toBeGreaterThan(performance.min)
      expect(performance.median).toBeGreaterThan(0)
    })
  })

  describe('Comprehensive Test Suites', () => {
    it('should run full permission test suite', async () => {
      const results = await PermissionTestSuiteRunner.runFullPermissionSuite(() => usePermissions())

      expect(results.roleTests.length).toBeGreaterThan(0)
      expect(results.performanceTests).toBeDefined()
      expect(results.performanceTests.average).toBeGreaterThan(0)

      // Check that all role tests passed
      const failedTests = results.roleTests.filter(test => !test.passed)
      if (failedTests.length > 0) {
        console.log('Failed tests:', failedTests)
      }
      expect(failedTests.length).toBe(0)
    })

    it('should run role guard test suite', async () => {
      const results = await PermissionTestSuiteRunner.runRoleGuardSuite()

      expect(results.length).toBe(Object.keys(ROLE_GUARD_SCENARIOS).length)
      
      results.forEach(result => {
        expect(result.scenario).toBeDefined()
        expect(result.description).toBeDefined()
        expect(result.results).toBeDefined()
        expect(Array.isArray(result.results)).toBe(true)
      })
    })

    it('should run audit logger test suite', async () => {
      const results = await PermissionTestSuiteRunner.runAuditLoggerSuite()

      expect(results.length).toBe(Object.keys(AUDIT_LOG_SCENARIOS).length)
      
      results.forEach(result => {
        expect(result.scenario).toBeDefined()
        expect(result.description).toBeDefined()
        expect(result.logCount).toBeGreaterThanOrEqual(0)
        expect(Array.isArray(result.logs)).toBe(true)
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle null user gracefully', () => {
      const result = renderPermissionHook(() => usePermissions(), { user: null })
      const permissions = result.result.current

      PermissionHookAssertions.expectIsNotAuthenticated(permissions)
      PermissionHookAssertions.expectCannotAccess(permissions, 'products', 'read')
      PermissionHookAssertions.expectCannotAccessRoute(permissions, '/admin')
    })

    it('should handle invalid permissions gracefully', () => {
      const result = renderPermissionHook(() => usePermissions(), {
        user: createMockUser({ role: UserRole.EDITOR }),
        customPermissions: {
          'invalid.permission': true,
          'another.invalid': false,
        }
      })

      const permissions = result.result.current

      // Should still work for valid permissions
      PermissionHookAssertions.expectIsEditor(permissions)
      PermissionHookAssertions.expectCanCreateProduct(permissions)
    })

    it('should handle rapid user changes', () => {
      const result = renderPermissionHook(() => usePermissions(), {
        user: createMockUser({ role: UserRole.VIEWER })
      })

      // Rapidly change users
      act(() => {
        result.updateUser(createMockUser({ role: UserRole.EDITOR }))
        result.updateUser(createMockUser({ role: UserRole.ADMIN }))
        result.updateUser(null)
        result.updateUser(createMockUser({ role: UserRole.VIEWER }))
      })

      // Should end up as viewer
      PermissionHookAssertions.expectIsViewer(result.result.current)
      PermissionHookAssertions.expectCannotCreateProduct(result.result.current)
    })
  })

  describe('Integration Testing', () => {
    it('should test multiple hooks together', () => {
      const user = createMockUser({ role: UserRole.ADMIN })
      
      const permissionsResult = renderPermissionHook(() => usePermissions(), { user })
      const roleGuardResult = RoleGuardHookTestUtils.renderRoleGuardHook({
        requiredRole: UserRole.ADMIN
      }, user)
      const auditLoggerResult = AuditLoggerHookTestUtils.renderAuditLoggerHook({}, user)

      // All should recognize the admin user
      PermissionHookAssertions.expectIsAdmin(permissionsResult.result.current)
      expect(roleGuardResult.result.current.isAuthorized).toBe(true)
      expect(auditLoggerResult.result.current.isEnabled).toBe(true)

      // Test interaction
      act(() => {
        auditLoggerResult.result.current.logAuth('admin_action')
      })

      expect(auditLoggerResult.getMockLogger().logAuth).toHaveBeenCalledWith('admin_action')
    })
  })
})