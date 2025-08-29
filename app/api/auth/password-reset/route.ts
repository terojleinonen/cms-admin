/**
 * Password Reset API
 * Handles password reset initiation
 */

import { NextRequest, NextResponse } from 'next/server'
import { initiatePasswordReset } from '@/app/lib/password-reset'
import { z } from 'zod'

const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address')
})

/**
 * POST /api/auth/password-reset
 * Initiate password reset process
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = passwordResetRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    const { email } = validation.data
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     request.ip || null
    const userAgent = request.headers.get('user-agent') || null

    const result = await initiatePasswordReset({
      email,
      ipAddress,
      userAgent
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      // In development, return the token for testing
      ...(process.env.NODE_ENV === 'development' && result.token && { 
        resetToken: result.token 
      })
    })
  } catch (error) {
    console.error('Password reset request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}