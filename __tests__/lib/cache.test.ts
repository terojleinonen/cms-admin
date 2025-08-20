/**
 * Cache System Tests
 * Tests the caching functionality and performance optimization
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CacheService, DatabaseCache, ImageCache } from '@/lib/cache';

// Mock Prisma Client
const mockPrisma = {
  product: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn()
  },
  category: {
    findMany: jest.fn()
  }
} as any;

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    // Create a fresh cache instance for each test
    cache = CacheService.getInstance({
      defaultTTL: 300,
      maxMemoryItems: 100,
      enableRedis: false
    });
    
    // Clear cache before each test
    cache.clear();
  });

  describe('Basic Cache Operations', () => {
    it('should set and get cache items', async () => {
      const testData = { id: 1, name: 'Test Item' };
      
      await cache.set('test-key', testData);
      const retrieved = await cache.get('test-key');
      
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should respect TTL and expire items', async () => {
      const testData = { id: 1, name: 'Test Item' };
      
      // Set with 1 second TTL
      await cache.set('test-key', testData, 1);
      
      // Should be available immediately
      let retrieved = await cache.get('test-key');
      expect(retrieved).toEqual(testData);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should be expired
      retrieved = await cache.get('test-key');
      expect(retrieved).toBeNull();
    });

    it('should delete cache items', async () => {
      const testData = { id: 1, name: 'Test Item' };
      
      await cache.set('test-key', testData);
      await cache.delete('test-key');
      
      const retrieved = await cache.get('test-key');
      expect(retrieved).toBeNull();
    });

    it('should clear all cache items', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      
      await cache.clear();
      
      const result1 = await cache.get('key1');
      const result2 = await cache.get('key2');
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('Advanced Cache Operations', () => {
    it('should implement getOrSet pattern', async () => {
      const fetchFunction = jest.fn().mockResolvedValue({ id: 1, name: 'Fetched Data' });
      
      // First call should fetch data
      const result1 = await cache.getOrSet('test-key', fetchFunction);
      expect(fetchFunction).toHaveBeenCalledTimes(1);
      expect(result1).toEqual({ id: 1, name: 'Fetched Data' });
      
      // Second call should use cache
      const result2 = await cache.getOrSet('test-key', fetchFunction);
      expect(fetchFunction).toHaveBeenCalledTimes(1); // Still only called once
      expect(result2).toEqual({ id: 1, name: 'Fetched Data' });
    });

    it('should invalidate cache by pattern', async () => {
      await cache.set('user:1', { id: 1, name: 'User 1' });
      await cache.set('user:2', { id: 2, name: 'User 2' });
      await cache.set('product:1', { id: 1, name: 'Product 1' });
      
      await cache.invalidatePattern('user:*');
      
      expect(await cache.get('user:1')).toBeNull();
      expect(await cache.get('user:2')).toBeNull();
      expect(await cache.get('product:1')).not.toBeNull();
    });

    it('should provide cache statistics', () => {
      const stats = cache.getStats();
      
      expect(stats).toHaveProperty('totalItems');
      expect(stats).toHaveProperty('memoryUsage');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('totalHits');
      expect(stats).toHaveProperty('totalMisses');
    });

    it('should track hit and miss statistics', async () => {
      await cache.set('test-key', 'test-value');
      
      // Hit
      await cache.get('test-key');
      
      // Miss
      await cache.get('non-existent-key');
      
      const stats = cache.getStats();
      expect(stats.totalHits).toBeGreaterThan(0);
      expect(stats.totalMisses).toBeGreaterThan(0);
    });
  });

  describe('Memory Management', () => {
    it('should enforce memory limits with LRU eviction', async () => {
      // Create cache with small limit
      const smallCache = CacheService.getInstance({
        defaultTTL: 300,
        maxMemoryItems: 3,
        enableRedis: false
      });

      await smallCache.clear();

      // Fill cache to limit
      await smallCache.set('key1', 'value1');
      await smallCache.set('key2', 'value2');
      await smallCache.set('key3', 'value3');

      // Access key1 to make it more recently used
      await smallCache.get('key1');

      // Add one more item, should evict least recently used (key2)
      await smallCache.set('key4', 'value4');

      expect(await smallCache.get('key1')).not.toBeNull(); // Should still exist
      expect(await smallCache.get('key2')).toBeNull(); // Should be evicted
      expect(await smallCache.get('key3')).not.toBeNull(); // Should still exist
      expect(await smallCache.get('key4')).not.toBeNull(); // Should exist
    });
  });
});

describe('DatabaseCache', () => {
  let dbCache: DatabaseCache;

  beforeEach(() => {
    jest.clearAllMocks();
    dbCache = new DatabaseCache(mockPrisma);
  });

  describe('Product Caching', () => {
    it('should cache product queries', async () => {
      const mockProducts = [
        { id: '1', name: 'Product 1', status: 'PUBLISHED' },
        { id: '2', name: 'Product 2', status: 'PUBLISHED' }
      ];

      mockPrisma.product.findMany.mockResolvedValue(mockProducts);
      mockPrisma.product.count.mockResolvedValue(2);

      const params = { page: 1, limit: 10 };

      // First call should hit database
      const result1 = await dbCache.getProducts(params);
      expect(mockPrisma.product.findMany).toHaveBeenCalledTimes(1);
      expect(result1.products).toEqual(mockProducts);

      // Second call should use cache
      const result2 = await dbCache.getProducts(params);
      expect(mockPrisma.product.findMany).toHaveBeenCalledTimes(1); // Still only called once
      expect(result2.products).toEqual(mockProducts);
    });

    it('should cache single product queries', async () => {
      const mockProduct = { id: '1', name: 'Product 1', status: 'PUBLISHED' };

      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);

      // First call should hit database
      const result1 = await dbCache.getProduct('1');
      expect(mockPrisma.product.findFirst).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(mockProduct);

      // Second call should use cache
      const result2 = await dbCache.getProduct('1');
      expect(mockPrisma.product.findFirst).toHaveBeenCalledTimes(1); // Still only called once
      expect(result2).toEqual(mockProduct);
    });

    it('should invalidate product cache', async () => {
      const mockProduct = { id: '1', name: 'Product 1', status: 'PUBLISHED' };
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);

      // Cache the product
      await dbCache.getProduct('1');
      expect(mockPrisma.product.findFirst).toHaveBeenCalledTimes(1);

      // Invalidate cache
      await dbCache.invalidateProductCache('1');

      // Next call should hit database again
      await dbCache.getProduct('1');
      expect(mockPrisma.product.findFirst).toHaveBeenCalledTimes(2);
    });
  });

  describe('Category Caching', () => {
    it('should cache category queries', async () => {
      const mockCategories = [
        { id: '1', name: 'Category 1', isActive: true },
        { id: '2', name: 'Category 2', isActive: true }
      ];

      mockPrisma.category.findMany.mockResolvedValue(mockCategories);

      const params = { includeProducts: false };

      // First call should hit database
      const result1 = await dbCache.getCategories(params);
      expect(mockPrisma.category.findMany).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(mockCategories);

      // Second call should use cache
      const result2 = await dbCache.getCategories(params);
      expect(mockPrisma.category.findMany).toHaveBeenCalledTimes(1); // Still only called once
      expect(result2).toEqual(mockCategories);
    });

    it('should invalidate category cache', async () => {
      const mockCategories = [{ id: '1', name: 'Category 1', isActive: true }];
      mockPrisma.category.findMany.mockResolvedValue(mockCategories);

      // Cache the categories
      await dbCache.getCategories({});
      expect(mockPrisma.category.findMany).toHaveBeenCalledTimes(1);

      // Invalidate cache
      await dbCache.invalidateCategoryCache('1');

      // Next call should hit database again
      await dbCache.getCategories({});
      expect(mockPrisma.category.findMany).toHaveBeenCalledTimes(2);
    });
  });
});

describe('ImageCache', () => {
  let imageCache: ImageCache;

  beforeEach(() => {
    imageCache = new ImageCache();
  });

  it('should cache image metadata', async () => {
    const originalPath = '/uploads/image.jpg';
    const processedPath = '/uploads/optimized/image_processed.webp';
    const metadata = { width: 800, height: 600, format: 'webp' };

    await imageCache.cacheImageMetadata(originalPath, processedPath, metadata);

    const cached = await imageCache.getCachedImageMetadata(originalPath, metadata);
    expect(cached).toEqual({
      processedPath,
      metadata,
      createdAt: expect.any(Number)
    });
  });

  it('should return null for non-cached images', async () => {
    const result = await imageCache.getCachedImageMetadata('/non-existent.jpg', {});
    expect(result).toBeNull();
  });

  it('should invalidate image cache by path', async () => {
    const originalPath = '/uploads/image.jpg';
    const processedPath = '/uploads/optimized/image_processed.webp';
    const metadata = { width: 800, height: 600 };

    await imageCache.cacheImageMetadata(originalPath, processedPath, metadata);

    // Should be cached
    let cached = await imageCache.getCachedImageMetadata(originalPath, metadata);
    expect(cached).not.toBeNull();

    // Invalidate
    await imageCache.invalidateImageCache(originalPath);

    // Should be gone
    cached = await imageCache.getCachedImageMetadata(originalPath, metadata);
    expect(cached).toBeNull();
  });
});