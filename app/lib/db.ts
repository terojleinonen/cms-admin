/**
 * Database connection utilities for Kin Workspace CMS
 * Provides centralized database access with connection pooling and error handling
 */

import { PrismaClient } from '@prisma/client'

// Global variable to store the Prisma client instance
declare global {
  var __prisma: PrismaClient | undefined
}

/**
 * Create a new Prisma client instance with optimized configuration
 */
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
  })
}

/**
 * Get the global Prisma client instance
 * Uses singleton pattern to prevent multiple connections in development
 */
export const prisma = globalThis.__prisma ?? createPrismaClient()

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
 * Database health check utility
 * @returns Promise<{connected: boolean, latency?: number, error?: string}>
 */
export async function getDatabaseHealth(): Promise<{
  connected: boolean
  latency?: number
  error?: string
}> {
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const latency = Date.now() - start

    return {
      connected: true,
      latency,
    }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}

/**
 * Execute database operations with error handling
 * @param operation - Database operation to execute
 * @returns Promise with operation result or error
 */
export async function withDatabase<T>(
  operation: (client: PrismaClient) => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = await operation(prisma)
    return { success: true, data }
  } catch (error) {
    console.error('Database operation failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}

// Export Prisma client types for use in other files
export type { PrismaClient } from '@prisma/client'
export * from '@prisma/client'