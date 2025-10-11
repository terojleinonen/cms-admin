import { NextRequest } from 'next/server';

interface RateLimitConfig {
  limit: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (request: NextRequest) => string;
}

interface RateLimitEntry {
  count: number;
  expiry: number;
  violations: number;
  lastViolation?: number;
}

export const rateLimitConfigs = {
  // General public endpoints
  public: {
    limit: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  
  // Authentication endpoints (more restrictive)
  auth: {
    limit: 100, // Increased for testing
    windowMs: 15 * 60 * 1000, // 15 minutes
    skipSuccessfulRequests: true,
  },
  
  // Admin and sensitive operations
  sensitive: {
    limit: 10,
    windowMs: 5 * 60 * 1000, // 5 minutes
  },
  
  // File upload endpoints
  upload: {
    limit: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  
  // Search endpoints
  search: {
    limit: 50,
    windowMs: 10 * 60 * 1000, // 10 minutes
  },
  
  // API key endpoints (very restrictive)
  apiKey: {
    limit: 1000,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyGenerator: (request: NextRequest) => {
      const apiKey = request.headers.get('x-api-key');
      return apiKey || getClientIP(request);
    }
  },
  
  // Bulk operations
  bulk: {
    limit: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
};

const store = new Map<string, RateLimitEntry>();
const blockedIPs = new Set<string>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.expiry) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('x-real-ip') ||
         request.headers.get('cf-connecting-ip') ||
         '127.0.0.1';
}

export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
  violations?: number;
}> {
  const key = config.keyGenerator ? config.keyGenerator(request) : getClientIP(request);
  const now = Date.now();
  
  // Check if IP is blocked
  if (blockedIPs.has(key)) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: now + config.windowMs,
      retryAfter: Math.ceil(config.windowMs / 1000),
      violations: 999,
    };
  }

  let entry = store.get(key);

  // Create new entry if doesn't exist or expired
  if (!entry || now >= entry.expiry) {
    entry = {
      count: 0,
      expiry: now + config.windowMs,
      violations: entry?.violations || 0,
      lastViolation: entry?.lastViolation,
    };
    store.set(key, entry);
  }

  // Check if limit exceeded
  if (entry.count >= config.limit) {
    entry.violations++;
    entry.lastViolation = now;
    
    // Auto-block after too many violations
    if (entry.violations >= 5) {
      blockedIPs.add(key);
      console.warn(`IP ${key} auto-blocked due to repeated rate limit violations`);
    }

    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: entry.expiry,
      retryAfter: Math.ceil((entry.expiry - now) / 1000),
      violations: entry.violations,
    };
  }

  // Increment counter
  entry.count++;

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    reset: entry.expiry,
    violations: entry.violations,
  };
}

export function createRateLimitHeaders(result: {
  limit: number;
  remaining: number;
  reset: number;
  violations?: number;
}) {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.reset / 1000).toString(),
  };

  if (result.violations !== undefined && result.violations > 0) {
    headers['X-RateLimit-Violations'] = result.violations.toString();
  }

  return headers;
}

// Advanced rate limiting with different strategies
export class AdvancedRateLimit {
  private static slidingWindowStore = new Map<string, number[]>();
  private static tokenBucketStore = new Map<string, { tokens: number; lastRefill: number }>();

  /**
   * Sliding window rate limiting
   */
  static async slidingWindow(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<{ success: boolean; remaining: number }> {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    let timestamps = this.slidingWindowStore.get(key) || [];
    
    // Remove old timestamps
    timestamps = timestamps.filter(timestamp => timestamp > windowStart);
    
    if (timestamps.length >= limit) {
      this.slidingWindowStore.set(key, timestamps);
      return { success: false, remaining: 0 };
    }
    
    timestamps.push(now);
    this.slidingWindowStore.set(key, timestamps);
    
    return { success: true, remaining: limit - timestamps.length };
  }

  /**
   * Token bucket rate limiting
   */
  static async tokenBucket(
    key: string,
    capacity: number,
    refillRate: number, // tokens per second
    tokensRequested: number = 1
  ): Promise<{ success: boolean; tokens: number }> {
    const now = Date.now();
    let bucket = this.tokenBucketStore.get(key) || { tokens: capacity, lastRefill: now };
    
    // Calculate tokens to add based on time elapsed
    const timePassed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = Math.floor(timePassed * refillRate);
    
    bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
    
    if (bucket.tokens >= tokensRequested) {
      bucket.tokens -= tokensRequested;
      this.tokenBucketStore.set(key, bucket);
      return { success: true, tokens: bucket.tokens };
    }
    
    this.tokenBucketStore.set(key, bucket);
    return { success: false, tokens: bucket.tokens };
  }
}

// Rate limit by endpoint type
export function getRateLimitConfig(pathname: string, method: string): RateLimitConfig {
  // Authentication endpoints
  if (pathname.startsWith('/api/auth/')) {
    return rateLimitConfigs.auth;
  }
  
  // Preferences endpoints (more lenient for user experience)
  if (pathname.includes('/preferences')) {
    return {
      limit: 200,
      windowMs: 15 * 60 * 1000, // 15 minutes
    };
  }
  
  // Admin endpoints
  if (pathname.startsWith('/api/admin/')) {
    return rateLimitConfigs.sensitive;
  }
  
  // File upload endpoints
  if (pathname.includes('/upload') || pathname.includes('/media')) {
    return rateLimitConfigs.upload;
  }
  
  // Search endpoints
  if (pathname.includes('/search')) {
    return rateLimitConfigs.search;
  }
  
  // Bulk operations
  if (pathname.includes('/bulk') || method === 'DELETE') {
    return rateLimitConfigs.bulk;
  }
  
  // API key authenticated requests
  if (pathname.startsWith('/api/') && pathname.includes('/api-key')) {
    return rateLimitConfigs.apiKey;
  }
  
  // Default to public
  return rateLimitConfigs.public;
}

// Unblock IP (for admin use)
export function unblockIP(ip: string): boolean {
  return blockedIPs.delete(ip);
}

// Get blocked IPs (for admin monitoring)
export function getBlockedIPs(): string[] {
  return Array.from(blockedIPs);
}

// Get rate limit stats
export function getRateLimitStats(): {
  totalEntries: number;
  blockedIPs: number;
  topOffenders: Array<{ ip: string; violations: number; lastViolation?: number }>;
} {
  const topOffenders = Array.from(store.entries())
    .filter(([, entry]) => entry.violations > 0)
    .sort(([, a], [, b]) => b.violations - a.violations)
    .slice(0, 10)
    .map(([ip, entry]) => ({
      ip,
      violations: entry.violations,
      lastViolation: entry.lastViolation,
    }));

  return {
    totalEntries: store.size,
    blockedIPs: blockedIPs.size,
    topOffenders,
  };
}
