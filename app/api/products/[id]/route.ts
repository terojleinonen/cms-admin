/**
 * Individual Product API Routes
 * Handles operations for specific products
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../lib/auth-config'
import { prisma } from '../../../lib/db'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'

// Validation schema for updates
const updateProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  slug: z.string().min(1, 'Slug is required').max(255, 'Slug too long').optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  price: z.number().min(0, 'Price must be positive').optional(),
  comparePrice: z.number().min(0, 'Compare price must be positive').nullable().optional(),
  sku: z.string().max(100, 'SKU too long').nullable().optional(),
  inventoryQuantity: z.number().int().min(0, 'Inventory must be non-negative').optional(),
  weight: z.number().min(0, 'Weight must be positive').nullable().optional(),
  dimensions: z.any().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  featured: z.boolean().optional(),
  seoTitle: z.string().max(255, 'SEO title too long').nullable().optional(),
  seoDescription: z.string().nullable().optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
})

/**
 * GET /api/products/[id]
 * Get a specific product with all relations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
        media: {
          include: {
            media: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        _count: {
          select: {
            categories: true,
            media: true,
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Transform Decimal fields to numbers for JSON response
    const transformedProduct = {
      ...product,
      price: product.price.toNumber(),
      comparePrice: product.comparePrice?.toNumber() || null,
      weight: product.weight?.toNumber() || null,
    }

    return NextResponse.json({ product: transformedProduct })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/products/[id]
 * Update a specific product
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateProductSchema.parse(body)

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Check if slug is being changed and if it conflicts
    if (validatedData.slug && validatedData.slug !== existingProduct.slug) {
      const slugConflict = await prisma.product.findUnique({
        where: { slug: validatedData.slug },
      })

      if (slugConflict) {
        return NextResponse.json(
          { error: 'Product with this slug already exists' },
          { status: 400 }
        )
      }
    }

    // Check if SKU is being changed and if it conflicts
    if (validatedData.sku !== undefined && validatedData.sku !== existingProduct.sku) {
      if (validatedData.sku) {
        const skuConflict = await prisma.product.findUnique({
          where: { sku: validatedData.sku },
        })

        if (skuConflict) {
          return NextResponse.json(
            { error: 'Product with this SKU already exists' },
            { status: 400 }
          )
        }
      }
    }

    // Verify categories exist if being updated
    if (validatedData.categoryIds) {
      if (validatedData.categoryIds.length > 0) {
        const categories = await prisma.category.findMany({
          where: {
            id: { in: validatedData.categoryIds },
          },
        })

        if (categories.length !== validatedData.categoryIds.length) {
          return NextResponse.json(
            { error: 'One or more categories not found' },
            { status: 400 }
          )
        }
      }
    }

    // Prepare update data
    const { categoryIds, ...updateData } = validatedData
    
    // Convert numbers to Decimal where needed
    const processedUpdateData: any = { ...updateData }
    if (updateData.price !== undefined) {
      processedUpdateData.price = new Decimal(updateData.price)
    }
    if (updateData.comparePrice !== undefined) {
      processedUpdateData.comparePrice = updateData.comparePrice ? new Decimal(updateData.comparePrice) : null
    }
    if (updateData.weight !== undefined) {
      processedUpdateData.weight = updateData.weight ? new Decimal(updateData.weight) : null
    }

    // Update product with transaction for category updates
    const product = await prisma.$transaction(async (tx) => {
      // Update product data
      const updatedProduct = await tx.product.update({
        where: { id },
        data: processedUpdateData,
      })

      // Update categories if provided
      if (categoryIds !== undefined) {
        // Remove existing category associations
        await tx.productCategory.deleteMany({
          where: { productId: id },
        })

        // Add new category associations
        if (categoryIds.length > 0) {
          await tx.productCategory.createMany({
            data: categoryIds.map(categoryId => ({
              productId: id,
              categoryId,
            })),
          })
        }
      }

      // Return updated product with relations
      return await tx.product.findUnique({
        where: { id },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          categories: {
            include: {
              category: true,
            },
          },
          media: {
            include: {
              media: true,
            },
            orderBy: {
              sortOrder: 'asc',
            },
          },
          _count: {
            select: {
              categories: true,
              media: true,
            },
          },
        },
      })
    })

    // Transform Decimal fields to numbers for JSON response
    const transformedProduct = {
      ...product,
      price: product.price.toNumber(),
      comparePrice: product.comparePrice?.toNumber() || null,
      weight: product.weight?.toNumber() || null,
    }

    return NextResponse.json({ product: transformedProduct })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/products/[id]
 * Delete a specific product
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Delete product (cascade will handle related records)
    await prisma.product.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}