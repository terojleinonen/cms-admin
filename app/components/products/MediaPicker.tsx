/**
 * MediaPicker component for Product Management
 * Advanced modal for selecting media files with folder navigation, search, and filtering
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
  XMarkIcon,
  PhotoIcon,
  DocumentIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  FolderIcon,
  FolderOpenIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ArrowUpIcon,
  CheckIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { Media, PaginationInfo } from '@/app/lib/types'

interface MediaFolder {
  name: string
  path: string
  count: number
}

interface MediaPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (media: Media[]) => void
  multiple?: boolean
  accept?: string[]
  selectedMedia?: Media[]
  allowedMediaTypes?: ('image' | 'document' | 'video' | 'audio')[]
  maxSelection?: number
  folder?: string
}

const typeIcons = {
  image: PhotoIcon,
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

export default function MediaPicker({
  isOpen,
  onClose,
  onSelect,
  multiple = false,
  accept = [],
  selectedMedia = [],
  allowedMediaTypes = ['image', 'document', 'video', 'audio'],
  maxSelection = 10,
  folder: initialFolder = '',
}: MediaPickerProps) {
  const [media, setMedia] = useState<Media[]>([])
  const [folders, setFolders] = useState<MediaFolder[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [currentFolder, setCurrentFolder] = useState(initialFolder)
  const [selected, setSelected] = useState<Media[]>(selectedMedia)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  // Breadcrumb navigation
  const breadcrumbs = currentFolder
    ? currentFolder.split('/').reduce((acc, part, index, array) => {
        const path = array.slice(0, index + 1).join('/')
        acc.push({ name: part, path })
        return acc
      }, [] as { name: string; path: string }[])
    : []

  useEffect(() => {
    if (isOpen) {
      fetchMedia()
      fetchFolders()
    }
  }, [isOpen, search, currentFolder, pagination.page])

  useEffect(() => {
    setSelected(selectedMedia)
  }, [selectedMedia])

  const fetchMedia = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })
      
      if (search) params.append('search', search)
      if (currentFolder) params.append('folder', currentFolder)
      if (accept.length > 0) params.append('type', accept.join(','))

      const response = await fetch(`/api/media?${params}`)
      if (response.ok) {
        const data = await response.json()
        setMedia(data.media || [])
        setPagination(data.pagination || pagination)
      }
    } catch (error) {
      console.error('Failed to fetch media:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFolders = async () => {
    try {
      const params = new URLSearchParams()
      if (currentFolder) params.append('parent', currentFolder)

      const response = await fetch(`/api/media/folders?${params}`)
      if (response.ok) {
        const data = await response.json()
        setFolders(data.folders || [])
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error)
      // Set empty folders if API doesn't exist yet
      setFolders([])
    }
  }

  const handleSelect = useCallback((mediaItem: Media) => {
    if (multiple) {
      const isSelected = selected.some(s => s.id === mediaItem.id)
      if (isSelected) {
        setSelected(prev => prev.filter(s => s.id !== mediaItem.id))
      } else if (selected.length < maxSelection) {
        setSelected(prev => [...prev, mediaItem])
      }
    } else {
      onSelect([mediaItem])
      onClose()
    }
  }, [multiple, selected, maxSelection, onSelect, onClose])

  const handleConfirm = useCallback(() => {
    onSelect(selected)
    onClose()
  }, [selected, onSelect, onClose])

  const handleFolderClick = useCallback((folderPath: string) => {
    setCurrentFolder(folderPath)
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  const handleBreadcrumbClick = useCallback((path: string) => {
    setCurrentFolder(path)
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  const handleGoUp = useCallback(() => {
    const parentPath = currentFolder.split('/').slice(0, -1).join('/')
    setCurrentFolder(parentPath)
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [currentFolder])

  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }, [])

  const getMediaType = (mimeType: string): 'image' | 'document' | 'video' | 'audio' => {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    return 'document'
  }

  const getMediaUrl = (mediaItem: Media): string => {
    return mediaItem.url || `/api/media/${mediaItem.id}`
  }

  const getThumbnailUrl = (mediaItem: Media): string => {
    return mediaItem.thumbnailUrl || getMediaUrl(mediaItem)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const isMediaSelected = (mediaItem: Media): boolean => {
    return selected.some(s => s.id === mediaItem.id)
  }

  const canSelectMore = selected.length < maxSelection

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-6 border w-full max-w-6xl shadow-lg rounded-md bg-white my-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Select Media</h3>
            <p className="text-sm text-gray-500">
              {multiple 
                ? `Select up to ${maxSelection} files (${selected.length} selected)`
                : 'Select a file'
              }
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close media picker"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Search and Navigation */}
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search media files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Breadcrumbs */}
          <div className="flex items-center space-x-2 text-sm">
            <button
              type="button"
              onClick={() => handleBreadcrumbClick('')}
              className={clsx(
                'px-2 py-1 rounded hover:bg-gray-100',
                !currentFolder ? 'text-blue-600 font-medium' : 'text-gray-600'
              )}
            >
              All Files
            </button>
            
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.path} className="flex items-center space-x-2">
                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                <button
                  type="button"
                  onClick={() => handleBreadcrumbClick(crumb.path)}
                  className={clsx(
                    'px-2 py-1 rounded hover:bg-gray-100',
                    index === breadcrumbs.length - 1
                      ? 'text-blue-600 font-medium'
                      : 'text-gray-600'
                  )}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
            
            {currentFolder && (
              <button
                type="button"
                onClick={handleGoUp}
                className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                title="Go up one level"
              >
                <ArrowUpIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex space-x-6">
          {/* Folders Sidebar */}
          {folders.length > 0 && (
            <div className="w-64 flex-shrink-0">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Folders</h4>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {folders.map((folder) => (
                  <button
                    key={folder.path}
                    type="button"
                    onClick={() => handleFolderClick(folder.path)}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                  >
                    <FolderIcon className="h-4 w-4 text-gray-400" />
                    <span className="flex-1 truncate">{folder.name}</span>
                    <span className="text-xs text-gray-500">{folder.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Media Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : media.length === 0 ? (
              <div className="text-center py-12">
                <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No media found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {search ? 'Try adjusting your search terms.' : 'Upload some files to get started.'}
                </p>
              </div>
            ) : (
              <>
                {/* Media Items */}
                <div className="grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-6">
                  {media.map((mediaItem) => {
                    const mediaType = getMediaType(mediaItem.mimeType)
                    const isSelected = isMediaSelected(mediaItem)
                    const IconComponent = typeIcons[mediaType]

                    return (
                      <div
                        key={mediaItem.id}
                        onClick={() => handleSelect(mediaItem)}
                        className={clsx(
                          'group relative cursor-pointer border-2 rounded-lg overflow-hidden transition-all duration-200',
                          {
                            'border-blue-500 ring-2 ring-blue-200': isSelected,
                            'border-gray-200 hover:border-gray-300': !isSelected,
                            'opacity-50 cursor-not-allowed': !canSelectMore && !isSelected && multiple,
                          }
                        )}
                      >
                        {/* Selection Indicator */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 z-10 bg-blue-600 rounded-full p-1">
                            <CheckIcon className="h-3 w-3 text-white" />
                          </div>
                        )}

                        {/* Media Preview */}
                        <div className="aspect-square relative bg-gray-100">
                          {mediaType === 'image' ? (
                            <Image
                              src={getThumbnailUrl(mediaItem)}
                              alt={mediaItem.altText || mediaItem.originalName}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw"
                            />
                          ) : (
                            <div className={clsx(
                              'w-full h-full flex items-center justify-center',
                              typeColors[mediaType]
                            )}>
                              <IconComponent className="h-8 w-8" />
                            </div>
                          )}
                        </div>

                        {/* Media Info */}
                        <div className="p-2">
                          <p className="text-xs font-medium text-gray-900 truncate" title={mediaItem.originalName}>
                            {mediaItem.originalName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(mediaItem.fileSize)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
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
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        <ChevronLeftIcon className="h-4 w-4" />
                      </button>
                      
                      <span className="text-sm text-gray-700">
                        Page {pagination.page} of {pagination.totalPages}
                      </span>
                      
                      <button
                        type="button"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page >= pagination.totalPages}
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        <ChevronRightIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        {multiple && (
          <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {selected.length} of {maxSelection} files selected
            </div>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={selected.length === 0}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Select {selected.length > 0 && `(${selected.length})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}