import { NextResponse, NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { applyUserPreferences } from './app/lib/preferences-middleware'
import { routePermissionResolver } from './app/lib/route-permissions'
import { rateLimit, rateLimitConfigs, createRateLimitHeaders } from './app/lib/rate-limit'

// Security monitoring state
const securityState = {
  suspiciousIPs: new Map<string, { count: number; lastSeen: Date; violations: string[] }>(),
  blockedIPs: new Set<string>(),
  failedAttempts: new Map<string, { count: number; lastAttempt: Date }>(),
  rateLimitViolations: new Map<string, { count: number; lastViolation: Date }>(),
}

/**
 * Check if user has required permissions for a route
 */
function hasRoutePermissions(
  userRole: string | null,
  userId: string | null,
  requiredPermissions: { resource: string; action: string; scope?: string }[]
): boolean {
  if (!userRole || !userId) return false

  // Import permission validation logic
  const ROLE_PERMISSIONS: Record<string, { resource: string; action: string; scope?: string }[]> = {
    ADMIN: [
      { resource: '*', action: 'manage', scope: 'all' },
    ],
    EDITOR: [
      { resource: 'products', action: 'manage', scope: 'all' },
      { resource: 'categories', action: 'manage', scope: 'all' },
      { resource: 'pages', action: 'manage', scope: 'all' },
      { resource: 'media', action: 'manage', scope: 'all' },
      { resource: 'orders', action: 'read', scope: 'all' },
      { resource: 'profile', action: 'manage', scope: 'own' },
      { resource: 'workflow', action: 'read', scope: 'all' },
      { resource: 'search', action: 'read', scope: 'all' },
      { resource: 'notifications', action: 'read', scope: 'own' },
    ],
    VIEWER: [
      { resource: 'products', action: 'read', scope: 'all' },
      { resource: 'categories', action: 'read', scope: 'all' },
      { resource: 'pages', action: 'read', scope: 'all' },
      { resource: 'media', action: 'read', scope: 'all' },
      { resource: 'orders', action: 'read', scope: 'all' },
      { resource: 'profile', action: 'manage', scope: 'own' },
      { resource: 'search', action: 'read', scope: 'all' },
      { resource: 'notifications', action: 'read', scope: 'own' },
    ]
  }

  const userPermissions = ROLE_PERMISSIONS[userRole] || []

  return requiredPermissions.some(required => {
    return userPermissions.some(userPerm => {
      // Check for wildcard permissions (admin)
      if (userPerm.resource === '*' && userPerm.action === 'manage') {
        return true
      }
      
      // Check resource match
      if (userPerm.resource !== required.resource) {
        return false
      }
      
      // Check action match (manage includes all actions)
      if (userPerm.action === 'manage' || userPerm.action === required.action) {
        // Check scope match
        if (!required.scope) return true
        if (userPerm.scope === 'all') return true
        if (userPerm.scope === 'own' && required.scope === 'own') return true
        return userPerm.scope === required.scope
      }
      
      return false
    })
  })
}

/**
 * Get required permissions for a route using the comprehensive route resolver
 */
function getRoutePermissions(pathname: string, method?: string): { resource: string; action: string; scope?: string }[] {
  return routePermissionResolver.getRoutePermissions(pathname, method)
}

/**
 * Check if route is public (no authentication required)
 */
function isPublicRoute(pathname: string): boolean {
  return routePermissionResolver.isPublicRoute(pathname)
}

/**
 * Check if route only requires authentication (no specific permissions)
 */
function isAuthenticatedRoute(pathname: string): boolean {
  return routePermissionResolver.requiresAuthOnly(pathname)
}

/**
 * Enhanced security logging with threat detection and monitoring integration
 */
async function logSecurityEvent(
  token: any,
  pathname: string,
  result: 'SUCCESS' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'RATE_LIMITED' | 'BLOCKED',
  reason?: string,
  ipAddress?: string,
  userAgent?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const logData = {
      userId: token?.id || 'anonymous',
      userRole: token?.role || 'none',
      pathname,
      result,
      reason,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString(),
      requestId: metadata?.requestId,
      method: metadata?.method,
      ...metadata,
    }

    // Enhanced console logging with severity levels
    const severity = getSeverityLevel(result, reason)
    const logPrefix = '[SECURITY_' + severity.toUpperCase() + ']'
    
    if (severity === 'critical' || severity === 'high') {
      console.error(logPrefix + ' ' + result + ':', JSON.stringify(logData, null, 2))
    } else if (severity === 'medium') {
      console.warn(logPrefix + ' ' + result + ':', JSON.stringify(logData, null, 2))
    } else {
      console.log(logPrefix + ' ' + result + ':', JSON.stringify(logData, null, 2))
    }

    // Update security monitoring state
    updateSecurityState(result, ipAddress, token?.id, reason)

    // Detect and handle security threats
    await detectSecurityThreats(logData)

    // Log to security monitoring system
    await logToSecurityMonitoring(logData, result, severity)

  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}

/**
 * Log security events to the monitoring system
 */
async function logToSecurityMonitoring(
  logData: any,
  result: string,
  severity: string
): Promise<void> {
  try {
    // Determine security event type based on result and context
    let eventType: string;
    let eventSeverity: string;

    switch (result) {
      case 'UNAUTHORIZED':
        eventType = 'UNAUTHORIZED_ACCESS';
        eventSeverity = 'HIGH';
        break;
      case 'FORBIDDEN':
        eventType = 'PERMISSION_DENIED';
        eventSeverity = 'MEDIUM';
        break;
      case 'RATE_LIMITED':
        eventType = 'RAPID_REQUESTS';
        eventSeverity = 'MEDIUM';
        break;
      case 'BLOCKED':
        eventType = 'SUSPICIOUS_ACTIVITY';
        eventSeverity = 'HIGH';
        break;
      default:
        return; // Don't log successful requests to security monitoring
    }

    // Create security event data
    const securityEventData = {
      type: eventType,
      severity: eventSeverity,
      userId: logData.userId !== 'anonymous' ? logData.userId : undefined,
      resource: extractResourceFromPath(logData.pathname),
      action: logData.method || 'GET',
      ipAddress: logData.ipAddress,
      userAgent: logData.userAgent,
      details: {
        pathname: logData.pathname,
        reason: logData.reason,
        userRole: logData.userRole,
        timestamp: logData.timestamp,
        requestId: logData.requestId
      },
      metadata: {
        requestId: logData.requestId,
        timestamp: new Date(logData.timestamp)
      }
    };

    // In a real implementation, this would call the security monitoring service
    // For now, we'll just log it with a special marker for the security system
    console.log('[SECURITY_MONITORING]', JSON.stringify(securityEventData, null, 2));

    // TODO: Integrate with actual SecurityMonitoringService
    // const securityService = getSecurityMonitoringService();
    // await securityService.logSecurityEvent(securityEventData);

  } catch (error) {
    console.error('Failed to log to security monitoring:', error);
  }
}

/**
 * Extract resource name from pathname for security monitoring
 */
function extractResourceFromPath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length === 0) return 'root';
  
  // Handle API routes
  if (segments[0] === 'api') {
    if (segments.length > 1) {
      return segments[1]; // e.g., /api/products -> products
    }
    return 'api';
  }
  
  // Handle admin routes
  if (segments[0] === 'admin') {
    if (segments.length > 1) {
      return segments[1]; // e.g., /admin/users -> users
    }
    return 'admin';
  }
  
  // Handle other routes
  return segments[0];
}

