/**
 * Individual User Management API
 * Handles operations on individual users for admin interface
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'

// Check if user has admin permissions
async function requireAdminAccess() {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    )
  }

  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
      { status: 403 }
    )
  }

  return null
}

// GET /api/admin/users/[id] - Get detailed user information
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authError = await requireAdminAccess()
    if (authError) return authError

    const userId = params.id

    const user = await prisma.user.findUnique({
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

    if (!user) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })

  } catch (error) {
    console.error('Error fetching user details:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user details' } },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/users/[id] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authError = await requireAdminAccess()
    if (authError) return authError

    const session = await auth()
    const userId = params.id

    // Prevent admin from deleting themselves
    if (session?.user?.id === userId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Cannot delete your own account' } },
        { status: 403 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    })

    if (!user) {
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
        userId: session?.user?.id || 'system',
        action: 'USER_DELETED',
        resource: 'user',
        details: {
          deletedUser: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          deletedAt: new Date(),
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    })

    return NextResponse.json({
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
}