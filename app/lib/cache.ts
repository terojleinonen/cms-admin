/**
 * Cache service for improved performance
 */

import { PrismaClient } from '@prisma/client'

export interface CacheEntry<T = any> {
  key: string
  value: T
  expiresAt: Date
  createdAt: Date
}

export interface CacheOptions {
  ttl?: number // Time to live in seconds
  maxSize?: number // Maximum number of entries
}

/**
 * In-memory cache implementation
 */
export class MemoryCache {
  private cache = new Map<string, CacheEntry>()
  private maxSize: number

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 1000
  }

  set<T>(key: string, value: T, ttl: number = 300): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    const expiresAt = new Date(Date.now() + ttl * 1000)
    this.cache.set(key, {
      key,
      value,
      expiresAt,
      createdAt: new Date()
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check if expired
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key)
      return null
    }

    return entry.value as T
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  keys(): string[] {
    return Array.from(this.cache.keys())
  }
}

/**
 * Database-backed cache implementation
 */
export class DatabaseCache {
  constructor(private prisma: PrismaClient) {}

  async set<T>(key: string, value: T, ttl: number = 300): Promise<void> {
    const expiresAt = new Date(Date.now() + ttl * 1000)
    
    await this.prisma.cache.upsert({
      where: { key },
      update: {
        value: JSON.stringify(value),
        expiresAt
      },
      create: {
        key,
        value: JSON.stringify(value),
        expiresAt
      }
    })
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = await this.prisma.cache.findUnique({
      where: { key }
    })

    if (!entry) return null

    // Check if expired
    if (entry.expiresAt < new Date()) {
      await this.prisma.cache.delete({ where: { key } })
      return null
    }

    try {
      return JSON.parse(entry.value) as T
    } catch {
      return null
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.prisma.cache.delete({ where: { key } })
      return true
    } catch {
      return false
    }
  }

  async clear(): Promise<void> {
    await this.prisma.cache.deleteMany()
  }

  async cleanup(): Promise<number> {
    const result = await this.prisma.cache.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })
    return result.count
  }
}

/**
 * Image cache for optimized image serving
 */
export class ImageCache {
  private cache = new MemoryCache({ maxSize: 500 })

  constructor(private cacheDir: string = './cache/images') {}

  getCacheKey(url: string, width?: number, height?: number, quality?: number): string {
    const params = [url, width, height, quality].filter(Boolean).join('-')
    return `image-${Buffer.from(params).toString('base64')}`
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
 * Main cache service that combines different cache strategies
 */
export class CacheService {
  private memoryCache: MemoryCache
  private databaseCache?: DatabaseCache
  private imageCache: ImageCache

  constructor(prisma?: PrismaClient, options: CacheOptions = {}) {
    this.memoryCache = new MemoryCache(options)
    this.databaseCache = prisma ? new DatabaseCache(prisma) : undefined
    this.imageCache = new ImageCache()
  }

  // Memory cache methods
  setMemory<T>(key: string, value: T, ttl?: number): void {
    this.memoryCache.set(key, value, ttl)
  }

  getMemory<T>(key: string): T | null {
    return this.memoryCache.get<T>(key)
  }

  deleteMemory(key: string): boolean {
    return this.memoryCache.delete(key)
  }

  // Database cache methods
  async setDatabase<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (this.databaseCache) {
      await this.databaseCache.set(key, value, ttl)
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

  // Image cache methods
  getImage(key: string): string | null {
    return this.imageCache.get(key)
  }

  setImage(key: string, path: string, ttl?: number): void {
    this.imageCache.set(key, path, ttl)
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
  }
}