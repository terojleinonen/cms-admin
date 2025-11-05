/**
 * Database connection utilities for Kin Workspace CMS
 * Provides centralized database access with connection pooling and error handling
 */

import { Prisma, PrismaClient } from '@prisma/client'

// Global variable to store the Prisma client instance
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

/**
 * Database configuration based on environment
 */
const getDatabaseConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production'
  const isTest = process.env.NODE_ENV === 'test'
  
  return {
    log: (isProduction
      ? ['error'] 
      : isTest 
        ? [] 
        : ['query', 'error', 'warn']) as Prisma.LogLevel[],
    errorFormat: 'pretty' as const,
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  }
}

/**
 * Create a new Prisma client instance with optimized configuration
 */
function createPrismaClient(): PrismaClient {
  const config = getDatabaseConfig()
  
  return new PrismaClient({
    ...config
  })
}

/**
 * Get the global Prisma client instance
 * Uses singleton pattern to prevent multiple connections in development
 */
export const prisma = globalThis.__prisma ?? createPrismaClient()

// Export as 'db' for consistency with other imports
export const db = prisma

// In development, store the client globally to prevent hot reload issues
if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma
}

/**
 * Test database connection
 * @returns Promise<boolean> - True if connection is successful
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect()
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}

/**
 * Gracefully disconnect from the database
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error disconnecting from database:', error)
  }
}

/**
 * Database health check utility with comprehensive monitoring
 * @returns Promise<DatabaseHealthStatus>
 */
export interface DatabaseHealthStatus {
  connected: boolean
  latency?: number
  error?: string
  connectionPool?: {
    active: number
    idle: number
    total: number
  }
  database?: {
    name: string
    version: string
    size?: string
  }
  performance?: {
    slowQueries: number
    avgResponseTime: number
  }
}

export async function getDatabaseHealth(): Promise<DatabaseHealthStatus> {
  try {
    const start = Date.now()
    
    // Basic connectivity test
    await prisma.$queryRaw`SELECT 1`
    const latency = Date.now() - start

    // Get database information
    const [dbInfo] = await prisma.$queryRaw<Array<{
      database_name: string
      version: string
      database_size: string
    }>>`
      SELECT 
        current_database() as database_name,
        version() as version,
        pg_size_pretty(pg_database_size(current_database())) as database_size
    `

    // Get connection pool stats (if available)
    let connectionPool
    try {
      const poolStats = await prisma.$queryRaw<Array<{
        active: number
        idle: number
        total: number
      }>>`
        SELECT 
          count(*) FILTER (WHERE state = 'active') as active,
          count(*) FILTER (WHERE state = 'idle') as idle,
          count(*) as total
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `
      connectionPool = poolStats[0]
    } catch {
      // Connection pool stats not available
    }

    return {
      connected: true,
      latency,
      database: {
        name: dbInfo.database_name,
        version: dbInfo.version.split(' ')[0] + ' ' + dbInfo.version.split(' ')[1],
        size: dbInfo.database_size
      },
      connectionPool,
      performance: {
        slowQueries: 0, // Could be enhanced with actual slow query monitoring
        avgResponseTime: latency
      }
    }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}

/**
 * Execute database operations with error handling and performance monitoring
 * @param operation - Database operation to execute
 * @param operationName - Name of the operation for monitoring
 * @returns Promise with operation result or error
 */
export async function withDatabase<T>(
  operation: (client: PrismaClient) => Promise<T>,
  operationName?: string
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const start = Date.now()
  
  try {
    const data = await operation(prisma)
    const duration = Date.now() - start
    
    // Log slow queries in development
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.warn(`⚠️ Slow database operation: ${operationName || 'unknown'} took ${duration}ms`)
    }
    
    return { success: true, data }
  } catch (error) {
    const duration = Date.now() - start
    console.error(`Database operation failed: ${operationName || 'unknown'} (${duration}ms)`, error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}

/**
 * Database connection pool manager
 */
export class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager
  private connectionCount = 0
  private maxConnections = process.env.NODE_ENV === 'production' ? 20 : 10

  static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager()
    }
    return DatabaseConnectionManager.instance
  }

  /**
   * Get current connection statistics
   */
  async getConnectionStats(): Promise<{
    current: number
    max: number
    available: number
    health: 'healthy' | 'warning' | 'critical'
  }> {
    try {
      const [stats] = await prisma.$queryRaw<Array<{
        active_connections: number
        max_connections: number
      }>>`
        SELECT 
          (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as active_connections,
          (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
      `

      const current = Number(stats.active_connections)
      const max = Number(stats.max_connections)
      const available = max - current
      const utilizationPercent = (current / max) * 100

      let health: 'healthy' | 'warning' | 'critical' = 'healthy'
      if (utilizationPercent > 80) health = 'critical'
      else if (utilizationPercent > 60) health = 'warning'

      return {
        current,
        max,
        available,
        health
      }
    } catch (error) {
      console.error('Failed to get connection stats:', error)
      return {
        current: 0,
        max: this.maxConnections,
        available: this.maxConnections,
        health: 'critical'
      }
    }
  }

  /**
   * Monitor database performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    slowQueries: number
    avgQueryTime: number
    cacheHitRatio: number
    indexUsage: number
  }> {
    try {
      // Get cache hit ratio
      const [cacheStats] = await prisma.$queryRaw<Array<{
        cache_hit_ratio: number
      }>>`
        SELECT 
          round(
            sum(blks_hit) * 100.0 / nullif(sum(blks_hit + blks_read), 0), 2
          ) as cache_hit_ratio
        FROM pg_stat_database
        WHERE datname = current_database()
      ` || [{ cache_hit_ratio: 0 }]

      return {
        slowQueries: 0, // Would need pg_stat_statements extension
        avgQueryTime: 0, // Would need pg_stat_statements extension
        cacheHitRatio: Number(cacheStats?.cache_hit_ratio || 0),
        indexUsage: 0 // Would need more complex query
      }
    } catch (error) {
      console.error('Failed to get performance metrics:', error)
      return {
        slowQueries: 0,
        avgQueryTime: 0,
        cacheHitRatio: 0,
        indexUsage: 0
      }
    }
  }
}

// Export specific Prisma types that are actually used
export type { PrismaClient, Prisma } from '@prisma/client'