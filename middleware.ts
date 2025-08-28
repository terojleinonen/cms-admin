import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createRequestMonitor, securityMonitor, logger } from '@/lib/monitoring'

export function middleware(request: NextRequest) {
  // Create request monitor
  const monitor = createRequestMonitor()
  const { requestId, finish } = monitor(request)

  // Add request ID to headers for tracing
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)

  // Security monitoring for authentication endpoints
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Record login attempts
    if (request.nextUrl.pathname === '/api/auth/login' && request.method === 'POST') {
      securityMonitor.recordSecurityEvent({
        type: 'login_attempt',
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
        details: {
          endpoint: request.nextUrl.pathname,
          method: request.method
        }
      })
    }
  }

  // Security monitoring for admin endpoints
  if (request.nextUrl.pathname.startsWith('/api/admin/')) {
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // This will be enhanced with actual session checking
    securityMonitor.recordSecurityEvent({
      type: 'unauthorized_access',
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
      details: {
        endpoint: request.nextUrl.pathname,
        method: request.method
      }
    })
  }

  // Rate limiting for API endpoints
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'

    // Simple in-memory rate limiting (in production, use Redis)
    const rateLimitKey = `rate_limit:${ip}`
    // This would be implemented with a proper rate limiting solution
  }

  // Continue with the request
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  // Add request ID to response headers
  response.headers.set('x-request-id', requestId)

  // Log the response (this would be called after the request is processed)
  // In a real implementation, you'd need to hook into the response lifecycle
  setTimeout(() => {
    finish(response.status)
  }, 0)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}