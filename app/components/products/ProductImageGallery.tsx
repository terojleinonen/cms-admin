/**
 * ProductImageGallery Component
 * Displays product images with drag-and-drop reordering, primary image selection, and variant management
 */

'use client'

import { useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import {
  PhotoIcon,
  PlusIcon,
  XMarkIcon,
  EyeIcon,
  StarIcon,
  ArrowsUpDownIcon,
} from '../ui/Icons'
import clsx from 'clsx'
import { Media, ProductMedia } from '@/lib/types'

interface ProductImageGalleryProps {
  images: ProductMedia[]
  onImageSelect: (image: Media) => void
  onImageReorder: (images: ProductMedia[]) => void
  onImageRemove: (imageId: string) => void
  onPrimaryImageChange: (imageId: string) => void
  onAddImages: () => void
  className?: string
  maxImages?: number
  allowReorder?: boolean
  allowRemove?: boolean
  showPrimarySelector?: boolean
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
}: ProductImageGalleryProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedIndex: null,
    dragOverIndex: null,
  })
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const dragCounter = useRef(0)

  const sortedImages = [...images].sort((a, b) => a.sortOrder - b.sortOrder)

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
    if (draggedIndex === null || draggedIndex === dropIndex) {
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

  const handleImageClick = useCallback((image: Media) => {
    setSelectedImageId(image.id)
    onImageSelect(image)
  }, [onImageSelect])

  const handleSetPrimary = useCallback((imageId: string) => {
    onPrimaryImageChange(imageId)
  }, [onPrimaryImageChange])

  const handleRemoveImage = useCallback((imageId: string) => {
    if (confirm("Are you sure you want to remove this image?")) {
      onImageRemove(imageId)
    }
  }, [onImageRemove])

  const getImageUrl = (media: Media): string => {
    return media.thumbnailUrl || media.url || `/api/media/${media.id}`
  }

  const canAddMore = images.length < maxImages

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
        
        {canAddMore && (
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

      {/* Image Grid */}
      {sortedImages.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {sortedImages.map((productMedia, index) => {
            const { media } = productMedia
            if (!media) return null

            const isDraggedOver = dragState.dragOverIndex === index
            const isDragged = dragState.draggedIndex === index
            const isSelected = selectedImageId === media.id

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
                onClick={() => handleImageClick(media)}
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
                      onClick={() => handleImageClick(media)}
                      className="p-1 bg-white bg-opacity-90 rounded shadow-sm hover:bg-opacity-100 transition-all"
                      title="View image"
                    >
                      <EyeIcon className="h-4 w-4 text-gray-600" />
                    </button>
                    
                    {showPrimarySelector && !productMedia.isPrimary && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(media.id)}
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
                    
                    {allowRemove && (
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(media.id)}
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
      ) : (
        /* Empty State */
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No images</h3>
          <p className="mt-1 text-sm text-gray-500">
            Add some images to showcase your product.
          </p>
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
    </div>
  )
}