/**
 * Test Helpers
 * Utility functions for creating test data and mocking authentication
 */

import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { hashPassword } from '@/lib/password-utils'

export interface TestUser {
  id: string
  email: string
  name: string
  role: UserRole
  passwordHash: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TestSession {
  user: {
    id: string
    email: string
    name: string
    role: UserRole
  }
  expires: string
}

/**
 * Creates a test user in the database
 */
export async function createTestUser(userData: {
  email?: string
  name?: string
  role?: UserRole
  password?: string
}): Promise<TestUser> {
  const {
    email = 'test@example.com',
    name = 'Test User',
    role = UserRole.EDITOR,
    password = 'testPassword123!'
  } = userData

  const passwordHash = await hashPassword(password)

  return await prisma.user.create({
    data: {
      email,
      name,
      role,
      passwordHash,
      isActive: true,
    },
  })
}

/**
 * Creates a test session object for mocking NextAuth
 */
export function createTestSession(user: TestUser): TestSession {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    expires: '2024-12-31T23:59:59.999Z',
  }
}

/**
 * Creates a test category
 */
export async function createTestCategory(categoryData: {
  name?: string
  slug?: string
  description?: string
  parentId?: string
  sortOrder?: number
  isActive?: boolean
} = {}) {
  const {
    name = 'Test Category',
    slug = 'test-category',
    description = 'Test category description',
    parentId = null,
    sortOrder = 1,
    isActive = true,
  } = categoryData

  return await prisma.category.create({
    data: {
      name,
      slug,
      description,
      parentId,
      sortOrder,
      isActive,
    },
  })
}

/**
 * Creates a test media file
 */
export async function createTestMedia(mediaData: {
  filename?: string
  originalName?: string
  mimeType?: string
  fileSize?: number
  width?: number
  height?: number
  altText?: string
  folder?: string
  createdBy: string
} & { createdBy: string }) {
  const {
    filename = 'test-image.jpg',
    originalName = 'Test Image.jpg',
    mimeType = 'image/jpeg',
    fileSize = 1024000,
    width = 800,
    height = 600,
    altText = 'Test image',
    folder = 'uploads',
    createdBy,
  } = mediaData

  return await prisma.media.create({
    data: {
      filename,
      originalName,
      mimeType,
      fileSize,
      width,
      height,
      altText,
      folder,
      createdBy,
    },
  })
}

/**
 * Creates a test product
 */
export async function createTestProduct(productData: {
  name?: string
  slug?: string
  description?: string
  shortDescription?: string
  price?: number
  comparePrice?: number
  sku?: string
  inventoryQuantity?: number
  weight?: number
  dimensions?: any
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  featured?: boolean
  seoTitle?: string
  seoDescription?: string
  createdBy?: string
} = {}) {
  const {
    name = 'Test Product',
    slug = 'test-product',
    description = 'Test product description',
    shortDescription = 'Test product short description',
    price = 99.99,
    comparePrice = null,
    sku = 'TEST-001',
    inventoryQuantity = 10,
    weight = 1.5,
    dimensions = { length: 10, width: 10, height: 10 },
    status = 'DRAFT',
    featured = false,
    seoTitle = null,
    seoDescription = null,
    createdBy = null,
  } = productData

  return await prisma.product.create({
    data: {
      name,
      slug,
      description,
      shortDescription,
      price,
      comparePrice,
      sku,
      inventoryQuantity,
      weight,
      dimensions,
      status,
      featured,
      seoTitle,
      seoDescription,
      createdBy,
    },
  })
}

/**
 * Creates a test page
 */
export async function createTestPage(pageData: {
  title?: string
  slug?: string
  content?: string
  excerpt?: string
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  template?: string
  seoTitle?: string
  seoDescription?: string
  publishedAt?: Date
  createdBy?: string
} = {}) {
  const {
    title = 'Test Page',
    slug = 'test-page',
    content = '<p>Test page content</p>',
    excerpt = 'Test page excerpt',
    status = 'DRAFT',
    template = 'default',
    seoTitle = null,
    seoDescription = null,
    publishedAt = null,
    createdBy = null,
  } = pageData

  return await prisma.page.create({
    data: {
      title,
      slug,
      content,
      excerpt,
      status,
      template,
      seoTitle,
      seoDescription,
      publishedAt,
      createdBy,
    },
  })
}

/**
 * Associates a product with categories
 */
