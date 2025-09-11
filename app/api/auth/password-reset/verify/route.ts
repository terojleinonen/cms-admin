/**
 * Password Reset Token Verification API
 * Handles password reset token verification and completion
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyPasswordResetToken, completePasswordReset } from '@/lib/password-reset'
import { z } from 'zod'

const passwordResetCompletionSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters long'),
  confirmPassword: z.string().min(1, 'Password confirmation is required')
})

/**
 * GET /api/auth/password-reset/verify?token=xxx
 * Verify password reset token validity
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const result = await verifyPasswordResetToken(token)

    return NextResponse.json({
      isValid: result.success,
      message: result.message
    })
  } catch (error) {
    console.error('Password reset token verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/auth/password-reset/verify
 * Complete password reset with new password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = passwordResetCompletionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }

    const { token, newPassword, confirmPassword } = validation.data
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     '' || null
    const userAgent = request.headers.get('user-agent') || null

    await completePasswordReset(
      token,
      newPassword
    )

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully.'
    })
  } catch (error) {
    console.error('Password reset completion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}