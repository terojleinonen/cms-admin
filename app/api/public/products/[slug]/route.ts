/**
 * Public Single Product API
 * Provides read-only access to a single published product by slug or ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Helper function to check if string is a valid UUID
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Determine if the parameter is an ID (UUID) or slug
    const isId = isValidUUID(slug)
    
    const product = await prisma.product.findUnique({
      where: isId 
        ? { id: slug, status: 'PUBLISHED' }
        : { slug, status: 'PUBLISHED' },
      include: {
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true
              }
            }
          }
        },
        media: {
          include: {
            media: {
              select: {
                id: true,
                filename: true,
                originalName: true,
                altText: true,
                width: true,
                height: true
              }
            }
          },
          orderBy: [
            { isPrimary: 'desc' },
            { sortOrder: 'asc' }
          ]
        }
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Transform data for frontend consumption
    const transformedProduct = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      shortDescription: product.shortDescription,
      price: product.price,
      comparePrice: product.comparePrice,
      sku: product.sku,
      inventoryQuantity: product.inventoryQuantity,
      weight: product.weight,
      dimensions: product.dimensions,
      status: product.status,
      featured: product.featured,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      categories: product.categories.map(pc => pc.category),
      media: product.media.map(pm => ({
        id: pm.media.id,
        filename: pm.media.filename,
        originalName: pm.media.originalName,
        altText: pm.media.altText,
        width: pm.media.width,
        height: pm.media.height,
        sortOrder: pm.sortOrder,
        isPrimary: pm.isPrimary
      }))
    }

    return NextResponse.json(transformedProduct)

  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}