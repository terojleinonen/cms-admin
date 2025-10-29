# Dependency Replacement Fallback Options

## Overview

This document outlines fallback strategies for each dependency replacement in case the primary simplification approach encounters issues or proves insufficient for the application's needs.

## UI Component Fallbacks

### @headlessui/react Fallback Strategies

#### Fallback Option 1: Partial Replacement
**Scenario**: Custom components work for some use cases but not others
**Strategy**: 
- Keep @headlessui/react for complex components (Combobox, Listbox)
- Replace simple components (Dialog, Menu, Switch) with custom implementations
- Reduce bundle size by ~60% while maintaining complex functionality

**Implementation**:
```typescript
// Keep complex components
import { Combobox, Listbox } from '@headlessui/react'

// Use custom components for simple cases
import { Dialog, Menu, Switch } from '@/components/ui'
```

#### Fallback Option 2: Optimized Usage
**Scenario**: Custom components prove too time-consuming to implement
**Strategy**:
- Keep @headlessui/react but optimize imports
- Remove unused components and features
- Use tree-shaking to reduce bundle size

**Implementation**:
```typescript
// Before: Import everything
import { Dialog, Menu, Switch, Combobox, Listbox, ... } from '@headlessui/react'

// After: Import only what's needed
import { Dialog } from '@headlessui/react/dialog'
import { Menu } from '@headlessui/react/menu'
import { Switch } from '@headlessui/react/switch'
```

#### Fallback Option 3: Hybrid Approach
**Scenario**: Some custom components work well, others don't
**Strategy**:
- Use custom components where they work well (Dialog, Switch)
- Keep @headlessui/react for problematic components (Menu with complex positioning)
- Document which components use which approach

### @heroicons/react Fallback Strategies

#### Fallback Option 1: Selective Icon Consolidation
**Scenario**: Full consolidation is too complex
**Strategy**:
- Keep @heroicons/react but create a whitelist of allowed icons
- Remove unused icons through build-time analysis
- Create an icon mapping to prevent new icons from being added

**Implementation**:
```typescript
// Create allowed icons list
const ALLOWED_ICONS = [
  'ChevronDownIcon', 'XMarkIcon', 'PlusIcon', 'TrashIcon',
  'MagnifyingGlassIcon', 'UserIcon', 'Cog6ToothIcon'
] as const

// ESLint rule to enforce allowed icons
// .eslintrc.js
rules: {
  'no-restricted-imports': [
    'error',
    {
      paths: [{
        name: '@heroicons/react/24/outline',
        importNames: ['*'],
        message: 'Only allowed icons can be imported. Check ALLOWED_ICONS list.'
      }]
    }
  ]
}
```

#### Fallback Option 2: Icon Component Wrapper
**Scenario**: Direct replacement is complex but we want consistency
**Strategy**:
- Create wrapper component that uses @heroicons/react internally
- Provide consistent API while maintaining flexibility
- Allow gradual migration to custom icons

**Implementation**:
```typescript
// Wrapper component
import * as HeroIcons from '@heroicons/react/24/outline'

interface IconProps {
  name: keyof typeof HeroIcons
  className?: string
  size?: number
}

export function Icon({ name, className, size = 24 }: IconProps) {
  const IconComponent = HeroIcons[name]
  return <IconComponent className={className} width={size} height={size} />
}
```

## Search System Fallbacks

### minisearch Fallback Strategies

#### Fallback Option 1: Simplified minisearch Implementation
**Scenario**: PostgreSQL search doesn't meet performance requirements
**Strategy**:
- Keep minisearch but remove complex features
- Eliminate analytics, faceting, and advanced scoring
- Use basic search with simple indexing

**Implementation**:
```typescript
// Simplified search service
export class SimpleSearchService {
  private searchIndex: MiniSearch
  
  constructor() {
    this.searchIndex = new MiniSearch({
      fields: ['title', 'content'],
      storeFields: ['id', 'title', 'type', 'url'],
      searchOptions: {
        fuzzy: 0.2,
        prefix: true
      }
    })
  }
  
  search(query: string, limit: number = 20): SearchResult[] {
    return this.searchIndex.search(query, { limit })
      .map(result => ({
        id: result.id,
        title: result.title,
        type: result.type,
        url: result.url,
        score: result.score,
        excerpt: '' // Remove excerpt generation
      }))
  }
  
  // Remove: analytics, faceting, suggestions, highlighting
}
```

