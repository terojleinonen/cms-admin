/**
 * Two-Factor Authentication API Integration Tests
 * Tests for 2FA setup, verification, and management endpoints
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/app/lib/db'
import { 
  generateTwoFactorSetup,
  enableTwoFactorAuth,
  disableTwoFactorAuth,
  validateTwoFactorForLogin,
  getRemainingBackupCodes,
  regenerateBackupCodes
} from '@/app/lib/two-factor-auth'

// Import API handlers
import { GET as setupGet, POST as setupPost } from '@/app/api/users/[id]/two-factor/setup/route'
import { POST as verifyPost } from '@/app/api/users/[id]/two-factor/verify/route'
import { POST as disablePost } from '@/app/api/users/[id]/two-factor/disable/route'
import { GET as backupGet, POST as backupPost } from '@/app/api/users/[id]/two-factor/backup-codes/route'
import { GET as statusGet } from '@/app/api/users/[id]/two-factor/status/route'

// Mock dependencies
jest.mock('next-auth')
jest.mock('@/app/lib/db')
jest.mock('@/app/lib/two-factor-auth')
jest.mock('@/app/lib/audit-service')
jest.mock('@/app/lib/password-utils')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockGenerateTwoFactorSetup = generateTwoFactorSetup as jest.MockedFunction<typeof generateTwoFactorSetup>
const mockEnableTwoFactorAuth = enableTwoFactorAuth as jest.MockedFunction<typeof enableTwoFactorAuth>
const mockDisableTwoFactorAuth = disableTwoFactorAuth as jest.MockedFunction<typeof disableTwoFactorAuth>
const mockValidateTwoFactorForLogin = validateTwoFactorForLogin as jest.MockedFunction<typeof validateTwoFactorForLogin>
const mockGetRemainingBackupCodes = getRemainingBackupCodes as jest.MockedFunction<typeof getRemainingBackupCodes>
const mockRegenerateBackupCodes = regenerateBackupCodes as jest.MockedFunction<typeof regenerateBackupCodes>

// Mock audit service
jest.mock('@/app/lib/audit-service', () => ({
  auditLog: jest.fn()
}))

// Mock password utils
jest.mock('@/app/lib/password-utils', () => ({
  verifyPassword: jest.fn()
}))

describe('Two-Factor Authentication API', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'ADMIN'
  }

  const mockSession = {
    user: mockUser
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue(mockSession as any)
  })

  describe('2FA Setup Endpoints', () => {
    describe('GET /api/users/[id]/two-factor/setup', () => {
      it('should generate 2FA setup data', async () => {
        const mockSetupData = {
          secret: 'JBSWY3DPEHPK3PXP',
          qrCodeUrl: 'data:image/png;base64,mockqrcode',
          backupCodes: ['CODE1', 'CODE2']
        }

        mockPrisma.user.findUnique.mockResolvedValue({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'ADMIN',
          twoFactorEnabled: false
        } as any)

        mockGenerateTwoFactorSetup.mockResolvedValue(mockSetupData)

        const request = new NextRequest('http://localhost/api/users/user-123/two-factor/setup')
        const response = await setupGet(request, { params: { id: 'user-123' } })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toEqual({
          qrCodeUrl: mockSetupData.qrCodeUrl,
          backupCodes: mockSetupData.backupCodes,
          secret: mockSetupData.secret,
          isRequired: true
        })
      })

      it('should reject if 2FA already enabled', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'ADMIN',
          twoFactorEnabled: true
        } as any)

        const request = new NextRequest('http://localhost/api/users/user-123/two-factor/setup')
        const response = await setupGet(request, { params: { id: 'user-123' } })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('2FA is already enabled for this user')
      })

      it('should reject unauthorized access', async () => {
        mockGetServerSession.mockResolvedValue(null)

        const request = new NextRequest('http://localhost/api/users/user-123/two-factor/setup')
        const response = await setupGet(request, { params: { id: 'user-123' } })
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })

      it('should reject access to other users data', async () => {
        mockGetServerSession.mockResolvedValue({
          user: { ...mockUser, id: 'other-user', role: 'EDITOR' }
        } as any)

        const request = new NextRequest('http://localhost/api/users/user-123/two-factor/setup')
        const response = await setupGet(request, { params: { id: 'user-123' } })
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error).toBe('Forbidden')
      })
    })

    describe('POST /api/users/[id]/two-factor/setup', () => {
      it('should complete 2FA setup with valid token', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'ADMIN',
          twoFactorEnabled: false
        } as any)

        mockEnableTwoFactorAuth.mockResolvedValue(true)

        const requestBody = {
          token: '123456',
          secret: 'JBSWY3DPEHPK3PXP',
          backupCodes: ['CODE1', 'CODE2']
        }

        const request = new NextRequest('http://localhost/api/users/user-123/two-factor/setup', {
          method: 'POST',
          body: JSON.stringify(requestBody)
        })

        const response = await setupPost(request, { params: { id: 'user-123' } })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.message).toBe('2FA has been successfully enabled')
      })

      it('should reject invalid token', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'ADMIN',
          twoFactorEnabled: false
        } as any)

        mockEnableTwoFactorAuth.mockResolvedValue(false)

        const requestBody = {
          token: 'invalid',
          secret: 'JBSWY3DPEHPK3PXP',
          backupCodes: ['CODE1', 'CODE2']
        }

        const request = new NextRequest('http://localhost/api/users/user-123/two-factor/setup', {
          method: 'POST',
          body: JSON.stringify(requestBody)
        })

        const response = await setupPost(request, { params: { id: 'user-123' } })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid verification token')
      })

      it('should reject missing fields', async () => {
        const requestBody = {
          token: '123456'
          // Missing secret and backupCodes
        }

        const request = new NextRequest('http://localhost/api/users/user-123/two-factor/setup', {
          method: 'POST',
          body: JSON.stringify(requestBody)
        })

        const response = await setupPost(request, { params: { id: 'user-123' } })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Missing required fields')
      })
    })
  })

  describe('2FA Verification Endpoint', () => {
    describe('POST /api/users/[id]/two-factor/verify', () => {
      it('should verify valid TOTP token', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'ADMIN',
          twoFactorEnabled: true,
          isActive: true
        } as any)

        mockValidateTwoFactorForLogin.mockResolvedValue({
          valid: true,
          isBackupCode: false
        })

        mockPrisma.user.update.mockResolvedValue({} as any)

        const requestBody = { token: '123456' }
        const request = new NextRequest('http://localhost/api/users/user-123/two-factor/verify', {
          method: 'POST',
          body: JSON.stringify(requestBody)
        })

        const response = await verifyPost(request, { params: { id: 'user-123' } })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.isBackupCode).toBe(false)
      })

      it('should verify valid backup code', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'ADMIN',
          twoFactorEnabled: true,
          isActive: true
        } as any)

        mockValidateTwoFactorForLogin.mockResolvedValue({
          valid: true,
          isBackupCode: true
        })

        mockPrisma.user.update.mockResolvedValue({} as any)

        const requestBody = { token: 'BACKUPCODE' }
        const request = new NextRequest('http://localhost/api/users/user-123/two-factor/verify', {
          method: 'POST',
          body: JSON.stringify(requestBody)
        })

        const response = await verifyPost(request, { params: { id: 'user-123' } })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.isBackupCode).toBe(true)
        expect(data.message).toBe('Login successful using backup code')
      })

      it('should reject invalid token', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'ADMIN',
          twoFactorEnabled: true,
          isActive: true
        } as any)

        mockValidateTwoFactorForLogin.mockResolvedValue({
          valid: false,
          isBackupCode: false
        })

        const requestBody = { token: 'invalid' }
        const request = new NextRequest('http://localhost/api/users/user-123/two-factor/verify', {
          method: 'POST',
          body: JSON.stringify(requestBody)
        })

        const response = await verifyPost(request, { params: { id: 'user-123' } })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid 2FA token')
      })

      it('should reject deactivated user', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'ADMIN',
          twoFactorEnabled: true,
          isActive: false
        } as any)

        const requestBody = { token: '123456' }
        const request = new NextRequest('http://localhost/api/users/user-123/two-factor/verify', {
          method: 'POST',
          body: JSON.stringify(requestBody)
        })

        const response = await verifyPost(request, { params: { id: 'user-123' } })
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error).toBe('User account is deactivated')
      })
    })
  })

  describe('2FA Status Endpoint', () => {
    describe('GET /api/users/[id]/two-factor/status', () => {
      it('should return 2FA status for enabled user', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'ADMIN',
          twoFactorEnabled: true,
          createdAt: new Date()
        } as any)

        mockGetRemainingBackupCodes.mockResolvedValue(8)

        const request = new NextRequest('http://localhost/api/users/user-123/two-factor/status')
        const response = await statusGet(request, { params: { id: 'user-123' } })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toEqual({
          enabled: true,
          required: true,
          canDisable: false,
          remainingBackupCodes: 8,
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            role: 'ADMIN'
          }
        })
      })

      it('should return 2FA status for disabled user', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'EDITOR',
          twoFactorEnabled: false,
          createdAt: new Date()
        } as any)

        const request = new NextRequest('http://localhost/api/users/user-123/two-factor/status')
        const response = await statusGet(request, { params: { id: 'user-123' } })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toEqual({
          enabled: false,
          required: false,
          canDisable: true,
          remainingBackupCodes: 0,
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            role: 'EDITOR'
          }
        })
      })
    })
  })

  describe('Backup Codes Endpoints', () => {
    describe('GET /api/users/[id]/two-factor/backup-codes', () => {
      it('should return backup codes count', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({
          id: 'user-123',
          email: 'test@example.com',
          twoFactorEnabled: true
        } as any)

        mockGetRemainingBackupCodes.mockResolvedValue(7)

        const request = new NextRequest('http://localhost/api/users/user-123/two-factor/backup-codes')
        const response = await backupGet(request, { params: { id: 'user-123' } })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toEqual({
          remainingCodes: 7,
          totalCodes: 10
        })
      })

      it('should reject if 2FA not enabled', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({
          id: 'user-123',
          email: 'test@example.com',
          twoFactorEnabled: false
        } as any)

        const request = new NextRequest('http://localhost/api/users/user-123/two-factor/backup-codes')
        const response = await backupGet(request, { params: { id: 'user-123' } })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('2FA is not enabled for this user')
      })
    })

    describe('POST /api/users/[id]/two-factor/backup-codes', () => {
      it('should regenerate backup codes with valid token', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          twoFactorEnabled: true,
          twoFactorSecret: 'secret'
        } as any)

        const { verifyTwoFactorToken } = require('@/app/lib/two-factor-auth')
        verifyTwoFactorToken.mockReturnValue(true)

        mockRegenerateBackupCodes.mockResolvedValue(['NEW1', 'NEW2', 'NEW3'])

        const requestBody = { token: '123456' }
        const request = new NextRequest('http://localhost/api/users/user-123/two-factor/backup-codes', {
          method: 'POST',
          body: JSON.stringify(requestBody)
        })

        const response = await backupPost(request, { params: { id: 'user-123' } })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.backupCodes).toEqual(['NEW1', 'NEW2', 'NEW3'])
      })
    })
  })
})