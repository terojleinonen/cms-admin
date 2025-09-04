/**
 * ProductMediaManager Component
 * Comprehensive media management for products with gallery, picker, and upload functionality
 */

'use client'

import { useState, useCallback } from 'react'
import ProductImageGallery from './ProductImageGallery'
import MediaPicker from './MediaPicker'
import ImageUpload from './ImageUpload'
import { Media, ProductMedia } from '@/lib/types'

interface ProductMediaManagerProps {
  productId?: string
  images: ProductMedia[]
  onImagesChange: (images: ProductMedia[]) => void
  maxImages?: number
  allowReorder?: boolean
  allowRemove?: boolean
  showPrimarySelector?: boolean
  className?: string
}

type ModalType = 'picker' | 'upload' | null

export default function ProductMediaManager({
  productId,
  images,
  onImagesChange,
  maxImages = 10,
  allowReorder = true,
  allowRemove = true,
  showPrimarySelector = true,
  className,
}: ProductMediaManagerProps) {
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)

  const handleImageSelect = useCallback((image: Media) => {
    setSelectedImageId(image.id)
    // Could open a detailed view modal here
  }, [])

  const handleImageReorder = useCallback((reorderedImages: ProductMedia[]) => {
    onImagesChange(reorderedImages)
  }, [onImagesChange])

  const handleImageRemove = useCallback((imageId: string) => {
    const updatedImages = images.filter(img => img.mediaId !== imageId)
    // Update sort orders
    const reorderedImages = updatedImages.map((img, index) => ({
      ...img,
      sortOrder: index,
    }))
    onImagesChange(reorderedImages)
  }, [images, onImagesChange])

  const handlePrimaryImageChange = useCallback((imageId: string) => {
    const updatedImages = images.map(img => ({
      ...img,
      isPrimary: img.mediaId === imageId,
    }))
    onImagesChange(updatedImages)
  }, [images, onImagesChange])

  const handleAddImages = useCallback(() => {
    setActiveModal('picker')
  }, [])

  const handleMediaSelect = useCallback((selectedMedia: Media[]) => {
    const newImages: ProductMedia[] = selectedMedia.map((media, index) => ({
      productId: productId || '',
      mediaId: media.id,
      sortOrder: images.length + index,
      isPrimary: images.length === 0 && index === 0, // First image is primary if no existing images
      media,
    }))

    onImagesChange([...images, ...newImages])
    setActiveModal(null)
  }, [productId, images, onImagesChange])

  const handleUploadComplete = useCallback((uploadedFiles: unknown[]) => {
    // Convert uploaded files to ProductMedia format
    const newImages: ProductMedia[] = uploadedFiles.map((file, index) => ({
      productId: productId || '',
      mediaId: file.id,
      sortOrder: images.length + index,
      isPrimary: images.length === 0 && index === 0, // First image is primary if no existing images
      media: {
        id: file.id,
        filename: file.filename,
        originalName: file.originalName,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        width: file.width,
        height: file.height,
        altText: file.altText,
        folder: file.folder,
        createdBy: file.createdBy,
        createdAt: new Date(file.createdAt),
        url: file.url,
        thumbnailUrl: file.thumbnailUrl,
        type: file.type,
      },
    }))

    onImagesChange([...images, ...newImages])
    setActiveModal(null)
  }, [productId, images, onImagesChange])

  const handleCloseModal = useCallback(() => {
    setActiveModal(null)
  }, [])

  const canAddMore = images.length < maxImages

  return (
    <div className={className}>
      {/* Main Gallery */}
      <ProductImageGallery
        images={images}
        onImageSelect={handleImageSelect}
        onImageReorder={handleImageReorder}
        onImageRemove={handleImageRemove}
        onPrimaryImageChange={handlePrimaryImageChange}
        onAddImages={handleAddImages}
        maxImages={maxImages}
        allowReorder={allowReorder}
        allowRemove={allowRemove}
        showPrimarySelector={showPrimarySelector}
      />

      {/* Add Images Options */}
      {canAddMore && activeModal === null && (
        <div className="mt-4 flex space-x-3">
          <button
            type="button"
            onClick={() => setActiveModal('picker')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Choose from Library
          </button>
          <button
            type="button"
            onClick={() => setActiveModal('upload')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Upload New Images
          </button>
        </div>
      )}

      {/* Media Picker Modal */}
      <MediaPicker
        isOpen={activeModal === 'picker'}
        onClose={handleCloseModal}
        onSelect={handleMediaSelect}
        multiple={true}
        allowedMediaTypes={['image']}
        maxSelection={maxImages - images.length}
        folder="products"
      />

      {/* Upload Modal */}
      {activeModal === 'upload' && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">Upload Images</h3>
              <p className="text-sm text-gray-500">
                Upload new images for this product
              </p>
            </div>
            
            <ImageUpload
              onUploadComplete={handleUploadComplete}
              onClose={handleCloseModal}
              maxFiles={maxImages - images.length}
              folder="products"
              acceptedTypes={['image/jpeg', 'image/png', 'image/webp', 'image/gif']}
            />
          </div>
        </div>
      )}
    </div>
  )
}