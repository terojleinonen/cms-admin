/**
 * Category Components Tests
 * Tests for category management UI components
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import CategoryForm from '@/components/categories/CategoryForm'
import CategorySelector from '@/components/categories/CategorySelector'

// Mock fetch
global.fetch = jest.fn()

describe('CategoryForm', () => {
  const mockOnClose = jest.fn()
  const mockOnSuccess = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render create form correctly', () => {
    render(
      <CategoryForm
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByText('Create Category')).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/slug/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/active/i)).toBeInTheDocument()
  })

  it('should render edit form correctly', () => {
    const mockCategory = {
      id: '1',
      name: 'Test Category',
      slug: 'test-category',
      description: 'Test description',
      parentId: null,
      sortOrder: 1,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    render(
      <CategoryForm
        category={mockCategory}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByText('Edit Category')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Category')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test-category')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument()
  })

  it('should auto-generate slug from name', () => {
    render(
      <CategoryForm
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const nameInput = screen.getByLabelText(/name/i)
    const slugInput = screen.getByLabelText(/slug/i)

    fireEvent.change(nameInput, { target: { value: 'Office Furniture' } })

    expect(slugInput).toHaveValue('office-furniture')
  })

  it('should show parent category info when creating child', () => {
    const parentCategory = {
      id: '1',
      name: 'Parent Category',
      slug: 'parent-category',
      description: null,
      parentId: null,
      sortOrder: 1,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    render(
      <CategoryForm
        parentCategory={parentCategory}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByText(/creating subcategory under/i)).toBeInTheDocument()
    expect(screen.getByText('Parent Category')).toBeInTheDocument()
  })

  it('should call onClose when cancel is clicked', () => {
    render(
      <CategoryForm
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    fireEvent.click(screen.getByText('Cancel'))
    expect(mockOnClose).toHaveBeenCalled()
  })
})

describe('CategorySelector', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        categories: [
          {
            id: '1',
            name: 'Furniture',
            slug: 'furniture',
            children: [
              {
                id: '2',
                name: 'Desks',
                slug: 'desks',
                children: [],
              },
            ],
          },
          {
            id: '3',
            name: 'Lighting',
            slug: 'lighting',
            children: [],
          },
        ],
      }),
    })
  })

  it('should render selector with placeholder', async () => {
    render(
      <CategorySelector
        selectedCategories={[]}
        onChange={mockOnChange}
        placeholder="Select categories..."
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Select categories...')).toBeInTheDocument()
    })
  })

  it('should show selected categories count', async () => {
    render(
      <CategorySelector
        selectedCategories={['1', '2']}
        onChange={mockOnChange}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('2 categories selected')).toBeInTheDocument()
    })
  })

  it('should open dropdown when clicked', async () => {
    render(
      <CategorySelector
        selectedCategories={[]}
        onChange={mockOnChange}
      />
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search categories...')).toBeInTheDocument()
    })
  })

  it('should respect max selections limit', async () => {
    render(
      <CategorySelector
        selectedCategories={['1']}
        onChange={mockOnChange}
        maxSelections={1}
      />
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox')
      const secondCheckbox = checkboxes.find(cb => !(cb as HTMLInputElement).checked)
      expect(secondCheckbox).toBeDisabled()
    })
  })
})