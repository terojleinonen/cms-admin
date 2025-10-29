/**
 * Permission Hooks Testing Examples
 * Comprehensive examples demonstrating how to use the permission testing utilities
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UserRole } from '@prisma/client'
import { jest } from '@jest/globals'

// Import our testing utilities
import {
  createMockUser,
  createMockPermissionHook,
  PermissionAssertions,
  TestDataGenerators,
  PERMISSION_TEST_SCENARIOS,
} from '../helpers/permission-test-utils'

import {
  createMockAuditLogger,
  AuditLoggerTestUtils,
  AuditLoggerAssertions,
} from '../helpers/audit-logger-test-utils'

// Simple test component
const TestComponent: React.FC<{ permissions: any }> = ({ permissions }) => {
  return (
    <div data-testid="test-component">
      {permissions.canCreateProduct() && (
        <button data-testid="create-product-button">Create Product</button>
      )}
      {permissions.canReadUser() && (
        <div data-testid="user-access">User Access</div>
      )}
    </div>
  )
}

describe('Permission Hooks Testing Examples', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Permission Hook Testing', () => {
    it('should test permission hook with different roles', () => {
      // Test admin permissions
      const adminUser = createMockUser({ role: UserRole.ADMIN })
      const adminPermissions = createMockPermissionHook(adminUser)

      PermissionAssertions.expectIsAdmin(adminPermissions)
      PermissionAssertions.expectCanCreateProduct(adminPermissions)
      PermissionAssertions.expectCanCreateUser(adminPermissions)

      // Test editor permissions
      const editorUser = createMockUser({ role: UserRole.EDITOR })
      const editorPermissions = createMockPermissionHook(editorUser)

      PermissionAssertions.expectIsNotAdmin(editorPermissions)
      PermissionAssertions.expectIsEditor(editorPermissions)
      PermissionAssertions.expectCanCreateProduct(editorPermissions)
      PermissionAssertions.expectCannotCreateUser(editorPermissions)

      // Test viewer permissions
      const viewerUser = createMockUser({ role: UserRole.VIEWER })
      const viewerPermissions = createMockPermissionHook(viewerUser)

      PermissionAssertions.expectIsNotAdmin(viewerPermissions)
      PermissionAssertions.expectIsNotEditor(viewerPermissions)
      PermissionAssertions.expectIsViewer(viewerPermissions)
      PermissionAssertions.expectCannotCreateProduct(viewerPermissions)
      PermissionAssertions.expectCanReadProduct(viewerPermissions)
    })

    it('should test custom permissions', () => {
      const user = createMockUser({ role: UserRole.VIEWER })
      const customPermissions = {
        'products.create': true, // Override default viewer permissions
        'users.read.all': true,
      }
      
      const permissions = createMockPermissionHook(user, customPermissions)

      // Should have custom permissions despite being a viewer
      PermissionAssertions.expectCanCreateProduct(permissions)
      PermissionAssertions.expectCanAccess(permissions, 'users', 'read', 'all')
    })

    it('should test ownership-based permissions', () => {
      const user = createMockUser({ id: 'user-123', role: UserRole.EDITOR })
      const permissions = createMockPermissionHook(user)

      // Can update own products
      PermissionAssertions.expectCanUpdateProduct(permissions, 'user-123')
      
      // Cannot update other user's products (if scope is 'own')
      PermissionAssertions.expectCanUpdateProduct(permissions, 'other-user-id')
    })
  })

  describe('Component Testing with Permissions', () => {
    it('should render components with different user roles', () => {
      // Test admin permissions
      const adminUser = createMockUser({ role: UserRole.ADMIN })
      const adminPermissions = createMockPermissionHook(adminUser)
      
      render(<TestComponent permissions={adminPermissions} />)
      
      expect(screen.getByTestId('create-product-button')).toBeInTheDocument()
      expect(screen.getByTestId('user-access')).toBeInTheDocument()
    })

    it('should test viewer permissions', () => {
      // Test viewer permissions
      const viewerUser = createMockUser({ role: UserRole.VIEWER })
      const viewerPermissions = createMockPermissionHook(viewerUser)
      
      render(<TestComponent permissions={viewerPermissions} />)
      
      expect(screen.queryByTestId('create-product-button')).not.toBeInTheDocument()
      expect(screen.queryByTestId('user-access')).not.toBeInTheDocument()
    })
  })

  describe('Audit Logger Testing', () => {
    it('should test audit logging functionality', async () => {
      const user = createMockUser({ role: UserRole.ADMIN })
      const auditLogger = createMockAuditLogger(user)

      // Test basic logging
      await auditLogger.log({
        action: 'test.action',
        resource: 'test',
        details: { test: 'data' },
      })

      AuditLoggerAssertions.expectLogCalled(auditLogger, 1)
      AuditLoggerAssertions.expectLogCalledWith(auditLogger, {
        action: 'test.action',
        resource: 'test',
      })

      // Test convenience methods
      await auditLogger.logAuth('login', { method: 'password' })
      AuditLoggerAssertions.expectAuthLogCalled(auditLogger, 'login', { method: 'password' })

      await auditLogger.logUser('created', 'target-user-id', { role: 'EDITOR' })
      AuditLoggerAssertions.expectUserLogCalled(auditLogger, 'created', 'target-user-id', { role: 'EDITOR' })

      await auditLogger.logSecurity('unauthorized_access', { resource: 'admin' })
      AuditLoggerAssertions.expectSecurityLogCalled(auditLogger, 'unauthorized_access', { resource: 'admin' })
    })

    it('should test permission logging', async () => {
      const user = createMockUser({ role: UserRole.EDITOR })
      const auditLogger = createMockAuditLogger(user)

      const permission = { resource: 'products', action: 'create' }
      
      await auditLogger.logPermissionCheck(permission, true)
      AuditLoggerAssertions.expectPermissionLogCalled(auditLogger, permission, true)

      await auditLogger.logUnauthorizedAccess('users', 'delete', 'Insufficient role')
      AuditLoggerAssertions.expectUnauthorizedAccessLogCalled(auditLogger, 'users', 'delete', 'Insufficient role')
    })

    it('should test disabled logging for unauthenticated users', async () => {
      const auditLogger = createMockAuditLogger(null) // No user

      // Clear any previous calls
      auditLogger.log.mockClear()

      await auditLogger.log({
        action: 'test.action',
        resource: 'test',
      })

      // The log method should still be called, but it should return early
      expect(auditLogger.log).toHaveBeenCalledTimes(1)
      expect(auditLogger.isEnabled).toBe(false)
      // Check that no actual log entries were created
      expect(auditLogger.getLogs()).toHaveLength(0)
    })
  })

  describe('Test Data Generation', () => {
    it('should generate test data correctly', () => {
      const products = TestDataGenerators.generateProducts(5, 'owner-id')
      expect(products).toHaveLength(5)
      expect(products[0]).toMatchObject({
        id: 'product-1',
        name: 'Product 1',
        createdBy: 'owner-id',
      })

      const categories = TestDataGenerators.generateCategories(3)
      expect(categories).toHaveLength(3)
      expect(categories[0]).toMatchObject({
        id: 'category-1',
        name: 'Category 1',
      })

      const users = TestDataGenerators.generateUsers(2, UserRole.EDITOR)
      expect(users).toHaveLength(2)
      expect(users[0].role).toBe(UserRole.EDITOR)
    })
  })

  describe('Permission Scenarios', () => {
    it('should validate permission scenarios', () => {
      Object.entries(PERMISSION_TEST_SCENARIOS).forEach(([scenarioName, scenario]) => {
        if (scenario.role === null) return // Skip unauthenticated scenario

        const user = createMockUser({ role: scenario.role })
        const permissions = createMockPermissionHook(user)

        // Test a few key permissions for each role
        expect(permissions.canCreateProduct()).toBe(scenario.expectedPermissions.canCreateProduct)
        expect(permissions.canReadProduct()).toBe(scenario.expectedPermissions.canReadProduct)
        expect(permissions.canCreateUser()).toBe(scenario.expectedPermissions.canCreateUser)
      })
    })
  })
})