/**
 * FormField Component Tests
 * Tests for form field wrapper with validation and error handling
 */

import { render, screen } from '@testing-library/react'
import FormField from '../../../app/components/ui/FormField'
import Input from '../../../app/components/ui/Input'

describe('FormField', () => {
  it('renders label when provided', () => {
    render(
      <FormField label="Test Label" name="test">
        <Input />
      </FormField>
    )
    
    expect(screen.getByText('Test Label')).toBeInTheDocument()
  })

  it('shows required indicator when required is true', () => {
    render(
      <FormField label="Test Label" name="test" required>
        <Input />
      </FormField>
    )
    
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('displays single error message', () => {
    render(
      <FormField label="Test Label" name="test" error="This field is required">
        <Input />
      </FormField>
    )
    
    expect(screen.getByText('This field is required')).toBeInTheDocument()
  })

  it('displays multiple error messages', () => {
    const errors = ['Error 1', 'Error 2']
    render(
      <FormField label="Test Label" name="test" error={errors}>
        <Input />
      </FormField>
    )
    
    expect(screen.getByText('Error 1')).toBeInTheDocument()
    expect(screen.getByText('Error 2')).toBeInTheDocument()
  })

  it('shows help text when no errors', () => {
    render(
      <FormField label="Test Label" name="test" helpText="This is help text">
        <Input />
      </FormField>
    )
    
    expect(screen.getByText('This is help text')).toBeInTheDocument()
  })

  it('hides help text when there are errors', () => {
    render(
      <FormField 
        label="Test Label" 
        name="test" 
        error="Error message"
        helpText="This is help text"
      >
        <Input />
      </FormField>
    )
    
    expect(screen.getByText('Error message')).toBeInTheDocument()
    expect(screen.queryByText('This is help text')).not.toBeInTheDocument()
  })

  it('renders children correctly', () => {
    render(
      <FormField label="Test Label" name="test">
        <input data-testid="test-input" />
      </FormField>
    )
    
    expect(screen.getByTestId('test-input')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <FormField label="Test Label" name="test" className="custom-class">
        <Input />
      </FormField>
    )
    
    expect(container.firstChild).toHaveClass('custom-class')
  })
})