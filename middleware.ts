import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle CORS for public API endpoints
  if (pathname.startsWith('/api/public/')) {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
            ? 'https://your-ecommerce-domain.com' 
            : 'http://localhost:3000',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    // Add CORS headers to actual requests
    const response = NextResponse.next()
    response.headers.set(
      'Access-Control-Allow-Origin', 
      process.env.NODE_ENV === 'production' 
        ? 'https://your-ecommerce-domain.com' 
        : 'http://localhost:3000'
    )
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response
  }

  // Handle media/uploads access
  if (pathname.startsWith('/uploads/')) {
    const response = NextResponse.next()
    response.headers.set(
      'Access-Control-Allow-Origin', 
      process.env.NODE_ENV === 'production' 
        ? 'https://your-ecommerce-domain.com' 
        : 'http://localhost:3000'
    )
    return response
  }

  // Protected routes authentication
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/public/') && !pathname.startsWith('/api/auth/')) {
    const token = await getToken({ req: request })
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
  }

  // Protected CMS routes (everything except auth and public API)
  if (!pathname.startsWith('/auth/') && !pathname.startsWith('/api/auth/') && !pathname.startsWith('/api/public/')) {
    const token = await getToken({ req: request })
    
    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // Check if user has admin or editor role for admin routes
    if (pathname.startsWith('/admin')) {
      if (token.role !== 'ADMIN' && token.role !== 'EDITOR') {
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
}