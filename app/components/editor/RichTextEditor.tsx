/**
 * RichTextEditor Component
 * Reusable rich text editor with media insertion and content sanitization
 * Now uses native contentEditable implementation instead of Quill
 */

'use client'

import NativeRichTextEditor from './NativeRichTextEditor'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  height?: string
  allowMedia?: boolean
  onMediaInsert?: () => void
}

export default function RichTextEditor(props: RichTextEditorProps) {
  // Delegate to the native implementation
  return <NativeRichTextEditor {...props} />
}

// Re-export utility functions from NativeRichTextEditor
export { 
  getPlainText, 
  truncateHtml, 
  validateHtmlContent,
  serializeToJson,
  deserializeFromJson
} from './NativeRichTextEditor'