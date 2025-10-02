/**
 * UnauthorizedFallback Component Tests
 * Tests for unauthorized access fallback UI components
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { UserRole } from '@prisma/client'
import UnauthorizedFallback, {
  PermissionDeniedFallback,
  RoleInsufficientFallback,
  AuthenticationRequiredFallback,
  ResourceAccessDeniedFallback,
  InlineUnauthorized,
  UnauthorizedPlaceholder,
  FeatureUnavailableFallback,
  ComingSoonFallback
} from '../../../app/components/auth/UnauthorizedFallback'

// Mock the Button component
jest.mock('../../../app/components/ui/Button', () => {
  return function MockButton({ children, onClick, variant, size, className, ...props }: any) {
    return <button onClick={onClick} className={className} {...props}>{children}</button>
  }
})

// Mock window methods
const mockGoBack = jest.fn()

// Mock window.location
delete (window as any).location
window.location = { href: '' } as any

// Mock window.history
Object.defineProperty(window, 'history', {
  value: { back: mockGoBack },
  writable: true
})

beforeEach(() => {
  mockGoBack.mockClear()
  window.location.href = ''
})

describe('UnauthorizedFallback', () => {
  describe('Basic Rendering', () => {
    it('renders default unauthorized message', () => {
      render(<UnauthorizedFallback />)

      expect(screen.getByText('Access Denied')).toBeInTheDocument()
      expect(screen.getByText('You are not authorized to access this content.')).toBeInTheDocument()
    })

    it('renders custom title and message', () => {
      render(
        <UnauthorizedFallback 
          title="Custom Title"
          message="Custom message"
        />
      )

      expect(screen.getByText('Custom Title')).toBeInTheDocument()
      expect(screen.getByText('Custom message')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<UnauthorizedFallback className="custom-class" />)

      const container = screen.getByText('Access Denied').closest('.custom-class')
      expect(container).toBeInTheDocument()
    })
  })

  describe('Type-Specific Rendering', () => {
    it('renders permission type correctly', () => {
      render(<UnauthorizedFallback type="permission" />)

      expect(screen.getByText('Permission Denied')).toBeInTheDocument()
      expect(screen.getByText('You do not have the required permissions to access this resource.')).toBeInTheDocument()
    })

    it('renders role type correctly', () => {
      render(<UnauthorizedFallback type="role" />)

      expect(screen.getByText('Insufficient Role')).toBeInTheDocument()
      expect(screen.getByText('Your current role does not allow access to this feature.')).toBeInTheDocument()
    })

    it('renders authentication type correctly', () => {
      render(<UnauthorizedFallback type="authentication" />)

      expect(screen.getByText('Authentication Required')).toBeInTheDocument()
      expect(screen.getByText('Please sign in to access this resource.')).toBeInTheDocument()
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })

    it('renders resource type correctly', () => {
      render(<UnauthorizedFallback type="resource" />)

      expect(screen.getByText('Resource Access Denied')).toBeInTheDocument()
      expect(screen.getByText('You do not have access to this specific resource.')).toBeInTheDocument()
    })
  })

  describe('Details Display', () => {
    it('shows details when enabled', () => {
      render(
        <UnauthorizedFallback 
          showDetails={true}
          requiredRole={UserRole.ADMIN}
          currentRole={UserRole.VIEWER}
          requiredPermission="products.create"
          resourceType="products"
        />
      )

      expect(screen.getByText('Required Role:')).toBeInTheDocument()
      expect(screen.getByText('ADMIN')).toBeInTheDocument()
      expect(screen.getByText('Current Role:')).toBeInTheDocument()
      expect(screen.getByText('VIEWER')).toBeInTheDocument()
      expect(screen.getByText('Required Permission:')).toBeInTheDocument()
      expect(screen.getByText('products.create')).toBeInTheDocument()
      expect(screen.getByText('Resource Type:')).toBeInTheDocument()
      expect(screen.getByText('products')).toBeInTheDocument()
    })

    it('hides details when disabled', () => {
      render(
        <UnauthorizedFallback 
          showDetails={false}
          requiredRole={UserRole.ADMIN}
          currentRole={UserRole.VIEWER}
        />
      )

      expect(screen.queryByText('Required Role:')).not.toBeInTheDocument()
      expect(screen.queryByText('Current Role:')).not.toBeInTheDocument()
    })
  })

  describe('Action Buttons', () => {
    it('shows default actions for non-authentication types', () => {
      render(<UnauthorizedFallback type="permission" />)

      expect(screen.getByText('Go Back')).toBeInTheDocument()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Contact Support')).toBeInTheDocument()
    })

    it('shows authentication-specific actions', () => {
      render(<UnauthorizedFallback type="authentication" />)

      expect(screen.getByText('Sign In')).toBeInTheDocument()
      expect(screen.getByText('Go Back')).toBeInTheDocument()
      expect(screen.getByText('Contact Support')).toBeInTheDocument()
    })

    it('hides actions when disabled', () => {
      render(<UnauthorizedFallback showActions={false} />)

      expect(screen.queryByText('Go Back')).not.toBeInTheDocument()
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
    })

    it('renders custom actions', () => {
      const customActions = <button>Custom Action</button>

      render(<UnauthorizedFallback customActions={customActions} />)

      expect(screen.getByText('Custom Action')).toBeInTheDocument()
      expect(screen.queryByText('Go Back')).not.toBeInTheDocument()
    })
  })

  describe('Action Handlers', () => {
    it('calls custom onGoBack handler', () => {
      const onGoBack = jest.fn()

      render(<UnauthorizedFallback onGoBack={onGoBack} />)

      fireEvent.click(screen.getByText('Go Back'))
      expect(onGoBack).toHaveBeenCalled()
    })

    it('calls custom onGoHome handler', () => {
      const onGoHome = jest.fn()

      render(<UnauthorizedFallback onGoHome={onGoHome} />)

      fireEvent.click(screen.getByText('Dashboard'))
      expect(onGoHome).toHaveBeenCalled()
    })

    it('calls custom onLogin handler', () => {
      const onLogin = jest.fn()

      render(<UnauthorizedFallback type="authentication" onLogin={onLogin} />)

      fireEvent.click(screen.getByText('Sign In'))
      expect(onLogin).toHaveBeenCalled()
    })

    it('calls custom onContactSupport handler', () => {
      const onContactSupport = jest.fn()

      render(<UnauthorizedFallback onContactSupport={onContactSupport} />)

      fireEvent.click(screen.getByText('Contact Support'))
      expect(onContactSupport).toHaveBeenCalled()
    })

    it('uses default handlers when no custom handlers provided', () => {
      render(<UnauthorizedFallback />)

      fireEvent.click(screen.getByText('Go Back'))
      expect(mockGoBack).toHaveBeenCalled()
    })
  })

  describe('Specialized Components', () => {
    it('renders PermissionDeniedFallback correctly', () => {
      render(<PermissionDeniedFallback />)

      expect(screen.getByText('Permission Denied')).toBeInTheDocument()
    })

    it('renders RoleInsufficientFallback correctly', () => {
      render(<RoleInsufficientFallback />)

      expect(screen.getByText('Insufficient Role')).toBeInTheDocument()
    })

    it('renders AuthenticationRequiredFallback correctly', () => {
      render(<AuthenticationRequiredFallback />)

      expect(screen.getByText('Authentication Required')).toBeInTheDocument()
    })

    it('renders ResourceAccessDeniedFallback correctly', () => {
      render(<ResourceAccessDeniedFallback />)

      expect(screen.getByText('Resource Access Denied')).toBeInTheDocument()
    })
  })

  describe('InlineUnauthorized', () => {
    it('renders inline unauthorized message', () => {
      render(<InlineUnauthorized />)

      expect(screen.getByText('Access denied')).toBeInTheDocument()
    })

    it('renders custom message', () => {
      render(<InlineUnauthorized message="Custom inline message" />)

      expect(screen.getByText('Custom inline message')).toBeInTheDocument()
    })

    it('shows icon when enabled', () => {
      render(<InlineUnauthorized showIcon={true} />)

      const container = screen.getByText('Access denied').parentElement
      expect(container?.querySelector('svg')).toBeInTheDocument()
    })

    it('hides icon when disabled', () => {
      render(<InlineUnauthorized showIcon={false} />)

      const container = screen.getByText('Access denied').parentElement
      expect(container?.querySelector('svg')).not.toBeInTheDocument()
    })

    it('applies type-specific styling', () => {
      render(<InlineUnauthorized type="permission" />)

      const container = screen.getByText('Access denied').parentElement
      expect(container).toHaveClass('text-red-600', 'bg-red-50')
    })
  })

  describe('UnauthorizedPlaceholder', () => {
    it('renders placeholder with default height', () => {
      render(<UnauthorizedPlaceholder />)

      expect(screen.getByText('Access restricted')).toBeInTheDocument()
    })

    it('renders custom height', () => {
      render(<UnauthorizedPlaceholder height="h-64" />)

      const container = screen.getByText('Access restricted').closest('.h-64')
      expect(container).toBeInTheDocument()
    })

    it('renders custom message', () => {
      render(<UnauthorizedPlaceholder message="Custom placeholder" />)

      expect(screen.getByText('Custom placeholder')).toBeInTheDocument()
    })
  })

  describe('FeatureUnavailableFallback', () => {
    it('renders feature unavailable message', () => {
      render(<FeatureUnavailableFallback />)

      expect(screen.getByText('Feature Unavailable')).toBeInTheDocument()
      expect(screen.getByText('This feature is not available with your current permissions.')).toBeInTheDocument()
    })

    it('renders custom feature name', () => {
      render(<FeatureUnavailableFallback featureName="Advanced Analytics" />)

      expect(screen.getByText('Advanced Analytics is not available with your current permissions.')).toBeInTheDocument()
    })

    it('shows upgrade button when enabled', () => {
      const onUpgrade = jest.fn()

      render(
        <FeatureUnavailableFallback 
          showUpgrade={true}
          onUpgrade={onUpgrade}
        />
      )

      const upgradeButton = screen.getByText('Upgrade Access')
      expect(upgradeButton).toBeInTheDocument()

      fireEvent.click(upgradeButton)
      expect(onUpgrade).toHaveBeenCalled()
    })

    it('hides upgrade button when disabled', () => {
      render(<FeatureUnavailableFallback showUpgrade={false} />)

      expect(screen.queryByText('Upgrade Access')).not.toBeInTheDocument()
    })
  })

  describe('ComingSoonFallback', () => {
    it('renders coming soon message', () => {
      render(<ComingSoonFallback />)

      expect(screen.getByText('Coming Soon')).toBeInTheDocument()
      expect(screen.getByText('This feature is coming soon!')).toBeInTheDocument()
    })

    it('renders custom feature name', () => {
      render(<ComingSoonFallback featureName="New Dashboard" />)

      expect(screen.getByText('New Dashboard is coming soon!')).toBeInTheDocument()
    })

    it('shows estimated date when provided', () => {
      render(<ComingSoonFallback estimatedDate="Q2 2024" />)

      expect(screen.getByText('Expected: Q2 2024')).toBeInTheDocument()
    })

    it('hides estimated date when not provided', () => {
      render(<ComingSoonFallback />)

      expect(screen.queryByText(/Expected:/)).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('provides proper heading structure', () => {
      render(<UnauthorizedFallback />)

      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveTextContent('Access Denied')
    })

    it('provides proper button roles', () => {
      render(<UnauthorizedFallback />)

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('maintains accessibility in specialized components', () => {
      render(<FeatureUnavailableFallback showUpgrade={true} onUpgrade={() => {}} />)

      const heading = screen.getByRole('heading', { level: 3 })
      expect(heading).toBeInTheDocument()

      const button = screen.getByRole('button', { name: 'Upgrade Access' })
      expect(button).toBeInTheDocument()
    })
  })
})