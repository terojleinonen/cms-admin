/**
 * AccountSettings Component Tests
 * Tests for user preferences management component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionProvider } from 'next-auth/react'
import AccountSettings from '@/components/users/AccountSettings'
import { Theme } from '@prisma/client'
import { UserPreferences } from '@/lib/types'

// Mock the API calls
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock session data
const mockSession = {
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'EDITOR' as const
  }
}

// Mock user preferences
const mockPreferences: UserPreferences = {
  id: 'pref-1',
  userId: 'user-1',
  theme: Theme.SYSTEM,
  timezone: 'UTC',
  language: 'en',
  notifications: {
    email: true,
    push: true,
    security: true,
    marketing: false
  },
  dashboard: {
    layout: 'default',
    widgets: [],
    defaultView: 'dashboard'
  },
  createdAt: new Date(),
  updatedAt: new Date()
}

// Test wrapper with session
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <SessionProvider session={mockSession}>
    {children}
  </SessionProvider>
)

describe('AccountSettings Component', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('Initial Loading and Display', () => {
    it('should render loading state initially', () => {
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ preferences: mockPreferences })
        }), 100))
      )

      render(
        <TestWrapper>
          <AccountSettings userId="user-1" />
        </TestWrapper>
      )

      expect(screen.getByText('Loading preferences...')).toBeInTheDocument()
    })

    it('should load and display user preferences', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ preferences: mockPreferences })
      })

      render(
        <TestWrapper>
          <AccountSettings userId="user-1" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Account Settings')).toBeInTheDocument()
      })

      // Check theme selection
      expect(screen.getByDisplayValue('System')).toBeInTheDocument()
      
      // Check timezone
      expect(screen.getByDisplayValue('UTC')).toBeInTheDocument()
      
      // Check language
      expect(screen.getByDisplayValue('English')).toBeInTheDocument()
      
      // Check notification settings
      expect(screen.getByLabelText('Email notifications')).toBeChecked()
      expect(screen.getByLabelText('Push notifications')).toBeChecked()
      expect(screen.getByLabelText('Security alerts')).toBeChecked()
      expect(screen.getByLabelText('Marketing emails')).not.toBeChecked()
    })

    it('should handle API error when loading preferences', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to load preferences' })
      })

      render(
        <TestWrapper>
          <AccountSettings userId="user-1" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Failed to load preferences. Please try again.')).toBeInTheDocument()
      })
    })
  })

  describe('Theme Selection', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ preferences: mockPreferences })
      })

      render(
        <TestWrapper>
          <AccountSettings userId="user-1" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Account Settings')).toBeInTheDocument()
      })
    })

    it('should allow changing theme preference', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          preferences: { ...mockPreferences, theme: Theme.DARK }
        })
      })

      const themeSelect = screen.getByLabelText('Theme')
      await user.selectOptions(themeSelect, 'DARK')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/users/user-1/preferences',
          expect.objectContaining({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme: 'DARK' })
          })
        )
      })
    })

    it('should show success message after theme update', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          preferences: { ...mockPreferences, theme: Theme.LIGHT }
        })
      })

      const themeSelect = screen.getByLabelText('Theme')
      await user.selectOptions(themeSelect, 'LIGHT')

      await waitFor(() => {
        expect(screen.getByText('Theme updated successfully!')).toBeInTheDocument()
      })
    })
  })

  describe('Timezone Selection', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ preferences: mockPreferences })
      })

      render(
        <TestWrapper>
          <AccountSettings userId="user-1" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Account Settings')).toBeInTheDocument()
      })
    })

    it('should allow changing timezone preference', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          preferences: { ...mockPreferences, timezone: 'America/New_York' }
        })
      })

      const timezoneSelect = screen.getByLabelText('Timezone')
      await user.selectOptions(timezoneSelect, 'America/New_York')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/users/user-1/preferences',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ timezone: 'America/New_York' })
          })
        )
      })
    })
  })

  describe('Language Selection', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ preferences: mockPreferences })
      })

      render(
        <TestWrapper>
          <AccountSettings userId="user-1" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Account Settings')).toBeInTheDocument()
      })
    })

    it('should allow changing language preference', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          preferences: { ...mockPreferences, language: 'es' }
        })
      })

      const languageSelect = screen.getByLabelText('Language')
      await user.selectOptions(languageSelect, 'es')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/users/user-1/preferences',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ language: 'es' })
          })
        )
      })
    })
  })

  describe('Notification Settings', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ preferences: mockPreferences })
      })

      render(
        <TestWrapper>
          <AccountSettings userId="user-1" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Account Settings')).toBeInTheDocument()
      })
    })

    it('should allow toggling email notifications', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          preferences: { 
            ...mockPreferences, 
            notifications: { ...mockPreferences.notifications, email: false }
          }
        })
      })

      const emailCheckbox = screen.getByLabelText('Email notifications')
      await user.click(emailCheckbox)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/users/user-1/preferences',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ 
              notifications: { 
                ...mockPreferences.notifications, 
                email: false 
              }
            })
          })
        )
      })
    })

    it('should allow toggling marketing emails', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          preferences: { 
            ...mockPreferences, 
            notifications: { ...mockPreferences.notifications, marketing: true }
          }
        })
      })

      const marketingCheckbox = screen.getByLabelText('Marketing emails')
      await user.click(marketingCheckbox)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/users/user-1/preferences',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ 
              notifications: { 
                ...mockPreferences.notifications, 
                marketing: true 
              }
            })
          })
        )
      })
    })
  })

  describe('Dashboard Settings', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ preferences: mockPreferences })
      })

      render(
        <TestWrapper>
          <AccountSettings userId="user-1" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Account Settings')).toBeInTheDocument()
      })
    })

    it('should allow changing dashboard layout', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          preferences: { 
            ...mockPreferences, 
            dashboard: { ...mockPreferences.dashboard, layout: 'compact' }
          }
        })
      })

      const layoutSelect = screen.getByLabelText('Dashboard Layout')
      await user.selectOptions(layoutSelect, 'compact')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/users/user-1/preferences',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ 
              dashboard: { 
                ...mockPreferences.dashboard, 
                layout: 'compact' 
              }
            })
          })
        )
      })
    })

    it('should allow changing default view', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          preferences: { 
            ...mockPreferences, 
            dashboard: { ...mockPreferences.dashboard, defaultView: 'products' }
          }
        })
      })

      const defaultViewSelect = screen.getByLabelText('Default View')
      await user.selectOptions(defaultViewSelect, 'products')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/users/user-1/preferences',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ 
              dashboard: { 
                ...mockPreferences.dashboard, 
                defaultView: 'products' 
              }
            })
          })
        )
      })
    })
  })

  describe('Error Handling', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ preferences: mockPreferences })
      })

      render(
        <TestWrapper>
          <AccountSettings userId="user-1" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Account Settings')).toBeInTheDocument()
      })
    })

    it('should handle update errors gracefully', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Update failed' })
      })

      const themeSelect = screen.getByLabelText('Theme')
      await user.selectOptions(themeSelect, 'DARK')

      await waitFor(() => {
        expect(screen.getByText('Failed to update preferences. Please try again.')).toBeInTheDocument()
      })
    })

    it('should handle network errors', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const themeSelect = screen.getByLabelText('Theme')
      await user.selectOptions(themeSelect, 'LIGHT')

      await waitFor(() => {
        expect(screen.getByText('Failed to update preferences. Please try again.')).toBeInTheDocument()
      })
    })
  })

  describe('Form Validation', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ preferences: mockPreferences })
      })

      render(
        <TestWrapper>
          <AccountSettings userId="user-1" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Account Settings')).toBeInTheDocument()
      })
    })

    it('should validate timezone format', async () => {
      const user = userEvent.setup()
      
      // Mock validation error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ 
          error: 'Validation failed',
          errors: { timezone: ['Invalid timezone format'] }
        })
      })

      const timezoneSelect = screen.getByLabelText('Timezone')
      await user.selectOptions(timezoneSelect, 'Invalid/Timezone')

      await waitFor(() => {
        expect(screen.getByText('Invalid timezone format')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ preferences: mockPreferences })
      })

      render(
        <TestWrapper>
          <AccountSettings userId="user-1" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Account Settings')).toBeInTheDocument()
      })
    })

    it('should have proper labels for all form controls', () => {
      expect(screen.getByLabelText('Theme')).toBeInTheDocument()
      expect(screen.getByLabelText('Timezone')).toBeInTheDocument()
      expect(screen.getByLabelText('Language')).toBeInTheDocument()
      expect(screen.getByLabelText('Email notifications')).toBeInTheDocument()
      expect(screen.getByLabelText('Push notifications')).toBeInTheDocument()
      expect(screen.getByLabelText('Security alerts')).toBeInTheDocument()
      expect(screen.getByLabelText('Marketing emails')).toBeInTheDocument()
      expect(screen.getByLabelText('Dashboard Layout')).toBeInTheDocument()
      expect(screen.getByLabelText('Default View')).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      
      // Tab through form elements
      await user.tab()
      expect(screen.getByLabelText('Theme')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByLabelText('Timezone')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByLabelText('Language')).toHaveFocus()
    })
  })
})