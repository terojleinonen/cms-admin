/**
 * Authentication Flow Integration Tests
 * Tests the complete authentication workflow from registration to login
 */

import { NextRequest } from 'next/server'
import { POST as registerUser } from '../../app/api/auth/register/route'
import { POST as loginUser } from '../../app/api/auth/login/route'
import { GET as getProfile } from '../../app/api/auth/me/route'
import { prisma } from '../../app/lib/db'
import { initTestDatabase, cleanupTestDatabase } from '../setup'

describe('Authentication Flow Integration', () => {
  beforeAll(async () => {
    await initTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    // Clean up users before each test
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'integration-test'
        }
      }
    })
  })

  it('should complete full registration and login flow', async () => {
    const testEmail = 'integration-test-user@example.com'
    const testPassword = 'SecurePassword123!'
    const testName = 'Integration Test User'

    // Step 1: Register a new user
    const registerRequest = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: testName,
        email: testEmail,
        password: testPassword,
        role: 'EDITOR'
      })
    })

    const registerResponse = await registerUser(registerRequest)
    const registerData = await registerResponse.json()

    expect(registerResponse.status).toBe(201)
    expect(registerData.user.email).toBe(testEmail)
    expect(registerData.user.name).toBe(testName)
    expect(registerData.user.role).toBe('EDITOR')
    expect(registerData.user.id).toBeDefined()

    // Step 2: Verify user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { email: testEmail }
    })

    expect(dbUser).toBeTruthy()
    expect(dbUser?.email).toBe(testEmail)
    expect(dbUser?.name).toBe(testName)
    expect(dbUser?.isActive).toBe(true)

    // Step 3: Login with the new user credentials
    const loginRequest = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    })

    const loginResponse = await loginUser(loginRequest)
    const loginData = await loginResponse.json()

    expect(loginResponse.status).toBe(200)
    expect(loginData.user.email).toBe(testEmail)
    expect(loginData.user.name).toBe(testName)
    expect(loginData.token).toBeDefined()

    // Step 4: Use token to access protected profile endpoint
    const profileRequest = new NextRequest('http://localhost/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    })

    const profileResponse = await getProfile(profileRequest)
    const profileData = await profileResponse.json()

    expect(profileResponse.status).toBe(200)
    expect(profileData.user.email).toBe(testEmail)
    expect(profileData.user.name).toBe(testName)
    expect(profileData.user.role).toBe('EDITOR')
  })

  it('should prevent duplicate registration', async () => {
    const testEmail = 'integration-duplicate@example.com'
    const userData = {
      name: 'Test User',
      email: testEmail,
      password: 'SecurePassword123!',
      role: 'EDITOR'
    }

    // First registration should succeed
    const firstRequest = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    })

    const firstResponse = await registerUser(firstRequest)
    expect(firstResponse.status).toBe(201)

    // Second registration with same email should fail
    const secondRequest = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    })

    const secondResponse = await registerUser(secondRequest)
    const secondData = await secondResponse.json()

    expect(secondResponse.status).toBe(409)
    expect(secondData.error.code).toBe('DUPLICATE_ENTRY')
  })

  it('should reject login with invalid credentials', async () => {
    const testEmail = 'integration-invalid@example.com'
    const correctPassword = 'CorrectPassword123!'
    const wrongPassword = 'WrongPassword123!'

    // Register user first
    const registerRequest = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test User',
        email: testEmail,
        password: correctPassword,
        role: 'EDITOR'
      })
    })

    await registerUser(registerRequest)

    // Try to login with wrong password
    const loginRequest = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: wrongPassword
      })
    })

    const loginResponse = await loginUser(loginRequest)
    const loginData = await loginResponse.json()

    expect(loginResponse.status).toBe(401)
    expect(loginData.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('should handle inactive user login attempt', async () => {
    const testEmail = 'integration-inactive@example.com'
    const testPassword = 'SecurePassword123!'

    // Register user first
    const registerRequest = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Inactive User',
        email: testEmail,
        password: testPassword,
        role: 'EDITOR'
      })
    })

    const registerResponse = await registerUser(registerRequest)
    const registerData = await registerResponse.json()

    // Deactivate the user
    await prisma.user.update({
      where: { id: registerData.user.id },
      data: { isActive: false }
    })

    // Try to login with inactive user
    const loginRequest = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    })

    const loginResponse = await loginUser(loginRequest)
    const loginData = await loginResponse.json()

    expect(loginResponse.status).toBe(401)
    expect(loginData.error.code).toBe('ACCOUNT_INACTIVE')
  })
})