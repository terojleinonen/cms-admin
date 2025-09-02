/**
 * Comprehensive SecuritySettings Component Tests
 * Complete test suite for security settings functionality
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { SessionProvider } from 'next-auth/react'
import SecuritySettings from '@/components/users/SecuritySettings'
import { UserRole } from '@prisma/client'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  ...jest.requireActual('next-auth/react'),
  useSession: jest.fn(),
}))

// Mock QRCode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock-qr-code'),
}))

// Mock fetch
global.fetch = jest.fn()

const mockSession = {
  user: {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    role: UserRole.EDITOR,
  },
  expires: '2024-01-01',
}

const mockSecurityInfo = {
  twoFactorEnabled: false,
  lastPasswordChange: new Date('2024-01-01'),
  activeSessions: [
    {
      id: 'session-1',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      lastActive: new Date(),
      isCurrent: true,
    },
    {
      id: 'session-2',
      ipAddress: '192.168.1.2',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      lastActive: new Date(Date.now() - 86400000), // 1 day ago
      isCurrent: false,
    },
  ],
  recentActivity: [
    {
      id: 'activity-1',
      action: 'LOGIN',
      timestamp: new Date(),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  ],
  passwordStrength: {
    score: 4,
    feedback: [],
  },
}

describe('SecuritySettings Component', () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful security info fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ security: mockSecurityInfo }),
    } as Response)

    // Mock useSession
    require('next-auth/react').useSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })
  })

  const renderComponent = (props = {}) => {
    return render(
      <SessionProvider session={mockSession}>
        <SecuritySettings userId="user-123" {...props} />
      </SessionProvider>
    )
  }

  describe('Initial Rendering', () => {
    it('renders all security sections', async () => {
      renderComponent()

      await waitFor(async () => {
        expect(screen.getByText('Security Settings')).toBeInTheDocument()
        expect(screen.getByText('Password Security')).toBeInTheDocument()
        expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument()
        expect(screen.getByText('Active Sessions')).toBeInTheDocument()
        expect(screen.getByText('Recent Activity')).toBeInTheDocument()
      })
    })

    it('displays loading state initially', () => {
      renderComponent()
      expect(screen.getByText('Loading security information...')).toBeInTheDocument()
    })

    it('loads and displays security information', async () => {
      renderComponent()

      await waitFor(async () => {
        expect(screen.getByText('2FA is currently disabled')).toBeInTheDocument()
        expect(screen.getByText('2 active sessions')).toBeInTheDocument()
      })
    })
  })

  describe('Password Security', () => {
    it('shows password change form', async () => {
      renderComponent()

      await waitFor(async () => {
        expect(screen.getByText('Password Security')).toBeInTheDocument()
      })

      const changePasswordButton = screen.getByText('Change Password')
      await user.click(changePasswordButton)

      expect(screen.getByLabelText('Current Password')).toBeInTheDocument()
      expect(screen.getByLabelText('New Password')).toBeInTheDocument()
      expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument()
    })

    it('validates password strength', async () => {
      renderComponent()

      await waitFor(async () => {
        const changePasswordButton = screen.getByText('Change Password')
        await user.click(changePasswordButton)
      })

      const newPasswordInput = screen.getByLabelText('New Password')
      await user.type(newPasswordInput, 'weak')

      await waitFor(async () => {
        expect(screen.getByText(/Password is too weak/)).toBeInTheDocument()
      })
    })

    it('validates password confirmation', async () => {
      renderComponent()

      await waitFor(async () => {
        const changePasswordButton = screen.getByText('Change Password')
        await user.click(changePasswordButton)
      })

      const newPasswordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      await user.type(newPasswordInput, 'StrongPassword123!')
      await user.type(confirmPasswordInput, 'DifferentPassword456@')

      await waitFor(async () => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
      })
    })

    it('submits password change successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Password changed successfully' }),
      } as Response)

      renderComponent()

      await waitFor(async () => {
        const changePasswordButton = screen.getByText('Change Password')
        await user.click(changePasswordButton)
      })

      const currentPasswordInput = screen.getByLabelText('Current Password')
      const newPasswordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      await user.type(currentPasswordInput, 'currentPassword123!')
      await user.type(newPasswordInput, 'NewPassword456@')
      await user.type(confirmPasswordInput, 'NewPassword456@')

      const submitButton = screen.getByText('Update Password')
      await user.click(submitButton)

      await waitFor(async () => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/users/user-123/security',
          expect.objectContaining({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('currentPassword'),
          })
        )
      })

      expect(screen.getByText('Password changed successfully')).toBeInTheDocument()
    })
  })

  describe('Two-Factor Authentication', () => {
    it('shows 2FA setup when disabled', async () => {
      renderComponent()

      await waitFor(async () => {
        expect(screen.getByText('2FA is currently disabled')).toBeInTheDocument()
        expect(screen.getByText('Enable 2FA')).toBeInTheDocument()
      })
    })

    it('initiates 2FA setup process', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          secret: 'JBSWY3DPEHPK3PXP',
          qrCode: 'data:image/png;base64,mock-qr-code',
          backupCodes: ['123456', '789012'],
        }),
      } as Response)

      renderComponent()

      await waitFor(async () => {
        const enableButton = screen.getByText('Enable 2FA')
        await user.click(enableButton)
      })

      await waitFor(async () => {
        expect(screen.getByText('Scan QR Code')).toBeInTheDocument()
        expect(screen.getByText('Enter Verification Code')).toBeInTheDocument()
        expect(screen.getByAltText('2FA QR Code')).toBeInTheDocument()
      })
    })

    it('completes 2FA setup with valid token', async () => {
      // Mock setup initiation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          secret: 'JBSWY3DPEHPK3PXP',
          qrCode: 'data:image/png;base64,mock-qr-code',
          backupCodes: ['123456', '789012'],
        }),
      } as Response)

      // Mock setup completion
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: '2FA enabled successfully' }),
      } as Response)

      renderComponent()

      await waitFor(async () => {
        const enableButton = screen.getByText('Enable 2FA')
        await user.click(enableButton)
      })

      await waitFor(async () => {
        const tokenInput = screen.getByLabelText('Verification Code')
        expect(tokenInput).toBeInTheDocument()
      })

      const tokenInput = screen.getByLabelText('Verification Code')
      await user.type(tokenInput, '123456')

      const verifyButton = screen.getByText('Verify & Enable')
      await user.click(verifyButton)

      await waitFor(async () => {
        expect(screen.getByText('2FA enabled successfully')).toBeInTheDocument()
      })
    })

    it('shows 2FA status when enabled', async () => {
      const enabledSecurityInfo = {
        ...mockSecurityInfo,
        twoFactorEnabled: true,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ security: enabledSecurityInfo }),
      } as Response)

      renderComponent()

      await waitFor(async () => {
        expect(screen.getByText('2FA is enabled')).toBeInTheDocument()
        expect(screen.getByText('Disable 2FA')).toBeInTheDocument()
        expect(screen.getByText('Regenerate Backup Codes')).toBeInTheDocument()
      })
    })

    it('disables 2FA with confirmation', async () => {
      const enabledSecurityInfo = {
        ...mockSecurityInfo,
        twoFactorEnabled: true,
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ security: enabledSecurityInfo }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: '2FA disabled successfully' }),
        } as Response)

      renderComponent()

      await waitFor(async () => {
        const disableButton = screen.getByText('Disable 2FA')
        await user.click(disableButton)
      })

      // Confirm in modal
      const confirmButton = screen.getByText('Yes, Disable 2FA')
      await user.click(confirmButton)

      await waitFor(async () => {
        expect(screen.getByText('2FA disabled successfully')).toBeInTheDocument()
      })
    })
  })

  describe('Session Management', () => {
    it('displays active sessions', async () => {
      renderComponent()

      await waitFor(async () => {
        expect(screen.getByText('Active Sessions')).toBeInTheDocument()
        expect(screen.getByText('2 active sessions')).toBeInTheDocument()
        expect(screen.getByText('Current session')).toBeInTheDocument()
        expect(screen.getByText('192.168.1.1')).toBeInTheDocument()
        expect(screen.getByText('192.168.1.2')).toBeInTheDocument()
      })
    })

    it('allows terminating individual sessions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Session terminated' }),
      } as Response)

      renderComponent()

      await waitFor(async () => {
        const terminateButtons = screen.getAllByText('Terminate')
        expect(terminateButtons).toHaveLength(1) // Only non-current sessions
      })

      const terminateButton = screen.getByText('Terminate')
      await user.click(terminateButton)

      await waitFor(async () => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/users/user-123/sessions',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('terminate_session'),
          })
        )
      })
    })

    it('allows terminating all other sessions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'All other sessions terminated' }),
      } as Response)

      renderComponent()

      await waitFor(async () => {
        const terminateAllButton = screen.getByText('Terminate All Other Sessions')
        await user.click(terminateAllButton)
      })

      await waitFor(async () => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/users/user-123/sessions',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('terminate_all_others'),
          })
        )
      })
    })
  })

  describe('Recent Activity', () => {
    it('displays recent security activity', async () => {
      renderComponent()

      await waitFor(async () => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument()
        expect(screen.getByText('LOGIN')).toBeInTheDocument()
        expect(screen.getByText('192.168.1.1')).toBeInTheDocument()
      })
    })

    it('formats activity timestamps correctly', async () => {
      renderComponent()

      await waitFor(async () => {
        // Should show relative time like "just now" or "1 hour ago"
        expect(screen.getByText(/ago|now/)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles fetch errors on load', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      renderComponent()

      await waitFor(async () => {
        expect(screen.getByText('Failed to load security information')).toBeInTheDocument()
      })
    })

    it('handles 2FA setup errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: 'Failed to setup 2FA' } }),
      } as Response)

      renderComponent()

      await waitFor(async () => {
        const enableButton = screen.getByText('Enable 2FA')
        await user.click(enableButton)
      })

      await waitFor(async () => {
        expect(screen.getByText('Failed to setup 2FA')).toBeInTheDocument()
      })
    })

    it('handles password change errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: 'Current password is incorrect' } }),
      } as Response)

      renderComponent()

      await waitFor(async () => {
        const changePasswordButton = screen.getByText('Change Password')
        await user.click(changePasswordButton)
      })

      const currentPasswordInput = screen.getByLabelText('Current Password')
      const newPasswordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      await user.type(currentPasswordInput, 'wrongPassword')
      await user.type(newPasswordInput, 'NewPassword456@')
      await user.type(confirmPasswordInput, 'NewPassword456@')

      const submitButton = screen.getByText('Update Password')
      await user.click(submitButton)

      await waitFor(async () => {
        expect(screen.getByText('Current password is incorrect')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper form labels and ARIA attributes', async () => {
      renderComponent()

      await waitFor(async () => {
        const changePasswordButton = screen.getByText('Change Password')
        await user.click(changePasswordButton)
      })

      expect(screen.getByLabelText('Current Password')).toBeInTheDocument()
      expect(screen.getByLabelText('New Password')).toBeInTheDocument()
      expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      renderComponent()

      await waitFor(async () => {
        const changePasswordButton = screen.getByText('Change Password')
        changePasswordButton.focus()
        expect(changePasswordButton).toHaveFocus()
      })
    })

    it('has proper alt text for QR code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          secret: 'JBSWY3DPEHPK3PXP',
          qrCode: 'data:image/png;base64,mock-qr-code',
          backupCodes: ['123456', '789012'],
        }),
      } as Response)

      renderComponent()

      await waitFor(async () => {
        const enableButton = screen.getByText('Enable 2FA')
        await user.click(enableButton)
      })

      await waitFor(async () => {
        const qrImage = screen.getByAltText('2FA QR Code')
        expect(qrImage).toBeInTheDocument()
      })
    })
  })

  describe('Security Recommendations', () => {
    it('shows password strength recommendations', async () => {
      const weakSecurityInfo = {
        ...mockSecurityInfo,
        passwordStrength: {
          score: 2,
          feedback: ['Use a longer password', 'Add special characters'],
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ security: weakSecurityInfo }),
      } as Response)

      renderComponent()

      await waitFor(async () => {
        expect(screen.getByText('Security Recommendations')).toBeInTheDocument()
        expect(screen.getByText('Use a longer password')).toBeInTheDocument()
        expect(screen.getByText('Add special characters')).toBeInTheDocument()
      })
    })

    it('shows 2FA recommendation when disabled', async () => {
      renderComponent()

      await waitFor(async () => {
        expect(screen.getByText(/Enable two-factor authentication/)).toBeInTheDocument()
      })
    })
  })
})