/**
 * Get severity level based on result and reason
 */
function getSeverityLevel(result: string, reason?: string): 'low' | 'medium' | 'high' | 'critical' {
  switch (result) {
    case 'SUCCESS':
      return 'low'
    case 'UNAUTHORIZED':
      return reason?.includes('multiple_attempts') ? 'high' : 'medium'
    case 'FORBIDDEN':
      return reason?.includes('privilege_escalation') ? 'critical' : 'high'
    case 'RATE_LIMITED':
      return 'medium'
    case 'BLOCKED':
      return 'critical'
    default:
      return 'medium'
  }
}

/**
 * Update security monitoring state
 */
function updateSecurityState(
  result: string,
  ipAddress?: string,
  userId?: string,
  reason?: string
): void {
  if (!ipAddress) return

  const now = new Date()

  // Track suspicious IPs
  if (['UNAUTHORIZED', 'FORBIDDEN', 'RATE_LIMITED'].includes(result)) {
    const current = securityState.suspiciousIPs.get(ipAddress) || { 
      count: 0, 
      lastSeen: now, 
      violations: [] 
    }
    
    current.count++
    current.lastSeen = now
    current.violations.push(result + ':' + (reason || 'unknown'))
    
    // Keep only last 10 violations
    if (current.violations.length > 10) {
      current.violations = current.violations.slice(-10)
    }
    
    securityState.suspiciousIPs.set(ipAddress, current)

    // Auto-block after threshold
    if (current.count >= 10) {
      securityState.blockedIPs.add(ipAddress)
      console.error('IP ' + ipAddress + ' auto-blocked due to suspicious activity (' + current.count + ' violations)')
    }
  }

  // Track failed attempts by user/IP
  if (result === 'UNAUTHORIZED') {
    const key = userId || ipAddress
    const current = securityState.failedAttempts.get(key) || { count: 0, lastAttempt: now }
    current.count++
    current.lastAttempt = now
    securityState.failedAttempts.set(key, current)
  }

  // Track rate limit violations
  if (result === 'RATE_LIMITED') {
    const current = securityState.rateLimitViolations.get(ipAddress) || { count: 0, lastViolation: now }
    current.count++
    current.lastViolation = now
    securityState.rateLimitViolations.set(ipAddress, current)
  }

  // Reset counters on successful access
  if (result === 'SUCCESS' && userId) {
    securityState.failedAttempts.delete(userId)
    securityState.failedAttempts.delete(ipAddress)
  }
}

