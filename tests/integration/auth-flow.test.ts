/**
 * Authentication Flow Integration Tests
 * Tests the complete authentication workflow from registration to login
 * Enhanced with proper error handling and recovery mechanisms
 */

import { NextRequest } from 'next/server'
import { POST as registerUser } from '../../app/api/auth/register/route'
import { POST as loginUser } from '../../app/api/auth/login/route'
import { GET as getProfile } from '../../app/api/auth/me/route'
import { 
  useIsolatedTestContext,
  createAPITester,
  APIWorkflowTester
} from '../helpers/integration-test-utils'
import { 
  executeWithRecovery,
  executeDatabaseOperation,
  handleUniqueConstraint
} from '../helpers/error-recovery-utils'

describe('Authentication Flow Integration', () => {
  const { getContext } = useIsolatedTestContext({
    isolationStrategy: 'transaction',
    seedData: false,
    cleanupAfterEach: true
  })

  let apiTester: APIWorkflowTester

  beforeEach(() => {
    const context = getContext()
    apiTester = createAPITester(context)
  })

  it('should complete full registration and login flow', async () => {
    const context = getContext()
    
    await executeWithRecovery(
      async () => {
        // Test complete authentication workflow with enhanced error handling
        const { user, token } = await apiTester.testAuthenticationWorkflow({
          register: registerUser,
          login: loginUser,
          profile: getProfile
        })

        // Verify user was created in database with proper isolation
        const dbUser = await executeDatabaseOperation(
          async (prisma) => {
            return await prisma.user.findUnique({
              where: { email: user.email }
            })
          },
          'auth-flow-test',
          'verify-user-creation'
        )

        expect(dbUser).toBeTruthy()
        expect(dbUser?.email).toBe(user.email)
        expect(dbUser?.name).toBe(user.name)
        expect(dbUser?.isActive).toBe(true)

        // Verify token is valid and can be used for subsequent requests
        apiTester.setAuthToken(token)
        
        const profileRequest = apiTester.createRequest('/api/auth/me')
        const profileResponse = await getProfile(profileRequest)
        expect(profileResponse.status).toBe(200)
        
        const profileData = await profileResponse.json()
        expect(profileData.user.email).toBe(user.email)
      },
      {
        testName: 'complete-auth-flow',
        operation: 'full-authentication-workflow'
      },
      {
        maxRetries: 3,
        retryDelay: 200
      }
    )
  })

  it('should prevent duplicate registration', async () => {
    const testEmail = `duplicate-test-${Date.now()}@example.com`
    const userData = {
      name: 'Test User',
      email: testEmail,
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!',
      role: 'EDITOR'
    }

    await executeWithRecovery(
      async () => {
        // First registration should succeed
        const firstRequest = apiTester.createRequest('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(userData)
        })

        const firstResponse = await registerUser(firstRequest)
        expect(firstResponse.status).toBe(201)

        // Second registration with same email should fail with proper error handling
        const secondRequest = apiTester.createRequest('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(userData)
        })

        const secondResponse = await registerUser(secondRequest)
        const secondData = await secondResponse.json()

        expect(secondResponse.status).toBe(409)
        expect(secondData.error).toBeDefined()
        expect(secondData.error.code).toBe('DUPLICATE_ENTRY')
      },
      {
        testName: 'duplicate-registration',
        operation: 'prevent-duplicate-registration'
      }
    )
  })

  it('should reject login with invalid credentials', async () => {
    const context = getContext()
    const testEmail = `invalid-creds-${Date.now()}@example.com`
    const correctPassword = 'CorrectPassword123!'
    const wrongPassword = 'WrongPassword123!'

    await executeWithRecovery(
      async () => {
        // Register user first with proper error handling
        await handleUniqueConstraint(
          async () => {
            const user = await context.createUser({
              email: testEmail,
              name: 'Test User',
              passwordHash: 'hashed-correct-password',
              role: 'EDITOR'
            })
            return user
          },
          async () => {
            // Fallback: find existing user
            return await context.prisma.user.findUnique({
              where: { email: testEmail }
            })
          },
          'invalid-credentials-test'
        )

        // Try to login with wrong password
        const loginRequest = apiTester.createRequest('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: testEmail,
            password: wrongPassword
          })
        })

        const loginResponse = await loginUser(loginRequest)
        const loginData = await loginResponse.json()

        expect(loginResponse.status).toBe(401)
        expect(loginData.error).toBeDefined()
        expect(loginData.error.code).toBe('INVALID_CREDENTIALS')
      },
      {
        testName: 'invalid-credentials',
        operation: 'reject-invalid-login'
      }
    )
  })

  it('should handle inactive user login attempt', async () => {
    const context = getContext()
    const testEmail = `inactive-user-${Date.now()}@example.com`
    const testPassword = 'SecurePassword123!'

    await executeWithRecovery(
      async () => {
        // Create and immediately deactivate user with proper transaction handling
        const user = await executeDatabaseOperation(
          async (prisma) => {
            const newUser = await prisma.user.create({
              data: {
                name: 'Inactive User',
                email: testEmail,
                passwordHash: 'hashed-password',
                role: 'EDITOR',
                isActive: false, // Create as inactive
                createdAt: new Date(),
                updatedAt: new Date()
              }
            })
            return newUser
          },
          'inactive-user-test',
          'create-inactive-user'
        )

        // Try to login with inactive user
        const loginRequest = apiTester.createRequest('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: testEmail,
            password: testPassword
          })
        })

        const loginResponse = await loginUser(loginRequest)
        const loginData = await loginResponse.json()

        expect(loginResponse.status).toBe(401)
        expect(loginData.error).toBeDefined()
        expect(loginData.error.code).toBe('ACCOUNT_INACTIVE')
      },
      {
        testName: 'inactive-user-login',
        operation: 'handle-inactive-user'
      }
    )
  })

  it('should handle concurrent authentication requests', async () => {
    await executeWithRecovery(
      async () => {
        // Test concurrent registration attempts
        const userPromises = Array.from({ length: 3 }, (_, index) => {
          const userData = {
            name: `Concurrent User ${index}`,
            email: `concurrent-${index}-${Date.now()}@example.com`,
            password: 'SecurePassword123!',
            confirmPassword: 'SecurePassword123!',
            role: 'EDITOR'
          }

          const request = apiTester.createRequest('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
          })

          return registerUser(request)
        })

        const responses = await Promise.all(userPromises)
        
        // All registrations should succeed
        responses.forEach((response, index) => {
          expect(response.status).toBe(201)
        })

        // Verify all users were created
        const userCount = await executeDatabaseOperation(
          async (prisma) => {
            return await prisma.user.count({
              where: {
                email: {
                  contains: `concurrent-`
                }
              }
            })
          },
          'concurrent-auth-test',
          'count-concurrent-users'
        )

        expect(userCount).toBe(3)
      },
      {
        testName: 'concurrent-authentication',
        operation: 'handle-concurrent-requests'
      },
      {
        maxRetries: 5,
        retryDelay: 300
      }
    )
  })

  it('should test error handling scenarios', async () => {
    await executeWithRecovery(
      async () => {
        // Test authentication error handling
        await apiTester.testErrorHandling({
          create: registerUser,
          read: async (request, params) => {
            // Mock a read operation for error testing
            return new Response(JSON.stringify({ error: { code: 'NOT_FOUND' } }), { status: 404 })
          }
        })
      },
      {
        testName: 'auth-error-handling',
        operation: 'test-error-scenarios'
      }
    )
  })
})