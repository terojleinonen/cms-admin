/**
 * ProductImageGallery Component Tests
 * Tests for drag-and-drop reordering, primary image selection, and variant management
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import ProductImageGallery from '@/components/products/ProductImageGallery'
import { Media, ProductMedia } from '@/lib/types'

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />
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
  {
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
    createdAt: new Date('2024-01-02'),
    url: '/uploads/image2.jpg',
    thumbnailUrl: '/uploads/thumbnails/image2.jpg',
    type: 'image',
  },
  {
    id: 'media-3',
    filename: 'image3.jpg',
    originalName: 'Product Image 3.jpg',
    mimeType: 'image/jpeg',
    fileSize: 1536000,
    width: 1000,
    height: 750,
    altText: 'Product image 3',
    folder: 'products',
    createdBy: 'user-1',
    createdAt: new Date('2024-01-03'),
    url: '/uploads/image3.jpg',
    thumbnailUrl: '/uploads/thumbnails/image3.jpg',
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
  {
    productId: 'product-1',
    mediaId: 'media-2',
    sortOrder: 1,
    isPrimary: false,
    media: mockMedia[1],
  },
  {
    productId: 'product-1',
    mediaId: 'media-3',
    sortOrder: 2,
    isPrimary: false,
    media: mockMedia[2],
  },
]

const defaultProps = {
  images: mockProductMedia,
  onImageSelect: jest.fn(),
  onImageReorder: jest.fn(),
  onImageRemove: jest.fn(),
  onPrimaryImageChange: jest.fn(),
  onAddImages: jest.fn(),
}

describe('ProductImageGallery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the component with images', () => {
      render(<ProductImageGallery {...defaultProps} />)
      
      expect(screen.getByText('Product Images')).toBeInTheDocument()
      expect(screen.getByText('3 of 10 images')).toBeInTheDocument()
      expect(screen.getByText('• Drag to reorder')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add images/i })).toBeInTheDocument()
    })

    it('renders all product images', () => {
      render(<ProductImageGallery {...defaultProps} />)
      
      mockProductMedia.forEach((productMedia) => {
        const image = screen.getByAltText(productMedia.media!.altText!)
        expect(image).toBeInTheDocument()
        expect(image).toHaveAttribute('src', productMedia.media!.thumbnailUrl)
      })
    })

    it('shows primary badge on primary image', () => {
      render(<ProductImageGallery {...defaultProps} />)
      
      expect(screen.getByText('Primary')).toBeInTheDocument()
    })

    it('displays image information correctly', () => {
      render(<ProductImageGallery {...defaultProps} />)
      
      expect(screen.getByText('Product Image 1.jpg')).toBeInTheDocument()
      expect(screen.getByText('800×600')).toBeInTheDocument()
      expect(screen.getByText('#1')).toBeInTheDocument()
    })

    it('renders empty state when no images', () => {
      render(<ProductImageGallery {...defaultProps} images={[]} />)
      
      expect(screen.getByText('No images')).toBeInTheDocument()
      expect(screen.getByText('Add some images to showcase your product.')).toBeInTheDocument()
    })

    it('shows image limit warning when at maximum', () => {
      const maxImages = Array.from({ length: 10 }, (_, i) => ({
        ...mockProductMedia[0],
        mediaId: `media-${i + 1}`,
        media: { ...mockMedia[0], id: `media-${i + 1}` },
      }))

      render(<ProductImageGallery {...defaultProps} images={maxImages} maxImages={10} />)
      
      expect(screen.getByText(/You've reached the maximum of 10 images/)).toBeInTheDocument()
    })
  })

  describe('Image Selection', () => {
    it('calls onImageSelect when image is clicked', async () => {
      const user = userEvent.setup()
      render(<ProductImageGallery {...defaultProps} />)
      
      const firstImage = screen.getByAltText('Product image 1')
      await user.click(firstImage)
      
      expect(defaultProps.onImageSelect).toHaveBeenCalledWith(mockMedia[0])
    })

    it('highlights selected image', async () => {
      const user = userEvent.setup()
      render(<ProductImageGallery {...defaultProps} />)
      
      const firstImage = screen.getByAltText('Product image 1')
      await user.click(firstImage)
      
      const imageContainer = firstImage.closest('div')
      expect(imageContainer).toHaveClass('border-blue-500', 'ring-2', 'ring-blue-200')
    })
  })

  describe('Primary Image Management', () => {
    it('calls onPrimaryImageChange when set primary button is clicked', async () => {
      const user = userEvent.setup()
      render(<ProductImageGallery {...defaultProps} />)
      
      // Find the second image (not primary) and hover to show buttons
      const secondImageContainer = screen.getByAltText('Product image 2').closest('div')!
      await user.hover(secondImageContainer)
      
      // Find and click the set primary button
      const setPrimaryButton = screen.getByTitle('Set as primary image')
      await user.click(setPrimaryButton)
      
      expect(defaultProps.onPrimaryImageChange).toHaveBeenCalledWith('media-2')
    })

    it('shows primary indicator for primary image', () => {
      render(<ProductImageGallery {...defaultProps} />)
      
      expect(screen.getByTitle('Primary image')).toBeInTheDocument()
    })

    it('hides primary selector when showPrimarySelector is false', () => {
      render(<ProductImageGallery {...defaultProps} showPrimarySelector={false} />)
      
      // Primary badge should still show, but no set primary buttons
      expect(screen.getByText('Primary')).toBeInTheDocument()
      expect(screen.queryByTitle('Set as primary image')).not.toBeInTheDocument()
    })
  })

  describe('Image Removal', () => {
    it('calls onImageRemove when remove button is clicked and confirmed', async () => {
      const user = userEvent.setup()
      
      // Mock window.confirm
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
      
      render(<ProductImageGallery {...defaultProps} />)
      
      // Hover over first image to show buttons
      const firstImageContainer = screen.getByAltText('Product image 1').closest('div')!
      await user.hover(firstImageContainer)
      
      // Click remove button
      const removeButton = screen.getByTitle('Remove image')
      await user.click(removeButton)
      
      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to remove this image?')
      expect(defaultProps.onImageRemove).toHaveBeenCalledWith('media-1')
      
      confirmSpy.mockRestore()
    })

    it('does not remove image when confirmation is cancelled', async () => {
      const user = userEvent.setup()
      
      // Mock window.confirm to return false
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)
      
      render(<ProductImageGallery {...defaultProps} />)
      
      // Hover over first image to show buttons
      const firstImageContainer = screen.getByAltText('Product image 1').closest('div')!
      await user.hover(firstImageContainer)
      
      // Click remove button
      const removeButton = screen.getByTitle('Remove image')
      await user.click(removeButton)
      
      expect(confirmSpy).toHaveBeenCalled()
      expect(defaultProps.onImageRemove).not.toHaveBeenCalled()
      
      confirmSpy.mockRestore()
    })

    it('hides remove buttons when allowRemove is false', () => {
      render(<ProductImageGallery {...defaultProps} allowRemove={false} />)
      
      expect(screen.queryByTitle('Remove image')).not.toBeInTheDocument()
    })
  })

  describe('Drag and Drop Reordering', () => {
    it('shows drag handle on hover when allowReorder is true', async () => {
      const user = userEvent.setup()
      render(<ProductImageGallery {...defaultProps} />)
      
      const firstImageContainer = screen.getByAltText('Product image 1').closest('div')!
      await user.hover(firstImageContainer)
      
      // Check for drag handle (ArrowsUpDownIcon)
      const dragHandle = firstImageContainer.querySelector('svg')
      expect(dragHandle).toBeInTheDocument()
    })

    it('makes images draggable when allowReorder is true', () => {
      render(<ProductImageGallery {...defaultProps} />)
      
      const firstImageContainer = screen.getByAltText('Product image 1').closest('div')!
      expect(firstImageContainer).toHaveAttribute('draggable', 'true')
      expect(firstImageContainer).toHaveClass('cursor-move')
    })

    it('does not make images draggable when allowReorder is false', () => {
      render(<ProductImageGallery {...defaultProps} allowReorder={false} />)
      
      const firstImageContainer = screen.getByAltText('Product image 1').closest('div')!
      expect(firstImageContainer).toHaveAttribute('draggable', 'false')
      expect(firstImageContainer).not.toHaveClass('cursor-move')
    })

    it('calls onImageReorder when drag and drop is completed', () => {
      render(<ProductImageGallery {...defaultProps} />)
      
      const firstImage = screen.getByAltText('Product image 1').closest('div')!
      const thirdImage = screen.getByAltText('Product image 3').closest('div')!
      
      // Simulate drag start
      fireEvent.dragStart(firstImage, {
        dataTransfer: {
          effectAllowed: 'move',
          setData: jest.fn(),
        },
      })
      
      // Simulate drag over
      fireEvent.dragOver(thirdImage, {
        dataTransfer: { dropEffect: 'move' },
      })
      
      // Simulate drop
      fireEvent.drop(thirdImage, {
        dataTransfer: { dropEffect: 'move' },
      })
      
      expect(defaultProps.onImageReorder).toHaveBeenCalled()
    })
  })

  describe('Add Images', () => {
    it('calls onAddImages when add images button is clicked', async () => {
      const user = userEvent.setup()
      render(<ProductImageGallery {...defaultProps} />)
      
      const addButton = screen.getByRole('button', { name: /add images/i })
      await user.click(addButton)
      
      expect(defaultProps.onAddImages).toHaveBeenCalled()
    })

    it('hides add button when at maximum images', () => {
      const maxImages = Array.from({ length: 10 }, (_, i) => ({
        ...mockProductMedia[0],
        mediaId: `media-${i + 1}`,
        media: { ...mockMedia[0], id: `media-${i + 1}` },
      }))

      render(<ProductImageGallery {...defaultProps} images={maxImages} maxImages={10} />)
      
      expect(screen.queryByRole('button', { name: /add images/i })).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<ProductImageGallery {...defaultProps} />)
      
      const addButton = screen.getByRole('button', { name: /add images/i })
      expect(addButton).toBeInTheDocument()
      
      // Check that images have proper alt text
      mockProductMedia.forEach((productMedia) => {
        const image = screen.getByAltText(productMedia.media!.altText!)
        expect(image).toBeInTheDocument()
      })
    })

    it('provides proper titles for action buttons', async () => {
      const user = userEvent.setup()
      render(<ProductImageGallery {...defaultProps} />)
      
      // Hover to show action buttons
      const firstImageContainer = screen.getByAltText('Product image 1').closest('div')!
      await user.hover(firstImageContainer)
      
      expect(screen.getByTitle('View image')).toBeInTheDocument()
      expect(screen.getByTitle('Remove image')).toBeInTheDocument()
    })
  })

  describe('Custom Props', () => {
    it('applies custom className', () => {
      const { container } = render(
        <ProductImageGallery {...defaultProps} className="custom-class" />
      )
      
      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('respects maxImages prop', () => {
      render(<ProductImageGallery {...defaultProps} maxImages={5} />)
      
      expect(screen.getByText('3 of 5 images')).toBeInTheDocument()
    })

    it('updates image count display correctly', () => {
      const singleImage = [mockProductMedia[0]]
      render(<ProductImageGallery {...defaultProps} images={singleImage} />)
      
      expect(screen.getByText('1 of 10 images')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('handles missing media gracefully', () => {
      const imagesWithMissingMedia = [
        {
          ...mockProductMedia[0],
          media: undefined,
        },
      ]

      render(<ProductImageGallery {...defaultProps} images={imagesWithMissingMedia as any} />)
      
      // Should not crash and should not render the image with missing media
      expect(screen.queryByAltText('Product image 1')).not.toBeInTheDocument()
    })

    it('handles missing image URLs gracefully', () => {
      const imagesWithMissingUrls = [
        {
          ...mockProductMedia[0],
          media: {
            ...mockMedia[0],
            url: undefined,
            thumbnailUrl: undefined,
          },
        },
      ]

      render(<ProductImageGallery {...defaultProps} images={imagesWithMissingUrls as any} />)
      
      const image = screen.getByAltText('Product image 1')
      expect(image).toHaveAttribute('src', '/api/media/media-1')
    })
  })
})