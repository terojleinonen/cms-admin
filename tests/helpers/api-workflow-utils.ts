/**
 * API Workflow Testing Utilities
 * Comprehensive utilities for testing complete API workflows
 */

import { NextRequest } from 'next/server'
import { IntegrationTestContext } from './integration-test-utils'

// API test configuration
export interface APITestConfig {
  baseUrl: string
  timeout: number
  retryAttempts: number
  authToken?: string
}

// Default API test configuration
export const DEFAULT_API_CONFIG: APITestConfig = {
  baseUrl: 'http://localhost:3000',
  timeout: 10000,
  retryAttempts: 3
}

/**
 * API Workflow Tester
 * Provides comprehensive API testing capabilities
 */
export class APIWorkflowTester {
  private config: APITestConfig
  private context: IntegrationTestContext

  constructor(context: IntegrationTestContext, config: Partial<APITestConfig> = {}) {
    this.context = context
    this.config = { ...DEFAULT_API_CONFIG, ...config }
  }

  /**
   * Create authenticated request
   */
  createRequest(
    path: string, 
    options: RequestInit = {},
    params?: Record<string, string>
  ): NextRequest {
    let url = `${this.config.baseUrl}${path}`
    
    if (params) {
      const searchParams = new URLSearchParams(params)
      url += `?${searchParams.toString()}`
    }

    const headers = new Headers(options.headers)
    headers.set('Content-Type', 'application/json')
    
    if (this.config.authToken) {
      headers.set('Authorization', `Bearer ${this.config.authToken}`)
    }

    return new NextRequest(url, {
      method: 'GET',
      ...options,
      headers
    })
  }

