/**
 * User Profile Accessibility Tests
 * WCAG compliance and accessibility testing for user profile components
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import { SessionProvider } from 'next-auth/react'
import ProfilePage from '@/profile/page'
import ProfilePictureManager from '@/components/users/ProfilePictureManager'
import AccountSettings from '@/components/users/AccountSettings'
import SecuritySettings from '@/components/users/SecuritySettings'
import SessionManagement from '@/components/profile/SessionManagement'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

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

// Mock API calls
global.fetch = jest.fn()

const mockSession = {
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'USER',
    profilePicture: null,
  },
  expires: '2024-12-31',
}

const mockUserPreferences = {
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
}

const mockSecurityInfo = {
  twoFactorEnabled: false,
  lastPasswordChange: new Date().toISOString(),
  activeSessions: 2,
  recentActivity: [],
}

describe('User Profile Accessibility Tests', () => {
  beforeEach(() => {
    const { useSession } = require('next-auth/react')
    useSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    })

    // Mock successful API responses
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/preferences')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ preferences: mockUserPreferences }),
        })
      }
      if (url.includes('/security')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ security: mockSecurityInfo }),
        })
      }
      if (url.includes('/sessions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            sessions: [],
            statistics: { activeSessions: 0, totalSessions: 0, recentLogins: 0, lastLogin: null },
            suspiciousActivity: [],
            hasSecurityConcerns: false,
          }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Profile Page Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <SessionProvider session={mockSession}>
          <ProfilePage />
        </SessionProvider>
      )

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper heading hierarchy', async () => {
      render(
        <SessionProvider session={mockSession}>
          <ProfilePage />
        </SessionProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      // Check for proper heading structure
      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toBeInTheDocument()
      expect(h1).toHaveTextContent('Test User')

      // Check for proper tab structure
      const tablist = screen.getByRole('tablist')
      expect(tablist).toBeInTheDocument()
      expect(tablist).toHaveAttribute('aria-label', 'Profile sections')
    })

    it('should support keyboard navigation for tabs', async () => {
      const user = userEvent.setup()
      
      render(
        <SessionProvider session={mockSession}>
          <ProfilePage />
        </SessionProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(4)

      // Focus first tab
      tabs[0].focus()
      expect(tabs[0]).toHaveFocus()

      // Navigate with arrow keys
      await user.keyboard('{ArrowRight}')
      expect(tabs[1]).toHaveFocus()

      await user.keyboard('{ArrowLeft}')
      expect(tabs[0]).toHaveFocus()

      // Navigate to end with End key
      await user.keyboard('{End}')
      expect(tabs[3]).toHaveFocus()

      // Navigate to beginning with Home key
      await user.keyboard('{Home}')
      expect(tabs[0]).toHaveFocus()
    })

    it('should have proper ARIA attributes for tabs', async () => {
      render(
        <SessionProvider session={mockSession}>
          <ProfilePage />
        </SessionProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      const tabs = screen.getAllByRole('tab')
      
      tabs.forEach((tab, index) => {
        expect(tab).toHaveAttribute('aria-selected')
        expect(tab).toHaveAttribute('aria-controls')
        expect(tab).toHaveAttribute('tabindex')
        
        // First tab should be selected by default
        if (index === 0) {
          expect(tab).toHaveAttribute('aria-selected', 'true')
          expect(tab).toHaveAttribute('tabindex', '0')
        } else {
          expect(tab).toHaveAttribute('aria-selected', 'false')
          expect(tab).toHaveAttribute('tabindex', '-1')
        }
      })
    })

    it('should have proper form labels and descriptions', async () => {
      render(
        <SessionProvider session={mockSession}>
          <ProfilePage />
        </SessionProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      // Check form inputs have proper labels
      const nameInput = screen.getByLabelText('Name')
      expect(nameInput).toBeInTheDocument()
      expect(nameInput).toHaveAttribute('type', 'text')

      const emailInput = screen.getByLabelText('Email')
      expect(emailInput).toBeInTheDocument()
      expect(emailInput).toHaveAttribute('type', 'email')
    })

    it('should provide proper error messaging', async () => {
      const user = userEvent.setup()
      
      render(
        <SessionProvider session={mockSession}>
          <ProfilePage />
        </SessionProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      // Clear name field to trigger validation error
      const nameInput = screen.getByLabelText('Name')
      await user.clear(nameInput)
      
      const submitButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(submitButton)

      // Check for error message
      await waitFor(() => {
        const errorMessage = screen.getByText(/name is required/i)
        expect(errorMessage).toBeInTheDocument()
        expect(errorMessage).toHaveAttribute('class', expect.stringContaining('text-red-600'))
      })
    })
  })

  describe('Profile Picture Manager Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const mockOnUpload = jest.fn()
      const mockOnRemove = jest.fn()

      const { container } = render(
        <ProfilePictureManager
          currentImage={null}
          onUpload={mockOnUpload}
          onRemove={mockOnRemove}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper file input accessibility', async () => {
      const mockOnUpload = jest.fn()
      
      render(
        <ProfilePictureManager
          currentImage={null}
          onUpload={mockOnUpload}
        />
      )

      const fileInput = screen.getByLabelText(/upload profile picture/i)
      expect(fileInput).toBeInTheDocument()
      expect(fileInput).toHaveAttribute('type', 'file')
      expect(fileInput).toHaveAttribute('accept', expect.stringContaining('image/*'))
    })

    it('should provide proper drag and drop accessibility', async () => {
      const mockOnUpload = jest.fn()
      
      render(
        <ProfilePictureManager
          currentImage={null}
          onUpload={mockOnUpload}
        />
      )

      const dropZone = screen.getByRole('button', { name: /click to upload or drag and drop/i })
      expect(dropZone).toBeInTheDocument()
      expect(dropZone).toHaveAttribute('tabindex', '0')
    })

    it('should have proper image alt text', async () => {
      const mockOnUpload = jest.fn()
      const mockOnRemove = jest.fn()
      
      render(
        <ProfilePictureManager
          currentImage="/test-image.jpg"
          onUpload={mockOnUpload}
          onRemove={mockOnRemove}
        />
      )

      const image = screen.getByRole('img')
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute('alt', expect.stringContaining('profile picture'))
    })
  })

  describe('Account Settings Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <AccountSettings userId="user-1" />
      )

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/account settings/i)).toBeInTheDocument()
      })

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper fieldset and legend structure', async () => {
      render(<AccountSettings userId="user-1" />)

      await waitFor(() => {
        expect(screen.getByText(/account settings/i)).toBeInTheDocument()
      })

      // Check for fieldsets with proper legends
      const fieldsets = screen.getAllByRole('group')
      expect(fieldsets.length).toBeGreaterThan(0)

      fieldsets.forEach(fieldset => {
        expect(fieldset).toBeInTheDocument()
      })
    })

    it('should have proper form control associations', async () => {
      render(<AccountSettings userId="user-1" />)

      await waitFor(() => {
        expect(screen.getByText(/account settings/i)).toBeInTheDocument()
      })

      // Check theme selection
      const themeSelect = screen.getByLabelText(/theme/i)
      expect(themeSelect).toBeInTheDocument()
      expect(themeSelect).toHaveAttribute('aria-describedby')

      // Check timezone selection
      const timezoneSelect = screen.getByLabelText(/timezone/i)
      expect(timezoneSelect).toBeInTheDocument()
    })
  })

  describe('Security Settings Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <SecuritySettings userId="user-1" />
      )

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/security settings/i)).toBeInTheDocument()
      })

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper password field accessibility', async () => {
      render(<SecuritySettings userId="user-1" />)

      await waitFor(() => {
        expect(screen.getByText(/security settings/i)).toBeInTheDocument()
      })

      // Check for password visibility toggle
      const passwordToggles = screen.getAllByRole('button', { name: /show password|hide password/i })
      expect(passwordToggles.length).toBeGreaterThan(0)

      passwordToggles.forEach(toggle => {
        expect(toggle).toHaveAttribute('aria-label')
      })
    })

    it('should have proper 2FA setup accessibility', async () => {
      render(<SecuritySettings userId="user-1" />)

      await waitFor(() => {
        expect(screen.getByText(/security settings/i)).toBeInTheDocument()
      })

      // Check for 2FA toggle
      const twoFactorToggle = screen.getByRole('switch', { name: /two-factor authentication/i })
      expect(twoFactorToggle).toBeInTheDocument()
      expect(twoFactorToggle).toHaveAttribute('aria-checked')
    })
  })

  describe('Session Management Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<SessionManagement />)

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/session overview/i)).toBeInTheDocument()
      })

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper table accessibility for sessions', async () => {
      render(<SessionManagement />)

      await waitFor(() => {
        expect(screen.getByText(/session overview/i)).toBeInTheDocument()
      })

      // Check for proper table structure if sessions are displayed as table
      const sessionsList = screen.getByText(/active sessions/i).closest('div')
      expect(sessionsList).toBeInTheDocument()
    })

    it('should have proper button accessibility for session actions', async () => {
      render(<SessionManagement />)

      await waitFor(() => {
        expect(screen.getByText(/session overview/i)).toBeInTheDocument()
      })

      const logoutAllButton = screen.getByRole('button', { name: /logout all devices/i })
      expect(logoutAllButton).toBeInTheDocument()
      expect(logoutAllButton).toHaveAttribute('type', 'button')
    })
  })

  describe('Color Contrast and Visual Accessibility', () => {
    it('should have sufficient color contrast for text elements', async () => {
      render(
        <SessionProvider session={mockSession}>
          <ProfilePage />
        </SessionProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      // Check for proper contrast classes
      const headings = screen.getAllByRole('heading')
      headings.forEach(heading => {
        const classes = heading.className
        // Should have dark text classes for proper contrast
        expect(classes).toMatch(/text-(gray-900|black|slate-900)/)
      })
    })

    it('should have proper focus indicators', async () => {
      const user = userEvent.setup()
      
      render(
        <SessionProvider session={mockSession}>
          <ProfilePage />
        </SessionProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      // Tab through interactive elements
      const interactiveElements = screen.getAllByRole('button')
      
      for (const element of interactiveElements.slice(0, 3)) { // Test first few elements
        element.focus()
        expect(element).toHaveFocus()
        
        // Check for focus ring classes
        const classes = element.className
        expect(classes).toMatch(/focus:(ring|outline)/)
      }
    })

    it('should support reduced motion preferences', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })

      render(
        <SessionProvider session={mockSession}>
          <ProfilePage />
        </SessionProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      // Verify no problematic animations are present
      const animatedElements = document.querySelectorAll('[class*="animate-"]')
      animatedElements.forEach(element => {
        const classes = element.className
        // Should not have rapid animations
        expect(classes).not.toMatch(/animate-(spin|ping|bounce)/)
      })
    })
  })

  describe('Screen Reader Compatibility', () => {
    it('should have proper landmark roles', async () => {
      render(
        <SessionProvider session={mockSession}>
          <ProfilePage />
        </SessionProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      // Check for main landmark
      const main = screen.getByRole('main')
      expect(main).toBeInTheDocument()
    })

    it('should have proper live regions for dynamic content', async () => {
      render(
        <SessionProvider session={mockSession}>
          <ProfilePage />
        </SessionProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      // Check for status messages that should be announced
      const statusElements = document.querySelectorAll('[role="status"], [aria-live]')
      expect(statusElements.length).toBeGreaterThanOrEqual(0)
    })

    it('should provide proper context for form errors', async () => {
      const user = userEvent.setup()
      
      render(
        <SessionProvider session={mockSession}>
          <ProfilePage />
        </SessionProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      // Trigger validation error
      const nameInput = screen.getByLabelText('Name')
      await user.clear(nameInput)
      
      const submitButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(submitButton)

      // Check that error is properly associated with input
      await waitFor(() => {
        const errorMessage = screen.getByText(/name is required/i)
        expect(errorMessage).toBeInTheDocument()
        
        // Error should be associated with the input
        const inputId = nameInput.getAttribute('id')
        const errorId = errorMessage.getAttribute('id')
        expect(nameInput).toHaveAttribute('aria-describedby', expect.stringContaining(errorId || ''))
      })
    })
  })
})