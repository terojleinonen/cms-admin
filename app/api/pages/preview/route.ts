/**
 * Page Preview API for New Pages
 * Handles preview generation for pages that haven't been saved yet
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { z } from 'zod'

const previewSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  content: z.string().optional(),
  excerpt: z.string().optional(),
  template: z.string().default('default'),
  status: z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional()
})

// POST /api/pages/preview - Generate preview for unsaved page
export const POST = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    , { status: 401 })
    }

    const body = await request.json()
    const pageData = previewSchema.parse(body)

    // Generate preview token
    const previewToken = generatePreviewToken()

    // Create preview data
    const previewData = {
      ...pageData,
      id: `preview-${previewToken}`,
      isPreview: true,
      previewToken,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      creator: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email
      }
    }

    // In a real application, you would store this preview data temporarily
    // For now, we'll encode it in the URL or use a simple in-memory store
    
    return NextResponse.json({
      previewData,
      previewUrl: `/preview/new?token=${previewToken}&data=${encodeURIComponent(JSON.stringify(previewData))}`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid page data', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error generating page preview:', error)
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'pages', action: 'create', scope: 'all' }]
}
)

// Helper function to generate preview tokens
function generatePreviewToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}