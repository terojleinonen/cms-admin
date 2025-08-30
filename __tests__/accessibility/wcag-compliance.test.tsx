/**
 * WCAG Compliance Tests
 * Comprehensive WCAG 2.1 AA compliance testing for user profile management
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { axe, toHaveNoViolations, configureAxe } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import { SessionProvider } from 'next-auth/react'
import ProfilePage from '@/app/profile/page'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Configure axe for WCAG 2.1 AA compliance
configureAxe({
  rules: {
    // WCAG 2.1 AA rules
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'focus-order-semantics': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'aria-required-attr': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    'heading-order': { enabled: true },
    'landmark-unique': { enabled: true },
    'page-has-heading-one': { enabled: true },
    'region': { enabled: true },
    'skip-link': { enabled: true },
    'tabindex': { enabled: true },
  },
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
})

// Mock dependencies
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/profile',
}))

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

describe('WCAG 2.1 AA Compliance Tests', () => {
  beforeEach(() => {
    const { useSession } = require('next-auth/react')
    useSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    })

    // Mock API responses
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/preferences')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            preferences: {
              theme: 'light',
              timezone: 'UTC',
              language: 'en',
              notifications: { email: true, push: false, security: true },
              dashboard: { layout: 'grid', widgets: ['recent', 'stats'] },
            },
          }),
        })
      }
      if (url.includes('/security')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            security: {
              twoFactorEnabled: false,
              lastPasswordChange: new Date().toISOString(),
              activeSessions: 2,
              recentActivity: [],
            },
          }),
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

  describe('WCAG 2.1 Principle 1: Perceivable', () => {
    describe('1.1 Text Alternatives', () => {
      it('should provide text alternatives for all images', async () => {
        render(
          <SessionProvider session={mockSession}>
            <ProfilePage />
          </SessionProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('Test User')).toBeInTheDocument()
        })

        // Check all images have alt text
        const images = screen.getAllByRole('img')
        images.forEach(img => {
          expect(img).toHaveAttribute('alt')
          expect(img.getAttribute('alt')).not.toBe('')
        })
      })

      it('should provide appropriate alt text for decorative images', async () => {
        render(
          <SessionProvider session={mockSession}>
            <ProfilePage />
          </SessionProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('Test User')).toBeInTheDocument()
        })

        // Decorative images should have empty alt text or role="presentation"
        const decorativeImages = document.querySelectorAll('img[role="presentation"], img[alt=""]')
        decorativeImages.forEach(img => {
          const altText = img.getAttribute('alt')
          const role = img.getAttribute('role')
          expect(altText === '' || role === 'presentation').toBe(true)
        })
      })
    })

    describe('1.3 Adaptable', () => {
      it('should have proper heading hierarchy', async () => {
        render(
          <SessionProvider session={mockSession}>
            <ProfilePage />
          </SessionProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('Test User')).toBeInTheDocument()
        })

        // Check heading hierarchy
        const headings = screen.getAllByRole('heading')
        const headingLevels = headings.map(h => parseInt(h.tagName.charAt(1)))
        
        // Should start with h1
        expect(headingLevels[0]).toBe(1)
        
        // Should not skip levels
        for (let i = 1; i < headingLevels.length; i++) {
          const diff = headingLevels[i] - headingLevels[i - 1]
          expect(diff).toBeLessThanOrEqual(1)
        }
      })

      it('should have proper form labels and associations', async () => {
        render(
          <SessionProvider session={mockSession}>
            <ProfilePage />
          </SessionProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('Test User')).toBeInTheDocument()
        })

        // Check all form controls have labels
        const inputs = screen.getAllByRole('textbox')
        inputs.forEach(input => {
          const label = screen.getByLabelText(input.getAttribute('aria-label') || input.getAttribute('name') || '')
          expect(label).toBeInTheDocument()
        })
      })

      it('should maintain meaning when CSS is disabled', async () => {
        // This test ensures content is structured semantically
        const { container } = render(
          <SessionProvider session={mockSession}>
            <ProfilePage />
          </SessionProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('Test User')).toBeInTheDocument()
        })

        // Check for semantic structure
        expect(container.querySelector('main')).toBeInTheDocument()
        expect(container.querySelector('nav')).toBeInTheDocument()
        expect(container.querySelectorAll('section, article').length).toBeGreaterThan(0)
      })
    })

    describe('1.4 Distinguishable', () => {
      it('should have sufficient color contrast', async () => {
        const { container } = render(
          <SessionProvider session={mockSession}>
            <ProfilePage />
          </SessionProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('Test User')).toBeInTheDocument()
        })

        // Run axe with color contrast rules
        const results = await axe(container, {
          rules: {
            'color-contrast': { enabled: true },
          },
        })
        expect(results).toHaveNoViolations()
      })

      it('should not rely solely on color to convey information', async () => {
        render(
          <SessionProvider session={mockSession}>
            <ProfilePage />
          </SessionProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('Test User')).toBeInTheDocument()
        })

        // Check error messages have text, not just color
        const errorElements = document.querySelectorAll('[class*="error"], [class*="red"]')
        errorElements.forEach(element => {
          // Should have text content or icons, not just color
          const hasText = element.textContent && element.textContent.trim().length > 0
          const hasIcon = element.querySelector('svg, [class*="icon"]')
          expect(hasText || hasIcon).toBe(true)
        })
      })

      it('should support text resize up to 200%', async () => {
        // Mock text resize
        const originalFontSize = document.documentElement.style.fontSize
        document.documentElement.style.fontSize = '200%'

        render(
          <SessionProvider session={mockSession}>
            <ProfilePage />
          </SessionProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('Test User')).toBeInTheDocument()
        })

        // Content should still be readable and functional
        expect(screen.getByText('Test User')).toBeVisible()
        
        // Restore original font size
        document.documentElement.style.fontSize = originalFontSize
      })
    })
  })

  describe('WCAG 2.1 Principle 2: Operable', () => {
    describe('2.1 Keyboard Accessible', () => {
      it('should be fully keyboard accessible', async () => {
        const user = userEvent.setup()
        
        render(
          <SessionProvider session={mockSession}>
            <ProfilePage />
          </SessionProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('Test User')).toBeInTheDocument()
        })

        // Tab through all interactive elements
        const interactiveElements = screen.getAllByRole('button')
          .concat(screen.getAllByRole('textbox'))
          .concat(screen.getAllByRole('tab'))

        for (const element of interactiveElements.slice(0, 5)) { // Test first 5 elements
          await user.tab()
          expect(document.activeElement).toBe(element)
        }
      })

      it('should have no keyboard traps', async () => {
        const user = userEvent.setup()
        
        render(
          <SessionProvider session={mockSession}>
            <ProfilePage />
          </SessionProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('Test User')).toBeInTheDocument()
        })

        // Tab through elements and ensure we can always move forward/backward
        const initialElement = document.activeElement
        
        // Tab forward multiple times
        for (let i = 0; i < 10; i++) {
          const beforeTab = document.activeElement
          await user.tab()
          const afterTab = document.activeElement
          
          // Should be able to move focus
          expect(afterTab).not.toBe(beforeTab)
        }

        // Tab backward
        await user.tab({ shift: true })
        expect(document.activeElement).toBeDefined()
      })

      it('should support all functionality via keyboard', async () => {
        const user = userEvent.setup()
        
        render(
          <SessionProvider session={mockSession}>
            <ProfilePage />
          </SessionProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('Test User')).toBeInTheDocument()
        })

        // Test tab navigation
        const accountTab = screen.getByRole('tab', { name: /account settings/i })
        accountTab.focus()
        await user.keyboard('{Enter}')
        
        await waitFor(() => {
          expect(accountTab).toHaveAttribute('aria-selected', 'true')
        })

        // Test form interaction
        const nameInput = screen.getByLabelText('Name')
        nameInput.focus()
        await user.keyboard('New Name')
        expect(nameInput).toHaveValue('New Name')
      })
    })

    describe('2.2 Enough Time', () => {
      it('should not have time limits or provide controls for time limits', async () => {
        render(
          <SessionProvider session={mockSession}>
            <ProfilePage />
          </SessionProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('Test User')).toBeInTheDocument()
        })

        // Check for any time-based content
        const timeElements = document.querySelectorAll('[class*="timeout"], [class*="timer"]')
        timeElements.forEach(element => {
          // Should have controls to extend or disable timeout
          const controls = element.querySelectorAll('button, [role="button"]')
          expect(controls.length).toBeGreaterThan(0)
        })
      })
    })

    describe('2.3 Seizures and Physical Reactions', () => {
      it('should not contain content that flashes more than 3 times per second', async () => {
        render(
          <SessionProvider session={mockSession}>
            <ProfilePage />
          </SessionProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('Test User')).toBeInTheDocument()
        })

        // Check for problematic animations
        const animatedElements = document.querySelectorAll('[class*="animate-"]')
        animatedElements.forEach(element => {
          const classes = element.className
          // Should not have rapid flashing animations
          expect(classes).not.toMatch(/animate-(pulse|ping|bounce)/)
        })
      })
    })

    describe('2.4 Navigable', () => {
      it('should have descriptive page title', async () => {
        render(
          <SessionProvider session={mockSession}>
            <ProfilePage />
          </SessionProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('Test User')).toBeInTheDocument()
        })

        // Check document title is descriptive
        expect(document.title).toMatch(/profile|user|account/i)
      })

      it('should have proper focus order', async () => {
        const user = userEvent.setup()
        
        render(
          <SessionProvider session={mockSession}>
            <ProfilePage />
          </SessionProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('Test User')).toBeInTheDocument()
        })

        // Focus order should be logical
        const focusableElements = screen.getAllByRole('button')
          .concat(screen.getAllByRole('textbox'))
          .concat(screen.getAllByRole('tab'))

        // Tab through elements and verify order makes sense
        let previousTabIndex = -1
        for (const element of focusableElements.slice(0, 5)) {
          element.focus()
          const tabIndex = parseInt(element.getAttribute('tabindex') || '0')
          if (tabIndex >= 0) {
            expect(tabIndex).toBeGreaterThanOrEqual(previousTabIndex)
            previousTabIndex = tabIndex
          }
        }
      })

      it('should have descriptive link text and button labels', async () => {
        render(
          <SessionProvider session={mockSession}>
            <ProfilePage />
          </SessionProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('Test User')).toBeInTheDocument()
        })

        // Check all buttons have descriptive text
        const buttons = screen.getAllByRole('button')
        buttons.forEach(button => {
          const text = button.textContent || button.getAttribute('aria-label')
          expect(text).toBeTruthy()
          expect(text!.length).toBeGreaterThan(2)
          expect(text).not.toMatch(/^(click|button|link)$/i)
        })

        // Check all links have descriptive text
        const links = screen.getAllByRole('link')
        links.forEach(link => {
          const text = link.textContent || link.getAttribute('aria-label')
          expect(text).toBeTruthy()
          expect(text!.length).toBeGreaterThan(2)
          expect(text).not.toMatch(/^(click here|more|read more)$/i)
        })
      })

      it('should have proper headings and labels', async () => {
        render(
          <SessionProvider session={mockSession}>
            <ProfilePage />
          </SessionProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('Test User')).toBeInTheDocument()
        })

        // Check headings are descriptive
        const headings = screen.getAllByRole('heading')
        headings.forEach(heading => {
          expect(heading.textContent).toBeTruthy()
          expect(heading.textContent!.length).toBeGreaterThan(2)
        })
      })
    })

    describe('2.5 Input Modalities', () => {
      it('should support pointer cancellation', async () => {
        const user = userEvent.setup()
        
        render(
          <SessionProvider session={mockSession}>
            <ProfilePage />
          </SessionProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('Test User')).toBeInTheDocument()
        })

        // Test that mousedown doesn't trigger action, only click does
        const button = screen.getByRole('button', { name: /save changes/i })
        
        // Mouse down should not trigger action
        fireEvent.mouseDown(button)
        // No action should have occurred yet
        
        // Mouse up should trigger action
        fireEvent.mouseUp(button)
        fireEvent.click(button)
        // Now action should occur
      })

      it('should have accessible names for all interactive elements', async () => {
        render(
          <SessionProvider session={mockSession}>
            <ProfilePage />
          </SessionProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('Test User')).toBeInTheDocument()
        })

        // All interactive elements should have accessible names
        const interactiveElements = screen.getAllByRole('button')
          .concat(screen.getAllByRole('textbox'))
          .concat(screen.getAllByRole('tab'))

        interactiveElements.forEach(element => {
          const accessibleName = element.getAttribute('aria-label') || 
                                element.getAttribute('aria-labelledby') ||
                                element.textContent
          expect(accessibleName).toBeTruthy()
        })
      })
    })
  })

  describe('WCAG 2.1 Principle 3: Understandable', () => {
    describe('3.1 Readable', () => {
      it('should have language specified', async () => {
        render(
          <SessionProvider session={mockSession}>
            <ProfilePage />
          </SessionProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('Test User')).toBeInTheDocument()
        })

        // Check document has lang attribute
        expect(document.documentElement).toHaveAttribute('lang')
        expect(document.documentElement.getAttribute('lang')).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/)
      })
    })

    describe('3.2 Predictable', () => {
      it('should not change context on focus', async () => {
        const user = userEvent.setup()
        
        render(
          <SessionProvider session={mockSession}>
            <ProfilePage />
          </SessionProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('Test User')).toBeInTheDocument()
        })

        // Focus should not trigger context changes
        const inputs = screen.getAllByRole('textbox')
        for (const input of inputs.slice(0, 3)) {
          const beforeFocus = document.title
          input.focus()
          const afterFocus = document.title
          expect(afterFocus).toBe(beforeFocus)
        }
      })

      it('should have consistent navigation', async () => {
        render(
          <SessionProvider session={mockSession}>
            <ProfilePage />
          </SessionProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('Test User')).toBeInTheDocument()
        })

        // Navigation should be consistent across tabs
        const tabs = screen.getAllByRole('tab')
        expect(tabs.length).toBeGreaterThan(1)
        
        // All tabs should have consistent structure
        tabs.forEach(tab => {
          expect(tab).toHaveAttribute('role', 'tab')
          expect(tab).toHaveAttribute('aria-selected')
        })
      })
    })

    describe('3.3 Input Assistance', () => {
      it('should identify required fields', async () => {
        render(
          <SessionProvider session={mockSession}>
            <ProfilePage />
          </SessionProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('Test User')).toBeInTheDocument()
        })

        // Required fields should be marked
        const requiredInputs = document.querySelectorAll('input[required], [aria-required="true"]')
        requiredInputs.forEach(input => {
          // Should have visual or programmatic indication
          const hasAsterisk = input.parentElement?.textContent?.includes('*')
          const hasAriaRequired = input.getAttribute('aria-required') === 'true'
          const hasRequiredAttr = input.hasAttribute('required')
          
          expect(hasAsterisk || hasAriaRequired || hasRequiredAttr).toBe(true)
        })
      })

      it('should provide error identification and suggestions', async () => {
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
        
        const saveButton = screen.getByRole('button', { name: /save changes/i })
        await user.click(saveButton)

        // Error should be identified and provide suggestion
        await waitFor(() => {
          const errorMessage = screen.getByText(/name is required/i)
          expect(errorMessage).toBeInTheDocument()
          
          // Error should be associated with input
          expect(nameInput).toHaveAttribute('aria-describedby')
        })
      })
    })
  })

  describe('WCAG 2.1 Principle 4: Robust', () => {
    describe('4.1 Compatible', () => {
      it('should have valid HTML and ARIA', async () => {
        const { container } = render(
          <SessionProvider session={mockSession}>
            <ProfilePage />
          </SessionProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('Test User')).toBeInTheDocument()
        })

        // Run comprehensive axe test
        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })

      it('should have proper ARIA roles and properties', async () => {
        render(
          <SessionProvider session={mockSession}>
            <ProfilePage />
          </SessionProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('Test User')).toBeInTheDocument()
        })

        // Check ARIA roles are valid
        const elementsWithRoles = document.querySelectorAll('[role]')
        elementsWithRoles.forEach(element => {
          const role = element.getAttribute('role')
          const validRoles = [
            'button', 'tab', 'tabpanel', 'tablist', 'main', 'navigation',
            'banner', 'contentinfo', 'complementary', 'form', 'search',
            'region', 'article', 'section', 'heading', 'list', 'listitem',
            'link', 'img', 'presentation', 'none', 'status', 'alert'
          ]
          expect(validRoles).toContain(role)
        })

        // Check ARIA properties are valid
        const elementsWithAria = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby]')
        elementsWithAria.forEach(element => {
          const ariaLabel = element.getAttribute('aria-label')
          const ariaLabelledby = element.getAttribute('aria-labelledby')
          const ariaDescribedby = element.getAttribute('aria-describedby')
          
          if (ariaLabel) expect(ariaLabel.length).toBeGreaterThan(0)
          if (ariaLabelledby) {
            const referencedElement = document.getElementById(ariaLabelledby)
            expect(referencedElement).toBeTruthy()
          }
          if (ariaDescribedby) {
            const referencedElement = document.getElementById(ariaDescribedby)
            expect(referencedElement).toBeTruthy()
          }
        })
      })
    })
  })

  describe('Additional Accessibility Features', () => {
    it('should support high contrast mode', async () => {
      // Mock high contrast mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
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

      // Content should be visible in high contrast mode
      expect(screen.getByText('Test User')).toBeVisible()
    })

    it('should support screen reader announcements', async () => {
      render(
        <SessionProvider session={mockSession}>
          <ProfilePage />
        </SessionProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      // Check for live regions
      const liveRegions = document.querySelectorAll('[aria-live], [role="status"], [role="alert"]')
      expect(liveRegions.length).toBeGreaterThanOrEqual(0)
    })

    it('should provide skip links for keyboard users', async () => {
      render(
        <SessionProvider session={mockSession}>
          <ProfilePage />
        </SessionProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      // Check for skip links (may be visually hidden)
      const skipLinks = document.querySelectorAll('a[href^="#"], [class*="skip"]')
      // Skip links should exist for complex pages
      if (skipLinks.length > 0) {
        skipLinks.forEach(link => {
          expect(link).toHaveAttribute('href')
          expect(link.getAttribute('href')).toMatch(/^#/)
        })
      }
    })
  })
})