/**
 * Search Service
 * Handles search functionality, indexing, analytics, and suggestions
 */

import MiniSearch from 'minisearch'
import { prisma } from './prisma'

// Enhanced interfaces for comprehensive search functionality
export interface SearchOptions {
  query: string
  types?: ('product' | 'page' | 'media')[]
  limit?: number
  offset?: number
  sortBy?: 'relevance' | 'date' | 'title'
  sortOrder?: 'asc' | 'desc'
  filters?: {
    status?: string[]
    category?: string[]
    tags?: string[]
    dateRange?: {
      start?: string
      end?: string
    }
  }
}

export interface SearchResult {
  id: string
  title: string
  type: 'product' | 'page' | 'media'
  excerpt: string
  url: string
  score: number
  highlights?: {
    title?: string
    content?: string
  }
  metadata?: {
    category?: string
    tags?: string[]
    status?: string
    creator?: string
    createdAt?: string
    updatedAt?: string
    [key: string]: any
  }
}

export interface SearchDocument {
  id: string
  type: 'product' | 'page' | 'media'
  title: string
  content: string
  excerpt: string
  tags: string[]
  status: string
  category: string
  createdAt: string
  updatedAt: string
  url: string
  metadata: Record<string, any>
}

export interface SearchAnalyticsEvent {
  query: string
  resultsCount: number
  userId?: string
  filters?: Record<string, any>
  userAgent?: string
  ipAddress?: string
  searchTime?: number
}

export interface SearchAnalytics {
  totalSearches: number
  uniqueQueries: number
  averageResultsPerSearch: number
  noResultsRate: number
  topQueries: Array<{ query: string; count: number }>
  searchTrends: Array<{ date: string; count: number }>
}

// Main SearchService class with comprehensive functionality
export class SearchService {
  private searchIndex: MiniSearch
  private documents: Map<string, SearchDocument> = new Map()

  constructor() {
    this.searchIndex = new MiniSearch({
      fields: ['title', 'content', 'excerpt', 'tags', 'category'],
      storeFields: ['id', 'type', 'title', 'excerpt', 'url', 'metadata', 'status', 'category'],
      searchOptions: {
        boost: { 
          title: 3, 
          excerpt: 2, 
          tags: 2,
          category: 1.5,
          content: 1 
        },
        fuzzy: 0.2,
        prefix: true,
        combineWith: 'AND'
      }
    })
  }

  // Add documents to search index
  addDocuments(documents: SearchDocument[]): void {
    documents.forEach(doc => {
      this.documents.set(doc.id, doc)
      this.searchIndex.add({
        ...doc,
        tags: Array.isArray(doc.tags) ? doc.tags.join(' ') : doc.tags
      })
    })
  }

  // Remove documents from search index
  removeDocuments(documentIds: string[]): void {
    documentIds.forEach(id => {
      this.documents.delete(id)
      if (this.searchIndex.has(id)) {
        this.searchIndex.remove({ id })
      }
    })
  }

  // Clear entire search index
  clearIndex(): void {
    this.searchIndex.removeAll()
    this.documents.clear()
  }

  // Main search method with comprehensive filtering and ranking
  search(options: SearchOptions): { results: SearchResult[], totalCount: number, facets: Record<string, Record<string, number>> } {
    const { query, types, limit = 20, offset = 0, sortBy = 'relevance', sortOrder = 'desc', filters = {} } = options

    // Perform search using MiniSearch
    let searchResults = this.searchIndex.search(query, {
      limit: limit + offset + 100, // Get more results for filtering
      fuzzy: 0.2,
      prefix: true
    })

    // Apply type filters
    if (types && types.length > 0) {
      searchResults = searchResults.filter(result => types.includes(result.type as any))
    }

    // Apply status filters
    if (filters.status && filters.status.length > 0) {
      searchResults = searchResults.filter(result => 
        filters.status!.includes(result.status)
      )
    }

    // Apply category filters
    if (filters.category && filters.category.length > 0) {
      searchResults = searchResults.filter(result => 
        filters.category!.includes(result.category)
      )
    }

    // Apply date range filters
    if (filters.dateRange?.start || filters.dateRange?.end) {
      searchResults = searchResults.filter(result => {
        const doc = this.documents.get(result.id)
        if (!doc) return false
        
        const createdAt = new Date(doc.createdAt)
        if (filters.dateRange!.start && createdAt < new Date(filters.dateRange!.start)) {
          return false
        }
        if (filters.dateRange!.end && createdAt > new Date(filters.dateRange!.end)) {
          return false
        }
        return true
      })
    }

    // Sort results
    if (sortBy !== 'relevance') {
      searchResults.sort((a, b) => {
        const docA = this.documents.get(a.id)
        const docB = this.documents.get(b.id)
        if (!docA || !docB) return 0

        let comparison = 0
        switch (sortBy) {
          case 'date':
            comparison = new Date(docA.createdAt).getTime() - new Date(docB.createdAt).getTime()
            break
          case 'title':
            comparison = docA.title.localeCompare(docB.title)
            break
        }
        
        return sortOrder === 'desc' ? -comparison : comparison
      })
    }

    // Calculate facets
    const facets = this.calculateFacets(searchResults)

    // Apply pagination
    const paginatedResults = searchResults.slice(offset, offset + limit)

    // Transform to SearchResult format with highlights
    const results: SearchResult[] = paginatedResults.map(result => {
      const doc = this.documents.get(result.id)
      return {
        id: result.id,
        title: result.title,
        type: result.type as 'product' | 'page' | 'media',
        excerpt: result.excerpt || '',
        url: result.url,
        score: result.score,
        highlights: this.generateHighlights(query, doc),
        metadata: result.metadata || {}
      }
    })

    return {
      results,
      totalCount: searchResults.length,
      facets
    }
  }

