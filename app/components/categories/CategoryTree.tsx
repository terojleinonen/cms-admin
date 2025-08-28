/**
 * CategoryTree Component
 * Displays categories in a hierarchical tree with drag-and-drop reordering
 */

'use client'

import { useState } from 'react'
import {
  ChevronRightIcon,
  ChevronDownIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline'
import { Category } from '@/lib/types'
import { getCategoryTreeIndentClass } from '../../../utils/dynamic-styles'

interface CategoryTreeProps {
  categories: Category[]
  onEdit: (category: Category) => void
  onDelete: (categoryId: string) => void
  onCreateChild: (parent: Category) => void
  onReorder: (updates: Array<{
    categoryId: string
    newParentId: string | null
    newSortOrder: number
  }>) => void
}

interface CategoryNodeProps {
  category: Category
  level: number
  onEdit: (category: Category) => void
  onDelete: (categoryId: string) => void
  onCreateChild: (parent: Category) => void
  onToggleExpanded: (categoryId: string) => void
  isExpanded: boolean
  onDragStart: (category: Category) => void
  onDragOver: (e: React.DragEvent, category: Category) => void
  onDrop: (e: React.DragEvent, category: Category) => void
  isDragOver: boolean
}

function CategoryNode({
  category,
  level,
  onEdit,
  onDelete,
  onCreateChild,
  onToggleExpanded,
  isExpanded,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: CategoryNodeProps) {
  const hasChildren = category.children && category.children.length > 0
  const paddingLeft = level * 24

  return (
    <div>
      <div
        className={`group flex items-center py-2 px-3 rounded-md hover:bg-gray-50 ${getCategoryTreeIndentClass(level)} ${isDragOver ? 'bg-blue-50 border-2 border-blue-300' : ''
          }`}
        draggable
        onDragStart={() => onDragStart(category)}
        onDragOver={(e) => onDragOver(e, category)}
        onDrop={(e) => onDrop(e, category)}
      >
        {/* Drag Handle */}
        <div className="flex-shrink-0 mr-2 cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
          <Bars3Icon className="h-4 w-4 text-gray-400" />
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => onToggleExpanded(category.id)}
          className="flex-shrink-0 mr-2 p-1 rounded hover:bg-gray-200"
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDownIcon className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-gray-600" />
            )
          ) : (
            <div className="h-4 w-4" />
          )}
        </button>

        {/* Category Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {category.name}
            </h3>
            {!category.isActive && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                Inactive
              </span>
            )}
          </div>
          {category.description && (
            <p className="text-xs text-gray-500 truncate mt-1">
              {category.description}
            </p>
          )}
          <div className="flex items-center mt-1 text-xs text-gray-400">
            <span>{category._count?.products || 0} products</span>
            {hasChildren && (
              <>
                <span className="mx-1">•</span>
                <span>{category.children!.length} subcategories</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onCreateChild(category)}
            className="p-1 rounded hover:bg-gray-200"
            title="Add subcategory"
          >
            <PlusIcon className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={() => onEdit(category)}
            className="p-1 rounded hover:bg-gray-200"
            title="Edit category"
          >
            <PencilIcon className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={() => onDelete(category.id)}
            className="p-1 rounded hover:bg-red-100"
            title="Delete category"
            disabled={hasChildren || (category._count?.products || 0) > 0}
          >
            <TrashIcon className={`h-4 w-4 ${hasChildren || (category._count?.products || 0) > 0
              ? 'text-gray-300'
              : 'text-red-600'
              }`} />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {category.children!.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onCreateChild={onCreateChild}
              onToggleExpanded={onToggleExpanded}
              isExpanded={false} // Child expansion state would need to be managed separately
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              isDragOver={false} // Drag over state would need to be managed separately
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CategoryTree({
  categories,
  onEdit,
  onDelete,
  onCreateChild,
  onReorder,
}: CategoryTreeProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [draggedCategory, setDraggedCategory] = useState<Category | null>(null)
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null)

  const handleToggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const handleDragStart = (category: Category) => {
    setDraggedCategory(category)
  }

  const handleDragOver = (e: React.DragEvent, category: Category) => {
    e.preventDefault()
    if (draggedCategory && draggedCategory.id !== category.id) {
      setDragOverCategory(category.id)
    }
  }

  const handleDrop = (e: React.DragEvent, targetCategory: Category) => {
    e.preventDefault()
    setDragOverCategory(null)

    if (!draggedCategory || draggedCategory.id === targetCategory.id) {
      setDraggedCategory(null)
      return
    }

    // Prevent dropping a parent onto its own child
    const isDescendant = (parent: Category, potentialChild: Category): boolean => {
      if (!parent.children) return false
      return parent.children.some(child =>
        child.id === potentialChild.id || isDescendant(child, potentialChild)
      )
    }

    if (isDescendant(draggedCategory, targetCategory)) {
      alert('Cannot move a category into its own descendant')
      setDraggedCategory(null)
      return
    }

    // Calculate new sort order (insert after target)
    const siblings = targetCategory.parentId
      ? categories.find(c => c.id === targetCategory.parentId)?.children || []
      : categories.filter(c => !c.parentId)

    const targetIndex = siblings.findIndex(c => c.id === targetCategory.id)
    const newSortOrder = targetIndex + 1

    // Create reorder update
    const updates = [{
      categoryId: draggedCategory.id,
      newParentId: targetCategory.parentId || null,
      newSortOrder,
    }]

    // Update sort orders for affected siblings
    siblings.forEach((sibling, index) => {
      if (index >= newSortOrder && sibling.id !== draggedCategory.id) {
        updates.push({
          categoryId: sibling.id,
          newParentId: sibling.parentId || null,
          newSortOrder: index + 1,
        })
      }
    })

    onReorder(updates)
    setDraggedCategory(null)
  }

  // Get root categories (no parent)
  const rootCategories = categories.filter(category => !category.parentId)

  if (rootCategories.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No categories to display
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {rootCategories.map((category) => (
        <CategoryNode
          key={category.id}
          category={category}
          level={0}
          onEdit={onEdit}
          onDelete={onDelete}
          onCreateChild={onCreateChild}
          onToggleExpanded={handleToggleExpanded}
          isExpanded={expandedCategories.has(category.id)}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          isDragOver={dragOverCategory === category.id}
        />
      ))}
    </div>
  )
}