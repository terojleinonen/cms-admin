/**
 * RichTextEditor Component Tests
 * Tests for rich text editing functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import RichTextEditor from '@/components/editor/RichTextEditor'

// Mock ReactQuill
jest.mock('react-quill', () => {
  return function MockReactQuill({ value, onChange, placeholder, readOnly }: any) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={readOnly}
        data-testid="editor-textarea"
      />
    )
  }
})

// Mock DOMPurify
jest.mock('dompurify', () => ({
  sanitize: jest.fn((html) => html),
}))

describe('RichTextEditor', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render editor correctly', async () => {
    render(
      <RichTextEditor
        value=""
        onChange={mockOnChange}
        placeholder="Enter content..."
      />
    )

    // Wait for the component to load (it starts with isClient = false)
    await waitFor(() => {
      expect(screen.getByTestId('editor-textarea')).toBeInTheDocument()
    })
    expect(screen.getByText('0 characters')).toBeInTheDocument()
  })

  it('should display initial value', () => {
    const initialValue = '<p>Initial content</p>'
    
    render(
      <RichTextEditor
        value={initialValue}
        onChange={mockOnChange}
      />
    )

    expect(screen.getByTestId('editor-textarea')).toHaveValue(initialValue)
  })

  it('should call onChange when content changes', () => {
    render(
      <RichTextEditor
        value=""
        onChange={mockOnChange}
      />
    )

    const textarea = screen.getByTestId('editor-textarea')
    fireEvent.change(textarea, { target: { value: '<p>New content</p>' } })

    expect(mockOnChange).toHaveBeenCalledWith('<p>New content</p>')
  })

  it('should show placeholder text', () => {
    const placeholder = 'Enter your content here...'
    
    render(
      <RichTextEditor
        value=""
        onChange={mockOnChange}
        placeholder={placeholder}
      />
    )

    expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument()
  })

  it('should handle disabled state', () => {
    render(
      <RichTextEditor
        value=""
        onChange={mockOnChange}
        disabled={true}
      />
    )

    const textarea = screen.getByTestId('editor-textarea')
    expect(textarea).toBeDisabled()
  })

  it('should apply custom height', () => {
    render(
      <RichTextEditor
        value=""
        onChange={mockOnChange}
        height="400px"
      />
    )

    // Check that the editor container has the custom height
    const container = screen.getByTestId('editor-textarea').closest('div')
    expect(container).toHaveStyle({ height: '400px' })
  })

  it('should sanitize content on change', async () => {
    const DOMPurify = require('dompurify')
    const maliciousContent = '<script>alert("xss")</script><p>Safe content</p>'
    const sanitizedContent = '<p>Safe content</p>'
    
    DOMPurify.sanitize.mockReturnValue(sanitizedContent)

    render(
      <RichTextEditor
        value=""
        onChange={mockOnChange}
      />
    )

    const textarea = screen.getByTestId('editor-textarea')
    fireEvent.change(textarea, { target: { value: maliciousContent } })

    expect(DOMPurify.sanitize).toHaveBeenCalledWith(maliciousContent, expect.any(Object))
    expect(mockOnChange).toHaveBeenCalledWith(sanitizedContent)
  })
})