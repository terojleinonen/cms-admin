/**
 * NativeRichTextEditor Component
 * Native rich text editor using contentEditable and browser APIs
 * Replaces Quill with platform-native functionality
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import DOMPurify from 'dompurify'
import { htmlToText } from 'html-to-text'
import { 
  PhotoIcon,
  LinkIcon,
  ListBulletIcon
} from '@heroicons/react/24/outline'

// Custom icons for formatting
const BoldIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
  </svg>
)

const ItalicIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 4h6M8 20h6m1-16-4 16" />
  </svg>
)

const UnderlineIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 19h12M8 4v8a4 4 0 0 0 8 0V4" />
  </svg>
)

const NumberedListIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
)
import { getEditorHeightClass } from '@/utils/dynamic-styles'

interface NativeRichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  height?: string
  allowMedia?: boolean
  onMediaInsert?: () => void
}

export default function NativeRichTextEditor({
  value,
  onChange,
  placeholder = 'Enter content...',
  disabled = false,
  height = '300px',
  allowMedia = true,
  onMediaInsert,
}: NativeRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isClient, setIsClient] = useState(false)
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set())

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

  // Update active formats based on current selection
  const updateActiveFormats = useCallback(() => {
    const formats = new Set<string>()
    
    if (document.queryCommandState('bold')) formats.add('bold')
    if (document.queryCommandState('italic')) formats.add('italic')
    if (document.queryCommandState('underline')) formats.add('underline')
    if (document.queryCommandState('insertUnorderedList')) formats.add('bulletList')
    if (document.queryCommandState('insertOrderedList')) formats.add('numberedList')
    
    setActiveFormats(formats)
  }, [])

  // Handle content changes
  const handleInput = useCallback(() => {
    if (!editorRef.current) return
    
    const content = editorRef.current.innerHTML
    const sanitizedContent = DOMPurify.sanitize(content, sanitizeConfig)
    
    // Only call onChange if content actually changed
    if (sanitizedContent !== value) {
      onChange(sanitizedContent)
    }
    
    updateActiveFormats()
  }, [onChange, value, sanitizeConfig, updateActiveFormats])

  // Handle selection changes
  const handleSelectionChange = useCallback(() => {
    updateActiveFormats()
  }, [updateActiveFormats])

  // Execute formatting commands
  const executeCommand = useCallback((command: string, value?: string) => {
    if (disabled) return
    
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    handleInput()
  }, [disabled, handleInput])

  // Format button handlers
  const toggleBold = () => executeCommand('bold')
  const toggleItalic = () => executeCommand('italic')
  const toggleUnderline = () => executeCommand('underline')
  const toggleBulletList = () => executeCommand('insertUnorderedList')
  const toggleNumberedList = () => executeCommand('insertOrderedList')
  
  const insertLink = () => {
    const url = prompt('Enter URL:')
    if (url) {
      executeCommand('createLink', url)
    }
  }

  const handleMediaInsert = () => {
    if (onMediaInsert) {
      onMediaInsert()
    }
  }

  // Set initial content
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value
    }
  }, [value])

  // Add event listeners
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    document.addEventListener('selectionchange', handleSelectionChange)
    
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [handleSelectionChange])

  // Handle paste events to sanitize content
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    
    const paste = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain')
    const sanitizedPaste = DOMPurify.sanitize(paste, sanitizeConfig)
    
    document.execCommand('insertHTML', false, sanitizedPaste)
    handleInput()
  }, [sanitizeConfig, handleInput])

  // Handle key events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle common keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault()
          toggleBold()
          break
        case 'i':
          e.preventDefault()
          toggleItalic()
          break
        case 'u':
          e.preventDefault()
          toggleUnderline()
          break
      }
    }
  }, [])

  if (!isClient) {
    return (
      <div
        className={`border border-gray-300 rounded-md bg-gray-100 animate-pulse ${getEditorHeightClass(height)}`}
      />
    )
  }

  return (
    <div className="native-rich-text-editor">
      {/* Toolbar */}
      <div className="border border-gray-300 border-b-0 rounded-t-md bg-gray-50 p-2 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={toggleBold}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            activeFormats.has('bold') ? 'bg-gray-300' : ''
          }`}
          title="Bold (Ctrl+B)"
        >
          <BoldIcon className="h-4 w-4" />
        </button>
        
        <button
          type="button"
          onClick={toggleItalic}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            activeFormats.has('italic') ? 'bg-gray-300' : ''
          }`}
          title="Italic (Ctrl+I)"
        >
          <ItalicIcon className="h-4 w-4" />
        </button>
        
        <button
          type="button"
          onClick={toggleUnderline}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            activeFormats.has('underline') ? 'bg-gray-300' : ''
          }`}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={toggleBulletList}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            activeFormats.has('bulletList') ? 'bg-gray-300' : ''
          }`}
          title="Bullet List"
        >
          <ListBulletIcon className="h-4 w-4" />
        </button>
        
        <button
          type="button"
          onClick={toggleNumberedList}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            activeFormats.has('numberedList') ? 'bg-gray-300' : ''
          }`}
          title="Numbered List"
        >
          <NumberedListIcon className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={insertLink}
          disabled={disabled}
          className="p-2 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Insert Link"
        >
          <LinkIcon className="h-4 w-4" />
        </button>

        {allowMedia && (
          <button
            type="button"
            onClick={handleMediaInsert}
            disabled={disabled}
            className="p-2 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Insert Media"
          >
            <PhotoIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        className={`border border-gray-300 rounded-b-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${getEditorHeightClass(height)} overflow-y-auto`}
        style={{ minHeight: height }}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />

      {/* Character Count */}
      <div className="mt-2 text-xs text-gray-500 text-right">
        {getPlainText(value).length} characters
      </div>


    </div>
  )
}

// Utility function to extract plain text from HTML using native DOM parsing
export function getPlainText(html: string): string {
  if (typeof window !== "undefined") {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    return (tempDiv.textContent || "").trim();
  } else {
    // Use html-to-text for SSR environments (safe and robust)
    return htmlToText(html, { wordwrap: false, selectors: [{ selector: 'img', format: 'skip' }] }).trim();
  }
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

// Utility function to serialize content to JSON
export function serializeToJson(html: string): {
  html: string
  plainText: string
  wordCount: number
  characterCount: number
} {
  const plainText = getPlainText(html)
  return {
    html,
    plainText,
    wordCount: plainText.split(/\s+/).filter(word => word.length > 0).length,
    characterCount: plainText.length
  }
}

// Utility function to deserialize content from JSON
export function deserializeFromJson(data: { html: string }): string {
  return data.html || ''
}