  // Generate search suggestions and autocomplete
  getSuggestions(query: string, limit: number = 5): string[] {
    if (!query.trim()) {
      return this.getPopularTerms(limit)
    }

    const suggestions = this.searchIndex.autoSuggest(query, {
      limit: limit * 2 // Get more to filter duplicates
    })

    // Extract unique suggestions
    const uniqueSuggestions = Array.from(new Set(
      suggestions.map(s => s.suggestion)
    )).slice(0, limit)

    return uniqueSuggestions
  }

  // Get popular search terms from analytics
  getPopularTerms(limit: number = 5): string[] {
    // This would typically come from search analytics
    // For now, return some common terms
    return [
      'workspace',
      'desk',
      'chair',
      'lighting',
      'storage',
      'ergonomic',
      'standing desk',
      'office setup'
    ].slice(0, limit)
  }

  // Get search index statistics
  getStats(): { totalDocuments: number, documentsByType: Record<string, number> } {
    const documentsByType: Record<string, number> = {}
    
    this.documents.forEach(doc => {
      documentsByType[doc.type] = (documentsByType[doc.type] || 0) + 1
    })

    return {
      totalDocuments: this.documents.size,
      documentsByType
    }
  }

  // Private helper methods
  private calculateFacets(results: any[]): Record<string, Record<string, number>> {
    const facets: Record<string, Record<string, number>> = {
      types: {},
      statuses: {},
      categories: {}
    }

    results.forEach(result => {
      // Type facets
      facets.types[result.type] = (facets.types[result.type] || 0) + 1
      
      // Status facets
      facets.statuses[result.status] = (facets.statuses[result.status] || 0) + 1
      
      // Category facets
      if (result.category) {
        facets.categories[result.category] = (facets.categories[result.category] || 0) + 1
      }
    })

    return facets
  }

  private generateHighlights(query: string, doc?: SearchDocument): { title?: string, content?: string } {
    if (!doc) return {}

    const queryTerms = query.toLowerCase().split(/\s+/)
    const highlights: { title?: string, content?: string } = {}

    // Highlight title
    let highlightedTitle = doc.title
    queryTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi')
      highlightedTitle = highlightedTitle.replace(regex, '<mark>$1</mark>')
    })
    if (highlightedTitle !== doc.title) {
      highlights.title = highlightedTitle
    }

    // Highlight content excerpt
    let highlightedContent = doc.content
    queryTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi')
      highlightedContent = highlightedContent.replace(regex, '<mark>$1</mark>')
    })
    if (highlightedContent !== doc.content) {
      highlights.content = highlightedContent.substring(0, 200) + '...'
    }

    return highlights
  }
}

// Singleton instance
let searchServiceInstance: SearchService | null = null

export function getSearchService(): SearchService {
  if (!searchServiceInstance) {
    searchServiceInstance = new SearchService()
  }
  return searchServiceInstance
}

