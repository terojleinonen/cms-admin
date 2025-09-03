/**
 * Current user API endpoint
 * Returns information about the currently authenticated user
 * Supports both NextAuth session and JWT token authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/db'
import jwt from 'jsonwebtoken'

/**
 * Verify JWT token from Authorization header
 */
async function verifyJWTToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix
  
  try {
    const jwtSecret = process.env.NEXTAUTH_SECRET
    if (!jwtSecret) {
      throw new Error('NEXTAUTH_SECRET is not configured')
    }

    const decoded = jwt.verify(token, jwtSecret) as any
    
    // Get user from database to ensure they still exist and are active
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user || !user.isActive) {
      return null
    }

    return user
  } catch (error) {
    console.error('JWT verification error:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    // Try JWT token authentication first
    const jwtUser = await verifyJWTToken(request)
    
    if (jwtUser) {
      // Return user information from JWT token
      return NextResponse.json(
        {
          success: true,
          user: {
            id: jwtUser.id,
            name: jwtUser.name,
            email: jwtUser.email,
            role: jwtUser.role,
            isActive: jwtUser.isActive,
            createdAt: jwtUser.createdAt,
            updatedAt: jwtUser.updatedAt,
          },
          permissions: getRolePermissions(jwtUser.role),
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      )
    }

    // Fall back to NextAuth session authentication
    const authResult = await requireAuth()
    
    // If not authenticated, return error response
    if (authResult instanceof Response) {
      return authResult
    }

    // Get current user details from session
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not found',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      )
    }

    // Get full user details from database
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!fullUser) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not found in database',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      )
    }

    // Return user information (without sensitive data)
    return NextResponse.json(
      {
        success: true,
        user: {
          id: fullUser.id,
          name: fullUser.name,
          email: fullUser.email,
          role: fullUser.role,
          isActive: fullUser.isActive,
          createdAt: fullUser.createdAt,
          updatedAt: fullUser.updatedAt,
        },
        permissions: getRolePermissions(fullUser.role),
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get current user error:', error)

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user information',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    )
  }
}

/**
 * Get permissions based on user role
 */
function getRolePermissions(role: string): string[] {
  const permissions: Record<string, string[]> = {
    ADMIN: [
      'users.create',
      'users.read',
      'users.update',
      'users.delete',
      'products.create',
      'products.read',
      'products.update',
      'products.delete',
      'categories.create',
      'categories.read',
      'categories.update',
      'categories.delete',
      'orders.read',
      'orders.update',
      'media.create',
      'media.read',
      'media.update',
      'media.delete',
      'analytics.read',
      'settings.read',
      'settings.update',
    ],
    EDITOR: [
      'products.create',
      'products.read',
      'products.update',
      'categories.create',
      'categories.read',
      'categories.update',
      'orders.read',
      'orders.update',
      'media.create',
      'media.read',
      'media.update',
      'analytics.read',
    ],
    VIEWER: [
      'products.read',
      'categories.read',
      'orders.read',
      'media.read',
      'analytics.read',
    ],
  }

  return permissions[role] || []
}