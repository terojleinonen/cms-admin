/**
 * API Key Management
 * Admin endpoints for managing API keys
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth"
import { ApiAuthService } from '@/lib/api-auth';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
  expiresAt: z.string().datetime().optional()
});

// GET /api/admin/api-keys - List API keys
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKeys = await prisma.apiKey.findMany({
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
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ apiKeys });

  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

// POST /api/admin/api-keys - Create new API key
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createApiKeySchema.parse(body);

    // Create API key
    const result = await ApiAuthService.createApiKey(
      session.user.id,
      validatedData.name,
      validatedData.permissions
    );

    return NextResponse.json({
      id: result.id,
      apiKey: result.key,
      message: 'API key created successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating API key:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}