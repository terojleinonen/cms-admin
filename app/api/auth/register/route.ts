/**
 * User registration API endpoint
 * Handles new user registration with validation and security
 */

import { NextRequest, NextResponse } from 'next/server'
import { registerSchema } from '../../../lib/auth-schemas'
import { createUser } from '../../../lib/auth-utils'
import { handleDatabaseError, isUniqueConstraintError } from '../../../lib/db-errors'
import { UserRole } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request data
    const validationResult = registerSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid registration data',
            details: validationResult.error.flatten().fieldErrors,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      )
    }

    const { name, email, password, role } = validationResult.data

    // For security, only allow admin role creation by existing admins
    // For now, default to EDITOR role for new registrations
    const userRole = role === UserRole.ADMIN ? UserRole.EDITOR : (role || UserRole.EDITOR)

    // Create user
    const user = await createUser({
      name,
      email,
      password,
      role: userRole,
    })

    // Return success response (without sensitive data)
    return NextResponse.json(
      {
        success: true,
        message: 'User registered successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)

    // Handle database errors
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        {
          error: {
            code: 'DUPLICATE_ENTRY',
            message: 'An account with this email already exists',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 409 }
      )
    }

    // Handle other database errors
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