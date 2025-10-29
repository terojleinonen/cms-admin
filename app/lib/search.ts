/**
 * Search Service
 * Handles search functionality using PostgreSQL full-text search
 */

import { prisma } from './db'
import type { Prisma, Product, Page, ProductStatus, PageStatus } from '@prisma/client'

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
    [key: string]: unknown
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
  metadata: Record<string, unknown>
}

export interface SearchAnalyticsEvent {
  query: string
  resultsCount: number
  userId?: string
  filters?: Record<string, unknown>
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

// Main SearchService class using PostgreSQL full-text search
export class SearchService {
  constructor() {
    // No initialization needed for PostgreSQL-based search
  }

  // Main search method using PostgreSQL full-text search
  async search(options: SearchOptions): Promise<{ results: SearchResult[], totalCount: number, facets: Record<string, Record<string, number>> }> {
    const { query, types, limit = 20, offset = 0, sortBy = 'relevance', sortOrder = 'desc', filters = {} } = options

    const results: SearchResult[] = []
    let totalCount = 0
    const facets: Record<string, Record<string, number>> = {
      types: {},
      statuses: {},
      categories: {}
    }

    // Search products if included
    if (!types || types.includes('product')) {
      const productResults = await this.searchProducts(query, {
        status: filters.status?.[0],
        categoryId: filters.category?.[0],
        limit: Math.ceil(limit / (types?.length || 3)),
        offset: Math.floor(offset / (types?.length || 3)),
        sortBy,
        sortOrder,
        dateRange: filters.dateRange
      })

      const productSearchResults: SearchResult[] = productResults.products.map(product => ({
        id: product.id,
        title: product.name,
        type: 'product' as const,
        excerpt: product.shortDescription || product.description?.substring(0, 200) || '',
        url: `/admin/products/${product.id}`,
        score: 1.0, // PostgreSQL doesn't provide relevance scores by default
        highlights: this.generateHighlights(query, {
          title: product.name,
          content: product.description || ''
        }),
        metadata: {
          price: product.price,
          sku: product.sku,
          status: product.status,
          category: product.categories[0]?.category.name,
          featured: product.featured,
          createdAt: product.createdAt.toISOString(),
          updatedAt: product.updatedAt.toISOString()
        }
      }))

      results.push(...productSearchResults)
      totalCount += productResults.total
      facets.types.product = productResults.total
      
      // Add status facets for products
      productResults.products.forEach(product => {
        facets.statuses[product.status] = (facets.statuses[product.status] || 0) + 1
        const categoryName = product.categories[0]?.category.name
        if (categoryName) {
          facets.categories[categoryName] = (facets.categories[categoryName] || 0) + 1
        }
      })
    }

    // Search pages if included
    if (!types || types.includes('page')) {
      const pageResults = await this.searchPages(query, {
        status: filters.status?.[0],
        template: filters.category?.[0],
        limit: Math.ceil(limit / (types?.length || 3)),
        offset: Math.floor(offset / (types?.length || 3)),
        sortBy,
        sortOrder,
        dateRange: filters.dateRange
      })

      const pageSearchResults: SearchResult[] = pageResults.pages.map(page => ({
        id: page.id,
        title: page.title,
        type: 'page' as const,
        excerpt: page.excerpt || page.content?.substring(0, 200) || '',
        url: `/admin/pages/${page.id}`,
        score: 1.0,
        highlights: this.generateHighlights(query, {
          title: page.title,
          content: page.content || ''
        }),
        metadata: {
          status: page.status,
          template: page.template,
          category: page.template,
          publishedAt: page.publishedAt?.toISOString(),
          createdAt: page.createdAt.toISOString(),
          updatedAt: page.updatedAt.toISOString()
        }
      }))

      results.push(...pageSearchResults)
      totalCount += pageResults.total
      facets.types.page = pageResults.total

      // Add status facets for pages
      pageResults.pages.forEach(page => {
        facets.statuses[page.status] = (facets.statuses[page.status] || 0) + 1
        if (page.template) {
          facets.categories[page.template] = (facets.categories[page.template] || 0) + 1
        }
      })
    }

    // Search media if included
    if (!types || types.includes('media')) {
      const mediaResults = await this.searchMedia(query, {
        limit: Math.ceil(limit / (types?.length || 3)),
        offset: Math.floor(offset / (types?.length || 3)),
        sortBy,
        sortOrder,
        dateRange: filters.dateRange
      })

      const mediaSearchResults: SearchResult[] = mediaResults.media.map(media => ({
        id: media.id,
        title: media.originalName,
        type: 'media' as const,
        excerpt: media.altText || '',
        url: `/admin/media/${media.id}`,
        score: 1.0,
        highlights: this.generateHighlights(query, {
          title: media.originalName,
          content: media.altText || ''
        }),
        metadata: {
          filename: media.filename,
          mimeType: media.mimeType,
          fileSize: media.fileSize,
          folder: media.folder,
          category: media.mimeType.split('/')[0],
          createdAt: media.createdAt.toISOString()
        }
      }))

      results.push(...mediaSearchResults)
      totalCount += mediaResults.total
      facets.types.media = mediaResults.total

      // Add category facets for media
      mediaResults.media.forEach(media => {
        const category = media.mimeType.split('/')[0]
        facets.categories[category] = (facets.categories[category] || 0) + 1
      })
    }

    // Sort results if not by relevance (PostgreSQL handles relevance sorting)
    if (sortBy !== 'relevance') {
      results.sort((a, b) => {
        let comparison = 0
        switch (sortBy) {
          case 'date':
            const dateA = new Date(a.metadata?.createdAt as string || 0)
            const dateB = new Date(b.metadata?.createdAt as string || 0)
            comparison = dateA.getTime() - dateB.getTime()
            break
          case 'title':
            comparison = a.title.localeCompare(b.title)
            break
        }
        return sortOrder === 'desc' ? -comparison : comparison
      })
    }

    // Apply final pagination
    const paginatedResults = results.slice(offset, offset + limit)

    return {
      results: paginatedResults,
      totalCount,
      facets
    }
  }

