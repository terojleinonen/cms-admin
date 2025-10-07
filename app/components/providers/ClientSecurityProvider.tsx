'use client'

/**
 * Client Security Provider
 * Provides client-side security context and monitoring
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useCSRFToken, useSecurityMonitor, useCSPMonitor, useBehaviorMonitor } from '../../lib/hooks/useClientSecurity'

interface SecurityViolation {
  type: string
  timestamp: number
  details: any
}

interface CSPViolation {
  blockedURI: string
  violatedDirective: string
  timestamp: number
}

interface ClientSecurityContextType {
  // CSRF Token
  csrfToken: string | null
  csrfLoading: boolean
  csrfError: string | null
  refreshCSRFToken: () => Promise<void>
  clearCSRFToken: () => void

  // Security Monitoring
  securityViolations: SecurityViolation[]
  reportSecurityViolation: (type: string, details: any) => void
  clearSecurityViolations: () => void
  getViolationCount: (type?: string) => number

  // CSP Monitoring
  cspViolations: CSPViolation[]
  clearCSPViolations: () => void

  // Behavior Monitoring
  suspiciousActivity: number
  isSuspicious: boolean
  recordActivity: (activityType: string) => void
  resetSuspiciousActivity: () => void

  // Security Status
  securityStatus: 'secure' | 'warning' | 'danger'
  securityScore: number
}

const ClientSecurityContext = createContext<ClientSecurityContextType | null>(null)

interface ClientSecurityProviderProps {
  children: React.ReactNode
  onSecurityViolation?: (violation: SecurityViolation) => void
  onCSPViolation?: (violation: CSPViolation) => void
  onSuspiciousActivity?: (activityCount: number) => void
}

export function ClientSecurityProvider({
  children,
  onSecurityViolation,
  onCSPViolation,
  onSuspiciousActivity
}: ClientSecurityProviderProps) {
  // CSRF Token management
  const {
    token: csrfToken,
    loading: csrfLoading,
    error: csrfError,
    refreshToken: refreshCSRFToken,
    clearToken: clearCSRFToken
  } = useCSRFToken()

  // Security monitoring
  const {
    violations: securityViolations,
    reportViolation: reportSecurityViolation,
    clearViolations: clearSecurityViolations,
    getViolationCount
  } = useSecurityMonitor()

  // CSP monitoring
  const {
    violations: cspViolations,
    clearViolations: clearCSPViolations
  } = useCSPMonitor()

  // Behavior monitoring
  const {
    suspiciousActivity,
    isSuspicious,
    recordActivity,
    resetSuspiciousActivity
  } = useBehaviorMonitor()

  // Security status calculation
  const [securityStatus, setSecurityStatus] = useState<'secure' | 'warning' | 'danger'>('secure')
  const [securityScore, setSecurityScore] = useState(100)

  // Calculate security status and score
  useEffect(() => {
    let score = 100
    let status: 'secure' | 'warning' | 'danger' = 'secure'

    // Deduct points for violations
    const recentViolations = securityViolations.filter(v => 
      Date.now() - v.timestamp < 300000 // Last 5 minutes
    )
    score -= recentViolations.length * 5

    // Deduct points for CSP violations
    const recentCSPViolations = cspViolations.filter(v => 
      Date.now() - v.timestamp < 300000 // Last 5 minutes
    )
    score -= recentCSPViolations.length * 10

    // Deduct points for suspicious activity
    if (isSuspicious) {
      score -= suspiciousActivity * 15
    }

    // Deduct points for CSRF issues
    if (csrfError) {
      score -= 20
    }

    // Determine status based on score
    if (score >= 80) {
      status = 'secure'
    } else if (score >= 60) {
      status = 'warning'
    } else {
      status = 'danger'
    }

    setSecurityScore(Math.max(0, score))
    setSecurityStatus(status)
  }, [securityViolations, cspViolations, suspiciousActivity, isSuspicious, csrfError])

  // Enhanced violation reporting with callbacks
  const enhancedReportSecurityViolation = useCallback((type: string, details: any) => {
    const violation = { type, timestamp: Date.now(), details }
    reportSecurityViolation(type, details)
    onSecurityViolation?.(violation)
  }, [reportSecurityViolation, onSecurityViolation])

  // Monitor CSP violations with callbacks
  useEffect(() => {
    if (cspViolations.length > 0) {
      const latestViolation = cspViolations[cspViolations.length - 1]
      onCSPViolation?.(latestViolation)
    }
  }, [cspViolations, onCSPViolation])

  // Monitor suspicious activity with callbacks
  useEffect(() => {
    if (isSuspicious) {
      onSuspiciousActivity?.(suspiciousActivity)
    }
  }, [isSuspicious, suspiciousActivity, onSuspiciousActivity])

  // Setup global error handlers
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      enhancedReportSecurityViolation('unhandled_promise_rejection', {
        reason: event.reason,
        stack: event.reason?.stack
      })
    }

    const handleError = (event: ErrorEvent) => {
      enhancedReportSecurityViolation('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      })
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [enhancedReportSecurityViolation])

  // Setup security headers monitoring
  useEffect(() => {
    const checkSecurityHeaders = async () => {
      try {
        const response = await fetch(window.location.href, { method: 'HEAD' })
        
        const requiredHeaders = [
          'x-frame-options',
          'x-content-type-options',
          'x-xss-protection',
          'content-security-policy',
          'referrer-policy'
        ]

        const missingHeaders = requiredHeaders.filter(header => 
          !response.headers.get(header)
        )

        if (missingHeaders.length > 0) {
          enhancedReportSecurityViolation('missing_security_headers', {
            missingHeaders
          })
        }
      } catch (error) {
        // Ignore errors in security header check
      }
    }

    // Check security headers on mount
    checkSecurityHeaders()
  }, [enhancedReportSecurityViolation])

  // Context value
  const contextValue: ClientSecurityContextType = {
    // CSRF Token
    csrfToken,
    csrfLoading,
    csrfError,
    refreshCSRFToken,
    clearCSRFToken,

    // Security Monitoring
    securityViolations,
    reportSecurityViolation: enhancedReportSecurityViolation,
    clearSecurityViolations,
    getViolationCount,

    // CSP Monitoring
    cspViolations,
    clearCSPViolations,

    // Behavior Monitoring
    suspiciousActivity,
    isSuspicious,
    recordActivity,
    resetSuspiciousActivity,

    // Security Status
    securityStatus,
    securityScore
  }

  return (
    <ClientSecurityContext.Provider value={contextValue}>
      {children}
      
      {/* Security Status Indicator (for development) */}
      {process.env.NODE_ENV === 'development' && (
        <SecurityStatusIndicator 
          status={securityStatus}
          score={securityScore}
          violations={securityViolations.length}
          cspViolations={cspViolations.length}
        />
      )}
    </ClientSecurityContext.Provider>
  )
}