/**
 * Detect security threats and trigger alerts
 */
async function detectSecurityThreats(logData: any): Promise<void> {
  const { ipAddress, userId, result, pathname, userRole } = logData

  // Detect brute force attacks
  if (result === 'UNAUTHORIZED') {
    const failedAttempts = securityState.failedAttempts.get(userId || ipAddress)
    if (failedAttempts && failedAttempts.count >= 5) {
      await triggerSecurityAlert('BRUTE_FORCE_ATTACK', 'high', {
        message: 'Potential brute force attack detected',
        ipAddress,
        userId,
        attemptCount: failedAttempts.count,
        timeWindow: '1 hour'
      })
    }
  }

  // Detect privilege escalation attempts
  if (result === 'FORBIDDEN' && pathname.includes('/admin/')) {
    await triggerSecurityAlert('PRIVILEGE_ESCALATION', 'critical', {
      message: 'Privilege escalation attempt detected',
      ipAddress,
      userId,
      userRole,
      targetPath: pathname
    })
  }

  // Detect suspicious IP behavior
  const suspiciousIP = securityState.suspiciousIPs.get(ipAddress)
  if (suspiciousIP && suspiciousIP.count >= 5) {
    await triggerSecurityAlert('SUSPICIOUS_IP_ACTIVITY', 'high', {
      message: 'Suspicious activity from IP address',
      ipAddress,
      violationCount: suspiciousIP.count,
      violations: suspiciousIP.violations
    })
  }

  // Detect rapid successive requests (potential bot activity)
  const rateLimitViolations = securityState.rateLimitViolations.get(ipAddress)
  if (rateLimitViolations && rateLimitViolations.count >= 3) {
    await triggerSecurityAlert('BOT_ACTIVITY', 'medium', {
      message: 'Potential bot activity detected',
      ipAddress,
      violationCount: rateLimitViolations.count
    })
  }

  // Detect access to sensitive endpoints
  const sensitiveEndpoints = ['/api/admin/', '/api/users/', '/admin/security', '/admin/database']
  if (sensitiveEndpoints.some(endpoint => pathname.startsWith(endpoint))) {
    await triggerSecurityAlert('SENSITIVE_ACCESS', 'medium', {
      message: 'Access to sensitive endpoint',
      ipAddress,
      userId,
      userRole,
      endpoint: pathname,
      result
    })
  }
}

/**
 * Trigger security alert
 */
async function triggerSecurityAlert(
  alertType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details: Record<string, any>
): Promise<void> {
  const alert = {
    type: alertType,
    severity,
    timestamp: new Date().toISOString(),
    ...details
  }

  // Log critical and high severity alerts prominently
  if (severity === 'critical' || severity === 'high') {
    console.error('SECURITY ALERT [' + severity.toUpperCase() + '] ' + alertType + ':', JSON.stringify(alert, null, 2))
  } else {
    console.warn('Security Alert [' + severity.toUpperCase() + '] ' + alertType + ':', JSON.stringify(alert, null, 2))
  }
}

/**
 * Check if IP is blocked
 */
function isIPBlocked(ipAddress: string): boolean {
  return securityState.blockedIPs.has(ipAddress)
}

/**
 * Clean up old security state data
 */