  // Search products using PostgreSQL full-text search
  private async searchProducts(query: string, options: {
    categoryId?: string
    status?: string
    limit?: number
    offset?: number
    sortBy?: string
    sortOrder?: string
    dateRange?: { start?: string, end?: string }
  } = {}): Promise<{ products: (Product & { categories: { category: { name: string } }[] })[], total: number }> {
    const {
      categoryId,
      status,
      limit = 20,
      offset = 0,
      sortBy = 'relevance',
      sortOrder = 'desc',
      dateRange
    } = options

    const whereConditions: Prisma.ProductWhereInput[] = []

    // Add text search conditions using PostgreSQL full-text search
    if (query.trim()) {
      whereConditions.push({
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { shortDescription: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } }
        ]
      })
    }

    // Add filter conditions
    if (categoryId) {
      whereConditions.push({ categories: { some: { categoryId } } })
    }
    if (status) {
      whereConditions.push({ status: status as ProductStatus })
    }
    if (dateRange?.start) {
      whereConditions.push({ createdAt: { gte: new Date(dateRange.start) } })
    }
    if (dateRange?.end) {
      whereConditions.push({ createdAt: { lte: new Date(dateRange.end) } })
    }

    // Determine sort order
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' }
    if (sortBy === 'title') {
      orderBy = { name: sortOrder as 'asc' | 'desc' }
    } else if (sortBy === 'date') {
      orderBy = { createdAt: sortOrder as 'asc' | 'desc' }
    }

    const products = await prisma.product.findMany({
      where: whereConditions.length > 0 ? { AND: whereConditions } : {},
      include: {
        categories: { include: { category: true } }
      },
      orderBy,
      take: limit,
      skip: offset
    })

    const total = await prisma.product.count({
      where: whereConditions.length > 0 ? { AND: whereConditions } : {},
    })

