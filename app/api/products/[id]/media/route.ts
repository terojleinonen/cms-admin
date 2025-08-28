/**
 * Product Media Management API
 * Handles CRUD operations for product-media associations
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schemas
const addMediaSchema = z.object({
  mediaIds: z.array(z.string().uuid()),
  isPrimary: z.boolean().optional().default(false)
})

const updateMediaOrderSchema = z.object({
  mediaOrder: z.array(z.object({
    mediaId: z.string().uuid(),
    sortOrder: z.number().int().min(0)
  }))
})

const setPrimaryMediaSchema = z.object({
  mediaId: z.string().uuid()
})

// GET /api/products/[id]/media - Get product media
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const productId = params.id

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Get product media with media details
    const productMedia = await prisma.productMedia.findMany({
      where: { productId },
      include: {
        media: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            fileSize: true,
            width: true,
            height: true,
            altText: true,
            folder: true,
            createdAt: true
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json({
      productMedia: productMedia.map(pm => ({
        mediaId: pm.mediaId,
        sortOrder: pm.sortOrder,
        isPrimary: pm.isPrimary,
        media: pm.media
      }))
    })

  } catch (error) {
    console.error('Error fetching product media:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product media' },
      { status: 500 }
    )
  }
}

// POST /api/products/[id]/media - Add media to product
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const productId = params.id
    const body = await request.json()
    const { mediaIds, isPrimary } = addMediaSchema.parse(body)

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Verify all media files exist
    const mediaFiles = await prisma.media.findMany({
      where: { id: { in: mediaIds } }
    })

    if (mediaFiles.length !== mediaIds.length) {
      return NextResponse.json({ error: 'Some media files not found' }, { status: 404 })
    }

    // Get current max sort order
    const maxSortOrder = await prisma.productMedia.aggregate({
      where: { productId },
      _max: { sortOrder: true }
    })

    const startSortOrder = (maxSortOrder._max.sortOrder || -1) + 1

    // If setting as primary, remove primary flag from other media
    if (isPrimary) {
      await prisma.productMedia.updateMany({
        where: { productId },
        data: { isPrimary: false }
      })
    }

    // Create product-media associations
    const productMediaData = mediaIds.map((mediaId, index) => ({
      productId,
      mediaId,
      sortOrder: startSortOrder + index,
      isPrimary: isPrimary && index === 0 // Only first media can be primary
    }))

    await prisma.productMedia.createMany({
      data: productMediaData,
      skipDuplicates: true
    })

    // Return updated product media
    const updatedProductMedia = await prisma.productMedia.findMany({
      where: { productId },
      include: {
        media: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            fileSize: true,
            width: true,
            height: true,
            altText: true,
            folder: true,
            createdAt: true
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json({
      message: 'Media added to product successfully',
      productMedia: updatedProductMedia.map(pm => ({
        mediaId: pm.mediaId,
        sortOrder: pm.sortOrder,
        isPrimary: pm.isPrimary,
        media: pm.media
      }))
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error adding media to product:', error)
    return NextResponse.json(
      { error: 'Failed to add media to product' },
      { status: 500 }
    )
  }
}

// PUT /api/products/[id]/media - Update media order or set primary
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const productId = params.id
    const body = await request.json()

    // Handle media order update
    if (body.mediaOrder) {
      const { mediaOrder } = updateMediaOrderSchema.parse(body)

      // Update sort orders in a transaction
      await prisma.$transaction(
        mediaOrder.map(({ mediaId, sortOrder }) =>
          prisma.productMedia.update({
            where: {
              productId_mediaId: {
                productId,
                mediaId
              }
            },
            data: { sortOrder }
          })
        )
      )

      return NextResponse.json({ message: 'Media order updated successfully' })
    }

    // Handle primary media setting
    if (body.mediaId) {
      const { mediaId } = setPrimaryMediaSchema.parse(body)

      // Remove primary flag from all media, then set new primary
      await prisma.$transaction([
        prisma.productMedia.updateMany({
          where: { productId },
          data: { isPrimary: false }
        }),
        prisma.productMedia.update({
          where: {
            productId_mediaId: {
              productId,
              mediaId
            }
          },
          data: { isPrimary: true }
        })
      ])

      return NextResponse.json({ message: 'Primary media updated successfully' })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating product media:', error)
    return NextResponse.json(
      { error: 'Failed to update product media' },
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id]/media - Remove media from product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const productId = params.id
    const { searchParams } = new URL(request.url)
    const mediaIds = searchParams.get('mediaIds')?.split(',') || []

    if (mediaIds.length === 0) {
      return NextResponse.json({ error: 'No media IDs provided' }, { status: 400 })
    }

    // Remove product-media associations
    await prisma.productMedia.deleteMany({
      where: {
        productId,
        mediaId: { in: mediaIds }
      }
    })

    return NextResponse.json({ message: 'Media removed from product successfully' })

  } catch (error) {
    console.error('Error removing media from product:', error)
    return NextResponse.json(
      { error: 'Failed to remove media from product' },
      { status: 500 }
    )
  }
}