function cleanupSecurityState(): void {
  const now = Date.now()
  const oneHourAgo = now - (60 * 60 * 1000)
  const oneDayAgo = now - (24 * 60 * 60 * 1000)

  // Clean up old suspicious IP data
  const suspiciousIPs = Array.from(securityState.suspiciousIPs.entries())
  for (const [ip, data] of suspiciousIPs) {
    if (data.lastSeen.getTime() < oneDayAgo) {
      securityState.suspiciousIPs.delete(ip)
    }
  }

  // Clean up old failed attempts
  const failedAttempts = Array.from(securityState.failedAttempts.entries())
  for (const [key, data] of failedAttempts) {
    if (data.lastAttempt.getTime() < oneHourAgo) {
      securityState.failedAttempts.delete(key)
    }
  }

  // Clean up old rate limit violations
  const rateLimitViolations = Array.from(securityState.rateLimitViolations.entries())
  for (const [ip, data] of rateLimitViolations) {
    if (data.lastViolation.getTime() < oneHourAgo) {
      securityState.rateLimitViolations.delete(ip)
    }
  }
}

// Clean up security state every 15 minutes
setInterval(cleanupSecurityState, 15 * 60 * 1000)

export async function middleware(request: NextRequest) {
  // Generate a simple request ID for tracing
  const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)

  // Add request ID to headers for tracing
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)

  const { pathname } = request.nextUrl
  const method = request.method
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  // Create metadata for logging
  const logMetadata = {
    requestId,
    method,
    userAgent,
    timestamp: new Date().toISOString()
  }

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public/') ||
    pathname.includes('.')
  ) {
    let response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
    response.headers.set('x-request-id', requestId)
    return response
  }

  // Check if IP is blocked
  if (isIPBlocked(ip)) {
    await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    return new NextResponse('Access Denied', { status: 403 })
  }

  // Apply rate limiting based on route sensitivity
  const authRoutes = ['/api/auth/']
  const sensitiveRoutes = ['/api/admin/', '/api/users/', '/admin/security', '/admin/database', '/admin/backup', '/admin/users']
  
  let rateLimitConfig
  if (authRoutes.some(route => pathname.startsWith(route))) {
    rateLimitConfig = rateLimitConfigs.auth
  } else if (sensitiveRoutes.some(route => pathname.startsWith(route))) {
    rateLimitConfig = rateLimitConfigs.sensitive
  } else {
    rateLimitConfig = rateLimitConfigs.public
  }

  const rateLimitResult = await rateLimit(request, rateLimitConfig)
  
  if (!rateLimitResult.success) {
    await logSecurityEvent(
      null, 
      pathname, 
      'RATE_LIMITED', 
      'rate_limit_exceeded_' + (rateLimitResult.retryAfter || 60) + 's', 
      ip, 
      userAgent, 
      { ...logMetadata, rateLimitResult }
    )

    const response = new NextResponse('Rate limit exceeded', { 
      status: 429,
      headers: {
        ...createRateLimitHeaders(rateLimitResult),
        'Retry-After': (rateLimitResult.retryAfter?.toString() || '60')
      }
    })
    return response
  }

  // Check if route is public or NextAuth route
  if (isPublicRoute(pathname) || pathname.startsWith('/api/auth/')) {
    // Still log access for security monitoring
    const reason = pathname.startsWith('/api/auth/') ? 'nextauth_route' : 'public_route'
    await logSecurityEvent(null, pathname, 'SUCCESS', reason, ip, userAgent, logMetadata)
    
    let response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })

    // Add rate limit headers
    Object.entries(createRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    // Apply security headers and preferences
    response = await applySecurityAndPreferences(request, response)
    return response
  }

  // Get authentication token
  let token
  try {
    token = await getToken({ 
      req: request, 
      secret: process.env.AUTH_SECRET 
    })
  } catch (error) {
    console.error('Failed to get token:', error)
    await logSecurityEvent(
      null, 
      pathname, 
      'UNAUTHORIZED', 
      'token_error', 
      ip, 
      userAgent, 
      { ...logMetadata, error: error instanceof Error ? error.message : String(error) }
    )
    return createUnauthorizedResponse(request, 'Authentication token error')
  }

  // Check authentication
  if (!token) {
    await logSecurityEvent(null, pathname, 'UNAUTHORIZED', 'no_token', ip, userAgent, logMetadata)
    return createUnauthorizedResponse(request, 'Authentication required')
  }

  // Enhanced user context for logging
  const userContext = {
    userId: token.id,
    userRole: token.role,
    userEmail: token.email
  }

  // Check if route only requires authentication
  if (isAuthenticatedRoute(pathname)) {
    await logSecurityEvent(
      token, 
      pathname, 
      'SUCCESS', 
      'authenticated_route', 
      ip, 
      userAgent, 
      { ...logMetadata, ...userContext }
    )
    
    let response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })

    // Add rate limit headers
    Object.entries(createRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    response = await applySecurityAndPreferences(request, response)
    return response
  }

  // Get required permissions for the route
  const requiredPermissions = getRoutePermissions(pathname, method)
  
  // If no specific permissions required, allow access for authenticated users
  if (requiredPermissions.length === 0) {
    await logSecurityEvent(
      token, 
      pathname, 
      'SUCCESS', 
      'no_permissions_required', 
      ip, 
      userAgent, 
      { ...logMetadata, ...userContext }
    )
    
    let response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })

    // Add rate limit headers
    Object.entries(createRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    response = await applySecurityAndPreferences(request, response)
    return response
  }

  // Check permissions
  const hasPermission = hasRoutePermissions(
    token.role as string,
    token.id as string,
    requiredPermissions
  )

  if (!hasPermission) {
    const reason = 'Insufficient permissions for ' + pathname + '. Required: ' + JSON.stringify(requiredPermissions) + ', User role: ' + token.role
    const isEscalation = pathname.includes('/admin/') && token.role !== 'ADMIN'
    await logSecurityEvent(
      token, 
      pathname, 
      'FORBIDDEN', 
      reason, 
      ip, 
      userAgent, 
      { 
        ...logMetadata, 
        ...userContext, 
        requiredPermissions,
        attemptedEscalation: isEscalation
      }
    )
    return createForbiddenResponse(request, reason)
  }

  // Access granted
  await logSecurityEvent(
    token, 
    pathname, 
    'SUCCESS', 
    'permission_granted', 
    ip, 
    userAgent, 
    { 
      ...logMetadata, 
      ...userContext, 
      grantedPermissions: requiredPermissions 
    }
  )

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Add rate limit headers
  Object.entries(createRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  response = await applySecurityAndPreferences(request, response)
  return response
}

