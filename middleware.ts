import { NextResponse, NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { applyUserPreferences } from './app/lib/preferences-middleware'
import { hasRoutePermissions } from './app/lib/simple-permissions'
import { rateLimit, rateLimitConfigs, createRateLimitHeaders } from './app/lib/rate-limit'

// Simplified security state - only track blocked IPs
const securityState = {
  blockedIPs: new Set<string>(),
}

/**
 * Check if route is public (no authentication required)
 */
function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    '/',
    '/auth/login',
    '/auth/register', 
    '/auth/password-reset',
    '/api/auth/',
    '/api/public/',
    '/api/health',
    '/api/csrf-token'
  ];
  
  return publicRoutes.some(route => pathname.startsWith(route));
}

/**
 * Check if route only requires authentication (no specific permissions)
 */
function isAuthenticatedRoute(pathname: string): boolean {
  const authOnlyRoutes = [
    '/profile',
    '/settings',
    '/api/user/',
    '/api/notifications'
  ];
  
  return authOnlyRoutes.some(route => pathname.startsWith(route));
}

/**
 * Simplified security logging
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
    }

    // Simple console logging for security events
    if (result !== 'SUCCESS') {
      console.warn('[SECURITY]', result + ':', JSON.stringify(logData, null, 2))
    }

  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}



/**
 * Check if IP is blocked
 */
function isIPBlocked(ipAddress: string): boolean {
  return securityState.blockedIPs.has(ipAddress)
}



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

  // Check permissions using simplified system
  const hasPermission = hasRoutePermissions(
    token.role as string,
    token.id as string,
    pathname
  )

  if (!hasPermission) {
    const reason = 'Insufficient permissions for ' + pathname + '. User role: ' + token.role
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
      ...userContext
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