export async function associateProductWithCategories(
  productId: string,
  categoryIds: string[]
) {
  const associations = categoryIds.map(categoryId => ({
    productId,
    categoryId,
  }))

  return await prisma.productCategory.createMany({
    data: associations,
  })
}

/**
 * Associates a product with media
 */
export async function associateProductWithMedia(
  productId: string,
  mediaIds: string[],
  options: { isPrimary?: boolean } = {}
) {
  const associations = mediaIds.map((mediaId, index) => ({
    productId,
    mediaId,
    sortOrder: index + 1,
    isPrimary: options.isPrimary && index === 0,
  }))

  return await prisma.productMedia.createMany({
    data: associations,
  })
}

/**
 * Cleans up all test data from the database
 */
export async function cleanupTestData() {
  // Delete in order to respect foreign key constraints
  await prisma.productMedia.deleteMany()
  await prisma.productCategory.deleteMany()
  await prisma.contentRevision.deleteMany()
  await prisma.media.deleteMany()
  await prisma.product.deleteMany()
  await prisma.page.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()
}

/**
 * Creates a mock FormData for file uploads
 */
export function createMockFormData(files: Array<{
  name: string
  content: string
  type: string
  filename: string
}>, fields: Record<string, string> = {}): FormData {
  const formData = new FormData()

  // Add files
  files.forEach(file => {
    const blob = new Blob([file.content], { type: file.type })
    const mockFile = new File([blob], file.filename, { type: file.type })
    formData.append(file.name, mockFile)
  })

  // Add fields
  Object.entries(fields).forEach(([key, value]) => {
    formData.append(key, value)
  })

  return formData
}

/**
 * Creates a mock NextRequest with authentication headers
 */
export function createAuthenticatedRequest(
  url: string,
  options: RequestInit = {},
  session: TestSession
): Request {
  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer mock-token-${session.user.id}`)
  
  return new Request(url, {
    ...options,
    headers,
  })
}

/**
 * Waits for a specified amount of time (useful for testing async operations)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Generates a unique test identifier
 */
export function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
}

/**
 * Creates multiple test products with different attributes for testing filtering and sorting
 */
export async function createTestProductSet(createdBy?: string) {
  const category1 = await createTestCategory({ name: 'Electronics', slug: 'electronics' })
  const category2 = await createTestCategory({ name: 'Furniture', slug: 'furniture' })

  const products = await Promise.all([
    createTestProduct({
      name: 'Laptop',
      slug: 'laptop',
      price: 999.99,
      status: 'PUBLISHED',
      featured: true,
      inventoryQuantity: 5,
      createdBy,
    }),
    createTestProduct({
      name: 'Desk Chair',
      slug: 'desk-chair',
      price: 299.99,
      status: 'PUBLISHED',
      featured: false,
      inventoryQuantity: 15,
      createdBy,
    }),
    createTestProduct({
      name: 'Monitor',
      slug: 'monitor',
      price: 399.99,
      status: 'DRAFT',
      featured: true,
      inventoryQuantity: 8,
      createdBy,
    }),
    createTestProduct({
      name: 'Standing Desk',
      slug: 'standing-desk',
      price: 599.99,
      status: 'PUBLISHED',
      featured: false,
      inventoryQuantity: 3,
      createdBy,
    }),
  ])

  // Associate products with categories
  await associateProductWithCategories(products[0].id, [category1.id]) // Laptop -> Electronics
  await associateProductWithCategories(products[1].id, [category2.id]) // Desk Chair -> Furniture
  await associateProductWithCategories(products[2].id, [category1.id]) // Monitor -> Electronics
  await associateProductWithCategories(products[3].id, [category2.id]) // Standing Desk -> Furniture

  return {
    products,
    categories: [category1, category2],
  }
}

/**
 * Asserts that an API response has the expected structure
 */
export function assertApiResponse(
  response: Response,
  expectedStatus: number,
  expectedStructure?: Record<string, any>
) {
  expect(response.status).toBe(expectedStatus)
  
  if (expectedStructure) {
    return response.json().then(data => {
      Object.keys(expectedStructure).forEach(key => {
        expect(data).toHaveProperty(key)
        if (typeof expectedStructure[key] === 'object' && expectedStructure[key] !== null) {
          expect(data[key]).toMatchObject(expectedStructure[key])
        }
      })
      return data
    })
  }
  
  return response.json()
}

/**
 * Mock console methods to avoid noise in test output
 */
export function mockConsole() {
  const originalConsole = { ...console }
  
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'warn').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
  })
  
  afterEach(() => {
    jest.restoreAllMocks()
  })
  
  return originalConsole
}