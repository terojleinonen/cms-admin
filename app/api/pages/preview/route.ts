/**
 * Page Preview API for New Pages
 * Handles preview generation for pages that haven't been saved yet
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth-config'
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
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
        { error: 'Invalid page data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error generating page preview:', error)
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    )
  }
}

// Helper function to generate preview tokens
function generatePreviewToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}