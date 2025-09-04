/**
 * PageForm Component
 * Form for creating and editing content pages with rich text editor and template selection
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Page } from '@/lib/types'
import RichTextEditorWithMedia from '@/components/editor/RichTextEditorWithMedia'
import TemplateSelector from './TemplateSelector'
import { EyeIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline'

interface PageFormData {
  title: string
  slug: string
  content: string
  excerpt: string
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED'
  template: string
  seoTitle: string
  seoDescription: string
  publishedAt?: string
}

interface PageFormProps {
  page?: Page | null
  onSave?: (page: Page) => void
  onCancel?: () => void
}

export default function PageForm({ page, onSave, onCancel }: PageFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<PageFormData>({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    status: 'DRAFT',
    template: 'default',
    seoTitle: '',
    seoDescription: '',
    publishedAt: undefined,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [_previewUrl, _setPreviewUrl] = useState('')
  const [isDirty, setIsDirty] = useState(false)

  const isEditing = !!page

  useEffect(() => {
    if (page) {
      setFormData({
        title: page.title,
        slug: page.slug,
        content: page.content || '',
        excerpt: page.excerpt || '',
        status: page.status,
        template: page.template,
        seoTitle: page.seoTitle || '',
        seoDescription: page.seoDescription || '',
        publishedAt: page.publishedAt ? new Date(page.publishedAt).toISOString().slice(0, 16) : undefined,
      })
    }
  }, [page])

  // Track form changes
  useEffect(() => {
    setIsDirty(true)
  }, [formData])

  // Auto-generate slug from title
  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: isEditing ? prev.slug : generateSlug(title),
    }))
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleSubmit = async (e: React.FormEvent, saveAndContinue = false) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const url = isEditing ? `/api/pages/${page!.id}` : '/api/pages'
      const method = isEditing ? 'PUT' : 'POST'

      const submitData = {
        ...formData,
        publishedAt: formData.publishedAt ? new Date(formData.publishedAt).toISOString() : null,
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save page')
      }

      const savedPage = await response.json()
      setIsDirty(false)

      if (onSave) {
        onSave(savedPage)
      }

      if (!saveAndContinue) {
        router.push('/admin/pages')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = async () => {
    try {
      const url = isEditing ? `/api/pages/${page!.id}/preview` : '/api/pages/preview'
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to generate preview')
      }

      const data = await response.json()
      setPreviewUrl(data.previewUrl)
      
      // Open preview in new tab
      window.open(data.previewUrl, '_blank')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview')
    }
  }

  const handleCancel = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
      return
    }
    
    if (onCancel) {
      onCancel()
    } else {
      router.back()
    }
  }

  const handleTemplateChange = (templateId: string) => {
    setFormData(prev => ({ ...prev, template: templateId }))
    setShowTemplateSelector(false)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Page' : 'Create New Page'}
          </h1>
          <p className="text-gray-600">
            {isEditing ? 'Update your page content and settings' : 'Create a new page for your website'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {isEditing && (
            <button
              type="button"
              onClick={handlePreview}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <EyeIcon className="h-4 w-4 mr-2" />
              Preview
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowTemplateSelector(!showTemplateSelector)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
            {showTemplateSelector ? 'Hide Templates' : 'Change Template'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Template Selector */}
      {showTemplateSelector && (
        <div className="bg-white shadow rounded-lg p-6">
          <TemplateSelector
            selectedTemplate={formData.template}
            onSelect={handleTemplateChange}
          />
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e)} className="space-y-8">

      {/* Basic Information */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Basic Information</h3>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Page Title *
            </label>
            <input
              type="text"
              id="title"
              required
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter page title"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
              URL Slug *
            </label>
            <input
              type="text"
              id="slug"
              required
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="page-url-slug"
            />
            <p className="mt-1 text-xs text-gray-500">
              URL-friendly version of the title. Auto-generated from title.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700">
              Excerpt
            </label>
            <textarea
              id="excerpt"
              rows={3}
              value={formData.excerpt}
              onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief description of the page content"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Content</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Page Content
          </label>
          <RichTextEditorWithMedia
            value={formData.content}
            onChange={(value) => setFormData(prev => ({ ...prev, content: value }))}
            placeholder="Write your page content here..."
            height="400px"
            allowedMediaTypes={['image', 'document']}
          />
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Settings</h3>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED' }))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="DRAFT">Draft</option>
              <option value="REVIEW">Review</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div>
            <label htmlFor="template" className="block text-sm font-medium text-gray-700">
              Template
            </label>
            <div className="mt-1 flex items-center space-x-3">
              <select
                id="template"
                value={formData.template}
                onChange={(e) => setFormData(prev => ({ ...prev, template: e.target.value }))}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="default">Default</option>
                <option value="landing">Landing Page</option>
                <option value="about">About</option>
                <option value="contact">Contact</option>
                <option value="blog-post">Blog Post</option>
                <option value="product-showcase">Product Showcase</option>
              </select>
              <button
                type="button"
                onClick={() => setShowTemplateSelector(true)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Browse Templates
              </button>
            </div>
          </div>

          {formData.status === 'PUBLISHED' && (
            <div>
              <label htmlFor="publishedAt" className="block text-sm font-medium text-gray-700">
                Published Date
              </label>
              <input
                type="datetime-local"
                id="publishedAt"
                value={formData.publishedAt || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, publishedAt: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty to use current date and time
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SEO */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">SEO</h3>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="seoTitle" className="block text-sm font-medium text-gray-700">
              SEO Title
            </label>
            <input
              type="text"
              id="seoTitle"
              value={formData.seoTitle}
              onChange={(e) => setFormData(prev => ({ ...prev, seoTitle: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="SEO optimized title"
            />
          </div>

          <div>
            <label htmlFor="seoDescription" className="block text-sm font-medium text-gray-700">
              SEO Description
            </label>
            <textarea
              id="seoDescription"
              rows={3}
              value={formData.seoDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, seoDescription: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="SEO meta description"
            />
          </div>
        </div>
      </div>

        {/* Actions */}
        <div className="flex justify-between">
          <div className="flex space-x-3">
            {isEditing && (
              <button
                type="button"
                onClick={handlePreview}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <EyeIcon className="h-4 w-4 mr-2 inline" />
                Preview
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            
            {!isEditing && (
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Save & Continue Editing
              </button>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEditing ? 'Update Page' : 'Create Page'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}