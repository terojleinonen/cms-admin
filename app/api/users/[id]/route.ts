/**
 * Individual user API endpoints
 * Handles GET, PUT, DELETE operations for specific users
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/password-utils'
import { UserRole } from '@prisma/client'
import { z } from 'zod'
import { formatValidationErrors } from '@/lib/user-validation-schemas'
import { profilePictureService } from '@/lib/profile-image-utils'
import { getAuditService } from '@/lib/audit-service'

const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  email: z.string().email('Invalid email format').max(255).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']).optional(),
  isActive: z.boolean().optional(),
  profilePicture: z.string().url().optional().nullable(),
})

// Check if user has admin permissions or is updating their own profile
async function requireUserAccess(userId: string, requireAdmin = false) {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    )
  }

  const isOwnProfile = session.user.id === userId
  const isAdmin = session.user.role === UserRole.ADMIN

  if (requireAdmin && !isAdmin) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
      { status: 403 }
    )
  }

  if (!isAdmin && !isOwnProfile) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Access denied' } },
      { status: 403 }
    )
  }

  return null
}

// GET /api/users/[id] - Get user by ID
export const GET = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    const resolvedParams = await params
    const authError = await requireUserAccess(resolvedParams.id)
    if (authError) return authError

    const user = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
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
        preferences: {
          select: {
            theme: true,
            timezone: true,
            language: true,
            notifications: true,
            dashboard: true,
          }
        },
        _count: {
          select: {
            createdProducts: true,
            createdPages: true,
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

    // Generate profile picture URL if user has one
    const profilePictureUrl = user.profilePicture 
      ? profilePictureService.getProfilePictureUrl(user.id, 'medium')
      : null

    return NextResponse.json({ 
      user: {
        ...user,
        profilePictureUrl
      }
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user' } },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'users', action: 'read', scope: 'all' }]
}
)

// PUT /api/users/[id] - Update user
export const PUT = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    const resolvedParams = await params
    const isOwnProfile = session?.user?.id === resolvedParams.id
    const isAdmin = session?.user?.role === UserRole.ADMIN

    // For role changes, require admin access
    const body = await request.json()
    const requireAdmin = 'role' in body || 'isActive' in body
    
    const authError = await requireUserAccess(resolvedParams.id, requireAdmin)
    if (authError) return authError

    const data = updateUserSchema.parse(body)

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: resolvedParams.id }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    // Check email uniqueness if email is being changed
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: data.email }
      })

      if (emailExists) {
        return NextResponse.json(
          { error: { code: 'DUPLICATE_ENTRY', message: 'Email already exists' } },
          { status: 409 }
        )
      }
    }

    // Prevent users from changing their own role or active status
    if (isOwnProfile && !isAdmin) {
      delete data.role
      delete data.isActive
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {}
    
    if (data.name) updateData.name = data.name
    if (data.email) updateData.email = data.email
    if (data.role && isAdmin) updateData.role = data.role as UserRole
    if (typeof data.isActive === 'boolean' && isAdmin) updateData.isActive = data.isActive
    if (typeof data.profilePicture === 'string') updateData.profilePicture = data.profilePicture
    
    if (data.password) {
      updateData.passwordHash = await hashPassword(data.password)
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: resolvedParams.id },
      data: updateData,
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
      }
    })

    // Log the profile update
    const auditService = getAuditService(prisma)
    await auditService.logUser(
      session?.user?.id || resolvedParams.id,
      resolvedParams.id,
      'PROFILE_UPDATED',
      {
        updatedFields: Object.keys(updateData),
        isOwnProfile,
      },
      request.headers.get('x-forwarded-for') || '',
      request.headers.get('user-agent') || undefined
    )

    // Generate profile picture URL if user has one
    const profilePictureUrl = user.profilePicture 
      ? profilePictureService.getProfilePictureUrl(user.id, 'medium')
      : null

    return NextResponse.json({ 
      user: {
        ...user,
        profilePictureUrl
      }
    })
  } catch (error) {
    console.error('Error updating user:', error)
    
    if (error instanceof z.ZodError) {
      const validationErrors = formatValidationErrors(error)
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: validationErrors.message,
            details: validationErrors.errors
          } 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update user' } },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'users', action: 'update', scope: 'all' }]
}
)

// DELETE /api/users/[id] - Delete user (admin only)
export const DELETE = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    const resolvedParams = await params
    const authError = await requireUserAccess(resolvedParams.id, true) // Require admin
    if (authError) return authError

    // Prevent self-deletion
    if (session?.user?.id === resolvedParams.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Cannot delete your own account' } },
        { status: 403 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: resolvedParams.id }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    // Delete profile picture files
    await profilePictureService.deleteProfilePicture(resolvedParams.id)

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id: resolvedParams.id }
    })

    // Log the user deletion
    const auditService = getAuditService(prisma)
    await auditService.logUser(
      session?.user?.id || '',
      resolvedParams.id,
      'DELETED',
      {
        deletedUserName: existingUser.name,
        deletedUserEmail: existingUser.email,
      },
      request.headers.get('x-forwarded-for') || '',
      request.headers.get('user-agent') || undefined
    )

    return createApiSuccessResponse( message: 'User deleted successfully' )
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete user' } },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'users', action: 'delete', scope: 'all' }]
}
)