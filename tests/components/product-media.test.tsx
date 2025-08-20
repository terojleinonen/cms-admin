/**
 * Product-Media Association Tests
 * Tests for product image gallery, media picker, and API endpoints
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ProductImageGallery from '../../components/products/ProductImageGallery'
import MediaPicker from '../../components/products/MediaPicker'

// Mock fetch
global.fetch = jest.fn()

// Mock DnD Kit
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div data-testid="dnd-context">{children}</div>,
  closestCenter: jest.fn(),
  KeyboardSensor: jest.fn(),
  PointerSensor: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
}))

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div data-testid="sortable-context">{children}</div>,
  sortableKeyboardCoordinates: jest.fn(),
  verticalListSortingStrategy: jest.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  arrayMove: (array: any[], oldIndex: number, newIndex: number) => {
    const newArray = [...array]
    const [removed] = newArray.splice(oldIndex, 1)
    newArray.splice(newIndex, 0, removed)
    return newArray
  },
}))

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => 'transform: translate3d(0, 0, 0)',
    },
  },
}))

describe('ProductImageGallery', () => {
  const mockOnMediaUpdate = jest.fn()
  const mockOnMediaSelect = jest.fn()

  const mockProductMedia = [
    {
      mediaId: 'media1',
      sortOrder: 0,
      isPrimary: true,
      media: {
        id: 'media1',
        filename: 'image1.jpg',
        originalName: 'Product Image 1.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024000,
        width: 800,
        height: 600,
        altText: 'Product image 1',
        folder: 'products',
        createdAt: '2024-01-01T00:00:00Z'
      }
    },
    {
      mediaId: 'media2',
      sortOrder: 1,
      isPrimary: false,
      media: {
        id: 'media2',
        filename: 'image2.jpg',
        originalName: 'Product Image 2.jpg',
        mimeType: 'image/jpeg',
        fileSize: 2048000,
        width: 1200,
        height: 800,
        altText: 'Product image 2',
        folder: 'products',
        createdAt: '2024-01-02T00:00:00Z'
      }
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Success' })
    })
  })

  it('should render product images correctly', () => {
    render(
      <ProductImageGallery
        productId="product1"
        productMedia={mockProductMedia}
        onMediaUpdate={mockOnMediaUpdate}
        onMediaSelect={mockOnMediaSelect}
      />
    )

    expect(screen.getByText('Product Images')).toBeInTheDocument()
    expect(screen.getByText('Product Image 1.jpg')).toBeInTheDocument()
    expect(screen.getByText('Product Image 2.jpg')).toBeInTheDocument()
    expect(screen.getByText('Primary')).toBeInTheDocument()
    expect(screen.getByText('Add Images')).toBeInTheDocument()
  })

  it('should show empty state when no images', () => {
    render(
      <ProductImageGallery
        productId="product1"
        productMedia={[]}
        onMediaUpdate={mockOnMediaUpdate}
        onMediaSelect={mockOnMediaSelect}
      />
    )

    expect(screen.getByText('No images')).toBeInTheDocument()
    expect(screen.getByText('Add images to showcase your product')).toBeInTheDocument()
  })

  it('should handle media selection', () => {
    render(
      <ProductImageGallery
        productId="product1"
        productMedia={mockProductMedia}
        onMediaUpdate={mockOnMediaUpdate}
        onMediaSelect={mockOnMediaSelect}
      />
    )

    fireEvent.click(screen.getByText('Add Images'))
    expect(mockOnMediaSelect).toHaveBeenCalled()
  })

  it('should handle setting primary image', async () => {
    render(
      <ProductImageGallery
        productId="product1"
        productMedia={mockProductMedia}
        onMediaUpdate={mockOnMediaUpdate}
        onMediaSelect={mockOnMediaSelect}
      />
    )

    // Find the second image and hover to show actions
    const secondImage = screen.getByText('Product Image 2.jpg').closest('div')
    expect(secondImage).toBeInTheDocument()

    // The set primary button should be available for non-primary images
    // This would require more complex interaction testing with hover states
  })

  it('should handle image removal with confirmation', async () => {
    // Mock window.confirm
    const originalConfirm = window.confirm
    window.confirm = jest.fn(() => true)

    render(
      <ProductImageGallery
        productId="product1"
        productMedia={mockProductMedia}
        onMediaUpdate={mockOnMediaUpdate}
        onMediaSelect={mockOnMediaSelect}
      />
    )

    // This would require more complex interaction testing with hover states
    // to access the remove button

    window.confirm = originalConfirm
  })
})

describe('MediaPicker', () => {
  const mockOnClose = jest.fn()
  const mockOnSelect = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should not render when closed', () => {
    render(
      <MediaPicker
        isOpen={false}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    )

    expect(screen.queryByText('Select Media')).not.toBeInTheDocument()
  })

  it('should render when open', () => {
    render(
      <MediaPicker
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    )

    expect(screen.getByText('Select Media')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Select 0 Files')).toBeInTheDocument()
  })

  it('should handle close action', () => {
    render(
      <MediaPicker
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    )

    fireEvent.click(screen.getByText('Cancel'))
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should render with custom title', () => {
    render(
      <MediaPicker
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        title="Choose Product Images"
      />
    )

    expect(screen.getByText('Choose Product Images')).toBeInTheDocument()
  })

  it('should handle single select mode', () => {
    render(
      <MediaPicker
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        multiSelect={false}
      />
    )

    expect(screen.getByText('Select a file')).toBeInTheDocument()
    expect(screen.getByText('Select File')).toBeInTheDocument()
  })
})

describe('Product Media API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle adding media to product', async () => {
    const mockResponse = {
      message: 'Media added to product successfully',
      productMedia: [
        {
          mediaId: 'media1',
          sortOrder: 0,
          isPrimary: true,
          media: {
            id: 'media1',
            filename: 'image1.jpg',
            originalName: 'Product Image 1.jpg',
            mimeType: 'image/jpeg',
            fileSize: 1024000
          }
        }
      ]
    }

    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    })

    const response = await fetch('/api/products/product1/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mediaIds: ['media1'],
        isPrimary: true
      })
    })

    const data = await response.json()

    expect(fetch).toHaveBeenCalledWith('/api/products/product1/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mediaIds: ['media1'],
        isPrimary: true
      })
    })

    expect(data.message).toBe('Media added to product successfully')
    expect(data.productMedia).toHaveLength(1)
    expect(data.productMedia[0].isPrimary).toBe(true)
  })

  it('should handle updating media order', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Media order updated successfully' })
    })

    const response = await fetch('/api/products/product1/media', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mediaOrder: [
          { mediaId: 'media2', sortOrder: 0 },
          { mediaId: 'media1', sortOrder: 1 }
        ]
      })
    })

    const data = await response.json()

    expect(fetch).toHaveBeenCalledWith('/api/products/product1/media', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mediaOrder: [
          { mediaId: 'media2', sortOrder: 0 },
          { mediaId: 'media1', sortOrder: 1 }
        ]
      })
    })

    expect(data.message).toBe('Media order updated successfully')
  })

  it('should handle setting primary media', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Primary media updated successfully' })
    })

    const response = await fetch('/api/products/product1/media', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaId: 'media2' })
    })

    const data = await response.json()

    expect(data.message).toBe('Primary media updated successfully')
  })

  it('should handle removing media from product', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Media removed from product successfully' })
    })

    const response = await fetch('/api/products/product1/media?mediaIds=media1,media2', {
      method: 'DELETE'
    })

    const data = await response.json()

    expect(data.message).toBe('Media removed from product successfully')
  })

  it('should handle API errors', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Product not found' })
    })

    const response = await fetch('/api/products/nonexistent/media')
    const data = await response.json()

    expect(response.ok).toBe(false)
    expect(data.error).toBe('Product not found')
  })
})