/**
 * PermissionErrorBoundary Component Tests
 * Tests for permission error boundary and fallback handling
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import PermissionErrorBoundary, { 
  PermissionError, 
  AuthenticationError,
  withPermissionErrorBoundary,
  usePermissionError
} from '../../../app/components/auth/PermissionErrorBoundary'

// Mock the UI components
jest.mock('../../../app/components/ui/Button', () => {
  return function MockButton({ children, onClick, variant, ...props }: any) {
    return <button onClick={onClick} {...props}>{children}</button>
  }
})

jest.mock('../../../app/components/ui/ErrorMessage', () => {
  return function MockErrorMessage({ message }: any) {
    return <div>{message}</div>
  }
})

// Mock session provider
const mockSession = {
  user: { id: '1', email: 'test@example.com', role: 'VIEWER' },
  expires: '2024-01-01',
}

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SessionProvider session={mockSession}>
    {children}
  </SessionProvider>
)

// Test component that throws errors
const ErrorThrowingComponent: React.FC<{ 
  errorType?: 'permission' | 'authentication' | 'generic' 
}> = ({ errorType = 'generic' }) => {
  const handleClick = () => {
    switch (errorType) {
      case 'permission':
        throw new PermissionError(
          'Access denied to resource',
          'PERMISSION_DENIED',
          'products.create',
          'VIEWER',
          'products'
        )
      case 'authentication':
        throw new AuthenticationError(
          'Session expired',
          'SESSION_EXPIRED',
          '/auth/login'
        )
      default:
        throw new Error('Generic error occurred')
    }
  }

  return (
    <div>
      <button onClick={handleClick}>Trigger Error</button>
      <div>Normal content</div>
    </div>
  )
}

// Test component using the error hook
const ErrorHookComponent: React.FC = () => {
  const { throwPermissionError, throwAuthenticationError } = usePermissionError()

  return (
    <div>
      <button 
        onClick={() => throwPermissionError('Permission denied', 'PERMISSION_DENIED')}
        data-testid="permission-error-btn"
      >
        Throw Permission Error
      </button>
      <button 
        onClick={() => throwAuthenticationError('Not authenticated', 'NOT_AUTHENTICATED')}
        data-testid="auth-error-btn"
      >
        Throw Auth Error
      </button>
    </div>
  )
}

describe('PermissionErrorBoundary', () => {
  beforeEach(() => {
    // Clear console errors for clean test output
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Normal Operation', () => {
    it('renders children when no error occurs', () => {
      render(
        <TestWrapper>
          <PermissionErrorBoundary>
            <div>Test content</div>
          </PermissionErrorBoundary>
        </TestWrapper>
      )

      expect(screen.getByText('Test content')).toBeInTheDocument()
    })

    it('does not interfere with normal component behavior', () => {
      render(
        <TestWrapper>
          <PermissionErrorBoundary>
            <button>Click me</button>
          </PermissionErrorBoundary>
        </TestWrapper>
      )

      const button = screen.getByRole('button', { name: 'Click me' })
      expect(button).toBeInTheDocument()
      fireEvent.click(button)
      // Should not throw or cause issues
    })
  })

  describe('Permission Error Handling', () => {
    it('catches and displays permission errors', () => {
      render(
        <TestWrapper>
          <PermissionErrorBoundary>
            <ErrorThrowingComponent errorType="permission" />
          </PermissionErrorBoundary>
        </TestWrapper>
      )

      // Trigger the error
      fireEvent.click(screen.getByText('Trigger Error'))

      // Check error UI is displayed
      expect(screen.getByText('Access Denied')).toBeInTheDocument()
      expect(screen.getByText('Access denied to resource')).toBeInTheDocument()
      expect(screen.getByText('Go Back')).toBeInTheDocument()
      expect(screen.getByText('Go to Dashboard')).toBeInTheDocument()
    })

    it('shows error details when enabled', () => {
      render(
        <TestWrapper>
          <PermissionErrorBoundary showErrorDetails={true}>
            <ErrorThrowingComponent errorType="permission" />
          </PermissionErrorBoundary>
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('Trigger Error'))

      expect(screen.getByText('Error Code:')).toBeInTheDocument()
      expect(screen.getByText('PERMISSION_DENIED')).toBeInTheDocument()
      expect(screen.getByText('Required Permission:')).toBeInTheDocument()
      expect(screen.getByText('products.create')).toBeInTheDocument()
    })

    it('calls onError callback when error occurs', () => {
      const onError = jest.fn()
      
      render(
        <TestWrapper>
          <PermissionErrorBoundary onError={onError}>
            <ErrorThrowingComponent errorType="permission" />
          </PermissionErrorBoundary>
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('Trigger Error'))

      expect(onError).toHaveBeenCalledWith(
        expect.any(PermissionError),
        expect.any(Object)
      )
    })
  })

  describe('Authentication Error Handling', () => {
    it('catches and displays authentication errors', () => {
      render(
        <TestWrapper>
          <PermissionErrorBoundary>
            <ErrorThrowingComponent errorType="authentication" />
          </PermissionErrorBoundary>
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('Trigger Error'))

      expect(screen.getByText('Authentication Required')).toBeInTheDocument()
      expect(screen.getByText('Session expired')).toBeInTheDocument()
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })

    it('provides correct redirect URL for authentication', () => {
      // Mock window.location.href
      delete (window as any).location
      window.location = { href: '' } as any

      render(
        <TestWrapper>
          <PermissionErrorBoundary>
            <ErrorThrowingComponent errorType="authentication" />
          </PermissionErrorBoundary>
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('Trigger Error'))
      fireEvent.click(screen.getByText('Sign In'))

      expect(window.location.href).toBe('/auth/login')
    })
  })

  describe('Generic Error Handling', () => {
    it('catches and displays generic errors', () => {
      render(
        <TestWrapper>
          <PermissionErrorBoundary>
            <ErrorThrowingComponent errorType="generic" />
          </PermissionErrorBoundary>
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('Trigger Error'))

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument()
    })

    it('shows retry functionality', () => {
      render(
        <TestWrapper>
          <PermissionErrorBoundary enableRetry={true}>
            <ErrorThrowingComponent errorType="generic" />
          </PermissionErrorBoundary>
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('Trigger Error'))

      const retryButton = screen.getByText(/Try Again/)
      expect(retryButton).toBeInTheDocument()
      
      // Click retry should reset the error boundary
      fireEvent.click(retryButton)
      expect(screen.getByText('Normal content')).toBeInTheDocument()
    })

    it('limits retry attempts', () => {
      render(
        <TestWrapper>
          <PermissionErrorBoundary enableRetry={true}>
            <ErrorThrowingComponent errorType="generic" />
          </PermissionErrorBoundary>
        </TestWrapper>
      )

      // Trigger error multiple times
      for (let i = 0; i < 4; i++) {
        fireEvent.click(screen.getByText('Trigger Error'))
        if (i < 3) {
          fireEvent.click(screen.getByText(/Try Again/))
        }
      }

      // After max retries, button should not be available
      expect(screen.queryByText(/Try Again/)).not.toBeInTheDocument()
    })
  })

  describe('Custom Fallback', () => {
    it('renders custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>

      render(
        <TestWrapper>
          <PermissionErrorBoundary fallback={customFallback}>
            <ErrorThrowingComponent />
          </PermissionErrorBoundary>
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('Trigger Error'))

      expect(screen.getByText('Custom error message')).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })

    it('uses custom error handler when provided', () => {
      const customErrorHandler = jest.fn().mockReturnValue(<div>Custom handler</div>)

      render(
        <TestWrapper>
          <PermissionErrorBoundary customErrorHandler={customErrorHandler}>
            <ErrorThrowingComponent />
          </PermissionErrorBoundary>
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('Trigger Error'))

      expect(customErrorHandler).toHaveBeenCalledWith(expect.any(Error))
      expect(screen.getByText('Custom handler')).toBeInTheDocument()
    })
  })

  describe('Higher-Order Component', () => {
    it('wraps component with error boundary', () => {
      const TestComponent = () => <div>Wrapped component</div>
      const WrappedComponent = withPermissionErrorBoundary(TestComponent)

      render(
        <TestWrapper>
          <WrappedComponent />
        </TestWrapper>
      )

      expect(screen.getByText('Wrapped component')).toBeInTheDocument()
    })

    it('passes error boundary props to HOC', () => {
      const TestComponent = () => {
        throw new Error('Test error')
      }
      const WrappedComponent = withPermissionErrorBoundary(TestComponent, {
        enableRetry: false
      })

      render(
        <TestWrapper>
          <WrappedComponent />
        </TestWrapper>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.queryByText(/Try Again/)).not.toBeInTheDocument()
    })
  })

  describe('Error Hook', () => {
    it('provides permission error throwing function', () => {
      render(
        <TestWrapper>
          <PermissionErrorBoundary>
            <ErrorHookComponent />
          </PermissionErrorBoundary>
        </TestWrapper>
      )

      fireEvent.click(screen.getByTestId('permission-error-btn'))

      expect(screen.getByText('Access Denied')).toBeInTheDocument()
      expect(screen.getByText('Permission denied')).toBeInTheDocument()
    })

    it('provides authentication error throwing function', () => {
      render(
        <TestWrapper>
          <PermissionErrorBoundary>
            <ErrorHookComponent />
          </PermissionErrorBoundary>
        </TestWrapper>
      )

      fireEvent.click(screen.getByTestId('auth-error-btn'))

      expect(screen.getByText('Authentication Required')).toBeInTheDocument()
      expect(screen.getByText('Not authenticated')).toBeInTheDocument()
    })
  })

  describe('Error Logging', () => {
    it('logs permission errors for monitoring', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      render(
        <TestWrapper>
          <PermissionErrorBoundary>
            <ErrorThrowingComponent errorType="permission" />
          </PermissionErrorBoundary>
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('Trigger Error'))

      expect(consoleSpy).toHaveBeenCalledWith(
        'Permission Error Logged:',
        expect.objectContaining({
          type: 'PermissionError',
          code: 'PERMISSION_DENIED',
          requiredPermission: 'products.create',
          userRole: 'VIEWER',
          resource: 'products'
        })
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <PermissionErrorBoundary>
            <ErrorThrowingComponent />
          </PermissionErrorBoundary>
        </TestWrapper>
      )

      fireEvent.click(screen.getByText('Trigger Error'))

      // Check for proper button roles and labels
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
      
      // Check for proper heading structure
      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toBeInTheDocument()
    })
  })
})