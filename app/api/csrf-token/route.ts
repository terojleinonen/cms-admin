/**
 * CSRF Token API
 * Provides secure CSRF tokens for client-side requests
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Simple CSRF token generation without complex dependencies
function generateCSRFToken(): string {
  return crypto.randomUUID()
}

// GET /api/csrf-token - Get CSRF token
export async function GET(request: NextRequest) {
  try {
    // Generate a simple CSRF token
    const token = generateCSRFToken()
    const expires = Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    
    // Add debug information
    const debugInfo = {
      AUTH_SECRET: process.env.AUTH_SECRET ? 'SET' : 'NOT SET',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }
    
    // Create response with token and debug info
    const response = NextResponse.json({
      token,
      expires,
      success: true,
      debug: debugInfo
    })

    // Set cookie for double-submit protection
    response.cookies.set('csrf-token', token, {
      httpOnly: false, // Needs to be accessible to JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours in seconds
      path: '/'
    })

    return response
    
  } catch (error) {
    console.error('Error generating CSRF token:', error)
    return NextResponse.json(
      { 
        error: {
          code: 'CSRF_TOKEN_GENERATION_FAILED',
          message: 'Failed to generate CSRF token',
          timestamp: new Date().toISOString(),
        },
        success: false
      },
      { status: 500 }
    )
  }
}