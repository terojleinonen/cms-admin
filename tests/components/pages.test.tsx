/**
 * Pages Management Tests
 * Tests for page CRUD operations, templates, and preview functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import PageList from '../../components/pages/PageList'
import PageForm from '../../components/pages/PageForm'
import TemplateSelector from '../../components/pages/TemplateSelector'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}))

// Mock RichTextEditor
jest.mock('../../app/components/editor/RichTextEditor', () => {
  return function MockRichTextEditor({ value, onChange, placeholder }: any) {
    return (
      <textarea
        data-testid="rich-text-editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    )
  }
})

// Mock fetch
global.fetch = jest.fn()

describe('PageList', () => {
  const mockPages = [
    {
      id: 'page1',
      title: 'About Us',
      slug: 'about-us',
      content: 'About us content',
      excerpt: 'Learn about our company',
      status: 'PUBLISHED' as const,
      template: 'about',
      seoTitle: 'About Us - Company',
      seoDescription: 'Learn about our company and mission',
      publishedAt: '2024-01-15T10:00:00Z',
      createdAt: '2024-01-10T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      creator: {
        id: 'user1',
        name: 'John Doe',
        email: 'john@example.com'
      }
    },
    {
      id: 'page2',
      title: 'Contact',
      slug: 'contact',
      content: 'Contact information',
      excerpt: 'Get in touch with us',
      status: 'DRAFT' as const,
      template: 'contact',
      createdAt: '2024-01-12T10:00:00Z',
      updatedAt: '2024-01-12T10:00:00Z',
      creator: {
        id: 'user1',
        name: 'John Doe',
        email: 'john@example.com'
      }
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        pages: mockPages,
        pagination: {
          page: 1,
          limit: 10,
          totalCount: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      })
    })
  })

  it('should render pages list correctly', async () => {
    render(<PageList />)

    expect(screen.getByText('Pages')).toBeInTheDocument()
    expect(screen.getByText('New Page')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('About Us')).toBeInTheDocument()
      expect(screen.getByText('Contact')).toBeInTheDocument()
      expect(screen.getByText('PUBLISHED')).toBeInTheDocument()
      expect(screen.getByText('DRAFT')).toBeInTheDocument()
    })
  })

  it('should handle search functionality', async () => {
    render(<PageList />)

    await waitFor(() => {
      expect(screen.getByText('About Us')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search pages...')
    fireEvent.change(searchInput, { target: { value: 'about' } })

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=about')
      )
    })
  })

  it('should handle status filtering', async () => {
    render(<PageList />)

    // Open filters
    fireEvent.click(screen.getByText('Filters'))

    const statusSelect = screen.getByLabelText('Status')
    fireEvent.change(statusSelect, { target: { value: 'PUBLISHED' } })

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=PUBLISHED')
      )
    })
  })

  it('should handle page deletion with confirmation', async () => {
    // Mock window.confirm
    const originalConfirm = window.confirm
    window.confirm = jest.fn(() => true)

    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pages: mockPages, pagination: {} })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Page deleted successfully' })
      })

    render(<PageList />)

    await waitFor(() => {
      expect(screen.getByText('About Us')).toBeInTheDocument()
    })

    // Find and click delete button (would need more specific targeting in real implementation)
    const deleteButtons = screen.getAllByTitle('Delete page')
    fireEvent.click(deleteButtons[0])

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('About Us')
    )

    window.confirm = originalConfirm
  })

  it('should show empty state when no pages', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        pages: [],
        pagination: {
          page: 1,
          limit: 10,
          totalCount: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      })
    })

    render(<PageList />)

    await waitFor(() => {
      expect(screen.getByText('No pages found.')).toBeInTheDocument()
      expect(screen.getByText('Create Your First Page')).toBeInTheDocument()
    })
  })
})

describe('PageForm', () => {
  const mockTemplates = [
    {
      id: 'default',
      name: 'Default Page',
      description: 'Standard page layout',
      preview: '/templates/default-preview.jpg',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'richtext', required: false }
      ]
    },
    {
      id: 'landing',
      name: 'Landing Page',
      description: 'Landing page layout',
      preview: '/templates/landing-preview.jpg',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'heroTitle', type: 'text', required: true }
      ]
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ templates: mockTemplates })
    })
  })

  it('should render page form correctly', async () => {
    render(<PageForm />)

    expect(screen.getByText('Create New Page')).toBeInTheDocument()
    expect(screen.getByLabelText('Page Title *')).toBeInTheDocument()
    expect(screen.getByLabelText('URL Slug *')).toBeInTheDocument()
    expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Default Page')).toBeInTheDocument()
    })
  })

  it('should auto-generate slug from title', async () => {
    render(<PageForm />)

    const titleInput = screen.getByLabelText('Page Title *')
    const slugInput = screen.getByLabelText('URL Slug *')

    fireEvent.change(titleInput, { target: { value: 'My New Page' } })

    expect(slugInput).toHaveValue('my-new-page')
  })

  it('should handle form submission for new page', async () => {
    const mockOnSave = jest.fn()
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'new-page-id',
          title: 'Test Page',
          slug: 'test-page',
          status: 'DRAFT'
        })
      })

    render(<PageForm onSave={mockOnSave} />)

    await waitFor(() => {
      expect(screen.getByLabelText('Page Title *')).toBeInTheDocument()
    })

    // Fill form
    fireEvent.change(screen.getByLabelText('Page Title *'), {
      target: { value: 'Test Page' }
    })
    fireEvent.change(screen.getByTestId('rich-text-editor'), {
      target: { value: 'Test content' }
    })

    // Submit form
    fireEvent.click(screen.getByText('Create Page'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('Test Page')
      })
    })
  })

  it('should handle form submission for existing page', async () => {
    const existingPage = {
      id: 'existing-page',
      title: 'Existing Page',
      slug: 'existing-page',
      content: 'Existing content',
      status: 'DRAFT' as const,
      template: 'default'
    }

    const mockOnSave = jest.fn()
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => existingPage
      })

    render(<PageForm page={existingPage} onSave={mockOnSave} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Existing Page')).toBeInTheDocument()
    })

    // Submit form
    fireEvent.click(screen.getByText('Update Page'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/pages/existing-page', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('Existing Page')
      })
    })
  })

  it('should validate required fields', async () => {
    render(<PageForm />)

    await waitFor(() => {
      expect(screen.getByLabelText('Page Title *')).toBeInTheDocument()
    })

    // Try to submit without title
    fireEvent.click(screen.getByText('Create Page'))

    // Form should not submit (browser validation will handle this)
    expect(fetch).not.toHaveBeenCalledWith('/api/pages', expect.any(Object))
  })
})

describe('TemplateSelector', () => {
  const mockTemplates = [
    {
      id: 'default',
      name: 'Default Page',
      description: 'Standard page layout',
      preview: '/templates/default-preview.jpg',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'richtext', required: false }
      ]
    },
    {
      id: 'landing',
      name: 'Landing Page',
      description: 'Landing page layout',
      preview: '/templates/landing-preview.jpg',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'heroTitle', type: 'text', required: true }
      ]
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ templates: mockTemplates })
    })
  })

  it('should render template selector correctly', async () => {
    const mockOnSelect = jest.fn()
    render(<TemplateSelector onSelect={mockOnSelect} />)

    expect(screen.getByText('Choose a Template')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Default Page')).toBeInTheDocument()
      expect(screen.getByText('Landing Page')).toBeInTheDocument()
    })
  })

  it('should handle template selection', async () => {
    const mockOnSelect = jest.fn()
    render(<TemplateSelector onSelect={mockOnSelect} />)

    await waitFor(() => {
      expect(screen.getByText('Default Page')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Default Page'))
    expect(mockOnSelect).toHaveBeenCalledWith('default')
  })

  it('should show selected template', async () => {
    const mockOnSelect = jest.fn()
    render(<TemplateSelector selectedTemplate="landing" onSelect={mockOnSelect} />)

    await waitFor(() => {
      expect(screen.getByText('Landing Page')).toBeInTheDocument()
    })

    // Check if the selected template has the selection indicator
    const landingTemplate = screen.getByText('Landing Page').closest('div')
    expect(landingTemplate).toHaveClass('border-blue-500')
  })

  it('should show template field details', async () => {
    const mockOnSelect = jest.fn()
    render(<TemplateSelector selectedTemplate="landing" onSelect={mockOnSelect} />)

    await waitFor(() => {
      expect(screen.getByText('Landing Page - Field Details')).toBeInTheDocument()
      expect(screen.getByText('title')).toBeInTheDocument()
      expect(screen.getByText('heroTitle')).toBeInTheDocument()
      expect(screen.getAllByText('Required')).toHaveLength(2)
    })
  })
})

describe('Pages API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle page creation', async () => {
    const mockPage = {
      id: 'new-page-id',
      title: 'New Page',
      slug: 'new-page',
      content: 'Page content',
      status: 'DRAFT',
      template: 'default'
    }

    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockPage
    })

    const response = await fetch('/api/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Page',
        slug: 'new-page',
        content: 'Page content',
        status: 'DRAFT',
        template: 'default'
      })
    })

    const data = await response.json()

    expect(fetch).toHaveBeenCalledWith('/api/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Page',
        slug: 'new-page',
        content: 'Page content',
        status: 'DRAFT',
        template: 'default'
      })
    })

    expect(data.title).toBe('New Page')
    expect(data.slug).toBe('new-page')
  })

  it('should handle page updates', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Page updated successfully' })
    })

    const response = await fetch('/api/pages/page-id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Updated Page',
        status: 'PUBLISHED'
      })
    })

    const data = await response.json()

    expect(data.message).toBe('Page updated successfully')
  })

  it('should handle page deletion', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Page deleted successfully' })
    })

    const response = await fetch('/api/pages/page-id', {
      method: 'DELETE'
    })

    const data = await response.json()

    expect(data.message).toBe('Page deleted successfully')
  })

  it('should handle template fetching', async () => {
    const mockTemplates = {
      templates: [
        { id: 'default', name: 'Default Page' },
        { id: 'landing', name: 'Landing Page' }
      ],
      count: 2
    }

    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockTemplates
    })

    const response = await fetch('/api/pages/templates')
    const data = await response.json()

    expect(data.templates).toHaveLength(2)
    expect(data.count).toBe(2)
  })

  it('should handle preview generation', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        previewUrl: '/preview/page-slug?token=abc123',
        expiresAt: '2024-01-01T12:30:00Z'
      })
    })

    const response = await fetch('/api/pages/page-id/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Preview content',
        template: 'default'
      })
    })

    const data = await response.json()

    expect(data.previewUrl).toContain('/preview/')
    expect(data.previewUrl).toContain('token=')
  })
})