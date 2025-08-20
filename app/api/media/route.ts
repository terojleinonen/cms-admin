/**
 * Media API Route Handler
 * Handles media file operations including upload, listing, and management
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../lib/auth-config'
import { prisma } from '../../lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

/**
 * GET /api/media
 * Retrieve media files with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ 
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' } 
      }, { status: 401 })
    }

    // Check role permissions - VIEWER role cannot access media management
    if (session.user.role === 'VIEWER') {
      return NextResponse.json({ 
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } 
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type')
    const search = searchParams.get('search')

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    if (type) {
      where.mimeType = { startsWith: type }
    }
    if (search) {
      where.OR = [
        { filename: { contains: search, mode: 'insensitive' } },
        { altText: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      prisma.media.count({ where })
    ])

    return NextResponse.json({
      mediaFiles: media,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Media GET error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch media' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/media
 * Upload new media files
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ 
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' } 
      }, { status: 401 })
    }

    // Check role permissions - VIEWER role cannot upload media
    if (session.user.role === 'VIEWER') {
      return NextResponse.json({ 
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } 
      }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const altText = formData.get('altText') as string || ''
    const folder = formData.get('folder') as string || 'uploads'

    if (!file) {
      return NextResponse.json({ 
        error: { code: 'VALIDATION_ERROR', message: 'No files provided' } 
      }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: { code: 'VALIDATION_ERROR', message: 'Invalid file type' } 
      }, { status: 400 })
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: { code: 'VALIDATION_ERROR', message: 'File too large' } 
      }, { status: 400 })
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()
    const uniqueFilename = `${uuidv4()}.${fileExtension}`
    
    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', folder)
    await mkdir(uploadDir, { recursive: true })

    // Save file
    const filePath = join(uploadDir, uniqueFilename)
    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    // Save to database
    const media = await prisma.media.create({
      data: {
        filename: uniqueFilename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: `/uploads/${folder}/${uniqueFilename}`,
        altText,
        uploadedById: session.user.id,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json({ media }, { status: 201 })

  } catch (error) {
    console.error('Media POST error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to upload media' } },
      { status: 500 }
    )
  }
}