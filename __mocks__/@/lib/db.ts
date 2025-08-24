/**
 * Mock database client for testing
 * Provides a mocked Prisma client for unit tests
 */

import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'

// Create a deep mock of PrismaClient
export const prismaMock = mockDeep<PrismaClient>()

// Export the mocked prisma client
export const prisma = prismaMock as unknown as PrismaClient

// Reset mocks before each test
beforeEach(() => {
  mockReset(prismaMock)
})

// Mock database utility functions
export const testDatabaseConnection = jest.fn().mockResolvedValue(true)
export const disconnectDatabase = jest.fn().mockResolvedValue(undefined)
export const getDatabaseHealth = jest.fn().mockResolvedValue({
  connected: true,
  latency: 10
})
export const withDatabase = jest.fn().mockImplementation(async (operation) => {
  try {
    const data = await operation(prisma)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown database error'
    }
  }
})

// Export types
export type { PrismaClient } from '@prisma/client'
export * from '@prisma/client'