#### Fallback Option 2: Hybrid Search Approach
**Scenario**: PostgreSQL works for some content types but not others
**Strategy**:
- Use PostgreSQL for products and pages (structured data)
- Keep minisearch for media and complex content (unstructured data)
- Combine results at the API level

**Implementation**:
```typescript
export async function hybridSearch(query: string, options: SearchOptions) {
  const [dbResults, indexResults] = await Promise.all([
    searchDatabase(query, options), // PostgreSQL
    searchIndex(query, options)     // minisearch
  ])
  
  // Combine and rank results
  return combineSearchResults(dbResults, indexResults)
}
```

#### Fallback Option 3: Database + Simple Indexing
**Scenario**: Full-text search works but needs performance boost
**Strategy**:
- Use PostgreSQL for primary search
- Add simple in-memory cache for frequent queries
- Remove complex minisearch features but keep basic indexing

## Authentication Fallbacks

### 2FA Simplification Fallbacks

#### Fallback Option 1: Optional QR Code Generation
**Scenario**: Users strongly prefer QR codes for setup
**Strategy**:
- Make QR code generation optional (feature flag)
- Provide both manual entry and QR code options
- Remove qrcode dependency but add it back if needed

**Implementation**:
```typescript
export async function generateTwoFactorSetup(userId: string, email: string, includeQR: boolean = false) {
  const secret = authenticator.generateSecret();
  const backupCodes = await regenerateBackupCodes(userId);
  
  const result = {
    secret,
    backupCodes,
    manualEntryKey: secret.match(/.{1,4}/g)?.join(' ') || secret,
    setupInstructions: [/* manual instructions */]
  }
  
  if (includeQR) {
    // Dynamically import qrcode only when needed
    const qrcode = await import('qrcode')
    const otpauth = authenticator.keyuri(email, 'Kin Workspace CMS', secret)
    result.qrCodeDataUrl = await qrcode.toDataURL(otpauth)
  }
  
  return result
}
```

#### Fallback Option 2: External QR Code Service
**Scenario**: QR codes are needed but we don't want the dependency
**Strategy**:
- Use external QR code generation service
- Remove local qrcode dependency
- Fallback to manual entry if service is unavailable

**Implementation**:
```typescript
async function generateQRCodeUrl(otpauth: string): Promise<string | null> {
  try {
    // Use external service like qr-server.com
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`
    
    // Verify the service is available
    const response = await fetch(qrUrl, { method: 'HEAD' })
    return response.ok ? qrUrl : null
  } catch (error) {
    console.warn('QR code service unavailable:', error)
    return null
  }
}
```

#### Fallback Option 3: Keep Current Implementation
**Scenario**: 2FA changes are rejected by stakeholders
**Strategy**:
- Keep otplib and qrcode dependencies
- Focus on other simplification opportunities
- Document decision for future review

## Testing Infrastructure Fallbacks

### jest-mock-extended Fallback Strategies

#### Fallback Option 1: Gradual Migration
**Scenario**: Native mocking proves insufficient for complex cases
**Strategy**:
- Keep jest-mock-extended for complex mocking scenarios
- Use native Jest mocking for simple cases
- Gradually migrate as patterns are established

**Implementation**:
```typescript
// Complex mocking - keep jest-mock-extended
import { mockDeep } from 'jest-mock-extended'
const complexMock = mockDeep<ComplexService>()

// Simple mocking - use native Jest
const simpleMock = {
  method1: jest.fn(),
  method2: jest.fn()
}
```

#### Fallback Option 2: Custom Mock Utilities
**Scenario**: Native mocking works but needs helper utilities
**Strategy**:
- Create custom mock utilities that provide similar functionality
- Remove jest-mock-extended but maintain similar API
- Provide migration path for existing tests

**Implementation**:
```typescript
// Custom mock utilities
export function createMockObject<T>(obj: T): jest.Mocked<T> {
  const mock = {} as jest.Mocked<T>
  
  for (const key in obj) {
    if (typeof obj[key] === 'function') {
      mock[key] = jest.fn() as any
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      mock[key] = createMockObject(obj[key]) as any
    }
  }
  
  return mock
}

