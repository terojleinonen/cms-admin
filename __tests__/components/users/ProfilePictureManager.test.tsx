/**
 * ProfilePictureManager Component Tests
 * Basic test suite for profile picture upload functionality
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ProfilePictureManager from '@/components/users/ProfilePictureManager'

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = jest.fn()
const mockRevokeObjectURL = jest.fn()

// Setup mocks before tests
beforeAll(() => {
  Object.defineProperty(window, 'URL', {
    value: {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    },
    writable: true,
  })

  // Mock Image constructor
  global.Image = class {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    src = ''
    naturalWidth = 400
    naturalHeight = 400
    width = 400
    height = 400
  } as any

  // Mock canvas
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    drawImage: jest.fn(),
  }))
  HTMLCanvasElement.prototype.toBlob = jest.fn((callback) => {
    const blob = new Blob(['test'], { type: 'image/jpeg' })
    callback(blob)
  })
})

describe('ProfilePictureManager', () => {
  const mockOnUpload = jest.fn()
  const mockOnRemove = jest.fn()
  
  const defaultProps = {
    onUpload: mockOnUpload,
    onRemove: mockOnRemove,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateObjectURL.mockReturnValue('mock-blob-url')
  })

  describe('Basic Rendering', () => {
    it('renders without current image', () => {
      render(<ProfilePictureManager {...defaultProps} />)
      
      expect(screen.getByText('Profile Picture')).toBeInTheDocument()
      expect(screen.getByText(/Upload a new picture or drag and drop/)).toBeInTheDocument()
      expect(screen.getByText('Click to upload or drag and drop')).toBeInTheDocument()
    })

    it('renders with current image', () => {
      render(
        <ProfilePictureManager 
          {...defaultProps} 
          currentImage="https://example.com/avatar.jpg" 
        />
      )
      
      const currentImage = screen.getByAltText('Current profile picture')
      expect(currentImage).toBeInTheDocument()
      expect(currentImage).toHaveAttribute('src', 'https://example.com/avatar.jpg')
      expect(screen.getByText('Remove Picture')).toBeInTheDocument()
    })

    it('renders in disabled state', () => {
      render(<ProfilePictureManager {...defaultProps} disabled />)
      
      const uploadArea = screen.getByText('Click to upload or drag and drop').closest('[class*="border-dashed"]')
      expect(uploadArea).toHaveClass('opacity-50')
      expect(uploadArea).toHaveClass('cursor-not-allowed')
    })

    it('applies custom className', () => {
      const { container } = render(
        <ProfilePictureManager {...defaultProps} className="custom-class" />
      )
      
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('File Validation', () => {
    it('validates file format', async () => {
      render(<ProfilePictureManager {...defaultProps} />)
      
      const uploadArea = screen.getByText('Click to upload or drag and drop').closest('[class*="border-dashed"]')!
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      
      fireEvent.drop(uploadArea, {
        dataTransfer: {
          files: [invalidFile],
        },
      })

      await waitFor(() => {
        expect(screen.getByText(/Invalid file format/)).toBeInTheDocument()
      })
    })

    it('validates file size', async () => {
      render(<ProfilePictureManager {...defaultProps} maxFileSize={1024} />)
      
      const uploadArea = screen.getByText('Click to upload or drag and drop').closest('[class*="border-dashed"]')!
      const largeFile = new File(['x'.repeat(2048)], 'large.jpg', { type: 'image/jpeg' })
      
      fireEvent.drop(uploadArea, {
        dataTransfer: {
          files: [largeFile],
        },
      })

      await waitFor(() => {
        expect(screen.getByText(/File size too large/)).toBeInTheDocument()
      })
    })
  })

  describe('Drag and Drop', () => {
    it('handles drag over event', () => {
      render(<ProfilePictureManager {...defaultProps} />)
      
      // Find the actual drag area with border-dashed class
      const uploadArea = screen.getByText('Click to upload or drag and drop').closest('[class*="border-dashed"]')!
      
      fireEvent.dragOver(uploadArea)
      
      expect(uploadArea).toHaveClass('border-blue-400')
      expect(uploadArea).toHaveClass('bg-blue-50')
    })

    it('handles drag leave event', () => {
      render(<ProfilePictureManager {...defaultProps} />)
      
      const uploadArea = screen.getByText('Click to upload or drag and drop').closest('[class*="border-dashed"]')!
      
      fireEvent.dragOver(uploadArea)
      fireEvent.dragLeave(uploadArea)
      
      expect(uploadArea).not.toHaveClass('border-blue-400')
      expect(uploadArea).not.toHaveClass('bg-blue-50')
    })

    it('ignores drag events when disabled', () => {
      render(<ProfilePictureManager {...defaultProps} disabled />)
      
      const uploadArea = screen.getByText('Click to upload or drag and drop').closest('[class*="border-dashed"]')!
      
      fireEvent.dragOver(uploadArea)
      
      expect(uploadArea).not.toHaveClass('border-blue-400')
      expect(uploadArea).not.toHaveClass('bg-blue-50')
    })
  })

  describe('Image Removal', () => {
    it('shows remove button with current image', () => {
      render(
        <ProfilePictureManager 
          {...defaultProps} 
          currentImage="https://example.com/avatar.jpg" 
        />
      )
      
      expect(screen.getByText('Remove Picture')).toBeInTheDocument()
    })

    it('does not show remove button without onRemove prop', () => {
      render(
        <ProfilePictureManager 
          onUpload={mockOnUpload}
          currentImage="https://example.com/avatar.jpg" 
        />
      )
      
      expect(screen.queryByText('Remove Picture')).not.toBeInTheDocument()
    })
  })

  describe('Custom Props', () => {
    it('respects custom maxFileSize', () => {
      render(<ProfilePictureManager {...defaultProps} maxFileSize={1024} />)
      
      expect(screen.getByText(/Max 0MB/)).toBeInTheDocument()
    })

    it('respects custom allowedFormats', () => {
      render(
        <ProfilePictureManager 
          {...defaultProps} 
          allowedFormats={['image/png']} 
        />
      )
      
      expect(screen.getByText(/PNG up to/)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper alt text for images', () => {
      render(
        <ProfilePictureManager 
          {...defaultProps} 
          currentImage="https://example.com/avatar.jpg" 
        />
      )
      
      const image = screen.getByAltText('Current profile picture')
      expect(image).toBeInTheDocument()
    })
  })
})