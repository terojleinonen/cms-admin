/**
 * MediaGrid component
 * Displays media files in a responsive grid layout
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  DocumentIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  EyeIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

type MediaType = 'image' | 'document' | 'video' | 'audio'

interface MediaFile {
  id: string
  name: string
  originalName: string
  type: MediaType
  mimeType: string
  size: number
  url: string
  thumbnailUrl?: string
  folder?: string
  alt?: string
  caption?: string
  createdAt: string
  updatedAt: string
  createdBy: {
    id: string
    name: string
    email: string
  }
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface MediaGridProps {
  mediaFiles: MediaFile[]
  pagination: PaginationInfo
  loading: boolean
  onPageChange: (page: number) => void
  onSelectMedia: (media: MediaFile) => void
  onDeleteMedia: (mediaId: string) => void
}

const typeIcons = {
  image: null, // Will show actual image
  document: DocumentIcon,
  video: VideoCameraIcon,
  audio: MusicalNoteIcon,
}

const typeColors = {
  image: 'bg-green-100 text-green-600',
  document: 'bg-blue-100 text-blue-600',
  video: 'bg-purple-100 text-purple-600',
  audio: 'bg-orange-100 text-orange-600',
}

export default function MediaGrid({
  mediaFiles,
  pagination,
  loading,
  onPageChange,
  onSelectMedia,
  onDeleteMedia,
}: MediaGridProps) {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const toggleFileSelection = (fileId: string) => {
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId)
    } else {
      newSelected.add(fileId)
    }
    setSelectedFiles(newSelected)
  }

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedFiles.size} file(s)?`)) {
      return
    }

    // Delete files one by one (could be optimized with bulk API)
    for (const fileId of selectedFiles) {
      await onDeleteMedia(fileId)
    }
    
    setSelectedFiles(new Set())
  }

  const renderMediaPreview = (media: MediaFile) => {
    if (media.type === 'image') {
      return (
        <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
          <Image
            src={media.thumbnailUrl || media.url}
            alt={media.alt || media.originalName}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )
    }

    const IconComponent = typeIcons[media.type]
    if (IconComponent) {
      return (
        <div className={clsx(
          'w-full h-32 rounded-lg flex items-center justify-center',
          typeColors[media.type]
        )}>
          <IconComponent className="h-12 w-12" />
        </div>
      )
    }

    return (
      <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
        <DocumentIcon className="h-12 w-12 text-gray-400" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-32 rounded-lg mb-2"></div>
              <div className="bg-gray-200 h-4 rounded mb-1"></div>
              <div className="bg-gray-200 h-3 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (mediaFiles.length === 0) {
    return (
      <div className="p-12 text-center">
        <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No media files</h3>
        <p className="mt-1 text-sm text-gray-500">
          Upload some files to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Bulk Actions */}
      {selectedFiles.size > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-blue-800">
            {selectedFiles.size} file(s) selected
          </span>
          <button
            type="button"
            onClick={handleBulkDelete}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Delete Selected
          </button>
        </div>
      )}

      {/* Media Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
        {mediaFiles.map((media) => (
          <div
            key={media.id}
            className={clsx(
              'group relative bg-white border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer',
              selectedFiles.has(media.id) ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'
            )}
          >
            {/* Selection Checkbox */}
            <div className="absolute top-2 left-2 z-10">
              <label htmlFor={`select-media-${media.id}`} className="sr-only">
                Select {media.originalName}
              </label>
              <input
                id={`select-media-${media.id}`}
                type="checkbox"
                checked={selectedFiles.has(media.id)}
                onChange={() => toggleFileSelection(media.id)}
                aria-label={`Select ${media.originalName}`}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            {/* Action Buttons */}
            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectMedia(media)
                  }}
                  className="p-1 bg-white rounded shadow-sm hover:bg-gray-50"
                  title="View details"
                  aria-label={`View details for ${media.originalName}`}
                >
                  <EyeIcon className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteMedia(media.id)
                  }}
                  className="p-1 bg-white rounded shadow-sm hover:bg-gray-50"
                  title="Delete"
                  aria-label={`Delete ${media.originalName}`}
                >
                  <TrashIcon className="h-4 w-4 text-red-600" />
                </button>
              </div>
            </div>

            {/* Media Preview */}
            <div onClick={() => onSelectMedia(media)}>
              {renderMediaPreview(media)}
            </div>

            {/* Media Info */}
            <div className="mt-2">
              <h3 className="text-sm font-medium text-gray-900 truncate" title={media.originalName}>
                {media.originalName}
              </h3>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-500 uppercase">
                  {media.type}
                </span>
                <span className="text-xs text-gray-500">
                  {formatFileSize(media.size)}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {formatDate(media.createdAt)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Go to previous page"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            
            {/* Page Numbers */}
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const pageNum = Math.max(1, pagination.page - 2) + i
              if (pageNum > pagination.totalPages) return null
              
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={clsx(
                    'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
                    pageNum === pagination.page
                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  )}
                  aria-label={`Go to page ${pageNum}`}
                  aria-current={pageNum === pagination.page ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              )
            })}
            
            <button
              type="button"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Go to next page"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}