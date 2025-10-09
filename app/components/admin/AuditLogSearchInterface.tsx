'use client'

/**
 * Advanced Audit Log Search Interface
 * Provides sophisticated search and filtering capabilities for audit logs
 */

import { useState, useEffect, useCallback } from 'react'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  CalendarIcon,
  UserIcon,
  ShieldCheckIcon,
  ClockIcon,
  TagIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline'

interface SearchFilters {
  query: string
  userId?: string
  action?: string
  resource?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  startDate?: string
  endDate?: string
  ipAddress?: string
  success?: boolean
  tags?: string[]
}

interface SavedSearch {
  id: string
  name: string
  filters: SearchFilters
  createdAt: string
}

interface AuditLogEntry {
  id: string
  userId: string
  action: string
  resource: string
  details: Record<string, any> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface SearchResults {
  logs: AuditLogEntry[]
  total: number
  page: number
  totalPages: number
  facets: {
    actions: Array<{ value: string; count: number }>
    resources: Array<{ value: string; count: number }>
    users: Array<{ value: string; count: number; name: string }>
    severities: Array<{ value: string; count: number }>
  }
}

export default function AuditLogSearchInterface() {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
  })
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [searchName, setSearchName] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Perform search with debounce
  const performSearch = useCallback(async (searchFilters: SearchFilters, page: number = 1) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      
      // Add search parameters
      if (searchFilters.query) params.append('search', searchFilters.query)
      if (searchFilters.userId) params.append('userId', searchFilters.userId)
      if (searchFilters.action) params.append('action', searchFilters.action)
      if (searchFilters.resource) params.append('resource', searchFilters.resource)
      if (searchFilters.severity) params.append('severity', searchFilters.severity)
      if (searchFilters.startDate) params.append('startDate', searchFilters.startDate)
      if (searchFilters.endDate) params.append('endDate', searchFilters.endDate)
      if (searchFilters.ipAddress) params.append('ipAddress', searchFilters.ipAddress)
      if (searchFilters.success !== undefined) params.append('success', searchFilters.success.toString())
      
      params.append('page', page.toString())
      params.append('limit', pageSize.toString())
      params.append('includeFacets', 'true')

      const response = await fetch(`/api/audit-logs/search?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search audit logs')
      }

      setResults(data.data)
      setCurrentPage(page)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search audit logs')
    } finally {
      setLoading(false)
    }
  }, [pageSize])

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (filters.query || Object.keys(filters).some(key => key !== 'query' && filters[key as keyof SearchFilters])) {
        performSearch(filters, 1)
      } else {
        setResults(null)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [filters, performSearch])

  // Handle filter changes
  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({ query: '' })
    setResults(null)
  }

  // Save current search
  const saveSearch = () => {
    if (!searchName.trim()) return

    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name: searchName.trim(),
      filters: { ...filters },
      createdAt: new Date().toISOString(),
    }

    setSavedSearches(prev => [...prev, newSearch])
    setSearchName('')
    setShowSaveDialog(false)

    // Save to localStorage
    localStorage.setItem('auditLogSavedSearches', JSON.stringify([...savedSearches, newSearch]))
  }

  // Load saved search
  const loadSearch = (search: SavedSearch) => {
    setFilters(search.filters)
  }

  // Delete saved search
  const deleteSearch = (searchId: string) => {
    const updated = savedSearches.filter(s => s.id !== searchId)
    setSavedSearches(updated)
    localStorage.setItem('auditLogSavedSearches', JSON.stringify(updated))
  }

  // Load saved searches on mount
  useEffect(() => {
    const saved = localStorage.getItem('auditLogSavedSearches')
    if (saved) {
      try {
        setSavedSearches(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load saved searches:', e)
      }
    }
  }, [])

  // Format action name for display
  const formatAction = (action: string) => {
    return action
      .split('.')
      .map(part => part.replace(/_/g, ' '))
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' → ')
  }

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-green-600 bg-green-100'
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Advanced Audit Log Search</h2>
          <p className="text-gray-600">Search and filter audit logs with advanced criteria</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
            Advanced
          </button>
          
          <button
            onClick={() => setShowSaveDialog(true)}
            disabled={!filters.query && !Object.keys(filters).some(key => key !== 'query' && filters[key as keyof SearchFilters])}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <TagIcon className="h-4 w-4 mr-2" />
            Save Search
          </button>
        </div>
      </div> 
     {/* Main Search Bar */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={filters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
            placeholder="Search audit logs by action, user, resource, or details..."
            className="pl-10 pr-4 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-lg py-3"
          />
          {filters.query && (
            <button
              onClick={() => updateFilter('query', '')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Advanced Filters</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear All
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <input
                type="text"
                value={filters.action || ''}
                onChange={(e) => updateFilter('action', e.target.value)}
                placeholder="e.g., auth.login"
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resource
              </label>
              <input
                type="text"
                value={filters.resource || ''}
                onChange={(e) => updateFilter('resource', e.target.value)}
                placeholder="e.g., user, product"
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severity
              </label>
              <select
                value={filters.severity || ''}
                onChange={(e) => updateFilter('severity', e.target.value || undefined)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IP Address
              </label>
              <input
                type="text"
                value={filters.ipAddress || ''}
                onChange={(e) => updateFilter('ipAddress', e.target.value)}
                placeholder="e.g., 192.168.1.1"
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="datetime-local"
                value={filters.startDate || ''}
                onChange={(e) => updateFilter('startDate', e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="datetime-local"
                value={filters.endDate || ''}
                onChange={(e) => updateFilter('endDate', e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.success === undefined ? '' : filters.success.toString()}
                onChange={(e) => updateFilter('success', e.target.value === '' ? undefined : e.target.value === 'true')}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">All</option>
                <option value="true">Success</option>
                <option value="false">Failed</option>
              </select>
            </div>
          </div>
        </div>
      )} 
     {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Saved Searches</h3>
          <div className="flex flex-wrap gap-2">
            {savedSearches.map((search) => (
              <div key={search.id} className="flex items-center bg-gray-100 rounded-full px-3 py-1">
                <button
                  onClick={() => loadSearch(search)}
                  className="text-sm text-gray-700 hover:text-gray-900 mr-2"
                >
                  {search.name}
                </button>
                <button
                  onClick={() => deleteSearch(search.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center text-sm text-red-700">
            <XMarkIcon className="h-4 w-4 mr-2" />
            {error}
          </div>
        </div>
      )}

      {/* Search Results */}
      {results && (
        <div className="space-y-6">
          {/* Results Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Search Results</h3>
                <p className="text-sm text-gray-600">
                  Found {results.total} results {filters.query && `for "${filters.query}"`}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>
            </div>

            {/* Facets */}
            {results.facets && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Actions Facet */}
                {results.facets.actions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Top Actions</h4>
                    <div className="space-y-1">
                      {results.facets.actions.slice(0, 5).map((facet) => (
                        <button
                          key={facet.value}
                          onClick={() => updateFilter('action', facet.value)}
                          className="flex items-center justify-between w-full text-left text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-2 py-1 rounded"
                        >
                          <span className="truncate">{formatAction(facet.value)}</span>
                          <span className="text-xs text-gray-400">{facet.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resources Facet */}
                {results.facets.resources.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Top Resources</h4>
                    <div className="space-y-1">
                      {results.facets.resources.slice(0, 5).map((facet) => (
                        <button
                          key={facet.value}
                          onClick={() => updateFilter('resource', facet.value)}
                          className="flex items-center justify-between w-full text-left text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-2 py-1 rounded"
                        >
                          <span className="truncate">{facet.value}</span>
                          <span className="text-xs text-gray-400">{facet.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Users Facet */}
                {results.facets.users.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Top Users</h4>
                    <div className="space-y-1">
                      {results.facets.users.slice(0, 5).map((facet) => (
                        <button
                          key={facet.value}
                          onClick={() => updateFilter('userId', facet.value)}
                          className="flex items-center justify-between w-full text-left text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-2 py-1 rounded"
                        >
                          <span className="truncate">{facet.name}</span>
                          <span className="text-xs text-gray-400">{facet.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Severities Facet */}
                {results.facets.severities.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Severities</h4>
                    <div className="space-y-1">
                      {results.facets.severities.map((facet) => (
                        <button
                          key={facet.value}
                          onClick={() => updateFilter('severity', facet.value as any)}
                          className="flex items-center justify-between w-full text-left text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-2 py-1 rounded"
                        >
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(facet.value)}`}>
                            {facet.value.charAt(0).toUpperCase() + facet.value.slice(1)}
                          </span>
                          <span className="text-xs text-gray-400">{facet.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>    
      {/* Results Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resource
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                        </div>
                      </td>
                    </tr>
                  ) : results.logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                        No audit logs found matching your search criteria
                      </td>
                    </tr>
                  ) : (
                    results.logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                            {new Date(log.createdAt).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <UserIcon className="h-4 w-4 text-gray-500" />
                              </div>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {log.user.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {log.user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatAction(log.action)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.resource}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {log.details?.success !== false ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <ShieldCheckIcon className="h-3 w-3 mr-1" />
                              Success
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <XMarkIcon className="h-3 w-3 mr-1" />
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                          {log.ipAddress || 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {results.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, results.total)} of {results.total} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => performSearch(filters, Math.max(1, currentPage - 1))}
                      disabled={currentPage <= 1 || loading}
                      className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-2 text-sm text-gray-700">
                      Page {currentPage} of {results.totalPages}
                    </span>
                    <button
                      onClick={() => performSearch(filters, Math.min(results.totalPages, currentPage + 1))}
                      disabled={currentPage >= results.totalPages || loading}
                      className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Search Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Save Search</h3>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Name
              </label>
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Enter a name for this search"
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                onKeyPress={(e) => e.key === 'Enter' && saveSearch()}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={saveSearch}
                disabled={!searchName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}