/**
 * Product Components Tests
 * Tests for product management UI components
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useRouter } from 'next/navigation'
import ProductForm from '@/components/products/ProductForm'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

// Mock CategorySelector
jest.mock('@/components/categories/CategorySelector', () => {
  return function MockCategorySelector({ selectedCategories, onChange }: any) {
    return (
      <div data-testid="category-selector">
        <button
          onClick={() => onChange(['category-1', 'category-2'])}
          data-testid="select-categories"
        >
          Select Categories ({selectedCategories.length} selected)
        </button>
      </div>
    )
  }
})

describe('ProductForm', () => {
  const mockPush = jest.fn()
  const mockBack = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
    })
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ product: { id: '1', name: 'Test Product' } }),
    })
  })

  it('should render create form correctly', () => {
    render(<ProductForm />)

    expect(screen.getByText('Basic Information')).toBeInTheDocument()
    expect(screen.getByLabelText(/product name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/url slug/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^price/i)).toBeInTheDocument()
    expect(screen.getByText('Create Product')).toBeInTheDocument()
  })

  it('should render edit form correctly', () => {
    const mockProduct = {
      id: '1',
      name: 'Test Product',
      slug: 'test-product',
      description: 'Test description',
      shortDescription: 'Short desc',
      price: 99.99,
      comparePrice: 149.99,
      sku: 'TEST-001',
      inventoryQuantity: 10,
      weight: 5.5,
      dimensions: null,
      status: 'PUBLISHED' as const,
      featured: true,
      seoTitle: 'SEO Title',
      seoDescription: 'SEO Description',
      createdBy: 'user-1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      categories: [
        {
          productId: '1',
          categoryId: 'cat-1',
          category: {
            id: 'cat-1',
            name: 'Test Category',
            slug: 'test-category',
            description: null,
            parentId: null,
            sortOrder: 1,
            isActive: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        },
      ],
    }

    render(<ProductForm product={mockProduct} />)

    expect(screen.getByDisplayValue('Test Product')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test-product')).toBeInTheDocument()
    expect(screen.getByDisplayValue('99.99')).toBeInTheDocument()
    expect(screen.getByDisplayValue('149.99')).toBeInTheDocument()
    expect(screen.getByDisplayValue('TEST-001')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10')).toBeInTheDocument()
    expect(screen.getByText('Update Product')).toBeInTheDocument()
  })

  it('should auto-generate slug from name', () => {
    render(<ProductForm />)

    const nameInput = screen.getByLabelText(/product name/i)
    const slugInput = screen.getByLabelText(/url slug/i)

    fireEvent.change(nameInput, { target: { value: 'Office Desk & Chair' } })

    expect(slugInput).toHaveValue('office-desk-chair')
  })

  it('should handle form submission for new product', async () => {
    render(<ProductForm />)

    // Fill out form
    fireEvent.change(screen.getByLabelText(/product name/i), {
      target: { value: 'New Product' },
    })
    fireEvent.change(screen.getByLabelText(/^price/i), {
      target: { value: '199.99' },
    })
    fireEvent.change(screen.getByLabelText(/inventory quantity/i), {
      target: { value: '5' },
    })

    // Submit form
    fireEvent.click(screen.getByText('Create Product'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"name":"New Product"'),
      })
    })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/products')
    })
  })

  it('should handle form submission for existing product', async () => {
    const mockProduct = {
      id: '1',
      name: 'Existing Product',
      slug: 'existing-product',
      price: 99.99,
      inventoryQuantity: 10,
      status: 'DRAFT' as const,
      featured: false,
      createdBy: 'user-1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      categories: [],
    }

    render(<ProductForm product={mockProduct} />)

    // Update name
    fireEvent.change(screen.getByLabelText(/product name/i), {
      target: { value: 'Updated Product' },
    })

    // Submit form
    fireEvent.click(screen.getByText('Update Product'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/products/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"name":"Updated Product"'),
      })
    })
  })

  it('should handle category selection', async () => {
    render(<ProductForm />)

    const categorySelector = screen.getByTestId('category-selector')
    expect(categorySelector).toBeInTheDocument()

    // Select categories
    fireEvent.click(screen.getByTestId('select-categories'))

    // Check that categories are selected (mocked behavior)
    expect(screen.getByText('Select Categories (2 selected)')).toBeInTheDocument()
  })

  it('should handle form validation errors', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Product with this slug already exists' }),
    })

    render(<ProductForm />)

    // Fill out form with duplicate slug
    fireEvent.change(screen.getByLabelText(/product name/i), {
      target: { value: 'Duplicate Product' },
    })
    fireEvent.change(screen.getByLabelText(/^price/i), {
      target: { value: '99.99' },
    })

    // Submit form
    fireEvent.click(screen.getByText('Create Product'))

    await waitFor(() => {
      expect(screen.getByText('Product with this slug already exists')).toBeInTheDocument()
    })
  })

  it('should handle cancel action', () => {
    render(<ProductForm />)

    fireEvent.click(screen.getByText('Cancel'))

    expect(mockBack).toHaveBeenCalled()
  })

  it('should handle featured product toggle', () => {
    render(<ProductForm />)

    const featuredCheckbox = screen.getByLabelText(/featured product/i)
    expect(featuredCheckbox).not.toBeChecked()

    fireEvent.click(featuredCheckbox)
    expect(featuredCheckbox).toBeChecked()
  })

  it('should handle status selection', () => {
    render(<ProductForm />)

    const statusSelect = screen.getByLabelText(/status/i)
    fireEvent.change(statusSelect, { target: { value: 'PUBLISHED' } })

    expect(statusSelect).toHaveValue('PUBLISHED')
  })

  it('should handle price inputs correctly', () => {
    render(<ProductForm />)

    const priceInput = screen.getByLabelText(/^price/i)
    const comparePriceInput = screen.getByLabelText(/compare price/i)

    fireEvent.change(priceInput, { target: { value: '199.99' } })
    fireEvent.change(comparePriceInput, { target: { value: '249.99' } })

    expect(priceInput).toHaveValue(199.99)
    expect(comparePriceInput).toHaveValue(249.99)
  })
})