export function resetMockObject<T>(mock: jest.Mocked<T>): void {
  for (const key in mock) {
    if (jest.isMockFunction(mock[key])) {
      (mock[key] as jest.MockedFunction<any>).mockReset()
    } else if (typeof mock[key] === 'object' && mock[key] !== null) {
      resetMockObject(mock[key] as any)
    }
  }
}
```

## Caching Fallbacks

### Redis Fallback Strategies

#### Fallback Option 1: Enhanced In-Memory Caching
**Scenario**: Redis removal causes performance issues
**Strategy**:
- Implement more sophisticated in-memory caching
- Add LRU eviction and memory limits
- Use clustering for distributed in-memory cache

**Implementation**:
```typescript
class EnhancedMemoryCache {
  private cache = new Map<string, CacheItem>()
  private maxSize: number
  private accessOrder = new Map<string, number>()
  private accessCounter = 0
  
  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize
  }
  
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item || Date.now() > item.expires) {
      this.cache.delete(key)
      this.accessOrder.delete(key)
      return null
    }
    
    // Update access order for LRU
    this.accessOrder.set(key, ++this.accessCounter)
    return item.value
  }
  
  set<T>(key: string, value: T, ttl: number): void {
    // Evict oldest items if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }
    
    this.cache.set(key, {
      value,
      expires: Date.now() + (ttl * 1000)
    })
    this.accessOrder.set(key, ++this.accessCounter)
  }
  
  private evictLRU(): void {
    let oldestKey = ''
    let oldestAccess = Infinity
    
    for (const [key, access] of this.accessOrder) {
      if (access < oldestAccess) {
        oldestAccess = access
        oldestKey = key
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.accessOrder.delete(oldestKey)
    }
  }
}
```

#### Fallback Option 2: Selective Redis Usage
**Scenario**: Redis is needed for some features but not others
**Strategy**:
- Use Redis only for critical caching (sessions, permissions)
- Use in-memory cache for less critical data
- Make Redis optional for development, required for production

## Bundle Size Fallbacks

### If Bundle Size Reduction is Insufficient

#### Fallback Option 1: Code Splitting
**Scenario**: Dependency removal doesn't achieve target bundle size
**Strategy**:
- Implement more aggressive code splitting
- Lazy load admin components
- Split vendor bundles more granularly

**Implementation**:
```typescript
// Lazy load admin components
const AdminDashboard = lazy(() => import('@/components/admin/AdminDashboard'))
const UserManagement = lazy(() => import('@/components/admin/UserManagement'))

// Split vendor bundles
// next.config.js
module.exports = {
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        ui: {
          test: /[\\/]components[\\/]ui[\\/]/,
          name: 'ui',
          chunks: 'all',
        }
      }
    }
    return config
  }
}
```

#### Fallback Option 2: Tree Shaking Optimization
**Scenario**: Dependencies can't be removed but can be optimized
**Strategy**:
- Improve tree shaking configuration
- Use babel plugins to remove unused code
- Optimize import statements

## Performance Fallbacks

### If Performance Degrades

#### Fallback Option 1: Selective Optimization
**Scenario**: Some replacements cause performance issues
**Strategy**:
- Keep high-performance dependencies for critical paths
- Use replacements for non-critical functionality
- Profile and optimize bottlenecks

#### Fallback Option 2: Caching Strategy
**Scenario**: Replacements are slower but acceptable with caching
**Strategy**:
- Add caching layers to compensate for slower operations
- Use service workers for client-side caching
- Implement request deduplication

## Decision Matrix

### When to Use Fallback Options

| Scenario | Primary Strategy | Fallback Option | Decision Criteria |
|----------|------------------|-----------------|-------------------|
| UI Components fail | Custom components | Keep @headlessui/react | >2 days debugging |
| Icons too complex | Consolidated icons | Selective consolidation | >50 unique icons needed |
| PostgreSQL search slow | Database search | Hybrid approach | >500ms search time |
| 2FA users complain | Manual setup | Optional QR codes | >20% user complaints |
| Tests break | Native mocking | Keep jest-mock-extended | >1 day fixing tests |
| Performance degrades | In-memory cache | Enhanced caching | >50% performance loss |

## Implementation Guidelines

### Fallback Decision Process
1. **Attempt primary strategy** for 1-2 days
2. **Measure impact** on functionality, performance, and user experience
3. **Evaluate fallback options** based on decision criteria
4. **Implement fallback** if primary strategy fails criteria
5. **Document decision** and reasoning for future reference

### Rollback Procedures
1. **Keep old dependencies** in package.json until validation complete
2. **Use feature flags** to switch between implementations
3. **Maintain parallel code paths** during transition
4. **Have automated tests** to catch regressions quickly

### Success Metrics for Fallbacks
- Maintain 95% of original functionality
- No more than 10% performance degradation
- User satisfaction remains above 80%
- Development velocity not significantly impacted

This comprehensive fallback strategy ensures that the simplification project can adapt to challenges while still achieving meaningful improvements to the codebase.