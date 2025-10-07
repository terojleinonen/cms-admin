/**
 * Audit Logger Hook
 * Provides easy audit logging functionality for frontend components
 */

import { useSession } from 'next-auth/react'
import { useCallback } from 'react'

export interface AuditLogEntry {
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, unknown>
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

export interface UseAuditLoggerReturn {
  isEnabled: boolean
  user: any | null
  log: (entry: AuditLogEntry) => Promise<void>
  logAction: (entry: AuditLogEntry) => Promise<void>
  logAuth: (action: string, details?: Record<string, unknown>) => Promise<void>
  logUser: (action: string, targetUserId: string, details?: Record<string, unknown>) => Promise<void>
  logSecurity: (action: string, details?: Record<string, unknown>) => Promise<void>
  logSystem: (action: string, details?: Record<string, unknown>) => Promise<void>
  logResourceAccess: (
    action: string,
    resource: string,
    resourceId?: string,
    success?: boolean,
    errorMessage?: string,
    details?: Record<string, unknown>
  ) => Promise<void>
  logPermissionCheck: (
    permission: { resource: string; action: string; scope?: string },
    result: boolean,
    reason?: string,
    context?: Record<string, unknown>
  ) => Promise<void>
}

export function useAuditLogger(): UseAuditLoggerReturn {
  const { data: session } = useSession()

  const isEnabled = !!session?.user?.id
  const user = session?.user || null

  const log = useCallback(async (entry: AuditLogEntry): Promise<void> => {
    if (!session?.user?.id) {
      console.warn('Cannot log audit entry: user not authenticated')
      return
    }

    try {
      const response = await fetch('/api/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to log audit entry')
      }
    } catch (error) {
      console.error('Failed to log audit entry:', error)
      // Don't throw error to avoid breaking user experience
    }
  }, [session])

  const logAction = log

  const logAuth = useCallback(async (
    action: string,
    details?: Record<string, unknown>
  ): Promise<void> => {
    await log({
      action: `auth.${action}`,
      resource: 'user',
      resourceId: session?.user?.id,
      details,
      severity: action.includes('failed') || action.includes('denied') ? 'medium' : 'low',
    })
  }, [log, session])

  const logUser = useCallback(async (
    action: string,
    targetUserId: string,
    details?: Record<string, unknown>
  ): Promise<void> => {
    await log({
      action: `user.${action}`,
      resource: 'user',
      resourceId: targetUserId,
      details,
      severity: ['deleted', 'role_changed', 'deactivated'].includes(action) ? 'high' : 'medium',
    })
  }, [log])

  const logSecurity = useCallback(async (
    action: string,
    details?: Record<string, unknown>
  ): Promise<void> => {
    await log({
      action: `security.${action}`,
      resource: 'system',
      details,
      severity: ['suspicious_activity', 'account_locked', 'unauthorized_access'].includes(action) ? 'critical' : 'high',
    })
  }, [log])

  const logSystem = useCallback(async (
    action: string,
    details?: Record<string, unknown>
  ): Promise<void> => {
    await log({
      action: `system.${action}`,
      resource: 'system',
      details,
      severity: 'medium',
    })
  }, [log])

  const logResourceAccess = useCallback(async (
    action: string,
    resource: string,
    resourceId?: string,
    success: boolean = true,
    errorMessage?: string,
    details?: Record<string, unknown>
  ): Promise<void> => {
    await log({
      action: `resource.${action}`,
      resource,
      resourceId,
      details: {
        success,
        errorMessage,
        ...details,
      },
      severity: success ? 'low' : 'high',
    })
  }, [log])

  const logPermissionCheck = useCallback(async (
    permission: { resource: string; action: string; scope?: string },
    result: boolean,
    reason?: string,
    context?: Record<string, unknown>
  ): Promise<void> => {
    await log({
      action: result ? 'security.permission_check_granted' : 'security.permission_check_denied',
      resource: permission.resource,
      details: {
        permission,
        result,
        reason,
        context,
      },
      severity: result ? 'low' : 'medium',
    })
  }, [log])

