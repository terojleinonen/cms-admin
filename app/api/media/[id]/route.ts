import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateMediaSchema = z.object({
  title: z.string().optional(),
  altText: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export const GET = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    , { status: 401 })
    }

    const { id } = params
    const media = await prisma.media.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    return createApiSuccessResponse( media )
  } catch (error) {
    console.error('Error fetching media:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  },
  {
  permissions: [{ resource: 'media', action: 'read', scope: 'all' }]
}
)

export const PUT = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    , { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const validatedData = updateMediaSchema.parse(body)

    const media = await prisma.media.findUnique({
      where: { id }
    })

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    const updatedMedia = await prisma.media.update({
      where: { id },
      data: validatedData,
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return createApiSuccessResponse( media: updatedMedia )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 })
    }
    console.error('Error updating media:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  },
  {
  permissions: [{ resource: 'media', action: 'update', scope: 'all' }]
}
)

export const DELETE = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    , { status: 401 })
    }

    const { id } = params
    const media = await prisma.media.findUnique({
      where: { id }
    })

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    await prisma.media.delete({
      where: { id }
    })

    return createApiSuccessResponse( message: 'Media deleted successfully' )
  } catch (error) {
    console.error('Error deleting media:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  },
  {
  permissions: [{ resource: 'media', action: 'delete', scope: 'all' }]
}
)