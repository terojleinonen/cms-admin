/**
 * Admin Users API endpoints
 * Enhanced user management with detailed information and statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

// Validation schemas
const querySchema = z.object({
  page: z.string().transform(Number).default(() => 1),
  limit: z.string().transform(Number).default(() => 10),
  search: z.string().optional(),
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  sortBy: z.enum(['name', 'email', 'role', 'createdAt', 'lastLoginAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

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

// GET /api/admin/users - Enhanced user listing with detailed statistics
export const GET = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    const authError = await requireAdminAccess()
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const query = querySchema.parse(Object.fromEntries(searchParams))

    // Build where clause for filtering
    const where: Record<string, unknown> = {}
    
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    if (query.role) {
      where.role = query.role
    }

    if (query.status) {
      where.isActive = query.status === 'active'
    }

    // Get total count for pagination
    const total = await prisma.user.count({ where })

    // Get users with enhanced data
    const users = await prisma.user.findMany({
      where,
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
        }
      },
      orderBy: {
        [query.sortBy]: query.sortOrder,
      },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    })

    const totalPages = Math.ceil(total / query.limit)

    return NextResponse.json({
      users,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Error fetching admin users:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters', details: error.issues } },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch users' } },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)