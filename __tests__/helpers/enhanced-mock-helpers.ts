/**
 * Enhanced Mock Helpers
 * Comprehensive test helpers that demonstrate improved mock implementation quality
 */

import { UserRole, ProductStatus, PageStatus } from '@prisma/client'
import { 
  mockDataStore, 
  setMockErrorSimulation, 
  setMockNetworkDelay,
  setSpecificError,
  clearSpecificErrors,
  createMockUser,
  createMockCategory,
  createMockProduct,
  createMockMedia,
  createMockPage
} from '../../__mocks__/@/lib/prisma-mock'
import { createServiceMocks, mockErrorSimulator } from '../../__mocks__/@/lib/service-mocks'
import { MockValidationError, MockDataConsistencyChecker } from '../../__mocks__/@/lib/mock-validators'

// Enhanced test data factory with realistic scenarios
export class EnhancedMockFactory {
  private static userCounter = 0
  private static categoryCounter = 0
  private static productCounter = 0
  
  // Create a complete user with realistic data
  static createRealisticUser(role: UserRole = UserRole.EDITOR, overrides: Record<string, unknown> = {}) {
    this.userCounter++
    const baseData = {
      name: `Test User ${this.userCounter}`,
      email: `testuser${this.userCounter}@example.com`,
      role,
      isActive: true,
      ...overrides
    }
    
    return createMockUser(baseData)
  }
  
  // Create a category hierarchy
  static createCategoryHierarchy() {
    const parentCategory = createMockCategory({
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and accessories'
    })
    
    const childCategories = [
      createMockCategory({
        name: 'Laptops',
        slug: 'laptops',
        parentId: parentCategory.id,
        description: 'Portable computers and accessories'
      }),
      createMockCategory({
        name: 'Smartphones',
        slug: 'smartphones',
        parentId: parentCategory.id,
        description: 'Mobile phones and accessories'
      })
    ]
    
    // Store in mock data store
    mockDataStore.categories.set(parentCategory.id, parentCategory)
    childCategories.forEach(category => {
      mockDataStore.categories.set(category.id, category)
    })
    
    return { parent: parentCategory, children: childCategories }
  }
  
  // Create a complete product with relationships
  static createProductWithRelationships() {
    const user = this.createRealisticUser(UserRole.ADMIN)
    const { parent: category } = this.createCategoryHierarchy()
    
    const product = createMockProduct({
      name: 'Premium Laptop',
      slug: 'premium-laptop',
      status: ProductStatus.PUBLISHED,
      featured: true,
      createdBy: user.id
    })
    
    const media = createMockMedia({
      filename: 'laptop-image.jpg',
      altText: 'Premium laptop product image',
      createdBy: user.id
    })
    
    // Store all data
    mockDataStore.users.set(user.id, user)
    mockDataStore.products.set(product.id, product)
    mockDataStore.media.set(media.id, media)
    
    // Create relationships
    const productCategory = {
      productId: product.id,
      categoryId: category.id
    }
    const productMedia = {
      productId: product.id,
      mediaId: media.id,
      sortOrder: 1,
      isPrimary: true
    }
    
    mockDataStore.productCategories.set(`${product.id}-${category.id}`, productCategory)
    mockDataStore.productMedia.set(`${product.id}-${media.id}`, productMedia)
    
    // Track references for consistency checking
    MockDataConsistencyChecker.addReference('product', product.id, 'category', category.id)
    MockDataConsistencyChecker.addReference('product', product.id, 'media', media.id)
    MockDataConsistencyChecker.addReference('product', product.id, 'user', user.id)
    
    return { product, category, media, user }
  }
  
  // Create test data set for performance testing
  static createLargeDataSet(count: number = 100) {
    const users: Record<string, unknown>[] = []
    const categories: Record<string, unknown>[] = []
    const products: Record<string, unknown>[] = []
    
    // Create users
    for (let i = 0; i < Math.min(count / 10, 10); i++) {
      const user = this.createRealisticUser()
      users.push(user)
      mockDataStore.users.set(user.id, user)
    }
    
    // Create categories
    for (let i = 0; i < Math.min(count / 5, 20); i++) {
      const category = createMockCategory({
        name: `Category ${i + 1}`,
        slug: `category-${i + 1}`
      })
      categories.push(category)
      mockDataStore.categories.set(category.id, category)
    }
    
    // Create products
    for (let i = 0; i < count; i++) {
      const product = createMockProduct({
        name: `Product ${i + 1}`,
        slug: `product-${i + 1}`,
        createdBy: users[i % users.length].id
      })
      products.push(product)
      mockDataStore.products.set(product.id, product)
    }
    
    return { users, categories, products }
  }
}

