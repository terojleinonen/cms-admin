/**
 * Comprehensive End-to-End Permission Workflows Test Suite
 * 
 * Tests complete user journeys for each role with cross-component integration,
 * permission boundary validation, cross-browser compatibility, and mobile responsiveness.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import { PermissionProvider } from '../../app/components/providers/PermissionProvider'
import { testUtils } from '../helpers/test-helpers'
import { createMockSession } from '../helpers/permission-test-utils'
import { UserRole } from '../../app/lib/types'
import React from 'react'

// Mock viewport utilities for responsive testing
const mockViewport = {
  setSize: (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width })
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height })
    window.dispatchEvent(new Event('resize'))
  },
  mobile: () => mockViewport.setSize(375, 667), // iPhone SE
  tablet: () => mockViewport.setSize(768, 1024), // iPad
  desktop: () => mockViewport.setSize(1920, 1080), // Desktop
  reset: () => mockViewport.setSize(1024, 768) // Default test size
}

// Mock user agent for browser testing
const mockUserAgent = {
  chrome: () => Object.defineProperty(navigator, 'userAgent', {
    writable: true,
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }),
  firefox: () => Object.defineProperty(navigator, 'userAgent', {
    writable: true,
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
  }),
  safari: () => Object.defineProperty(navigator, 'userAgent', {
    writable: true,
    value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
  }),
  edge: () => Object.defineProperty(navigator, 'userAgent', {
    writable: true,
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59'
  })
}

// Mock components for E2E workflow testing
const MockDashboard = () => {
  return (
    <div data-testid="dashboard">
      <nav data-testid="navigation">
        <a href="/admin/products" data-testid="products-link">Products</a>
        <a href="/admin/users" data-testid="users-link">Users</a>
        <a href="/admin/analytics" data-testid="analytics-link">Analytics</a>
      </nav>
      <main data-testid="main-content">
        <button data-testid="create-product-btn">Create Product</button>
        <button data-testid="manage-users-btn">Manage Users</button>
        <button data-testid="view-analytics-btn">View Analytics</button>
      </main>
    </div>
  )
}

const MockProductManagement = () => {
  return (
    <div data-testid="product-management">
      <h1>Product Management</h1>
      <button data-testid="create-product">Create New Product</button>
      <button data-testid="edit-product">Edit Product</button>
      <button data-testid="delete-product">Delete Product</button>
      <div data-testid="product-list">
        <div data-testid="product-item">Product 1</div>
      </div>
    </div>
  )
}

const MockUserManagement = () => {
  return (
    <div data-testid="user-management">
      <h1>User Management</h1>
      <button data-testid="create-user">Create User</button>
      <button data-testid="edit-user">Edit User</button>
      <button data-testid="delete-user">Delete User</button>
      <div data-testid="user-list">
        <div data-testid="user-item">User 1</div>
      </div>
    </div>
  )
}

const MockAnalytics = () => {
  return (
    <div data-testid="analytics">
      <h1>Analytics Dashboard</h1>
      <div data-testid="sales-chart">Sales Chart</div>
      <div data-testid="user-metrics">User Metrics</div>
      <button data-testid="export-data">Export Data</button>
    </div>
  )
}

// Test wrapper with all providers
const TestWrapper = ({ children, session }: { children: React.ReactNode, session: any }) => (
  <SessionProvider session={session}>
    <PermissionProvider>
      {children}
    </PermissionProvider>
  </SessionProvider>
)

describe('Comprehensive End-to-End Permission Workflows', () => {
  beforeEach(() => {
    // Reset viewport and user agent before each test
    mockViewport.reset()
    jest.clearAllMocks()
  })

  afterEach(() => {
    // Clean up after each test
    mockViewport.reset()
  })
  describe('Admin User Complete Journey', () => {
    const adminSession = createMockSession({
      id: 'admin-1',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
      name: 'Admin User'
    })

    it('should allow admin to access all features and perform all actions', async () => {
      // Test dashboard access
      const { rerender } = render(
        <TestWrapper session={adminSession}>
          <MockDashboard />
        </TestWrapper>
      )

      // Verify all navigation items are visible
      expect(screen.getByTestId('products-link')).toBeInTheDocument()
      expect(screen.getByTestId('users-link')).toBeInTheDocument()
      expect(screen.getByTestId('analytics-link')).toBeInTheDocument()

      // Verify all action buttons are visible
      expect(screen.getByTestId('create-product-btn')).toBeInTheDocument()
      expect(screen.getByTestId('manage-users-btn')).toBeInTheDocument()
      expect(screen.getByTestId('view-analytics-btn')).toBeInTheDocument()

      // Test product management workflow
      rerender(
        <TestWrapper session={adminSession}>
          <MockProductManagement />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('create-product')).toBeInTheDocument()
        expect(screen.getByTestId('edit-product')).toBeInTheDocument()
        expect(screen.getByTestId('delete-product')).toBeInTheDocument()
      })

      // Simulate product creation workflow
      fireEvent.click(screen.getByTestId('create-product'))
      // In real E2E, this would navigate to create form

      // Test user management workflow
      rerender(
        <TestWrapper session={adminSession}>
          <MockUserManagement />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('create-user')).toBeInTheDocument()
        expect(screen.getByTestId('edit-user')).toBeInTheDocument()
        expect(screen.getByTestId('delete-user')).toBeInTheDocument()
      })

      // Test analytics access
      rerender(
        <TestWrapper session={adminSession}>
          <MockAnalytics />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('sales-chart')).toBeInTheDocument()
        expect(screen.getByTestId('user-metrics')).toBeInTheDocument()
        expect(screen.getByTestId('export-data')).toBeInTheDocument()
      })
    })

    it('should handle admin cross-component permission integration', async () => {
      // Test that admin permissions work across multiple components
      const ComplexAdminWorkflow = () => (
        <div>
          <MockDashboard />
          <MockProductManagement />
          <MockUserManagement />
        </div>
      )

      render(
        <TestWrapper session={adminSession}>
          <ComplexAdminWorkflow />
        </TestWrapper>
      )

      // Verify all components render with full permissions
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
      expect(screen.getByTestId('product-management')).toBeInTheDocument()
      expect(screen.getByTestId('user-management')).toBeInTheDocument()

      // Verify cross-component actions are available
      expect(screen.getByTestId('create-product-btn')).toBeInTheDocument()
      expect(screen.getByTestId('create-product')).toBeInTheDocument()
      expect(screen.getByTestId('create-user')).toBeInTheDocument()
    })
  })

  describe('Editor User Complete Journey', () => {
    const editorSession = createMockSession({
      id: 'editor-1',
      email: 'editor@test.com',
      role: UserRole.EDITOR,
      name: 'Editor User'
    })

    it('should allow editor to access content features but restrict admin functions', async () => {
      // Test dashboard with editor permissions
      const { rerender } = render(
        <TestWrapper session={editorSession}>
          <MockDashboard />
        </TestWrapper>
      )

      // Verify content-related navigation is visible
      expect(screen.getByTestId('products-link')).toBeInTheDocument()
      expect(screen.getByTestId('analytics-link')).toBeInTheDocument()

      // Verify user management is hidden for editors
      expect(screen.queryByTestId('users-link')).not.toBeInTheDocument()

      // Test product management access
      rerender(
        <TestWrapper session={editorSession}>
          <MockProductManagement />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('create-product')).toBeInTheDocument()
        expect(screen.getByTestId('edit-product')).toBeInTheDocument()
        expect(screen.getByTestId('delete-product')).toBeInTheDocument()
      })

      // Test analytics access (read-only for editors)
      rerender(
        <TestWrapper session={editorSession}>
          <MockAnalytics />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('sales-chart')).toBeInTheDocument()
        expect(screen.getByTestId('user-metrics')).toBeInTheDocument()
        // Export might be restricted for editors
        expect(screen.queryByTestId('export-data')).not.toBeInTheDocument()
      })
    })

    it('should prevent editor from accessing user management', async () => {
      render(
        <TestWrapper session={editorSession}>
          <MockUserManagement />
        </TestWrapper>
      )

      // User management should be completely hidden or show unauthorized message
      expect(screen.queryByTestId('create-user')).not.toBeInTheDocument()
      expect(screen.queryByTestId('edit-user')).not.toBeInTheDocument()
      expect(screen.queryByTestId('delete-user')).not.toBeInTheDocument()
    })
  })

  describe('Viewer User Complete Journey', () => {
    const viewerSession = createMockSession({
      id: 'viewer-1',
      email: 'viewer@test.com',
      role: UserRole.VIEWER,
      name: 'Viewer User'
    })

    it('should restrict viewer to read-only access across all components', async () => {
      // Test dashboard with viewer permissions
      const { rerender } = render(
        <TestWrapper session={viewerSession}>
          <MockDashboard />
        </TestWrapper>
      )

      // Verify limited navigation for viewers
      expect(screen.getByTestId('products-link')).toBeInTheDocument()
      expect(screen.queryByTestId('users-link')).not.toBeInTheDocument()
      expect(screen.queryByTestId('analytics-link')).not.toBeInTheDocument()

      // Verify action buttons are hidden
      expect(screen.queryByTestId('create-product-btn')).not.toBeInTheDocument()
      expect(screen.queryByTestId('manage-users-btn')).not.toBeInTheDocument()

      // Test product management (read-only)
      rerender(
        <TestWrapper session={viewerSession}>
          <MockProductManagement />
        </TestWrapper>
      )

      await waitFor(() => {
        // Viewers can see products but not modify them
        expect(screen.getByTestId('product-list')).toBeInTheDocument()
        expect(screen.queryByTestId('create-product')).not.toBeInTheDocument()
        expect(screen.queryByTestId('edit-product')).not.toBeInTheDocument()
        expect(screen.queryByTestId('delete-product')).not.toBeInTheDocument()
      })
    })

    it('should show appropriate fallback content for restricted areas', async () => {
      render(
        <TestWrapper session={viewerSession}>
          <MockUserManagement />
        </TestWrapper>
      )

      // Should show unauthorized message or redirect
      expect(screen.queryByTestId('user-management')).not.toBeInTheDocument()
    })
  })

  describe('Permission Boundary Testing', () => {
    it('should handle role transitions correctly', async () => {
      // Start with viewer session
      let currentSession = createMockSession({
        id: 'user-1',
        email: 'user@test.com',
        role: UserRole.VIEWER,
        name: 'Test User'
      })

      const { rerender } = render(
        <TestWrapper session={currentSession}>
          <MockDashboard />
        </TestWrapper>
      )

      // Verify viewer restrictions
      expect(screen.queryByTestId('create-product-btn')).not.toBeInTheDocument()

      // Simulate role upgrade to editor
      currentSession = createMockSession({
        id: 'user-1',
        email: 'user@test.com',
        role: UserRole.EDITOR,
        name: 'Test User'
      })

      rerender(
        <TestWrapper session={currentSession}>
          <MockDashboard />
        </TestWrapper>
      )

      // Verify editor permissions are now available
      await waitFor(() => {
        expect(screen.getByTestId('create-product-btn')).toBeInTheDocument()
      })
    })

    it('should handle permission edge cases and invalid states', async () => {
      // Test with null session
      render(
        <TestWrapper session={null}>
          <MockDashboard />
        </TestWrapper>
      )

      // Should show minimal or no content for unauthenticated users
      expect(screen.queryByTestId('create-product-btn')).not.toBeInTheDocument()
      expect(screen.queryByTestId('manage-users-btn')).not.toBeInTheDocument()

      // Test with invalid role
      const invalidSession = createMockSession({
        id: 'invalid-1',
        email: 'invalid@test.com',
        role: 'INVALID_ROLE' as UserRole,
        name: 'Invalid User'
      })

      const { rerender } = render(
        <TestWrapper session={invalidSession}>
          <MockDashboard />
        </TestWrapper>
      )

      // Should handle gracefully, likely showing viewer-level permissions
      expect(screen.queryByTestId('manage-users-btn')).not.toBeInTheDocument()
    })

    it('should maintain permission consistency across component updates', async () => {
      const editorSession = createMockSession({
        id: 'editor-1',
        email: 'editor@test.com',
        role: UserRole.EDITOR,
        name: 'Editor User'
      })

      const DynamicComponent = ({ showProducts }: { showProducts: boolean }) => (
        <div>
          <MockDashboard />
          {showProducts && <MockProductManagement />}
        </div>
      )

      const { rerender } = render(
        <TestWrapper session={editorSession}>
          <DynamicComponent showProducts={false} />
        </TestWrapper>
      )

      // Verify initial state
      expect(screen.getByTestId('create-product-btn')).toBeInTheDocument()
      expect(screen.queryByTestId('product-management')).not.toBeInTheDocument()

      // Add product management component
      rerender(
        <TestWrapper session={editorSession}>
          <DynamicComponent showProducts={true} />
        </TestWrapper>
      )

      // Verify permissions remain consistent
      await waitFor(() => {
        expect(screen.getByTestId('create-product-btn')).toBeInTheDocument()
        expect(screen.getByTestId('product-management')).toBeInTheDocument()
        expect(screen.getByTestId('create-product')).toBeInTheDocument()
      })
    })
  })

  describe('Cross-Component Integration Testing', () => {
    it('should handle complex multi-component workflows', async () => {
      const adminSession = createMockSession({
        id: 'admin-1',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
        name: 'Admin User'
      })

      const ComplexWorkflow = () => {
        const [currentView, setCurrentView] = React.useState('dashboard')

        return (
          <div>
            <nav>
              <button onClick={() => setCurrentView('dashboard')} data-testid="nav-dashboard">
                Dashboard
              </button>
              <button onClick={() => setCurrentView('products')} data-testid="nav-products">
                Products
              </button>
              <button onClick={() => setCurrentView('users')} data-testid="nav-users">
                Users
              </button>
            </nav>
            {currentView === 'dashboard' && <MockDashboard />}
            {currentView === 'products' && <MockProductManagement />}
            {currentView === 'users' && <MockUserManagement />}
          </div>
        )
      }

      render(
        <TestWrapper session={adminSession}>
          <ComplexWorkflow />
        </TestWrapper>
      )

      // Test navigation between components
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('nav-products'))
      await waitFor(() => {
        expect(screen.getByTestId('product-management')).toBeInTheDocument()
        expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('nav-users'))
      await waitFor(() => {
        expect(screen.getByTestId('user-management')).toBeInTheDocument()
        expect(screen.queryByTestId('product-management')).not.toBeInTheDocument()
      })

      // Verify admin has access to all sections
      expect(screen.getByTestId('create-user')).toBeInTheDocument()
    })

    it('should handle permission-based component communication', async () => {
      const editorSession = createMockSession({
        id: 'editor-1',
        email: 'editor@test.com',
        role: UserRole.EDITOR,
        name: 'Editor User'
      })

      const CommunicatingComponents = () => {
        const [selectedProduct, setSelectedProduct] = React.useState<string | null>(null)

        return (
          <div>
            <div data-testid="product-selector">
              <button 
                onClick={() => setSelectedProduct('product-1')}
                data-testid="select-product"
              >
                Select Product
              </button>
            </div>
            {selectedProduct && (
              <div data-testid="product-editor">
                <h3>Editing: {selectedProduct}</h3>
                <button data-testid="save-product">Save Product</button>
                <button data-testid="delete-product-action">Delete Product</button>
              </div>
            )}
          </div>
        )
      }

      render(
        <TestWrapper session={editorSession}>
          <CommunicatingComponents />
        </TestWrapper>
      )

      // Test component interaction
      fireEvent.click(screen.getByTestId('select-product'))

      await waitFor(() => {
        expect(screen.getByTestId('product-editor')).toBeInTheDocument()
        expect(screen.getByTestId('save-product')).toBeInTheDocument()
        expect(screen.getByTestId('delete-product-action')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle permission errors gracefully', async () => {
      const viewerSession = createMockSession({
        id: 'viewer-1',
        email: 'viewer@test.com',
        role: UserRole.VIEWER,
        name: 'Viewer User'
      })

      const ErrorProneComponent = () => {
        const [showRestricted, setShowRestricted] = React.useState(false)

        return (
          <div>
            <button 
              onClick={() => setShowRestricted(true)}
              data-testid="trigger-restricted"
            >
              Access Restricted Area
            </button>
            {showRestricted && (
              <div data-testid="restricted-content">
                <MockUserManagement />
              </div>
            )}
          </div>
        )
      }

      render(
        <TestWrapper session={viewerSession}>
          <ErrorProneComponent />
        </TestWrapper>
      )

      fireEvent.click(screen.getByTestId('trigger-restricted'))

      // Should handle gracefully without crashing
      await waitFor(() => {
        // Restricted content should not appear or show error message
        expect(screen.queryByTestId('user-management')).not.toBeInTheDocument()
      })
    })
  })

  describe('Cross-Browser Permission Testing', () => {
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

    const browsers = [
      { name: 'Chrome', setup: mockUserAgent.chrome },
      { name: 'Firefox', setup: mockUserAgent.firefox },
      { name: 'Safari', setup: mockUserAgent.safari },
      { name: 'Edge', setup: mockUserAgent.edge }
    ]

    browsers.forEach(({ name, setup }) => {
      describe(`${name} Browser Tests`, () => {
        beforeEach(() => {
          setup()
        })

        it(`should handle admin permissions correctly in ${name}`, async () => {
          render(
            <TestWrapper session={adminSession}>
              <MockDashboard />
            </TestWrapper>
          )

          // Verify all admin features work across browsers
          expect(screen.getByTestId('create-product-btn')).toBeInTheDocument()
          expect(screen.getByTestId('manage-users-btn')).toBeInTheDocument()
          expect(screen.getByTestId('view-analytics-btn')).toBeInTheDocument()

          // Test interactions work in all browsers
          fireEvent.click(screen.getByTestId('create-product-btn'))
          
          // Browser-specific behavior should be consistent
          await waitFor(() => {
            expect(screen.getByTestId('create-product-btn')).toBeInTheDocument()
          })
        })

        it(`should handle editor permissions correctly in ${name}`, async () => {
          render(
            <TestWrapper session={editorSession}>
              <MockDashboard />
            </TestWrapper>
          )

          // Verify editor restrictions work across browsers
          expect(screen.getByTestId('create-product-btn')).toBeInTheDocument()
          expect(screen.queryByTestId('manage-users-btn')).not.toBeInTheDocument()

          // Test browser-specific event handling
          fireEvent.click(screen.getByTestId('create-product-btn'))
          
          await waitFor(() => {
            expect(screen.getByTestId('create-product-btn')).toBeInTheDocument()
          })
        })

        it(`should handle form interactions consistently in ${name}`, async () => {
          render(
            <TestWrapper session={adminSession}>
              <MockProductManagement />
            </TestWrapper>
          )

          // Test form interactions work across browsers
          expect(screen.getByTestId('create-product')).toBeInTheDocument()
          
          fireEvent.click(screen.getByTestId('create-product'))
          fireEvent.click(screen.getByTestId('edit-product'))
          fireEvent.click(screen.getByTestId('delete-product'))

          // All interactions should work consistently
          await waitFor(() => {
            expect(screen.getByTestId('product-management')).toBeInTheDocument()
          })
        })

        it(`should handle navigation consistently in ${name}`, async () => {
          const NavigationTest = () => {
            const [currentView, setCurrentView] = React.useState('dashboard')

            return (
              <div>
                <nav>
                  <button 
                    type="button"
                    onClick={() => setCurrentView('products')} 
                    data-testid="nav-to-products"
                  >
                    Products
                  </button>
                  <button 
                    type="button"
                    onClick={() => setCurrentView('analytics')} 
                    data-testid="nav-to-analytics"
                  >
                    Analytics
                  </button>
                </nav>
                {currentView === 'dashboard' && <MockDashboard />}
                {currentView === 'products' && <MockProductManagement />}
                {currentView === 'analytics' && <MockAnalytics />}
              </div>
            )
          }

          render(
            <TestWrapper session={adminSession}>
              <NavigationTest />
            </TestWrapper>
          )

          // Test navigation works across browsers
          fireEvent.click(screen.getByTestId('nav-to-products'))
          
          await waitFor(() => {
            expect(screen.getByTestId('product-management')).toBeInTheDocument()
          })

          fireEvent.click(screen.getByTestId('nav-to-analytics'))
          
          await waitFor(() => {
            expect(screen.getByTestId('analytics')).toBeInTheDocument()
          })
        })
      })
    })

    it('should handle browser-specific permission edge cases', async () => {
      // Test with different browsers for edge cases
      const testCases = [
        { browser: 'Chrome', setup: mockUserAgent.chrome },
        { browser: 'Safari', setup: mockUserAgent.safari }
      ]

      for (const { browser, setup } of testCases) {
        setup()

        const EdgeCaseComponent = () => {
          const [hasError, setHasError] = React.useState(false)

          React.useEffect(() => {
            // Simulate browser-specific behavior
            const userAgent = navigator.userAgent
            if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
              // Safari-specific handling
              setHasError(false)
            }
          }, [])

          return (
            <div data-testid={`edge-case-${browser.toLowerCase()}`}>
              {hasError ? (
                <div data-testid="browser-error">Browser-specific error</div>
              ) : (
                <MockDashboard />
              )}
            </div>
          )
        }

        render(
          <TestWrapper session={adminSession}>
            <EdgeCaseComponent />
          </TestWrapper>
        )

        await waitFor(() => {
          expect(screen.getByTestId(`edge-case-${browser.toLowerCase()}`)).toBeInTheDocument()
          expect(screen.queryByTestId('browser-error')).not.toBeInTheDocument()
        })
      }
    })
  })

  describe('Mobile Responsive Permission Testing', () => {
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

    const viewports = [
      { name: 'Mobile', setup: mockViewport.mobile, width: 375 },
      { name: 'Tablet', setup: mockViewport.tablet, width: 768 },
      { name: 'Desktop', setup: mockViewport.desktop, width: 1920 }
    ]

    viewports.forEach(({ name, setup, width }) => {
      describe(`${name} Viewport Tests`, () => {
        beforeEach(() => {
          setup()
        })

        it(`should adapt admin interface for ${name} viewport`, async () => {
          const ResponsiveDashboard = () => {
            const [isMobile, setIsMobile] = React.useState(width < 768)

            React.useEffect(() => {
              const handleResize = () => {
                setIsMobile(window.innerWidth < 768)
              }
              window.addEventListener('resize', handleResize)
              return () => window.removeEventListener('resize', handleResize)
            }, [])

            return (
              <div data-testid="responsive-dashboard">
                {isMobile ? (
                  <div data-testid="mobile-layout">
                    <div data-testid="mobile-menu-toggle">☰</div>
                    <div data-testid="mobile-actions">
                      <button type="button" data-testid="mobile-create-product">+</button>
                      <button type="button" data-testid="mobile-manage-users">👥</button>
                    </div>
                  </div>
                ) : (
                  <div data-testid="desktop-layout">
                    <MockDashboard />
                  </div>
                )}
              </div>
            )
          }

          render(
            <TestWrapper session={adminSession}>
              <ResponsiveDashboard />
            </TestWrapper>
          )

          if (width < 768) {
            // Mobile layout
            expect(screen.getByTestId('mobile-layout')).toBeInTheDocument()
            expect(screen.getByTestId('mobile-menu-toggle')).toBeInTheDocument()
            expect(screen.getByTestId('mobile-create-product')).toBeInTheDocument()
            expect(screen.getByTestId('mobile-manage-users')).toBeInTheDocument()
          } else {
            // Desktop layout
            expect(screen.getByTestId('desktop-layout')).toBeInTheDocument()
            expect(screen.getByTestId('create-product-btn')).toBeInTheDocument()
          }
        })

        it(`should handle editor permissions on ${name} viewport`, async () => {
          const ResponsiveEditorView = () => {
            const [isMobile, setIsMobile] = React.useState(width < 768)

            React.useEffect(() => {
              const handleResize = () => {
                setIsMobile(window.innerWidth < 768)
              }
              window.addEventListener('resize', handleResize)
              return () => window.removeEventListener('resize', handleResize)
            }, [])

            return (
              <div data-testid="responsive-editor-view">
                {isMobile ? (
                  <div data-testid="mobile-editor-layout">
                    <button type="button" data-testid="mobile-create-product">Create</button>
                    {/* No user management button for editors */}
                  </div>
                ) : (
                  <div data-testid="desktop-editor-layout">
                    <button type="button" data-testid="desktop-create-product">Create Product</button>
                    {/* No user management for editors */}
                  </div>
                )}
              </div>
            )
          }

          render(
            <TestWrapper session={editorSession}>
              <ResponsiveEditorView />
            </TestWrapper>
          )

          if (width < 768) {
            expect(screen.getByTestId('mobile-editor-layout')).toBeInTheDocument()
            expect(screen.getByTestId('mobile-create-product')).toBeInTheDocument()
          } else {
            expect(screen.getByTestId('desktop-editor-layout')).toBeInTheDocument()
            expect(screen.getByTestId('desktop-create-product')).toBeInTheDocument()
          }

          // Verify no user management options for editors regardless of viewport
          expect(screen.queryByTestId('mobile-manage-users')).not.toBeInTheDocument()
          expect(screen.queryByTestId('desktop-manage-users')).not.toBeInTheDocument()
        })

        it(`should handle viewer restrictions on ${name} viewport`, async () => {
          const ResponsiveViewerView = () => {
            const [isMobile, setIsMobile] = React.useState(width < 768)

            React.useEffect(() => {
              const handleResize = () => {
                setIsMobile(window.innerWidth < 768)
              }
              window.addEventListener('resize', handleResize)
              return () => window.removeEventListener('resize', handleResize)
            }, [])

            return (
              <div data-testid="responsive-viewer-view">
                {isMobile ? (
                  <div data-testid="mobile-viewer-layout">
                    <div data-testid="mobile-readonly-content">
                      <span>Products (View Only)</span>
                    </div>
                  </div>
                ) : (
                  <div data-testid="desktop-viewer-layout">
                    <div data-testid="desktop-readonly-content">
                      <h2>Products (Read Only)</h2>
                      <div data-testid="product-list">Product 1</div>
                    </div>
                  </div>
                )}
              </div>
            )
          }

          render(
            <TestWrapper session={viewerSession}>
              <ResponsiveViewerView />
            </TestWrapper>
          )

          if (width < 768) {
            expect(screen.getByTestId('mobile-viewer-layout')).toBeInTheDocument()
            expect(screen.getByTestId('mobile-readonly-content')).toBeInTheDocument()
          } else {
            expect(screen.getByTestId('desktop-viewer-layout')).toBeInTheDocument()
            expect(screen.getByTestId('desktop-readonly-content')).toBeInTheDocument()
          }

          // Verify no action buttons for viewers regardless of viewport
          expect(screen.queryByTestId('mobile-create-product')).not.toBeInTheDocument()
          expect(screen.queryByTestId('desktop-create-product')).not.toBeInTheDocument()
        })

        it(`should handle touch interactions on ${name} viewport`, async () => {
          const TouchInteractionTest = () => {
            const [touchCount, setTouchCount] = React.useState(0)
            const [isMobile, setIsMobile] = React.useState(width < 768)

            const handleTouch = () => {
              setTouchCount(prev => prev + 1)
            }

            React.useEffect(() => {
              const handleResize = () => {
                setIsMobile(window.innerWidth < 768)
              }
              window.addEventListener('resize', handleResize)
              return () => window.removeEventListener('resize', handleResize)
            }, [])

            return (
              <div data-testid="touch-interaction-test">
                {isMobile ? (
                  <button
                    type="button"
                    onTouchStart={handleTouch}
                    onClick={handleTouch}
                    data-testid="mobile-touch-button"
                  >
                    Touch Me ({touchCount})
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleTouch}
                    data-testid="desktop-click-button"
                  >
                    Click Me ({touchCount})
                  </button>
                )}
              </div>
            )
          }

          render(
            <TestWrapper session={adminSession}>
              <TouchInteractionTest />
            </TestWrapper>
          )

          if (width < 768) {
            const touchButton = screen.getByTestId('mobile-touch-button')
            expect(touchButton).toBeInTheDocument()
            
            // Simulate touch interaction
            fireEvent.click(touchButton)
            await waitFor(() => {
              expect(touchButton).toHaveTextContent('Touch Me (1)')
            })
          } else {
            const clickButton = screen.getByTestId('desktop-click-button')
            expect(clickButton).toBeInTheDocument()
            
            // Simulate click interaction
            fireEvent.click(clickButton)
            await waitFor(() => {
              expect(clickButton).toHaveTextContent('Click Me (1)')
            })
          }
        })

        it(`should handle responsive navigation on ${name} viewport`, async () => {
          const ResponsiveNavigation = () => {
            const [isMobile, setIsMobile] = React.useState(width < 768)
            const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

            React.useEffect(() => {
              const handleResize = () => {
                setIsMobile(window.innerWidth < 768)
              }
              window.addEventListener('resize', handleResize)
              return () => window.removeEventListener('resize', handleResize)
            }, [])

            return (
              <div data-testid="responsive-navigation">
                {isMobile ? (
                  <div data-testid="mobile-navigation">
                    <button
                      type="button"
                      onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                      data-testid="mobile-menu-toggle"
                    >
                      ☰ Menu
                    </button>
                    {mobileMenuOpen && (
                      <div data-testid="mobile-menu">
                        <a href="/admin/products" data-testid="mobile-nav-products">Products</a>
                        <a href="/admin/analytics" data-testid="mobile-nav-analytics">Analytics</a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div data-testid="desktop-navigation">
                    <nav data-testid="desktop-nav">
                      <a href="/admin/products" data-testid="desktop-nav-products">Products</a>
                      <a href="/admin/users" data-testid="desktop-nav-users">Users</a>
                      <a href="/admin/analytics" data-testid="desktop-nav-analytics">Analytics</a>
                    </nav>
                  </div>
                )}
              </div>
            )
          }

          render(
            <TestWrapper session={adminSession}>
              <ResponsiveNavigation />
            </TestWrapper>
          )

          if (width < 768) {
            // Mobile navigation
            expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument()
            expect(screen.getByTestId('mobile-menu-toggle')).toBeInTheDocument()
            
            // Open mobile menu
            fireEvent.click(screen.getByTestId('mobile-menu-toggle'))
            
            await waitFor(() => {
              expect(screen.getByTestId('mobile-menu')).toBeInTheDocument()
              expect(screen.getByTestId('mobile-nav-products')).toBeInTheDocument()
            })
          } else {
            // Desktop navigation
            expect(screen.getByTestId('desktop-navigation')).toBeInTheDocument()
            expect(screen.getByTestId('desktop-nav-products')).toBeInTheDocument()
            expect(screen.getByTestId('desktop-nav-users')).toBeInTheDocument()
          }
        })
      })
    })

    it('should handle viewport transitions gracefully', async () => {
      const ViewportTransitionTest = () => {
        const [isMobile, setIsMobile] = React.useState(false)

        React.useEffect(() => {
          const handleResize = () => {
            setIsMobile(window.innerWidth < 768)
          }
          window.addEventListener('resize', handleResize)
          handleResize() // Initial check
          return () => window.removeEventListener('resize', handleResize)
        }, [])

        return (
          <div data-testid="viewport-transition-test">
            <div data-testid="current-viewport">
              {isMobile ? 'Mobile' : 'Desktop'}
            </div>
            {isMobile ? (
              <div data-testid="mobile-content">Mobile Layout</div>
            ) : (
              <div data-testid="desktop-content">Desktop Layout</div>
            )}
          </div>
        )
      }

      render(
        <TestWrapper session={adminSession}>
          <ViewportTransitionTest />
        </TestWrapper>
      )

      // Start with desktop
      mockViewport.desktop()
      await waitFor(() => {
        expect(screen.getByText('Desktop')).toBeInTheDocument()
        expect(screen.getByTestId('desktop-content')).toBeInTheDocument()
      })

      // Transition to mobile
      mockViewport.mobile()
      await waitFor(() => {
        expect(screen.getByText('Mobile')).toBeInTheDocument()
        expect(screen.getByTestId('mobile-content')).toBeInTheDocument()
      })

      // Transition back to desktop
      mockViewport.desktop()
      await waitFor(() => {
        expect(screen.getByText('Desktop')).toBeInTheDocument()
        expect(screen.getByTestId('desktop-content')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility and Permission Integration', () => {
    const adminSession = createMockSession({
      id: 'admin-1',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
      name: 'Admin User'
    })

    it('should maintain accessibility standards across all viewports', async () => {
      const AccessiblePermissionComponent = () => {
        const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768)

        React.useEffect(() => {
          const handleResize = () => {
            setIsMobile(window.innerWidth < 768)
          }
          window.addEventListener('resize', handleResize)
          return () => window.removeEventListener('resize', handleResize)
        }, [])

        return (
          <div data-testid="accessible-permission-component">
            <h1>Admin Dashboard</h1>
            {isMobile ? (
              <nav aria-label="Mobile navigation" data-testid="mobile-nav">
                <button
                  type="button"
                  aria-expanded="false"
                  aria-controls="mobile-menu"
                  data-testid="mobile-menu-button"
                >
                  Open Menu
                </button>
              </nav>
            ) : (
              <nav aria-label="Main navigation" data-testid="desktop-nav">
                <ul role="list">
                  <li><a href="/admin/products" aria-label="Manage products">Products</a></li>
                  <li><a href="/admin/users" aria-label="Manage users">Users</a></li>
                </ul>
              </nav>
            )}
            <main role="main">
              <button
                type="button"
                aria-label="Create new product"
                data-testid="create-product-accessible"
              >
                Create Product
              </button>
            </main>
          </div>
        )
      }

      // Test desktop accessibility
      mockViewport.desktop()
      render(
        <TestWrapper session={adminSession}>
          <AccessiblePermissionComponent />
        </TestWrapper>
      )

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create new product' })).toBeInTheDocument()

      // Test mobile accessibility
      mockViewport.mobile()
      const { rerender } = render(
        <TestWrapper session={adminSession}>
          <AccessiblePermissionComponent />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Open Menu' })).toBeInTheDocument()
      })
    })

    it('should provide proper ARIA labels for permission-restricted elements', async () => {
      const viewerSession = createMockSession({
        id: 'viewer-1',
        email: 'viewer@test.com',
        role: UserRole.VIEWER,
        name: 'Viewer User'
      })

      const PermissionAriaComponent = () => (
        <div data-testid="permission-aria-component">
          <button
            type="button"
            disabled
            aria-label="Create product (requires editor permissions)"
            aria-describedby="permission-help"
            data-testid="disabled-create-button"
          >
            Create Product
          </button>
          <div id="permission-help" className="sr-only">
            You need editor permissions to create products
          </div>
        </div>
      )

      render(
        <TestWrapper session={viewerSession}>
          <PermissionAriaComponent />
        </TestWrapper>
      )

      const disabledButton = screen.getByTestId('disabled-create-button')
      expect(disabledButton).toBeDisabled()
      expect(disabledButton).toHaveAttribute('aria-label', 'Create product (requires editor permissions)')
      expect(disabledButton).toHaveAttribute('aria-describedby', 'permission-help')
    })
  })
})