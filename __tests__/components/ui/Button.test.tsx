/**
 * Button Component Tests
 * Tests for reusable button component
 */

import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from '../../../app/components/ui/Button'

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>)
    
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('handles click events', async () => {
    const mockClick = jest.fn()
    const user = userEvent.setup()
    
    render(<Button onClick={mockClick}>Click me</Button>)
    
    await user.click(screen.getByRole('button'))
    
    expect(mockClick).toHaveBeenCalledTimes(1)
  })

  it('applies different variants', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600')
    
    rerender(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-gray-600')
    
    rerender(<Button variant="outline">Outline</Button>)
    expect(screen.getByRole('button')).toHaveClass('border', 'border-gray-300')
    
    rerender(<Button variant="ghost">Ghost</Button>)
    expect(screen.getByRole('button')).toHaveClass('text-gray-700')
    
    rerender(<Button variant="danger">Danger</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-red-600')
  })

  it('applies different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1.5', 'text-sm')
    
    rerender(<Button size="md">Medium</Button>)
    expect(screen.getByRole('button')).toHaveClass('px-4', 'py-2', 'text-sm')
    
    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-base')
  })

  it('shows loading state', () => {
    render(<Button loading>Loading</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button.querySelector('svg')).toBeInTheDocument()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled when loading is true', () => {
    render(<Button loading>Loading</Button>)
    
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('applies full width when fullWidth is true', () => {
    render(<Button fullWidth>Full Width</Button>)
    
    expect(screen.getByRole('button')).toHaveClass('w-full')
  })

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    
    expect(screen.getByRole('button')).toHaveClass('custom-class')
  })

  it('forwards ref correctly', () => {
    const ref = jest.fn()
    
    render(<Button ref={ref}>Button</Button>)
    
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLButtonElement))
  })

  it('passes through HTML button attributes', () => {
    render(
      <Button type="submit" data-testid="submit-button">
        Submit
      </Button>
    )
    
    const button = screen.getByTestId('submit-button')
    expect(button).toHaveAttribute('type', 'submit')
  })

  it('prevents click when disabled', async () => {
    const mockClick = jest.fn()
    const user = userEvent.setup()
    
    render(<Button disabled onClick={mockClick}>Disabled</Button>)
    
    await user.click(screen.getByRole('button'))
    
    expect(mockClick).not.toHaveBeenCalled()
  })

  it('prevents click when loading', async () => {
    const mockClick = jest.fn()
    const user = userEvent.setup()
    
    render(<Button loading onClick={mockClick}>Loading</Button>)
    
    await user.click(screen.getByRole('button'))
    
    expect(mockClick).not.toHaveBeenCalled()
  })
})