// Error simulation test helpers
export class MockErrorSimulator {
  // Simulate database connection issues
  static simulateDatabaseErrors(errorRate: number = 0.1) {
    setMockErrorSimulation(true, errorRate)
  }
  
  // Simulate network latency
  static simulateNetworkLatency(delay: number = 100) {
    setMockNetworkDelay(delay)
  }
  
  // Simulate specific operation failures
  static simulateOperationFailure(operation: string, errorType: 'network' | 'database' | 'service' = 'database') {
    let error: Error
    
    switch (errorType) {
      case 'network':
        error = mockErrorSimulator.simulateNetworkError()
        break
      case 'database':
        error = mockErrorSimulator.simulateDatabaseError()
        break
      case 'service':
        error = mockErrorSimulator.simulateServiceError()
        break
      default:
        error = new Error('Simulated operation failure')
    }
    
    setSpecificError(operation, error)
  }
  
  // Clear all error simulations
  static clearAllErrors() {
    setMockErrorSimulation(false)
    setMockNetworkDelay(0)
    clearSpecificErrors()
  }
}

// Performance testing helpers
export class MockPerformanceTester {
  private static measurements: Array<{ operation: string; duration: number; timestamp: number }> = []
  
  // Measure mock operation performance
  static async measureOperation<T>(operation: string, fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const startTime = Date.now()
    const result = await fn()
    const duration = Date.now() - startTime
    
    this.measurements.push({ operation, duration, timestamp: startTime })
    
    return { result, duration }
  }
  
  // Get performance statistics
  static getPerformanceStats() {
    if (this.measurements.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0 }
    }
    
    const durations = this.measurements.map(m => m.duration)
    return {
      count: durations.length,
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      measurements: [...this.measurements]
    }
  }
  
  // Clear performance measurements
  static clearMeasurements() {
    this.measurements = []
  }
}

// Data consistency testing helpers
export class MockConsistencyTester {
  // Validate all data relationships
  static validateDataConsistency(): string[] {
    const dataStoreMap = new Map([
      ['users', mockDataStore.users],
      ['categories', mockDataStore.categories],
      ['products', mockDataStore.products],
      ['media', mockDataStore.media],
      ['pages', mockDataStore.pages]
    ])
    
    return MockDataConsistencyChecker.validateReferences(dataStoreMap)
  }
  
  // Check for orphaned relationships
  static findOrphanedRelationships() {
    const orphans: Array<{ type: string; id: string; reason: string }> = []
    
    // Check product-category relationships
    for (const [key, relation] of mockDataStore.productCategories.entries()) {
      if (!mockDataStore.products.has(relation.productId)) {
        orphans.push({
          type: 'productCategory',
          id: key,
          reason: `References non-existent product: ${relation.productId}`
        })
      }
      if (!mockDataStore.categories.has(relation.categoryId)) {
        orphans.push({
          type: 'productCategory',
          id: key,
          reason: `References non-existent category: ${relation.categoryId}`
        })
      }
    }
    
    // Check product-media relationships
    for (const [key, relation] of mockDataStore.productMedia.entries()) {
      if (!mockDataStore.products.has(relation.productId)) {
        orphans.push({
          type: 'productMedia',
          id: key,
          reason: `References non-existent product: ${relation.productId}`
        })
      }
      if (!mockDataStore.media.has(relation.mediaId)) {
        orphans.push({
          type: 'productMedia',
          id: key,
          reason: `References non-existent media: ${relation.mediaId}`
        })
      }
    }
    
    return orphans
  }
}

// Service mock integration helpers
export class ServiceMockIntegrator {
  private static serviceMocks = createServiceMocks()
  
  // Get all service mocks
  static getServiceMocks() {
    return this.serviceMocks
  }
  
