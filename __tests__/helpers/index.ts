/**
 * Permission Testing Utilities Index
 * Central export for all permission-related testing utilities
 */

// Core permission testing utilities
export * from './permission-test-utils'
export { default as PermissionTestUtils } from './permission-test-utils'

// Role guard testing utilities
export * from './role-guard-test-utils'
export { default as RoleGuardTestUtils } from './role-guard-test-utils'

// Audit logger testing utilities
export * from './audit-logger-test-utils'
export { default as AuditLoggerTestUtils } from './audit-logger-test-utils'

// Existing utilities
export * from './component-helpers'
export * from './test-helpers'

// Re-export commonly used testing functions
export {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  renderHook,
} from '@testing-library/react'

export {
  jest,
} from '@jest/globals'

// Convenience exports for quick access
export {
  createMockUser,
  createMockSession,
  createMockPermissionHook,
  renderWithPermissions,
  RoleTestUtils,
  PermissionAssertions,
  PERMISSION_TEST_SCENARIOS,
} from './permission-test-utils'

export {
  createMockRoleGuard,
  renderRoleGuard,
  RoleGuardTestUtils as RoleGuardUtils,
  RoleGuardAssertions,
  runRoleGuardScenario,
  ROLE_GUARD_SCENARIOS,
} from './role-guard-test-utils'

export {
  createMockAuditLogger,
  AuditLoggerTestUtils as AuditLoggerUtils,
  AuditLoggerAssertions,
  AUDIT_LOG_SCENARIOS,
} from './audit-logger-test-utils'