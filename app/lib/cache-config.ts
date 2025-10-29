/**
 * Cache Configuration Utility
 * Provides environment-based caching strategy configuration
 */

export interface CacheStrategy {
  type: 'memory' | 'redis' | 'hybrid';
  ttl: number;
  maxMemoryItems: number;
  redisUrl?: string;
  enabled: boolean;
}

export class CacheConfigManager {
  /**
   * Get cache configuration based on environment
   */
  static getCacheConfig(): CacheStrategy {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const redisUrl = process.env.REDIS_URL;
    const forceRedis = process.env.FORCE_REDIS === 'true';
    
    // Default configuration
    const config: CacheStrategy = {
      type: 'memory',
      ttl: 5 * 60 * 1000, // 5 minutes
      maxMemoryItems: 1000,
      enabled: true
    };

    // Environment-specific configurations
    switch (nodeEnv) {
      case 'production':
        if (redisUrl) {
          config.type = 'hybrid'; // Memory + Redis
          config.redisUrl = redisUrl;
          config.ttl = 10 * 60 * 1000; // 10 minutes in production
          config.maxMemoryItems = 2000;
        } else {
          console.warn('Production environment without Redis - using memory cache only');
          config.maxMemoryItems = 5000; // Larger memory cache for production
        }
        break;
        
      case 'test':
        config.type = 'memory';
        config.ttl = 1 * 60 * 1000; // 1 minute for tests
        config.maxMemoryItems = 100;
        break;
        
      case 'development':
      default:
        if (forceRedis && redisUrl) {
          config.type = 'redis';
          config.redisUrl = redisUrl;
          console.log('Development environment with forced Redis enabled');
        } else {
          config.type = 'memory';
          console.log('Development environment using in-memory cache');
        }
        break;
    }

    // Override with environment variables if provided
    if (process.env.CACHE_TTL) {
      config.ttl = parseInt(process.env.CACHE_TTL) * 1000;
    }
    
    if (process.env.CACHE_MAX_ITEMS) {
      config.maxMemoryItems = parseInt(process.env.CACHE_MAX_ITEMS);
    }

    if (process.env.CACHE_DISABLED === 'true') {
      config.enabled = false;
      console.log('Caching disabled by environment variable');
    }

    return config;
  }

  /**
   * Check if Redis should be used
   */
  static shouldUseRedis(): boolean {
    const config = this.getCacheConfig();
    return config.type === 'redis' || config.type === 'hybrid';
  }

  /**
   * Check if memory cache should be used
   */
  static shouldUseMemoryCache(): boolean {
    const config = this.getCacheConfig();
    return config.type === 'memory' || config.type === 'hybrid';
  }

  /**
   * Get cache type description for logging
   */
  static getCacheDescription(): string {
    const config = this.getCacheConfig();
    
    if (!config.enabled) {
      return 'Caching disabled';
    }

    switch (config.type) {
      case 'memory':
        return `In-memory cache (${config.maxMemoryItems} items, ${config.ttl / 1000}s TTL)`;
      case 'redis':
        return `Redis cache (${config.ttl / 1000}s TTL)`;
      case 'hybrid':
        return `Hybrid cache (Memory + Redis, ${config.ttl / 1000}s TTL)`;
      default:
        return 'Unknown cache type';
    }
  }

