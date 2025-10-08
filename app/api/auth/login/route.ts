/**
 * Authentication login API endpoint
 * Handles user login with validation and JWT generation
 * Works alongside NextAuth for API authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { verifyPassword } from '@/lib/auth-utils'
import { handleDatabaseError } from '@/lib/db-errors'
import { prisma } from '@/lib/db'
import { withAPISecurity, validateAndSanitizeBody } from '@/lib/api-security'
import { validationSchemas } from '@/lib/validation-schemas'
import { SecurityService } from '@/lib/security'
import jwt from 'jsonwebtoken'

// Use centralized validation schemas
const { auth: authSchemas } = validationSchemas

export const POST = withAPISecurity(
  withApiPermissions(
    async (request: NextRequest, { user }) => {
      const securityService = SecurityService.getInstance()
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                 request.headers.get('x-real-ip') || 
                 'unknown'
      const userAgent = request.headers.get('user-agent') || 'unknown'
      
      try {
        // Validate and sanitize request body
        const bodyValidation = await validateAndSanitizeBody(request, authSchemas.login)
        
        if (!bodyValidation.success) {
          await securityService.logSecurityEvent(
            'login_failed',
            'medium',
            'Login validation failed',
            ip,
            { reason: 'validation_error', error: bodyValidation.error },
            undefined,
            userAgent
          )
          
          return NextResponse.json(
            {
              error: {
                code: 'VALIDATION_ERROR',
                message: bodyValidation.error,
                details: bodyValidation.details,
                timestamp: new Date().toISOString(),
              },
              success: false,
            },
            { status: 400 }
          )
        }

        const { email, password } = bodyValidation.data
        // Find user by email
        const foundUser = await prisma.user.findUnique({
          where: {
            email: email.toLowerCase(),
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            passwordHash: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        })

        if (!foundUser) {
          await securityService.logSecurityEvent(
            'login_failed',
            'medium',
            'Login attempt with invalid email',
            ip,
            { email, reason: 'user_not_found' },
            undefined,
            userAgent
          )
          
          return NextResponse.json(
            {
              error: {
                code: 'INVALID_CREDENTIALS',
                message: 'Invalid email or password',
                timestamp: new Date().toISOString(),
              },
              success: false,
            },
            { status: 401 }
          )
        }

        // Check if user is active
        if (!foundUser.isActive) {
          await securityService.logSecurityEvent(
            'login_failed',
            'high',
            'Login attempt on inactive account',
            ip,
            { email, userId: foundUser.id, reason: 'account_inactive' },
            foundUser.id,
            userAgent
          )
          
          return NextResponse.json(
            {
              error: {
                code: 'ACCOUNT_INACTIVE',
                message: 'Account has been disabled',
                timestamp: new Date().toISOString(),
              },
              success: false,
            },
            { status: 401 }
          )
        }

        // Verify password
        const isPasswordValid = await verifyPassword(password, foundUser.passwordHash)

        if (!isPasswordValid) {
          await securityService.logSecurityEvent(
            'login_failed',
            'medium',
            'Login attempt with invalid password',
            ip,
            { email, userId: foundUser.id, reason: 'invalid_password' },
            foundUser.id,
            userAgent
          )
          
          return NextResponse.json(
            {
              error: {
                code: 'INVALID_CREDENTIALS',
                message: 'Invalid email or password',
                timestamp: new Date().toISOString(),
              },
              success: false,
            },
            { status: 401 }
          )
        }

        // Generate JWT token
        const jwtSecret = process.env.AUTH_SECRET
        if (!jwtSecret) {
          return NextResponse.json(
            {
              error: {
                code: 'INTERNAL_ERROR',
                message: 'Server configuration error',
                timestamp: new Date().toISOString(),
              },
              success: false,
            },
            { status: 500 }
          )
        }

        const expiresIn = 24 * 60 * 60 // 24 hours
        const tokenPayload = {
          sub: foundUser.id,
          email: foundUser.email,
          name: foundUser.name,
          role: foundUser.role,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + expiresIn,
        }

        const token = jwt.sign(tokenPayload, jwtSecret, {
          algorithm: 'HS256',
        })

        // Update last login timestamp
        await prisma.user.update({
          where: { id: foundUser.id },
          data: { updatedAt: new Date() },
        })

        // Log successful login
        await securityService.logSecurityEvent(
          'login_success',
          'low',
          'User logged in successfully',
          ip,
          { email, userId: foundUser.id },
          foundUser.id,
          userAgent
        )

        // Return success response with user data and token
        return NextResponse.json(
          {
            success: true,
            message: 'Login successful',
            user: {
              id: foundUser.id,
              name: foundUser.name,
              email: foundUser.email,
              role: foundUser.role,
              isActive: foundUser.isActive,
              createdAt: foundUser.createdAt,
              updatedAt: foundUser.updatedAt,
            },
            token,
            tokenType: 'Bearer',
            expiresIn,
            timestamp: new Date().toISOString(),
          },
          { status: 200 }
        )
      } catch (error) {
        console.error('Login error:', error)

        await securityService.logSecurityEvent(
          'login_failed',
          'high',
          'Login system error',
          ip,
          { error: error instanceof Error ? error.message : String(error) },
          undefined,
          userAgent
        )

        // Handle database errors
        const dbError = handleDatabaseError(error)
        return NextResponse.json(
          {
            error: {
              code: dbError.code,
              message: dbError.message,
              timestamp: new Date().toISOString(),
            },
            success: false,
          },
          { status: 500 }
        )
      }
    },
    {
      permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
    }
  ),
  {
    allowedMethods: ['POST'],
    requireCSRF: false, // Login doesn't require CSRF as it's the initial auth step
    rateLimitConfig: 'auth'
  }
)