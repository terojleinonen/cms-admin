/**
 * PostgreSQL Search Implementation Tests
 * Tests the new PostgreSQL-based search functionality
 */

import { searchProducts, searchPages, getSuggestions, getSearchService } from '@/lib/search'
import { prisma } from '@/lib/db'

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    page: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    media: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    searchEvent: {
      groupBy: jest.fn(),
    },
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('PostgreSQL Search Implementation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('searchProducts', () => {
    it('should search products using PostgreSQL full-text search', async () => {
      const mockProducts = [
        {
          id: '1',
          name: 'Test Product',
          description: 'A test product',
          shortDescription: 'Test',
          sku: 'TEST-001',
          price: 99.99,
          status: 'PUBLISHED',
          createdAt: new Date(),
          updatedAt: new Date(),
          categories: [{ category: { name: 'Electronics' } }]
        }
      ]

      mockPrisma.product.findMany.mockResolvedValue(mockProducts as any)
      mockPrisma.product.count.mockResolvedValue(1)

      const result = await searchProducts('test', { limit: 10 })

      expect(result.products).toEqual(mockProducts)
      expect(result.total).toBe(1)
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: {
          AND: [{
            OR: [
              { name: { contains: 'test', mode: 'insensitive' } },
              { description: { contains: 'test', mode: 'insensitive' } },
              { shortDescription: { contains: 'test', mode: 'insensitive' } },
              { sku: { contains: 'test', mode: 'insensitive' } }
            ]
          }]
        },
        include: {
          categories: { include: { category: true } },
          media: { include: { media: true }, orderBy: { sortOrder: 'asc' } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0
      })
    })

    it('should handle empty search query', async () => {
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.product.count.mockResolvedValue(0)

      const result = await searchProducts('', { limit: 10 })

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          categories: { include: { category: true } },
          media: { include: { media: true }, orderBy: { sortOrder: 'asc' } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0
      })
    })
  })

  describe('searchPages', () => {
    it('should search pages using PostgreSQL full-text search', async () => {
      const mockPages = [
        {
          id: '1',
          title: 'Test Page',
          content: 'Test content',
          excerpt: 'Test excerpt',
          status: 'PUBLISHED',
          template: 'default',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockPrisma.page.findMany.mockResolvedValue(mockPages as any)
      mockPrisma.page.count.mockResolvedValue(1)

      const result = await searchPages('test', { limit: 10 })

      expect(result.pages).toEqual(mockPages)
      expect(result.total).toBe(1)
      expect(mockPrisma.page.findMany).toHaveBeenCalledWith({
        where: {
          AND: [{
            OR: [
              { title: { contains: 'test', mode: 'insensitive' } },
              { content: { contains: 'test', mode: 'insensitive' } },
              { excerpt: { contains: 'test', mode: 'insensitive' } }
            ]
          }]
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0
      })
    })
  })

  describe('getSuggestions', () => {
    it('should get suggestions from database', async () => {
      const mockProducts = [{ name: 'Test Product' }]
      const mockPages = [{ title: 'Test Page' }]

      mockPrisma.product.findMany.mockResolvedValue(mockProducts as any)
      mockPrisma.page.findMany.mockResolvedValue(mockPages as any)

      const result = await getSuggestions('test', { limit: 5 })

      expect(result).toEqual(['Test Product', 'Test Page'])
    })

    it('should get popular terms when no query provided', async () => {
      const mockPopularTerms = [
        { query: 'workspace', _count: { query: 10 } },
        { query: 'desk', _count: { query: 8 } }
      ]

      mockPrisma.searchEvent.groupBy.mockResolvedValue(mockPopularTerms as any)

      const result = await getSuggestions('', { limit: 5 })

      expect(result).toEqual(['workspace', 'desk'])
    })

    it('should fallback to hardcoded terms if SearchEvent table fails', async () => {
      mockPrisma.searchEvent.groupBy.mockRejectedValue(new Error('Table does not exist'))

      const result = await getSuggestions('', { limit: 5 })

      expect(result).toEqual(['workspace', 'desk', 'chair', 'lighting', 'storage'])
    })
  })

  describe('SearchService', () => {
    it('should create search service instance', () => {
      const service = getSearchService()
      expect(service).toBeDefined()
    })

    it('should get stats from database', async () => {
      mockPrisma.product.count.mockResolvedValue(10)
      mockPrisma.page.count.mockResolvedValue(5)
      mockPrisma.media.count.mockResolvedValue(20)

      const service = getSearchService()
      const stats = await service.getStats()

      expect(stats).toEqual({
        totalDocuments: 35,
        documentsByType: {
          product: 10,
          page: 5,
          media: 20
        }
      })
    })
  })
})