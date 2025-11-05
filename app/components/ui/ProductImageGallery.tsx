/**
 * Unified Product Image Gallery Component
 * Consolidated gallery with drag-and-drop, modal view, and management features
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Image from 'next/image'
import {
  PhotoIcon,
  PlusIcon,
  XMarkIcon,
  EyeIcon,
  StarIcon,
  ArrowsUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from './Icons'
import clsx from 'clsx'
import { Media, ProductMedia } from '@/lib/types'

interface ProductImageGalleryProps {
  images: ProductMedia[]
  onImageSelect?: (image: Media) => void
  onImageReorder?: (images: ProductMedia[]) => void
  onImageRemove?: (imageId: string) => void
  onPrimaryImageChange?: (imageId: string) => void
  onAddImages?: () => void
  className?: string
  maxImages?: number
  allowReorder?: boolean
  allowRemove?: boolean
  showPrimarySelector?: boolean
  editable?: boolean
  showModal?: boolean
}

interface DragState {
  isDragging: boolean
  draggedIndex: number | null
  dragOverIndex: number | null
}

export default function ProductImageGallery({
  images,
  onImageSelect,
  onImageReorder,
  onImageRemove,
  onPrimaryImageChange,
  onAddImages,
  className,
  maxImages = 10,
  allowReorder = true,
  allowRemove = true,
  showPrimarySelector = true,
  editable = false,
  showModal = true,
}: ProductImageGalleryProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedIndex: null,
    dragOverIndex: null,
  })
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const dragCounter = useRef<number>(0)

  const sortedImages = [...images].sort((a, b) => a.sortOrder - b.sortOrder)

  // Handle keyboard navigation in modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isModalOpen) return

      switch (e.key) {
        case 'Escape':
          setIsModalOpen(false)
          break
        case 'ArrowLeft':
          e.preventDefault()
          handlePreviousImage()
          break
        case 'ArrowRight':
          e.preventDefault()
          handleNextImage()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen, selectedImageIndex, sortedImages.length])

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    if (!allowReorder) return
    
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML)
    
    setDragState(prev => ({
      ...prev,
      isDragging: true,
      draggedIndex: index,
    }))
  }, [allowReorder])

  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedIndex: null,
      dragOverIndex: null,
    })
    dragCounter.current = 0
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    dragCounter.current++
    
    setDragState(prev => ({
      ...prev,
      dragOverIndex: index,
    }))
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    
    if (dragCounter.current === 0) {
      setDragState(prev => ({
        ...prev,
        dragOverIndex: null,
      }))
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    
    const { draggedIndex } = dragState
    if (draggedIndex === null || draggedIndex === dropIndex || !onImageReorder) {
      handleDragEnd()
      return
    }

    // Create new array with reordered items
    const newImages = [...sortedImages]
    const draggedItem = newImages[draggedIndex]
    
    // Remove dragged item
    newImages.splice(draggedIndex, 1)
    
    // Insert at new position
    const insertIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex
    newImages.splice(insertIndex, 0, draggedItem)
    
    // Update sort orders
    const reorderedImages = newImages.map((img, index) => ({
      ...img,
      sortOrder: index,
    }))

    onImageReorder(reorderedImages)
    handleDragEnd()
  }, [dragState, sortedImages, onImageReorder, handleDragEnd])

  const handleImageClick = useCallback((image: Media, index: number) => {
    setSelectedImageIndex(index)
    if (showModal) {
      setIsModalOpen(true)
    }
    if (onImageSelect) {
      onImageSelect(image)
    }
  }, [onImageSelect, showModal])

  const handleSetPrimary = useCallback((imageId: string) => {
    if (onPrimaryImageChange) {
      onPrimaryImageChange(imageId)
    }
  }, [onPrimaryImageChange])

  const handleRemoveImage = useCallback((imageId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation()
    }
    if (confirm("Are you sure you want to remove this image?") && onImageRemove) {
      onImageRemove(imageId)
    }
  }, [onImageRemove])

  const handlePreviousImage = useCallback(() => {
    setSelectedImageIndex(prev => prev === 0 ? sortedImages.length - 1 : prev - 1)
  }, [sortedImages.length])

  const handleNextImage = useCallback(() => {
    setSelectedImageIndex(prev => prev === sortedImages.length - 1 ? 0 : prev + 1)
  }, [sortedImages.length])

  const getImageUrl = (media: Media): string => {
    return media.thumbnailUrl || media.url || `/api/media/${media.id}`
  }

  const getFullImageUrl = (media: Media): string => {
    return media.url || `/api/media/${media.id}`
  }

  const canAddMore = images.length < maxImages

  if (sortedImages.length === 0) {
    return (
      <div className={clsx('space-y-4', className)}>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No images</h3>
          <p className="mt-1 text-sm text-gray-500">
            Add some images to showcase your product.
          </p>
          {onAddImages && (
            <div className="mt-6">
              <button
                type="button"
                onClick={onAddImages}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Images
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Product Images</h3>
          <p className="text-sm text-gray-500">
            {images.length} of {maxImages} images
            {allowReorder && ' • Drag to reorder'}
          </p>
        </div>
        
        {canAddMore && onAddImages && (
          <button
            type="button"
            onClick={onAddImages}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Images
          </button>
        )}
      </div>

      {/* Main Image Display */}
      <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
        {sortedImages[selectedImageIndex]?.media && (
          <Image
            src={getImageUrl(sortedImages[selectedImageIndex].media)}
            alt={sortedImages[selectedImageIndex].media.altText || sortedImages[selectedImageIndex].media.originalName}
            fill
            className="object-cover cursor-pointer"
            onClick={() => handleImageClick(sortedImages[selectedImageIndex].media, selectedImageIndex)}
          />
        )}
        
        {/* Navigation Arrows */}
        {sortedImages.length > 1 && (
          <>
            <button
              onClick={handlePreviousImage}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={handleNextImage}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md transition-colors"
            >
              <ChevronRightIcon className="w-5 h-5 text-gray-700" />
            </button>
          </>
        )}

        {/* Primary Badge */}
        {sortedImages[selectedImageIndex].isPrimary && (
          <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium">
            Primary
          </div>
        )}

        {/* Remove Button */}
        {editable && allowRemove && sortedImages[selectedImageIndex]?.media && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleRemoveImage(sortedImages[selectedImageIndex].media.id)
            }}
            aria-label="Remove image"
            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-md transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Thumbnail Grid */}
      {sortedImages.length > 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {sortedImages.map((productMedia, index) => {
            const { media } = productMedia
            if (!media) return null

            const isDraggedOver = dragState.dragOverIndex === index
            const isDragged = dragState.draggedIndex === index
            const isSelected = selectedImageIndex === index

            return (
              <div
                key={media.id}
                draggable={allowReorder}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                className={clsx(
                  'group relative bg-white border-2 rounded-lg overflow-hidden cursor-pointer transition-all duration-200',
                  {
                    'border-blue-500 ring-2 ring-blue-200': isSelected,
                    'border-gray-200 hover:border-gray-300': !isSelected && !isDraggedOver,
                    'border-blue-400 bg-blue-50': isDraggedOver && !isDragged,
                    'opacity-50 scale-95': isDragged,
                    'cursor-move': allowReorder,
                  }
                )}
                onClick={() => handleImageClick(media, index)}
              >
                {/* Image */}
                <div className="aspect-square relative">
                  <Image
                    src={getImageUrl(media)}
                    alt={media.altText || media.originalName}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200" />
                  
                  {/* Primary Badge */}
                  {productMedia.isPrimary && (
                    <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium">
                      Primary
                    </div>
                  )}
                  
                  {/* Drag Handle */}
                  {allowReorder && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowsUpDownIcon className="h-5 w-5 text-white drop-shadow-lg" />
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="absolute bottom-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleImageClick(media, index)
                      }}
                      className="p-1 bg-white bg-opacity-90 rounded shadow-sm hover:bg-opacity-100 transition-all"
                      title="View image"
                    >
                      <EyeIcon className="h-4 w-4 text-gray-600" />
                    </button>
                    
                    {showPrimarySelector && !productMedia.isPrimary && onPrimaryImageChange && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSetPrimary(media.id)
                        }}
                        className="p-1 bg-white bg-opacity-90 rounded shadow-sm hover:bg-opacity-100 transition-all"
                        title="Set as primary image"
                      >
                        <StarIcon className="h-4 w-4 text-gray-600" />
                      </button>
                    )}
                    
                    {showPrimarySelector && productMedia.isPrimary && (
                      <div className="p-1 bg-yellow-500 rounded shadow-sm" title="Primary image">
                        <StarIcon className="h-4 w-4 text-white fill-current" />
                      </div>
                    )}
                    
                    {allowRemove && onImageRemove && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveImage(media.id)
                        }}
                        className="p-1 bg-white bg-opacity-90 rounded shadow-sm hover:bg-opacity-100 transition-all"
                        title="Remove image"
                      >
                        <XMarkIcon className="h-4 w-4 text-red-600" />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Image Info */}
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-900 truncate" title={media.originalName}>
                    {media.originalName}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">
                      {media.width && media.height ? `${media.width}×${media.height}` : 'Unknown size'}
                    </span>
                    <span className="text-xs text-gray-500">
                      #{index + 1}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Image Limit Warning */}
      {images.length >= maxImages && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <p className="text-sm text-yellow-800">
            You&apos;ve reached the maximum of {maxImages} images per product.
            Remove some images to add new ones.
          </p>
        </div>
      )}

      {/* Modal for full-size view */}
      {isModalOpen && showModal && (
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
              {sortedImages[selectedImageIndex]?.media && (
                <Image
                  src={getFullImageUrl(sortedImages[selectedImageIndex].media)}
                  alt={sortedImages[selectedImageIndex].media.altText || sortedImages[selectedImageIndex].media.originalName}
                  width={800}
                  height={600}
                  className="max-w-full max-h-[80vh] object-contain"
                />
              )}
              
              {/* Modal Navigation */}
              {sortedImages.length > 1 && (
                <>
                  <button
                    onClick={handlePreviousImage}
                    aria-label="Previous image in modal"
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-3 transition-colors"
                  >
                    <ChevronLeftIcon className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleNextImage}
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
              {selectedImageIndex + 1} of {sortedImages.length}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}