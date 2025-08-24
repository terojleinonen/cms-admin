/**
 * Media Library component
 * Main interface for managing media files
 */

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export default function MediaLibrary() {
  const { data: session } = useSession()
  const [media, setMedia] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load media files
  useEffect(() => {
    loadMedia()
  }, [])

  const loadMedia = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/media?limit=50')
      if (response.ok) {
        const data = await response.json()
        setMedia(data.mediaFiles || [])
      } else {
        const errorData = await response.json()
        setError(errorData.error?.message || 'Failed to load media')
        setMedia([])
      }
    } catch (error) {
      console.error('Error loading media:', error)
      setError('Failed to load media files')
      setMedia([])
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️'
    if (mimeType.startsWith('video/')) return '🎥'
    if (mimeType.startsWith('audio/')) return '🎵'
    if (mimeType.includes('pdf')) return '📄'
    return '📁'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-matte-black font-satoshi">Media Library</h1>
          <p className="text-slate-gray font-inter">
            Manage images, videos, and documents for your content
          </p>
        </div>
        
        <button
          onClick={loadMedia}
          className="btn-primary"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-700 font-inter">{error}</div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dusty-sage"></div>
        </div>
      ) : media.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-slate-gray mb-4">
            <div className="mx-auto h-12 w-12 bg-slate-gray/20 rounded-lg flex items-center justify-center">
              📁
            </div>
          </div>
          <h3 className="text-lg font-medium text-matte-black font-satoshi mb-2">
            No media files found
          </h3>
          <p className="text-slate-gray font-inter mb-4">
            Upload your first media file to get started.
          </p>
          <a
            href="/api/media"
            className="btn-secondary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Upload via API
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {media.map((file) => (
            <div key={file.id} className="card p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center space-x-3 mb-3">
                <div className="text-2xl">
                  {getFileIcon(file.mimeType)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-matte-black font-satoshi truncate">
                    {file.originalName || file.filename}
                  </h3>
                  <p className="text-xs text-slate-gray font-inter">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              
              {file.altText && (
                <p className="text-xs text-slate-gray font-inter mb-2">
                  {file.altText}
                </p>
              )}
              
              <div className="text-xs text-slate-gray font-inter">
                <div>Type: {file.mimeType}</div>
                <div>Uploaded: {new Date(file.createdAt).toLocaleDateString()}</div>
                {file.uploadedBy && (
                  <div>By: {file.uploadedBy.name}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {media.length > 0 && (
        <div className="card p-4">
          <div className="text-sm text-slate-gray font-inter">
            Showing {media.length} media files
          </div>
        </div>
      )}
    </div>
  )
}