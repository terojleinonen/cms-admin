/**
 * Page Preview API
 * Handles page preview generation and preview URLs
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'
import { prisma } from '@/app/lib/prisma'
import { z } from 'zod'

const previewSchema = z.object({
  content: z.string().optional(),
  template: z.string().optional(),
  customFields: z.record(z.any()).optional()
})

// POST /api/pages/[id]/preview - Generate preview for page
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content, template, customFields } = previewSchema.parse(body)

    // Get the page
    const page = await prisma.page.findUnique({
      where: { id: params.id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    // Create preview data by merging page data with preview overrides
    const previewData = {
      ...page,
      content: content !== undefined ? content : page.content,
      template: template !== undefined ? template : page.template,
      customFields: customFields || {},
      isPreview: true,
      previewToken: generatePreviewToken()
    }

    // Store preview data temporarily (in a real app, you might use Redis or a cache)
    // For now, we'll just return the preview data
    return NextResponse.json({
      previewData,
      previewUrl: `/preview/${page.slug}?token=${previewData.previewToken}`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid preview data', details: error.errors },
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

// GET /api/pages/[id]/preview - Get preview URL for page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the page
    const page = await prisma.page.findUnique({
      where: { id: params.id }
    })

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    const previewToken = generatePreviewToken()
    
    return NextResponse.json({
      previewUrl: `/preview/${page.slug}?token=${previewToken}`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    })

  } catch (error) {
    console.error('Error getting page preview URL:', error)
    return NextResponse.json(
      { error: 'Failed to get preview URL' },
      { status: 500 }
    )
  }
}

// Helper function to generate preview tokens
function generatePreviewToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}