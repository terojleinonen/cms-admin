/**
 * Public Categories API
 * Provides read-only access to active categories for the e-commerce frontend
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeHierarchy = searchParams.get('hierarchy') === 'true'

    if (includeHierarchy) {
      // Fetch hierarchical categories (parent-child structure)
      const categories = await prisma.category.findMany({
        where: {
          isActive: true,
          parentId: null // Start with root categories
        },
        include: {
          children: {
            where: { isActive: true },
            include: {
              children: {
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' }
              }
            },
            orderBy: { sortOrder: 'asc' }
          },
          _count: {
            select: {
              products: {
                where: {
                  product: {
                    status: 'PUBLISHED'
                  }
                }
              }
            }
          }
        },
        orderBy: { sortOrder: 'asc' }
      })

      // Transform hierarchical data
      const transformedCategories = categories.map(category => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        sortOrder: category.sortOrder,
        productCount: category._count.products,
        children: category.children.map(child => ({
          id: child.id,
          name: child.name,
          slug: child.slug,
          description: child.description,
          sortOrder: child.sortOrder,
          productCount: child._count?.products || 0,
          children: child.children?.map(grandchild => ({
            id: grandchild.id,
            name: grandchild.name,
            slug: grandchild.slug,
            description: grandchild.description,
            sortOrder: grandchild.sortOrder,
            productCount: grandchild._count?.products || 0
          })) || []
        }))
      }))

      return NextResponse.json(transformedCategories)
    } else {
      // Fetch flat list of all active categories
      const categories = await prisma.category.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: {
              products: {
                where: {
                  product: {
                    status: 'PUBLISHED'
                  }
                }
              }
            }
          }
        },
        orderBy: { sortOrder: 'asc' }
      })

      // Transform flat data
      const transformedCategories = categories.map(category => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        parentId: category.parentId,
        sortOrder: category.sortOrder,
        productCount: category._count.products
      }))

      return NextResponse.json(transformedCategories)
    }

  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}