/**
 * LoadingState Component Tests
 * Tests for loading state component
 */

import { render, screen } from '@testing-library/react'
import LoadingState from '@/components/ui/LoadingState'

describe('LoadingState', () => {
  it('renders with default message', () => {
    render(<LoadingState />)
    
    expect(screen.getAllByText('Loading...')[0]).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders with custom message', () => {
    render(<LoadingState message="Please wait..." />)
    
    expect(screen.getByText('Please wait...')).toBeInTheDocument()
  })

  it('renders with different sizes', () => {
    const { rerender } = render(<LoadingState size="sm" />)
    expect(screen.getByRole('status')).toHaveClass('h-4', 'w-4')
    
    rerender(<LoadingState size="lg" />)
    expect(screen.getByRole('status')).toHaveClass('h-8', 'w-8')
    
    rerender(<LoadingState size="xl" />)
    expect(screen.getByRole('status')).toHaveClass('h-12', 'w-12')
  })

  it('renders as full page when fullPage is true', () => {
    const { container } = render(<LoadingState fullPage />)
    
    expect(container.firstChild).toHaveClass('fixed', 'inset-0', 'z-50')
  })

  it('renders as section when fullPage is false', () => {
    const { container } = render(<LoadingState fullPage={false} />)
    
    expect(container.firstChild).toHaveClass('flex', 'items-center', 'justify-center', 'py-12')
    expect(container.firstChild).not.toHaveClass('fixed')
  })

  it('applies custom className', () => {
    const { container } = render(<LoadingState className="custom-class" />)
    
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('has proper accessibility attributes', () => {
    render(<LoadingState />)
    
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveAttribute('aria-label', 'Loading')
    expect(screen.getByText('Loading...', { selector: '.sr-only' })).toBeInTheDocument()
  })
})