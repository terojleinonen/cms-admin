/**
 * MediaUpload component
 * Handles file upload with drag and drop functionality
 */

'use client'

import { useState, useRef, useCallback } from 'react'
import { XMarkIcon, CloudArrowUpIcon, DocumentIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

interface MediaUploadProps {
  onClose: () => void
  onSuccess: () => void
}

interface UploadFile {
  file: File
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

export default function MediaUpload({ onClose, onSuccess }: MediaUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [folder, setFolder] = useState('')
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
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return 'File size exceeds 10MB limit'
    }

    // Check file type
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // Documents
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv',
      // Video
      'video/mp4', 'video/webm', 'video/quicktime',
      // Audio
      'audio/mpeg', 'audio/wav', 'audio/ogg'
    ]

    if (!allowedTypes.includes(file.type)) {
      return `File type ${file.type} is not allowed`
    }

    return null
  }

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles)
    const uploadFiles: UploadFile[] = []

    fileArray.forEach(file => {
      const error = validateFile(file)
      uploadFiles.push({
        file,
        id: generateId(),
        progress: 0,
        status: error ? 'error' : 'pending',
        error: error || undefined,
      })
    })

    setFiles(prev => [...prev, ...uploadFiles])
  }, [])

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

      // Add folder parameter if specified
      const params = new URLSearchParams()
      if (folder.trim()) {
        params.append('folder', folder.trim())
      }

      const response = await fetch(`/api/media?${params}`, {
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
        if (f.status === 'pending') {
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

      // Show success message
      if (result.uploadedFiles?.length > 0) {
        setTimeout(() => {
          onSuccess()
        }, 1000)
      }
    } catch (error) {
      // Mark all pending files as error
      setFiles(prev => prev.map(f => 
        f.status === 'pending' 
          ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
          : f
      ))
    } finally {
      setIsUploading(false)
    }
  }

  const hasValidFiles = files.some(f => f.status === 'pending')
  const hasErrors = files.some(f => f.status === 'error')

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Upload Media Files</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close upload dialog"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Folder Input */}
        <div className="mb-4">
          <label htmlFor="folder" className="block text-sm font-medium text-gray-700 mb-1">
            Folder (optional)
          </label>
          <input
            id="folder"
            type="text"
            placeholder="e.g., products, blog, icons"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

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
              Drop files here or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-500 underline"
                aria-label="Browse files to upload"
              >
                browse
              </button>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Supports images, documents, videos, and audio files up to 10MB
            </p>
          </div>
          <label htmlFor="file-input" className="sr-only">
            Select files to upload
          </label>
          <input
            id="file-input"
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,.doc,.docx,.txt,.csv,video/*,audio/*"
            onChange={handleFileSelect}
            aria-label="Select files to upload"
            className="hidden"
          />
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Selected Files ({files.length})
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {files.map((uploadFile) => (
                <div
                  key={uploadFile.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <DocumentIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />
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
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {uploadFile.status === 'success' && (
                      <span className="text-green-600 text-sm">✓</span>
                    )}
                    {uploadFile.status === 'error' && (
                      <span className="text-red-600 text-sm">✗</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(uploadFile.id)}
                      className="text-gray-400 hover:text-gray-600"
                      disabled={isUploading}
                      aria-label={`Remove ${uploadFile.file.name} from upload list`}
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
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={uploadFiles}
            disabled={!hasValidFiles || isUploading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Upload Files'}
          </button>
        </div>

        {/* Upload Status */}
        {hasErrors && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              Some files failed to upload. Please check the errors above and try again.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}