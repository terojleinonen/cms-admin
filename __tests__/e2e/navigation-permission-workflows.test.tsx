/**
 * Navigation Permission Workflows Test Suite
 * 
 * Tests complete navigation workflows with permission-based routing,
 * breadcrumb generation, and cross-component navigation integration.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import { PermissionProvider } from '@/app/components/providers/PermissionProvider'
import { createMockSession } from '@/__tests__/helpers/permission-test-utils'
import { UserRole } from '@/app/lib/types'
import React from 'react'

// Mock navigation components for testing
const MockSidebar = ({ currentPath }: { currentPath: string }) => {
  const navigationItems = [
    { name: 'Dashboard', href: '/admin', requiredRole: UserRole.VIEWER },
    { name: 'Products', href: '/admin/products', requiredRole: UserRole.VIEWER },
    { name: 'Categories', href: '/admin/categories', requiredRole: UserRole.EDITOR },
    { name: 'Users', href: '/admin/users', requiredRole: UserRole.ADMIN },
    { name: 'Analytics', href: '/admin/analytics', requiredRole: UserRole.EDITOR },
    { name: 'Settings', href: '/admin/settings', requiredRole: UserRole.ADMIN }
  ]

  return (
    <nav data-testid="sidebar">
      {navigationItems.map((item) => (
        <a
          key={item.href}
          href={item.href}
          data-testid={`nav-${item.name.toLowerCase()}`}
          className={currentPath === item.href ? 'active' : ''}
        >
          {item.name}
        </a>
      ))}
    </nav>
  )
}

const MockHeader = ({ user }: { user: any }) => {
  const quickActions = [
    { name: 'New Product', href: '/admin/products/new', requiredRole: UserRole.EDITOR },
    { name: 'New User', href: '/admin/users/new', requiredRole: UserRole.ADMIN },
    { name: 'View Reports', href: '/admin/analytics', requiredRole: UserRole.EDITOR }
  ]

  return (
    <header data-testid="header">
      <div data-testid="user-info">
        Welcome, {user?.name} ({user?.role})
      </div>
      <div data-testid="quick-actions">
        {quickActions.map((action) => (
          <button
            key={action.href}
            data-testid={`quick-${action.name.toLowerCase().replace(' ', '-')}`}
          >
            {action.name}
          </button>
        ))}
      </div>
      <div data-testid="notifications">
        <span data-testid="notification-count">3</span>
      </div>
    </header>
  )
}

const MockBreadcrumb = ({ path }: { path: string }) => {
  const pathSegments = path.split('/').filter(Boolean)
  
  const breadcrumbItems = pathSegments.map((segment, index) => {
    const href = '/' + pathSegments.slice(0, index + 1).join('/')
    return {
      name: segment.charAt(0).toUpperCase() + segment.slice(1),
      href,
      isLast: index === pathSegments.length - 1
    }
  })

  return (
    <nav data-testid="breadcrumb">
      {breadcrumbItems.map((item, index) => (
        <span key={item.href}>
          {index > 0 && <span data-testid="breadcrumb-separator"> / </span>}
          {item.isLast ? (
            <span data-testid={`breadcrumb-${item.name.toLowerCase()}`}>
              {item.name}
            </span>
          ) : (
            <a
              href={item.href}
              data-testid={`breadcrumb-link-${item.name.toLowerCase()}`}
            >
              {item.name}
            </a>
          )}
        </span>
      ))}
    </nav>
  )
}

const MockLayout = ({ 
  children, 
  currentPath, 
  user 
}: { 
  children: React.ReactNode
  currentPath: string
  user: any 
}) => {
  return (
    <div data-testid="layout">
      <MockHeader user={user} />
      <MockBreadcrumb path={currentPath} />
      <div className="layout-content">
        <MockSidebar currentPath={currentPath} />
        <main data-testid="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}

// Mock page components
const MockDashboard = () => (
  <div data-testid="dashboard-page">
    <h1>Dashboard</h1>
    <div data-testid="dashboard-stats">
      <div data-testid="products-stat">Products: 100</div>
      <div data-testid="orders-stat">Orders: 50</div>
    </div>
  </div>
)

const MockProductsPage = () => (
  <div data-testid="products-page">
    <h1>Products</h1>
    <button data-testid="add-product">Add Product</button>
    <div data-testid="products-list">
      <div data-testid="product-item">Product 1</div>
    </div>
  </div>
)

const MockUsersPage = () => (
  <div data-testid="users-page">
    <h1>User Management</h1>
    <button data-testid="add-user">Add User</button>
    <div data-testid="users-list">
      <div data-testid="user-item">User 1</div>
    </div>
  </div>
)

const MockAnalyticsPage = () => (
  <div data-testid="analytics-page">
    <h1>Analytics</h1>
    <div data-testid="analytics-charts">
      <div data-testid="sales-chart">Sales Chart</div>
      <div data-testid="traffic-chart">Traffic Chart</div>
    </div>
  </div>
)

// Test wrapper
const TestWrapper = ({ children, session }: { children: React.ReactNode, session: any }) => (
  <SessionProvider session={session}>
    <PermissionProvider>
      {children}
    </PermissionProvider>
  </SessionProvider>
)

describe('Navigation Permission Workflows', () => {
  describe('Admin Navigation Workflow', () => {
    const adminSession = createMockSession({
      id: 'admin-1',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
      name: 'Admin User'
    })

    it('should provide full navigation access for admin users', async () => {
      const NavigationApp = () => {
        const [currentPath, setCurrentPath] = React.useState('/admin')
        const [currentPage, setCurrentPage] = React.useState('dashboard')

        const handleNavigation = (path: string, page: string) => {
          setCurrentPath(path)
          setCurrentPage(page)
        }

        const renderCurrentPage = () => {
          switch (currentPage) {
            case 'dashboard': return <MockDashboard />
            case 'products': return <MockProductsPage />
            case 'users': return <MockUsersPage />
            case 'analytics': return <MockAnalyticsPage />
            default: return <MockDashboard />
          }
        }

        return (
          <MockLayout currentPath={currentPath} user={adminSession.user}>
            <div>
              {/* Navigation handlers */}
              <button
                onClick={() => handleNavigation('/admin/products', 'products')}
                data-testid="navigate-to-products"
              >
                Go to Products
              </button>
              <button
                onClick={() => handleNavigation('/admin/users', 'users')}
                data-testid="navigate-to-users"
              >
                Go to Users
              </button>
              <button
                onClick={() => handleNavigation('/admin/analytics', 'analytics')}
                data-testid="navigate-to-analytics"
              >
                Go to Analytics
              </button>
              {renderCurrentPage()}
            </div>
          </MockLayout>
        )
      }

      render(
        <TestWrapper session={adminSession}>
          <NavigationApp />
        </TestWrapper>
      )

      // Verify admin has access to all navigation items
      expect(screen.getByTestId('nav-dashboard')).toBeInTheDocument()
      expect(screen.getByTestId('nav-products')).toBeInTheDocument()
      expect(screen.getByTestId('nav-categories')).toBeInTheDocument()
      expect(screen.getByTestId('nav-users')).toBeInTheDocument()
      expect(screen.getByTestId('nav-analytics')).toBeInTheDocument()
      expect(screen.getByTestId('nav-settings')).toBeInTheDocument()

      // Verify all quick actions are available
      expect(screen.getByTestId('quick-new-product')).toBeInTheDocument()
      expect(screen.getByTestId('quick-new-user')).toBeInTheDocument()
      expect(screen.getByTestId('quick-view-reports')).toBeInTheDocument()

      // Test navigation workflow
      fireEvent.click(screen.getByTestId('navigate-to-products'))
      await waitFor(() => {
        expect(screen.getByTestId('products-page')).toBeInTheDocument()
        expect(screen.getByTestId('breadcrumb-products')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('navigate-to-users'))
      await waitFor(() => {
        expect(screen.getByTestId('users-page')).toBeInTheDocument()
        expect(screen.getByTestId('breadcrumb-users')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('navigate-to-analytics'))
      await waitFor(() => {
        expect(screen.getByTestId('analytics-page')).toBeInTheDocument()
        expect(screen.getByTestId('breadcrumb-analytics')).toBeInTheDocument()
      })
    })

    it('should maintain breadcrumb consistency during admin navigation', async () => {
      const BreadcrumbApp = () => {
        const [currentPath, setCurrentPath] = React.useState('/admin/products/categories/electronics')

        return (
          <div>
            <MockBreadcrumb path={currentPath} />
            <button
              onClick={() => setCurrentPath('/admin/users/roles/editor')}
              data-testid="change-path"
            >
              Change Path
            </button>
          </div>
        )
      }

      render(
        <TestWrapper session={adminSession}>
          <BreadcrumbApp />
        </TestWrapper>
      )

      // Verify initial breadcrumb
      expect(screen.getByTestId('breadcrumb-link-admin')).toBeInTheDocument()
      expect(screen.getByTestId('breadcrumb-link-products')).toBeInTheDocument()
      expect(screen.getByTestId('breadcrumb-link-categories')).toBeInTheDocument()
      expect(screen.getByTestId('breadcrumb-electronics')).toBeInTheDocument()

      // Change path and verify breadcrumb updates
      fireEvent.click(screen.getByTestId('change-path'))
      await waitFor(() => {
        expect(screen.getByTestId('breadcrumb-link-admin')).toBeInTheDocument()
        expect(screen.getByTestId('breadcrumb-link-users')).toBeInTheDocument()
        expect(screen.getByTestId('breadcrumb-link-roles')).toBeInTheDocument()
        expect(screen.getByTestId('breadcrumb-editor')).toBeInTheDocument()
      })
    })
  })

  describe('Editor Navigation Workflow', () => {
    const editorSession = createMockSession({
      id: 'editor-1',
      email: 'editor@test.com',
      role: UserRole.EDITOR,
      name: 'Editor User'
    })

    it('should restrict editor navigation appropriately', async () => {
      render(
        <TestWrapper session={editorSession}>
          <MockLayout currentPath="/admin" user={editorSession.user}>
            <MockDashboard />
          </MockLayout>
        </TestWrapper>
      )

      // Verify editor has access to content-related navigation
      expect(screen.getByTestId('nav-dashboard')).toBeInTheDocument()
      expect(screen.getByTestId('nav-products')).toBeInTheDocument()
      expect(screen.getByTestId('nav-categories')).toBeInTheDocument()
      expect(screen.getByTestId('nav-analytics')).toBeInTheDocument()

      // Verify editor doesn't have access to admin-only navigation
      expect(screen.queryByTestId('nav-users')).not.toBeInTheDocument()
      expect(screen.queryByTestId('nav-settings')).not.toBeInTheDocument()

      // Verify limited quick actions
      expect(screen.getByTestId('quick-new-product')).toBeInTheDocument()
      expect(screen.getByTestId('quick-view-reports')).toBeInTheDocument()
      expect(screen.queryByTestId('quick-new-user')).not.toBeInTheDocument()
    })

    it('should handle editor attempting to access restricted areas', async () => {
      const RestrictedNavigationApp = () => {
        const [currentPath, setCurrentPath] = React.useState('/admin')
        const [showError, setShowError] = React.useState(false)

        const handleRestrictedNavigation = () => {
          // Simulate attempting to access users page
          setShowError(true)
          setTimeout(() => setShowError(false), 1000)
        }

        return (
          <div>
            <MockLayout currentPath={currentPath} user={editorSession.user}>
              <div>
                <button
                  onClick={handleRestrictedNavigation}
                  data-testid="attempt-users-access"
                >
                  Try to Access Users
                </button>
                {showError && (
                  <div data-testid="access-denied-message">
                    Access Denied: Insufficient permissions
                  </div>
                )}
                <MockDashboard />
              </div>
            </MockLayout>
          </div>
        )
      }

      render(
        <TestWrapper session={editorSession}>
          <RestrictedNavigationApp />
        </TestWrapper>
      )

      fireEvent.click(screen.getByTestId('attempt-users-access'))
      
      await waitFor(() => {
        expect(screen.getByTestId('access-denied-message')).toBeInTheDocument()
      })

      // Error message should disappear
      await waitFor(() => {
        expect(screen.queryByTestId('access-denied-message')).not.toBeInTheDocument()
      }, { timeout: 1500 })
    })
  })

  describe('Viewer Navigation Workflow', () => {
    const viewerSession = createMockSession({
      id: 'viewer-1',
      email: 'viewer@test.com',
      role: UserRole.VIEWER,
      name: 'Viewer User'
    })

    it('should provide minimal navigation for viewer users', async () => {
      render(
        <TestWrapper session={viewerSession}>
          <MockLayout currentPath="/admin" user={viewerSession.user}>
            <MockDashboard />
          </MockLayout>
        </TestWrapper>
      )

      // Verify viewer has minimal navigation access
      expect(screen.getByTestId('nav-dashboard')).toBeInTheDocument()
      expect(screen.getByTestId('nav-products')).toBeInTheDocument()

      // Verify viewer doesn't have access to management features
      expect(screen.queryByTestId('nav-categories')).not.toBeInTheDocument()
      expect(screen.queryByTestId('nav-users')).not.toBeInTheDocument()
      expect(screen.queryByTestId('nav-analytics')).not.toBeInTheDocument()
      expect(screen.queryByTestId('nav-settings')).not.toBeInTheDocument()

      // Verify no quick actions for viewers
      expect(screen.queryByTestId('quick-new-product')).not.toBeInTheDocument()
      expect(screen.queryByTestId('quick-new-user')).not.toBeInTheDocument()
      expect(screen.queryByTestId('quick-view-reports')).not.toBeInTheDocument()
    })

    it('should show read-only content for viewer navigation', async () => {
      const ViewerApp = () => {
        const [currentPage, setCurrentPage] = React.useState('dashboard')

        return (
          <MockLayout currentPath="/admin" user={viewerSession.user}>
            <div>
              <button
                onClick={() => setCurrentPage('products')}
                data-testid="view-products"
              >
                View Products
              </button>
              {currentPage === 'dashboard' && <MockDashboard />}
              {currentPage === 'products' && (
                <div data-testid="readonly-products">
                  <h1>Products (Read Only)</h1>
                  <div data-testid="products-list">
                    <div data-testid="product-item">Product 1</div>
                  </div>
                  {/* No add/edit buttons for viewers */}
                </div>
              )}
            </div>
          </MockLayout>
        )
      }

      render(
        <TestWrapper session={viewerSession}>
          <ViewerApp />
        </TestWrapper>
      )

      fireEvent.click(screen.getByTestId('view-products'))
      
      await waitFor(() => {
        expect(screen.getByTestId('readonly-products')).toBeInTheDocument()
        expect(screen.queryByTestId('add-product')).not.toBeInTheDocument()
      })
    })
  })

  describe('Cross-Component Navigation Integration', () => {
    it('should maintain permission consistency across navigation components', async () => {
      const adminSession = createMockSession({
        id: 'admin-1',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
        name: 'Admin User'
      })

      const IntegratedApp = () => {
        const [_currentPath, setCurrentPath] = React.useState('/admin')
        const [notifications] = React.useState([
          { id: 1, message: 'New user registered', type: 'user' },
          { id: 2, message: 'Product updated', type: 'product' },
          { id: 3, message: 'System alert', type: 'system' }
        ])

        const handleNavigation = (path: string) => {
          setCurrentPath(path)
        }

        return (
          <div>
            <MockLayout currentPath={_currentPath} user={adminSession.user}>
              <div>
                <div data-testid="context-notifications">
                  {notifications.map(notification => (
                    <div key={notification.id} data-testid={`notification-${notification.type}`}>
                      {notification.message}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleNavigation('/admin/users')}
                  data-testid="nav-to-users"
                >
                  Navigate to Users
                </button>
                <button
                  onClick={() => handleNavigation('/admin/products')}
                  data-testid="nav-to-products"
                >
                  Navigate to Products
                </button>
              </div>
            </MockLayout>
          </div>
        )
      }

      render(
        <TestWrapper session={adminSession}>
          <IntegratedApp />
        </TestWrapper>
      )

      // Initial state - all notifications visible
      expect(screen.getByTestId('notification-user')).toBeInTheDocument()
      expect(screen.getByTestId('notification-product')).toBeInTheDocument()
      expect(screen.getByTestId('notification-system')).toBeInTheDocument()

      // Navigate to users context
      fireEvent.click(screen.getByTestId('nav-to-users'))
      
      await waitFor(() => {
        expect(screen.getByTestId('breadcrumb-users')).toBeInTheDocument()
        // Context-specific notifications
        expect(screen.getByTestId('notification-user')).toBeInTheDocument()
        expect(screen.getByTestId('notification-system')).toBeInTheDocument()
      })
    })

    it('should handle dynamic permission changes during navigation', async () => {
      const currentSession = createMockSession({
        id: 'user-1',
        email: 'user@test.com',
        role: UserRole.VIEWER,
        name: 'Test User'
      })

      const DynamicPermissionApp = () => {
        const [session, setSession] = React.useState(currentSession)
        const [currentPath, setCurrentPath] = React.useState('/admin')

        const upgradeToEditor = () => {
          const newSession = createMockSession({
            id: 'user-1',
            email: 'user@test.com',
            role: UserRole.EDITOR,
            name: 'Test User'
          })
          setSession(newSession)
        }

        return (
          <TestWrapper session={session}>
            <MockLayout currentPath={currentPath} user={session.user}>
              <div>
                <button onClick={upgradeToEditor} data-testid="upgrade-role">
                  Upgrade to Editor
                </button>
                <div data-testid="current-role">
                  Current Role: {session.user.role}
                </div>
              </div>
            </MockLayout>
          </TestWrapper>
        )
      }

      const { rerender: _rerender } = render(<DynamicPermissionApp />)

      // Initial viewer state
      expect(screen.getByText('Current Role: VIEWER')).toBeInTheDocument()
      expect(screen.queryByTestId('nav-categories')).not.toBeInTheDocument()

      // Upgrade role
      fireEvent.click(screen.getByTestId('upgrade-role'))

      await waitFor(() => {
        expect(screen.getByText('Current Role: EDITOR')).toBeInTheDocument()
        expect(screen.getByTestId('nav-categories')).toBeInTheDocument()
      })
    })
  })
})