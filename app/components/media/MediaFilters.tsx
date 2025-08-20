/**
 * MediaFilters component
 * Provides filtering and search functionality for media files
 */

'use client'

import { useState } from 'react'
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'

type MediaType = 'image' | 'document' | 'video' | 'audio'

interface Filters {
  search: string
  type: MediaType | ''
  folder: string
  sortBy: 'name' | 'size' | 'createdAt' | 'type'
  sortOrder: 'asc' | 'desc'
}

interface MediaFiltersProps {
  filters: Filters
  onFilterChange: (filters: Partial<Filters>) => void
  totalFiles: number
}

export default function MediaFilters({
  filters,
  onFilterChange,
  totalFiles,
}: MediaFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSearchChange = (search: string) => {
    onFilterChange({ search })
  }

  const handleTypeChange = (type: MediaType | '') => {
    onFilterChange({ type })
  }

  const handleFolderChange = (folder: string) => {
    onFilterChange({ folder })
  }

  const handleSortChange = (sortBy: string, sortOrder: string) => {
    onFilterChange({ 
      sortBy: sortBy as 'name' | 'size' | 'createdAt' | 'type',
      sortOrder: sortOrder as 'asc' | 'desc'
    })
  }

  const clearFilters = () => {
    onFilterChange({
      search: '',
      type: '',
      folder: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    })
  }

  const hasActiveFilters = filters.search || filters.type || filters.folder

  return (
    <div className="p-4 border-b border-gray-200">
      {/* Search and Basic Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-lg">
          <label htmlFor="media-search" className="sr-only">
            Search media files
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="media-search"
              type="text"
              placeholder="Search media files..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label="Search media files"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* File Type Filter */}
          <div>
            <label htmlFor="media-type-filter" className="sr-only">
              Filter by file type
            </label>
            <select
              id="media-type-filter"
              value={filters.type}
              onChange={(e) => handleTypeChange(e.target.value as MediaType | '')}
              aria-label="Filter by file type"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
            >
              <option value="">All Types</option>
              <option value="image">Images</option>
              <option value="document">Documents</option>
              <option value="video">Videos</option>
              <option value="audio">Audio</option>
            </select>
          </div>

          {/* Sort Options */}
          <div>
            <label htmlFor="media-sort-filter" className="sr-only">
              Sort media files
            </label>
            <select
              id="media-sort-filter"
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-')
                handleSortChange(sortBy, sortOrder)
              }}
              aria-label="Sort media files"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="size-desc">Largest First</option>
              <option value="size-asc">Smallest First</option>
              <option value="type-asc">Type A-Z</option>
            </select>
          </div>

          {/* Advanced Filters Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            aria-expanded={showAdvanced}
            aria-controls="advanced-filters"
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div id="advanced-filters" className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Folder Filter */}
            <div>
              <label htmlFor="folder-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Folder
              </label>
              <input
                id="folder-filter"
                type="text"
                placeholder="Filter by folder..."
                value={filters.folder}
                onChange={(e) => handleFolderChange(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* File Size Range - Could be added later */}
            <div>
              <label htmlFor="file-size-filter" className="block text-sm font-medium text-gray-700 mb-1">
                File Size
              </label>
              <select 
                id="file-size-filter"
                aria-label="Filter by file size"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Any Size</option>
                <option value="small">Small (&lt; 1MB)</option>
                <option value="medium">Medium (1-10MB)</option>
                <option value="large">Large (&gt; 10MB)</option>
              </select>
            </div>

            {/* Date Range - Could be added later */}
            <div>
              <label htmlFor="upload-date-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Upload Date
              </label>
              <select 
                id="upload-date-filter"
                aria-label="Filter by upload date"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Any Date</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Filter Summary and Clear */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {totalFiles} file{totalFiles !== 1 ? 's' : ''} found
          {hasActiveFilters && (
            <span className="ml-2 text-blue-600">
              (filtered)
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  )
}