/**
 * MediaGrid Component Tests
 * Tests for media grid display and interaction functionality
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import MediaGrid from '@/components/media/MediaGrid'

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />
  }
})

// Mock fetch for API calls
global.fetch = jest.fn()

const mockMedia = [
  {
    id: '1',
    filename: 'image1.jpg',
    originalName: 'Image 1.jpg',
    mimeType: 'image/jpeg',
    fileSize: 1024000,
    width: 800,
    height: 600,
    altText: 'Test image 1',
    folder: 'uploads',
    url: '/uploads/media/image1.jpg',
    thumbnails: {
      small: '/uploads/thumbnails/small/image1.jpg',
      medium: '/uploads/thumbnails/medium/image1.jpg',
      large: '/uploads/thumbnails/large/image1.jpg',
    },
    createdBy: 'user1',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    filename: 'image2.png',
    originalName: 'Image 2.png',
    mimeType: 'image/png',
    fileSize: 2048000,
    width: 1200,
    height: 800,
    altText: 'Test image 2',
    folder: 'uploads',
    url: '/uploads/media/image2.png',
    thumbnails: {
      small: '/uploads/thumbnails/small/image2.png',
      medium: '/uploads/thumbnails/medium/image2.png',
      large: '/uploads/thumbnails/large/image2.png',
    },
    createdBy: 'user1',
    createdAt: '2024-01-02T00:00:00Z',
  },
]

describe('MediaGrid Component', () => {
  const defaultProps = {
    media: mockMedia,
    loading: false,
    selectedMedia: [],
    onMediaSelect: jest.fn(),
    onMediaDelete: jest.fn(),
    onMediaEdit: jest.fn(),
    selectionMode: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Rendering', () => {
    it('should render media grid with items', () => {
      render(<MediaGrid {...defaultProps} />)

      expect(screen.getByText('Image 1.jpg')).toBeInTheDocument()
      expect(screen.getByText('Image 2.png')).toBeInTheDocument()
      expect(screen.getByText('1.0 MB')).toBeInTheDocument()
      expect(screen.getByText('2.0 MB')).toBeInTheDocument()
    })

    it('should render loading state', () => {
      render(<MediaGrid {...defaultProps} loading={true} />)

      expect(screen.getByText('Loading media...')).toBeInTheDocument()
    })

    it('should render empty state when no media', () => {
      render(<MediaGrid {...defaultProps} media={[]} />)

      expect(screen.getByText('No media files found')).toBeInTheDocument()
      expect(screen.getByText('Upload some files to get started')).toBeInTheDocument()
    })

    it('should display media thumbnails', () => {
      render(<MediaGrid {...defaultProps} />)

      const images = screen.getAllByRole('img')
      expect(images).toHaveLength(2)
      expect(images[0]).toHaveAttribute('src', '/uploads/thumbnails/medium/image1.jpg')
      expect(images[1]).toHaveAttribute('src', '/uploads/thumbnails/medium/image2.png')
    })

    it('should display media metadata', () => {
      render(<MediaGrid {...defaultProps} />)

      expect(screen.getByText('800 × 600')).toBeInTheDocument()
      expect(screen.getByText('1200 × 800')).toBeInTheDocument()
      expect(screen.getByText('JPEG')).toBeInTheDocument()
      expect(screen.getByText('PNG')).toBeInTheDocument()
    })
  })

  describe('Selection Mode', () => {
    it('should show checkboxes in selection mode', () => {
      render(<MediaGrid {...defaultProps} selectionMode={true} />)

      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes).toHaveLength(2)
    })

    it('should not show checkboxes when not in selection mode', () => {
      render(<MediaGrid {...defaultProps} selectionMode={false} />)

      const checkboxes = screen.queryAllByRole('checkbox')
      expect(checkboxes).toHaveLength(0)
    })

    it('should handle media selection', async () => {
      const user = userEvent.setup()
      const onMediaSelect = jest.fn()

      render(
        <MediaGrid
          {...defaultProps}
          selectionMode={true}
          onMediaSelect={onMediaSelect}
        />
      )

      const firstCheckbox = screen.getAllByRole('checkbox')[0]
      await user.click(firstCheckbox)

      expect(onMediaSelect).toHaveBeenCalledWith(mockMedia[0])
    })

    it('should show selected media as checked', () => {
      render(
        <MediaGrid
          {...defaultProps}
          selectionMode={true}
          selectedMedia={[mockMedia[0]]}
        />
      )

      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes[0]).toBeChecked()
      expect(checkboxes[1]).not.toBeChecked()
    })

    it('should handle select all functionality', async () => {
      const user = userEvent.setup()
      const onMediaSelect = jest.fn()

      render(
        <MediaGrid
          {...defaultProps}
          selectionMode={true}
          onMediaSelect={onMediaSelect}
          showSelectAll={true}
        />
      )

      const selectAllButton = screen.getByText('Select All')
      await user.click(selectAllButton)

      expect(onMediaSelect).toHaveBeenCalledWith(mockMedia)
    })
  })

  describe('Media Actions', () => {
    it('should show action buttons on hover', async () => {
      const user = userEvent.setup()
      render(<MediaGrid {...defaultProps} />)

      const mediaItem = screen.getByText('Image 1.jpg').closest('[data-testid="media-item"]')
      expect(mediaItem).toBeInTheDocument()

      await user.hover(mediaItem!)

      await waitFor(() => {
        expect(screen.getByLabelText('Edit media')).toBeInTheDocument()
        expect(screen.getByLabelText('Delete media')).toBeInTheDocument()
      })
    })

    it('should handle edit action', async () => {
      const user = userEvent.setup()
      const onMediaEdit = jest.fn()

      render(<MediaGrid {...defaultProps} onMediaEdit={onMediaEdit} />)

      const mediaItem = screen.getByText('Image 1.jpg').closest('[data-testid="media-item"]')
      await user.hover(mediaItem!)

      await waitFor(() => {
        const editButton = screen.getByLabelText('Edit media')
        return user.click(editButton)
      })

      expect(onMediaEdit).toHaveBeenCalledWith(mockMedia[0])
    })

    it('should handle delete action with confirmation', async () => {
      const user = userEvent.setup()
      const onMediaDelete = jest.fn()

      // Mock window.confirm
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)

      render(<MediaGrid {...defaultProps} onMediaDelete={onMediaDelete} />)

      const mediaItem = screen.getByText('Image 1.jpg').closest('[data-testid="media-item"]')
      await user.hover(mediaItem!)

      await waitFor(() => {
        const deleteButton = screen.getByLabelText('Delete media')
        return user.click(deleteButton)
      })

      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this media file?')
      expect(onMediaDelete).toHaveBeenCalledWith(mockMedia[0])

      confirmSpy.mockRestore()
    })

    it('should not delete when confirmation is cancelled', async () => {
      const user = userEvent.setup()
      const onMediaDelete = jest.fn()

      // Mock window.confirm to return false
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)

      render(<MediaGrid {...defaultProps} onMediaDelete={onMediaDelete} />)

      const mediaItem = screen.getByText('Image 1.jpg').closest('[data-testid="media-item"]')
      await user.hover(mediaItem!)

      await waitFor(() => {
        const deleteButton = screen.getByLabelText('Delete media')
        return user.click(deleteButton)
      })

      expect(onMediaDelete).not.toHaveBeenCalled()

      confirmSpy.mockRestore()
    })
  })

  describe('Media Preview', () => {
    it('should open preview modal on media click', async () => {
      const user = userEvent.setup()
      render(<MediaGrid {...defaultProps} />)

      const mediaImage = screen.getAllByRole('img')[0]
      await user.click(mediaImage)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Media Preview')).toBeInTheDocument()
      })
    })

    it('should display media details in preview', async () => {
      const user = userEvent.setup()
      render(<MediaGrid {...defaultProps} />)

      const mediaImage = screen.getAllByRole('img')[0]
      await user.click(mediaImage)

      await waitFor(() => {
        expect(screen.getByText('Image 1.jpg')).toBeInTheDocument()
        expect(screen.getByText('1.0 MB')).toBeInTheDocument()
        expect(screen.getByText('800 × 600')).toBeInTheDocument()
        expect(screen.getByText('Test image 1')).toBeInTheDocument()
      })
    })

    it('should close preview modal', async () => {
      const user = userEvent.setup()
      render(<MediaGrid {...defaultProps} />)

      const mediaImage = screen.getAllByRole('img')[0]
      await user.click(mediaImage)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const closeButton = screen.getByLabelText('Close')
      await user.click(closeButton)

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('Grid Layout', () => {
    it('should support different grid sizes', () => {
      const { rerender } = render(<MediaGrid {...defaultProps} gridSize="small" />)

      const gridContainer = screen.getByTestId('media-grid')
      expect(gridContainer).toHaveClass('grid-cols-6')

      rerender(<MediaGrid {...defaultProps} gridSize="medium" />)
      expect(gridContainer).toHaveClass('grid-cols-4')

      rerender(<MediaGrid {...defaultProps} gridSize="large" />)
      expect(gridContainer).toHaveClass('grid-cols-3')
    })

    it('should be responsive', () => {
      render(<MediaGrid {...defaultProps} />)

      const gridContainer = screen.getByTestId('media-grid')
      expect(gridContainer).toHaveClass('sm:grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<MediaGrid {...defaultProps} />)

      expect(screen.getByRole('grid')).toBeInTheDocument()
      expect(screen.getAllByRole('gridcell')).toHaveLength(2)
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<MediaGrid {...defaultProps} />)

      const firstMediaItem = screen.getAllByRole('gridcell')[0]
      firstMediaItem.focus()

      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('should have proper alt text for images', () => {
      render(<MediaGrid {...defaultProps} />)

      const images = screen.getAllByRole('img')
      expect(images[0]).toHaveAttribute('alt', 'Test image 1')
      expect(images[1]).toHaveAttribute('alt', 'Test image 2')
    })
  })

  describe('Error Handling', () => {
    it('should handle image load errors gracefully', async () => {
      render(<MediaGrid {...defaultProps} />)

      const images = screen.getAllByRole('img')
      fireEvent.error(images[0])

      await waitFor(() => {
        expect(screen.getByText('Failed to load image')).toBeInTheDocument()
      })
    })

    it('should show error state when API calls fail', async () => {
      const onMediaDelete = jest.fn().mockRejectedValue(new Error('Delete failed'))

      render(<MediaGrid {...defaultProps} onMediaDelete={onMediaDelete} />)

      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation()

      const mediaItem = screen.getByText('Image 1.jpg').closest('[data-testid="media-item"]')
      await userEvent.hover(mediaItem!)

      await waitFor(() => {
        const deleteButton = screen.getByLabelText('Delete media')
        return userEvent.click(deleteButton)
      })

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to delete media file')
      })

      confirmSpy.mockRestore()
      alertSpy.mockRestore()
    })
  })
})