/**
 * Individual User Management API
 * Handles operations on individual users for admin interface
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { auth } from '@/auth'

// Check if user has admin permissions
async function requireAdminAccess() {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    )
  }

  if (session.user?.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
      { status: 403 }
    )
  }

  return null
}

// GET /api/admin/users/[id] - Get detailed user information
export const GET = withApiPermissions(
  async (request: NextRequest, { user, params }) => {
    
  try {
    const authError = await requireAdminAccess()
    if (authError) return authError

    const { id: userId } = await params || {}

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        profilePicture: true,
        emailVerified: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            createdProducts: true,
            createdPages: true,
            auditLogs: true,
            sessions: {
              where: {
                isActive: true,
                expiresAt: {
                  gt: new Date()
                }
              }
            }
          }
        },
        auditLogs: {
          take: 10,
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true,
            action: true,
            resource: true,
            details: true,
            createdAt: true,
          }
        }
      }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    return createApiSuccessResponse( targetUser )

  } catch (error) {
    console.error('Error fetching user details:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user details' } },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)

// DELETE /api/admin/users/[id] - Delete user
export const DELETE = withApiPermissions(
  async (request: NextRequest, { user, params }) => {
    
  try {
    const authError = await requireAdminAccess()
    if (authError) return authError

    const { id: userId } = await params || {}

    // Prevent admin from deleting themselves
    if ((user?.id || '') === userId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Cannot delete your own account' } },
        { status: 403 }
      )
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    // The schema is now configured to handle cascading deletes and setting fields to null.
    // We can directly delete the user.
    await prisma.user.delete({
      where: { id: userId },
    })

    // Create audit log for user deletion
    await prisma.auditLog.create({
      data: {
        userId: user?.id || 'system',
        action: 'USER_DELETED',
        resource: 'user',
        details: {
          deletedUser: {
            id: targetUser.id,
            name: targetUser.name,
            email: targetUser.email,
            role: targetUser.role,
          },
          deletedAt: new Date(),
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    })

    return createApiSuccessResponse({
      success: true,
      message: 'User deleted successfully',
    })

  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete user' } },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)