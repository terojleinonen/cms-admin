/**
 * Comprehensive AccountSettings Component Tests
 * Complete test suite for account settings functionality
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { SessionProvider } from 'next-auth/react'
import AccountSettings from '@/components/users/AccountSettings'
import { Theme, UserRole } from '@prisma/client'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  ...jest.requireActual('next-auth/react'),
  useSession: jest.fn(),
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

const mockPreferences = {
  id: 'pref-123',
  userId: 'user-123',
  theme: Theme.SYSTEM,
  timezone: 'UTC',
  language: 'en',
  notifications: {
    email: true,
    push: true,
    security: true,
    marketing: false,
  },
  dashboard: {
    layout: 'default',
    widgets: ['analytics', 'recent-orders'],
    defaultView: 'dashboard',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('AccountSettings Component', () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful preferences fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ preferences: mockPreferences }),
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
        <AccountSettings userId="user-123" {...props} />
      </SessionProvider>
    )
  }

  describe('Initial Rendering', () => {
    it('renders all preference sections', async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Account Settings')).toBeInTheDocument()
        expect(screen.getByText('Theme Preferences')).toBeInTheDocument()
        expect(screen.getByText('Regional Settings')).toBeInTheDocument()
        expect(screen.getByText('Notification Preferences')).toBeInTheDocument()
        expect(screen.getByText('Dashboard Settings')).toBeInTheDocument()
      })
    })

    it('displays loading state initially', () => {
      renderComponent()
      expect(screen.getByText('Loading preferences...')).toBeInTheDocument()
    })

    it('loads and displays user preferences', async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByDisplayValue('UTC')).toBeInTheDocument()
        expect(screen.getByDisplayValue('en')).toBeInTheDocument()
      })
    })
  })

  describe('Theme Settings', () => {
    it('allows theme selection', async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Theme Preferences')).toBeInTheDocument()
      })

      const darkThemeRadio = screen.getByLabelText('Dark')
      await user.click(darkThemeRadio)

      expect(darkThemeRadio).toBeChecked()
    })

    it('shows current theme selection', async () => {
      renderComponent()

      await waitFor(() => {
        const systemThemeRadio = screen.getByLabelText('System')
        expect(systemThemeRadio).toBeChecked()
      })
    })
  })

  describe('Regional Settings', () => {
    it('allows timezone selection', async () => {
      renderComponent()

      await waitFor(() => {
        const timezoneSelect = screen.getByDisplayValue('UTC')
        expect(timezoneSelect).toBeInTheDocument()
      })

      const timezoneSelect = screen.getByDisplayValue('UTC')
      await user.selectOptions(timezoneSelect, 'America/New_York')

      expect(timezoneSelect).toHaveValue('America/New_York')
    })

    it('allows language selection', async () => {
      renderComponent()

      await waitFor(() => {
        const languageSelect = screen.getByDisplayValue('en')
        expect(languageSelect).toBeInTheDocument()
      })

      const languageSelect = screen.getByDisplayValue('en')
      await user.selectOptions(languageSelect, 'es')

      expect(languageSelect).toHaveValue('es')
    })
  })

  describe('Notification Settings', () => {
    it('displays notification toggles', async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByLabelText('Email notifications')).toBeInTheDocument()
        expect(screen.getByLabelText('Push notifications')).toBeInTheDocument()
        expect(screen.getByLabelText('Security alerts')).toBeInTheDocument()
        expect(screen.getByLabelText('Marketing emails')).toBeInTheDocument()
      })
    })

    it('allows toggling notification settings', async () => {
      renderComponent()

      await waitFor(() => {
        const emailToggle = screen.getByLabelText('Email notifications')
        expect(emailToggle).toBeChecked()
      })

      const emailToggle = screen.getByLabelText('Email notifications')
      await user.click(emailToggle)

      expect(emailToggle).not.toBeChecked()
    })

    it('shows correct initial notification states', async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByLabelText('Email notifications')).toBeChecked()
        expect(screen.getByLabelText('Push notifications')).toBeChecked()
        expect(screen.getByLabelText('Security alerts')).toBeChecked()
        expect(screen.getByLabelText('Marketing emails')).not.toBeChecked()
      })
    })
  })

  describe('Dashboard Settings', () => {
    it('allows layout selection', async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Dashboard Settings')).toBeInTheDocument()
      })

      const compactLayoutRadio = screen.getByLabelText('Compact')
      await user.click(compactLayoutRadio)

      expect(compactLayoutRadio).toBeChecked()
    })

    it('allows widget configuration', async () => {
      renderComponent()

      await waitFor(() => {
        const analyticsWidget = screen.getByLabelText('Analytics')
        expect(analyticsWidget).toBeChecked()
      })

      const ordersWidget = screen.getByLabelText('Recent Orders')
      expect(ordersWidget).toBeChecked()
    })
  })

  describe('Form Submission', () => {
    it('saves preferences successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          preferences: { ...mockPreferences, theme: Theme.DARK } 
        }),
      } as Response)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Theme Preferences')).toBeInTheDocument()
      })

      const darkThemeRadio = screen.getByLabelText('Dark')
      await user.click(darkThemeRadio)

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/users/user-123/preferences',
          expect.objectContaining({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('"theme":"DARK"'),
          })
        )
      })

      expect(screen.getByText('Preferences saved successfully')).toBeInTheDocument()
    })

    it('handles save errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ 
          error: { message: 'Failed to save preferences' } 
        }),
      } as Response)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Theme Preferences')).toBeInTheDocument()
      })

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to save preferences')).toBeInTheDocument()
      })
    })

    it('shows loading state during save', async () => {
      let resolvePromise: (value: any) => void
      const savePromise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      mockFetch.mockReturnValueOnce(savePromise as any)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Theme Preferences')).toBeInTheDocument()
      })

      const saveButton = screen.getByText('Save Changes')
      await user.click(saveButton)

      expect(screen.getByText('Saving...')).toBeInTheDocument()
      expect(saveButton).toBeDisabled()

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => ({ preferences: mockPreferences }),
      })

      await waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles fetch errors on load', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Failed to load preferences')).toBeInTheDocument()
      })
    })

    it('handles invalid response data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ preferences: null }),
      } as Response)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Failed to load preferences')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper form labels', async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByLabelText('Timezone')).toBeInTheDocument()
        expect(screen.getByLabelText('Language')).toBeInTheDocument()
        expect(screen.getByLabelText('Email notifications')).toBeInTheDocument()
      })
    })

    it('supports keyboard navigation', async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Theme Preferences')).toBeInTheDocument()
      })

      const lightThemeRadio = screen.getByLabelText('Light')
      lightThemeRadio.focus()
      expect(lightThemeRadio).toHaveFocus()

      await user.keyboard('{ArrowDown}')
      const darkThemeRadio = screen.getByLabelText('Dark')
      expect(darkThemeRadio).toHaveFocus()
    })
  })

  describe('Responsive Design', () => {
    it('applies custom className', () => {
      const { container } = renderComponent({ className: 'custom-class' })
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('Data Validation', () => {
    it('validates timezone format', async () => {
      renderComponent()

      await waitFor(() => {
        const timezoneSelect = screen.getByDisplayValue('UTC')
        expect(timezoneSelect).toBeInTheDocument()
      })

      // Try to set invalid timezone (this should be prevented by the select options)
      const timezoneSelect = screen.getByDisplayValue('UTC')
      expect(timezoneSelect.querySelector('option[value="invalid-timezone"]')).toBeNull()
    })

    it('validates language format', async () => {
      renderComponent()

      await waitFor(() => {
        const languageSelect = screen.getByDisplayValue('en')
        expect(languageSelect).toBeInTheDocument()
      })

      // Ensure only valid language codes are available
      const languageSelect = screen.getByDisplayValue('en')
      const options = Array.from(languageSelect.querySelectorAll('option')).map(
        (option) => option.getAttribute('value')
      )
      expect(options).toContain('en')
      expect(options).toContain('es')
      expect(options).toContain('fr')
    })
  })
})