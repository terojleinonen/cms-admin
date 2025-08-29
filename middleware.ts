import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { applyUserPreferences } from './app/lib/preferences-middleware'

export async function middleware(request: NextRequest) {
  // Generate a simple request ID for tracing
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Add request ID to headers for tracing
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)

  // Enhanced audit and security middleware
  // const auditResponse = await auditMiddleware(request)
  // if (auditResponse) {
  //   // Audit middleware returned a response (blocked request)
  //   return auditResponse
  // }

  // Security monitoring for authentication endpoints
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Log login attempts (simplified logging)
    if (request.nextUrl.pathname === '/api/auth/login' && request.method === 'POST') {
      console.log(`Login attempt from IP: ${ip}, User-Agent: ${userAgent}`)
    }
  }

  // Continue with the request
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Apply user preferences for non-API routes
  if (!request.nextUrl.pathname.startsWith('/api/') && 
      !request.nextUrl.pathname.startsWith('/_next/')) {
    response = await applyUserPreferences(request, response)
  }

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