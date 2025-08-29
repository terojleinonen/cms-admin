/**
 * Account Deactivation Component Tests
 * Tests for the account deactivation UI component
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { signOut } from 'next-auth/react'
import { AccountDeactivation } from '../../../app/components/users/AccountDeactivation'

// Mock dependencies
jest.mock('next-auth/react')
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    back: jest.fn(),
  }),
}))

const mockSignOut = signOut as jest.MockedFunction<typeof signOut>

// Mock fetch
global.fetch = jest.fn()
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('AccountDeactivation', () => {
  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'EDITOR',
    isActive: true,
  }

  const mockOnDeactivationComplete = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  describe('Initial State', () => {
    it('should render deactivation information for own account', () => {
      render(
        <AccountDeactivation
          user={mockUser}
          isOwnAccount={true}
          onDeactivationComplete={mockOnDeactivationComplete}
        />
      )

      expect(screen.getByText('Deactivate Your Account')).toBeInTheDocument()
      expect(screen.getByText('Important Information')).toBeInTheDocument()
      expect(screen.getByText('Export Your Data')).toBeInTheDocument()
      expect(screen.getByText('You will be signed out immediately after deactivation')).toBeInTheDocument()
    })

    it('should render deactivation information for admin deactivating another user', () => {
      render(
        <AccountDeactivation
          user={mockUser}
          isOwnAccount={false}
          onDeactivationComplete={mockOnDeactivationComplete}
        />
      )

      expect(screen.getByText("Deactivate Test User's Account")).toBeInTheDocument()
      expect(screen.queryByText('You will be signed out immediately after deactivation')).not.toBeInTheDocument()
    })

    it('should show export data button', () => {
      render(
        <AccountDeactivation
          user={mockUser}
          isOwnAccount={true}
          onDeactivationComplete={mockOnDeactivationComplete}
        />
      )

      expect(screen.getByText('Export Data')).toBeInTheDocument()
    })
  })

  describe('Data Export', () => {
    it('should handle data export successfully', async () => {
      const mockBlob = new Blob(['test data'], { type: 'application/json' })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      } as Response)

      // Mock URL.createObjectURL and related DOM methods
      const mockCreateObjectURL = jest.fn(() => 'mock-url')
      const mockRevokeObjectURL = jest.fn()
      const mockClick = jest.fn()
      const mockAppendChild = jest.fn()
      const mockRemoveChild = jest.fn()

      Object.defineProperty(window, 'URL', {
        value: {
          createObjectURL: mockCreateObjectURL,
          revokeObjectURL: mockRevokeObjectURL,
        },
      })

      const mockAnchor = {
        href: '',
        download: '',
        click: mockClick,
      }

      jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)
      jest.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild)
      jest.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild)

      render(
        <AccountDeactivation
          user={mockUser}
          isOwnAccount={true}
          onDeactivationComplete={mockOnDeactivationComplete}
        />
      )

      const exportButton = screen.getByText('Export Data')
      fireEvent.click(exportButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/users/${mockUser.id}/export?format=json&includeAuditLogs=true&includePreferences=true&includeCreatedContent=true`
        )
      })

      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob)
      expect(mockClick).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('mock-url')
    })

    it('should handle data export error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      render(
        <AccountDeactivation
          user={mockUser}
          isOwnAccount={true}
          onDeactivationComplete={mockOnDeactivationComplete}
        />
      )

      const exportButton = screen.getByText('Export Data')
      fireEvent.click(exportButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to export data')).toBeInTheDocument()
      })
    })
  })

  describe('Deactivation Confirmation', () => {
    it('should show confirmation form when proceeding with deactivation', () => {
      render(
        <AccountDeactivation
          user={mockUser}
          isOwnAccount={true}
          onDeactivationComplete={mockOnDeactivationComplete}
        />
      )

      const proceedButton = screen.getByText('Proceed with Deactivation')
      fireEvent.click(proceedButton)

      expect(screen.getByText('Confirm Account Deactivation')).toBeInTheDocument()
      expect(screen.getByLabelText('Reason for Deactivation')).toBeInTheDocument()
      expect(screen.getByLabelText('Confirm Your Password')).toBeInTheDocument()
    })

    it('should not show password field for admin deactivating another user', () => {
      render(
        <AccountDeactivation
          user={mockUser}
          isOwnAccount={false}
          onDeactivationComplete={mockOnDeactivationComplete}
        />
      )

      const proceedButton = screen.getByText('Proceed with Deactivation')
      fireEvent.click(proceedButton)

      expect(screen.queryByLabelText('Confirm Your Password')).not.toBeInTheDocument()
    })

    it('should validate required fields', async () => {
      render(
        <AccountDeactivation
          user={mockUser}
          isOwnAccount={true}
          onDeactivationComplete={mockOnDeactivationComplete}
        />
      )

      // Go to confirmation
      fireEvent.click(screen.getByText('Proceed with Deactivation'))

      // Try to submit without filling required fields
      const deactivateButton = screen.getByText('Deactivate Account')
      fireEvent.click(deactivateButton)

      await waitFor(() => {
        expect(screen.getByText('Deactivation reason is required')).toBeInTheDocument()
        expect(screen.getByText('Password confirmation is required')).toBeInTheDocument()
        expect(screen.getByText('You must confirm the deactivation')).toBeInTheDocument()
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should handle successful deactivation for own account', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          user: { ...mockUser, isActive: false },
        }),
      } as Response)

      render(
        <AccountDeactivation
          user={mockUser}
          isOwnAccount={true}
          onDeactivationComplete={mockOnDeactivationComplete}
        />
      )

      // Go to confirmation
      fireEvent.click(screen.getByText('Proceed with Deactivation'))

      // Fill form
      fireEvent.change(screen.getByLabelText('Reason for Deactivation'), {
        target: { value: 'Personal reasons' },
      })
      fireEvent.change(screen.getByLabelText('Confirm Your Password'), {
        target: { value: 'password123' },
      })
      fireEvent.click(screen.getByLabelText('I understand the consequences and want to proceed with deactivation'))

      // Submit
      fireEvent.click(screen.getByText('Deactivate Account'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(`/api/users/${mockUser.id}/deactivate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason: 'Personal reasons',
            confirmPassword: 'password123',
            dataRetention: true,
          }),
        })
      })

      expect(mockSignOut).toHaveBeenCalledWith({
        callbackUrl: '/auth/login?message=account-deactivated',
      })
    })

    it('should handle successful deactivation by admin', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          user: { ...mockUser, isActive: false },
        }),
      } as Response)

      render(
        <AccountDeactivation
          user={mockUser}
          isOwnAccount={false}
          onDeactivationComplete={mockOnDeactivationComplete}
        />
      )

      // Go to confirmation
      fireEvent.click(screen.getByText('Proceed with Deactivation'))

      // Fill form
      fireEvent.change(screen.getByLabelText('Reason for Deactivation'), {
        target: { value: 'Policy violation' },
      })
      fireEvent.click(screen.getByLabelText('I understand the consequences and want to proceed with deactivation'))

      // Submit
      fireEvent.click(screen.getByText('Deactivate Account'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(`/api/users/${mockUser.id}/deactivate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason: 'Policy violation',
            dataRetention: true,
          }),
        })
      })

      expect(mockOnDeactivationComplete).toHaveBeenCalled()
      expect(mockSignOut).not.toHaveBeenCalled()
    })

    it('should handle deactivation error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          error: { message: 'Invalid password confirmation' },
        }),
      } as Response)

      render(
        <AccountDeactivation
          user={mockUser}
          isOwnAccount={true}
          onDeactivationComplete={mockOnDeactivationComplete}
        />
      )

      // Go to confirmation and fill form
      fireEvent.click(screen.getByText('Proceed with Deactivation'))
      fireEvent.change(screen.getByLabelText('Reason for Deactivation'), {
        target: { value: 'Personal reasons' },
      })
      fireEvent.change(screen.getByLabelText('Confirm Your Password'), {
        target: { value: 'wrong-password' },
      })
      fireEvent.click(screen.getByLabelText('I understand the consequences and want to proceed with deactivation'))

      // Submit
      fireEvent.click(screen.getByText('Deactivate Account'))

      await waitFor(() => {
        expect(screen.getByText('Invalid password confirmation')).toBeInTheDocument()
      })

      expect(mockSignOut).not.toHaveBeenCalled()
      expect(mockOnDeactivationComplete).not.toHaveBeenCalled()
    })

    it('should allow going back from confirmation', () => {
      render(
        <AccountDeactivation
          user={mockUser}
          isOwnAccount={true}
          onDeactivationComplete={mockOnDeactivationComplete}
        />
      )

      // Go to confirmation
      fireEvent.click(screen.getByText('Proceed with Deactivation'))
      expect(screen.getByText('Confirm Account Deactivation')).toBeInTheDocument()

      // Go back
      fireEvent.click(screen.getByText('Back'))
      expect(screen.getByText('Deactivate Your Account')).toBeInTheDocument()
    })

    it('should handle data retention checkbox', () => {
      render(
        <AccountDeactivation
          user={mockUser}
          isOwnAccount={true}
          onDeactivationComplete={mockOnDeactivationComplete}
        />
      )

      // Go to confirmation
      fireEvent.click(screen.getByText('Proceed with Deactivation'))

      const dataRetentionCheckbox = screen.getByLabelText('Retain account data according to data retention policies')
      expect(dataRetentionCheckbox).toBeChecked()

      fireEvent.click(dataRetentionCheckbox)
      expect(dataRetentionCheckbox).not.toBeChecked()
    })
  })

  describe('Loading States', () => {
    it('should show loading state during deactivation', async () => {
      // Mock a slow response
      mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))

      render(
        <AccountDeactivation
          user={mockUser}
          isOwnAccount={true}
          onDeactivationComplete={mockOnDeactivationComplete}
        />
      )

      // Go to confirmation and fill form
      fireEvent.click(screen.getByText('Proceed with Deactivation'))
      fireEvent.change(screen.getByLabelText('Reason for Deactivation'), {
        target: { value: 'Personal reasons' },
      })
      fireEvent.change(screen.getByLabelText('Confirm Your Password'), {
        target: { value: 'password123' },
      })
      fireEvent.click(screen.getByLabelText('I understand the consequences and want to proceed with deactivation'))

      // Submit
      fireEvent.click(screen.getByText('Deactivate Account'))

      expect(screen.getByText('Deactivating account...')).toBeInTheDocument()
      expect(screen.getByText('Deactivating...')).toBeInTheDocument()
    })
  })
})