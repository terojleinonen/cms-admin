/**
 * User Profile Integration Tests
 * Integration tests for complete user profile workflows with real component interactions
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionProvider } from 'next-auth/react'
import ProfilePage from '@/app/profile/page'
import { prisma } from '@/app/lib/db'
import { UserRole } from '@prisma/client'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/profile',
}))

// Mock database
jest.mock('@/app/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userPreferences: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    session: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}))

// Mock file operations
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    access: jest.fn(),
    unlink: jest.fn(),
  },
}))

// Mock Sharp
jest.mock('sharp', () => {
  return jest.fn(() => ({
    metadata: jest.fn().mockResolvedValue({
      width: 800,
      height: 600,
      format: 'jpeg',
      size: 1024000,
    }),
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toFile: jest.fn().mockResolvedValue(undefined),
  }))
})

// Mock API calls
global.fetch = jest.fn()

const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: UserRole.USER,
  isActive: true,
  profilePicture: null,
  emailVerified: new Date(),
  twoFactorEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockSession = {
  user: mockUser,
  expires: '2024-12-31',
}

const mockPreferences = {
  id: 'pref-1',
  userId: 'user-1',
  theme: 'light',
  timezone: 'UTC',
  language: 'en',
  notifications: {
    email: true,
    push: false,
    security: true,
  },
  dashboard: {
    layout: 'grid',
    widgets: ['recent', 'stats'],
  },
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockSessions = [
  {
    id: 'session-1',
    userId: 'user-1',
    token: 'token-1',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    isActive: true,
    createdAt: new Date(),
    isCurrent: true,
  },
  {
    id: 'session-2',
    userId: 'user-1',
    token: 'token-2',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    ipAddress: '192.168.1.2',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    isActive: true,
    createdAt: new Date(),
    isCurrent: false,
  },
]

describe('User Profile Integration Tests', () => {
  beforeEach(() => {
    // Mock useSession
    const { useSession } = require('next-auth/react')
    useSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn().mockResolvedValue(mockSession),
    })

    // Mock database calls
    const prismaMock = prisma as any
    prismaMock.user.findUnique.mockResolvedValue(mockUser)
    prismaMock.user.update.mockResolvedValue(mockUser)
    prismaMock.userPreferences.findUnique.mockResolvedValue(mockPreferences)
    prismaMock.userPreferences.upsert.mockResolvedValue(mockPreferences)
    prismaMock.session.findMany.mockResolvedValue(mockSessions)
    prismaMock.auditLog.create.mockResolvedValue({})

    // Mock fetch responses
    ;(global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      const method = options?.method || 'GET'
      
      if (url.includes('/api/users/') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
      }
      
      if (url.includes('/api/users/') && method === 'PUT') {
        const body = JSON.parse(options.body)
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            user: { ...mockUser, ...body },
            message: 'Profile updated successfully'
          }),
        })
      }
      
      if (url.includes('/preferences')) {
        if (method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ preferences: mockPreferences }),
          })
        }
        if (method === 'PUT') {
          const body = JSON.parse(options.body)
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ 
              preferences: { ...mockPreferences, ...body },
              message: 'Preferences updated successfully'
            }),
          })
        }
      }
      
      if (url.includes('/security')) {
        if (method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ 
              security: {
                twoFactorEnabled: false,
                lastPasswordChange: new Date().toISOString(),
                activeSessions: 2,
                recentActivity: [],
              }
            }),
          })
        }
        if (method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ 
              message: 'Security settings updated successfully'
            }),
          })
        }
      }
      
      if (url.includes('/sessions')) {
        if (method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              sessions: mockSessions,
              statistics: {
                activeSessions: 2,
                totalSessions: 5,
                recentLogins: 3,
                lastLogin: new Date().toISOString(),
              },
              suspiciousActivity: [],
              hasSecurityConcerns: false,
            }),
          })
        }
        if (method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ 
              message: 'Session action completed successfully',
              invalidatedSessions: 1
            }),
          })
        }
      }
      
      if (url.includes('/avatar')) {
        if (method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ 
              profilePicture: '/uploads/avatars/user-1-profile.jpg',
              message: 'Profile picture uploaded successfully'
            }),
          })
        }
        if (method === 'DELETE') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ 
              message: 'Profile picture removed successfully'
            }),
          })
        }
      }
      
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      })
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Complete Profile Management Workflow', () => {
    it('should allow user to navigate through all profile sections', async () => {
      const user = userEvent.setup()
      
      render(
        <SessionProvider session={mockSession}>
          <ProfilePage />
        </SessionProvider>
      )

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      // Check all tabs are present
      const profileTab = screen.getByRole('tab', { name: /profile/i })
      const accountTab = screen.getByRole('tab', { name: /account settings/i })
      const securityTab = screen.getByRole('tab', { name: /security/i })
      const sessionsTab = screen.getByRole('tab', { name: /sessions/i })

      expect(profileTab).toBeInTheDocument()
      expect(accountTab).toBeInTheDocument()
      expect(securityTab).toBeInTheDocument()
      expect(sessionsTab).toBeInTheDocument()

      // Navigate to Account Settings
      await user.click(accountTab)
      await waitFor(() => {
        expect(screen.getByText(/account settings/i)).toBeInTheDocument()
      })

      // Navigate to Security
      await user.click(securityTab)
      await waitFor(() => {
        expect(screen.getByText(/security settings/i)).toBeInTheDocument()
      })

      // Navigate to Sessions
      await user.click(sessionsTab)
      await waitFor(() => {
        expect(screen.getByText(/session overview/i)).toBeInTheDocument()
      })

      // Navigate back to Profile
      await user.click(profileTab)
      await waitFor(() => {
        expect(screen.getByLabelText('Name')).toBeInTheDocument()
      })
    })

    it('should update basic profile information', async () => {
      const user = userEvent.setup()
      
      render(
        <SessionProvider session={mockSession}>
          <ProfilePage />
        </SessionProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      // Update name
      const nameInput = screen.getByLabelText('Name')
      await user.clear(nameInput)
      await user.type(nameInput, 'Updated Test User')

      // Update email
      const emailInput = screen.getByLabelText('Email')
      await user.clear(emailInput)
      await user.type(emailInput, 'updated@example.com')

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/profile updated successfully/i)).toBeInTheDocument()
      })

      // Verify API was called
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/users/user-1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            name: 'Updated Test User',
            email: 'updated@example.com',
          }),
        })
      )
    })

    it('should handle password change workflow', async () => {
      const user = userEvent.setup()
      
      render(
        <SessionProvider session={mockSession}>
          <ProfilePage />
        </SessionProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      // Click change password button
      const changePasswordButton = screen.getByRole('button', { name: /change password/i })
      await user.click(changePasswordButton)

      // Fill password fields
      const currentPasswordInput = screen.getByLabelText('Current Password')
      const newPasswordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      await user.type(currentPasswordInput, 'currentpassword')
      await user.type(newPasswordInput, 'newpassword123')
      await user.type(confirmPasswordInput, 'newpassword123')

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/profile updated successfully/i)).toBeInTheDocument()
      })

      // Verify password fields are cleared
      expect(currentPasswordInput).toHaveValue('')
      expect(newPasswordInput).toHaveValue('')
      expect(confirmPasswordInput).toHaveValue('')
    })

    it('should handle profile picture upload', async () => {
      const user = userEvent.setup()
      
      render(
        <SessionProvider session={mockSession}>
          <ProfilePage />
        </SessionProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      // Find file input
      const fileInput = screen.getByLabelText(/upload profile picture/i)
      
      // Create mock file
      const file = new File(['mock image'], 'profile.jpg', { type: 'image/jpeg' })
      
      // Upload file
      await user.upload(fileInput, file)

      // Wait for upload to complete
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/users/user-1/avatar'),
          expect.objectContaining({
            method: 'POST',
          })
        )
      })
    })
  })

  describe('Account Settings Integration', () => {
    it('should update user preferences', async () => {
      const user = userEvent.setup()
      
      render(
        <SessionProvider session={mockSession}>
          <ProfilePage />
        </SessionProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      // Navigate to Account Settings
      const accountTab = screen.getByRole('tab', { name: /account settings/i })
      await user.click(accountTab)

      await waitFor(() => {
        expect(screen.getByText(/account settings/i)).toBeInTheDocument()
      })

      // Update theme preference
      const themeSelect = screen.getByLabelText(/theme/i)
      await user.selectOptions(themeSelect, 'dark')

      // Update timezone
      const timezoneSelect = screen.getByLabelText(/timezone/i)
      await user.selectOptions(timezoneSelect, 'America/New_York')

      // Save preferences
      const saveButton = screen.getByRole('button', { name: /save preferences/i })
      await user.click(saveButton)

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/preferences updated successfully/i)).toBeInTheDocument()
      })

      // Verify API was called
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/preferences'),
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('dark'),
        })
      )
    })
  })

  describe('Security Settings Integration', () => {
    it('should handle two-factor authentication setup', async () => {
      const user = userEvent.setup()
      
      render(
        <SessionProvider session={mockSession}>
          <ProfilePage />
        </SessionProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      // Navigate to Security tab
      const securityTab = screen.getByRole('tab', { name: /security/i })
      await user.click(securityTab)

      await waitFor(() => {
        expect(screen.getByText(/security settings/i)).toBeInTheDocument()
      })

      // Enable 2FA
      const twoFactorToggle = screen.getByRole('switch', { name: /two-factor authentication/i })
      await user.click(twoFactorToggle)

      // Enter TOTP code
      const totpInput = screen.getByLabelText(/verification code/i)
      await user.type(totpInput, '123456')

      // Confirm setup
      const confirmButton = screen.getByRole('button', { name: /enable 2fa/i })
      await user.click(confirmButton)

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/two-factor authentication enabled/i)).toBeInTheDocument()
      })

      // Verify API was called
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/security'),
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('enable_2fa'),
        })
      )
    })
  })

  describe('Session Management Integration', () => {
    it('should display and manage active sessions', async () => {
      const user = userEvent.setup()
      
      render(
        <SessionProvider session={mockSession}>
          <ProfilePage />
        </SessionProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      // Navigate to Sessions tab
      const sessionsTab = screen.getByRole('tab', { name: /sessions/i })
      await user.click(sessionsTab)

      await waitFor(() => {
        expect(screen.getByText(/session overview/i)).toBeInTheDocument()
      })

      // Check session statistics
      expect(screen.getByText('2')).toBeInTheDocument() // Active sessions count
      
      // Check session list
      expect(screen.getByText(/chrome browser/i)).toBeInTheDocument()
      expect(screen.getByText(/current session/i)).toBeInTheDocument()

      // Logout from all devices
      const logoutAllButton = screen.getByRole('button', { name: /logout all devices/i })
      await user.click(logoutAllButton)

      // Wait for confirmation
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/sessions'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('logout_all'),
          })
        )
      })
    })

    it('should handle individual session termination', async () => {
      const user = userEvent.setup()
      
      render(
        <SessionProvider session={mockSession}>
          <ProfilePage />
        </SessionProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      // Navigate to Sessions tab
      const sessionsTab = screen.getByRole('tab', { name: /sessions/i })
      await user.click(sessionsTab)

      await waitFor(() => {
        expect(screen.getByText(/session overview/i)).toBeInTheDocument()
      })

      // Find and click terminate button for non-current session
      const terminateButtons = screen.getAllByRole('button', { name: /end this session/i })
      if (terminateButtons.length > 0) {
        await user.click(terminateButtons[0])

        // Wait for API call
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/sessions'),
            expect.objectContaining({
              method: 'POST',
              body: expect.stringContaining('invalidate_session'),
            })
          )
        })
      }
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock API error
      ;(global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid email format',
            },
          }),
        })
      )

      render(
        <SessionProvider session={mockSession}>
          <ProfilePage />
        </SessionProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      // Try to update with invalid data
      const emailInput = screen.getByLabelText('Email')
      await user.clear(emailInput)
      await user.type(emailInput, 'invalid-email')

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
      })
    })

    it('should handle network errors', async () => {
      const user = userEvent.setup()
      
      // Mock network error
      ;(global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.reject(new Error('Network error'))
      )

      render(
        <SessionProvider session={mockSession}>
          <ProfilePage />
        </SessionProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      // Try to update profile
      const nameInput = screen.getByLabelText('Name')
      await user.clear(nameInput)
      await user.type(nameInput, 'New Name')

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
    })
  })

  describe('Loading States Integration', () => {
    it('should show loading states during API calls', async () => {
      const user = userEvent.setup()
      
      // Mock delayed API response
      ;(global.fetch as jest.Mock).mockImplementationOnce(() =>
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ user: mockUser }),
          }), 1000)
        )
      )

      render(
        <SessionProvider session={mockSession}>
          <ProfilePage />
        </SessionProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      // Update profile
      const nameInput = screen.getByLabelText('Name')
      await user.clear(nameInput)
      await user.type(nameInput, 'New Name')

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      // Check for loading state
      expect(screen.getByText(/saving/i)).toBeInTheDocument()
      expect(saveButton).toBeDisabled()
    })
  })

  describe('Responsive Design Integration', () => {
    it('should adapt to mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      // Trigger resize event
      window.dispatchEvent(new Event('resize'))

      render(
        <SessionProvider session={mockSession}>
          <ProfilePage />
        </SessionProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      // Check that mobile-specific classes are applied
      const tabs = screen.getAllByRole('tab')
      tabs.forEach(tab => {
        expect(tab.className).toMatch(/px-2|text-xs/)
      })
    })
  })
})