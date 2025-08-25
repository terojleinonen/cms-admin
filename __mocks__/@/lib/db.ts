/**
 * Mock database client for testing
 * Provides a comprehensive mocked Prisma client for unit tests
 */

import { mockPrisma, resetPrismaMocks, mockDataStore } from './prisma-mock'

// Export the mock prisma client
export const prisma = mockPrisma

// Export mock utilities
export { 
  mockPrisma as mockPrismaClient,
  resetPrismaMocks,
  mockDataStore
}

// Export test data factories
export {
  createMockUser,
  createMockCategory,
  createMockProduct,
  createMockMedia,
  createMockPage
} from './prisma-mock'

// Reset mocks before each test
beforeEach(() => {
  resetPrismaMocks()
})

// Export types
export type { PrismaClient } from '@prisma/client'
export * from '@prisma/client'