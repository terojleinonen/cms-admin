/**
 * User API endpoints tests
 * Tests for user CRUD operations and access control
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { UserRole } from '@prisma/client'
import { GET, POST } from '../../app/api/users/route'
import { GET as getUserById, PUT as updateUser, DELETE as deleteUser } from '../../app/api/users/[id]/route'
import { prisma } from '../../app/lib/db'
import { hashPassword } from '../../app/lib/password-utils'

// Mock dependencies
jest.mock('next-auth')
jest.mock('../../app/lib/db', () => ({
  prisma: {
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))
jest.mock('../../app/lib/password-utils')
jest.mock('../../app/lib/auth-config', () => ({
  authConfig: {
    providers: [],
    callbacks: {},
    pages: {},
  },
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/users', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/users', () => {
    it('should return users list for admin user', async () => {
      // Mock admin session
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: UserRole.ADMIN, name: 'Admin', email: 'admin@test.com' }
      } as any)

      // Mock database responses
      mockPrisma.user.count.mockResolvedValue(2)
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: '1',
          name: 'Admin User',
          email: 'admin@test.com',
          role: UserRole.ADMIN,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { createdProducts: 5, createdPages: 3 }
        },
        {
          id: '2',
          name: 'Editor User',
          email: 'editor@test.com',
          role: UserRole.EDITOR,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { createdProducts: 2, createdPages: 1 }
        }
      ] as any)

      const request = new NextRequest('http://localhost/api/users')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.users).toHaveLength(2)
      expect(data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      })
    })

    it('should deny access for non-admin users', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '2', role: UserRole.EDITOR, name: 'Editor', email: 'editor@test.com' }
      } as any)

      const request = new NextRequest('http://localhost/api/users')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })

    it('should deny access for unauthenticated users', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/users')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should handle search and filtering', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: UserRole.ADMIN, name: 'Admin', email: 'admin@test.com' }
      } as any)

      mockPrisma.user.count.mockResolvedValue(1)
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: '2',
          name: 'Editor User',
          email: 'editor@test.com',
          role: UserRole.EDITOR,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { createdProducts: 2, createdPages: 1 }
        }
      ] as any)

      const request = new NextRequest('http://localhost/api/users?search=editor&role=EDITOR')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'editor', mode: 'insensitive' } },
              { email: { contains: 'editor', mode: 'insensitive' } },
            ],
            role: 'EDITOR'
          }
        })
      )
    })
  })

  describe('POST /api/users', () => {
    it('should create a new user for admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: UserRole.ADMIN, name: 'Admin', email: 'admin@test.com' }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue(null) // Email doesn't exist
      mockHashPassword.mockResolvedValue('hashed_password')
      mockPrisma.user.create.mockResolvedValue({
        id: '3',
        name: 'New User',
        email: 'new@test.com',
        role: UserRole.EDITOR,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New User',
          email: 'new@test.com',
          password: 'password123',
          role: 'EDITOR'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.user.name).toBe('New User')
      expect(data.user.email).toBe('new@test.com')
      expect(mockHashPassword).toHaveBeenCalledWith('password123')
    })

    it('should reject duplicate email', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: UserRole.ADMIN, name: 'Admin', email: 'admin@test.com' }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue({
        id: '2',
        email: 'existing@test.com'
      } as any)

      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New User',
          email: 'existing@test.com',
          password: 'password123',
          role: 'EDITOR'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error.code).toBe('DUPLICATE_ENTRY')
    })

    it('should validate required fields', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: UserRole.ADMIN, name: 'Admin', email: 'admin@test.com' }
      } as any)

      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: '',
          email: 'invalid-email',
          password: '123', // Too short
          role: 'INVALID_ROLE'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.details).toBeDefined()
    })
  })
})

describe('/api/users/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/users/[id]', () => {
    it('should return user data for admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: UserRole.ADMIN, name: 'Admin', email: 'admin@test.com' }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue({
        id: '2',
        name: 'Test User',
        email: 'test@test.com',
        role: UserRole.EDITOR,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { createdProducts: 1, createdPages: 0 }
      } as any)

      const request = new NextRequest('http://localhost/api/users/2')
      const response = await getUserById(request, { params: { id: '2' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user.id).toBe('2')
      expect(data.user.name).toBe('Test User')
    })

    it('should allow users to view their own profile', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '2', role: UserRole.EDITOR, name: 'Editor', email: 'editor@test.com' }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue({
        id: '2',
        name: 'Editor User',
        email: 'editor@test.com',
        role: UserRole.EDITOR,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { createdProducts: 1, createdPages: 0 }
      } as any)

      const request = new NextRequest('http://localhost/api/users/2')
      const response = await getUserById(request, { params: { id: '2' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user.id).toBe('2')
    })

    it('should deny access to other users profiles for non-admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '2', role: UserRole.EDITOR, name: 'Editor', email: 'editor@test.com' }
      } as any)

      const request = new NextRequest('http://localhost/api/users/3')
      const response = await getUserById(request, { params: { id: '3' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })
  })

  describe('PUT /api/users/[id]', () => {
    it('should update user for admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: UserRole.ADMIN, name: 'Admin', email: 'admin@test.com' }
      } as any)

      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          id: '2',
          email: 'old@test.com'
        } as any)
        .mockResolvedValueOnce(null) // For email uniqueness check

      mockPrisma.user.update.mockResolvedValue({
        id: '2',
        name: 'Updated User',
        email: 'updated@test.com',
        role: UserRole.EDITOR,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      const request = new NextRequest('http://localhost/api/users/2', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated User',
          email: 'updated@test.com'
        })
      })

      const response = await updateUser(request, { params: { id: '2' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user.name).toBe('Updated User')
      expect(data.user.email).toBe('updated@test.com')
    })

    it('should allow users to update their own profile', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '2', role: UserRole.EDITOR, name: 'Editor', email: 'editor@test.com' }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue({
        id: '2',
        email: 'editor@test.com'
      } as any)

      mockPrisma.user.update.mockResolvedValue({
        id: '2',
        name: 'Updated Editor',
        email: 'editor@test.com',
        role: UserRole.EDITOR,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      const request = new NextRequest('http://localhost/api/users/2', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Editor'
        })
      })

      const response = await updateUser(request, { params: { id: '2' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user.name).toBe('Updated Editor')
    })

    it('should prevent non-admin users from changing roles', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '2', role: UserRole.EDITOR, name: 'Editor', email: 'editor@test.com' }
      } as any)

      const request = new NextRequest('http://localhost/api/users/2', {
        method: 'PUT',
        body: JSON.stringify({
          role: 'ADMIN' // Non-admin trying to change role
        })
      })

      const response = await updateUser(request, { params: { id: '2' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })
  })

  describe('DELETE /api/users/[id]', () => {
    it('should delete user for admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: UserRole.ADMIN, name: 'Admin', email: 'admin@test.com' }
      } as any)

      mockPrisma.user.findUnique.mockResolvedValue({
        id: '2',
        name: 'User to Delete'
      } as any)

      mockPrisma.user.delete.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/users/2')
      const response = await deleteUser(request, { params: { id: '2' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('User deleted successfully')
    })

    it('should prevent self-deletion', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: UserRole.ADMIN, name: 'Admin', email: 'admin@test.com' }
      } as any)

      const request = new NextRequest('http://localhost/api/users/1')
      const response = await deleteUser(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
      expect(data.error.message).toBe('Cannot delete your own account')
    })

    it('should deny access for non-admin users', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '2', role: UserRole.EDITOR, name: 'Editor', email: 'editor@test.com' }
      } as any)

      const request = new NextRequest('http://localhost/api/users/3')
      const response = await deleteUser(request, { params: { id: '3' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })
  })
})