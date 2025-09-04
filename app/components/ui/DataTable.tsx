/**
 * DataTable Component
 * Reusable data table with sorting, filtering, and pagination
 */

'use client'

import { useState, useMemo } from 'react'
import { 
  ChevronUpIcon, 
  ChevronDownIcon, 
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { TableColumn, FilterOption, PaginationInfo } from '@/lib/types'
import Button from './Button'
import Input from './Input'
import Select from './Select'

interface DataTableProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  filters?: FilterOption[]
  searchable?: boolean
  sortable?: boolean
  pagination?: PaginationInfo
  onSort?: (column: string, direction: 'asc' | 'desc') => void
  onFilter?: (filters: Record<string, unknown>) => void
  onSearch?: (query: string) => void
  onPageChange?: (page: number) => void
  loading?: boolean
  emptyMessage?: string
  className?: string
}

type SortDirection = 'asc' | 'desc' | null

export default function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  filters = [],
  searchable = true,
  sortable = true,
  pagination,
  onSort,
  onFilter,
  onSearch,
  onPageChange,
  loading = false,
  emptyMessage = 'No data available',
  className = ''
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({})
  const [showFilters, setShowFilters] = useState(false)

  // Handle sorting
  const handleSort = (columnKey: string) => {
    if (!sortable) return
    
    let newDirection: SortDirection = 'asc'
    
    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        newDirection = 'desc'
      } else if (sortDirection === 'desc') {
        newDirection = null
      }
    }
    
    setSortColumn(newDirection ? columnKey : null)
    setSortDirection(newDirection)
    
    if (onSort && newDirection) {
      onSort(columnKey, newDirection)
    }
  }

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (onSearch) {
      onSearch(query)
    }
  }

  // Handle filter change
  const handleFilterChange = (key: string, value: unknown) => {
    const newFilters = { ...filterValues, [key]: value }
    setFilterValues(newFilters)
    
    if (onFilter) {
      onFilter(newFilters)
    }
  }

  // Clear filters
  const clearFilters = () => {
    setFilterValues({})
    setSearchQuery('')
    if (onFilter) {
      onFilter({})
    }
    if (onSearch) {
      onSearch('')
    }
  }

  // Get sort icon
  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) {
      return <ChevronUpIcon className="h-4 w-4 text-gray-300" />
    }
    
    return sortDirection === 'asc' 
      ? <ChevronUpIcon className="h-4 w-4 text-gray-600" />
      : <ChevronDownIcon className="h-4 w-4 text-gray-600" />
  }

  // Generate pagination buttons
  const paginationButtons = useMemo(() => {
    if (!pagination) return []
    
    const buttons = []
    const { page, totalPages } = pagination
    
    // Always show first page
    if (totalPages > 1) {
      buttons.push(1)
    }
    
    // Show pages around current page
    const start = Math.max(2, page - 1)
    const end = Math.min(totalPages - 1, page + 1)
    
    if (start > 2) {
      buttons.push('...')
    }
    
    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== totalPages) {
        buttons.push(i)
      }
    }
    
    if (end < totalPages - 1) {
      buttons.push('...')
    }
    
    // Always show last page
    if (totalPages > 1) {
      buttons.push(totalPages)
    }
    
    return buttons
  }, [pagination])

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Filters */}
      {(searchable || filters.length > 0) && (
        <div className="flex flex-col sm:flex-row gap-4">
          {searchable && (
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}
          
          {filters.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <FunnelIcon className="h-4 w-4 mr-1" />
                Filters
              </Button>
              
              {Object.keys(filterValues).length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                >
                  Clear
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && filters.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map((filter) => (
              <div key={filter.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {filter.label}
                </label>
                
                {filter.type === 'select' && filter.options ? (
                  <Select
                    options={filter.options}
                    value={filterValues[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    placeholder="All"
                  />
                ) : (
                  <Input
                    type={filter.type === 'date' ? 'date' : 'text'}
                    value={filterValues[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    placeholder={`Filter by ${filter.label.toLowerCase()}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-white shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    sortable && column.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  onClick={() => column.sortable !== false && handleSort(String(column.key))}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {sortable && column.sortable !== false && getSortIcon(String(column.key))}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-500">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td key={String(column.key)} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {column.render 
                        ? column.render(item[column.key as keyof T], item)
                        : String(item[column.key as keyof T] || '')
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange && onPageChange(pagination.page - 1)}
            >
              Previous
            </Button>
            
            {paginationButtons.map((button, index) => (
              <Button
                key={index}
                variant={button === pagination.page ? 'primary' : 'outline'}
                size="sm"
                disabled={button === '...'}
                onClick={() => typeof button === 'number' && onPageChange && onPageChange(button)}
                className="min-w-[2.5rem]"
              >
                {button}
              </Button>
            ))}
            
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange && onPageChange(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}