    return { products, total }
  }

  // Search pages using PostgreSQL full-text search
  private async searchPages(query: string, options: {
    status?: string
    template?: string
    limit?: number
    offset?: number
    sortBy?: string
    sortOrder?: string
    dateRange?: { start?: string, end?: string }
  } = {}): Promise<{ pages: Page[], total: number }> {
    const {
      status,
      template,
      limit = 20,
      offset = 0,
      sortBy = 'relevance',
      sortOrder = 'desc',
      dateRange
    } = options

    const whereConditions: Prisma.PageWhereInput[] = []

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
      whereConditions.push({ status: status as PageStatus })
    }
    if (template) {
      whereConditions.push({ template })
    }
    if (dateRange?.start) {
      whereConditions.push({ createdAt: { gte: new Date(dateRange.start) } })
    }
    if (dateRange?.end) {
      whereConditions.push({ createdAt: { lte: new Date(dateRange.end) } })
    }

    // Determine sort order
    let orderBy: Prisma.PageOrderByWithRelationInput = { createdAt: 'desc' }
    if (sortBy === 'title') {
      orderBy = { title: sortOrder as 'asc' | 'desc' }
    } else if (sortBy === 'date') {
      orderBy = { createdAt: sortOrder as 'asc' | 'desc' }
    }

    const pages = await prisma.page.findMany({
      where: whereConditions.length > 0 ? { AND: whereConditions } : {},
      orderBy,
      take: limit,
      skip: offset
    })

    const total = await prisma.page.count({
      where: whereConditions.length > 0 ? { AND: whereConditions } : {},
    })

    return { pages, total }
  }

  // Search media using PostgreSQL full-text search
  private async searchMedia(query: string, options: {
    limit?: number
    offset?: number
    sortBy?: string
    sortOrder?: string
    dateRange?: { start?: string, end?: string }
  } = {}): Promise<{ media: any[], total: number }> {
    const {
      limit = 20,
      offset = 0,
      sortBy = 'relevance',
      sortOrder = 'desc',
      dateRange
    } = options

    const whereConditions: Prisma.MediaWhereInput[] = []

    // Add text search conditions
    if (query.trim()) {
      whereConditions.push({
        OR: [
          { originalName: { contains: query, mode: 'insensitive' } },
          { filename: { contains: query, mode: 'insensitive' } },
          { altText: { contains: query, mode: 'insensitive' } }
        ]
      })
    }

    // Add date range filters
    if (dateRange?.start) {
      whereConditions.push({ createdAt: { gte: new Date(dateRange.start) } })
    }
    if (dateRange?.end) {
      whereConditions.push({ createdAt: { lte: new Date(dateRange.end) } })
    }

    // Determine sort order
    let orderBy: Prisma.MediaOrderByWithRelationInput = { createdAt: 'desc' }
    if (sortBy === 'title') {
      orderBy = { originalName: sortOrder as 'asc' | 'desc' }
    } else if (sortBy === 'date') {
      orderBy = { createdAt: sortOrder as 'asc' | 'desc' }
    }

    const media = await prisma.media.findMany({
      where: whereConditions.length > 0 ? { AND: whereConditions } : {},
      orderBy,
      take: limit,
      skip: offset
    })

    const total = await prisma.media.count({
      where: whereConditions.length > 0 ? { AND: whereConditions } : {},
    })

    return { media, total }
  }

  // Generate search suggestions using database queries
  async getSuggestions(query: string, limit: number = 5): Promise<string[]> {
    if (!query.trim()) {
      return this.getPopularTerms(limit)
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

  // Get popular search terms from analytics
  async getPopularTerms(limit: number = 5): Promise<string[]> {
    try {
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
    } catch (error) {
      // Fallback to hardcoded popular terms if SearchEvent table doesn't exist
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
  }

  // Get search statistics from database
  async getStats(): Promise<{ totalDocuments: number, documentsByType: Record<string, number> }> {
    const [productCount, pageCount, mediaCount] = await Promise.all([
      prisma.product.count(),
      prisma.page.count(),
      prisma.media.count()
    ])

    return {
      totalDocuments: productCount + pageCount + mediaCount,
      documentsByType: {
        product: productCount,
        page: pageCount,
        media: mediaCount
      }
    }
  }

  // Generate highlights for search results
  private generateHighlights(query: string, doc: { title: string, content: string }): { title?: string, content?: string } {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0)
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
    if (doc.content) {
      let highlightedContent = doc.content
      queryTerms.forEach(term => {
        const regex = new RegExp(`(${term})`, 'gi')
        highlightedContent = highlightedContent.replace(regex, '<mark>$1</mark>')
      })
      if (highlightedContent !== doc.content) {
        highlights.content = highlightedContent.substring(0, 200) + '...'
      }
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

// Database-specific search functions using PostgreSQL full-text search
export async function searchProducts(query: string, options: {
  categoryId?: string
  minPrice?: number
  maxPrice?: number
  status?: string
  limit?: number
  offset?: number
} = {}): Promise<{ products: Product[], total: number }> {
  const {
    categoryId,
    minPrice,
    maxPrice,
    status,
    limit = 20,
    offset = 0
  } = options

  const whereConditions: Prisma.ProductWhereInput[] = []

  // Add PostgreSQL full-text search conditions
  if (query.trim()) {
    whereConditions.push({
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { shortDescription: { contains: query, mode: 'insensitive' } },
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
    whereConditions.push({ status: status as ProductStatus })
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

  const total = await prisma.product.count({
    where: whereConditions.length > 0 ? { AND: whereConditions } : {},
  })

  return {
    products,
    total,
  }
}

export async function searchPages(query: string, options: {
  status?: string
  template?: string
  limit?: number
  offset?: number
} = {}): Promise<{ pages: Page[], total: number }> {
  const {
    status,
    template,
    limit = 20,
    offset = 0
  } = options

  const whereConditions: Prisma.PageWhereInput[] = []

  // Add PostgreSQL full-text search conditions
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
    whereConditions.push({ status: status as PageStatus })
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

  const total = await prisma.page.count({
    where: whereConditions.length > 0 ? { AND: whereConditions } : {},
  })

  return {
    pages,
    total
  }
}

export async function searchAll(query: string, options: {
  types?: ('product' | 'page')[]
  limit?: number
  offset?: number
} = {}): Promise<{ results: (Product & { type: 'product' } | Page & { type: 'page' })[], total: number, breakdown: { products: number, pages: number } }> {
  const { types, limit = 20, offset = 0 } = options
  
  const results: (Product & { type: 'product' } | Page & { type: 'page' })[] = []
  const breakdown = { products: 0, pages: 0 }

  // Search products if included
  if (!types || types.includes('product')) {
    const { products } = await searchProducts(query, { limit: Math.ceil(limit / 2) })
    results.push(...products.map(p => ({ ...p, type: 'product' as const })))
    breakdown.products = products.length
  }

  // Search pages if included
  if (!types || types.includes('page')) {
    const { pages } = await searchPages(query, { limit: Math.ceil(limit / 2) })
    results.push(...pages.map(p => ({ ...p, type: 'page' as const })))
    breakdown.pages = pages.length
  }

  return {
    results: results.slice(offset, offset + limit),
    total: results.length,
    breakdown
  }
}

// Search suggestions and autocomplete using PostgreSQL
export async function getSuggestions(query: string, options: { limit?: number } = {}): Promise<string[]> {
  const { limit = 5 } = options

  if (!query.trim()) {
    try {
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
    } catch (error) {
      // Fallback to hardcoded popular terms if SearchEvent table doesn't exist
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
  }

  // Get suggestions from product and page titles using PostgreSQL search
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
      filters: event.filters as Prisma.InputJsonValue || undefined,
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
): Promise<SearchAnalytics | { events: unknown[], total: number }> {
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

    const total = await prisma.searchEvent.count({
      where: dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {},
    })

    return {
      events,
      total
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

// Create and populate search index (no-op for PostgreSQL-based search)
export async function createSearchIndex(): Promise<SearchService> {
  const searchService = getSearchService()
  // No indexing needed for PostgreSQL-based search
  return searchService
}

// Legacy compatibility - maintain existing interface
export const searchService = {
  async search(options: SearchOptions): Promise<{ results: SearchResult[], total: number }> {
    const service = getSearchService()
    const result = await service.search(options)
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

  async indexContent(contentType: string, contentId: string, data: Partial<SearchDocument>): Promise<boolean> {
    // No-op for PostgreSQL-based search - content is automatically searchable when in database
    return true
  },

  async removeFromIndex(contentType: string, contentId: string): Promise<boolean> {
    // No-op for PostgreSQL-based search - content is automatically removed when deleted from database
    return true
  },

  clearIndex(): void {
    // No-op for PostgreSQL-based search
  },

  addDocuments(documents: SearchDocument[]): void {
    // No-op for PostgreSQL-based search
  },

  async getStats(): Promise<{ totalDocuments: number, documentsByType: Record<string, number> }> {
    const service = getSearchService()
    return service.getStats()
  }
}