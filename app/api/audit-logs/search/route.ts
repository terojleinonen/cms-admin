/**
 * Advanced Audit Log Search API Endpoint
 * Provides sophisticated search and filtering capabilities with faceted search
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/app/lib/db'
import { hasPermission } from '@/app/lib/has-permission'
import { z } from 'zod'

const searchQuerySchema = z.object({
  search: z.string().optional(),
  userId: z.string().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  ipAddress: z.string().optional(),
  success: z.coerce.boolean().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  includeFacets: z.coerce.boolean().default(false),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permissions for searching audit logs
    if (!await hasPermission(session.user, 'system', 'read')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to search audit logs' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    const query = searchQuerySchema.parse({
      search: searchParams.get('search'),
      userId: searchParams.get('userId'),
      action: searchParams.get('action'),
      resource: searchParams.get('resource'),
      severity: searchParams.get('severity'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      ipAddress: searchParams.get('ipAddress'),
      success: searchParams.get('success'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      includeFacets: searchParams.get('includeFacets'),
    })

    // Build where clause for search
    const whereConditions: string[] = []
    const params: any[] = []
    let paramIndex = 1

    // Text search across multiple fields
    if (query.search) {
      whereConditions.push(`(
        al.action ILIKE $${paramIndex} OR 
        al.resource ILIKE $${paramIndex} OR 
        u.name ILIKE $${paramIndex} OR 
        u.email ILIKE $${paramIndex} OR 
        al.details::text ILIKE $${paramIndex}
      )`)
      params.push(`%${query.search}%`)
      paramIndex++
    }

    // Specific field filters
    if (query.userId) {
      whereConditions.push(`al.user_id = $${paramIndex}`)
      params.push(query.userId)
      paramIndex++
    }

    if (query.action) {
      whereConditions.push(`al.action ILIKE $${paramIndex}`)
      params.push(`%${query.action}%`)
      paramIndex++
    }

    if (query.resource) {
      whereConditions.push(`al.resource ILIKE $${paramIndex}`)
      params.push(`%${query.resource}%`)
      paramIndex++
    }

    if (query.severity) {
      whereConditions.push(`al.details->>'severity' = $${paramIndex}`)
      params.push(query.severity)
      paramIndex++
    }

    if (query.startDate) {
      whereConditions.push(`al.created_at >= $${paramIndex}`)
      params.push(new Date(query.startDate))
      paramIndex++
    }

    if (query.endDate) {
      whereConditions.push(`al.created_at <= $${paramIndex}`)
      params.push(new Date(query.endDate))
      paramIndex++
    }

    if (query.ipAddress) {
      whereConditions.push(`al.ip_address ILIKE $${paramIndex}`)
      params.push(`%${query.ipAddress}%`)
      paramIndex++
    }

    if (query.success !== undefined) {
      if (query.success) {
        whereConditions.push(`(al.details->>'success' IS NULL OR al.details->>'success' != 'false')`)
      } else {
        whereConditions.push(`al.details->>'success' = 'false'`)
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      ${whereClause}
    `

    const countResult = await db.$queryRawUnsafe(countQuery, ...params) as Array<{ total: bigint }>
    const total = Number(countResult[0].total)

    // Calculate pagination
    const totalPages = Math.ceil(total / query.limit)
    const offset = (query.page - 1) * query.limit

    // Get search results
    const searchQuery = `
      SELECT 
        al.id,
        al.user_id,
        al.action,
        al.resource,
        al.details,
        al.ip_address,
        al.user_agent,
        al.created_at,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    const searchResults = await db.$queryRawUnsafe(
      searchQuery, 
      ...params, 
      query.limit, 
      offset
    ) as Array<{
      id: string
      user_id: string
      action: string
      resource: string
      details: any
      ip_address: string | null
      user_agent: string | null
      created_at: Date
      user_name: string
      user_email: string
      user_role: string
    }>

    // Transform results
    const logs = searchResults.map(row => ({
      id: row.id,
      userId: row.user_id,
      action: row.action,
      resource: row.resource,
      details: row.details,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at.toISOString(),
      user: {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
        role: row.user_role,
      }
    }))

    // Get facets if requested
    let facets = null
    if (query.includeFacets) {
      const [actionFacets, resourceFacets, userFacets, severityFacets] = await Promise.all([
        // Top actions
        db.$queryRawUnsafe(`
          SELECT al.action as value, COUNT(*) as count
          FROM audit_logs al
          JOIN users u ON al.user_id = u.id
          ${whereClause}
          GROUP BY al.action
          ORDER BY count DESC
          LIMIT 10
        `, ...params) as Array<{ value: string; count: bigint }>,

        // Top resources
        db.$queryRawUnsafe(`
          SELECT al.resource as value, COUNT(*) as count
          FROM audit_logs al
          JOIN users u ON al.user_id = u.id
          ${whereClause}
          GROUP BY al.resource
          ORDER BY count DESC
          LIMIT 10
        `, ...params) as Array<{ value: string; count: bigint }>,

        // Top users
        db.$queryRawUnsafe(`
          SELECT al.user_id as value, u.name, COUNT(*) as count
          FROM audit_logs al
          JOIN users u ON al.user_id = u.id
          ${whereClause}
          GROUP BY al.user_id, u.name
          ORDER BY count DESC
          LIMIT 10
        `, ...params) as Array<{ value: string; name: string; count: bigint }>,

        // Severities
        db.$queryRawUnsafe(`
          SELECT 
            COALESCE(al.details->>'severity', 'low') as value, 
            COUNT(*) as count
          FROM audit_logs al
          JOIN users u ON al.user_id = u.id
          ${whereClause}
          GROUP BY COALESCE(al.details->>'severity', 'low')
          ORDER BY count DESC
        `, ...params) as Array<{ value: string; count: bigint }>
      ])

      facets = {
        actions: actionFacets.map(f => ({ value: f.value, count: Number(f.count) })),
        resources: resourceFacets.map(f => ({ value: f.value, count: Number(f.count) })),
        users: userFacets.map(f => ({ value: f.value, name: f.name, count: Number(f.count) })),
        severities: severityFacets.map(f => ({ value: f.value, count: Number(f.count) })),
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        logs,
        total,
        page: query.page,
        totalPages,
        facets,
      },
    })
  } catch (error) {
    console.error('Failed to search audit logs:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}