// Database-specific search functions
export async function searchProducts(query: string, options: {
  categoryId?: string
  minPrice?: number
  maxPrice?: number
  status?: string
  limit?: number
  offset?: number
} = {}): Promise<{ products: any[], total: number }> {
  const {
    categoryId,
    minPrice,
    maxPrice,
    status,
    limit = 20,
    offset = 0
  } = options

  const whereConditions: any[] = []

  // Add text search conditions
  if (query.trim()) {
    whereConditions.push({
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } }
      ]
    })
  }

  // Add filter conditions
  if (categoryId) {
    whereConditions.push({ categories: { some: { categoryId } } })
  }
  if (minPrice !== undefined) {
    whereConditions.push({ price: { gte: minPrice } })
  }
  if (maxPrice !== undefined) {
    whereConditions.push({ price: { lte: maxPrice } })
  }
  if (status) {
    whereConditions.push({ status })
  }

  const products = await prisma.product.findMany({
    where: whereConditions.length > 0 ? { AND: whereConditions } : {},
    include: {
      categories: { include: { category: true } },
      media: { include: { media: true }, orderBy: { sortOrder: 'asc' } }
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset
  })

  return {
    products,
    total: products.length
  }
}

export async function searchPages(query: string, options: {
  status?: string
  template?: string
  limit?: number
  offset?: number
} = {}): Promise<{ pages: any[], total: number }> {
  const {
    status,
    template,
    limit = 20,
    offset = 0
  } = options

  const whereConditions: any[] = []

  // Add text search conditions
  if (query.trim()) {
    whereConditions.push({
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
        { excerpt: { contains: query, mode: 'insensitive' } }
      ]
    })
  }

  // Add filter conditions
  if (status) {
    whereConditions.push({ status })
  }
  if (template) {
    whereConditions.push({ template })
  }

  const pages = await prisma.page.findMany({
    where: whereConditions.length > 0 ? { AND: whereConditions } : {},
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset
  })

  return {
    pages,
    total: pages.length
  }
}

export async function searchAll(query: string, options: {
  types?: ('product' | 'page')[]
  limit?: number
  offset?: number
} = {}): Promise<{ results: any[], total: number, breakdown: { products: number, pages: number } }> {
  const { types, limit = 20, offset = 0 } = options
  
  const results: any[] = []
  const breakdown = { products: 0, pages: 0 }

  // Search products if included
  if (!types || types.includes('product')) {
    const { products } = await searchProducts(query, { limit: Math.ceil(limit / 2) })
    results.push(...products.map(p => ({ ...p, type: 'product' })))
    breakdown.products = products.length
  }

  // Search pages if included
  if (!types || types.includes('page')) {
    const { pages } = await searchPages(query, { limit: Math.ceil(limit / 2) })
    results.push(...pages.map(p => ({ ...p, type: 'page' })))
    breakdown.pages = pages.length
  }

  return {
    results: results.slice(offset, offset + limit),
    total: results.length,
    breakdown
  }
}

// Search suggestions and autocomplete
export async function getSuggestions(query: string, options: { limit?: number } = {}): Promise<string[]> {
  const { limit = 5 } = options

  if (!query.trim()) {
    // Return popular search terms from analytics
    const popularTerms = await prisma.searchEvent.groupBy({
      by: ['query'],
      _count: { query: true },
      where: {
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      },
      orderBy: { _count: { query: 'desc' } },
      take: limit
    })

    return popularTerms.map(term => term.query)
  }

  // Get suggestions from product and page titles
  const [products, pages] = await Promise.all([
    prisma.product.findMany({
      where: {
        name: { contains: query, mode: 'insensitive' }
      },
      select: { name: true },
      take: Math.ceil(limit / 2)
    }),
    prisma.page.findMany({
      where: {
        title: { contains: query, mode: 'insensitive' }
      },
      select: { title: true },
      take: Math.ceil(limit / 2)
    })
  ])

  const suggestions = [
    ...products.map(p => p.name),
    ...pages.map(p => p.title)
  ]

  return Array.from(new Set(suggestions)).slice(0, limit)
}

// Search analytics and tracking
export async function trackSearchEvent(event: SearchAnalyticsEvent): Promise<void> {
  await prisma.searchEvent.create({
    data: {
      query: event.query,
      resultsCount: event.resultsCount,
      userId: event.userId || null,
      filters: event.filters || undefined,
      userAgent: event.userAgent || null,
      ipAddress: event.ipAddress || null
    }
  })
}

