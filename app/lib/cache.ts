/**
 * Comprehensive Cache service for improved performance
 */

import { Prisma, PrismaClient, ProductStatus } from '@prisma/client'
import { Product, Category } from './types'
import { isProductStatus } from './type-guards'

export interface CacheEntry<T = unknown> {
  key: string
  value: T
  expiresAt: Date
  createdAt: Date
  lastAccessed: Date
}

export interface CacheConfig {
  defaultTTL?: number // Time to live in seconds
  maxMemoryItems?: number // Maximum number of entries in memory
  enableRedis?: boolean // Enable Redis support
  redisUrl?: string // Redis connection URL
}

export interface CacheStats {
  totalItems: number
  memoryUsage: number
  hitRate: number
  totalHits: number
  totalMisses: number
}

export interface ProductQueryParams {
  page?: number
  limit?: number
  status?: string
  categoryId?: string
  search?: string
}

export interface ProductsResult {
  products: unknown[]
  total: number
  page: number
  limit: number
}

export interface CategoryQueryParams {
  includeProducts?: boolean
  isActive?: boolean
}

export interface ImageMetadata {
  width?: number
  height?: number
  format?: string
  size?: number
  quality?: number
}

export interface ImageOptions {
  width?: number
  height?: number
  format?: string
  quality?: number
  fit?: string
}

export interface CachedImage {
  processedPath: string
  metadata: ImageMetadata
  createdAt: number
}

/**
 * In-memory cache implementation with LRU eviction
 */
export class MemoryCache {
  private cache = new Map<string, CacheEntry>()
  private maxSize: number
  private stats = {
    hits: 0,
    misses: 0
  }

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize
  }

  set<T>(key: string, value: T, ttl: number = 300): void {
    const now = new Date()
    const expiresAt = new Date(Date.now() + ttl * 1000)
    
    // If key already exists, delete it first to update insertion order
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // Remove oldest entry (first in insertion order) if cache is full
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      key,
      value,
      expiresAt,
      createdAt: now,
      lastAccessed: now
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) {
      this.stats.misses++
      return null
    }

    // Check if expired
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }

    // Move to end (most recently used) by deleting and re-inserting
    this.cache.delete(key)
    entry.lastAccessed = new Date()
    this.cache.set(key, entry)
    this.stats.hits++

    return entry.value as T
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
    this.stats.hits = 0
    this.stats.misses = 0
  }

  size(): number {
    return this.cache.size
  }

  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  getStats(): { hits: number; misses: number } {
    return { ...this.stats }
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace('*', '.*'))
    const keysToDelete: string[] = []
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key))
  }
}

/**
 * Database-backed cache implementation for query results
 */
export class DatabaseCache {
  private memoryCache: MemoryCache

  constructor(private prisma: PrismaClient) {
    this.memoryCache = new MemoryCache(500) // Smaller cache for database results
  }

