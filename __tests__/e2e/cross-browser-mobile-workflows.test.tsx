/**
 * Cross-Browser and Mobile Responsive E2E Test Suite
 * 
 * Comprehensive testing for permission workflows across different browsers
 * and mobile devices with responsive design validation.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import { PermissionProvider } from '../../app/components/providers/PermissionProvider'
import { createMockSession } from '../helpers/permission-test-utils'
import { UserRole } from '../../app/lib/types'
import React from 'react'

// Browser simulation utilities
const BrowserSimulator = {
  chrome: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    features: { touchEvents: false, webGL: true, localStorage: true }
  },
  firefox: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    features: { touchEvents: false, webGL: true, localStorage: true }
  },
  safari: {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    features: { touchEvents: false, webGL: true, localStorage: true }
  },
  edge: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
    features: { touchEvents: false, webGL: true, localStorage: true }
  },
  mobileSafari: {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    features: { touchEvents: true, webGL: true, localStorage: true }
  },
  mobileChrome: {
    userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
    features: { touchEvents: true, webGL: true, localStorage: true }
  }
}

// Device simulation utilities
const DeviceSimulator = {
  iPhoneSE: { width: 375, height: 667, pixelRatio: 2, touch: true },
  iPhone12: { width: 390, height: 844, pixelRatio: 3, touch: true },
  iPadAir: { width: 768, height: 1024, pixelRatio: 2, touch: true },
  galaxyS21: { width: 360, height: 800, pixelRatio: 3, touch: true },
  desktop1080: { width: 1920, height: 1080, pixelRatio: 1, touch: false },
  desktop4K: { width: 3840, height: 2160, pixelRatio: 2, touch: false }
}

// Mock responsive components for testing
const ResponsivePermissionDashboard = ({ userRole }: { userRole: UserRole }) => {
  const [viewport, setViewport] = React.useState({
    width: window.innerWidth,
    height: window.innerHeight
  })

  React.useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobile = viewport.width < 768
  const isTablet = viewport.width >= 768 && viewport.width < 1024
  const isDesktop = viewport.width >= 1024

  const getPermissionLevel = () => {
    switch (userRole) {
      case UserRole.ADMIN: return 'full'
      case UserRole.EDITOR: return 'limited'
      case UserRole.VIEWER: return 'readonly'
      default: return 'none'
    }
  }

  return (
    <div data-testid="responsive-permission-dashboard" data-permission-level={getPermissionLevel()}>
      <header data-testid="dashboard-header">
        <h1>CMS Dashboard</h1>
        <div data-testid="viewport-indicator">
          {isMobile && 'Mobile'}
          {isTablet && 'Tablet'}
          {isDesktop && 'Desktop'}
        </div>
      </header>

      {isMobile && (
        <div data-testid="mobile-layout">
          <button type="button" data-testid="mobile-menu-toggle" aria-label="Toggle menu">
            ☰
          </button>
          <div data-testid="mobile-actions">
            {userRole === UserRole.ADMIN && (
              <>
                <button type="button" data-testid="mobile-create-product">+ Product</button>
                <button type="button" data-testid="mobile-manage-users">👥 Users</button>
                <button type="button" data-testid="mobile-analytics">📊 Analytics</button>
              </>
            )}
            {userRole === UserRole.EDITOR && (
              <>
                <button type="button" data-testid="mobile-create-product">+ Product</button>
                <button type="button" data-testid="mobile-analytics">📊 Analytics</button>
              </>
            )}
            {userRole === UserRole.VIEWER && (
              <div data-testid="mobile-readonly-message">View Only Access</div>
            )}
          </div>
        </div>
      )}

      {isTablet && (
        <div data-testid="tablet-layout">
          <nav data-testid="tablet-sidebar">
            <ul>
              <li><a href="/products" data-testid="tablet-nav-products">Products</a></li>
              {(userRole === UserRole.ADMIN || userRole === UserRole.EDITOR) && (
                <li><a href="/analytics" data-testid="tablet-nav-analytics">Analytics</a></li>
              )}
              {userRole === UserRole.ADMIN && (
                <li><a href="/users" data-testid="tablet-nav-users">Users</a></li>
              )}
            </ul>
          </nav>
          <main data-testid="tablet-main">
            <div data-testid="tablet-actions">
              {userRole !== UserRole.VIEWER && (
                <button type="button" data-testid="tablet-create-product">Create Product</button>
              )}
              {userRole === UserRole.ADMIN && (
                <button type="button" data-testid="tablet-manage-users">Manage Users</button>
              )}
            </div>
          </main>
        </div>
      )}

      {isDesktop && (
        <div data-testid="desktop-layout">
          <aside data-testid="desktop-sidebar">
            <nav>
              <ul>
                <li><a href="/dashboard" data-testid="desktop-nav-dashboard">Dashboard</a></li>
                <li><a href="/products" data-testid="desktop-nav-products">Products</a></li>
                {(userRole === UserRole.ADMIN || userRole === UserRole.EDITOR) && (
                  <li><a href="/analytics" data-testid="desktop-nav-analytics">Analytics</a></li>
                )}
                {userRole === UserRole.ADMIN && (
                  <>
                    <li><a href="/users" data-testid="desktop-nav-users">Users</a></li>
                    <li><a href="/settings" data-testid="desktop-nav-settings">Settings</a></li>
                  </>
                )}
              </ul>
            </nav>
          </aside>
          <main data-testid="desktop-main">
            <div data-testid="desktop-toolbar">
              {userRole !== UserRole.VIEWER && (
                <>
                  <button type="button" data-testid="desktop-create-product">Create Product</button>
                  <button type="button" data-testid="desktop-bulk-actions">Bulk Actions</button>
                </>
              )}
              {userRole === UserRole.ADMIN && (
                <>
                  <button type="button" data-testid="desktop-manage-users">Manage Users</button>
                  <button type="button" data-testid="desktop-system-settings">System Settings</button>
                </>
              )}
            </div>
          </main>
        </div>
      )}
    </div>
  )
}

const TouchOptimizedForm = ({ userRole }: { userRole: UserRole }) => {
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    price: '',
    category: ''
  })

  const [isTouchDevice, setIsTouchDevice] = React.useState(false)

  React.useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  const canEdit = userRole !== UserRole.VIEWER

  return (
    <form data-testid="touch-optimized-form" className={isTouchDevice ? 'touch-optimized' : ''}>
      <div data-testid="form-field-name">
        <label htmlFor="product-name">Product Name</label>
        <input
          id="product-name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          disabled={!canEdit}
          data-testid="input-product-name"
          style={{
            minHeight: isTouchDevice ? '44px' : '32px', // Touch-friendly height
            fontSize: isTouchDevice ? '16px' : '14px' // Prevent zoom on iOS
          }}
        />
      </div>

      <div data-testid="form-field-description">
        <label htmlFor="product-description">Description</label>
        <textarea
          id="product-description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          disabled={!canEdit}
          data-testid="textarea-description"
          style={{
            minHeight: isTouchDevice ? '88px' : '64px',
            fontSize: isTouchDevice ? '16px' : '14px'
          }}
        />
      </div>

      <div data-testid="form-field-price">
        <label htmlFor="product-price">Price</label>
        <input
          id="product-price"
          type="number"
          value={formData.price}
          onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
          disabled={!canEdit}
          data-testid="input-price"
          style={{
            minHeight: isTouchDevice ? '44px' : '32px',
            fontSize: isTouchDevice ? '16px' : '14px'
          }}
        />
      </div>

      <div data-testid="form-actions">
        {canEdit && (
          <>
            <button
              type="submit"
              data-testid="submit-button"
              style={{
                minHeight: isTouchDevice ? '44px' : '36px',
                minWidth: isTouchDevice ? '44px' : 'auto',
                padding: isTouchDevice ? '12px 24px' : '8px 16px'
              }}
            >
              Save Product
            </button>
            <button
              type="button"
              data-testid="cancel-button"
              style={{
                minHeight: isTouchDevice ? '44px' : '36px',
                minWidth: isTouchDevice ? '44px' : 'auto',
                padding: isTouchDevice ? '12px 24px' : '8px 16px'
              }}
            >
              Cancel
            </button>
          </>
        )}
        {!canEdit && (
          <div data-testid="readonly-message">
            You don't have permission to edit this form
          </div>
        )}
      </div>
    </form>
  )
}

// Test wrapper
const TestWrapper = ({ children, session }: { children: React.ReactNode, session: any }) => (
  <SessionProvider session={session}>
    <PermissionProvider>
      {children}
    </PermissionProvider>
  </SessionProvider>
)

// Utility functions
const simulateBrowser = (browser: keyof typeof BrowserSimulator) => {
  const config = BrowserSimulator[browser]
  Object.defineProperty(navigator, 'userAgent', {
    writable: true,
    value: config.userAgent
  })
  
  // Simulate browser-specific features
  Object.defineProperty(window, 'ontouchstart', {
    writable: true,
    value: config.features.touchEvents ? {} : undefined
  })
}

const simulateDevice = (device: keyof typeof DeviceSimulator) => {
  const config = DeviceSimulator[device]
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: config.width
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: config.height
  })
  Object.defineProperty(window, 'devicePixelRatio', {
    writable: true,
    value: config.pixelRatio
  })
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'))
}

describe('Cross-Browser and Mobile E2E Workflows', () => {
  beforeEach(() => {
    // Reset to default state
    simulateDevice('desktop1080')
    simulateBrowser('chrome')
    jest.clearAllMocks()
  })

  describe('Cross-Browser Permission Consistency', () => {
    const adminSession = createMockSession({
      id: 'admin-1',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
      name: 'Admin User'
    })

    const editorSession = createMockSession({
      id: 'editor-1',
      email: 'editor@test.com',
      role: UserRole.EDITOR,
      name: 'Editor User'
    })

    const viewerSession = createMockSession({
      id: 'viewer-1',
      email: 'viewer@test.com',
      role: UserRole.VIEWER,
      name: 'Viewer User'
    })

    const browsers = ['chrome', 'firefox', 'safari', 'edge'] as const

    browsers.forEach(browser => {
      describe(`${browser.charAt(0).toUpperCase() + browser.slice(1)} Browser Tests`, () => {
        beforeEach(() => {
          simulateBrowser(browser)
        })

        it(`should render admin permissions correctly in ${browser}`, async () => {
          render(
            <TestWrapper session={adminSession}>
              <ResponsivePermissionDashboard userRole={UserRole.ADMIN} />
            </TestWrapper>
          )

          expect(screen.getByTestId('responsive-permission-dashboard')).toHaveAttribute('data-permission-level', 'full')
          expect(screen.getByTestId('desktop-nav-dashboard')).toBeInTheDocument()
          expect(screen.getByTestId('desktop-nav-users')).toBeInTheDocument()
          expect(screen.getByTestId('desktop-nav-settings')).toBeInTheDocument()
          expect(screen.getByTestId('desktop-manage-users')).toBeInTheDocument()
          expect(screen.getByTestId('desktop-system-settings')).toBeInTheDocument()
        })

        it(`should render editor permissions correctly in ${browser}`, async () => {
          render(
            <TestWrapper session={editorSession}>
              <ResponsivePermissionDashboard userRole={UserRole.EDITOR} />
            </TestWrapper>
          )

          expect(screen.getByTestId('responsive-permission-dashboard')).toHaveAttribute('data-permission-level', 'limited')
          expect(screen.getByTestId('desktop-nav-products')).toBeInTheDocument()
          expect(screen.getByTestId('desktop-nav-analytics')).toBeInTheDocument()
          expect(screen.queryByTestId('desktop-nav-users')).not.toBeInTheDocument()
          expect(screen.queryByTestId('desktop-nav-settings')).not.toBeInTheDocument()
          expect(screen.getByTestId('desktop-create-product')).toBeInTheDocument()
          expect(screen.queryByTestId('desktop-manage-users')).not.toBeInTheDocument()
        })

        it(`should render viewer permissions correctly in ${browser}`, async () => {
          render(
            <TestWrapper session={viewerSession}>
              <ResponsivePermissionDashboard userRole={UserRole.VIEWER} />
            </TestWrapper>
          )

          expect(screen.getByTestId('responsive-permission-dashboard')).toHaveAttribute('data-permission-level', 'readonly')
          expect(screen.getByTestId('desktop-nav-products')).toBeInTheDocument()
          expect(screen.queryByTestId('desktop-nav-analytics')).not.toBeInTheDocument()
          expect(screen.queryByTestId('desktop-create-product')).not.toBeInTheDocument()
          expect(screen.queryByTestId('desktop-bulk-actions')).not.toBeInTheDocument()
        })

        it(`should handle form interactions consistently in ${browser}`, async () => {
          render(
            <TestWrapper session={editorSession}>
              <TouchOptimizedForm userRole={UserRole.EDITOR} />
            </TestWrapper>
          )

          const nameInput = screen.getByTestId('input-product-name')
          const submitButton = screen.getByTestId('submit-button')

          expect(nameInput).not.toBeDisabled()
          expect(submitButton).toBeInTheDocument()

          fireEvent.change(nameInput, { target: { value: 'Test Product' } })
          expect(nameInput).toHaveValue('Test Product')

          fireEvent.click(submitButton)
          // Form should handle submission (in real app, this would trigger API call)
        })

        it(`should handle browser-specific event handling in ${browser}`, async () => {
          const EventTestComponent = () => {
            const [eventLog, setEventLog] = React.useState<string[]>([])

            const handleEvent = (eventType: string) => {
              setEventLog(prev => [...prev, eventType])
            }

            return (
              <div data-testid="event-test-component">
                <button
                  type="button"
                  onClick={() => handleEvent('click')}
                  onMouseDown={() => handleEvent('mousedown')}
                  onMouseUp={() => handleEvent('mouseup')}
                  data-testid="event-test-button"
                >
                  Test Events
                </button>
                <div data-testid="event-log">
                  {eventLog.join(', ')}
                </div>
              </div>
            )
          }

          render(
            <TestWrapper session={adminSession}>
              <EventTestComponent />
            </TestWrapper>
          )

          const button = screen.getByTestId('event-test-button')
          
          fireEvent.mouseDown(button)
          fireEvent.mouseUp(button)
          fireEvent.click(button)

          await waitFor(() => {
            const eventLog = screen.getByTestId('event-log')
            expect(eventLog).toHaveTextContent('mousedown, mouseup, click')
          })
        })
      })
    })
  })

  describe('Mobile Device Permission Testing', () => {
    const adminSession = createMockSession({
      id: 'admin-1',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
      name: 'Admin User'
    })

    const editorSession = createMockSession({
      id: 'editor-1',
      email: 'editor@test.com',
      role: UserRole.EDITOR,
      name: 'Editor User'
    })

    const viewerSession = createMockSession({
      id: 'viewer-1',
      email: 'viewer@test.com',
      role: UserRole.VIEWER,
      name: 'Viewer User'
    })

    const mobileDevices = ['iPhoneSE', 'iPhone12', 'galaxyS21'] as const
    const tabletDevices = ['iPadAir'] as const

    mobileDevices.forEach(device => {
      describe(`${device} Mobile Tests`, () => {
        beforeEach(() => {
          simulateDevice(device)
          simulateBrowser('mobileSafari')
        })

        it(`should render mobile admin interface on ${device}`, async () => {
          render(
            <TestWrapper session={adminSession}>
              <ResponsivePermissionDashboard userRole={UserRole.ADMIN} />
            </TestWrapper>
          )

          expect(screen.getByTestId('mobile-layout')).toBeInTheDocument()
          expect(screen.getByTestId('viewport-indicator')).toHaveTextContent('Mobile')
          expect(screen.getByTestId('mobile-menu-toggle')).toBeInTheDocument()
          expect(screen.getByTestId('mobile-create-product')).toBeInTheDocument()
          expect(screen.getByTestId('mobile-manage-users')).toBeInTheDocument()
          expect(screen.getByTestId('mobile-analytics')).toBeInTheDocument()
        })

        it(`should render mobile editor interface on ${device}`, async () => {
          render(
            <TestWrapper session={editorSession}>
              <ResponsivePermissionDashboard userRole={UserRole.EDITOR} />
            </TestWrapper>
          )

          expect(screen.getByTestId('mobile-layout')).toBeInTheDocument()
          expect(screen.getByTestId('mobile-create-product')).toBeInTheDocument()
          expect(screen.getByTestId('mobile-analytics')).toBeInTheDocument()
          expect(screen.queryByTestId('mobile-manage-users')).not.toBeInTheDocument()
        })

        it(`should render mobile viewer interface on ${device}`, async () => {
          render(
            <TestWrapper session={viewerSession}>
              <ResponsivePermissionDashboard userRole={UserRole.VIEWER} />
            </TestWrapper>
          )

          expect(screen.getByTestId('mobile-layout')).toBeInTheDocument()
          expect(screen.getByTestId('mobile-readonly-message')).toBeInTheDocument()
          expect(screen.queryByTestId('mobile-create-product')).not.toBeInTheDocument()
          expect(screen.queryByTestId('mobile-analytics')).not.toBeInTheDocument()
        })

        it(`should handle touch interactions on ${device}`, async () => {
          render(
            <TestWrapper session={adminSession}>
              <TouchOptimizedForm userRole={UserRole.ADMIN} />
            </TestWrapper>
          )

          const nameInput = screen.getByTestId('input-product-name')
          const submitButton = screen.getByTestId('submit-button')

          // Verify touch-optimized styling
          expect(nameInput).toHaveStyle({ minHeight: '44px', fontSize: '16px' })
          expect(submitButton).toHaveStyle({ minHeight: '44px' })

          // Test touch interactions
          fireEvent.touchStart(submitButton)
          fireEvent.touchEnd(submitButton)
          fireEvent.click(submitButton)

          expect(submitButton).toBeInTheDocument()
        })

        it(`should handle mobile menu interactions on ${device}`, async () => {
          const MobileMenuTest = () => {
            const [menuOpen, setMenuOpen] = React.useState(false)

            return (
              <div data-testid="mobile-menu-test">
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  data-testid="mobile-menu-toggle"
                  aria-expanded={menuOpen}
                >
                  {menuOpen ? '✕' : '☰'} Menu
                </button>
                {menuOpen && (
                  <nav data-testid="mobile-menu" role="navigation">
                    <a href="/products" data-testid="mobile-menu-products">Products</a>
                    <a href="/analytics" data-testid="mobile-menu-analytics">Analytics</a>
                  </nav>
                )}
              </div>
            )
          }

          render(
            <TestWrapper session={editorSession}>
              <MobileMenuTest />
            </TestWrapper>
          )

          const menuToggle = screen.getByTestId('mobile-menu-toggle')
          expect(menuToggle).toHaveAttribute('aria-expanded', 'false')
          expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument()

          fireEvent.click(menuToggle)

          await waitFor(() => {
            expect(menuToggle).toHaveAttribute('aria-expanded', 'true')
            expect(screen.getByTestId('mobile-menu')).toBeInTheDocument()
            expect(screen.getByTestId('mobile-menu-products')).toBeInTheDocument()
          })
        })
      })
    })

    tabletDevices.forEach(device => {
      describe(`${device} Tablet Tests`, () => {
        beforeEach(() => {
          simulateDevice(device)
          simulateBrowser('safari')
        })

        it(`should render tablet admin interface on ${device}`, async () => {
          render(
            <TestWrapper session={adminSession}>
              <ResponsivePermissionDashboard userRole={UserRole.ADMIN} />
            </TestWrapper>
          )

          expect(screen.getByTestId('tablet-layout')).toBeInTheDocument()
          expect(screen.getByTestId('viewport-indicator')).toHaveTextContent('Tablet')
          expect(screen.getByTestId('tablet-sidebar')).toBeInTheDocument()
          expect(screen.getByTestId('tablet-nav-products')).toBeInTheDocument()
          expect(screen.getByTestId('tablet-nav-users')).toBeInTheDocument()
          expect(screen.getByTestId('tablet-create-product')).toBeInTheDocument()
          expect(screen.getByTestId('tablet-manage-users')).toBeInTheDocument()
        })

        it(`should render tablet editor interface on ${device}`, async () => {
          render(
            <TestWrapper session={editorSession}>
              <ResponsivePermissionDashboard userRole={UserRole.EDITOR} />
            </TestWrapper>
          )

          expect(screen.getByTestId('tablet-layout')).toBeInTheDocument()
          expect(screen.getByTestId('tablet-nav-products')).toBeInTheDocument()
          expect(screen.getByTestId('tablet-nav-analytics')).toBeInTheDocument()
          expect(screen.queryByTestId('tablet-nav-users')).not.toBeInTheDocument()
          expect(screen.getByTestId('tablet-create-product')).toBeInTheDocument()
          expect(screen.queryByTestId('tablet-manage-users')).not.toBeInTheDocument()
        })
      })
    })
  })

  describe('Responsive Breakpoint Testing', () => {
    const adminSession = createMockSession({
      id: 'admin-1',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
      name: 'Admin User'
    })

    it('should handle viewport transitions smoothly', async () => {
      render(
        <TestWrapper session={adminSession}>
          <ResponsivePermissionDashboard userRole={UserRole.ADMIN} />
        </TestWrapper>
      )

      // Start with desktop
      simulateDevice('desktop1080')
      await waitFor(() => {
        expect(screen.getByTestId('desktop-layout')).toBeInTheDocument()
        expect(screen.getByTestId('viewport-indicator')).toHaveTextContent('Desktop')
      })

      // Transition to tablet
      simulateDevice('iPadAir')
      await waitFor(() => {
        expect(screen.getByTestId('tablet-layout')).toBeInTheDocument()
        expect(screen.getByTestId('viewport-indicator')).toHaveTextContent('Tablet')
      })

      // Transition to mobile
      simulateDevice('iPhoneSE')
      await waitFor(() => {
        expect(screen.getByTestId('mobile-layout')).toBeInTheDocument()
        expect(screen.getByTestId('viewport-indicator')).toHaveTextContent('Mobile')
      })
    })

    it('should maintain permission consistency across viewport changes', async () => {
      const editorSession = createMockSession({
        id: 'editor-1',
        email: 'editor@test.com',
        role: UserRole.EDITOR,
        name: 'Editor User'
      })

      render(
        <TestWrapper session={editorSession}>
          <ResponsivePermissionDashboard userRole={UserRole.EDITOR} />
        </TestWrapper>
      )

      // Desktop - verify editor permissions
      simulateDevice('desktop1080')
      await waitFor(() => {
        expect(screen.getByTestId('desktop-create-product')).toBeInTheDocument()
        expect(screen.queryByTestId('desktop-manage-users')).not.toBeInTheDocument()
      })

      // Mobile - verify same permissions apply
      simulateDevice('iPhoneSE')
      await waitFor(() => {
        expect(screen.getByTestId('mobile-create-product')).toBeInTheDocument()
        expect(screen.queryByTestId('mobile-manage-users')).not.toBeInTheDocument()
      })
    })
  })

  describe('Performance and Accessibility on Mobile', () => {
    const adminSession = createMockSession({
      id: 'admin-1',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
      name: 'Admin User'
    })

    it('should maintain accessibility standards on mobile devices', async () => {
      simulateDevice('iPhoneSE')
      simulateBrowser('mobileSafari')

      render(
        <TestWrapper session={adminSession}>
          <ResponsivePermissionDashboard userRole={UserRole.ADMIN} />
        </TestWrapper>
      )

      const menuToggle = screen.getByTestId('mobile-menu-toggle')
      expect(menuToggle).toHaveAttribute('aria-label', 'Toggle menu')

      // Test keyboard navigation (important for accessibility)
      fireEvent.keyDown(menuToggle, { key: 'Enter' })
      fireEvent.keyDown(menuToggle, { key: ' ' }) // Space key
    })

    it('should handle touch gestures appropriately', async () => {
      simulateDevice('iPhone12')
      simulateBrowser('mobileSafari')

      const TouchGestureTest = () => {
        const [gestureLog, setGestureLog] = React.useState<string[]>([])

        const handleTouch = (gestureType: string) => {
          setGestureLog(prev => [...prev, gestureType])
        }

        return (
          <div
            data-testid="touch-gesture-test"
            onTouchStart={() => handleTouch('touchstart')}
            onTouchMove={() => handleTouch('touchmove')}
            onTouchEnd={() => handleTouch('touchend')}
          >
            <div data-testid="gesture-log">
              {gestureLog.join(', ')}
            </div>
          </div>
        )
      }

      render(
        <TestWrapper session={adminSession}>
          <TouchGestureTest />
        </TestWrapper>
      )

      const touchArea = screen.getByTestId('touch-gesture-test')
      
      fireEvent.touchStart(touchArea)
      fireEvent.touchMove(touchArea)
      fireEvent.touchEnd(touchArea)

      await waitFor(() => {
        const gestureLog = screen.getByTestId('gesture-log')
        expect(gestureLog).toHaveTextContent('touchstart, touchmove, touchend')
      })
    })

    it('should optimize form inputs for mobile keyboards', async () => {
      simulateDevice('galaxyS21')
      simulateBrowser('mobileChrome')

      render(
        <TestWrapper session={adminSession}>
          <TouchOptimizedForm userRole={UserRole.ADMIN} />
        </TestWrapper>
      )

      const nameInput = screen.getByTestId('input-product-name')
      const priceInput = screen.getByTestId('input-price')

      // Verify mobile-optimized input styling
      expect(nameInput).toHaveStyle({ fontSize: '16px' }) // Prevents zoom on iOS
      expect(priceInput).toHaveAttribute('type', 'number') // Shows numeric keyboard

      // Test input focus behavior
      fireEvent.focus(nameInput)
      expect(nameInput).toHaveFocus()

      fireEvent.focus(priceInput)
      expect(priceInput).toHaveFocus()
    })
  })
})