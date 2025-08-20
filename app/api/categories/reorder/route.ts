/**
 * Category Reorder API Route
 * Handles drag-and-drop reordering of categories
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../lib/auth-config'
import { prisma } from '../../../lib/db'
import { z } from 'zod'

const reorderSchema = z.object({
  categoryId: z.string().uuid(),
  newParentId: z.string().uuid().nullable(),
  newSortOrder: z.number().int().min(0),
})

const reorderBatchSchema = z.array(reorderSchema)

/**
 * POST /api/categories/reorder
 * Reorder categories with drag-and-drop support
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const updates = reorderBatchSchema.parse(body)

    // Validate all categories exist and prevent circular references
    for (const update of updates) {
      const category = await prisma.category.findUnique({
        where: { id: update.categoryId },
      })

      if (!category) {
        return NextResponse.json(
          { error: `Category ${update.categoryId} not found` },
          { status: 400 }
        )
      }

      // Prevent setting self as parent
      if (update.newParentId === update.categoryId) {
        return NextResponse.json(
          { error: 'Category cannot be its own parent' },
          { status: 400 }
        )
      }

      // Check for circular references if parent is being changed
      if (update.newParentId && update.newParentId !== category.parentId) {
        let currentParent = await prisma.category.findUnique({
          where: { id: update.newParentId },
        })

        while (currentParent) {
          if (currentParent.id === update.categoryId) {
            return NextResponse.json(
              { error: 'Cannot create circular reference in category hierarchy' },
              { status: 400 }
            )
          }
          
          if (currentParent.parentId) {
            currentParent = await prisma.category.findUnique({
              where: { id: currentParent.parentId },
            })
          } else {
            break
          }
        }
      }
    }

    // Perform updates in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedCategories = []

      for (const update of updates) {
        const updatedCategory = await tx.category.update({
          where: { id: update.categoryId },
          data: {
            parentId: update.newParentId,
            sortOrder: update.newSortOrder,
          },
          include: {
            children: {
              orderBy: { sortOrder: 'asc' },
            },
            parent: true,
            _count: {
              select: {
                products: true,
                children: true,
              },
            },
          },
        })

        updatedCategories.push(updatedCategory)
      }

      return updatedCategories
    })

    return NextResponse.json({ categories: result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error reordering categories:', error)
    return NextResponse.json(
      { error: 'Failed to reorder categories' },
      { status: 500 }
    )
  }
}