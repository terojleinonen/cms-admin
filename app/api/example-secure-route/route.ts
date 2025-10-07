/**
 * Example of a secure API route with comprehensive input validation
 * This demonstrates how to apply the new validation system to API endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSecureAPIRoute } from '@/lib/api-route-validator'
import { secureValidationSchemas } from '@/lib/input-validation'

// Define validation schemas for this route
const createExampleSchema = z.object({
  name: secureValidationSchemas.secureString(100),
  email: secureValidationSchemas.secureEmail,
  description: secureValidationSchemas.secureHTML(),
  tags: secureValidationSchemas.secureArray(secureValidationSchemas.secureString(50), 10),
  isActive: secureValidationSchemas.secureBoolean,
})

const queryExampleSchema = z.object({
  page: z.string().transform(Number).pipe(secureValidationSchemas.secureInteger.positive()).default(1),
  limit: z.string().transform(Number).pipe(secureValidationSchemas.secureInteger.positive().max(100)).default(10),
  search: secureValidationSchemas.secureString(255).optional(),
  sortBy: z.enum(['name', 'email', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

const paramsExampleSchema = z.object({
  id: z.string().uuid('Invalid ID format')
})

// GET /api/example-secure-route - List items with validation
export const GET = createSecureAPIRoute(
  async (request: NextRequest, { query }) => {
    // The query data is already validated and sanitized
    const { page, limit, search, sortBy, sortOrder } = query

    // Your business logic here
    const items = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Example Item',
        email: 'example@test.com',
        description: 'This is a safe description',
        tags: ['tag1', 'tag2'],
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ]

    return NextResponse.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total: items.length,
          totalPages: Math.ceil(items.length / limit)
        }
      }
    })
  },
  {
    querySchema: queryExampleSchema,
    allowedMethods: ['GET'],
    permissions: { resource: 'examples', action: 'read' },
    rateLimit: 'public'
  }
)

// POST /api/example-secure-route - Create item with validation
export const POST = createSecureAPIRoute(
  async (request: NextRequest, { body }) => {
    // The body data is already validated and sanitized
    const { name, email, description, tags, isActive } = body

    // Your business logic here - create the item
    const newItem = {
      id: crypto.randomUUID(),
      name,
      email,
      description,
      tags,
      isActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: newItem,
      message: 'Item created successfully'
    }, { status: 201 })
  },
  {
    bodySchema: createExampleSchema,
    requireBody: true,
    allowedMethods: ['POST'],
    permissions: { resource: 'examples', action: 'create' },
    rateLimit: 'sensitive',
    requireCSRF: true
  }
)

// PUT /api/example-secure-route/[id] - Update item with validation
export const PUT = createSecureAPIRoute(
  async (request: NextRequest, { body, params }) => {
    // Both body and params are validated and sanitized
    const { id } = params
    const updateData = body

    // Your business logic here - update the item
    const updatedItem = {
      id,
      ...updateData,
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: updatedItem,
      message: 'Item updated successfully'
    })
  },
  {
    bodySchema: createExampleSchema.partial(), // Allow partial updates
    paramsSchema: paramsExampleSchema,
    requireBody: true,
    allowedMethods: ['PUT'],
    permissions: { resource: 'examples', action: 'update' },
    rateLimit: 'sensitive',
    requireCSRF: true
  }
)

// DELETE /api/example-secure-route/[id] - Delete item with validation
export const DELETE = createSecureAPIRoute(
  async (request: NextRequest, { params }) => {
    // Params are validated and sanitized
    const { id } = params

    // Your business logic here - delete the item
    // In a real app, you'd delete from database

    return NextResponse.json({
      success: true,
      message: 'Item deleted successfully'
    })
  },
  {
    paramsSchema: paramsExampleSchema,
    allowedMethods: ['DELETE'],
    permissions: { resource: 'examples', action: 'delete' },
    rateLimit: 'sensitive',
    requireCSRF: true
  }
)