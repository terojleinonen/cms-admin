/**
 * MediaModal component
 * Modal for viewing and editing media file details
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  XMarkIcon,
  DocumentIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  TrashIcon,
  ClipboardDocumentIcon,
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

interface MediaModalProps {
  media: MediaFile
  onClose: () => void
  onUpdate: (mediaId: string, updates: Partial<MediaFile>) => void
  onDelete: (mediaId: string) => void
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

export default function MediaModal({
  media,
  onClose,
  onUpdate,
  onDelete,
}: MediaModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    alt: media.alt || '',
    caption: media.caption || '',
    folder: media.folder || '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onUpdate(media.id, editData)
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating media:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this media file? This action cannot be undone.')) {
      await onDelete(media.id)
      onClose()
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const getFullUrl = (url: string) => {
    return url.startsWith('http') ? url : `${window.location.origin}${url}`
  }

  const renderMediaPreview = () => {
    if (media.type === 'image') {
      return (
        <div className="relative w-full h-80 bg-gray-100 rounded-lg overflow-hidden">
          <Image
            src={media.url}
            alt={media.alt || media.originalName}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      )
    }

    const IconComponent = typeIcons[media.type]
    if (IconComponent) {
      return (
        <div className={clsx(
          'w-full h-80 rounded-lg flex flex-col items-center justify-center',
          typeColors[media.type]
        )}>
          <IconComponent className="h-24 w-24 mb-4" />
          <p className="text-lg font-medium">{media.originalName}</p>
          <p className="text-sm opacity-75">{media.mimeType}</p>
        </div>
      )
    }

    return (
      <div className="w-full h-80 bg-gray-100 rounded-lg flex flex-col items-center justify-center">
        <DocumentIcon className="h-24 w-24 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900">{media.originalName}</p>
        <p className="text-sm text-gray-500">{media.mimeType}</p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white mb-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Media Details</h3>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50"
            >
              <TrashIcon className="h-4 w-4 inline mr-1" />
              Delete
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close modal"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Media Preview */}
          <div>
            {renderMediaPreview()}
          </div>

          {/* Media Information */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">File Information</h4>
              <dl className="space-y-2">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Original Name
                  </dt>
                  <dd className="text-sm text-gray-900">{media.originalName}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    File Name
                  </dt>
                  <dd className="text-sm text-gray-900">{media.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Type
                  </dt>
                  <dd className="text-sm text-gray-900 capitalize">{media.type}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    MIME Type
                  </dt>
                  <dd className="text-sm text-gray-900">{media.mimeType}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Size
                  </dt>
                  <dd className="text-sm text-gray-900">{formatFileSize(media.size)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Uploaded
                  </dt>
                  <dd className="text-sm text-gray-900">{formatDate(media.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Uploaded By
                  </dt>
                  <dd className="text-sm text-gray-900">
                    {media.createdBy.name || media.createdBy.email}
                  </dd>
                </div>
              </dl>
            </div>

            {/* URL Copy */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">File URL</h4>
              <div className="flex items-center space-x-2">
                <label htmlFor="media-url" className="sr-only">
                  Media file URL
                </label>
                <input
                  id="media-url"
                  type="text"
                  value={getFullUrl(media.url)}
                  readOnly
                  aria-label="Media file URL"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(getFullUrl(media.url))}
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  title="Copy URL"
                  aria-label="Copy URL to clipboard"
                >
                  <ClipboardDocumentIcon className="h-4 w-4" />
                </button>
              </div>
              {copySuccess && (
                <p className="text-xs text-green-600 mt-1">URL copied to clipboard!</p>
              )}
            </div>

            {/* Editable Fields */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Metadata</h4>
              <div className="space-y-4">
                {/* Alt Text */}
                <div>
                  <label htmlFor="alt" className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Alt Text {media.type === 'image' && '(for accessibility)'}
                  </label>
                  {isEditing ? (
                    <input
                      id="alt"
                      type="text"
                      value={editData.alt}
                      onChange={(e) => setEditData({ ...editData, alt: e.target.value })}
                      placeholder="Describe this media file..."
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{media.alt || 'No alt text'}</p>
                  )}
                </div>

                {/* Caption */}
                <div>
                  <label htmlFor="caption" className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Caption
                  </label>
                  {isEditing ? (
                    <textarea
                      id="caption"
                      value={editData.caption}
                      onChange={(e) => setEditData({ ...editData, caption: e.target.value })}
                      placeholder="Add a caption..."
                      rows={3}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{media.caption || 'No caption'}</p>
                  )}
                </div>

                {/* Folder */}
                <div>
                  <label htmlFor="folder" className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Folder
                  </label>
                  {isEditing ? (
                    <input
                      id="folder"
                      type="text"
                      value={editData.folder}
                      onChange={(e) => setEditData({ ...editData, folder: e.target.value })}
                      placeholder="e.g., products, blog, icons"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{media.folder || 'No folder'}</p>
                  )}
                </div>
              </div>

              {/* Save Button */}
              {isEditing && (
                <div className="mt-4 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}