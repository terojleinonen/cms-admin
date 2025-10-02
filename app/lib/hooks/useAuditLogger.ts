'use client'

/**
 * Audit Logger Hook
 * React hook for frontend action logging and audit trail
 */

import { useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { User } from '../types'

export interface AuditLogEntry {
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, unknown>
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

export interface AuditLoggerOptions {
  // Automatic context detection
  autoDetectContext?: boolean
  
  // Default values
  defaultSeverity?: 'low' | 'medium' | 'high' | 'critical'
  defaultResource?: string
  
  // Batching options
  enableBatching?: boolean
  batchSize?: number
  batchTimeout?: number
  
  // Error handling
  onError?: (error: Error, entry: AuditLogEntry) => void
  
  // Success callback
  onSuccess?: (entry: AuditLogEntry) => void
  
  // Debug mode
  debug?: boolean
}

export interface AuditLogger {
  // Basic logging methods
  log: (entry: AuditLogEntry) => Promise<void>
  logSync: (entry: AuditLogEntry) => void
  
  // Convenience methods for common actions
  logAuth: (action: string, details?: Record<string, unknown>) => Promise<void>
  logUser: (action: string, targetUserId?: string, details?: Record<string, unknown>) => Promise<void>
  logSecurity: (action: string, details?: Record<string, unknown>) => Promise<void>
  logSystem: (action: string, details?: Record<string, unknown>) => Promise<void>
  logResource: (action: string, resource: string, resourceId?: string, details?: Record<string, unknown>) => Promise<void>
  
  // Permission logging
  logPermissionCheck: (permission: { resource: string; action: string; scope?: string }, result: boolean, reason?: string) => Promise<void>
  logUnauthorizedAccess: (resource: string, action: string, reason?: string) => Promise<void>
  
  // UI interaction logging
  logButtonClick: (buttonId: string, context?: Record<string, unknown>) => Promise<void>
  logFormSubmit: (formId: string, success: boolean, errors?: Record<string, unknown>) => Promise<void>
  logNavigation: (from: string, to: string, method?: string) => Promise<void>
  logSearch: (query: string, results?: number, filters?: Record<string, unknown>) => Promise<void>
  logExport: (resource: string, format: string, filters?: Record<string, unknown>) => Promise<void>
  logImport: (resource: string, success: boolean, details?: Record<string, unknown>) => Promise<void>
  
  // Batch operations
  flush: () => Promise<void>
  
  // Utility methods
  isEnabled: boolean
  user: User | null
}

/**
 * Get client-side context information
 */
function getClientContext(): Record<string, unknown> {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    return {
      url: window.location?.href || 'unknown',
      pathname: window.location?.pathname || 'unknown',
      userAgent: navigator?.userAgent || 'unknown',
      timestamp: new Date().toISOString(),
      viewport: {
        width: window.innerWidth || 0,
        height: window.innerHeight || 0,
      },
      referrer: (document as any)?.referrer || undefined,
    }
  } catch (error) {
    // Fallback for testing environments
    return {
      url: 'http://localhost:3000/test',
      pathname: '/test',
      userAgent: 'test-agent',
      timestamp: new Date().toISOString(),
      viewport: { width: 1920, height: 1080 },
      referrer: 'http://localhost:3000/previous',
    }
  }
}

/**
 * Main audit logger hook
 */
export function useAuditLogger(options: AuditLoggerOptions = {}): AuditLogger {
  const {
    autoDetectContext = true,
    defaultSeverity = 'low',
    defaultResource = 'system',
    enableBatching = false,
    batchSize = 10,
    batchTimeout = 5000,
    onError,
    onSuccess,
    debug = false,
  } = options

  const { data: session } = useSession()
  const batchRef = useRef<AuditLogEntry[]>([])
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const user = (session?.user as User) || null
  const isEnabled = !!user

  // Send audit log to server
  const sendAuditLog = useCallback(async (entry: AuditLogEntry): Promise<void> => {
    if (!isEnabled) {
      if (debug) {
        console.warn('Audit logging disabled: user not authenticated')
      }
      return
    }

    try {
      const context = autoDetectContext ? getClientContext() : {}
      
      const payload = {
        ...entry,
        details: {
          ...entry.details,
          ...context,
        },
        severity: entry.severity || defaultSeverity,
      }

      if (debug) {
        console.log('Sending audit log:', payload)
      }

      const response = await fetch('/api/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Audit log failed: ${response.status} ${response.statusText}`)
      }

      onSuccess?.(entry)
    } catch (error) {
      const auditError = error instanceof Error ? error : new Error('Unknown audit log error')
      
      if (debug) {
        console.error('Audit log error:', auditError)
      }
      
      onError?.(auditError, entry)
    }
  }, [isEnabled, autoDetectContext, defaultSeverity, debug, onError, onSuccess])

  // Batch processing
  const processBatch = useCallback(async (): Promise<void> => {
    if (batchRef.current.length === 0) return

    const batch = [...batchRef.current]
    batchRef.current = []

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = undefined
    }

    try {
      await Promise.all(batch.map(entry => sendAuditLog(entry)))
    } catch (error) {
      if (debug) {
        console.error('Batch processing error:', error)
      }
    }
  }, [sendAuditLog, debug])

  // Add to batch
  const addToBatch = useCallback((entry: AuditLogEntry): void => {
    batchRef.current.push(entry)

    // Process batch if it reaches the size limit
    if (batchRef.current.length >= batchSize) {
      processBatch()
      return
    }

    // Set timeout for batch processing
    if (!timeoutRef.current) {
      timeoutRef.current = setTimeout(() => {
        processBatch()
      }, batchTimeout)
    }
  }, [batchSize, batchTimeout, processBatch])

  // Main logging method
  const log = useCallback(async (entry: AuditLogEntry): Promise<void> => {
    if (!isEnabled) return

    if (enableBatching) {
      addToBatch(entry)
    } else {
      await sendAuditLog(entry)
    }
  }, [isEnabled, enableBatching, addToBatch, sendAuditLog])

  // Synchronous logging (adds to batch or queues for immediate processing)
  const logSync = useCallback((entry: AuditLogEntry): void => {
    if (!isEnabled) return

    if (enableBatching) {
      addToBatch(entry)
    } else {
      // Queue for next tick to avoid blocking UI
      setTimeout(() => {
        sendAuditLog(entry).catch(error => {
          if (debug) {
            console.error('Async audit log error:', error)
          }
        })
      }, 0)
    }
  }, [isEnabled, enableBatching, addToBatch, sendAuditLog, debug])

  // Convenience methods for common actions
  const logAuth = useCallback(async (action: string, details?: Record<string, unknown>): Promise<void> => {
    await log({
      action: `auth.${action}`,
      resource: 'user',
      resourceId: user?.id,
      details,
      severity: action.includes('failed') || action.includes('denied') ? 'medium' : 'low',
    })
  }, [log, user])

  const logUser = useCallback(async (action: string, targetUserId?: string, details?: Record<string, unknown>): Promise<void> => {
    await log({
      action: `user.${action}`,
      resource: 'user',
      resourceId: targetUserId,
      details,
      severity: ['deleted', 'role_changed', 'deactivated'].includes(action) ? 'high' : 'medium',
    })
  }, [log])

  const logSecurity = useCallback(async (action: string, details?: Record<string, unknown>): Promise<void> => {
    await log({
      action: `security.${action}`,
      resource: 'system',
      details,
      severity: 'high',
    })
  }, [log])

  const logSystem = useCallback(async (action: string, details?: Record<string, unknown>): Promise<void> => {
    await log({
      action: `system.${action}`,
      resource: 'system',
      details,
      severity: 'medium',
    })
  }, [log])

  const logResource = useCallback(async (
    action: string,
    resource: string,
    resourceId?: string,
    details?: Record<string, unknown>
  ): Promise<void> => {
    await log({
      action: `${resource}.${action}`,
      resource,
      resourceId,
      details,
      severity: ['delete', 'bulk_delete'].includes(action) ? 'high' : 'low',
    })
  }, [log])

  // Permission logging
  const logPermissionCheck = useCallback(async (
    permission: { resource: string; action: string; scope?: string },
    result: boolean,
    reason?: string
  ): Promise<void> => {
    await log({
      action: result ? 'permission.granted' : 'permission.denied',
      resource: permission.resource,
      details: {
        permission,
        result,
        reason,
      },
      severity: result ? 'low' : 'medium',
    })
  }, [log])

  const logUnauthorizedAccess = useCallback(async (
    resource: string,
    action: string,
    reason?: string
  ): Promise<void> => {
    await log({
      action: 'security.unauthorized_access',
      resource,
      details: {
        attemptedAction: action,
        reason,
      },
      severity: 'high',
    })
  }, [log])

  // UI interaction logging
  const logButtonClick = useCallback(async (
    buttonId: string,
    context?: Record<string, unknown>
  ): Promise<void> => {
    await log({
      action: 'ui.button_click',
      resource: 'ui',
      resourceId: buttonId,
      details: context,
      severity: 'low',
    })
  }, [log])

  const logFormSubmit = useCallback(async (
    formId: string,
    success: boolean,
    errors?: Record<string, unknown>
  ): Promise<void> => {
    await log({
      action: success ? 'ui.form_submit_success' : 'ui.form_submit_error',
      resource: 'ui',
      resourceId: formId,
      details: {
        success,
        errors,
      },
      severity: success ? 'low' : 'medium',
    })
  }, [log])

  const logNavigation = useCallback(async (
    from: string,
    to: string,
    method?: string
  ): Promise<void> => {
    await log({
      action: 'ui.navigation',
      resource: 'ui',
      details: {
        from,
        to,
        method: method || 'unknown',
      },
      severity: 'low',
    })
  }, [log])

  const logSearch = useCallback(async (
    query: string,
    results?: number,
    filters?: Record<string, unknown>
  ): Promise<void> => {
    await log({
      action: 'ui.search',
      resource: 'search',
      details: {
        query,
        results,
        filters,
      },
      severity: 'low',
    })
  }, [log])

  const logExport = useCallback(async (
    resource: string,
    format: string,
    filters?: Record<string, unknown>
  ): Promise<void> => {
    await log({
      action: 'data.export',
      resource,
      details: {
        format,
        filters,
      },
      severity: 'medium',
    })
  }, [log])

  const logImport = useCallback(async (
    resource: string,
    success: boolean,
    details?: Record<string, unknown>
  ): Promise<void> => {
    await log({
      action: success ? 'data.import_success' : 'data.import_error',
      resource,
      details,
      severity: success ? 'medium' : 'high',
    })
  }, [log])

  // Flush batch
  const flush = useCallback(async (): Promise<void> => {
    if (enableBatching) {
      await processBatch()
    }
  }, [enableBatching, processBatch])

  return {
    // Basic logging methods
    log,
    logSync,
    
    // Convenience methods
    logAuth,
    logUser,
    logSecurity,
    logSystem,
    logResource,
    
    // Permission logging
    logPermissionCheck,
    logUnauthorizedAccess,
    
    // UI interaction logging
    logButtonClick,
    logFormSubmit,
    logNavigation,
    logSearch,
    logExport,
    logImport,
    
    // Batch operations
    flush,
    
    // Utility properties
    isEnabled,
    user,
  }
}

/**
 * Specialized audit logger hooks for specific use cases
 */

// Security-focused audit logger
export function useSecurityAuditLogger(options: AuditLoggerOptions = {}): AuditLogger {
  return useAuditLogger({
    ...options,
    defaultSeverity: 'high',
    defaultResource: 'security',
    autoDetectContext: true,
  })
}

// User action audit logger
export function useUserAuditLogger(options: AuditLoggerOptions = {}): AuditLogger {
  return useAuditLogger({
    ...options,
    defaultSeverity: 'medium',
    defaultResource: 'user',
    enableBatching: true,
  })
}

// System audit logger
export function useSystemAuditLogger(options: AuditLoggerOptions = {}): AuditLogger {
  return useAuditLogger({
    ...options,
    defaultSeverity: 'medium',
    defaultResource: 'system',
    enableBatching: true,
  })
}

// UI interaction audit logger
export function useUIAuditLogger(options: AuditLoggerOptions = {}): AuditLogger {
  return useAuditLogger({
    ...options,
    defaultSeverity: 'low',
    defaultResource: 'ui',
    enableBatching: true,
    batchSize: 20,
    batchTimeout: 10000,
  })
}