/**
 * Enhanced Profile Page Test - Task 7 Implementation
 * Tests the enhanced profile page with tabbed interface, responsive design, and error boundaries
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import ProfilePage from '@/profile/page'

// Mock next-auth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock the child components
jest.mock('@/components/users/ProfilePictureManager', () => {
  return function MockProfilePictureManager({ onUpload, onRemove }: any) {
    return (
      <div data-testid="profile-picture-manager">
        <button onClick={() => onUpload(new File(['test'], 'test.jpg', { type: 'image/jpeg' }))}>
          Upload Picture
        </button>
        {onRemove && <button onClick={onRemove}>Remove Picture</button>}
      </div>
    )
  }
})

jest.mock('@/components/users/AccountSettings', () => {
  return function MockAccountSettings({ userId }: any) {
    return <div data-testid="account-settings">Account Settings for {userId}</div>
  }
})

jest.mock('@/components/users/SecuritySettings', () => {
  return function MockSecuritySettings({ userId }: any) {
    return <div data-testid="security-settings">Security Settings for {userId}</div>
  }
})

jest.mock('@/components/ui/ErrorBoundary', () => {
  return function MockErrorBoundary({ children }: any) {
    return <div data-testid="error-boundary">{children}</div>
  }
})

jest.mock('@/components/ui/LoadingSpinner', () => {
  return function MockLoadingSpinner({ size }: any) {
    return <div data-testid="loading-spinner" data-size={size}>Loading...</div>
  }
})

// Mock fetch
global.fetch = jest.fn()

describe('Enhanced Profile Page - Task 7', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'ADMIN',
      profilePicture: 'https://example.com/profile.jpg'
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn()
    })
  })

  describe('Tabbed Interface', () => {
    it('should render all three tabs', () => {
      render(<ProfilePage />)
      
      expect(screen.getByRole('tab', { name: /profile/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /account settings/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /security/i })).toBeInTheDocument()
    })

    it('should show profile tab as active by default', () => {
      render(<ProfilePage />)
      
      const profileTab = screen.getByRole('tab', { name: /profile/i })
      expect(profileTab).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByTestId('profile-picture-manager')).toBeInTheDocument()
    })

    it('should switch to account settings tab when clicked', async () => {
      render(<ProfilePage />)
      
      const accountTab = screen.getByRole('tab', { name: /account settings/i })
      fireEvent.click(accountTab)
      
      await waitFor(() => {
        expect(accountTab).toHaveAttribute('aria-selected', 'true')
        expect(screen.getByTestId('account-settings')).toBeInTheDocument()
      })
    })

    it('should switch to security tab when clicked', async () => {
      render(<ProfilePage />)
      
      const securityTab = screen.getByRole('tab', { name: /security/i })
      fireEvent.click(securityTab)
      
      await waitFor(() => {
        expect(securityTab).toHaveAttribute('aria-selected', 'true')
        expect(screen.getByTestId('security-settings')).toBeInTheDocument()
      })
    })

    it('should support keyboard navigation between tabs', () => {
      render(<ProfilePage />)
      
      const profileTab = screen.getByRole('tab', { name: /profile/i })
      const accountTab = screen.getByRole('tab', { name: /account settings/i })
      
      // Focus on profile tab
      profileTab.focus()
      
      // Press arrow right to move to next tab
      fireEvent.keyDown(profileTab, { key: 'ArrowRight' })
      
      expect(document.activeElement).toBe(accountTab)
    })

    it('should handle Home and End keys for tab navigation', () => {
      render(<ProfilePage />)
      
      const profileTab = screen.getByRole('tab', { name: /profile/i })
      const securityTab = screen.getByRole('tab', { name: /security/i })
      
      // Focus on profile tab and press End
      profileTab.focus()
      fireEvent.keyDown(profileTab, { key: 'End' })
      
      expect(document.activeElement).toBe(securityTab)
      
      // Press Home to go back to first tab
      fireEvent.keyDown(securityTab, { key: 'Home' })
      
      expect(document.activeElement).toBe(profileTab)
    })
  })

  describe('Responsive Design', () => {
    it('should adapt tab layout for mobile screens', () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      })
      
      render(<ProfilePage />)
      
      // Trigger resize event
      fireEvent(window, new Event('resize'))
      
      // Check that mobile-specific classes are applied
      const tabs = screen.getAllByRole('tab')
      tabs.forEach(tab => {
        expect(tab).toHaveClass('px-2') // Mobile padding
      })
    })

    it('should use desktop layout for larger screens', () => {
      // Mock window.innerWidth for desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })
      
      render(<ProfilePage />)
      
      // Trigger resize event
      fireEvent(window, new Event('resize'))
      
      // Check that desktop-specific classes are applied
      const tabs = screen.getAllByRole('tab')
      tabs.forEach(tab => {
        expect(tab).toHaveClass('px-4') // Desktop padding
      })
    })
  })

  describe('Error Boundaries', () => {
    it('should wrap content in error boundary', () => {
      render(<ProfilePage />)
      
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('should show loading spinner when session is not available', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn()
      })
      
      render(<ProfilePage />)
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      expect(screen.getByText('Loading profile...')).toBeInTheDocument()
    })
  })

  describe('Profile Header', () => {
    it('should display user information in header', () => {
      render(<ProfilePage />)
      
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('Admin Role')).toBeInTheDocument()
    })

    it('should show profile picture when available', () => {
      render(<ProfilePage />)
      
      const profileImage = screen.getByAltText("John Doe's profile picture")
      expect(profileImage).toBeInTheDocument()
      expect(profileImage).toHaveAttribute('src', 'https://example.com/profile.jpg')
    })

    it('should show default avatar when no profile picture', () => {
      mockUseSession.mockReturnValue({
        data: {
          ...mockSession,
          user: {
            ...mockSession.user,
            profilePicture: undefined
          }
        },
        status: 'authenticated',
        update: jest.fn()
      })
      
      render(<ProfilePage />)
      
      // Should show UserCircleIcon instead of image
      expect(screen.queryByAltText("John Doe's profile picture")).not.toBeInTheDocument()
    })
  })

  describe('Profile Form Integration', () => {
    it('should integrate with ProfilePictureManager component', () => {
      render(<ProfilePage />)
      
      expect(screen.getByTestId('profile-picture-manager')).toBeInTheDocument()
    })

    it('should handle profile picture upload', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ profilePicture: 'new-image-url' })
      })
      global.fetch = mockFetch
      
      const mockUpdate = jest.fn()
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
        update: mockUpdate
      })
      
      render(<ProfilePage />)
      
      const uploadButton = screen.getByText('Upload Picture')
      fireEvent.click(uploadButton)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/users/user-123/avatar', {
          method: 'POST',
          body: expect.any(FormData)
        })
      })
    })

    it('should handle profile picture removal', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      })
      global.fetch = mockFetch
      
      const mockUpdate = jest.fn()
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
        update: mockUpdate
      })
      
      render(<ProfilePage />)
      
      const removeButton = screen.getByText('Remove Picture')
      fireEvent.click(removeButton)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/users/user-123/avatar', {
          method: 'DELETE'
        })
      })
    })
  })

  describe('Component Integration', () => {
    it('should pass correct userId to AccountSettings component', () => {
      render(<ProfilePage />)
      
      fireEvent.click(screen.getByRole('tab', { name: /account settings/i }))
      
      expect(screen.getByText('Account Settings for user-123')).toBeInTheDocument()
    })

    it('should pass correct userId to SecuritySettings component', () => {
      render(<ProfilePage />)
      
      fireEvent.click(screen.getByRole('tab', { name: /security/i }))
      
      expect(screen.getByText('Security Settings for user-123')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for tabs', () => {
      render(<ProfilePage />)
      
      const tabList = screen.getByRole('tablist')
      expect(tabList).toBeInTheDocument()
      
      const tabs = screen.getAllByRole('tab')
      tabs.forEach((tab, index) => {
        expect(tab).toHaveAttribute('aria-selected')
        expect(tab).toHaveAttribute('aria-controls')
        expect(tab).toHaveAttribute('tabindex')
      })
    })

    it('should have proper tab panel attributes', () => {
      render(<ProfilePage />)
      
      const profilePanel = screen.getByRole('tabpanel')
      expect(profilePanel).toHaveAttribute('aria-labelledby')
    })

    it('should support screen reader navigation', () => {
      render(<ProfilePage />)
      
      const profileTab = screen.getByRole('tab', { name: /profile/i })
      expect(profileTab).toHaveAttribute('type', 'button')
    })
  })

  describe('Form Validation and Error Handling', () => {
    it('should display success messages', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: mockSession.user })
      })
      global.fetch = mockFetch
      
      render(<ProfilePage />)
      
      // Fill out and submit form
      const nameInput = screen.getByLabelText(/name/i)
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } })
      
      const submitButton = screen.getByText('Save Changes')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Profile updated successfully')).toBeInTheDocument()
      })
    })

    it('should display error messages', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: { message: 'Update failed' } })
      })
      global.fetch = mockFetch
      
      render(<ProfilePage />)
      
      const submitButton = screen.getByText('Save Changes')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Update failed')).toBeInTheDocument()
      })
    })
  })
})