/**
 * ProductMediaManager Component Tests
 * Tests for the comprehensive media management component
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import ProductMediaManager from '../../../app/components/products/ProductMediaManager'
import { Media, ProductMedia } from '../../../app/lib/types'

// Mock child components
jest.mock('../../../app/components/products/ProductImageGallery', () => {
  return function MockProductImageGallery({ onAddImages, onImageReorder, onImageRemove, onPrimaryImageChange }: any) {
    return (
      <div data-testid="product-image-gallery">
        <button onClick={onAddImages}>Add Images</button>
        <button onClick={() => onImageReorder([])}>Reorder</button>
        <button onClick={() => onImageRemove('media-1')}>Remove</button>
        <button onClick={() => onPrimaryImageChange('media-1')}>Set Primary</button>
      </div>
    )
  }
})

jest.mock('../../../app/components/products/MediaPicker', () => {
  return function MockMediaPicker({ isOpen, onClose, onSelect }: any) {
    if (!isOpen) return null
    return (
      <div data-testid="media-picker">
        <button onClick={onClose}>Close</button>
        <button onClick={() => onSelect([mockMedia[0]])}>Select Media</button>
      </div>
    )
  }
})

jest.mock('../../../app/components/products/ImageUpload', () => {
  return function MockImageUpload({ onUploadComplete, onClose }: any) {
    return (
      <div data-testid="image-upload">
        <button onClick={onClose}>Close Upload</button>
        <button onClick={() => onUploadComplete([mockUploadedFile])}>Upload Complete</button>
      </div>
    )
  }
})

// Mock data
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
]

const mockProductMedia: ProductMedia[] = [
  {
    productId: 'product-1',
    mediaId: 'media-1',
    sortOrder: 0,
    isPrimary: true,
    media: mockMedia[0],
  },
]

const mockUploadedFile = {
  id: 'media-2',
  filename: 'image2.jpg',
  originalName: 'Product Image 2.jpg',
  mimeType: 'image/jpeg',
  fileSize: 2048000,
  width: 1200,
  height: 900,
  altText: 'Product image 2',
  folder: 'products',
  createdBy: 'user-1',
  createdAt: '2024-01-02T00:00:00.000Z',
  url: '/uploads/image2.jpg',
  thumbnailUrl: '/uploads/thumbnails/image2.jpg',
  type: 'image',
}

const defaultProps = {
  productId: 'product-1',
  images: mockProductMedia,
  onImagesChange: jest.fn(),
}

describe('ProductMediaManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the product image gallery', () => {
      render(<ProductMediaManager {...defaultProps} />)
      
      expect(screen.getByTestId('product-image-gallery')).toBeInTheDocument()
    })

    it('shows add images options when can add more', () => {
      render(<ProductMediaManager {...defaultProps} images={[]} />)
      
      expect(screen.getByText('Choose from Library')).toBeInTheDocument()
      expect(screen.getByText('Upload New Images')).toBeInTheDocument()
    })

    it('hides add images options when at maximum', () => {
      const maxImages = Array.from({ length: 10 }, (_, i) => ({
        ...mockProductMedia[0],
        mediaId: `media-${i + 1}`,
        media: { ...mockMedia[0], id: `media-${i + 1}` },
      }))

      render(<ProductMediaManager {...defaultProps} images={maxImages} maxImages={10} />)
      
      expect(screen.queryByText('Choose from Library')).not.toBeInTheDocument()
      expect(screen.queryByText('Upload New Images')).not.toBeInTheDocument()
    })
  })

  describe('Gallery Interactions', () => {
    it('handles image reordering', async () => {
      const user = userEvent.setup()
      render(<ProductMediaManager {...defaultProps} />)
      
      await user.click(screen.getByText('Reorder'))
      
      expect(defaultProps.onImagesChange).toHaveBeenCalledWith([])
    })

    it('handles image removal', async () => {
      const user = userEvent.setup()
      render(<ProductMediaManager {...defaultProps} />)
      
      await user.click(screen.getByText('Remove'))
      
      expect(defaultProps.onImagesChange).toHaveBeenCalledWith([])
    })

    it('handles primary image change', async () => {
      const user = userEvent.setup()
      render(<ProductMediaManager {...defaultProps} />)
      
      await user.click(screen.getByText('Set Primary'))
      
      expect(defaultProps.onImagesChange).toHaveBeenCalledWith([
        {
          ...mockProductMedia[0],
          isPrimary: true,
        },
      ])
    })

    it('opens media picker when add images is clicked from gallery', async () => {
      const user = userEvent.setup()
      render(<ProductMediaManager {...defaultProps} />)
      
      await user.click(screen.getByText('Add Images'))
      
      expect(screen.getByTestId('media-picker')).toBeInTheDocument()
    })
  })

  describe('Media Picker', () => {
    it('opens media picker when choose from library is clicked', async () => {
      const user = userEvent.setup()
      render(<ProductMediaManager {...defaultProps} images={[]} />)
      
      await user.click(screen.getByText('Choose from Library'))
      
      expect(screen.getByTestId('media-picker')).toBeInTheDocument()
    })

    it('closes media picker when close is clicked', async () => {
      const user = userEvent.setup()
      render(<ProductMediaManager {...defaultProps} images={[]} />)
      
      await user.click(screen.getByText('Choose from Library'))
      expect(screen.getByTestId('media-picker')).toBeInTheDocument()
      
      await user.click(screen.getByText('Close'))
      expect(screen.queryByTestId('media-picker')).not.toBeInTheDocument()
    })

    it('adds selected media to images', async () => {
      const user = userEvent.setup()
      render(<ProductMediaManager {...defaultProps} images={[]} />)
      
      await user.click(screen.getByText('Choose from Library'))
      await user.click(screen.getByText('Select Media'))
      
      expect(defaultProps.onImagesChange).toHaveBeenCalledWith([
        {
          productId: 'product-1',
          mediaId: 'media-1',
          sortOrder: 0,
          isPrimary: true, // First image should be primary
          media: mockMedia[0],
        },
      ])
    })

    it('sets first image as primary when no existing images', async () => {
      const user = userEvent.setup()
      render(<ProductMediaManager {...defaultProps} images={[]} />)
      
      await user.click(screen.getByText('Choose from Library'))
      await user.click(screen.getByText('Select Media'))
      
      const call = defaultProps.onImagesChange.mock.calls[0][0]
      expect(call[0].isPrimary).toBe(true)
    })

    it('does not set new image as primary when existing images', async () => {
      const user = userEvent.setup()
      render(<ProductMediaManager {...defaultProps} />)
      
      await user.click(screen.getByText('Choose from Library'))
      await user.click(screen.getByText('Select Media'))
      
      const call = defaultProps.onImagesChange.mock.calls[0][0]
      const newImage = call.find((img: ProductMedia) => img.mediaId === 'media-1' && img.sortOrder === 1)
      expect(newImage.isPrimary).toBe(false)
    })
  })

  describe('Image Upload', () => {
    it('opens upload modal when upload new images is clicked', async () => {
      const user = userEvent.setup()
      render(<ProductMediaManager {...defaultProps} images={[]} />)
      
      await user.click(screen.getByText('Upload New Images'))
      
      expect(screen.getByTestId('image-upload')).toBeInTheDocument()
      expect(screen.getByText('Upload Images')).toBeInTheDocument()
    })

    it('closes upload modal when close is clicked', async () => {
      const user = userEvent.setup()
      render(<ProductMediaManager {...defaultProps} images={[]} />)
      
      await user.click(screen.getByText('Upload New Images'))
      expect(screen.getByTestId('image-upload')).toBeInTheDocument()
      
      await user.click(screen.getByText('Close Upload'))
      expect(screen.queryByTestId('image-upload')).not.toBeInTheDocument()
    })

    it('adds uploaded files to images', async () => {
      const user = userEvent.setup()
      render(<ProductMediaManager {...defaultProps} images={[]} />)
      
      await user.click(screen.getByText('Upload New Images'))
      await user.click(screen.getByText('Upload Complete'))
      
      expect(defaultProps.onImagesChange).toHaveBeenCalledWith([
        {
          productId: 'product-1',
          mediaId: 'media-2',
          sortOrder: 0,
          isPrimary: true, // First image should be primary
          media: {
            id: 'media-2',
            filename: 'image2.jpg',
            originalName: 'Product Image 2.jpg',
            mimeType: 'image/jpeg',
            fileSize: 2048000,
            width: 1200,
            height: 1080,
            altText: 'Product image 2',
            folder: 'products',
            createdBy: 'user-1',
            createdAt: new Date('2024-01-02T00:00:00.000Z'),
            url: '/uploads/image2.jpg',
            thumbnailUrl: '/uploads/thumbnails/image2.jpg',
            type: 'image',
          },
        },
      ])
    })
  })

  describe('Sort Order Management', () => {
    it('maintains correct sort orders when removing images', async () => {
      const user = userEvent.setup()
      const multipleImages = [
        { ...mockProductMedia[0], sortOrder: 0 },
        { ...mockProductMedia[0], mediaId: 'media-2', sortOrder: 1, isPrimary: false },
        { ...mockProductMedia[0], mediaId: 'media-3', sortOrder: 2, isPrimary: false },
      ]

      render(<ProductMediaManager {...defaultProps} images={multipleImages} />)
      
      await user.click(screen.getByText('Remove'))
      
      // Should remove first image and reorder remaining
      const expectedImages = [
        { ...multipleImages[1], sortOrder: 0 },
        { ...multipleImages[2], sortOrder: 1 },
      ]
      
      expect(defaultProps.onImagesChange).toHaveBeenCalledWith(expectedImages)
    })

    it('assigns correct sort orders to new images', async () => {
      const user = userEvent.setup()
      render(<ProductMediaManager {...defaultProps} />)
      
      await user.click(screen.getByText('Choose from Library'))
      await user.click(screen.getByText('Select Media'))
      
      const call = defaultProps.onImagesChange.mock.calls[0][0]
      const newImage = call.find((img: ProductMedia) => img.sortOrder === 1)
      expect(newImage).toBeDefined()
    })
  })

  describe('Props Handling', () => {
    it('passes maxImages to gallery', () => {
      render(<ProductMediaManager {...defaultProps} maxImages={5} />)
      
      // Gallery should receive the maxImages prop
      expect(screen.getByTestId('product-image-gallery')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(
        <ProductMediaManager {...defaultProps} className="custom-class" />
      )
      
      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('handles missing productId gracefully', async () => {
      const user = userEvent.setup()
      render(<ProductMediaManager {...defaultProps} productId={undefined} images={[]} />)
      
      await user.click(screen.getByText('Choose from Library'))
      await user.click(screen.getByText('Select Media'))
      
      const call = defaultProps.onImagesChange.mock.calls[0][0]
      expect(call[0].productId).toBe('')
    })
  })

  describe('Modal State Management', () => {
    it('only shows one modal at a time', async () => {
      const user = userEvent.setup()
      render(<ProductMediaManager {...defaultProps} images={[]} />)
      
      // Open picker
      await user.click(screen.getByText('Choose from Library'))
      expect(screen.getByTestId('media-picker')).toBeInTheDocument()
      
      // Should not show upload options when picker is open
      expect(screen.queryByText('Upload New Images')).not.toBeInTheDocument()
    })

    it('hides add options when modal is open', async () => {
      const user = userEvent.setup()
      render(<ProductMediaManager {...defaultProps} images={[]} />)
      
      await user.click(screen.getByText('Upload New Images'))
      
      // Should not show the add options buttons
      expect(screen.queryByText('Choose from Library')).not.toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty images array', () => {
      render(<ProductMediaManager {...defaultProps} images={[]} />)
      
      expect(screen.getByTestId('product-image-gallery')).toBeInTheDocument()
      expect(screen.getByText('Choose from Library')).toBeInTheDocument()
    })

    it('calculates remaining slots correctly', async () => {
      const user = userEvent.setup()
      const nineImages = Array.from({ length: 9 }, (_, i) => ({
        ...mockProductMedia[0],
        mediaId: `media-${i + 1}`,
        sortOrder: i,
      }))

      render(<ProductMediaManager {...defaultProps} images={nineImages} maxImages={10} />)
      
      // Should still show add options with 1 slot remaining
      expect(screen.getByText('Choose from Library')).toBeInTheDocument()
      expect(screen.getByText('Upload New Images')).toBeInTheDocument()
    })
  })
})