  async getProducts(params: ProductQueryParams): Promise<ProductsResult> {
    const cacheKey = `products:${JSON.stringify(params)}`
    
    // Try memory cache first
    const cached = this.memoryCache.get<ProductsResult>(cacheKey)
    if (cached) {
      return cached
    }

    // Fetch from database
    const { page = 1, limit = 10, status, categoryId, search } = params
    const skip = (page - 1) * limit

    const where: Prisma.ProductWhereInput = {}
    if (status && isProductStatus(status)) where.status = status
    if (categoryId) where.categories = { some: { categoryId } }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.product.count({ where })
    ])

    const result: ProductsResult = {
      products,
      total,
      page,
      limit
    }

    // Cache the result
    this.memoryCache.set(cacheKey, result, 300) // 5 minutes TTL

    return result
  }

  async getProduct(id: string): Promise<any | null> {
    const cacheKey = `product:${id}`
    
    // Try memory cache first
    const cached = this.memoryCache.get<Product>(cacheKey)
    if (cached) {
      return cached
    }

    // Fetch from database
    const product = await this.prisma.product.findFirst({
      where: { id },
      include: {
        categories: true,
        media: true
      }
    })

    if (product) {
      // Cache the result
      this.memoryCache.set(cacheKey, product, 600) // 10 minutes TTL
    }

    return product
  }

  async getCategories(params: CategoryQueryParams): Promise<any[]> {
    const cacheKey = `categories:${JSON.stringify(params)}`
    
    // Try memory cache first
    const cached = this.memoryCache.get<Category[]>(cacheKey)
    if (cached) {
      return cached
    }

    // Fetch from database
    const { includeProducts = false, isActive } = params
    const where: Prisma.CategoryWhereInput = {}
    if (isActive !== undefined) where.isActive = isActive

    const categories = await this.prisma.category.findMany({
      where,
      include: {
        products: includeProducts
      },
      orderBy: { name: 'asc' }
    })

    // Cache the result
    this.memoryCache.set(cacheKey, categories, 600) // 10 minutes TTL

    return categories
  }

  async invalidateProductCache(id: string): Promise<void> {
    this.memoryCache.delete(`product:${id}`)
    this.memoryCache.invalidatePattern('products:*')
  }

  async invalidateProducts(): Promise<void> {
    this.memoryCache.invalidatePattern('products:*')
  }

  async invalidateCategoryCache(id: string): Promise<void> {
    this.memoryCache.delete(`category:${id}`)
    this.memoryCache.invalidatePattern('categories:*')
  }

  async set<T>(key: string, value: T, ttl: number = 300): Promise<void> {
    this.memoryCache.set(key, value, ttl)
  }

  async get<T>(key: string): Promise<T | null> {
    return this.memoryCache.get<T>(key)
  }

  async delete(key: string): Promise<boolean> {
    return this.memoryCache.delete(key)
  }

  async clear(): Promise<void> {
    this.memoryCache.clear()
  }

  async cleanup(): Promise<number> {
    // For memory cache, we don't need explicit cleanup as expired items are removed on access
    return 0
  }
}

/**
 * Image cache for processed image metadata caching
 */
export class ImageCache {
  private cache = new MemoryCache(500)

  constructor(private cacheDir: string = './cache/images') {}

  getCacheKey(originalPath: string, options: ImageOptions): string {
    const params = [originalPath, options.width, options.height, options.format, options.quality, options.fit].filter(Boolean).join('-')
    return `image-${Buffer.from(params).toString('base64')}`
  }

  async cacheImageMetadata(originalPath: string, processedPath: string, metadata: ImageMetadata): Promise<void> {
    const cacheKey = this.getCacheKey(originalPath, metadata)
    const cacheData: CachedImage = {
      processedPath,
      metadata,
      createdAt: Date.now()
    }
    
    this.cache.set(cacheKey, cacheData, 3600) // 1 hour TTL
  }

  async getCachedImageMetadata(originalPath: string, options: ImageOptions): Promise<CachedImage | null> {
    const cacheKey = this.getCacheKey(originalPath, options)
    return this.cache.get<CachedImage>(cacheKey)
  }

  async invalidateImageCache(path: string): Promise<void> {
    // Invalidate all cached versions of this image
    const pattern = `image-${Buffer.from(path).toString('base64').substring(0, 10)}*`
    this.cache.invalidatePattern(pattern)
  }

  get(key: string): string | null {
    return this.cache.get<string>(key)
  }

  set(key: string, path: string, ttl: number = 3600): void {
    this.cache.set(key, path, ttl)
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }
}

/**
 * Main cache service singleton that combines different cache strategies
 */
export class CacheService {
  private static instance: CacheService | null = null
  private memoryCache: MemoryCache
  private databaseCache?: DatabaseCache
  private imageCache: ImageCache
  private config: CacheConfig
  private stats = {
    totalHits: 0,
    totalMisses: 0
  }

