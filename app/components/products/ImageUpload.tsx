/**
 * ImageUpload Component
 * Handles image upload and processing for product management
 */

'use client'

import { useState, useRef, useCallback } from 'react'
import { CloudArrowUpIcon, XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

interface UploadFile {
  file: File
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  preview?: string
}

interface ImageUploadProps {
  onUploadComplete: (uploadedFiles: any[]) => void
  onClose: () => void
  maxFiles?: number
  maxFileSize?: number // in bytes
  acceptedTypes?: string[]
  folder?: string
}

export default function ImageUpload({
  onUploadComplete,
  onClose,
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  folder = 'products',
}: ImageUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateId = () => Math.random().toString(36).substr(2, 9)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File size exceeds ${formatFileSize(maxFileSize)} limit`
    }

    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      return `File type ${file.type} is not allowed`
    }

    return null
  }

  const createPreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.readAsDataURL(file)
    })
  }

  const addFiles = useCallback(async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles)
    
    if (files.length + fileArray.length > maxFiles) {
      alert(`You can only upload up to ${maxFiles} files`)
      return
    }

    const uploadFiles: UploadFile[] = []

    for (const file of fileArray) {
      const error = validateFile(file)
      const preview = file.type.startsWith('image/') ? await createPreview(file) : undefined
      
      uploadFiles.push({
        file,
        id: generateId(),
        progress: 0,
        status: error ? 'error' : 'pending',
        error: error || undefined,
        preview,
      })
    }

    setFiles(prev => [...prev, ...uploadFiles])
  }, [files.length, maxFiles, maxFileSize, acceptedTypes])

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles)
    }
  }, [addFiles])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      addFiles(selectedFiles)
    }
  }

  const uploadFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending')
    if (pendingFiles.length === 0) return

    setIsUploading(true)

    try {
      const formData = new FormData()
      pendingFiles.forEach(({ file }) => {
        formData.append('files', file)
      })

      if (folder) {
        formData.append('folder', folder)
      }

      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.status === 'pending' ? { ...f, status: 'uploading' as const } : f
      ))

      const response = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Upload failed')
      }

      const result = await response.json()
      
      // Update file statuses
      setFiles(prev => prev.map(f => {
        if (f.status === 'uploading') {
          const hasError = result.errors?.some((err: any) => err.filename === f.file.name)
          return {
            ...f,
            status: hasError ? 'error' : 'success',
            progress: 100,
            error: hasError ? result.errors.find((err: any) => err.filename === f.file.name)?.error : undefined,
          }
        }
        return f
      }))

      // Call completion handler with uploaded files
      if (result.uploadedFiles?.length > 0) {
        setTimeout(() => {
          onUploadComplete(result.uploadedFiles)
        }, 1000)
      }
    } catch (error) {
      // Mark all uploading files as error
      setFiles(prev => prev.map(f => 
        f.status === 'uploading' 
          ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
          : f
      ))
    } finally {
      setIsUploading(false)
    }
  }

  const hasValidFiles = files.some(f => f.status === 'pending')
  const hasErrors = files.some(f => f.status === 'error')
  const allSuccess = files.length > 0 && files.every(f => f.status === 'success')

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={clsx(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        )}
      >
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-4">
          <p className="text-lg font-medium text-gray-900">
            Drop images here or{' '}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-600 hover:text-blue-500 underline"
            >
              browse
            </button>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Supports JPEG, PNG, WebP, and GIF up to {formatFileSize(maxFileSize)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Maximum {maxFiles} files
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900">
            Selected Files ({files.length})
          </h4>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {files.map((uploadFile) => (
              <div
                key={uploadFile.id}
                className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg"
              >
                {/* Preview */}
                <div className="flex-shrink-0 w-12 h-12 bg-gray-200 rounded overflow-hidden">
                  {uploadFile.preview ? (
                    <img
                      src={uploadFile.preview}
                      alt={uploadFile.file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PhotoIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {uploadFile.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(uploadFile.file.size)}
                  </p>
                  {uploadFile.error && (
                    <p className="text-xs text-red-600 mt-1">
                      {uploadFile.error}
                    </p>
                  )}
                  
                  {/* Progress Bar */}
                  {uploadFile.status === 'uploading' && (
                    <div className="mt-2">
                      <div className="bg-gray-200 rounded-full h-1">
                        <div 
                          className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${uploadFile.progress}%` }}
                          role="progressbar"
                          aria-valuenow={uploadFile.progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Upload progress: ${uploadFile.progress}%`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center space-x-2">
                  {uploadFile.status === 'success' && (
                    <span className="text-green-600 text-sm">✓</span>
                  )}
                  {uploadFile.status === 'error' && (
                    <span className="text-red-600 text-sm">✗</span>
                  )}
                  {uploadFile.status === 'uploading' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(uploadFile.id)}
                    className="text-gray-400 hover:text-gray-600"
                    disabled={isUploading}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={isUploading}
        >
          {allSuccess ? 'Done' : 'Cancel'}
        </button>
        {!allSuccess && (
          <button
            type="button"
            onClick={uploadFiles}
            disabled={!hasValidFiles || isUploading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Upload Files'}
          </button>
        )}
      </div>

      {/* Status Messages */}
      {hasErrors && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">
            Some files failed to upload. Please check the errors above and try again.
          </p>
        </div>
      )}

      {allSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800">
            All files uploaded successfully!
          </p>
        </div>
      )}
    </div>
  )
}