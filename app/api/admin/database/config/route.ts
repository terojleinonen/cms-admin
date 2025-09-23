import { NextRequest, NextResponse } from 'next/server'
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { prisma } from '@/lib/db'

export interface PostgresqlConfig {
  value: string;
  unit: string | null;
  category: string;
  description: string;
}

/**
 * Database configuration management endpoint
 * GET /api/admin/database/config
 */
export const GET = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    // Check authentication and admin role
    , { status: 401 })
    }

    // Get database configuration information
    const configInfo = await getDatabaseConfig()

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      config: configInfo,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing',
        redisUrl: process.env.REDIS_URL ? 'configured' : 'missing'
      }
    })

  } catch (error) {
    console.error('Failed to get database config:', error)
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)

/**
 * Get comprehensive database configuration
 */
async function getDatabaseConfig() {
  try {
    // Get PostgreSQL configuration
    const pgConfig = await prisma.$queryRaw<Array<{
      name: string
      setting: string
      unit: string | null
      category: string
      short_desc: string
    }>>`
      SELECT 
        name,
        setting,
        unit,
        category,
        short_desc
      FROM pg_settings 
      WHERE category IN (
        'Connections and Authentication',
        'Resource Usage',
        'Write-Ahead Log',
        'Query Tuning',
        'Statistics'
      )
      AND name IN (
        'max_connections',
        'shared_buffers',
        'effective_cache_size',
        'maintenance_work_mem',
        'checkpoint_completion_target',
        'wal_buffers',
        'default_statistics_target',
        'random_page_cost',
        'effective_io_concurrency',
        'work_mem'
      )
      ORDER BY category, name
    `

    // Get database size and table information
    const dbStats = await prisma.$queryRaw<Array<{
      database_size: string
      table_count: number
      total_size: string
    }>>`
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as database_size,
        count(*) as table_count,
        pg_size_pretty(sum(pg_total_relation_size(schemaname||'.'||tablename))) as total_size
      FROM pg_tables 
      WHERE schemaname = 'public'
    `

    // Get index usage statistics
    const indexStats = await prisma.$queryRaw<Array<{
      table_name: string
      index_name: string
      index_size: string
      index_scans: number
    }>>`
      SELECT 
        schemaname||'.'||tablename as table_name,
        indexname as index_name,
        pg_size_pretty(pg_relation_size(schemaname||'.'||indexname)) as index_size,
        idx_scan as index_scans
      FROM pg_stat_user_indexes 
      ORDER BY idx_scan DESC
      LIMIT 10
    `

    return {
      postgresql: pgConfig.reduce((acc, row) => {
        acc[row.name] = {
          value: row.setting,
          unit: row.unit,
          category: row.category,
          description: row.short_desc
        }
        return acc
      }, {} as Record<string, PostgresqlConfig>),
      database: dbStats[0],
      topIndexes: indexStats
    }

  } catch (error) {
    console.error('Failed to get database configuration:', error)
    throw error
  }
}