/**
 * Create unauthorized response with proper redirect and security logging
 */
function createUnauthorizedResponse(request: NextRequest, reason: string): NextResponse {
  const { pathname } = request.nextUrl
  const requestId = request.headers.get('x-request-id') || 'unknown'
  
  // For API routes, return JSON error
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          details: { reason, path: pathname, requestId },
          timestamp: new Date().toISOString(),
        },
        success: false,
      },
      { status: 401 }
    )
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('x-request-id', requestId)
    
    return response
  }
  
  // For web routes, redirect to login
  const loginUrl = new URL('/auth/login', request.url)
  loginUrl.searchParams.set('callbackUrl', pathname)
  loginUrl.searchParams.set('error', 'unauthorized')
  loginUrl.searchParams.set('reason', reason)
  
  const response = NextResponse.redirect(loginUrl)
  response.headers.set('x-request-id', requestId)
  
  return response
}

/**
 * Create forbidden response with proper redirect and security logging
 */
function createForbiddenResponse(request: NextRequest, reason: string): NextResponse {
  const { pathname } = request.nextUrl
  const requestId = request.headers.get('x-request-id') || 'unknown'
  
  // For API routes, return JSON error
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.json(
      {
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          details: { reason, path: pathname, requestId },
          timestamp: new Date().toISOString(),
        },
        success: false,
      },
      { status: 403 }
    )
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('x-request-id', requestId)
    
    return response
  }
  
  // For web routes, redirect to error page or dashboard
  const errorUrl = new URL('/', request.url)
  errorUrl.searchParams.set('error', 'forbidden')
  errorUrl.searchParams.set('message', reason)
  errorUrl.searchParams.set('requestId', requestId)
  
  const response = NextResponse.redirect(errorUrl)
  response.headers.set('x-request-id', requestId)
  
  return response
}

/**
 * Apply comprehensive security headers and user preferences
 */
async function applySecurityAndPreferences(request: NextRequest, response: NextResponse): Promise<NextResponse> {
  // Get request ID before applying preferences
  const requestId = request.headers.get('x-request-id')
  
  // Apply default preferences for non-API routes
  if (!request.nextUrl.pathname.startsWith('/api/') && 
      !request.nextUrl.pathname.startsWith('/_next/')) {
    response = await applyUserPreferences(request, response)
  }

  // Add comprehensive security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('X-Download-Options', 'noopen')
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  
  // Content Security Policy for enhanced XSS protection
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "child-src 'none'",
    "worker-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "manifest-src 'self'"
  ]
  response.headers.set('Content-Security-Policy', cspDirectives.join('; '))
  
  // HSTS for production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }

  // Add request ID and security tracking headers
  if (requestId) {
    response.headers.set('x-request-id', requestId)
  }
  
  // Add security monitoring headers
  response.headers.set('X-Security-Monitored', 'true')
  response.headers.set('X-Timestamp', new Date().toISOString())

  // Remove potentially sensitive headers
  response.headers.delete('Server')
  response.headers.delete('X-Powered-By')

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}