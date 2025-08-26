/**
 * MediaPicker Component Tests
 * Tests for folder navigation, search, and media selection functionality
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import MediaPicker from '../../../app/components/products/MediaPicker'
import { Media, PaginationInfo } from '../../../app/lib/types'

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />
  }
})

// Mock fetch
global.fetch = jest.fn()

const mockMedia: Media[] = [
  {
    id: 'media-1',
    filename: 'image1.jpg',
    originalName: 'Product Image 1.jpg',
    mimeType: 'image/jpeg',
    fileSize: 1024000,
    width: 800,
    height: 600,
    altText: 'Product image 1',
    folder: 'products',
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    url: '/uploads/image1.jpg',
    thumbnailUrl: '/uploads/thumbnails/image1.jpg',
    type: 'image',
  },
  {
    id: 'media-2',
    filename: 'document1.pdf',
    originalName: 'Product Manual.pdf',
    mimeType: 'application/pdf',
    fileSize: 2048000,
    altText: 'Product manual',
    folder: 'documents',
    createdBy: 'user-1',
    createdAt: new Date('2024-01-02'),
    url: '/uploads/document1.pdf',
    type: 'document',
  },
  {
    id: 'media-3',
    filename: 'video1.mp4',
    originalName: 'Product Demo.mp4',
    mimeType: 'video/mp4',
    fileSize: 10240000,
    width: 1920,
    height: 1080,
    altText: 'Product demo video',
    folder: 'videos',
    createdBy: 'user-1',
    createdAt: new Date('2024-01-03'),
    url: '/uploads/video1.mp4',
    type: 'video',
  },
]

const mockPagination: PaginationInfo = {
  page: 1,
  limit: 20,
  total: 3,
  totalPages: 1,
}

const mockFolders = [
  { name: 'products', path: 'products', count: 5 },
  { name: 'documents', path: 'documents', count: 3 },
  { name: 'videos', path: 'videos', count: 2 },
]

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  onSelect: jest.fn(),
  multiple: false,
  selectedMedia: [],
}

describe('MediaPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful API responses
    ;(fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/media/folders')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ folders: mockFolders }),
        })
      }
      
      if (url.includes('/api/media')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            media: mockMedia,
            pagination: mockPagination,
          }),
        })
      }
      
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' }),
      })
    })
  })

  describe('Rendering', () => {
    it('renders when open', async () => {
      render(<MediaPicker {...defaultProps} />)
      
      expect(screen.getByText('Select Media')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Search media files...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /close media picker/i })).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(<MediaPicker {...defaultProps} isOpen={false} />)
      
      expect(screen.queryByText('Select Media')).not.toBeInTheDocument()
    })

    it('shows correct selection text for single selection', () => {
      render(<MediaPicker {...defaultProps} />)
      
      expect(screen.getByText('Select a file')).toBeInTheDocument()
    })

    it('shows correct selection text for multiple selection', () => {
      render(<MediaPicker {...defaultProps} multiple={true} maxSelection={5} />)
      
      expect(screen.getByText('Select up to 5 files (0 selected)')).toBeInTheDocument()
    })

    it('displays loading state', () => {
      render(<MediaPicker {...defaultProps} />)
      
      // Should show loading spinner initially
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
    })

    it('displays media items after loading', async () => {
      render(<MediaPicker {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Product Image 1.jpg')).toBeInTheDocument()
        expect(screen.getByText('Product Manual.pdf')).toBeInTheDocument()
        expect(screen.getByText('Product Demo.mp4')).toBeInTheDocument()
      })
    })

    it('displays folders sidebar when folders exist', async () => {
      render(<MediaPicker {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Folders')).toBeInTheDocument()
        expect(screen.getByText('products')).toBeInTheDocument()
        expect(screen.getByText('documents')).toBeInTheDocument()
        expect(screen.getByText('videos')).toBeInTheDocument()
      })
    })
  })

  describe('Search Functionality', () => {
    it('updates search input value', async () => {
      const user = userEvent.setup()
      render(<MediaPicker {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search media files...')
      await user.type(searchInput, 'product')
      
      expect(searchInput).toHaveValue('product')
    })

    it('calls API with search parameter', async () => {
      const user = userEvent.setup()
      render(<MediaPicker {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search media files...')
      await user.type(searchInput, 'product')
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('search=product')
        )
      })
    })
  })

  describe('Folder Navigation', () => {
    it('shows breadcrumb navigation', async () => {
      render(<MediaPicker {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('All Files')).toBeInTheDocument()
      })
    })

    it('navigates to folder when clicked', async () => {
      const user = userEvent.setup()
      render(<MediaPicker {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('products')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('products'))
      
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('folder=products')
      )
    })

    it('shows go up button when in subfolder', async () => {
      const user = userEvent.setup()
      render(<MediaPicker {...defaultProps} folder="products" />)
      
      await waitFor(() => {
        expect(screen.getByTitle('Go up one level')).toBeInTheDocument()
      })
    })

    it('navigates up when go up button is clicked', async () => {
      const user = userEvent.setup()
      render(<MediaPicker {...defaultProps} folder="products/subfolder" />)
      
      await waitFor(async () => {
        const goUpButton = screen.getByTitle('Go up one level')
        await user.click(goUpButton)
      })
      
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('folder=products')
      )
    })
  })

  describe('Media Selection', () => {
    it('selects single media item and closes', async () => {
      const user = userEvent.setup()
      render(<MediaPicker {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Product Image 1.jpg')).toBeInTheDocument()
      })
      
      const mediaItem = screen.getByText('Product Image 1.jpg').closest('div')!
      await user.click(mediaItem)
      
      expect(defaultProps.onSelect).toHaveBeenCalledWith([mockMedia[0]])
      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('allows multiple selection when multiple is true', async () => {
      const user = userEvent.setup()
      render(<MediaPicker {...defaultProps} multiple={true} />)
      
      await waitFor(() => {
        expect(screen.getByText('Product Image 1.jpg')).toBeInTheDocument()
      })
      
      // Select first item
      const firstItem = screen.getByText('Product Image 1.jpg').closest('div')!
      await user.click(firstItem)
      
      // Select second item
      const secondItem = screen.getByText('Product Manual.pdf').closest('div')!
      await user.click(secondItem)
      
      // Should show selection count
      expect(screen.getByText('2 of 10 files selected')).toBeInTheDocument()
      
      // Should not close automatically
      expect(defaultProps.onClose).not.toHaveBeenCalled()
    })

    it('deselects item when clicked again in multiple mode', async () => {
      const user = userEvent.setup()
      render(<MediaPicker {...defaultProps} multiple={true} />)
      
      await waitFor(() => {
        expect(screen.getByText('Product Image 1.jpg')).toBeInTheDocument()
      })
      
      const mediaItem = screen.getByText('Product Image 1.jpg').closest('div')!
      
      // Select item
      await user.click(mediaItem)
      expect(screen.getByText('1 of 10 files selected')).toBeInTheDocument()
      
      // Deselect item
      await user.click(mediaItem)
      expect(screen.getByText('0 of 10 files selected')).toBeInTheDocument()
    })

    it('respects maxSelection limit', async () => {
      const user = userEvent.setup()
      render(<MediaPicker {...defaultProps} multiple={true} maxSelection={1} />)
      
      await waitFor(() => {
        expect(screen.getByText('Product Image 1.jpg')).toBeInTheDocument()
      })
      
      // Select first item
      const firstItem = screen.getByText('Product Image 1.jpg').closest('div')!
      await user.click(firstItem)
      
      // Try to select second item - should be disabled
      const secondItem = screen.getByText('Product Manual.pdf').closest('div')!
      expect(secondItem).toHaveClass('opacity-50', 'cursor-not-allowed')
    })

    it('shows selection indicators', async () => {
      const user = userEvent.setup()
      render(<MediaPicker {...defaultProps} multiple={true} />)
      
      await waitFor(() => {
        expect(screen.getByText('Product Image 1.jpg')).toBeInTheDocument()
      })
      
      const mediaItem = screen.getByText('Product Image 1.jpg').closest('div')!
      await user.click(mediaItem)
      
      // Should show checkmark and blue border
      expect(mediaItem).toHaveClass('border-blue-500', 'ring-2', 'ring-blue-200')
      expect(mediaItem.querySelector('.bg-blue-600')).toBeInTheDocument()
    })
  })

  describe('Media Type Display', () => {
    it('displays images with thumbnails', async () => {
      render(<MediaPicker {...defaultProps} />)
      
      await waitFor(() => {
        const image = screen.getByAltText('Product image 1')
        expect(image).toBeInTheDocument()
        expect(image).toHaveAttribute('src', '/uploads/thumbnails/image1.jpg')
      })
    })

    it('displays non-image files with type icons', async () => {
      render(<MediaPicker {...defaultProps} />)
      
      await waitFor(() => {
        const documentItem = screen.getByText('Product Manual.pdf').closest('div')!
        expect(documentItem.querySelector('.bg-blue-100')).toBeInTheDocument()
      })
    })

    it('shows file sizes', async () => {
      render(<MediaPicker {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('1000 KB')).toBeInTheDocument() // 1024000 bytes
        expect(screen.getByText('2000 KB')).toBeInTheDocument() // 2048000 bytes
      })
    })
  })

  describe('Pagination', () => {
    it('shows pagination when multiple pages exist', async () => {
      const multiPagePagination = {
        page: 1,
        limit: 20,
        total: 50,
        totalPages: 3,
      }
      
      ;(fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/media')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              media: mockMedia,
              pagination: multiPagePagination,
            }),
          })
        }
        return Promise.resolve({ ok: false })
      })
      
      render(<MediaPicker {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
        expect(screen.getByText('Showing 1 to 20 of 50 results')).toBeInTheDocument()
      })
    })

    it('navigates to next page', async () => {
      const user = userEvent.setup()
      const multiPagePagination = {
        page: 1,
        limit: 20,
        total: 50,
        totalPages: 3,
      }
      
      ;(fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/media')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              media: mockMedia,
              pagination: multiPagePagination,
            }),
          })
        }
        return Promise.resolve({ ok: false })
      })
      
      render(<MediaPicker {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
      })
      
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2')
      )
    })
  })

  describe('Multiple Selection Footer', () => {
    it('shows footer with selection count in multiple mode', async () => {
      render(<MediaPicker {...defaultProps} multiple={true} />)
      
      await waitFor(() => {
        expect(screen.getByText('0 of 10 files selected')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /select/i })).toBeInTheDocument()
      })
    })

    it('disables select button when no items selected', async () => {
      render(<MediaPicker {...defaultProps} multiple={true} />)
      
      await waitFor(() => {
        const selectButton = screen.getByRole('button', { name: /select/i })
        expect(selectButton).toBeDisabled()
      })
    })

    it('enables select button when items are selected', async () => {
      const user = userEvent.setup()
      render(<MediaPicker {...defaultProps} multiple={true} />)
      
      await waitFor(() => {
        expect(screen.getByText('Product Image 1.jpg')).toBeInTheDocument()
      })
      
      const mediaItem = screen.getByText('Product Image 1.jpg').closest('div')!
      await user.click(mediaItem)
      
      const selectButton = screen.getByRole('button', { name: /select \(1\)/i })
      expect(selectButton).toBeEnabled()
    })

    it('calls onSelect with selected items when confirm button clicked', async () => {
      const user = userEvent.setup()
      render(<MediaPicker {...defaultProps} multiple={true} />)
      
      await waitFor(() => {
        expect(screen.getByText('Product Image 1.jpg')).toBeInTheDocument()
      })
      
      // Select an item
      const mediaItem = screen.getByText('Product Image 1.jpg').closest('div')!
      await user.click(mediaItem)
      
      // Click confirm
      const selectButton = screen.getByRole('button', { name: /select \(1\)/i })
      await user.click(selectButton)
      
      expect(defaultProps.onSelect).toHaveBeenCalledWith([mockMedia[0]])
      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  describe('Close Functionality', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup()
      render(<MediaPicker {...defaultProps} />)
      
      const closeButton = screen.getByRole('button', { name: /close media picker/i })
      await user.click(closeButton)
      
      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('calls onClose when cancel button is clicked in multiple mode', async () => {
      const user = userEvent.setup()
      render(<MediaPicker {...defaultProps} multiple={true} />)
      
      await waitFor(async () => {
        const cancelButton = screen.getByRole('button', { name: /cancel/i })
        await user.click(cancelButton)
      })
      
      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      ;(fetch as jest.Mock).mockRejectedValue(new Error('API Error'))
      
      render(<MediaPicker {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('No media found')).toBeInTheDocument()
      })
    })

    it('shows empty state when no media found', async () => {
      ;(fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ media: [], pagination: mockPagination }),
        })
      )
      
      render(<MediaPicker {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('No media found')).toBeInTheDocument()
        expect(screen.getByText('Upload some files to get started.')).toBeInTheDocument()
      })
    })

    it('shows search-specific empty state', async () => {
      const user = userEvent.setup()
      
      ;(fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ media: [], pagination: mockPagination }),
        })
      )
      
      render(<MediaPicker {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search media files...')
      await user.type(searchInput, 'nonexistent')
      
      await waitFor(() => {
        expect(screen.getByText('Try adjusting your search terms.')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<MediaPicker {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /close media picker/i })).toBeInTheDocument()
    })

    it('provides proper alt text for images', async () => {
      render(<MediaPicker {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByAltText('Product image 1')).toBeInTheDocument()
      })
    })
  })
})