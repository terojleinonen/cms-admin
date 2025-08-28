/**
 * Profile Page Integration Test
 * Basic integration test for the enhanced profile page
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { useSession } from 'next-auth/react'

// Mock next-auth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock all the complex components to avoid import issues
jest.mock('../../../app/components/users/ProfilePictureManager', () => {
  return function MockProfilePictureManager() {
    return <div data-testid="profile-picture-manager">Profile Picture Manager</div>
  }
})

jest.mock('../../../app/components/users/AccountSettings', () => {
  return function MockAccountSettings() {
    return <div data-testid="account-settings">Account Settings</div>
  }
})

jest.mock('../../../app/components/users/SecuritySettings', () => {
  return function MockSecuritySettings() {
    return <div data-testid="security-settings">Security Settings</div>
  }
})

jest.mock('../../../app/components/ui/ErrorBoundary', () => {
  return function MockErrorBoundary({ children }: { children: React.ReactNode }) {
    return <div data-testid="error-boundary">{children}</div>
  }
})

jest.mock('../../../app/components/ui/LoadingSpinner', () => {
  return function MockLoadingSpinner() {
    return <div data-testid="loading-spinner">Loading...</div>
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

describe('Profile Page Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn()
    })
  })

  it('renders loading state when session is not available', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
      update: jest.fn()
    })

    // Import and render the component
    const ProfilePage = require('../../../app/profile/page').default
    render(<ProfilePage />)
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('renders the enhanced profile page structure', () => {
    // Import and render the component
    const ProfilePage = require('../../../app/profile/page').default
    render(<ProfilePage />)

    // Check for error boundary wrapper
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
    
    // Check for user information
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })

  it('shows profile picture manager in profile tab', () => {
    const ProfilePage = require('../../../app/profile/page').default
    render(<ProfilePage />)

    expect(screen.getByTestId('profile-picture-manager')).toBeInTheDocument()
  })
})