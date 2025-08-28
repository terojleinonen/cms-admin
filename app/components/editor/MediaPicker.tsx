/**
 * MediaPicker Component
 * Modal for selecting and inserting media into rich text editor
 */

'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, PhotoIcon, DocumentIcon } from '@heroicons/react/24/outline'
import { Media } from '@/lib/types'

interface MediaPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (media: Media) => void
  allowedTypes?: ('image' | 'document' | 'video' | 'audio')[]
}

export default function MediaPicker({
  isOpen,
  onClose,
  onSelect,
  allowedTypes = ['image', 'document']
}: MediaPickerProps) {
  const [media, setMedia] = useState<Media[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('')

  useEffect(() => {
    if (isOpen) {
      fetchMedia()
    }
  }, [isOpen, searchQuery, selectedType])

  const fetchMedia = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (searchQuery) params.append('search', searchQuery)
      if (selectedType) params.append('type', selectedType)
      
      const response = await fetch(`/api/media?${params}`)
      if (!response.ok) throw new Error('Failed to fetch media')
      
      const data = await response.json()
      setMedia(data.media || [])
    } catch (error) {
      console.error('Error fetching media:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (selectedMedia: Media) => {
    onSelect(selectedMedia)
    onClose()
  }

  const getMediaIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <PhotoIcon className="h-8 w-8 text-gray-400" />
    }
    return <DocumentIcon className="h-8 w-8 text-gray-400" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const isAllowedType = (mimeType: string) => {
    return allowedTypes.some(type => {
      switch (type) {
        case 'image':
          return mimeType.startsWith('image/')
        case 'document':
          return mimeType.startsWith('application/') || mimeType.startsWith('text/')
        case 'video':
          return mimeType.startsWith('video/')
        case 'audio':
          return mimeType.startsWith('audio/')
        default:
          return false
      }
    })
  }

  const filteredMedia = media.filter(item => isAllowedType(item.mimeType))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Select Media</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close media picker"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mb-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              aria-label="Filter media by type"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              {allowedTypes.includes('image') && <option value="image">Images</option>}
              {allowedTypes.includes('document') && <option value="document">Documents</option>}
              {allowedTypes.includes('video') && <option value="video">Videos</option>}
              {allowedTypes.includes('audio') && <option value="audio">Audio</option>}
            </select>
          </div>
        </div>

        {/* Media Grid */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="text-center py-12">
              <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No media found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery ? 'Try adjusting your search terms.' : 'Upload some media files to get started.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredMedia.map((item) => (
                <div
                  key={item.id}
                  className="relative group cursor-pointer border border-gray-200 rounded-lg p-3 hover:border-blue-500 hover:shadow-md transition-all"
                  onClick={() => handleSelect(item)}
                >
                  {/* Media Preview */}
                  <div className="aspect-square flex items-center justify-center bg-gray-50 rounded-md mb-2">
                    {item.mimeType.startsWith('image/') ? (
                      <img
                        src={`/api/media/${item.id}/file`}
                        alt={item.altText || item.originalName}
                        className="w-full h-full object-cover rounded-md"
                      />
                    ) : (
                      getMediaIcon(item.mimeType)
                    )}
                  </div>

                  {/* Media Info */}
                  <div className="text-xs">
                    <p className="font-medium text-gray-900 truncate" title={item.originalName}>
                      {item.originalName}
                    </p>
                    <p className="text-gray-500 mt-1">
                      {formatFileSize(item.fileSize)}
                    </p>
                    {item.width && item.height && (
                      <p className="text-gray-500">
                        {item.width} × {item.height}
                      </p>
                    )}
                  </div>

                  {/* Selection Overlay */}
                  <div className="absolute inset-0 bg-blue-600 bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                      Select
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}