  return {
    isEnabled,
    user,
    log,
    logAction,
    logAuth,
    logUser,
    logSecurity,
    logSystem,
    logResourceAccess,
    logPermissionCheck,
  }
}

// Convenience hooks for specific audit categories
export function useAuthAuditLogger() {
  const { logAuth } = useAuditLogger()
  
  return {
    logLogin: (success: boolean, details?: Record<string, unknown>) =>
      logAuth(success ? 'login' : 'login_failed', details),
    logLogout: (details?: Record<string, unknown>) =>
      logAuth('logout', details),
    logPasswordChange: (details?: Record<string, unknown>) =>
      logAuth('password_changed', details),
    logTwoFactorEnabled: (details?: Record<string, unknown>) =>
      logAuth('two_factor_enabled', details),
    logTwoFactorDisabled: (details?: Record<string, unknown>) =>
      logAuth('two_factor_disabled', details),
    logSessionTerminated: (details?: Record<string, unknown>) =>
      logAuth('session_terminated', details),
  }
}

export function useUserAuditLogger() {
  const { logUser } = useAuditLogger()
  
  return {
    logUserCreated: (userId: string, details?: Record<string, unknown>) =>
      logUser('created', userId, details),
    logUserUpdated: (userId: string, details?: Record<string, unknown>) =>
      logUser('updated', userId, details),
    logUserDeleted: (userId: string, details?: Record<string, unknown>) =>
      logUser('deleted', userId, details),
    logUserActivated: (userId: string, details?: Record<string, unknown>) =>
      logUser('activated', userId, details),
    logUserDeactivated: (userId: string, details?: Record<string, unknown>) =>
      logUser('deactivated', userId, details),
    logRoleChanged: (userId: string, oldRole: string, newRole: string, reason?: string) =>
      logUser('role_changed', userId, { oldRole, newRole, reason }),
    logProfileUpdated: (userId: string, details?: Record<string, unknown>) =>
      logUser('profile_updated', userId, details),
  }
}

export function useSecurityAuditLogger() {
  const { logSecurity } = useAuditLogger()
  
  return {
    logSuspiciousActivity: (details?: Record<string, unknown>) =>
      logSecurity('suspicious_activity', details),
    logAccountLocked: (details?: Record<string, unknown>) =>
      logSecurity('account_locked', details),
    logAccountUnlocked: (details?: Record<string, unknown>) =>
      logSecurity('account_unlocked', details),
    logPermissionDenied: (permission: string, resource: string, details?: Record<string, unknown>) =>
      logSecurity('permission_denied', { permission, resource, ...details }),
    logUnauthorizedAccess: (resource: string, action: string, details?: Record<string, unknown>) =>
      logSecurity('unauthorized_access', { resource, action, ...details }),
    logRoleEscalation: (details?: Record<string, unknown>) =>
      logSecurity('role_escalation', details),
    logDataExport: (details?: Record<string, unknown>) =>
      logSecurity('data_export', details),
    logBulkOperation: (operation: string, count: number, details?: Record<string, unknown>) =>
      logSecurity('bulk_operation', { operation, count, ...details }),
  }
}

export function useSystemAuditLogger() {
  const { logSystem } = useAuditLogger()
  
  return {
    logBackupCreated: (details?: Record<string, unknown>) =>
      logSystem('backup_created', details),
    logBackupRestored: (details?: Record<string, unknown>) =>
      logSystem('backup_restored', details),
    logSettingsChanged: (setting: string, oldValue: unknown, newValue: unknown, details?: Record<string, unknown>) =>
      logSystem('settings_changed', { setting, oldValue, newValue, ...details }),
    logMaintenanceMode: (enabled: boolean, details?: Record<string, unknown>) =>
      logSystem('maintenance_mode', { enabled, ...details }),
    logDataCleanup: (details?: Record<string, unknown>) =>
      logSystem('data_cleanup_performed', details),
  }
}