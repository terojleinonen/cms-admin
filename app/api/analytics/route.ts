/**
 * Analytics API
 * Provides basic dashboard metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSimpleAuth, createSuccessResponse, createErrorResponse } from '@/lib/simple-api-middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod';

// Simplified analytics query schema
const analyticsQuerySchema = z.object({
  type: z.enum(['overview', 'products', 'users']).default('overview')
});

// GET /api/analytics - Get basic analytics data
export const GET = withSimpleAuth(
  async (request: NextRequest, { user }) => {
    try {
      const { searchParams } = new URL(request.url);
      const type = searchParams.get('type') || 'overview';

      // Validate query parameters
      const validatedQuery = analyticsQuerySchema.parse({ type });

      switch (validatedQuery.type) {
        case 'overview':
          const [userCount, productCount, categoryCount] = await Promise.all([
            prisma.user.count(),
            prisma.product.count(),
            prisma.category.count()
          ]);
          
          return createSuccessResponse({
            users: userCount,
            products: productCount,
            categories: categoryCount
          });

        case 'products':
          const productStats = await prisma.product.groupBy({
            by: ['status'],
            _count: { status: true }
          });
          
          return createSuccessResponse({ productStats });

        case 'users':
          const userStats = await prisma.user.groupBy({
            by: ['role'],
            _count: { role: true }
          });
          
          return createSuccessResponse({ userStats });

        default:
          return createErrorResponse('Invalid analytics type');
      }

    } catch (error) {
      console.error('Analytics API error:', error);
      return createErrorResponse('Failed to fetch analytics', 500);
    }
  },
  {
    resource: 'analytics',
    action: 'read',
    allowedMethods: ['GET']
  }
)