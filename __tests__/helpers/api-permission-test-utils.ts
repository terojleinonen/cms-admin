/**
 * API Permission Testing Utilities
 * Comprehensive utilities for testing API endpoints with permission-based access control
 */

import { NextRequest } from 'next/server'
import { UserRole } from '@prisma/client'
import { jest } from '@jest/globals'

// Test User Factory
export class TestUserFactory {
  static createUser(role: UserRole = UserRole.VIEWER, overrides: any = {}) {
    return {
      id: `user-${role.toLowerCase()}-${Date.now()}`,
      email: `${role.toLowerCase()}@test.com`,
      name: `Test ${role}`,
      role,
      isActive: true,
      emailVerified: new Date(),
      twoFactorEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    }
  }

  static createAdmin(overrides: any = {}) {
    return this.createUser(UserRole.ADMIN, overrides)
  }

  static createEditor(overrides: any = {}) {
    return this.createUser(UserRole.EDITOR, overrides)
  }

  static createViewer(overrides: any = {}) {
    return this.createUser(UserRole.VIEWER, overrides)
  }

  static createAllRoles() {
    return [
      this.createAdmin(),
      this.createEditor(),
      this.createViewer()
    ]
  }
}

// Mock Auth Service
export class MockAuthService {
  private static instance: MockAuthService
  private sessions: Map<string, any> = new Map()

  static getInstance() {
    if (!MockAuthService.instance) {
      MockAuthService.instance = new MockAuthService()
    }
    return MockAuthService.instance
  }

  static mockAuthenticatedUser(user: any) {
    const instance = MockAuthService.getInstance()
    return instance.createSession(user)
  }

  static mockUnauthenticatedUser() {
    const instance = MockAuthService.getInstance()
    instance.clearSessions()
  }

  static mockUnauthenticated() {
    MockAuthService.mockUnauthenticatedUser()
  }

  createSession(user: any) {
    const token = `token-${user.id}`
    const session = {
      user,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      accessToken: token
    }
    this.sessions.set(token, session)
    return { session, token }
  }

  getSession(token: string) {
    return this.sessions.get(token) || null
  }

  clearSessions() {
    this.sessions.clear()
  }
}

// Mock Permission Service
export class MockPermissionService {
  private static instance: MockPermissionService
  private permissions: Map<string, string[]> = new Map()

  static getInstance() {
    if (!MockPermissionService.instance) {
      MockPermissionService.instance = new MockPermissionService()
    }
    return MockPermissionService.instance
  }

  static mockAdminPermissions() {
    const instance = MockPermissionService.getInstance()
    instance.setUserPermissions('admin', ['*'])
  }

  static mockEditorPermissions() {
    const instance = MockPermissionService.getInstance()
    instance.setUserPermissions('editor', ['read', 'write'])
  }

  static mockViewerPermissions() {
    const instance = MockPermissionService.getInstance()
    instance.setUserPermissions('viewer', ['read'])
  }

  static mockPermissions(userId: string, permissions: string[]) {
    const instance = MockPermissionService.getInstance()
    instance.setUserPermissions(userId, permissions)
  }

  setUserPermissions(userId: string, permissions: string[]) {
    this.permissions.set(userId, permissions)
  }

  hasPermission(userId: string, permission: string): boolean {
    const userPermissions = this.permissions.get(userId) || []
    return userPermissions.includes(permission) || userPermissions.includes('*')
  }

  clearPermissions() {
    this.permissions.clear()
  }
}

// API Request Builder
export class ApiRequestBuilder {
  private url: string = 'http://localhost:3001/api/test'
  private method: string = 'GET'
  private headers: Record<string, string> = {}
  private body: any = null

  static get(url: string) {
    return new ApiRequestBuilder().setUrl(url).setMethod('GET')
  }

  static post(url: string) {
    return new ApiRequestBuilder().setUrl(url).setMethod('POST')
  }

  static put(url: string) {
    return new ApiRequestBuilder().setUrl(url).setMethod('PUT')
  }

  static delete(url: string) {
    return new ApiRequestBuilder().setUrl(url).setMethod('DELETE')
  }

  setUrl(url: string) {
    this.url = url
    return this
  }

  setMethod(method: string) {
    this.method = method
    return this
  }

  setHeaders(headers: Record<string, string>) {
    this.headers = { ...this.headers, ...headers }
    return this
  }

  setAuth(token: string) {
    this.headers['Authorization'] = `Bearer ${token}`
    return this
  }

  setBody(body: any) {
    this.body = body
    this.headers['Content-Type'] = 'application/json'
    return this
  }

