/**
 * Test Data Factory
 * Provides utilities for creating consistent test data across all tests
 */

import { UserRole, ProductStatus, PageStatus } from '@prisma/client'

// Counter for unique test data
let testDataCounter = 1

export const resetTestDataCounter = () => {
  testDataCounter = 1
}

// User test data factory
export const createTestUser = (overrides: any = {}) => {
  return {
    email: `user-${testDataCounter++}@test.com`,
    name: `Test User ${testDataCounter}`,
    role: UserRole.EDITOR,
    isActive: true,
    passwordHash: 'test-hash',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

// Category test data factory
export const createTestCategory = (overrides: any = {}) => {
  return {
    name: `Test Category ${testDataCounter++}`,
    slug: `test-category-${testDataCounter}`,
    description: `Test category description ${testDataCounter}`,
    parentId: null,
    sortOrder: testDataCounter,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

// Product test data factory
export const createTestProduct = (overrides: any = {}) => {
  return {
    name: `Test Product ${testDataCounter++}`,
    slug: `test-product-${testDataCounter}`,
    description: `Test product description ${testDataCounter}`,
    shortDescription: `Short description ${testDataCounter}`,
    price: 99.99,
    comparePrice: null,
    sku: `TEST-SKU-${testDataCounter}`,
    inventoryQuantity: 10,
    weight: null,
    dimensions: null,
    status: ProductStatus.DRAFT,
    featured: false,
    seoTitle: null,
    seoDescription: null,
    createdBy: overrides.createdBy || 'test-user-1', // This will need to be a valid UUID
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

// Media test data factory
export const createTestMedia = (overrides: any = {}) => {
  return {
    filename: `test-image-${testDataCounter++}.jpg`,
    originalName: `Test Image ${testDataCounter}.jpg`,
    mimeType: 'image/jpeg',
    fileSize: 1024000,
    width: 800,
    height: 600,
    altText: `Test image ${testDataCounter}`,
    folder: 'uploads',
    createdBy: overrides.createdBy || 'test-user-1', // This will need to be a valid UUID
    createdAt: new Date(),
    ...overrides
  }
}

// Page test data factory
export const createTestPage = (overrides: any = {}) => {
  return {
    title: `Test Page ${testDataCounter++}`,
    slug: `test-page-${testDataCounter}`,
    content: `<p>Test page content ${testDataCounter}</p>`,
    excerpt: `Page excerpt ${testDataCounter}`,
    status: PageStatus.DRAFT,
    template: 'default',
    seoTitle: null,
    seoDescription: null,
    publishedAt: null,
    createdBy: overrides.createdBy || 'test-user-1', // This will need to be a valid UUID
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

// API Key test data factory
export const createTestApiKey = (overrides: any = {}) => {
  const id = `test-api-key-${testDataCounter++}`
  return {
    id,
    name: `Test API Key ${testDataCounter}`,
    keyHash: `test-hash-${testDataCounter}`,
    permissions: ['read', 'write'],
    isActive: true,
    lastUsed: null,
    createdBy: 'test-user-1',
    createdAt: new Date(),
    expiresAt: null,
    ...overrides
  }
}

// Content Revision test data factory
export const createTestContentRevision = (overrides: any = {}) => {
  const id = `test-revision-${testDataCounter++}`
  return {
    id,
    contentType: 'product',
    contentId: 'test-product-1',
    revisionData: { name: 'Test Product', description: 'Test description' },
    createdBy: 'test-user-1',
    createdAt: new Date(),
    ...overrides
  }
}

// Backup test data factory
export const createTestBackup = (overrides: any = {}) => {
  const id = `test-backup-${testDataCounter++}`
  return {
    id,
    type: 'full',
    filename: `backup-${testDataCounter}.sql`,
    size: BigInt(1024000),
    compressed: false,
    encrypted: false,
    checksum: `checksum-${testDataCounter}`,
    version: '1.0.0',
    description: `Test backup ${testDataCounter}`,
    createdBy: 'test-user-1',
    createdAt: new Date(),
    ...overrides
  }
}

// Product Category relation factory
export const createTestProductCategory = (productId: string, categoryId: string) => ({
  productId,
  categoryId
})

// Product Media relation factory
export const createTestProductMedia = (productId: string, mediaId: string, overrides: any = {}) => ({
  productId,
  mediaId,
  sortOrder: 0,
  isPrimary: false,
  ...overrides
})

// Bulk data creation helpers
export const createTestUsers = (count: number, overrides: any = {}) => {
  return Array.from({ length: count }, (_, index) => 
    createTestUser({ 
      ...overrides,
      email: `user-${testDataCounter + index}@test.com`,
      name: `Test User ${testDataCounter + index}`
    })
  )
}

export const createTestCategories = (count: number, overrides: any = {}) => {
  return Array.from({ length: count }, (_, index) => 
    createTestCategory({ 
      ...overrides,
      name: `Test Category ${testDataCounter + index}`,
      slug: `test-category-${testDataCounter + index}`
    })
  )
}

export const createTestProducts = (count: number, overrides: any = {}) => {
  return Array.from({ length: count }, (_, index) => 
    createTestProduct({ 
      ...overrides,
      name: `Test Product ${testDataCounter + index}`,
      slug: `test-product-${testDataCounter + index}`,
      sku: `TEST-SKU-${testDataCounter + index}`
    })
  )
}

export const createTestMediaFiles = (count: number, overrides: any = {}) => {
  return Array.from({ length: count }, (_, index) => 
    createTestMedia({ 
      ...overrides,
      filename: `test-image-${testDataCounter + index}.jpg`,
      originalName: `Test Image ${testDataCounter + index}.jpg`
    })
  )
}

export const createTestPages = (count: number, overrides: any = {}) => {
  return Array.from({ length: count }, (_, index) => 
    createTestPage({ 
      ...overrides,
      title: `Test Page ${testDataCounter + index}`,
      slug: `test-page-${testDataCounter + index}`
    })
  )
}

// Hierarchical test data helpers
export const createTestCategoryHierarchy = () => {
  const parent = createTestCategory({ name: 'Parent Category', slug: 'parent-category' })
  const child1 = createTestCategory({ 
    name: 'Child Category 1', 
    slug: 'child-category-1',
    parentId: parent.id 
  })
  const child2 = createTestCategory({ 
    name: 'Child Category 2', 
    slug: 'child-category-2',
    parentId: parent.id 
  })
  
  return { parent, children: [child1, child2] }
}

// Product with relations helper
export const createTestProductWithRelations = () => {
  const user = createTestUser({ role: UserRole.ADMIN })
  const category = createTestCategory()
  const media = createTestMedia()
  const product = createTestProduct({ createdBy: user.id })
  
  return {
    user,
    category,
    media,
    product,
    productCategory: createTestProductCategory(product.id, category.id),
    productMedia: createTestProductMedia(product.id, media.id, { isPrimary: true })
  }
}

// Session test data for authentication
export const createTestSession = (overrides: any = {}) => ({
  user: {
    id: 'test-user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.ADMIN,
    ...overrides.user
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
  ...overrides
})

// Mock request helpers
export const createMockRequest = (url: string, options: any = {}) => {
  return new Request(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })
}

export const createMockNextRequest = (url: string, options: any = {}) => {
  const { NextRequest } = require('next/server')
  return new NextRequest(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })
}

// Database seeding helpers for integration tests
export const seedTestDatabase = async (prisma: any) => {
  // Create test users
  const adminUser = await prisma.user.create({
    data: createTestUser({ 
      email: 'admin@test.com',
      role: UserRole.ADMIN 
    })
  })
  
  const editorUser = await prisma.user.create({
    data: createTestUser({ 
      email: 'editor@test.com',
      role: UserRole.EDITOR 
    })
  })
  
  // Create test categories
  const parentCategory = await prisma.category.create({
    data: createTestCategory({ 
      name: 'Electronics',
      slug: 'electronics'
    })
  })
  
  const childCategory = await prisma.category.create({
    data: createTestCategory({ 
      name: 'Laptops',
      slug: 'laptops',
      parentId: parentCategory.id
    })
  })
  
  // Create test products
  const product = await prisma.product.create({
    data: createTestProduct({ 
      name: 'Test Laptop',
      slug: 'test-laptop',
      createdBy: adminUser.id,
      status: ProductStatus.PUBLISHED
    })
  })
  
  // Create test media
  const media = await prisma.media.create({
    data: createTestMedia({ 
      filename: 'laptop-image.jpg',
      createdBy: adminUser.id
    })
  })
  
  // Create relations
  await prisma.productCategory.create({
    data: { productId: product.id, categoryId: childCategory.id }
  })
  
  await prisma.productMedia.create({
    data: { productId: product.id, mediaId: media.id, isPrimary: true }
  })
  
  return {
    users: { admin: adminUser, editor: editorUser },
    categories: { parent: parentCategory, child: childCategory },
    products: { laptop: product },
    media: { laptopImage: media }
  }
}

// Cleanup helpers for integration tests
export const cleanupTestDatabase = async (prisma: any) => {
  // Delete in reverse order of dependencies
  await prisma.productMedia.deleteMany()
  await prisma.productCategory.deleteMany()
  await prisma.contentRevision.deleteMany()
  await prisma.backupRestoreLog.deleteMany()
  await prisma.backup.deleteMany()
  await prisma.apiKey.deleteMany()
  await prisma.media.deleteMany()
  await prisma.product.deleteMany()
  await prisma.page.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()
}