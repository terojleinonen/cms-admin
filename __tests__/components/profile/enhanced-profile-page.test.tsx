/**
 * Enhanced Profile Page Tests
 * Tests for the enhanced profile page with tabbed interface and new components
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import ProfilePage from '../../../app/profile/page'

// Mock next-auth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock the user components
jest.mock('../../../app/components/users/ProfilePictureManager', () => {
  return function MockProfilePictureManager({ onUpload, onRemove }: any) {
    return (
      <div data-testid="profile-picture-manager">
        <button onClick={() => onUpload(new File([''], 'test.jpg'))}>Upload Picture</button>
        {onRemove && <button onClick={onRemove}>Remove Picture</button>}
      </div>
    )
  }
})

jest.mock('../../../app/components/users/AccountSettings', () => {
  return function MockAccountSettings({ userId }: any) {
    return <div data-testid="account-settings">Account Settings for {userId}</div>
  }
})

jest.mock('../../../app/components/users/SecuritySettings', () => {
  return function MockSecuritySettings({ userId }: any) {
    return <div data-testid="security-settings">Security Settings for {userId}</div>
  }
})

// Mock fetch
global.fetch = jest.fn()

const mockSession = {
  user: {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'USER'
  }
}

describe('Enhanced Profile Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn()
    })
    
    // Mock successful API responses
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: mockSession.user })
    })
  })

  it('renders loading state when session is not available', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
      update: jest.fn()
    })

    render(<ProfilePage />)
    
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders tabbed interface with all profile sections', async () => {
    render(<ProfilePage />)

    // Check for tab navigation
    expect(screen.getByRole('tab', { name: /profile/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /account settings/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /security/i })).toBeInTheDocument()

    // Check that profile tab is active by default
    expect(screen.getByRole('tab', { name: /profile/i })).toHaveAttribute('aria-selected', 'true')
  })

  it('displays user information in header', () => {
    render(<ProfilePage />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText(/user role/i)).toBeInTheDocument()
  })

  it('shows profile picture manager in profile tab', () => {
    render(<ProfilePage />)

    expect(screen.getByTestId('profile-picture-manager')).toBeInTheDocument()
  })

  it('switches to account settings tab when clicked', async () => {
    render(<ProfilePage />)

    const accountTab = screen.getByRole('tab', { name: /account settings/i })
    fireEvent.click(accountTab)

    await waitFor(() => {
      expect(accountTab).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByTestId('account-settings')).toBeInTheDocument()
    })
  })

  it('switches to security tab when clicked', async () => {
    render(<ProfilePage />)

    const securityTab = screen.getByRole('tab', { name: /security/i })
    fireEvent.click(securityTab)

    await waitFor(() => {
      expect(securityTab).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByTestId('security-settings')).toBeInTheDocument()
    })
  })

  it('handles profile picture upload', async () => {
    render(<ProfilePage />)

    const uploadButton = screen.getByText('Upload Picture')
    fireEvent.click(uploadButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/users/user-123/avatar',
        expect.objectContaining({
          method: 'POST'
        })
      )
    })
  })

  it('handles profile picture removal', async () => {
    // Mock session with profile picture
    mockUseSession.mockReturnValue({
      data: {
        ...mockSession,
        user: {
          ...mockSession.user,
          profilePicture: 'https://example.com/avatar.jpg'
        }
      },
      status: 'authenticated',
      update: jest.fn()
    })

    render(<ProfilePage />)

    const removeButton = screen.getByText('Remove Picture')
    fireEvent.click(removeButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/users/user-123/avatar',
        expect.objectContaining({
          method: 'DELETE'
        })
      )
    })
  })

  it('displays error boundary when component fails', () => {
    // Mock console.error to avoid noise in test output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    // Force an error by making session undefined in a way that breaks the component
    mockUseSession.mockReturnValue({
      data: undefined as any,
      status: 'authenticated',
      update: jest.fn()
    })

    render(<ProfilePage />)

    // Should show error boundary or handle gracefully
    expect(screen.getByRole('status')).toBeInTheDocument()

    consoleSpy.mockRestore()
  })

  it('is responsive on mobile devices', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })

    render(<ProfilePage />)

    // Check that the layout adapts to mobile
    const container = screen.getByRole('main')
    expect(container).toHaveClass('max-w-4xl', 'mx-auto', 'px-4', 'sm:px-6', 'lg:px-8')
  })

  it('handles keyboard navigation between tabs', () => {
    render(<ProfilePage />)

    const profileTab = screen.getByRole('tab', { name: /profile/i })
    const accountTab = screen.getByRole('tab', { name: /account settings/i })
    const securityTab = screen.getByRole('tab', { name: /security/i })

    // Test arrow key navigation
    profileTab.focus()
    fireEvent.keyDown(profileTab, { key: 'ArrowRight' })
    expect(accountTab).toHaveFocus()

    fireEvent.keyDown(accountTab, { key: 'ArrowRight' })
    expect(securityTab).toHaveFocus()

    fireEvent.keyDown(securityTab, { key: 'ArrowLeft' })
    expect(accountTab).toHaveFocus()
  })

  it('shows loading states during updates', async () => {
    // Mock slow API response
    ;(global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ user: mockSession.user })
      }), 100))
    )

    render(<ProfilePage />)

    const uploadButton = screen.getByText('Upload Picture')
    fireEvent.click(uploadButton)

    // Should show loading state
    expect(screen.getByText(/uploading/i)).toBeInTheDocument()
  })
})