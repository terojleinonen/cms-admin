/**
 * Specialized Guards Component Tests
 * Task 17: Test specialized guard components
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { UserRole } from '@prisma/client'
import { 
  AdminOnly, 
  OwnerOrAdmin, 
  FeatureFlag,
  getFeatureConfig,
  useFeatureFlags,
  withFeatureFlag,
  withAdminOnly,
  withOwnerOrAdmin
} from '../../../app/components/auth/SpecializedGuards'
import { usePermissions } from '../../../app/lib/hooks/usePermissions'

// Mock the usePermissions hook
jest.mock('../../../app/lib/hooks/usePermissions')
const mockUsePermissions = usePermissions as jest.MockedFunction<typeof usePermissions>

// Mock UI components
jest.mock('../../../app/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ size }: { size?: string }) => <div data-testid="loading-spinner">Loading {size}</div>
}))

jest.mock('../../../app/components/ui/ErrorMessage', () => ({
  ErrorMessage: ({ message }: { message: string }) => <div data-testid="error-message">{message}</div>
}))

// Test component for rendering
const TestContent = () => <div data-testid="test-content">Protected Content</div>
const TestFallback = () => <div data-testid="test-fallback">Fallback Content</div>

describe('AdminOnly Component', () => {
  const mockPermissions = {
    isLoading: false,
    isAuthenticated: true,
    user: { id: 'user-1', role: UserRole.ADMIN },
    isAdmin: jest.fn(),
    hasMinimumRole: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders children when user is admin', () => {
    mockPermissions.isAdmin.mockReturnValue(true)
    mockUsePermissions.mockReturnValue(mockPermissions as any)

    render(
      <AdminOnly>
        <TestContent />
      </AdminOnly>
    )

    expect(screen.getByTestId('test-content')).toBeInTheDocument()
    expect(screen.queryByTestId('test-fallback')).not.toBeInTheDocument()
  })

  it('renders fallback when user is not admin', () => {
    mockPermissions.isAdmin.mockReturnValue(false)
    mockPermissions.user = { id: 'user-1', role: UserRole.EDITOR }
    mockUsePermissions.mockReturnValue(mockPermissions as any)

    render(
      <AdminOnly fallback={<TestFallback />}>
        <TestContent />
      </AdminOnly>
    )

    expect(screen.queryByTestId('test-content')).not.toBeInTheDocument()
    expect(screen.getByTestId('test-fallback')).toBeInTheDocument()
  })

  it('shows error message when showError is true and user is not admin', () => {
    mockPermissions.isAdmin.mockReturnValue(false)
    mockPermissions.user = { id: 'user-1', role: UserRole.VIEWER }
    mockUsePermissions.mockReturnValue(mockPermissions as any)

    render(
      <AdminOnly showError errorMessage="Custom admin error">
        <TestContent />
      </AdminOnly>
    )

    expect(screen.getByTestId('error-message')).toHaveTextContent('Custom admin error')
    expect(screen.queryByTestId('test-content')).not.toBeInTheDocument()
  })

  it('shows loading spinner when permissions are loading', () => {
    mockUsePermissions.mockReturnValue({
      ...mockPermissions,
      isLoading: true,
    } as any)

    render(
      <AdminOnly>
        <TestContent />
      </AdminOnly>
    )

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    expect(screen.queryByTestId('test-content')).not.toBeInTheDocument()
  })

  it('calls onAuthorized callback when user is admin', () => {
    const onAuthorized = jest.fn()
    mockPermissions.isAdmin.mockReturnValue(true)
    mockUsePermissions.mockReturnValue(mockPermissions as any)

    render(
      <AdminOnly onAuthorized={onAuthorized}>
        <TestContent />
      </AdminOnly>
    )

    expect(onAuthorized).toHaveBeenCalled()
  })

  it('calls onUnauthorized callback when user is not admin', () => {
    const onUnauthorized = jest.fn()
    mockPermissions.isAdmin.mockReturnValue(false)
    mockUsePermissions.mockReturnValue(mockPermissions as any)

    render(
      <AdminOnly onUnauthorized={onUnauthorized}>
        <TestContent />
      </AdminOnly>
    )

    expect(onUnauthorized).toHaveBeenCalledWith(expect.stringContaining('Admin role required'))
  })

  it('handles unauthenticated users', () => {
    mockUsePermissions.mockReturnValue({
      ...mockPermissions,
      isAuthenticated: false,
      user: null,
    } as any)

    render(
      <AdminOnly showError>
        <TestContent />
      </AdminOnly>
    )

    expect(screen.getByTestId('error-message')).toHaveTextContent('Not authenticated')
  })
})

describe('OwnerOrAdmin Component', () => {
  const mockPermissions = {
    isLoading: false,
    isAuthenticated: true,
    user: { id: 'user-1', role: UserRole.EDITOR },
    isAdmin: jest.fn(),
    hasMinimumRole: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders children when user is admin', () => {
    mockPermissions.isAdmin.mockReturnValue(true)
    mockUsePermissions.mockReturnValue(mockPermissions as any)

    render(
      <OwnerOrAdmin resourceOwnerId="user-2">
        <TestContent />
      </OwnerOrAdmin>
    )

    expect(screen.getByTestId('test-content')).toBeInTheDocument()
  })

  it('renders children when user owns the resource', () => {
    mockPermissions.isAdmin.mockReturnValue(false)
    mockUsePermissions.mockReturnValue(mockPermissions as any)

    render(
      <OwnerOrAdmin resourceOwnerId="user-1">
        <TestContent />
      </OwnerOrAdmin>
    )

    expect(screen.getByTestId('test-content')).toBeInTheDocument()
  })

  it('renders fallback when user is neither owner nor admin', () => {
    mockPermissions.isAdmin.mockReturnValue(false)
    mockUsePermissions.mockReturnValue(mockPermissions as any)

    render(
      <OwnerOrAdmin resourceOwnerId="user-2" fallback={<TestFallback />}>
        <TestContent />
      </OwnerOrAdmin>
    )

    expect(screen.queryByTestId('test-content')).not.toBeInTheDocument()
    expect(screen.getByTestId('test-fallback')).toBeInTheDocument()
  })

  it('uses custom currentUserId when provided', () => {
    mockPermissions.isAdmin.mockReturnValue(false)
    mockUsePermissions.mockReturnValue(mockPermissions as any)

    render(
      <OwnerOrAdmin resourceOwnerId="user-2" currentUserId="user-2">
        <TestContent />
      </OwnerOrAdmin>
    )

    expect(screen.getByTestId('test-content')).toBeInTheDocument()
  })

  it('shows error message when showError is true and access denied', () => {
    mockPermissions.isAdmin.mockReturnValue(false)
    mockUsePermissions.mockReturnValue(mockPermissions as any)

    render(
      <OwnerOrAdmin resourceOwnerId="user-2" showError>
        <TestContent />
      </OwnerOrAdmin>
    )

    expect(screen.getByTestId('error-message')).toHaveTextContent('Access denied')
  })

  it('calls appropriate callbacks based on authorization', () => {
    const onAuthorized = jest.fn()
    const onUnauthorized = jest.fn()
    
    mockPermissions.isAdmin.mockReturnValue(true)
    mockUsePermissions.mockReturnValue(mockPermissions as any)

    render(
      <OwnerOrAdmin 
        resourceOwnerId="user-2" 
        onAuthorized={onAuthorized}
        onUnauthorized={onUnauthorized}
      >
        <TestContent />
      </OwnerOrAdmin>
    )

    expect(onAuthorized).toHaveBeenCalled()
    expect(onUnauthorized).not.toHaveBeenCalled()
  })
})

describe('FeatureFlag Component', () => {
  const mockPermissions = {
    isLoading: false,
    isAuthenticated: true,
    user: { id: 'user-1', role: UserRole.EDITOR },
    hasMinimumRole: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders children when feature is enabled in enabledFeatures array', () => {
    mockUsePermissions.mockReturnValue(mockPermissions as any)

    render(
      <FeatureFlag feature="test-feature" enabledFeatures={['test-feature', 'other-feature']}>
        <TestContent />
      </FeatureFlag>
    )

    expect(screen.getByTestId('test-content')).toBeInTheDocument()
  })

  it('renders fallback when feature is not enabled', () => {
    mockUsePermissions.mockReturnValue(mockPermissions as any)

    render(
      <FeatureFlag 
        feature="test-feature" 
        enabledFeatures={['other-feature']} 
        fallback={<TestFallback />}
      >
        <TestContent />
      </FeatureFlag>
    )

    expect(screen.queryByTestId('test-content')).not.toBeInTheDocument()
    expect(screen.getByTestId('test-fallback')).toBeInTheDocument()
  })

  it('uses featureConfig over enabledFeatures when both provided', () => {
    mockUsePermissions.mockReturnValue(mockPermissions as any)

    render(
      <FeatureFlag 
        feature="test-feature" 
        enabledFeatures={[]} 
        featureConfig={{ 'test-feature': true }}
      >
        <TestContent />
      </FeatureFlag>
    )

    expect(screen.getByTestId('test-content')).toBeInTheDocument()
  })

  it('respects featureConfig false value', () => {
    mockUsePermissions.mockReturnValue(mockPermissions as any)

    render(
      <FeatureFlag 
        feature="test-feature" 
        enabledFeatures={['test-feature']} 
        featureConfig={{ 'test-feature': false }}
        fallback={<TestFallback />}
      >
        <TestContent />
      </FeatureFlag>
    )

    expect(screen.queryByTestId('test-content')).not.toBeInTheDocument()
    expect(screen.getByTestId('test-fallback')).toBeInTheDocument()
  })

  it('checks authentication when requireAuthentication is true', () => {
    mockUsePermissions.mockReturnValue({
      ...mockPermissions,
      isAuthenticated: false,
    } as any)

    render(
      <FeatureFlag 
        feature="test-feature" 
        enabledFeatures={['test-feature']}
        requireAuthentication={true}
        showError
      >
        <TestContent />
      </FeatureFlag>
    )

    expect(screen.getByTestId('error-message')).toHaveTextContent('Authentication required')
  })

  it('checks minimum role when specified', () => {
    mockPermissions.hasMinimumRole.mockReturnValue(false)
    mockUsePermissions.mockReturnValue(mockPermissions as any)

    render(
      <FeatureFlag 
        feature="test-feature" 
        enabledFeatures={['test-feature']}
        minimumRole={UserRole.ADMIN}
        showError
      >
        <TestContent />
      </FeatureFlag>
    )

    expect(screen.getByTestId('error-message')).toHaveTextContent('Minimum role required')
  })

  it('defaults to enabled when no configuration provided', () => {
    mockUsePermissions.mockReturnValue(mockPermissions as any)

    render(
      <FeatureFlag feature="test-feature">
        <TestContent />
      </FeatureFlag>
    )

    expect(screen.getByTestId('test-content')).toBeInTheDocument()
  })

  it('shows loading when requireAuthentication and permissions loading', () => {
    mockUsePermissions.mockReturnValue({
      ...mockPermissions,
      isLoading: true,
    } as any)

    render(
      <FeatureFlag 
        feature="test-feature" 
        requireAuthentication={true}
      >
        <TestContent />
      </FeatureFlag>
    )

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })
})

describe('getFeatureConfig', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('returns feature configuration based on environment variables', () => {
    process.env.NEXT_PUBLIC_FEATURE_ADVANCED_ANALYTICS = 'true'
    process.env.NEXT_PUBLIC_FEATURE_BETA = 'false'
    process.env.NODE_ENV = 'development'

    const config = getFeatureConfig()

    expect(config['advanced-analytics']).toBe(true)
    expect(config['beta-features']).toBe(false)
    expect(config['debug-mode']).toBe(true)
  })
})

describe('useFeatureFlags hook', () => {
  it('provides feature flag utilities', () => {
    const TestComponent = () => {
      const { featureConfig, isFeatureEnabled, updateFeatureConfig } = useFeatureFlags()
      
      return (
        <div>
          <div data-testid="feature-enabled">
            {isFeatureEnabled('debug-mode').toString()}
          </div>
          <button 
            onClick={() => updateFeatureConfig({ 'test-feature': true })}
            data-testid="update-config"
          >
            Update Config
          </button>
        </div>
      )
    }

    render(<TestComponent />)
    
    expect(screen.getByTestId('feature-enabled')).toBeInTheDocument()
    expect(screen.getByTestId('update-config')).toBeInTheDocument()
  })
})

describe('Higher-Order Components', () => {
  const TestComponent = ({ message }: { message: string }) => (
    <div data-testid="hoc-content">{message}</div>
  )

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('withFeatureFlag', () => {
    it('wraps component with feature flag', () => {
      mockUsePermissions.mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
      } as any)

      const WrappedComponent = withFeatureFlag(TestComponent, 'test-feature', {
        enabledFeatures: ['test-feature']
      })

      render(<WrappedComponent message="Test Message" />)

      expect(screen.getByTestId('hoc-content')).toHaveTextContent('Test Message')
    })

    it('sets correct display name', () => {
      const WrappedComponent = withFeatureFlag(TestComponent, 'test-feature')
      expect(WrappedComponent.displayName).toBe('withFeatureFlag(TestComponent)')
    })
  })

  describe('withAdminOnly', () => {
    it('wraps component with admin-only guard', () => {
      const mockPermissions = {
        isLoading: false,
        isAuthenticated: true,
        user: { id: 'user-1', role: UserRole.ADMIN },
        isAdmin: jest.fn().mockReturnValue(true),
      }
      mockUsePermissions.mockReturnValue(mockPermissions as any)

      const WrappedComponent = withAdminOnly(TestComponent)

      render(<WrappedComponent message="Admin Content" />)

      expect(screen.getByTestId('hoc-content')).toHaveTextContent('Admin Content')
    })

    it('sets correct display name', () => {
      const WrappedComponent = withAdminOnly(TestComponent)
      expect(WrappedComponent.displayName).toBe('withAdminOnly(TestComponent)')
    })
  })

  describe('withOwnerOrAdmin', () => {
    it('wraps component with owner-or-admin guard', () => {
      const mockPermissions = {
        isLoading: false,
        isAuthenticated: true,
        user: { id: 'user-1', role: UserRole.EDITOR },
        isAdmin: jest.fn().mockReturnValue(false),
      }
      mockUsePermissions.mockReturnValue(mockPermissions as any)

      const getResourceOwnerId = (props: { message: string }) => 'user-1'
      const WrappedComponent = withOwnerOrAdmin(TestComponent, getResourceOwnerId)

      render(<WrappedComponent message="Owner Content" />)

      expect(screen.getByTestId('hoc-content')).toHaveTextContent('Owner Content')
    })

    it('sets correct display name', () => {
      const getResourceOwnerId = () => 'user-1'
      const WrappedComponent = withOwnerOrAdmin(TestComponent, getResourceOwnerId)
      expect(WrappedComponent.displayName).toBe('withOwnerOrAdmin(TestComponent)')
    })
  })
})