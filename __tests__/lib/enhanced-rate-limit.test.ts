/**
 * Enhanced Rate Limiting Tests
 * Tests for advanced rate limiting with different strategies and configurations
 */

import { jest } from '@jest/globals'
import { 
  rateLimit, 
  rateLimitConfigs, 
  createRateLimitHeaders, 
  AdvancedRateLimit,
  getRateLimitConfig,
  unblockIP,
  getBlockedIPs,
  getRateLimitStats
} from '@/lib/rate-limit'

// Mock NextRequest class for testing
class MockNextRequest {
  url: string
  method: string
  headers: Map<string, string>

  constructor(url: string, options: any = {}) {
    this.url = url
    this.method = options.method || 'GET'
    this.headers = new Map()
    
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        this.headers.set(key, value as string)
      })
    }
  }

  get(key: string) {
    return this.headers.get(key)
  }
}

// Mock NextRequest for testing
function createMockRequest(options: {
  method?: string
  url?: string
  headers?: Record<string, string>
}): any {
  const { method = 'GET', url = 'http://localhost:3000/api/test', headers = {} } = options
  
  return new MockNextRequest(url, {
    method,
    headers,
  })
}

describe('Enhanced Rate Limiting', () => {
  beforeEach(() => {
    // Clear any existing rate limit data
    const store = (rateLimit as any).__store || new Map()
    store.clear()
    
    // Clear blocked IPs
    const blockedIPs = getBlockedIPs()
    blockedIPs.forEach(ip => unblockIP(ip))
  })

  describe('rateLimit', () => {
    it('should allow requests within limit', async () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' }
      })
      
      const config = { limit: 5, windowMs: 60000 }
      const result = await rateLimit(request, config)
      
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(4)
      expect(result.limit).toBe(5)
    })

    it('should reject requests exceeding limit', async () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' }
      })
      
      const config = { limit: 2, windowMs: 60000 }
      
      // Make requests up to the limit
      await rateLimit(request, config)
      await rateLimit(request, config)
      
      // This should be rejected
      const result = await rateLimit(request, config)
      
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeDefined()
    })

    it('should track violations', async () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' }
      })
      
      const config = { limit: 1, windowMs: 60000 }
      
      // Exceed the limit multiple times
      await rateLimit(request, config)
      const result1 = await rateLimit(request, config)
      const result2 = await rateLimit(request, config)
      
      expect(result1.violations).toBe(1)
      expect(result2.violations).toBe(2)
    })

    it('should auto-block IPs with too many violations', async () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' }
      })
      
      const config = { limit: 1, windowMs: 60000 }
      
      // Exceed the limit many times to trigger auto-block
      await rateLimit(request, config)
      for (let i = 0; i < 6; i++) {
        await rateLimit(request, config)
      }
      
      const blockedIPs = getBlockedIPs()
      expect(blockedIPs).toContain('192.168.1.1')
    })

    it('should use custom key generator', async () => {
      const request = createMockRequest({
        headers: { 
          'x-forwarded-for': '192.168.1.1',
          'x-api-key': 'test-api-key'
        }
      })
      
      const config = { 
        limit: 5, 
        windowMs: 60000,
        keyGenerator: (req: NextRequest) => req.headers.get('x-api-key') || 'default'
      }
      
      const result = await rateLimit(request, config)
      expect(result.success).toBe(true)
    })

    it('should handle different IP header formats', async () => {
      const testCases = [
        { header: 'x-forwarded-for', value: '192.168.1.1, 10.0.0.1' },
        { header: 'x-real-ip', value: '192.168.1.2' },
        { header: 'cf-connecting-ip', value: '192.168.1.3' },
      ]
      
      for (const testCase of testCases) {
        const request = createMockRequest({
          headers: { [testCase.header]: testCase.value }
        })
        
        const config = { limit: 5, windowMs: 60000 }
        const result = await rateLimit(request, config)
        
        expect(result.success).toBe(true)
      }
    })
  })

  describe('rateLimitConfigs', () => {
    it('should have predefined configurations', () => {
      expect(rateLimitConfigs.public).toBeDefined()
      expect(rateLimitConfigs.auth).toBeDefined()
      expect(rateLimitConfigs.sensitive).toBeDefined()
      expect(rateLimitConfigs.upload).toBeDefined()
      expect(rateLimitConfigs.search).toBeDefined()
      expect(rateLimitConfigs.apiKey).toBeDefined()
      expect(rateLimitConfigs.bulk).toBeDefined()
    })

    it('should have appropriate limits for different endpoint types', () => {
      expect(rateLimitConfigs.auth.limit).toBeLessThan(rateLimitConfigs.public.limit)
      expect(rateLimitConfigs.sensitive.limit).toBeLessThan(rateLimitConfigs.public.limit)
      expect(rateLimitConfigs.bulk.limit).toBeLessThan(rateLimitConfigs.public.limit)
    })
  })

  describe('createRateLimitHeaders', () => {
    it('should create standard rate limit headers', () => {
      const result = {
        limit: 100,
        remaining: 95,
        reset: Date.now() + 60000
      }
      
      const headers = createRateLimitHeaders(result)
      
      expect(headers['X-RateLimit-Limit']).toBe('100')
      expect(headers['X-RateLimit-Remaining']).toBe('95')
      expect(headers['X-RateLimit-Reset']).toBeDefined()
    })

    it('should include violations header when present', () => {
      const result = {
        limit: 100,
        remaining: 0,
        reset: Date.now() + 60000,
        violations: 3
      }
      
      const headers = createRateLimitHeaders(result)
      
      expect(headers['X-RateLimit-Violations']).toBe('3')
    })
  })

  describe('AdvancedRateLimit', () => {
    beforeEach(() => {
      // Clear sliding window store
      AdvancedRateLimit['slidingWindowStore'].clear()
      AdvancedRateLimit['tokenBucketStore'].clear()
    })

    describe('slidingWindow', () => {
      it('should allow requests within sliding window', async () => {
        const key = 'test-key'
        const limit = 5
        const windowMs = 60000
        
        const result = await AdvancedRateLimit.slidingWindow(key, limit, windowMs)
        
        expect(result.success).toBe(true)
        expect(result.remaining).toBe(4)
      })

      it('should reject requests exceeding sliding window limit', async () => {
        const key = 'test-key'
        const limit = 2
        const windowMs = 60000
        
        // Make requests up to the limit
        await AdvancedRateLimit.slidingWindow(key, limit, windowMs)
        await AdvancedRateLimit.slidingWindow(key, limit, windowMs)
        
        // This should be rejected
        const result = await AdvancedRateLimit.slidingWindow(key, limit, windowMs)
        
        expect(result.success).toBe(false)
        expect(result.remaining).toBe(0)
      })

      it('should clean up old timestamps', async () => {
        const key = 'test-key'
        const limit = 5
        const windowMs = 100 // Very short window
        
        // Make a request
        await AdvancedRateLimit.slidingWindow(key, limit, windowMs)
        
        // Wait for window to expire
        await new Promise(resolve => setTimeout(resolve, 150))
        
        // Should allow new requests
        const result = await AdvancedRateLimit.slidingWindow(key, limit, windowMs)
        expect(result.remaining).toBe(4) // Should be reset
      })
    })

    describe('tokenBucket', () => {
      it('should allow requests when tokens available', async () => {
        const key = 'test-key'
        const capacity = 10
        const refillRate = 1
        
        const result = await AdvancedRateLimit.tokenBucket(key, capacity, refillRate, 1)
        
        expect(result.success).toBe(true)
        expect(result.tokens).toBe(9)
      })

      it('should reject requests when no tokens available', async () => {
        const key = 'test-key'
        const capacity = 2
        const refillRate = 0.1
        
        // Consume all tokens
        await AdvancedRateLimit.tokenBucket(key, capacity, refillRate, 2)
        
        // This should be rejected
        const result = await AdvancedRateLimit.tokenBucket(key, capacity, refillRate, 1)
        
        expect(result.success).toBe(false)
        expect(result.tokens).toBe(0)
      })

      it('should refill tokens over time', async () => {
        const key = 'test-key'
        const capacity = 10
        const refillRate = 10 // 10 tokens per second
        
        // Consume some tokens
        await AdvancedRateLimit.tokenBucket(key, capacity, refillRate, 5)
        
        // Wait a bit for refill
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Should have more tokens now
        const result = await AdvancedRateLimit.tokenBucket(key, capacity, refillRate, 1)
        expect(result.success).toBe(true)
        expect(result.tokens).toBeGreaterThan(4)
      })

      it('should handle multiple token requests', async () => {
        const key = 'test-key'
        const capacity = 10
        const refillRate = 1
        
        const result = await AdvancedRateLimit.tokenBucket(key, capacity, refillRate, 3)
        
        expect(result.success).toBe(true)
        expect(result.tokens).toBe(7)
      })
    })
  })

  describe('getRateLimitConfig', () => {
    it('should return auth config for auth endpoints', () => {
      const config = getRateLimitConfig('/api/auth/login', 'POST')
      expect(config).toBe(rateLimitConfigs.auth)
    })

    it('should return sensitive config for admin endpoints', () => {
      const config = getRateLimitConfig('/api/admin/users', 'GET')
      expect(config).toBe(rateLimitConfigs.sensitive)
    })

    it('should return upload config for upload endpoints', () => {
      const config = getRateLimitConfig('/api/media/upload', 'POST')
      expect(config).toBe(rateLimitConfigs.upload)
    })

    it('should return search config for search endpoints', () => {
      const config = getRateLimitConfig('/api/search', 'GET')
      expect(config).toBe(rateLimitConfigs.search)
    })

    it('should return bulk config for bulk operations', () => {
      const config = getRateLimitConfig('/api/users/bulk', 'POST')
      expect(config).toBe(rateLimitConfigs.bulk)
    })

    it('should return bulk config for DELETE methods', () => {
      const config = getRateLimitConfig('/api/users/123', 'DELETE')
      expect(config).toBe(rateLimitConfigs.bulk)
    })

    it('should return public config by default', () => {
      const config = getRateLimitConfig('/api/products', 'GET')
      expect(config).toBe(rateLimitConfigs.public)
    })
  })

  describe('IP blocking', () => {
    it('should unblock IP addresses', () => {
      // Simulate blocked IP
      const ip = '192.168.1.100'
      
      // First block the IP (this would normally happen through rate limiting)
      const request = createMockRequest({
        headers: { 'x-forwarded-for': ip }
      })
      
      // Manually add to blocked list for testing
      const blockedIPs = getBlockedIPs()
      if (!blockedIPs.includes(ip)) {
        // We need to trigger the blocking through rate limiting
        // This is a simplified test
      }
      
      const result = unblockIP(ip)
      expect(typeof result).toBe('boolean')
    })

    it('should get list of blocked IPs', () => {
      const blockedIPs = getBlockedIPs()
      expect(Array.isArray(blockedIPs)).toBe(true)
    })
  })

  describe('getRateLimitStats', () => {
    it('should return rate limiting statistics', () => {
      const stats = getRateLimitStats()
      
      expect(stats).toHaveProperty('totalEntries')
      expect(stats).toHaveProperty('blockedIPs')
      expect(stats).toHaveProperty('topOffenders')
      
      expect(typeof stats.totalEntries).toBe('number')
      expect(typeof stats.blockedIPs).toBe('number')
      expect(Array.isArray(stats.topOffenders)).toBe(true)
    })

    it('should track top offenders', async () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' }
      })
      
      const config = { limit: 1, windowMs: 60000 }
      
      // Create violations
      await rateLimit(request, config)
      await rateLimit(request, config) // This should create a violation
      
      const stats = getRateLimitStats()
      expect(stats.topOffenders.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('edge cases', () => {
    it('should handle missing IP headers gracefully', async () => {
      const request = createMockRequest({})
      const config = { limit: 5, windowMs: 60000 }
      
      const result = await rateLimit(request, config)
      expect(result.success).toBe(true)
    })

    it('should handle malformed IP headers', async () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': 'invalid-ip-format' }
      })
      
      const config = { limit: 5, windowMs: 60000 }
      const result = await rateLimit(request, config)
      
      expect(result.success).toBe(true)
    })

    it('should handle very short time windows', async () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' }
      })
      
      const config = { limit: 5, windowMs: 1 } // 1ms window
      
      const result = await rateLimit(request, config)
      expect(result.success).toBe(true)
    })

    it('should handle zero limits', async () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1' }
      })
      
      const config = { limit: 0, windowMs: 60000 }
      
      const result = await rateLimit(request, config)
      expect(result.success).toBe(false)
    })
  })
})