// Hook to use client security context
export function useClientSecurity() {
  const context = useContext(ClientSecurityContext)
  if (!context) {
    throw new Error('useClientSecurity must be used within a ClientSecurityProvider')
  }
  return context
}

// Security status indicator component (for development)
function SecurityStatusIndicator({
  status,
  score,
  violations,
  cspViolations
}: {
  status: 'secure' | 'warning' | 'danger'
  score: number
  violations: number
  cspViolations: number
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const statusColors = {
    secure: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500'
  }

  const statusIcons = {
    secure: '🔒',
    warning: '⚠️',
    danger: '🚨'
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`${statusColors[status]} text-white p-2 rounded-lg cursor-pointer shadow-lg`}
        onClick={() => setIsExpanded(!isExpanded)}
        title={`Security Status: ${status.toUpperCase()} (Score: ${score})`}
      >
        <div className="flex items-center space-x-2">
          <span>{statusIcons[status]}</span>
          <span className="text-sm font-medium">Security: {score}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="absolute bottom-12 right-0 bg-white border border-gray-300 rounded-lg shadow-lg p-4 min-w-64">
          <div className="space-y-2 text-sm">
            <div className="font-semibold">Security Status</div>
            <div>Status: <span className={`font-medium ${
              status === 'secure' ? 'text-green-600' : 
              status === 'warning' ? 'text-yellow-600' : 'text-red-600'
            }`}>{status.toUpperCase()}</span></div>
            <div>Score: {score}/100</div>
            <div>Security Violations: {violations}</div>
            <div>CSP Violations: {cspViolations}</div>
            <button
              onClick={() => setIsExpanded(false)}
              className="mt-2 text-xs text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}