  /**
   * Validate cache configuration
   */
  static validateConfig(): { valid: boolean; errors: string[] } {
    const config = this.getCacheConfig();
    const errors: string[] = [];

    if (config.ttl <= 0) {
      errors.push('Cache TTL must be greater than 0');
    }

    if (config.maxMemoryItems <= 0) {
      errors.push('Max memory items must be greater than 0');
    }

    if ((config.type === 'redis' || config.type === 'hybrid') && !config.redisUrl) {
      errors.push('Redis URL is required for Redis cache type');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Log cache configuration on startup
   */
  static logConfiguration(): void {
    const config = this.getCacheConfig();
    const validation = this.validateConfig();
    
    console.log('Cache Configuration:');
    console.log(`  Strategy: ${this.getCacheDescription()}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    
    if (!validation.valid) {
      console.warn('Cache configuration warnings:');
      validation.errors.forEach(error => console.warn(`  - ${error}`));
    }
  }
}

/**
 * Environment-specific cache factory
 */
export class CacheFactory {
  /**
   * Create cache instance based on environment configuration
   */
  static createCache() {
    const config = CacheConfigManager.getCacheConfig();
    
    if (!config.enabled) {
      return new NoOpCache();
    }

    switch (config.type) {
      case 'memory':
        return new MemoryOnlyCache(config);
      case 'redis':
        return new RedisOnlyCache(config);
      case 'hybrid':
        return new HybridCache(config);
      default:
        console.warn(`Unknown cache type: ${config.type}, falling back to memory cache`);
        return new MemoryOnlyCache(config);
    }
  }
}

/**
 * No-op cache for when caching is disabled
 */
class NoOpCache {
  async get(): Promise<null> { return null; }
  async set(): Promise<void> { }
  async delete(): Promise<void> { }
  async clear(): Promise<void> { }
  async invalidateUser(): Promise<void> { }
  async invalidateResource(): Promise<void> { }
  getStats() { return { size: 0, ttl: 0, distributed: false }; }
}

/**
 * Memory-only cache implementation
 */
class MemoryOnlyCache {
  private cache = new Map<string, any>();
  private ttl: number;

  constructor(config: CacheStrategy) {
    this.ttl = config.ttl;
  }

  async get(key: string): Promise<any> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  async set(key: string, value: any): Promise<void> {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttl
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async invalidateUser(userId: string): Promise<void> {
    for (const [key] of this.cache.entries()) {
      if (key.includes(userId)) {
        this.cache.delete(key);
      }
    }
  }

  async invalidateResource(resource: string): Promise<void> {
    for (const [key] of this.cache.entries()) {
      if (key.includes(resource)) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      ttl: this.ttl,
      distributed: false
    };
  }
}

/**
 * Redis-only cache implementation
 */
class RedisOnlyCache {
  private redisClient: any = null;
  private ttl: number;

  constructor(config: CacheStrategy) {
    this.ttl = config.ttl;
    if (config.redisUrl) {
      this.initializeRedis(config.redisUrl);
    }
  }

  private async initializeRedis(redisUrl: string): Promise<void> {
    try {
      const redis = await import('redis').catch(() => null);
      if (!redis) {
        throw new Error('Redis package not available');
      }
      
      this.redisClient = redis.createClient({ url: redisUrl });
      await this.redisClient.connect();
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.redisClient = null;
    }
  }

  async get(key: string): Promise<any> {
    if (!this.redisClient) return null;
    
    try {
      const value = await this.redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn('Redis get error:', error);
      return null;
    }
  }

  async set(key: string, value: any): Promise<void> {
    if (!this.redisClient) return;
    
    try {
      await this.redisClient.setEx(key, Math.floor(this.ttl / 1000), JSON.stringify(value));
    } catch (error) {
      console.warn('Redis set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.redisClient) return;
    
    try {
      await this.redisClient.del(key);
    } catch (error) {
      console.warn('Redis delete error:', error);
    }
  }

  async clear(): Promise<void> {
    if (!this.redisClient) return;
    
    try {
      await this.redisClient.flushDb();
    } catch (error) {
      console.warn('Redis clear error:', error);
    }
  }

  async invalidateUser(userId: string): Promise<void> {
    if (!this.redisClient) return;
    
    try {
      const keys = await this.redisClient.keys(`*${userId}*`);
      if (keys.length > 0) {
        await this.redisClient.del(keys);
      }
    } catch (error) {
      console.warn('Redis invalidateUser error:', error);
    }
  }

  async invalidateResource(resource: string): Promise<void> {
    if (!this.redisClient) return;
    
    try {
      const keys = await this.redisClient.keys(`*${resource}*`);
      if (keys.length > 0) {
        await this.redisClient.del(keys);
      }
    } catch (error) {
      console.warn('Redis invalidateResource error:', error);
    }
  }

  getStats() {
    return {
      size: 0, // Redis doesn't easily provide size
      ttl: this.ttl,
      distributed: true
    };
  }
}

/**
 * Hybrid cache implementation (Memory + Redis)
 */
class HybridCache {
  private memoryCache: MemoryOnlyCache;
  private redisCache: RedisOnlyCache;

  constructor(config: CacheStrategy) {
    this.memoryCache = new MemoryOnlyCache(config);
    this.redisCache = new RedisOnlyCache(config);
  }

  async get(key: string): Promise<any> {
    // Try memory first
    const memoryValue = await this.memoryCache.get(key);
    if (memoryValue !== null) {
      return memoryValue;
    }

    // Try Redis
    const redisValue = await this.redisCache.get(key);
    if (redisValue !== null) {
      // Store in memory for faster access
      await this.memoryCache.set(key, redisValue);
      return redisValue;
    }

    return null;
  }

  async set(key: string, value: any): Promise<void> {
    // Set in both caches
    await Promise.all([
      this.memoryCache.set(key, value),
      this.redisCache.set(key, value)
    ]);
  }

  async delete(key: string): Promise<void> {
    await Promise.all([
      this.memoryCache.delete(key),
      this.redisCache.delete(key)
    ]);
  }

  async clear(): Promise<void> {
    await Promise.all([
      this.memoryCache.clear(),
      this.redisCache.clear()
    ]);
  }

  async invalidateUser(userId: string): Promise<void> {
    await Promise.all([
      this.memoryCache.invalidateUser(userId),
      this.redisCache.invalidateUser(userId)
    ]);
  }

  async invalidateResource(resource: string): Promise<void> {
    await Promise.all([
      this.memoryCache.invalidateResource(resource),
      this.redisCache.invalidateResource(resource)
    ]);
  }

  getStats() {
    const memoryStats = this.memoryCache.getStats();
    const redisStats = this.redisCache.getStats();
    
    return {
      size: memoryStats.size,
      ttl: memoryStats.ttl,
      distributed: true
    };
  }
}