  // Setup realistic service interactions
  static setupRealisticServiceBehavior() {
    const { cacheService, searchService, imageProcessingService } = this.serviceMocks
    
    // Setup cache with some pre-existing data
    cacheService.set('popular-products', [
      { id: '1', name: 'Popular Product 1', views: 1000 },
      { id: '2', name: 'Popular Product 2', views: 850 }
    ])
    
    // Setup search index with test data
    searchService.indexDocument('products', {
      id: 'test-product-1',
      name: 'Test Product',
      description: 'A great test product',
      category: 'Electronics'
    })
    
    return this.serviceMocks
  }
  
  // Simulate service failures
  static simulateServiceFailures() {
    const { cacheService, searchService } = this.serviceMocks
    
    // Make cache operations fail occasionally
    cacheService.get.mockImplementation(async (key: string) => {
      if (Math.random() < 0.1) { // 10% failure rate
        throw new Error('Cache service unavailable')
      }
      return null // Simulate cache miss
    })
    
    // Make search operations fail occasionally
    searchService.search.mockImplementation(async (query: string) => {
      if (Math.random() < 0.05) { // 5% failure rate
        throw new Error('Search service timeout')
      }
      return { results: [], total: 0, query, took: 50 }
    })
  }
}

// Comprehensive test scenario builder
export class TestScenarioBuilder {
  private scenario: Record<string, unknown> = {}
  
  // Add users to scenario
  withUsers(count: number = 3, roles: UserRole[] = [UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER]) {
    this.scenario.users = roles.slice(0, count).map(role => 
      EnhancedMockFactory.createRealisticUser(role)
    )
    return this
  }
  
  // Add categories to scenario
  withCategories(includeHierarchy: boolean = true) {
    if (includeHierarchy) {
      this.scenario.categories = EnhancedMockFactory.createCategoryHierarchy()
    } else {
      this.scenario.categories = [
        createMockCategory({ name: 'Electronics', slug: 'electronics' }),
        createMockCategory({ name: 'Furniture', slug: 'furniture' })
      ]
    }
    return this
  }
  
  // Add products to scenario
  withProducts(count: number = 5) {
    this.scenario.products = []
    for (let i = 0; i < count; i++) {
      const product = EnhancedMockFactory.createProductWithRelationships()
      this.scenario.products.push(product)
    }
    return this
  }
  
  // Add error simulation
  withErrorSimulation(errorRate: number = 0.1) {
    MockErrorSimulator.simulateDatabaseErrors(errorRate)
    return this
  }
  
  // Add performance monitoring
  withPerformanceMonitoring() {
    MockPerformanceTester.clearMeasurements()
    return this
  }
  
  // Build and return the scenario
  build() {
    return this.scenario
  }
  
  // Clean up scenario
  cleanup() {
    MockErrorSimulator.clearAllErrors()
    MockPerformanceTester.clearMeasurements()
    MockDataConsistencyChecker.clear()
  }
}

// Export all helpers
export {
  EnhancedMockFactory,
  MockErrorSimulator,
  MockPerformanceTester,
  MockConsistencyTester,
  ServiceMockIntegrator,
  TestScenarioBuilder
}

// Convenience function to create a complete test environment
export function createEnhancedTestEnvironment(options: {
  users?: number
  categories?: boolean
  products?: number
  errorSimulation?: number
  performanceMonitoring?: boolean
} = {}) {
  const builder = new TestScenarioBuilder()
  
  if (options.users) {
    builder.withUsers(options.users)
  }
  
  if (options.categories) {
    builder.withCategories(true)
  }
  
  if (options.products) {
    builder.withProducts(options.products)
  }
  
  if (options.errorSimulation) {
    builder.withErrorSimulation(options.errorSimulation)
  }
  
  if (options.performanceMonitoring) {
    builder.withPerformanceMonitoring()
  }
  
  const scenario = builder.build()
  
  return {
    scenario,
    serviceMocks: ServiceMockIntegrator.getServiceMocks(),
    cleanup: () => builder.cleanup(),
    validateConsistency: () => MockConsistencyTester.validateDataConsistency(),
    getPerformanceStats: () => MockPerformanceTester.getPerformanceStats()
  }
}