  build(): NextRequest {
    const request = new NextRequest(this.url, {
      method: this.method,
      headers: this.headers,
      body: this.body ? JSON.stringify(this.body) : undefined
    })
    return request
  }
}

// API Response Validator
export class ApiResponseValidator {
  static expectSuccess(response: any, expectedStatus: number = 200) {
    expect(response.status).toBe(expectedStatus)
  }

  static expectUnauthorized(response: any) {
    expect(response.status).toBe(401)
  }

  static expectForbidden(response: any) {
    expect(response.status).toBe(403)
  }

  static expectNotFound(response: any) {
    expect(response.status).toBe(404)
  }

  static expectBadRequest(response: any) {
    expect(response.status).toBe(400)
  }

  static async expectJsonResponse(response: any, expectedData?: any) {
    const data = await response.json()
    if (expectedData) {
      expect(data).toMatchObject(expectedData)
    }
    return data
  }

  static async validateSuccessResponse(response: any, expectedStatus: number = 200) {
    expect(response.status).toBe(expectedStatus)
    const data = await response.json()
    return data
  }

  static async validateErrorResponse(response: any, expectedStatus: number) {
    expect(response.status).toBe(expectedStatus)
    const data = await response.json()
    expect(data.error).toBeDefined()
    return data
  }
}

// API Test Setup
export class ApiTestSetup {
  authService: MockAuthService
  permissionService: MockPermissionService
  private static instance: ApiTestSetup | null = null

  constructor() {
    this.authService = new MockAuthService()
    this.permissionService = new MockPermissionService()
  }

  static getInstance(): ApiTestSetup {
    if (!ApiTestSetup.instance) {
      ApiTestSetup.instance = new ApiTestSetup()
    }
    return ApiTestSetup.instance
  }

  static initializeAll(): void {
    ApiTestSetup.instance = new ApiTestSetup()
  }

  static resetAll(): void {
    if (ApiTestSetup.instance) {
      ApiTestSetup.instance.cleanup()
    }
  }

  createAuthenticatedRequest(role: UserRole, url: string, method: string = 'GET') {
    const user = TestUserFactory.createUser(role)
    const { token } = this.authService.createSession(user)
    
    return new ApiRequestBuilder()
      .setUrl(url)
      .setMethod(method)
      .setAuth(token)
      .build()
  }

  cleanup() {
    this.authService.clearSessions()
    this.permissionService.clearPermissions()
  }
}

// Security Test Generator
export class SecurityTestGenerator {
  static generateRoleTests(
    endpoint: string,
    allowedRoles: UserRole[],
    handler: (request: NextRequest) => Promise<any>
  ) {
    const allRoles = [UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER]
    const tests: any[] = []

    allRoles.forEach(role => {
      const shouldAllow = allowedRoles.includes(role)
      tests.push({
        role,
        shouldAllow,
        description: `${shouldAllow ? 'allows' : 'denies'} ${role} access to ${endpoint}`
      })
    })

    return tests
  }

  static generatePermissionTests(
    endpoint: string,
    requiredPermissions: string[],
    handler: (request: NextRequest) => Promise<any>
  ) {
    return requiredPermissions.map(permission => ({
      permission,
      description: `requires ${permission} permission for ${endpoint}`
    }))
  }

  static generateComprehensiveTestSuite(
    endpoint: string,
    handler: (request: NextRequest) => Promise<any>,
    options: {
      allowedRoles?: UserRole[]
      requiredPermissions?: string[]
      methods?: string[]
    } = {}
  ) {
    const roleTests = this.generateRoleTests(
      endpoint,
      options.allowedRoles || [UserRole.ADMIN],
      handler
    )

    const permissionTests = options.requiredPermissions
      ? this.generatePermissionTests(endpoint, options.requiredPermissions, handler)
      : []

    return {
      roleTests,
      permissionTests,
      methods: options.methods || ['GET', 'POST', 'PUT', 'DELETE']
    }
  }
}

// API Test Runner
export class ApiTestRunner {
  private setup: ApiTestSetup

  constructor() {
    this.setup = new ApiTestSetup()
  }

  async runRoleTest(
    role: UserRole,
    endpoint: string,
    method: string,
    handler: (request: NextRequest) => Promise<any>,
    shouldSucceed: boolean
  ) {
    const request = this.setup.createAuthenticatedRequest(role, endpoint, method)
    const response = await handler(request)

    if (shouldSucceed) {
      ApiResponseValidator.expectSuccess(response)
    } else {
      ApiResponseValidator.expectForbidden(response)
    }

    return response
  }

  cleanup() {
    this.setup.cleanup()
  }
}
