/**
 * NextAuth Mock Test
 * Verifies that NextAuth mocking is working correctly
 */

import { getServerSession } from 'next-auth'
import { UserRole } from '@prisma/client'
import { authHelpers } from './helpers/nextauth-helpers'

// Mock NextAuth
jest.mock('next-auth')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('NextAuth Mocking', () => {
  beforeEach(() => {
    authHelpers.resetMocks()
  })

  afterEach(() => {
    authHelpers.clearMockSession()
  })

  describe('Basic Mock Functionality', () => {
    it('should provide default admin session', async () => {
      const session = await getServerSession()
      
      expect(session).toBeDefined()
      expect(session?.user).toBeDefined()
      expect(session?.user.role).toBe(UserRole.ADMIN)
      expect(session?.user.email).toBe('admin@example.com')
    })

    it('should allow setting custom session', async () => {
      const customSession = authHelpers.createMockSession(UserRole.EDITOR, {
        email: 'custom@example.com',
        name: 'Custom User'
      })
      
      authHelpers.setMockSession(customSession)
      
      const session = await getServerSession()
      expect(session?.user.role).toBe(UserRole.EDITOR)
      expect(session?.user.email).toBe('custom@example.com')
      expect(session?.user.name).toBe('Custom User')
    })

    it('should allow clearing session (unauthenticated)', async () => {
      authHelpers.clearMockSession()
      
      const session = await getServerSession()
      expect(session).toBeNull()
    })
  })

  describe('Role-based Sessions', () => {
    it('should create admin session', async () => {
      const session = authHelpers.mockAdminSession()
      
      expect(session.user.role).toBe(UserRole.ADMIN)
      expect(session.user.email).toBe('admin@example.com')
      
      const serverSession = await getServerSession()
      expect(serverSession?.user.role).toBe(UserRole.ADMIN)
    })

    it('should create editor session', async () => {
      const session = authHelpers.mockEditorSession()
      
      expect(session.user.role).toBe(UserRole.EDITOR)
      expect(session.user.email).toBe('editor@example.com')
      
      const serverSession = await getServerSession()
      expect(serverSession?.user.role).toBe(UserRole.EDITOR)
    })

    it('should create viewer session', async () => {
      const session = authHelpers.mockViewerSession()
      
      expect(session.user.role).toBe(UserRole.VIEWER)
      expect(session.user.email).toBe('viewer@example.com')
      
      const serverSession = await getServerSession()
      expect(serverSession?.user.role).toBe(UserRole.VIEWER)
    })
  })

  describe('JWT Token Mocking', () => {
    it('should create mock tokens for different roles', () => {
      const adminToken = authHelpers.createMockToken(UserRole.ADMIN)
      const editorToken = authHelpers.createMockToken(UserRole.EDITOR)
      const viewerToken = authHelpers.createMockToken(UserRole.VIEWER)
      
      expect(adminToken).toContain('mock-admin-token')
      expect(editorToken).toContain('mock-editor-token')
      expect(viewerToken).toContain('mock-viewer-token')
    })
  })

  describe('Request Helpers', () => {
    it('should create authenticated request', () => {
      const session = authHelpers.createMockSession(UserRole.ADMIN)
      const request = authHelpers.mockAuthenticatedRequest(session)
      
      expect(request.headers).toBeDefined()
      expect(request.cookies).toBeDefined()
    })

    it('should create unauthenticated request', () => {
      const request = authHelpers.mockUnauthenticatedRequest()
      
      expect(request.headers).toBeDefined()
      expect(request.cookies).toBeDefined()
    })
  })

  describe('Mock Reset Functionality', () => {
    it('should reset mocks to default state', async () => {
      // Set custom session
      authHelpers.mockEditorSession()
      let session = await getServerSession()
      expect(session?.user.role).toBe(UserRole.EDITOR)
      
      // Reset mocks
      authHelpers.resetMocks()
      session = await getServerSession()
      expect(session?.user.role).toBe(UserRole.ADMIN) // Back to default
    })

    it('should clear mock calls', () => {
      // Make some calls
      authHelpers.mockAdminSession()
      authHelpers.mockEditorSession()
      
      expect(mockGetServerSession).toHaveBeenCalled()
      
      // Reset should clear call history
      authHelpers.resetMocks()
      expect(mockGetServerSession).toHaveBeenCalledTimes(0)
    })
  })
})