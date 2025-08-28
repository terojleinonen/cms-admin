/**
 * SecuritySettings Component Tests
 * Comprehensive tests for the security settings component including
 * password management, 2FA setup, session management, and security recommendations
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession } from 'next-auth/react'
import SecuritySettings from '@/components/users/SecuritySettings'

// Mock next-auth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock fetch
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

// Mock QR code generation
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockqrcode')
}))

describe('SecuritySettings Component', () => {
  const mockUserId = 'user-123'
  const mockSession = {
    user: {
      id: mockUserId,
      email: 'test@example.com',
      role: 'ADMIN'
    }
  }

  const mockSecurityData = {
    twoFactorEnabled: false,
    lastPasswordChange: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-01-15'),
    activeSessions: [
      {
        id: 'session-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date('2024-01-15'),
        expiresAt: new Date('2024-02-15')
      },
      {
        id: 'session-2',
        ipAddress: '192.168.1.2',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        createdAt: new Date('2024-01-14'),
        expiresAt: new Date('2024-02-14')
      }
    ],
    recentActivity: [
      {
        id: 'audit-1',
        action: 'auth.login',
        createdAt: new Date('2024-01-15'),
        ipAddress: '192.168.1.1',
        details: { success: true }
      }
    ],
    securityScore: 75
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    // Mock successful security data fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ security: mockSecurityData })
    } as Response)
  })

  describe('Component Rendering', () => {
    it('renders security settings header and sections', async () => {
      render(<SecuritySettings userId={mockUserId} />)

      expect(screen.getByText('Security Settings')).toBeInTheDocument()
      expect(screen.getByText('Manage your account security and privacy settings')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByText('Password & Authentication')).toBeInTheDocument()
        expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument()
        expect(screen.getByText('Active Sessions')).toBeInTheDocument()
        expect(screen.getByText('Security Score')).toBeInTheDocument()
      })
    })

    it('displays loading state initially', () => {
      render(<SecuritySettings userId={mockUserId} />)
      expect(screen.getByText('Loading security settings...')).toBeInTheDocument()
    })

    it('displays security score with appropriate color', async () => {
      render(<SecuritySettings userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText('75/100')).toBeInTheDocument()
        expect(screen.getByText('Good')).toBeInTheDocument()
      })
    })
  })

  describe('Password Management', () => {
    it('renders password change form', async () => {
      render(<SecuritySettings userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Current Password')).toBeInTheDocument()
        expect(screen.getByLabelText('New Password')).toBeInTheDocument()
        expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Change Password' })).toBeInTheDocument()
      })
    })

    it('validates password strength in real-time', async () => {
      const user = userEvent.setup()
      render(<SecuritySettings userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByLabelText('New Password')).toBeInTheDocument()
      })

      const newPasswordInput = screen.getByLabelText('New Password')
      
      // Test weak password
      await user.type(newPasswordInput, 'weak')
      expect(screen.getByText('Weak')).toBeInTheDocument()

      // Test strong password
      await user.clear(newPasswordInput)
      await user.type(newPasswordInput, 'StrongP@ssw0rd123')
      expect(screen.getByText('Strong')).toBeInTheDocument()
    })

    it('handles password change submission', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Password changed successfully' })
      } as Response)

      render(<SecuritySettings userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Current Password')).toBeInTheDocument()
      })

      // Fill password form
      await user.type(screen.getByLabelText('Current Password'), 'currentpass')
      await user.type(screen.getByLabelText('New Password'), 'NewP@ssw0rd123')
      await user.type(screen.getByLabelText('Confirm New Password'), 'NewP@ssw0rd123')

      // Submit form
      await user.click(screen.getByRole('button', { name: 'Change Password' }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/users/${mockUserId}/security`,
          expect.objectContaining({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'change_password',
              currentPassword: 'currentpass',
              newPassword: 'NewP@ssw0rd123',
              confirmNewPassword: 'NewP@ssw0rd123'
            })
          })
        )
      })

      expect(screen.getByText('Password changed successfully')).toBeInTheDocument()
    })

    it('displays password validation errors', async () => {
      const user = userEvent.setup()
      render(<SecuritySettings userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByLabelText('New Password')).toBeInTheDocument()
      })

      // Enter mismatched passwords
      await user.type(screen.getByLabelText('New Password'), 'NewP@ssw0rd123')
      await user.type(screen.getByLabelText('Confirm New Password'), 'DifferentP@ssw0rd')

      await user.click(screen.getByRole('button', { name: 'Change Password' }))

      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })
  })

  describe('Two-Factor Authentication', () => {
    it('shows 2FA setup when disabled', async () => {
      render(<SecuritySettings userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText('Two-factor authentication is disabled')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Enable 2FA' })).toBeInTheDocument()
      })
    })

    it('shows 2FA status when enabled', async () => {
      const enabledSecurityData = {
        ...mockSecurityData,
        twoFactorEnabled: true
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ security: enabledSecurityData })
      } as Response)

      render(<SecuritySettings userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText('Two-factor authentication is enabled')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Disable 2FA' })).toBeInTheDocument()
      })
    })

    it('handles 2FA setup process', async () => {
      const user = userEvent.setup()
      
      // Mock 2FA setup response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          secret: 'JBSWY3DPEHPK3PXP',
          qrCodeUrl: 'otpauth://totp/test',
          backupCodes: ['ABC123', 'DEF456']
        })
      } as Response)

      render(<SecuritySettings userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Enable 2FA' })).toBeInTheDocument()
      })

      // Start 2FA setup
      await user.click(screen.getByRole('button', { name: 'Enable 2FA' }))

      await waitFor(() => {
        expect(screen.getByText('Set Up Two-Factor Authentication')).toBeInTheDocument()
        expect(screen.getByText('Scan this QR code with your authenticator app')).toBeInTheDocument()
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/users/${mockUserId}/security`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ action: 'setup_2fa' })
        })
      )
    })

    it('handles 2FA verification', async () => {
      const user = userEvent.setup()
      
      // Mock setup response first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          secret: 'JBSWY3DPEHPK3PXP',
          qrCodeUrl: 'otpauth://totp/test',
          backupCodes: ['ABC123', 'DEF456']
        })
      } as Response)

      // Mock verification response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: '2FA enabled successfully' })
      } as Response)

      render(<SecuritySettings userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Enable 2FA' })).toBeInTheDocument()
      })

      // Start setup
      await user.click(screen.getByRole('button', { name: 'Enable 2FA' }))

      await waitFor(() => {
        expect(screen.getByLabelText('Verification Code')).toBeInTheDocument()
      })

      // Enter verification code
      await user.type(screen.getByLabelText('Verification Code'), '123456')
      await user.click(screen.getByRole('button', { name: 'Verify & Enable' }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/users/${mockUserId}/security`,
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({
              action: 'verify_2fa',
              token: '123456'
            })
          })
        )
      })
    })
  })

  describe('Session Management', () => {
    it('displays active sessions', async () => {
      render(<SecuritySettings userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText('Active Sessions')).toBeInTheDocument()
        expect(screen.getByText('Windows - Chrome')).toBeInTheDocument()
        expect(screen.getByText('iPhone - Safari')).toBeInTheDocument()
        expect(screen.getByText('192.168.1.1')).toBeInTheDocument()
        expect(screen.getByText('192.168.1.2')).toBeInTheDocument()
      })
    })

    it('handles individual session termination', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Session terminated successfully' })
      } as Response)

      render(<SecuritySettings userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getAllByText('Terminate')[0]).toBeInTheDocument()
      })

      // Click terminate on first session
      await user.click(screen.getAllByText('Terminate')[0])

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/users/${mockUserId}/security`,
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({
              action: 'terminate_sessions',
              sessionIds: ['session-1'],
              terminateAll: false
            })
          })
        )
      })
    })

    it('handles terminate all sessions', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'All sessions terminated successfully' })
      } as Response)

      render(<SecuritySettings userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Terminate All Other Sessions' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Terminate All Other Sessions' }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/users/${mockUserId}/security`,
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({
              action: 'terminate_sessions',
              terminateAll: true
            })
          })
        )
      })
    })
  })

  describe('Security Recommendations', () => {
    it('shows security recommendations based on current state', async () => {
      render(<SecuritySettings userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText('Security Recommendations')).toBeInTheDocument()
        expect(screen.getByText('Enable two-factor authentication for better security')).toBeInTheDocument()
      })
    })

    it('updates recommendations when 2FA is enabled', async () => {
      const enabledSecurityData = {
        ...mockSecurityData,
        twoFactorEnabled: true,
        securityScore: 95
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ security: enabledSecurityData })
      } as Response)

      render(<SecuritySettings userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText('Excellent security! Keep up the good work.')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<SecuritySettings userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load security settings')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
      })
    })

    it('handles validation errors', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 'VALIDATION_ERROR',
            details: {
              currentPassword: ['Current password is incorrect']
            }
          }
        })
      } as Response)

      render(<SecuritySettings userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Current Password')).toBeInTheDocument()
      })

      // Try to change password with invalid current password
      await user.type(screen.getByLabelText('Current Password'), 'wrongpass')
      await user.type(screen.getByLabelText('New Password'), 'NewP@ssw0rd123')
      await user.type(screen.getByLabelText('Confirm New Password'), 'NewP@ssw0rd123')
      await user.click(screen.getByRole('button', { name: 'Change Password' }))

      await waitFor(() => {
        expect(screen.getByText('Current password is incorrect')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      render(<SecuritySettings userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Change Password' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Enable 2FA' })).toBeInTheDocument()
        expect(screen.getByLabelText('Current Password')).toBeInTheDocument()
        expect(screen.getByLabelText('New Password')).toBeInTheDocument()
      })
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<SecuritySettings userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByLabelText('Current Password')).toBeInTheDocument()
      })

      // Tab through form elements
      await user.tab()
      expect(screen.getByLabelText('Current Password')).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText('New Password')).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText('Confirm New Password')).toHaveFocus()
    })
  })
})