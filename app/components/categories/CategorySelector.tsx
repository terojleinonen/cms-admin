/**
 * CategorySelector Component
 * Multi-select component for assigning categories to products
 */

'use client'

import { useState, useEffect } from 'react'
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Category } from '@/lib/types'
import { getCategoryIndentClass } from '../../../utils/dynamic-styles'

interface CategorySelectorProps {
  selectedCategories: string[]
  onChange: (categoryIds: string[]) => void
  placeholder?: string
  maxSelections?: number
}

export default function CategorySelector({
  selectedCategories,
  onChange,
  placeholder = 'Select categories...',
  maxSelections,
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories')
        if (!response.ok) throw new Error('Failed to fetch categories')
        
        const data = await response.json()
        setCategories(data.categories)
      } catch (error) {
        console.error('Error fetching categories:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  // Flatten categories for easier searching and selection
  const flattenCategories = (cats: Category[], level = 0): Array<Category & { level: number }> => {
    const result: Array<Category & { level: number }> = []
    
    cats.forEach(cat => {
      result.push({ ...cat, level })
      if (cat.children && cat.children.length > 0) {
        result.push(...flattenCategories(cat.children, level + 1))
      }
    })
    
    return result
  }

  const flatCategories = flattenCategories(categories)

  // Filter categories based on search
  const filteredCategories = flatCategories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Get selected category objects
  const selectedCategoryObjects = flatCategories.filter(cat =>
    selectedCategories.includes(cat.id)
  )

  const handleToggleCategory = (categoryId: string) => {
    const isSelected = selectedCategories.includes(categoryId)
    
    if (isSelected) {
      // Remove category
      onChange(selectedCategories.filter(id => id !== categoryId))
    } else {
      // Add category (check max selections)
      if (maxSelections && selectedCategories.length >= maxSelections) {
        return
      }
      onChange([...selectedCategories, categoryId])
    }
  }

  const handleRemoveCategory = (categoryId: string) => {
    onChange(selectedCategories.filter(id => id !== categoryId))
  }

  const getCategoryPath = (category: Category & { level: number }) => {
    const path = []
    let current = category
    
    while (current.parentId) {
      const parent = flatCategories.find(c => c.id === current.parentId)
      if (parent) {
        path.unshift(parent.name)
        current = parent
      } else {
        break
      }
    }
    
    return path.length > 0 ? path.join(' > ') + ' > ' + category.name : category.name
  }

  return (
    <div className="relative">
      {/* Selected Categories */}
      {selectedCategoryObjects.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedCategoryObjects.map(category => (
            <span
              key={category.id}
              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
            >
              {category.name}
              <button
                type="button"
                onClick={() => handleRemoveCategory(category.id)}
                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200"
                aria-label={`Remove ${category.name} category`}
                title={`Remove ${category.name} category`}
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Selector Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      >
        <span className="block truncate text-gray-500">
          {selectedCategories.length > 0
            ? `${selectedCategories.length} categories selected`
            : placeholder
          }
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
          {/* Search */}
          <div className="sticky top-0 bg-white px-3 py-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Categories List */}
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
          ) : filteredCategories.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              {searchQuery ? 'No categories found' : 'No categories available'}
            </div>
          ) : (
            filteredCategories.map(category => {
              const isSelected = selectedCategories.includes(category.id)
              const isDisabled = maxSelections && 
                selectedCategories.length >= maxSelections && 
                !isSelected

              return (
                <div
                  key={category.id}
                  className={`${getCategoryIndentClass(category.level)} cursor-pointer select-none relative py-2 pr-9 hover:bg-gray-100 ${
                    isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={() => !isDisabled && handleToggleCategory(category.id)}
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                      disabled={!!isDisabled}
                      aria-label={`Select ${category.name} category`}
                    />
                    <div className="flex-1 min-w-0">
                      <span className={`block truncate ${isSelected ? 'font-medium' : 'font-normal'}`}>
                        {category.name}
                      </span>
                      {category.level > 0 && (
                        <span className="text-xs text-gray-500 truncate">
                          {getCategoryPath(category)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}