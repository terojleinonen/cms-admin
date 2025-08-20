/**
 * RichTextEditor Component
 * Reusable rich text editor with media insertion and content sanitization
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import DOMPurify from 'dompurify'
import { PhotoIcon } from '@heroicons/react/24/outline'
import { getEditorHeightClass } from '../../../utils/dynamic-styles'

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <div className="h-32 bg-gray-100 animate-pulse rounded-md" />
})

// Import Quill styles
import 'react-quill/dist/quill.snow.css'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  height?: string
  allowMedia?: boolean
  onMediaInsert?: () => void
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter content...',
  disabled = false,
  height = '300px',
  allowMedia = true,
  onMediaInsert,
}: RichTextEditorProps) {
  const quillRef = useRef<any>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Sanitization configuration
  const sanitizeConfig = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'span', 'div'
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'src', 'alt', 'width', 'height', 'style', 'class'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  }

  const handleChange = (content: string) => {
    // Sanitize content before passing to parent
    const sanitizedContent = DOMPurify.sanitize(content, sanitizeConfig)
    onChange(sanitizedContent)
  }

  const handleMediaInsert = () => {
    if (onMediaInsert) {
      onMediaInsert()
    }
  }

  // Quill modules configuration
  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        ['blockquote', 'code-block'],
        [{ 'align': [] }],
        ['link'],
        ...(allowMedia ? [['image']] : []),
        ['clean']
      ],
      handlers: {
        ...(allowMedia && onMediaInsert ? {
          image: handleMediaInsert
        } : {})
      }
    },
    clipboard: {
      matchVisual: false,
    }
  }

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'video',
    'align', 'color', 'background',
    'code-block'
  ]

  if (!isClient) {
    return (
      <div
        className={`border border-gray-300 rounded-md bg-gray-100 animate-pulse ${getEditorHeightClass(height)}`}
      />
    )
  }

  return (
    <div className="rich-text-editor">
      {/* Custom Media Insert Button */}
      {allowMedia && onMediaInsert && (
        <div className="mb-2">
          <button
            type="button"
            onClick={handleMediaInsert}
            className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={disabled}
          >
            <PhotoIcon className="h-4 w-4 mr-1" />
            Insert Media
          </button>
        </div>
      )}

      {/* Quill Editor */}
      <div className={`editor-container ${getEditorHeightClass(height)}`}>
        <ReactQuill
          theme="snow"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          readOnly={disabled}
          modules={modules}
          formats={formats}
        />
      </div>

      {/* Character Count */}
      <div className="mt-2 text-xs text-gray-500 text-right">
        {value.replace(/<[^>]*>/g, '').length} characters
      </div>
    </div>
  )
}

// Utility function to extract plain text from HTML
export function getPlainText(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

// Utility function to truncate HTML content
export function truncateHtml(html: string, maxLength: number): string {
  const plainText = getPlainText(html)
  if (plainText.length <= maxLength) return html

  const truncated = plainText.substring(0, maxLength) + '...'
  return `<p>${truncated}</p>`
}

// Utility function to validate HTML content
export function validateHtmlContent(html: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Check for empty content
  if (!html || getPlainText(html).length === 0) {
    errors.push('Content cannot be empty')
  }

  // Check for potentially dangerous content
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick, onload, etc.
  ]

  dangerousPatterns.forEach(pattern => {
    if (pattern.test(html)) {
      errors.push('Content contains potentially dangerous elements')
    }
  })

  return {
    isValid: errors.length === 0,
    errors
  }
}