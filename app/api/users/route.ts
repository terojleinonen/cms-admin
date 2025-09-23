/**
 * Users API endpoints
 * Handles CRUD operations for user management
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/password-utils'
import { UserRole } from '@prisma/client'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { withAPISecurity, validateAndSanitizeBody } from '@/lib/api-security'
import { validationSchemas } from '@/lib/validation-schemas'

// Use centralized validation schemas
const { user: userSchemas } = validationSchemas

// This function is no longer needed as permission checking is handled by middleware

// GET /api/users - List users with pagination and filtering
export const GET = withAPISecurity(
  withApiPermissions(
    async (request: NextRequest, { user }) => {
      try {
        // Validate query parameters
        const { searchParams } = new URL(request.url)
        const queryValidation = userSchemas.query.safeParse(Object.fromEntries(searchParams))
        
        if (!queryValidation.success) {
          return NextResponse.json(
            {
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid query parameters',
                details: queryValidation.error.flatten().fieldErrors,
                timestamp: new Date().toISOString(),
              },
              success: false,
            },
            { status: 400 }
          )
        }

        const query = queryValidation.data

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

        if (query.isActive !== undefined) {
          where.isActive = query.isActive
        }

        // Get total count for pagination
        const total = await prisma.user.count({ where })

        // Get users with pagination
        const users = await prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                createdProducts: true,
                createdPages: true,
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

        return createApiSuccessResponse({
          users,
          pagination: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages,
          },
        })
      } catch (error) {
        console.error('Error fetching users:', error)
        
        return NextResponse.json(
          { 
            error: { 
              code: 'INTERNAL_ERROR', 
              message: 'Failed to fetch users',
              timestamp: new Date().toISOString()
            },
            success: false
          },
          { status: 500 }
        )
      }
    },
    {
      permissions: [{ resource: 'users', action: 'read', scope: 'all' }]
    }
  ),
  {
    allowedMethods: ['GET'],
    rateLimitConfig: 'sensitive'
  }
)

// POST /api/users - Create new user
export const POST = withAPISecurity(
  withApiPermissions(
    async (request: NextRequest, { user }) => {
      try {
        // Validate and sanitize request body
        const bodyValidation = await validateAndSanitizeBody(request, userSchemas.create)
        
        if (!bodyValidation.success) {
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

        const data = bodyValidation.data

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: data.email }
        })

        if (existingUser) {
          return NextResponse.json(
            { 
              error: { 
                code: 'DUPLICATE_ENTRY', 
                message: 'Email already exists',
                timestamp: new Date().toISOString()
              },
              success: false
            },
            { status: 409 }
          )
        }

        // Hash password
        const passwordHash = await hashPassword(data.password)

        // Create user
        const newUser = await prisma.user.create({
          data: {
            name: data.name,
            email: data.email,
            passwordHash,
            role: data.role as UserRole,
            isActive: data.isActive,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          }
        })

        return createApiSuccessResponse({ user: newUser }, 201)
      } catch (error) {
        console.error('Error creating user:', error)
        
        return NextResponse.json(
          { 
            error: { 
              code: 'INTERNAL_ERROR', 
              message: 'Failed to create user',
              timestamp: new Date().toISOString()
            },
            success: false
          },
          { status: 500 }
        )
      }
    },
    {
      permissions: [{ resource: 'users', action: 'create', scope: 'all' }]
    }
  ),
  {
    allowedMethods: ['POST'],
    requireCSRF: true,
    rateLimitConfig: 'sensitive'
  }
)