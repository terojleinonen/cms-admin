/**
 * ProfilePictureManager Component
 * Handles profile picture upload with drag-and-drop, cropping, and preview capabilities
 */

'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { 
  PhotoIcon, 
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import Image from 'next/image'
import Button from '@/components/ui/Button'

interface ProfilePictureManagerProps {
  currentImage?: string
  onUpload: (file: File) => Promise<void>
  onRemove?: () => Promise<void>
  maxFileSize?: number // in bytes
  allowedFormats?: string[]
  disabled?: boolean
  className?: string
}

interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

interface ImageValidationResult {
  isValid: boolean
  error?: string
  compressedFile?: File
}

export default function ProfilePictureManager({
  currentImage,
  onUpload,
  onRemove,
  maxFileSize = 5 * 1024 * 1024, // 5MB default
  allowedFormats = ['image/jpeg', 'image/png', 'image/webp'],
  disabled = false,
  className = ''
}: ProfilePictureManagerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 200, height: 200 })
  const [showCropper, setShowCropper] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Clear messages after timeout
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccess(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  /**
   * Compress image using canvas
   */
  const compressImage = useCallback(async (file: File, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const img = new window.Image()

      img.onload = () => {
        // Calculate new dimensions (max 1200px)
        const maxSize = 1200
        let { width, height } = img

        if (width > height && width > maxSize) {
          height = (height * maxSize) / width
          width = maxSize
        } else if (height > maxSize) {
          width = (width * maxSize) / height
          height = maxSize
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            })
            resolve(compressedFile)
          } else {
            resolve(file)
          }
        }, file.type, quality)
      }

      img.src = URL.createObjectURL(file)
    })
  }, [])

  /**
   * Validate and compress image file
   */
  const validateAndCompressImage = useCallback(async (file: File): Promise<ImageValidationResult> => {
    // Check file type
    if (!allowedFormats.includes(file.type)) {
      return {
        isValid: false,
        error: `Invalid file format. Allowed formats: ${allowedFormats.map(f => f.split('/')[1]).join(', ')}`
      }
    }

    // Check file size
    if (file.size > maxFileSize) {
      return {
        isValid: false,
        error: `File size too large. Maximum size: ${Math.round(maxFileSize / (1024 * 1024))}MB`
      }
    }

    try {
      // Create image element to validate dimensions
      const img = new window.Image()
      const imageUrl = URL.createObjectURL(file)
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imageUrl
      })

      URL.revokeObjectURL(imageUrl)

      // Check minimum dimensions
      if (img.width < 100 || img.height < 100) {
        return {
          isValid: false,
          error: 'Image must be at least 100x100 pixels'
        }
      }

      // Compress image if needed
      let compressedFile = file
      if (file.size > 1024 * 1024) { // If larger than 1MB, compress
        compressedFile = await compressImage(file, 0.8)
      }

      return {
        isValid: true,
        compressedFile
      }
    } catch {
      return {
        isValid: false,
        error: 'Invalid image file'
      }
    }
  }, [allowedFormats, maxFileSize, compressImage])

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(async (file: File) => {
    setError(null)
    setSuccess(null)

    const validation = await validateAndCompressImage(file)
    
    if (!validation.isValid) {
      setError(validation.error!)
      return
    }

    const fileToUse = validation.compressedFile || file
    setSelectedFile(fileToUse)
    
    // Create preview URL
    const url = URL.createObjectURL(fileToUse)
    setPreviewUrl(url)
    setShowCropper(true)
  }, [validateAndCompressImage])

  /**
   * Handle drag and drop events
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [disabled, handleFileSelect])

  /**
   * Handle file input change
   */
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  /**
   * Crop image and create final file
   */
  const cropImage = useCallback(async (): Promise<File | null> => {
    if (!selectedFile || !imageRef.current || !canvasRef.current) return null

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const img = imageRef.current

    // Set canvas size to crop area
    canvas.width = cropArea.width
    canvas.height = cropArea.height

    // Draw cropped image
    ctx.drawImage(
      img,
      cropArea.x,
      cropArea.y,
      cropArea.width,
      cropArea.height,
      0,
      0,
      cropArea.width,
      cropArea.height
    )

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], selectedFile.name, {
            type: selectedFile.type,
            lastModified: Date.now()
          })
          resolve(croppedFile)
        } else {
          resolve(null)
        }
      }, selectedFile.type, 0.9)
    })
  }, [selectedFile, cropArea])

  /**
   * Handle upload confirmation
   */
  const handleUploadConfirm = useCallback(async () => {
    if (!selectedFile) return

    try {
      setIsUploading(true)
      setError(null)

      let fileToUpload = selectedFile
      
      // If cropper is shown, crop the image first
      if (showCropper) {
        const croppedFile = await cropImage()
        if (croppedFile) {
          fileToUpload = croppedFile
        }
      }

      await onUpload(fileToUpload)
      
      // Clean up
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(null)
      setSelectedFile(null)
      setShowCropper(false)
      setSuccess('Profile picture updated successfully!')
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }, [selectedFile, showCropper, cropImage, onUpload, previewUrl])

  /**
   * Handle upload cancellation
   */
  const handleCancel = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setSelectedFile(null)
    setShowCropper(false)
    setError(null)
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [previewUrl])

  /**
   * Handle remove current image
   */
  const handleRemove = useCallback(async () => {
    if (!onRemove) return

    try {
      setIsUploading(true)
      await onRemove()
      setSuccess('Profile picture removed successfully!')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to remove image')
    } finally {
      setIsUploading(false)
    }
  }, [onRemove])

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Image Display */}
      <div className="flex items-center space-x-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
            {currentImage ? (
              <Image
                src={currentImage}
                alt="Current profile picture"
                className="w-full h-full object-cover"
                width={96}
                height={96}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <PhotoIcon className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900">Profile Picture</h3>
          <p className="text-sm text-gray-500">
            Upload a new picture or drag and drop. JPG, PNG, or WebP formats. Max {Math.round(maxFileSize / (1024 * 1024))}MB.
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-md">
          <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
          <span className="text-sm text-green-700">{success}</span>
        </div>
      )}

      {/* Upload Area */}
      {!showCropper && (
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${isDragging 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={allowedFormats.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled}
          />
          
          <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-900">
              {isDragging ? 'Drop image here' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {allowedFormats.map(f => f.split('/')[1]).join(', ').toUpperCase()} up to {Math.round(maxFileSize / (1024 * 1024))}MB
            </p>
          </div>
        </div>
      )}

      {/* Image Cropper */}
      {showCropper && previewUrl && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Crop Your Image</h4>
            
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imageRef}
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-64 rounded"
                onLoad={() => {
                  // Set initial crop area to center square
                  if (imageRef.current) {
                    const img = imageRef.current
                    const size = Math.min(img.naturalWidth, img.naturalHeight, 300)
                    const x = (img.naturalWidth - size) / 2
                    const y = (img.naturalHeight - size) / 2
                    setCropArea({ x, y, width: size, height: size })
                  }
                }}
              />
              
              {/* Crop overlay would go here in a full implementation */}
              <div className="absolute inset-0 border-2 border-blue-500 rounded opacity-50 pointer-events-none" />
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              Image will be cropped to a square format for your profile picture.
            </p>
          </div>

          {/* Cropper Actions */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadConfirm}
              loading={isUploading}
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload Picture'}
            </Button>
          </div>
        </div>
      )}

      {/* Remove Button */}
      {currentImage && onRemove && !showCropper && (
        <div className="flex justify-start">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={disabled || isUploading}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            Remove Picture
          </Button>
        </div>
      )}

      {/* Hidden canvas for cropping */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}