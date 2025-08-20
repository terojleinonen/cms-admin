/**
 * New Page Creation Page
 * Interface for creating new content pages with rich text editor
 */

'use client'

import PageForm from '@/app/components/pages/PageForm'

export default function NewPagePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Page</h1>
        <p className="text-gray-600">
          Create a new content page with rich text editing
        </p>
      </div>

      {/* Form */}
      <PageForm />
    </div>
  )
}