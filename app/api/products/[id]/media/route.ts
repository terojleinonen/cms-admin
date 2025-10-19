/**
 * Product Media Management API
 * Handles CRUD operations for product-media associations
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { ProductMedia, Media } from '@prisma/client'

type ProductMediaWithMedia = ProductMedia & {
  media: Media | null
}

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
export const GET = withApiPermissions(
  async (request: NextRequest, { user, params }) => {
    
  try {
    if (!user) {
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
            createdAt: true,
            createdBy: true
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    })

    return createApiSuccessResponse({
      productMedia: productMedia.map((pm: ProductMediaWithMedia) => ({
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

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)

// POST /api/products/[id]/media - Add media to product
export const POST = withApiPermissions(
  async (request: NextRequest, { user, params }) => {
    
  try {
    if (!user) {
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
            createdAt: true,
            createdBy: true
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    })

    return createApiSuccessResponse({
      message: 'Media added to product successfully',
      productMedia: updatedProductMedia.map((pm: ProductMediaWithMedia) => ({
        mediaId: pm.mediaId,
        sortOrder: pm.sortOrder,
        isPrimary: pm.isPrimary,
        media: pm.media
      }))
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error adding media to product:', error)
    return NextResponse.json(
      { error: 'Failed to add media to product' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)

// PUT /api/products/[id]/media - Update media order or set primary
export const PUT = withApiPermissions(
  async (request: NextRequest, { user, params }) => {
    
  try {
    if (!user) {
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

      return createApiSuccessResponse({ message: 'Media order updated successfully' })
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

      return createApiSuccessResponse({ message: 'Primary media updated successfully' })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating product media:', error)
    return NextResponse.json(
      { error: 'Failed to update product media' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)

// DELETE /api/products/[id]/media - Remove media from product
export const DELETE = withApiPermissions(
  async (request: NextRequest, { user, params }) => {
    
  try {
    if (!user) {
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

    return createApiSuccessResponse({ message: 'Media removed from product successfully' })

  } catch (error) {
    console.error('Error removing media from product:', error)
    return NextResponse.json(
      { error: 'Failed to remove media from product' },
      { status: 500 }
    )
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)