  private constructor(config: CacheConfig = {}) {
    // Environment-based configuration with fallbacks
    const nodeEnv = process.env.NODE_ENV || 'development'
    const redisUrl = process.env.REDIS_URL
    
    this.config = {
      defaultTTL: 300,
      maxMemoryItems: nodeEnv === 'production' ? 2000 : 1000,
      enableRedis: nodeEnv === 'production' && !!redisUrl,
      redisUrl,
      ...config
    }
    
    this.memoryCache = new MemoryCache(this.config.maxMemoryItems)
    this.imageCache = new ImageCache()
    
    // Log cache configuration
    console.log(`Cache initialized: ${this.config.enableRedis ? 'Redis + Memory' : 'Memory only'} (${nodeEnv})`)
  }

  static getInstance(config: CacheConfig = {}): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService(config)
    }
    return CacheService.instance
  }

  // Initialize with Prisma client for database caching
  initializeDatabase(prisma: PrismaClient): void {
    this.databaseCache = new DatabaseCache(prisma)
  }

  async get<T>(key: string): Promise<T | null> {
    const result = this.memoryCache.get<T>(key)
    if (result !== null) {
      this.stats.totalHits++
      return result
    }
    
    this.stats.totalMisses++
    return null
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const actualTTL = ttl || this.config.defaultTTL || 300
    this.memoryCache.set(key, value, actualTTL)
  }

  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key)
  }

  async clear(): Promise<void> {
    this.memoryCache.clear()
    this.imageCache.clear()
    if (this.databaseCache) {
      await this.databaseCache.clear()
    }
    this.stats.totalHits = 0
    this.stats.totalMisses = 0
  }

  async getOrSet<T>(key: string, fetchFunction: () => Promise<T>, ttl?: number): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Fetch the data
    const data = await fetchFunction()
    
    // Store in cache
    await this.set(key, data, ttl)
    
    return data
  }

  async invalidatePattern(pattern: string): Promise<void> {
    this.memoryCache.invalidatePattern(pattern)
  }

  getStats(): CacheStats {
    const totalRequests = this.stats.totalHits + this.stats.totalMisses
    const hitRate = totalRequests > 0 ? (this.stats.totalHits / totalRequests) * 100 : 0

    return {
      totalItems: this.memoryCache.size(),
      memoryUsage: this.memoryCache.size() * 1024, // Rough estimate
      hitRate: Math.round(hitRate * 100) / 100,
      totalHits: this.stats.totalHits,
      totalMisses: this.stats.totalMisses
    }
  }

  // Database cache methods
  getDatabaseCache(): DatabaseCache | undefined {
    return this.databaseCache
  }

  // Image cache methods
  getImageCache(): ImageCache {
    return this.imageCache
  }

  // Memory cache methods (for backward compatibility)
  setMemory<T>(key: string, value: T, ttl?: number): void {
    this.memoryCache.set(key, value, ttl || this.config.defaultTTL || 300)
  }

  getMemory<T>(key: string): T | null {
    return this.memoryCache.get<T>(key)
  }

  deleteMemory(key: string): boolean {
    return this.memoryCache.delete(key)
  }

  // Database cache methods (for backward compatibility)
  async setDatabase<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (this.databaseCache) {
      await this.databaseCache.set(key, value, ttl || this.config.defaultTTL || 300)
    }
  }

  async getDatabase<T>(key: string): Promise<T | null> {
    if (this.databaseCache) {
      return await this.databaseCache.get<T>(key)
    }
    return null
  }

  async deleteDatabase(key: string): Promise<boolean> {
    if (this.databaseCache) {
      return await this.databaseCache.delete(key)
    }
    return false
  }

  // Image cache methods (for backward compatibility)
  getImage(key: string): string | null {
    return this.imageCache.get(key)
  }

  setImage(key: string, path: string, ttl?: number): void {
    this.imageCache.set(key, path, ttl || 3600)
  }

  deleteImage(key: string): boolean {
    return this.imageCache.delete(key)
  }

  // Utility methods
  async cleanup(): Promise<void> {
    if (this.databaseCache) {
      await this.databaseCache.cleanup()
    }
  }

  clearAll(): void {
    this.memoryCache.clear()
    this.imageCache.clear()
    this.stats.totalHits = 0
    this.stats.totalMisses = 0
  }

  // Reset singleton instance (useful for testing)
  static resetInstance(): void {
    CacheService.instance = null
  }
}