/**
 * Authentication login API endpoint
 * Handles user login with validation and JWT generation
 * Works alongside NextAuth for API authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { loginSchema } from '@/lib/auth-schemas'
import { verifyPassword } from '@/lib/auth-utils'
import { handleDatabaseError } from '@/lib/db-errors'
import { prisma } from '@/lib/db'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request data
    const validationResult = loginSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid login data',
            details: validationResult.error.flatten().fieldErrors,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      )
    }

    const { email, password } = validationResult.data

    // Find user by email
    const user = await prisma.user.findUnique({
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

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        {
          error: {
            code: 'ACCOUNT_INACTIVE',
            message: 'Account has been disabled',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      )
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash)

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      )
    }

    // Generate JWT token
    const jwtSecret = process.env.NEXTAUTH_SECRET
    if (!jwtSecret) {
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Server configuration error',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 500 }
      )
    }

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    }

    const token = jwt.sign(tokenPayload, jwtSecret, {
      algorithm: 'HS256',
    })

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() },
    })

    // Return success response with user data and token
    return NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        token,
        tokenType: 'Bearer',
        expiresIn: 86400, // 24 hours in seconds
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Login error:', error)

    // Handle database errors
    const dbError = handleDatabaseError(error)
    return NextResponse.json(
      {
        error: {
          code: dbError.code,
          message: dbError.message,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    )
  }
}