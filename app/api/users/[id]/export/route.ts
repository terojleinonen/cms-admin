/**
 * User Data Export API
 * Handles user data export for privacy compliance (GDPR, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { z } from 'zod'
import { getAuditService } from '@/lib/audit-service'
import { User, UserPreferences, AuditLog, Session, Product, Page, Media } from '@prisma/client'

interface UserExport extends Omit<User, 'passwordHash' | 'twoFactorSecret'> {
  profilePicture: string | null;
}

interface ExportMetadata {
  exportedAt: string;
  exportedBy: string | undefined;
  format: 'json' | 'csv';
  includes: {
    auditLogs: boolean;
    preferences: boolean;
    sessions: boolean;
    createdContent: boolean;
  };
}

interface CreatedContent {
  products: Pick<Product, 'id' | 'name' | 'slug' | 'status' | 'createdAt' | 'updatedAt'>[];
  pages: Pick<Page, 'id' | 'title' | 'slug' | 'status' | 'createdAt' | 'updatedAt'>[];
  media: Pick<Media, 'id' | 'filename' | 'originalName' | 'mimeType' | 'fileSize' | 'createdAt'>[];
  summary: {
    totalProducts: number;
    totalPages: number;
    totalMediaFiles: number;
  };
}

interface ExportData {
  user: UserExport;
  exportMetadata: ExportMetadata;
  preferences?: UserPreferences | null;
  auditLogs?: AuditLog[];
  sessions?: Session[];
  createdContent?: CreatedContent;
}

const exportQuerySchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  includeAuditLogs: z.boolean().default(true),
  includePreferences: z.boolean().default(true),
  includeSessions: z.boolean().default(false),
  includeCreatedContent: z.boolean().default(true),
})

// Check access permissions
async function requireUserAccess(userId: string) {
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

// Helper function to convert data to CSV format
function convertToCSV(data: Record<string, unknown>[], headers: string[]): string {
  const csvHeaders = headers.join(',')
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header]
      if (value === null || value === undefined) return ''
      if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""')
      return String(value).replace(/"/g, '""')
    }).map(field => `"${field}"`).join(',')
  )
  
  return [csvHeaders, ...csvRows].join('\n')
}

// GET /api/users/[id]/export - Export user data
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await params
    const authError = await requireUserAccess(resolvedParams.id)
    if (authError) return authError

    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const queryParams = {
      format: searchParams.get('format') || 'json',
      includeAuditLogs: searchParams.get('includeAuditLogs') !== 'false',
      includePreferences: searchParams.get('includePreferences') !== 'false',
      includeSessions: searchParams.get('includeSessions') === 'true',
      includeCreatedContent: searchParams.get('includeCreatedContent') !== 'false',
    }

    const validatedQuery = exportQuerySchema.parse(queryParams)

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        profilePicture: true,
        emailVerified: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    // Build export data object
    const exportData: ExportData = {
      user: {
        ...user,
        // Remove sensitive fields from export
        profilePicture: user.profilePicture ? 'Profile picture exists' : null,
      },
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: session?.user?.id,
        format: validatedQuery.format,
        includes: {
          auditLogs: validatedQuery.includeAuditLogs,
          preferences: validatedQuery.includePreferences,
          sessions: validatedQuery.includeSessions,
          createdContent: validatedQuery.includeCreatedContent,
        }
      }
    }

    // Include user preferences if requested
    if (validatedQuery.includePreferences) {
      const preferences = await prisma.userPreferences.findUnique({
        where: { userId: resolvedParams.id }
      })
      exportData.preferences = preferences
    }

    // Include audit logs if requested
    if (validatedQuery.includeAuditLogs) {
      const auditLogs = await prisma.auditLog.findMany({
        where: { userId: resolvedParams.id },
        orderBy: { createdAt: 'desc' },
        take: 1000, // Limit to last 1000 entries
        select: {
          id: true,
          action: true,
          resource: true,
          details: true,
          createdAt: true,
          // Exclude sensitive fields like IP address and user agent
        }
      })
      exportData.auditLogs = auditLogs
    }

    // Include sessions if requested (admin only or own profile)
    if (validatedQuery.includeSessions) {
      const sessions = await prisma.session.findMany({
        where: { userId: resolvedParams.id },
        orderBy: { createdAt: 'desc' },
        take: 50, // Limit to last 50 sessions
        select: {
          id: true,
          expiresAt: true,
          isActive: true,
          createdAt: true,
          // Exclude sensitive fields like token, IP address, user agent
        }
      })
      exportData.sessions = sessions
    }

    // Include created content if requested
    if (validatedQuery.includeCreatedContent) {
      const [products, pages, media] = await Promise.all([
        prisma.product.findMany({
          where: { createdBy: resolvedParams.id },
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          }
        }),
        prisma.page.findMany({
          where: { createdBy: resolvedParams.id },
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          }
        }),
        prisma.media.findMany({
          where: { createdBy: resolvedParams.id },
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            fileSize: true,
            createdAt: true,
          }
        })
      ])

      exportData.createdContent = {
        products,
        pages,
        media,
        summary: {
          totalProducts: products.length,
          totalPages: pages.length,
          totalMediaFiles: media.length,
        }
      }
    }

    // Log the data export
    const auditService = getAuditService(prisma)
    await auditService.logSecurity(
      session?.user?.id || resolvedParams.id,
      'DATA_EXPORT',
      {
        format: validatedQuery.format,
        includes: validatedQuery,
        exportedAt: new Date(),
      },
      request.headers.get('x-forwarded-for') || '',
      request.headers.get('user-agent') || undefined
    )

    // Return data in requested format
    if (validatedQuery.format === 'csv') {
      // For CSV, we'll flatten the main user data and create separate sections
      const csvSections = []
      
      // User data section
      csvSections.push('USER DATA')
      csvSections.push(convertToCSV([exportData.user], Object.keys(exportData.user)))
      
      // Preferences section
      if (exportData.preferences) {
        csvSections.push('\nUSER PREFERENCES')
        csvSections.push(convertToCSV([exportData.preferences], Object.keys(exportData.preferences)))
      }
      
      // Audit logs section
      if (exportData.auditLogs && exportData.auditLogs.length > 0) {
        csvSections.push('\nAUDIT LOGS')
        csvSections.push(convertToCSV(exportData.auditLogs, Object.keys(exportData.auditLogs[0])))
      }
      
      // Created content summary
      if (exportData.createdContent) {
        csvSections.push('\nCREATED CONTENT SUMMARY')
        csvSections.push(convertToCSV([exportData.createdContent.summary], Object.keys(exportData.createdContent.summary)))
      }

      const csvData = csvSections.join('\n')
      
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="user-data-export-${resolvedParams.id}-${Date.now()}.csv"`
        }
      })
    } else {
      // JSON format
      const jsonData = JSON.stringify(exportData, null, 2)
      
      return new NextResponse(jsonData, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="user-data-export-${resolvedParams.id}-${Date.now()}.json"`
        }
      })
    }

  } catch (error) {
    console.error('Error exporting user data:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid export parameters',
            details: error.issues
          } 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to export user data' } },
      { status: 500 }
    )
  }
}