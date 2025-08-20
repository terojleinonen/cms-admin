/**
 * Tests for MediaGrid component
 * Tests media file display and interaction
 */

import { render, screen, fireEvent } from '@testing-library/react'
import MediaGrid from '../../../app/components/media/MediaGrid'

const mockMediaFiles = [
  {
    id: '1',
    name: 'test-image.jpg',
    originalName: 'test image.jpg',
    type: 'image' as const,
    mimeType: 'image/jpeg',
    size: 1024,
    url: '/uploads/test-image.jpg',
    thumbnailUrl: '/uploads/thumbnails/test-image.jpg',
    folder: null,
    alt: 'Test image',
    caption: 'A test image',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
    },
  },
]

const mockPagination = {
  page: 1,
  limit: 20,
  total: 1,
  totalPages: 1,
}

const defaultProps = {
  mediaFiles: mockMediaFiles,
  pagination: mockPagination,
  loading: false,
  onPageChange: jest.fn(),
  onSelectMedia: jest.fn(),
  onDeleteMedia: jest.fn(),
}

describe('MediaGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render media files', () => {
    render(<MediaGrid {...defaultProps} />)
    
    expect(screen.getByText('test image.jpg')).toBeInTheDocument()
    expect(screen.getByText('IMAGE')).toBeInTheDocument()
    expect(screen.getByText('1 KB')).toBeInTheDocument()
  })

  it('should show loading state', () => {
    render(<MediaGrid {...defaultProps} loading={true} />)
    
    // Should show skeleton loaders
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(10)
  })

  it('should show empty state when no files', () => {
    render(<MediaGrid {...defaultProps} mediaFiles={[]} />)
    
    expect(screen.getByText('No media files')).toBeInTheDocument()
    expect(screen.getByText('Upload some files to get started.')).toBeInTheDocument()
  })

  it('should call onSelectMedia when clicking on media', () => {
    render(<MediaGrid {...defaultProps} />)
    
    const mediaItem = screen.getByText('test image.jpg')
    fireEvent.click(mediaItem)
    
    expect(defaultProps.onSelectMedia).toHaveBeenCalledWith(mockMediaFiles[0])
  })

  it('should call onDeleteMedia when clicking delete button', () => {
    render(<MediaGrid {...defaultProps} />)
    
    // Find the delete button (trash icon)
    const deleteButton = screen.getByTitle('Delete')
    fireEvent.click(deleteButton)
    
    expect(defaultProps.onDeleteMedia).toHaveBeenCalledWith('1')
  })

  it('should handle file selection', () => {
    render(<MediaGrid {...defaultProps} />)
    
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    
    expect(checkbox).toBeChecked()
  })

  it('should show pagination when multiple pages', () => {
    const paginationProps = {
      ...defaultProps,
      pagination: {
        page: 1,
        limit: 20,
        total: 50,
        totalPages: 3,
      },
    }
    
    render(<MediaGrid {...paginationProps} />)
    
    expect(screen.getByText('Showing 1 to 20 of 50 results')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('should call onPageChange when clicking pagination', () => {
    const paginationProps = {
      ...defaultProps,
      pagination: {
        page: 1,
        limit: 20,
        total: 50,
        totalPages: 3,
      },
    }
    
    render(<MediaGrid {...paginationProps} />)
    
    const page2Button = screen.getByText('2')
    fireEvent.click(page2Button)
    
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(2)
  })
})