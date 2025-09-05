/**
 * Product Image Gallery Component
 * Displays and manages product images with gallery functionality
 */

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface ProductImage {
  id: string
  url: string
  altText?: string
  isPrimary?: boolean
}

interface ProductImageGalleryProps {
  images: ProductImage[]
  onImageSelect?: (image: ProductImage) => void
  onImageRemove?: (imageId: string) => void
  className?: string
  editable?: boolean
}

export default function ProductImageGallery({
  images,
  onImageSelect,
  onImageRemove,
  className = '',
  editable = false
}: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isModalOpen) return

      switch (e.key) {
        case 'Escape':
          setIsModalOpen(false)
          break
        case 'ArrowLeft':
          e.preventDefault()
          handlePrevious()
          break
        case 'ArrowRight':
          e.preventDefault()
          handleNext()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen, handleNext, handlePrevious])

  const handlePrevious = useCallback(() => {
    setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }, [images.length])

  const handleNext = useCallback(() => {
    setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }, [images.length])

  if (!images || images.length === 0) {
    return (
      <div className={`bg-gray-100 rounded-lg p-8 text-center ${className}`}>
        <div className="text-gray-400 text-sm">No images available</div>
      </div>
    )
  }

  const selectedImage = images[selectedIndex]

  const handleThumbnailClick = (index: number) => {
    setSelectedIndex(index)
    if (onImageSelect) {
      onImageSelect(images[index])
    }
  }

  const handleRemoveImage = (imageId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    if (onImageRemove) {
      onImageRemove(imageId)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Image Display */}
      <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
        <Image
          src={selectedImage.url}
          alt={selectedImage.altText || 'Product image'}
          fill
          className="object-cover cursor-pointer"
          onClick={() => setIsModalOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setIsModalOpen(true)
            }
          }}
        />
        
        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={handleNext}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md transition-colors"
            >
              <ChevronRightIcon className="w-5 h-5 text-gray-700" />
            </button>
          </>
        )}

        {/* Primary Badge */}
        {selectedImage.isPrimary && (
          <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
            Primary
          </div>
        )}

        {/* Remove Button */}
        {editable && (
          <button
            onClick={(e) => handleRemoveImage(selectedImage.id, e)}
            aria-label="Remove image"
            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-md transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <div
              key={image.id}
              className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden cursor-pointer border-2 transition-colors ${
                index === selectedIndex
                  ? 'border-blue-600'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleThumbnailClick(index)}
              role="button"
              tabIndex={0}
              aria-label={`View ${image.altText || `image ${index + 1}`}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleThumbnailClick(index)
                }
              }}
            >
              <Image
                src={image.url}
                alt={image.altText || `Product image ${index + 1}`}
                fill
                className="object-cover"
              />
              
              {/* Primary indicator */}
              {image.isPrimary && (
                <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                </div>
              )}

              {/* Remove button for thumbnails */}
              {editable && (
                <button
                  onClick={(e) => handleRemoveImage(image.id, e)}
                  aria-label={`Remove ${image.altText || 'image'}`}
                  className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-0.5 shadow-md transition-colors"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal for full-size view */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Image gallery modal"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="relative max-w-4xl max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              aria-label="Close image modal"
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <XMarkIcon className="w-8 h-8" />
            </button>
            
            <div className="relative">
              <Image
                src={selectedImage.url}
                alt={selectedImage.altText || 'Product image'}
                width={800}
                height={600}
                className="max-w-full max-h-[80vh] object-contain"
              />
              
              {/* Modal Navigation */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={handlePrevious}
                    aria-label="Previous image in modal"
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-3 transition-colors"
                  >
                    <ChevronLeftIcon className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleNext}
                    aria-label="Next image in modal"
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-3 transition-colors"
                  >
                    <ChevronRightIcon className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Image counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {selectedIndex + 1} of {images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}