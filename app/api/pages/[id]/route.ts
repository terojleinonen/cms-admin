/**
 * Individual Page API
 * Handles CRUD operations for specific pages
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { hasPermission } from '@/lib/has-permission'

const updatePageSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long').optional(),
  slug: z.string().min(1, 'Slug is required').max(255, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens').optional(),
  content: z.string().optional(),
  excerpt: z.string().optional(),
  status: z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']).optional(),
  template: z.string().optional(),
  seoTitle: z.string().max(255, 'SEO title too long').optional(),
  seoDescription: z.string().max(500, 'SEO description too long').optional(),
  publishedAt: z.string().datetime().optional().nullable()
})

// GET /api/pages/[id] - Get specific page
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const session = await getServerSession(authOptions)
    if (!hasPermission(session, 'read')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const page = await prisma.page.findUnique({
      where: { id },
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

    return NextResponse.json(page)

  } catch (error) {
    console.error('Error fetching page:', error)
    return NextResponse.json(
      { error: 'Failed to fetch page' },
      { status: 500 }
    )
  }
}

// PUT /api/pages/[id] - Update specific page
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const session = await getServerSession(authOptions)
    if (!hasPermission(session, 'update')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updatePageSchema.parse(body)

    // Check if page exists
    const existingPage = await prisma.page.findUnique({
      where: { id }
    })

    if (!existingPage) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    // Check if slug is being changed and if it conflicts
    if (validatedData.slug && validatedData.slug !== existingPage.slug) {
      const slugConflict = await prisma.page.findUnique({
        where: { slug: validatedData.slug }
      })

      if (slugConflict) {
        return NextResponse.json(
          { error: 'A page with this slug already exists' },
          { status: 409 }
        )
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = { ...validatedData }
    
    // Handle publishedAt
    if (validatedData.publishedAt !== undefined) {
      updateData.publishedAt = validatedData.publishedAt ? new Date(validatedData.publishedAt) : null
    }

    // Auto-set publishedAt when status changes to PUBLISHED
    if (validatedData.status === 'PUBLISHED' && existingPage.status !== 'PUBLISHED' && !updateData.publishedAt) {
      updateData.publishedAt = new Date()
    }

    // Update page
    const updatedPage = await prisma.page.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(updatedPage)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid page data', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating page:', error)
    return NextResponse.json(
      { error: 'Failed to update page' },
      { status: 500 }
    )
  }
}

// DELETE /api/pages/[id] - Delete specific page
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id:string } }
) {
  try {
    const { id } = params
    const session = await getServerSession(authOptions)
    if (!hasPermission(session, 'delete')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if page exists
    const existingPage = await prisma.page.findUnique({
      where: { id }
    })

    if (!existingPage) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    // Delete page
    await prisma.page.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Page deleted successfully' })

  } catch (error) {
    console.error('Error deleting page:', error)
    return NextResponse.json(
      { error: 'Failed to delete page' },
      { status: 500 }
    )
  }
}