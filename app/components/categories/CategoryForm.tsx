/**
 * CategoryForm Component
 * Form for creating and editing categories
 */

'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Category } from '@/lib/types'

interface CategoryFormProps {
  category?: Category | null
  parentCategory?: Category | null
  onClose: () => void
  onSuccess: () => void
}

export default function CategoryForm({
  category,
  parentCategory,
  onClose,
  onSuccess,
}: CategoryFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    parentId: '',
    isActive: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEditing = !!category

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        parentId: category.parentId || '',
        isActive: category.isActive,
      })
    } else if (parentCategory) {
      setFormData(prev => ({
        ...prev,
        parentId: parentCategory.id,
      }))
    }
  }, [category, parentCategory])

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: isEditing ? prev.slug : generateSlug(name),
    }))
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const url = isEditing ? `/api/categories/${category!.id}` : '/api/categories'
      const method = isEditing ? 'PUT' : 'POST'

      const payload = {
        ...formData,
        parentId: formData.parentId || null,
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save category')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-matte-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border border-warm-beige w-full max-w-md shadow-lg rounded-md bg-soft-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-matte-black font-satoshi">
            {isEditing ? 'Edit Category' : 'Create Category'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-gray hover:text-matte-black transition-colors duration-200"
            aria-label="Close dialog"
            title="Close dialog"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Parent Category Info */}
          {parentCategory && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                Creating subcategory under: <strong>{parentCategory.name}</strong>
              </p>
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="name" className="form-label">
              Name *
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="form-input"
              placeholder="Enter category name"
            />
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
              Slug *
            </label>
            <input
              type="text"
              id="slug"
              required
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="category-slug"
            />
            <p className="mt-1 text-xs text-gray-500">
              URL-friendly version of the name. Auto-generated from name.
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional description for this category"
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              id="isActive"
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              Active
            </label>
            <p className="ml-2 text-xs text-gray-500">
              Inactive categories are hidden from the public site
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}