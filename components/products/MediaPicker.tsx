/**
 * Media Picker Component for Products
 * Allows selecting media files for product associations
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { MagnifyingGlassIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/solid'

interface MediaFile {
  id: string
  filename: string
  originalName: string
  mimeType: string
  fileSize: number
  width?: number
  height?: number
  altText?: string
  folder: string
  url: string
  createdAt: string
}

interface MediaPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (selectedMedia: MediaFile[]) => void
  selectedMediaIds?: string[]
  multiple?: boolean
  allowedTypes?: string[]
  maxSelection?: number
}

export default function MediaPicker({
  isOpen,
  onClose,
  onSelect,
  selectedMediaIds = [],
  multiple = true,
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  maxSelection = 10
}: MediaPickerProps) {
  const [media, setMedia] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedMediaIds)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const itemsPerPage = 20

  // Fetch media files
  const fetchMedia = useCallback(async (page = 1, search = '') => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        ...(search && { search }),
        ...(allowedTypes.length > 0 && { mimeTypes: allowedTypes.join(',') })
      })

      const response = await fetch(`/api/media?${params}`)
      if (!response.ok) throw new Error('Failed to fetch media')

      const data = await response.json()
      setMedia(data.media || [])
      setTotalPages(Math.ceil((data.total || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error fetching media:', error)
      setMedia([])
    } finally {
      setLoading(false)
    }
  }, [allowedTypes, itemsPerPage])

  // Load media when component opens
  useEffect(() => {
    if (isOpen) {
      fetchMedia(currentPage, searchQuery)
    }
  }, [isOpen, currentPage, searchQuery, fetchMedia])

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
    fetchMedia(1, query)
  }

  // Handle media selection
  const handleMediaToggle = (mediaFile: MediaFile) => {
    if (!multiple) {
      setSelectedIds([mediaFile.id])
      return
    }

    setSelectedIds(prev => {
      if (prev.includes(mediaFile.id)) {
        return prev.filter(id => id !== mediaFile.id)
      } else {
        if (prev.length >= maxSelection) {
          return prev
        }
        return [...prev, mediaFile.id]
      }
    })
  }

  // Handle selection confirmation
  const handleConfirmSelection = () => {
    const selectedMedia = media.filter(m => selectedIds.includes(m.id))
    onSelect(selectedMedia)
    onClose()
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Select Media</h2>
            <p className="text-sm text-gray-600 mt-1">
              {multiple 
                ? `Select up to ${maxSelection} files (${selectedIds.length} selected)`
                : 'Select a file'
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search media files..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Media Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : media.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <PhotoIcon className="w-12 h-12 mb-4" />
              <p>No media files found</p>
              {searchQuery && (
                <p className="text-sm mt-2">Try adjusting your search terms</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {media.map((mediaFile) => {
                const isSelected = selectedIds.includes(mediaFile.id)
                const isImage = mediaFile.mimeType.startsWith('image/')

                return (
                  <div
                    key={mediaFile.id}
                    className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      isSelected
                        ? 'border-blue-600 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleMediaToggle(mediaFile)}
                  >
                    {/* Media Preview */}
                    <div className="aspect-square bg-gray-100 flex items-center justify-center">
                      {isImage ? (
                        <Image
                          src={mediaFile.url}
                          alt={mediaFile.altText || mediaFile.originalName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <PhotoIcon className="w-8 h-8 text-gray-400" />
                      )}
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1">
                        <CheckIcon className="w-4 h-4" />
                      </div>
                    )}

                    {/* File Info Overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-black/70 text-white p-2 transform translate-y-full group-hover:translate-y-0 transition-transform">
                      <p className="text-xs font-medium truncate">
                        {mediaFile.originalName}
                      </p>
                      <p className="text-xs text-gray-300">
                        {formatFileSize(mediaFile.fileSize)}
                      </p>
                      {isImage && mediaFile.width && mediaFile.height && (
                        <p className="text-xs text-gray-300">
                          {mediaFile.width} × {mediaFile.height}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2 p-6 border-t">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmSelection}
            disabled={selectedIds.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select {selectedIds.length > 0 && `(${selectedIds.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}