  /**
   * Test complete authentication workflow
   */
  async testAuthenticationWorkflow(
    handlers: {
      register: (request: NextRequest) => Promise<Response>
      login: (request: NextRequest) => Promise<Response>
      profile: (request: NextRequest) => Promise<Response>
    }
  ): Promise<{ user: any; token: string }> {
    console.log('🔐 Testing authentication workflow...')

    // Step 1: Register new user
    const userData = {
      name: 'API Test User',
      email: `api-test-${Date.now()}@test.com`,
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!',
      role: 'EDITOR'
    }

    const registerRequest = this.createRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    })

    const registerResponse = await handlers.register(registerRequest)
    expect(registerResponse.status).toBe(201)
    
    const registerData = await registerResponse.json()
    expect(registerData.user).toBeDefined()
    expect(registerData.user.email).toBe(userData.email)

    console.log('  ✅ User registration successful')

    // Step 2: Login with credentials
    const loginRequest = this.createRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: userData.email,
        password: userData.password
      })
    })

    const loginResponse = await handlers.login(loginRequest)
    expect(loginResponse.status).toBe(200)
    
    const loginData = await loginResponse.json()
    expect(loginData.token).toBeDefined()
    expect(loginData.user.email).toBe(userData.email)

    console.log('  ✅ User login successful')

    // Step 3: Access protected profile
    this.config.authToken = loginData.token
    
    const profileRequest = this.createRequest('/api/auth/me')
    const profileResponse = await handlers.profile(profileRequest)
    expect(profileResponse.status).toBe(200)
    
    const profileData = await profileResponse.json()
    expect(profileData.user.email).toBe(userData.email)

    console.log('  ✅ Profile access successful')

    return {
      user: profileData.user,
      token: loginData.token
    }
  }

  /**
   * Test complete CRUD workflow
   */
  async testCRUDWorkflow<T>(
    entityName: string,
    basePath: string,
    createData: any,
    updateData: any,
    handlers: {
      create: (request: NextRequest) => Promise<Response>
      read: (request: NextRequest, params: { id: string }) => Promise<Response>
      update: (request: NextRequest, params: { id: string }) => Promise<Response>
      delete: (request: NextRequest, params: { id: string }) => Promise<Response>
      list: (request: NextRequest) => Promise<Response>
    }
  ): Promise<{ entity: T; entityId: string }> {
    console.log(`📝 Testing ${entityName} CRUD workflow...`)

    // Step 1: Create entity
    const createRequest = this.createRequest(basePath, {
      method: 'POST',
      body: JSON.stringify(createData)
    })

    const createResponse = await handlers.create(createRequest)
    expect(createResponse.status).toBe(201)
    
    const createResult = await createResponse.json()
    const entity = createResult[entityName]
    const entityId = entity.id

    expect(entity).toBeDefined()
    expect(entityId).toBeDefined()

    console.log(`  ✅ ${entityName} creation successful: ${entityId}`)

    // Step 2: Read entity
    const readRequest = this.createRequest(`${basePath}/${entityId}`)
    const readResponse = await handlers.read(readRequest, { id: entityId })
    expect(readResponse.status).toBe(200)
    
    const readResult = await readResponse.json()
    expect(readResult[entityName].id).toBe(entityId)

    console.log(`  ✅ ${entityName} read successful`)

    // Step 3: Update entity
    const updateRequest = this.createRequest(`${basePath}/${entityId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    })

    const updateResponse = await handlers.update(updateRequest, { id: entityId })
    expect(updateResponse.status).toBe(200)
    
    const updateResult = await updateResponse.json()
    expect(updateResult[entityName].id).toBe(entityId)

    console.log(`  ✅ ${entityName} update successful`)

    // Step 4: List entities (verify it appears in list)
    const listRequest = this.createRequest(basePath)
    const listResponse = await handlers.list(listRequest)
    expect(listResponse.status).toBe(200)
    
    const listResult = await listResponse.json()
    const entities = listResult[`${entityName}s`] || listResult.data
    expect(Array.isArray(entities)).toBe(true)
    
    const foundEntity = entities.find((e: any) => e.id === entityId)
    expect(foundEntity).toBeDefined()

    console.log(`  ✅ ${entityName} list verification successful`)

    // Step 5: Delete entity
    const deleteRequest = this.createRequest(`${basePath}/${entityId}`, {
      method: 'DELETE'
    })

    const deleteResponse = await handlers.delete(deleteRequest, { id: entityId })
    expect(deleteResponse.status).toBe(200)

    console.log(`  ✅ ${entityName} deletion successful`)

    // Step 6: Verify deletion
    const verifyRequest = this.createRequest(`${basePath}/${entityId}`)
    const verifyResponse = await handlers.read(verifyRequest, { id: entityId })
    expect(verifyResponse.status).toBe(404)

    console.log(`  ✅ ${entityName} deletion verification successful`)

    return { entity: updateResult[entityName], entityId }
  }

  /**
   * Test product management workflow with relationships
   */
  async testProductWorkflow(
    handlers: {
      createCategory: (request: NextRequest) => Promise<Response>
      createProduct: (request: NextRequest) => Promise<Response>
      getProduct: (request: NextRequest, params: { id: string }) => Promise<Response>
      updateProduct: (request: NextRequest, params: { id: string }) => Promise<Response>
      deleteProduct: (request: NextRequest, params: { id: string }) => Promise<Response>
      listProducts: (request: NextRequest) => Promise<Response>
    }
  ): Promise<{ product: any; category: any }> {
    console.log('🛍️ Testing product management workflow...')

    // Step 1: Create category first
    const categoryData = {
      name: 'API Test Category',
      slug: `api-test-category-${Date.now()}`,
      description: 'Category created for API testing'
    }

    const categoryRequest = this.createRequest('/api/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData)
    })

    const categoryResponse = await handlers.createCategory(categoryRequest)
    expect(categoryResponse.status).toBe(201)
    
    const categoryResult = await categoryResponse.json()
    const category = categoryResult.category

    console.log('  ✅ Category creation successful')

    // Step 2: Create product with category relationship
    const productData = {
      name: 'API Test Product',
      slug: `api-test-product-${Date.now()}`,
      description: 'Product created for API testing',
      shortDescription: 'API test product',
      price: 99.99,
      comparePrice: 129.99,
      sku: `API-TEST-${Date.now()}`,
      status: 'PUBLISHED',
      categoryIds: [category.id],
      tags: ['api', 'test']
    }

    const productRequest = this.createRequest('/api/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    })

    const productResponse = await handlers.createProduct(productRequest)
    expect(productResponse.status).toBe(201)
    
    const productResult = await productResponse.json()
    const product = productResult.product

    console.log('  ✅ Product creation successful')

    // Step 3: Verify product has category relationship
    const getProductRequest = this.createRequest(`/api/products/${product.id}`)
    const getProductResponse = await handlers.getProduct(getProductRequest, { id: product.id })
    expect(getProductResponse.status).toBe(200)
    
    const getProductResult = await getProductResponse.json()
    expect(getProductResult.product.categories).toBeDefined()
    expect(getProductResult.product.categories).toHaveLength(1)
    expect(getProductResult.product.categories[0].id).toBe(category.id)

    console.log('  ✅ Product-category relationship verified')

    // Step 4: Test product search and filtering
    const searchRequest = this.createRequest('/api/products', {}, { 
      search: 'API Test',
      status: 'PUBLISHED'
    })

    const searchResponse = await handlers.listProducts(searchRequest)
    expect(searchResponse.status).toBe(200)
    
    const searchResult = await searchResponse.json()
    expect(searchResult.products).toBeDefined()
    
    const foundProduct = searchResult.products.find((p: any) => p.id === product.id)
    expect(foundProduct).toBeDefined()

    console.log('  ✅ Product search and filtering successful')

    // Step 5: Update product
    const updateData = {
      name: 'Updated API Test Product',
      price: 149.99,
      status: 'DRAFT'
    }

    const updateRequest = this.createRequest(`/api/products/${product.id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    })

    const updateResponse = await handlers.updateProduct(updateRequest, { id: product.id })
    expect(updateResponse.status).toBe(200)
    
    const updateResult = await updateResponse.json()
    expect(updateResult.product.name).toBe(updateData.name)
    expect(updateResult.product.price).toBe(updateData.price)

    console.log('  ✅ Product update successful')

    return { product: updateResult.product, category }
  }

  /**
   * Test media workflow
   */
  async testMediaWorkflow(
    handlers: {
      uploadMedia: (request: NextRequest) => Promise<Response>
      getMedia: (request: NextRequest, params: { id: string }) => Promise<Response>
      updateMedia: (request: NextRequest, params: { id: string }) => Promise<Response>
      deleteMedia: (request: NextRequest, params: { id: string }) => Promise<Response>
      listMedia: (request: NextRequest) => Promise<Response>
    }
  ): Promise<{ media: any }> {
    console.log('📸 Testing media workflow...')

    // Step 1: Upload media file
    const mediaData = {
      filename: `api-test-image-${Date.now()}.jpg`,
      originalName: 'API Test Image.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024000,
      width: 800,
      height: 600,
      altText: 'API test image',
      folder: 'test-uploads'
    }

    const uploadRequest = this.createRequest('/api/media', {
      method: 'POST',
      body: JSON.stringify(mediaData)
    })

    const uploadResponse = await handlers.uploadMedia(uploadRequest)
    expect(uploadResponse.status).toBe(201)
    
    const uploadResult = await uploadResponse.json()
    const media = uploadResult.media

    console.log('  ✅ Media upload successful')

    // Step 2: Get media details
    const getRequest = this.createRequest(`/api/media/${media.id}`)
    const getResponse = await handlers.getMedia(getRequest, { id: media.id })
    expect(getResponse.status).toBe(200)
    
    const getResult = await getResponse.json()
    expect(getResult.media.filename).toBe(mediaData.filename)

    console.log('  ✅ Media retrieval successful')

    // Step 3: Update media metadata
    const updateData = {
      altText: 'Updated API test image',
      folder: 'updated-uploads'
    }

    const updateRequest = this.createRequest(`/api/media/${media.id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    })

    const updateResponse = await handlers.updateMedia(updateRequest, { id: media.id })
    expect(updateResponse.status).toBe(200)
    
    const updateResult = await updateResponse.json()
    expect(updateResult.media.altText).toBe(updateData.altText)

    console.log('  ✅ Media update successful')

    // Step 4: List media with filtering
    const listRequest = this.createRequest('/api/media', {}, {
      folder: 'updated-uploads',
      mimeType: 'image/jpeg'
    })

    const listResponse = await handlers.listMedia(listRequest)
    expect(listResponse.status).toBe(200)
    
    const listResult = await listResponse.json()
    const foundMedia = listResult.mediaFiles.find((m: any) => m.id === media.id)
    expect(foundMedia).toBeDefined()

    console.log('  ✅ Media listing and filtering successful')

    return { media: updateResult.media }
  }

  /**
   * Test error handling scenarios
   */
  async testErrorHandling(
    handlers: {
      create: (request: NextRequest) => Promise<Response>
      read: (request: NextRequest, params: { id: string }) => Promise<Response>
    }
  ): Promise<void> {
    console.log('⚠️ Testing error handling scenarios...')

    // Test validation errors
    const invalidRequest = this.createRequest('/api/products', {
      method: 'POST',
      body: JSON.stringify({
        name: '', // Invalid empty name
        price: -10 // Invalid negative price
      })
    })

    const validationResponse = await handlers.create(invalidRequest)
    expect(validationResponse.status).toBe(400)
    
    const validationResult = await validationResponse.json()
    expect(validationResult.error).toBeDefined()
    expect(validationResult.error.code).toBe('VALIDATION_ERROR')

    console.log('  ✅ Validation error handling successful')

    // Test not found errors
    const notFoundRequest = this.createRequest('/api/products/non-existent-id')
    const notFoundResponse = await handlers.read(notFoundRequest, { id: 'non-existent-id' })
    expect(notFoundResponse.status).toBe(404)
    
    const notFoundResult = await notFoundResponse.json()
    expect(notFoundResult.error).toBeDefined()
    expect(notFoundResult.error.code).toBe('NOT_FOUND')

    console.log('  ✅ Not found error handling successful')

    // Test unauthorized access (without auth token)
    const originalToken = this.config.authToken
    this.config.authToken = undefined

    const unauthorizedRequest = this.createRequest('/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Product' })
    })

    const unauthorizedResponse = await handlers.create(unauthorizedRequest)
    expect(unauthorizedResponse.status).toBe(401)

    // Restore auth token
    this.config.authToken = originalToken

    console.log('  ✅ Unauthorized access handling successful')
  }

  /**
   * Test concurrent operations
   */
  async testConcurrentOperations(
    handlers: {
      create: (request: NextRequest) => Promise<Response>
      list: (request: NextRequest) => Promise<Response>
    }
  ): Promise<void> {
    console.log('🔄 Testing concurrent operations...')

    // Create multiple entities concurrently
    const createPromises = Array.from({ length: 5 }, (_, index) => {
      const request = this.createRequest('/api/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: `Concurrent Category ${index}`,
          slug: `concurrent-category-${index}-${Date.now()}`,
          description: `Category created concurrently ${index}`
        })
      })
      return handlers.create(request)
    })

    const responses = await Promise.all(createPromises)
    
    // Verify all creations succeeded
    responses.forEach((response, index) => {
      expect(response.status).toBe(201)
    })

    console.log('  ✅ Concurrent creation successful')

    // Verify all entities exist
    const listRequest = this.createRequest('/api/categories')
    const listResponse = await handlers.list(listRequest)
    expect(listResponse.status).toBe(200)
    
    const listResult = await listResponse.json()
    const concurrentCategories = listResult.categories.filter((c: any) => 
      c.name.startsWith('Concurrent Category')
    )
    expect(concurrentCategories).toHaveLength(5)

    console.log('  ✅ Concurrent operations verification successful')
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.config.authToken = token
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.config.authToken = undefined
  }
}

/**
 * API Response Validator
 * Validates API responses against expected schemas
 */
export class APIResponseValidator {
  /**
   * Validate standard API response structure
   */
  static validateStandardResponse(response: any, expectedStatus: number): void {
    expect(response.status).toBe(expectedStatus)
    
    if (expectedStatus >= 400) {
      expect(response.error).toBeDefined()
      expect(response.error.code).toBeDefined()
      expect(response.error.message).toBeDefined()
    }
  }

  /**
   * Validate pagination response
   */
  static validatePaginationResponse(response: any): void {
    expect(response.pagination).toBeDefined()
    expect(response.pagination.page).toBeDefined()
    expect(response.pagination.limit).toBeDefined()
    expect(response.pagination.total).toBeDefined()
    expect(response.pagination.totalPages).toBeDefined()
  }

  /**
   * Validate entity response
   */
  static validateEntityResponse(response: any, entityName: string, requiredFields: string[]): void {
    expect(response[entityName]).toBeDefined()
    
    const entity = response[entityName]
    requiredFields.forEach(field => {
      expect(entity[field]).toBeDefined()
    })
  }

  /**
   * Validate list response
   */
  static validateListResponse(response: any, entityName: string): void {
    const pluralName = `${entityName}s`
    expect(response[pluralName]).toBeDefined()
    expect(Array.isArray(response[pluralName])).toBe(true)
  }
}

// Export convenience functions
export const createAPITester = (context: IntegrationTestContext, config?: Partial<APITestConfig>) =>
  new APIWorkflowTester(context, config)

export const validateResponse = APIResponseValidator.validateStandardResponse
export const validatePagination = APIResponseValidator.validatePaginationResponse
export const validateEntity = APIResponseValidator.validateEntityResponse
export const validateList = APIResponseValidator.validateListResponse