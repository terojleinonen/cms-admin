/**
 * RichTextEditorWithMedia Component
 * Rich text editor with integrated media picker functionality
 */

'use client'

import { useState } from 'react'
import RichTextEditor from './RichTextEditor'
import MediaPicker from './MediaPicker'
import { Media } from '@/lib/types'

interface RichTextEditorWithMediaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  height?: string
  allowedMediaTypes?: ('image' | 'document' | 'video' | 'audio')[]
}

export default function RichTextEditorWithMedia({
  value,
  onChange,
  placeholder,
  disabled,
  height,
  allowedMediaTypes = ['image', 'document']
}: RichTextEditorWithMediaProps) {
  const [showMediaPicker, setShowMediaPicker] = useState(false)

  const handleMediaInsert = () => {
    setShowMediaPicker(true)
  }

  const handleMediaSelect = (media: Media) => {
    // Insert media into editor content
    let mediaHtml = ''
    
    if (media.mimeType.startsWith('image/')) {
      mediaHtml = `<img src="/api/media/${media.id}/file" alt="${media.altText || media.originalName}" style="max-width: 100%; height: auto;" />`
    } else {
      mediaHtml = `<a href="/api/media/${media.id}/file" target="_blank" rel="noopener noreferrer">${media.originalName}</a>`
    }

    // Insert at the end of current content
    const newContent = value + mediaHtml
    onChange(newContent)
    
    setShowMediaPicker(false)
  }

  return (
    <>
      <RichTextEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        height={height}
        allowMedia={true}
        onMediaInsert={handleMediaInsert}
      />
      
      <MediaPicker
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleMediaSelect}
        allowedTypes={allowedMediaTypes}
      />
    </>
  )
}