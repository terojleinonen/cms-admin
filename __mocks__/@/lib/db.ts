/**
 * Mock database client for testing
 * Provides a comprehensive mocked Prisma client for unit tests
 */

import { mockPrisma, mockDataStore, resetMockErrorConfig, setupPrismaMocks } from './prisma-mock'
import { MockDataConsistencyChecker } from './mock-validators'

// Export the mock prisma client
export const prisma = mockPrisma

// Export test data factories
export {
  createMockUser,
  createMockCategory,
  createMockProduct,
  createMockMedia,
  createMockPage,
  resetMockErrorConfig,
  setupPrismaMocks
} from './prisma-mock'

// Enhanced reset function with comprehensive cleanup
const resetPrismaTestMocks = () => {
  // Clear all data stores
  mockDataStore.users.clear()
  mockDataStore.categories.clear()
  mockDataStore.products.clear()
  mockDataStore.media.clear()
  mockDataStore.pages.clear()
  mockDataStore.productCategories.clear()
  mockDataStore.productMedia.clear()
  
  // Reset error simulation
  resetMockErrorConfig()
  
  // Clear consistency checker
  MockDataConsistencyChecker.clear()
  
  // Reset all Jest mocks
  Object.values(mockPrisma).forEach(model => {
    if (typeof model === 'object' && model !== null) {
      Object.values(model).forEach(method => {
        if (jest.isMockFunction(method)) {
          method.mockClear()
        }
      })
    }
  })
  
  // Re-setup mock implementations
  setupPrismaMocks()
}

// Export mock utilities
export { 
  mockPrisma as mockPrismaClient,
  mockDataStore
}

// Export the enhanced reset function
export const resetPrismaMocks = resetPrismaTestMocks

// Reset mocks before each test
beforeEach(() => {
  resetPrismaTestMocks()
})

// Export types
export type { PrismaClient } from '@prisma/client'
export * from '@prisma/client'