export async function getSearchAnalytics(
  type: 'overview' | 'detailed',
  options: {
    startDate?: Date
    endDate?: Date
    limit?: number
  } = {}
): Promise<SearchAnalytics | { events: any[], total: number }> {
  const { startDate, endDate, limit = 100 } = options

  const dateFilter = {
    ...(startDate && { gte: startDate }),
    ...(endDate && { lte: endDate })
  }

  if (type === 'detailed') {
    const events = await prisma.searchEvent.findMany({
      where: dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {},
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return {
      events,
      total: events.length
    }
  }

  // Overview analytics
  const [events, topQueries] = await Promise.all([
    prisma.searchEvent.findMany({
      where: dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {},
      select: { resultsCount: true, createdAt: true }
    }),
    prisma.searchEvent.groupBy({
      by: ['query'],
      _count: { query: true },
      where: dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {},
      orderBy: { _count: { query: 'desc' } },
      take: 10
    })
  ])

  const totalSearches = events.length
  const averageResultsPerSearch = totalSearches > 0 
    ? events.reduce((sum, e) => sum + e.resultsCount, 0) / totalSearches 
    : 0
  const noResultsRate = totalSearches > 0
    ? events.filter(e => e.resultsCount === 0).length / totalSearches
    : 0

  // Calculate search trends (daily counts)
  const searchTrends = events.reduce((trends: Record<string, number>, event) => {
    const date = event.createdAt.toISOString().split('T')[0]
    trends[date] = (trends[date] || 0) + 1
    return trends
  }, {})

  return {
    totalSearches,
    uniqueQueries: topQueries.length,
    averageResultsPerSearch,
    noResultsRate,
    topQueries: topQueries.map(q => ({ query: q.query, count: q._count.query })),
    searchTrends: Object.entries(searchTrends).map(([date, count]) => ({ date, count }))
  }
}

// Create and populate search index
export async function createSearchIndex(): Promise<SearchService> {
  const searchService = getSearchService()
  searchService.clearIndex()

  // Index products
  const products = await prisma.product.findMany({
    where: { status: 'PUBLISHED' },
    include: { categories: { include: { category: true } } }
  })

  // Index pages
  const pages = await prisma.page.findMany({
    where: { status: 'PUBLISHED' }
  })

  const documents: SearchDocument[] = [
    ...products.map(product => ({
      id: `product-${product.id}`,
      type: 'product' as const,
      title: product.name,
      content: product.description || '',
      excerpt: product.shortDescription || '',
      tags: [],
      status: product.status,
      category: product.categories[0]?.category.name || '',
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      url: `/products/${product.slug}`,
      metadata: {
        price: product.price,
        sku: product.sku,
        featured: product.featured
      }
    })),
    ...pages.map(page => ({
      id: `page-${page.id}`,
      type: 'page' as const,
      title: page.title,
      content: page.content || '',
      excerpt: page.excerpt || '',
      tags: [],
      status: page.status,
      category: page.template || '',
      createdAt: page.createdAt.toISOString(),
      updatedAt: page.updatedAt.toISOString(),
      url: `/pages/${page.slug}`,
      metadata: {
        template: page.template,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription
      }
    }))
  ]

  searchService.addDocuments(documents)
  return searchService
}

// Legacy compatibility - maintain existing interface
export const searchService = {
  async search(options: SearchOptions): Promise<{ results: SearchResult[], total: number }> {
    const service = getSearchService()
    const result = service.search(options)
    return {
      results: result.results,
      total: result.totalCount
    }
  },

  async getSuggestions(query: string, limit?: number): Promise<string[]> {
    return getSuggestions(query, { limit })
  },

  async getPopularTerms(limit?: number): Promise<string[]> {
    const service = getSearchService()
    return service.getPopularTerms(limit)
  },

  async indexContent(contentType: string, contentId: string, data: any): Promise<boolean> {
    // This would add/update a single document in the search index
    const service = getSearchService()
    
    const document: SearchDocument = {
      id: `${contentType}-${contentId}`,
      type: contentType as 'product' | 'page' | 'media',
      title: data.title || data.name || '',
      content: data.content || data.description || '',
      excerpt: data.excerpt || data.shortDescription || '',
      tags: data.tags || [],
      status: data.status || 'published',
      category: data.category || '',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
      url: data.url || `/${contentType}s/${contentId}`,
      metadata: data.metadata || {}
    }

    service.addDocuments([document])
    return true
  },

  async removeFromIndex(contentType: string, contentId: string): Promise<boolean> {
    const service = getSearchService()
    service.removeDocuments([`${contentType}-${contentId}`])
    return true
  },

  clearIndex(): void {
    const service = getSearchService()
    service.clearIndex()
  },

  addDocuments(documents: SearchDocument[]): void {
    const service = getSearchService()
    service.addDocuments(documents)
  },

  getStats(): { totalDocuments: number, documentsByType: Record<string, number> } {
    const service = getSearchService()
    return service.getStats()
  }
}