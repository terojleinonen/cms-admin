/**
 * Comprehensive CSRF Protection System
 * Provides token generation, validation, and double-submit cookie protection
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { SecurityService } from './security'

interface CSRFTokenData {
  token: string
  expires: number
  sessionId: string
  userAgent?: string
  ipAddress?: string
}

export class CSRFProtection {
  private static tokens = new Map<string, CSRFTokenData>()
  private static readonly TOKEN_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours
  private static readonly CLEANUP_INTERVAL = 60 * 60 * 1000 // 1 hour
  private static readonly SECRET = process.env.NEXTAUTH_SECRET || 'fallback-csrf-secret'

  static {
    // Clean up expired tokens periodically
    setInterval(() => {
      this.cleanupExpiredTokens()
    }, this.CLEANUP_INTERVAL)
  }

  /**
   * Generate a secure CSRF token
   */
  static generateToken(
    sessionId: string,
    userAgent?: string,
    ipAddress?: string
  ): string {
    const tokenId = crypto.randomUUID()
    const timestamp = Date.now()
    const expires = timestamp + this.TOKEN_EXPIRY

    // Create token payload
    const payload = {
      id: tokenId,
      sessionId,
      timestamp,
      userAgent: userAgent?.substring(0, 100), // Limit length
      ipAddress,
    }

    // Sign the payload
    const signature = this.signPayload(payload)
    const token = `${Buffer.from(JSON.stringify(payload)).toString('base64')}.${signature}`

    // Store token data
    this.tokens.set(tokenId, {
      token,
      expires,
      sessionId,
      userAgent,
      ipAddress,
    })

    return token
  }

  /**
   * Validate CSRF token
   */
  static async validateToken(
    token: string,
    sessionId: string,
    request?: NextRequest
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      if (!token) {
        return { valid: false, reason: 'Token missing' }
      }

      // Parse token
      const [payloadBase64, signature] = token.split('.')
      if (!payloadBase64 || !signature) {
        return { valid: false, reason: 'Invalid token format' }
      }

      // Decode payload
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString())
      
      // Verify signature
      const expectedSignature = this.signPayload(payload)
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        await this.logSecurityViolation('Invalid token signature', request, { token: token.substring(0, 20) + '...' })
        return { valid: false, reason: 'Invalid signature' }
      }

      // Check if token exists in store
      const storedToken = this.tokens.get(payload.id)
      if (!storedToken) {
        return { valid: false, reason: 'Token not found' }
      }

      // Check expiration
      if (Date.now() > storedToken.expires) {
        this.tokens.delete(payload.id)
        return { valid: false, reason: 'Token expired' }
      }

      // Validate session ID
      if (storedToken.sessionId !== sessionId) {
        await this.logSecurityViolation('Session ID mismatch', request, { 
          expectedSession: sessionId,
          tokenSession: storedToken.sessionId 
        })
        return { valid: false, reason: 'Session mismatch' }
      }

      // Optional: Validate user agent (helps prevent token theft)
      if (request && storedToken.userAgent) {
        const currentUserAgent = request.headers.get('user-agent')?.substring(0, 100)
        if (currentUserAgent !== storedToken.userAgent) {
          await this.logSecurityViolation('User agent mismatch', request, {
            expectedUserAgent: storedToken.userAgent,
            currentUserAgent
          })
          // Don't fail validation for user agent mismatch, just log it
        }
      }

      // Optional: Validate IP address (strict mode)
      if (process.env.CSRF_STRICT_IP === 'true' && request && storedToken.ipAddress) {
        const currentIP = this.getClientIP(request)
        if (currentIP !== storedToken.ipAddress) {
          await this.logSecurityViolation('IP address mismatch', request, {
            expectedIP: storedToken.ipAddress,
            currentIP
          })
          return { valid: false, reason: 'IP address mismatch' }
        }
      }

      return { valid: true }

    } catch (error) {
      await this.logSecurityViolation('Token validation error', request, { 
        error: error instanceof Error ? error.message : String(error) 
      })
      return { valid: false, reason: 'Validation error' }
    }
  }

  /**
   * Invalidate a specific token
   */
  static invalidateToken(token: string): boolean {
    try {
      const [payloadBase64] = token.split('.')
      if (!payloadBase64) return false

      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString())
      return this.tokens.delete(payload.id)
    } catch {
      return false
    }
  }

  /**
   * Invalidate all tokens for a session
   */
  static invalidateSessionTokens(sessionId: string): number {
    let count = 0
    for (const [tokenId, tokenData] of this.tokens.entries()) {
      if (tokenData.sessionId === sessionId) {
        this.tokens.delete(tokenId)
        count++
      }
    }
    return count
  }

  /**
   * Get CSRF token from request headers or cookies
   */
  static getTokenFromRequest(request: NextRequest): string | null {
    // Check headers first (preferred method)
    let token = request.headers.get('x-csrf-token')
    
    if (!token) {
      // Check form data for POST requests
      const contentType = request.headers.get('content-type')
      if (contentType?.includes('application/x-www-form-urlencoded')) {
        // This would need to be handled in the actual route handler
        // as we can't read the body here without consuming it
      }
    }

    if (!token) {
      // Check cookies as fallback
      const cookies = request.headers.get('cookie')
      if (cookies) {
        const match = cookies.match(/csrf-token=([^;]+)/)
        token = match ? decodeURIComponent(match[1]) : null
      }
    }

    return token
  }

  /**
   * Create CSRF protection middleware
   */
  static middleware(options: {
    methods?: string[]
    skipPaths?: string[]
    requireDoubleSubmit?: boolean
  } = {}) {
    const {
      methods = ['POST', 'PUT', 'PATCH', 'DELETE'],
      skipPaths = [],
      requireDoubleSubmit = false
    } = options

    return async (request: NextRequest): Promise<NextResponse | null> => {
      const { pathname } = new URL(request.url)
      const method = request.method

      // Skip if method not in protected methods
      if (!methods.includes(method)) {
        return null
      }

      // Skip if path is in skip list
      if (skipPaths.some(path => pathname.startsWith(path))) {
        return null
      }

      // Get session ID (this would typically come from your auth system)
      const sessionId = request.headers.get('x-session-id') || 
                       request.cookies.get('session-id')?.value ||
                       'anonymous'

      // Get CSRF token from request
      const token = this.getTokenFromRequest(request)

      if (!token) {
        await this.logSecurityViolation('CSRF token missing', request)
        return this.createCSRFErrorResponse('CSRF token required')
      }

      // Validate token
      const validation = await this.validateToken(token, sessionId, request)
      if (!validation.valid) {
        await this.logSecurityViolation(`CSRF validation failed: ${validation.reason}`, request)
        return this.createCSRFErrorResponse(`CSRF validation failed: ${validation.reason}`)
      }

      // Double-submit cookie validation (additional security)
      if (requireDoubleSubmit) {
        const cookieToken = request.cookies.get('csrf-token')?.value
        if (!cookieToken || cookieToken !== token) {
          await this.logSecurityViolation('Double-submit cookie validation failed', request)
          return this.createCSRFErrorResponse('Double-submit validation failed')
        }
      }

      return null // Continue processing
    }
  }

  /**
   * Create CSRF token endpoint response
   */
  static createTokenResponse(sessionId: string, request?: NextRequest): NextResponse {
    const userAgent = request?.headers.get('user-agent')
    const ipAddress = request ? this.getClientIP(request) : undefined
    
    const token = this.generateToken(sessionId, userAgent, ipAddress)
    
    const response = NextResponse.json({
      token,
      expires: Date.now() + this.TOKEN_EXPIRY,
      success: true
    })

    // Set cookie for double-submit protection
    response.cookies.set('csrf-token', token, {
      httpOnly: false, // Needs to be accessible to JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: this.TOKEN_EXPIRY / 1000,
      path: '/'
    })

    return response
  }

  /**
   * Sign payload with HMAC
   */
  private static signPayload(payload: any): string {
    return crypto
      .createHmac('sha256', this.SECRET)
      .update(JSON.stringify(payload))
      .digest('hex')
  }

  /**
   * Get client IP address
   */
  private static getClientIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
           request.headers.get('x-real-ip') ||
           request.headers.get('cf-connecting-ip') ||
           'unknown'
  }

  /**
   * Log security violation
   */
  private static async logSecurityViolation(
    message: string,
    request?: NextRequest,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const securityService = SecurityService.getInstance()
    const ip = request ? this.getClientIP(request) : 'unknown'
    const userAgent = request?.headers.get('user-agent') || 'unknown'
    const pathname = request ? new URL(request.url).pathname : 'unknown'

    await securityService.logSecurityEvent(
      'csrf_violation',
      'high',
      message,
      ip,
      {
        pathname,
        userAgent,
        ...metadata
      },
      undefined,
      userAgent
    )
  }

  /**
   * Create CSRF error response
   */
  private static createCSRFErrorResponse(message: string): NextResponse {
    return NextResponse.json(
      {
        error: {
          code: 'CSRF_TOKEN_INVALID',
          message,
          timestamp: new Date().toISOString(),
        },
        success: false,
      },
      { 
        status: 403,
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
        }
      }
    )
  }

  /**
   * Clean up expired tokens
   */
  private static cleanupExpiredTokens(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [tokenId, tokenData] of this.tokens.entries()) {
      if (now > tokenData.expires) {
        this.tokens.delete(tokenId)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired CSRF tokens`)
    }
  }

  /**
   * Get CSRF protection statistics
   */
  static getStats(): {
    totalTokens: number
    expiredTokens: number
    tokensPerSession: Record<string, number>
    oldestToken?: number
    newestToken?: number
  } {
    const now = Date.now()
    let expiredCount = 0
    const sessionsMap = new Map<string, number>()
    let oldestToken: number | undefined
    let newestToken: number | undefined

    for (const [, tokenData] of this.tokens.entries()) {
      if (now > tokenData.expires) {
        expiredCount++
      }

      // Count tokens per session
      const count = sessionsMap.get(tokenData.sessionId) || 0
      sessionsMap.set(tokenData.sessionId, count + 1)

      // Track oldest and newest tokens
      const tokenAge = now - (tokenData.expires - this.TOKEN_EXPIRY)
      if (!oldestToken || tokenAge > oldestToken) {
        oldestToken = tokenAge
      }
      if (!newestToken || tokenAge < newestToken) {
        newestToken = tokenAge
      }
    }

    return {
      totalTokens: this.tokens.size,
      expiredTokens: expiredCount,
      tokensPerSession: Object.fromEntries(sessionsMap),
      oldestToken,
      newestToken,
    }
  }
}

// Export convenience functions
export const generateCSRFToken = CSRFProtection.generateToken.bind(CSRFProtection)
export const validateCSRFToken = CSRFProtection.validateToken.bind(CSRFProtection)
export const csrfMiddleware = CSRFProtection.middleware.bind(CSRFProtection)
export const createCSRFTokenResponse = CSRFProtection.createTokenResponse.bind(CSRFProtection)