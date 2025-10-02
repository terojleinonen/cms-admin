/**
 * Permission and Audit Hooks
 * Centralized exports for all permission and audit-related hooks
 */

// Permission hooks
export {
  usePermissions,
  type PermissionHook,
} from './usePermissions'

// Role guard hooks
export {
  useRoleGuard,
  useAdminGuard,
  useEditorGuard,
  useViewerGuard,
  usePermissionGuard,
  useProductGuard,
  useCategoryGuard,
  usePageGuard,
  useMediaGuard,
  useUserGuard,
  useAnalyticsGuard,
  useSecurityGuard,
  useSettingsGuard,
  type RoleGuardOptions,
  type RoleGuardResult,
} from './useRoleGuard'

// Audit logger hooks
export {
  useAuditLogger,
  useSecurityAuditLogger,
  useUserAuditLogger,
  useSystemAuditLogger,
  useUIAuditLogger,
  type AuditLogEntry,
  type AuditLoggerOptions,
  type AuditLogger,
} from './useAuditLogger'

// Existing hooks
export {
  usePreferences,
} from './usePreferences'