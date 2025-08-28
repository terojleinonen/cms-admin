/**
 * User Avatar/Profile Picture API endpoints
 * Handles POST, DELETE operations for profile picture management
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth-config'
import { prisma } from '../../../../lib/db'
import { UserRole } from '@prisma/client'
import { 
  profilePictureService, 
  fileToBuffer, 
  PROFILE_PICTURE_CONFIG,
  formatFileSize
} from '../../../../lib/profile-image-utils'
import { getAuditService } from '../../../../lib/audit-service'

// Check if user has access to avatar operations
async function requireAvatarAccess(userId: string) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    )
  }

  const isOwnProfile = session.user.id === userId
  const isAdmin = session.user.role === UserRole.ADMIN

  if (!isAdmin && !isOwnProfile) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Access denied' } },
      { status: 403 }
    )
  }

  return null
}

// POST /api/users/[id]/avatar - Upload profile picture
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const authError = await requireAvatarAccess(resolvedParams.id)
    if (authError) return authError

    const session = await getServerSession(authOptions)

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true, name: true, profilePicture: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: { code: 'NO_FILE', message: 'No file provided' } },
        { status: 400 }
      )
    }

    // Validate file
    const validation = profilePictureService.validateFile(file)
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: { 
            code: 'INVALID_FILE', 
            message: 'Invalid file',
            details: validation.errors
          } 
        },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const fileBuffer = await fileToBuffer(file)

    // Delete existing profile picture if it exists
    if (user.profilePicture) {
      await profilePictureService.deleteProfilePicture(resolvedParams.id)
    }

    // Process the new profile picture
    const result = await profilePictureService.processProfilePicture(
      fileBuffer,
      resolvedParams.id,
      file.name
    )

    // Update user record with profile picture URL
    const profilePictureUrl = profilePictureService.getProfilePictureUrl(resolvedParams.id, 'medium')
    
    await prisma.user.update({
      where: { id: resolvedParams.id },
      data: { profilePicture: profilePictureUrl }
    })

    // Log the avatar upload
    const auditService = getAuditService(prisma)
    await auditService.logUser(
      session?.user?.id || resolvedParams.id,
      resolvedParams.id,
      'PROFILE_UPDATED',
      {
        action: 'avatar_uploaded',
        fileName: file.name,
        fileSize: file.size,
        compressionRatio: result.metadata.compressionRatio,
        isOwnProfile: session?.user?.id === resolvedParams.id,
      },
      request.headers.get('x-forwarded-for') || request.ip,
      request.headers.get('user-agent')
    )

    return NextResponse.json({
      message: 'Profile picture uploaded successfully',
      profilePicture: {
        url: profilePictureUrl,
        variants: result.variants.map(variant => ({
          size: variant.size,
          url: variant.url,
          width: variant.width,
          height: variant.height,
        })),
        metadata: {
          originalSize: formatFileSize(result.metadata.originalSize),
          processedSize: formatFileSize(result.metadata.processedSize),
          compressionRatio: `${result.metadata.compressionRatio}%`,
          format: result.metadata.format,
        }
      }
    })
  } catch (error) {
    console.error('Error uploading profile picture:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to upload profile picture' } },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id]/avatar - Remove profile picture
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const authError = await requireAvatarAccess(resolvedParams.id)
    if (authError) return authError

    const session = await getServerSession(authOptions)

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true, name: true, profilePicture: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    if (!user.profilePicture) {
      return NextResponse.json(
        { error: { code: 'NO_AVATAR', message: 'User has no profile picture' } },
        { status: 400 }
      )
    }

    // Delete profile picture files
    await profilePictureService.deleteProfilePicture(resolvedParams.id)

    // Update user record to remove profile picture
    await prisma.user.update({
      where: { id: resolvedParams.id },
      data: { profilePicture: null }
    })

    // Log the avatar removal
    const auditService = getAuditService(prisma)
    await auditService.logUser(
      session?.user?.id || resolvedParams.id,
      resolvedParams.id,
      'PROFILE_UPDATED',
      {
        action: 'avatar_removed',
        isOwnProfile: session?.user?.id === resolvedParams.id,
      },
      request.headers.get('x-forwarded-for') || request.ip,
      request.headers.get('user-agent')
    )

    return NextResponse.json({
      message: 'Profile picture removed successfully',
      defaultAvatar: {
        url: profilePictureService.getDefaultAvatarUrl(),
        initials: profilePictureService.generateInitials(user.name),
        backgroundColor: profilePictureService.generateAvatarColor(resolvedParams.id),
      }
    })
  } catch (error) {
    console.error('Error removing profile picture:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to remove profile picture' } },
      { status: 500 }
    )
  }
}

// GET /api/users/[id]/avatar - Get avatar information
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const authError = await requireAvatarAccess(resolvedParams.id)
    if (authError) return authError

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true, name: true, profilePicture: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    const hasProfilePicture = await profilePictureService.hasProfilePicture(resolvedParams.id)

    if (hasProfilePicture && user.profilePicture) {
      // Return profile picture information
      const variants = Object.keys(PROFILE_PICTURE_CONFIG.sizes).map(size => ({
        size,
        url: profilePictureService.getProfilePictureUrl(resolvedParams.id, size as any),
        width: PROFILE_PICTURE_CONFIG.sizes[size as keyof typeof PROFILE_PICTURE_CONFIG.sizes].width,
        height: PROFILE_PICTURE_CONFIG.sizes[size as keyof typeof PROFILE_PICTURE_CONFIG.sizes].height,
      }))

      return NextResponse.json({
        hasAvatar: true,
        profilePicture: {
          url: profilePictureService.getProfilePictureUrl(resolvedParams.id, 'medium'),
          variants,
        }
      })
    } else {
      // Return default avatar information
      return NextResponse.json({
        hasAvatar: false,
        defaultAvatar: {
          url: profilePictureService.getDefaultAvatarUrl(),
          initials: profilePictureService.generateInitials(user.name),
          backgroundColor: profilePictureService.generateAvatarColor(resolvedParams.id),
        }
      })
    }
  } catch (error) {
    console.error('Error fetching avatar information:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch avatar information' } },
      { status: 500 }
    )
  }
}