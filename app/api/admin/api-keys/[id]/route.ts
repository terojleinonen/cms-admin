/**
 * Individual API Key Management
 * Admin endpoints for managing specific API keys
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema
const updateApiKeySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  permissions: z.array(z.string()).min(1).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional()
});

// GET /api/admin/api-keys/[id] - Get specific API key
export const GET = withApiPermissions(
  async (request: NextRequest, { user, params }) => {
    try {
      const { id } = await params;
    const apiKey = await prisma.apiKey.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        permissions: true,
        isActive: true,
        lastUsed: true,
        createdAt: true,
        expiresAt: true,
        creator: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    return createApiSuccessResponse( apiKey );

  } catch (error) {
    console.error('Error fetching API key:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API key' },
      { status: 500 }
    );
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)

// PUT /api/admin/api-keys/[id] - Update API key
export const PUT = withApiPermissions(
  async (request: NextRequest, { user, params }) => {
    try {
      const { id } = await params;
    const body = await request.json();
    const validatedData = updateApiKeySchema.parse(body);

    // Check if API key exists
    const existingKey = await prisma.apiKey.findUnique({
      where: { id }
    });

    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Update API key
    const updatedKey = await prisma.apiKey.update({
      where: { id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.permissions && { permissions: validatedData.permissions }),
        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
        ...(validatedData.expiresAt !== undefined && { 
          expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null 
        })
      },
      select: {
        id: true,
        name: true,
        permissions: true,
        isActive: true,
        lastUsed: true,
        createdAt: true,
        expiresAt: true
      }
    });

    return createApiSuccessResponse({
      apiKey: updatedKey,
      message: 'API key updated successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating API key:', error);
    return NextResponse.json(
      { error: 'Failed to update API key' },
      { status: 500 }
    );
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)

// DELETE /api/admin/api-keys/[id] - Delete API key
export const DELETE = withApiPermissions(
  async (request: NextRequest, { user, params }) => {
    try {
      const { id } = await params;
    // Check if API key exists
    const existingKey = await prisma.apiKey.findUnique({
      where: { id }
    });

    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Delete API key and related usage logs
    await prisma.apiKey.delete({
      where: { id }
    });

    return createApiSuccessResponse({
      message: 'API key deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)