/**
 * Test for new admin user management pages
 */

import { render, screen } from '@testing-library/react'
import { getServerSession } from 'next-auth'
import { UserRole } from '@prisma/client'

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
  usePathname: () => '/admin/users',
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}))

// Mock components
jest.mock('@/app/components/admin/UserManagement', () => {
  return function MockUserManagement() {
    return <div data-testid="user-management">User Management Component</div>
  }
})

jest.mock('@/app/components/admin/UserDetailView', () => {
  return function MockUserDetailView() {
    return <div data-testid="user-detail-view">User Detail View Component</div>
  }
})

jest.mock('@/app/components/admin/SecurityDashboard', () => {
  return function MockSecurityDashboard() {
    return <div data-testid="security-dashboard">Security Dashboard Component</div>
  }
})

jest.mock('@/app/components/admin/UserActivityMonitor', () => {
  return function MockUserActivityMonitor() {
    return <div data-testid="user-activity-monitor">User Activity Monitor Component</div>
  }
})

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('Admin Pages', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'admin-user-id',
        name: 'Admin User',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      },
      expires: '2024-12-31',
    })
  })

  describe('User Management Page', () => {
    it('renders user management page for admin users', async () => {
      // Dynamic import to avoid SSR issues in tests
      const UserManagementPage = (await import('@/app/admin/users/page')).default
      
      render(await UserManagementPage())
      
      expect(screen.getByTestId('user-management')).toBeInTheDocument()
    })
  })

  describe('Individual User Page', () => {
    it('renders individual user page for admin users', async () => {
      const UserDetailPage = (await import('@/app/admin/users/[id]/page')).default
      
      render(await UserDetailPage({ params: { id: 'user-123' } }))
      
      expect(screen.getByTestId('user-detail-view')).toBeInTheDocument()
      expect(screen.getByTestId('user-activity-monitor')).toBeInTheDocument()
    })
  })

  describe('Security Monitoring Page', () => {
    it('renders security monitoring page for admin users', async () => {
      const SecurityPage = (await import('@/app/admin/security/page')).default
      
      render(await SecurityPage())
      
      expect(screen.getByTestId('security-dashboard')).toBeInTheDocument()
      expect(screen.getByTestId('user-activity-monitor')).toBeInTheDocument()
    })
  })
})