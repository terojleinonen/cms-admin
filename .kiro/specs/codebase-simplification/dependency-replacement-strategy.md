# Dependency Replacement Strategy

## Overview

This document outlines the specific strategies for replacing or simplifying each identified dependency, including implementation approaches, fallback options, and migration paths.

## UI Component Replacements

### 1. @headlessui/react → Custom Tailwind Components

#### Current Usage Analysis
```typescript
// Current imports across codebase:
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { Switch } from '@headlessui/react'
import { Combobox } from '@headlessui/react'
```

#### Replacement Implementation

**Modal/Dialog Component**
```typescript
// New: app/components/ui/Dialog.tsx
interface DialogProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Dialog({ isOpen, onClose, title, children, size = 'md' }: DialogProps) {
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        <div className={`relative bg-white rounded-lg shadow-xl ${sizeClasses[size]}`}>
          {title && (
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium">{title}</h3>
            </div>
          )}
          <div className="px-6 py-4">{children}</div>
        </div>
      </div>
    </div>
  )
}
```

**Menu/Dropdown Component**
```typescript
// New: app/components/ui/Menu.tsx
interface MenuProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'left' | 'right'
}

export function Menu({ trigger, children, align = 'right' }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <div className="relative">
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className={`absolute z-20 mt-2 w-48 bg-white rounded-md shadow-lg ${alignClasses[align]}`}>
            <div className="py-1">{children}</div>
          </div>
        </>
      )}
    </div>
  )
}
```

**Switch Component**
```typescript
// New: app/components/ui/Switch.tsx
interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <label className="flex items-center cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div className={`w-10 h-6 rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-300'
        } ${disabled ? 'opacity-50' : ''}`}>
          <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          } mt-1 ml-1`} />
        </div>
      </div>
      {label && <span className="ml-3 text-sm font-medium text-gray-700">{label}</span>}
    </label>
  )
}
```

#### Migration Steps
1. Create new components in `app/components/ui/`
2. Update imports file by file
3. Test each component replacement
4. Remove @headlessui/react dependency

#### Fallback Option
If custom components prove insufficient:
- Keep @headlessui/react but reduce usage to essential components only
- Remove unused imports and optimize bundle

### 2. @heroicons/react → Consolidated Icon System

#### Current Usage Analysis
Most frequently used icons:
- ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon
- XMarkIcon, PlusIcon, TrashIcon, PencilIcon
- MagnifyingGlassIcon, EyeIcon, EyeSlashIcon
- CheckIcon, ExclamationTriangleIcon
- UserIcon, Cog6ToothIcon, HomeIcon

#### Replacement Implementation

**Consolidated Icon Component**
```typescript
// New: app/components/ui/Icon.tsx
const iconPaths = {
  'chevron-down': 'M19.5 8.25l-7.5 7.5-7.5-7.5',
  'chevron-left': 'm15.75 19.5-7.5-7.5 7.5-7.5',
  'chevron-right': 'm8.25 4.5 7.5 7.5-7.5 7.5',
  'x-mark': 'M6 18L18 6M6 6l12 12',
  'plus': 'M12 4.5v15m7.5-7.5h-15',
  'trash': 'm14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0',
  // ... add other essential icons
}

interface IconProps {
  name: keyof typeof iconPaths
  className?: string
  size?: number
}

export function Icon({ name, className = '', size = 24 }: IconProps) {
  const path = iconPaths[name]
  if (!path) {
    console.warn(`Icon "${name}" not found`)
    return null
  }
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  )
}
```

#### Migration Steps
1. Identify all unique icons used (audit complete)
2. Create consolidated Icon component with essential icons
3. Replace imports gradually
4. Remove @heroicons/react dependency

## Search System Replacement

### minisearch → PostgreSQL Full-Text Search

#### Current Implementation Analysis
The current search system uses minisearch for:
- In-memory indexing of products, pages, and media
- Faceted search with filters
- Search analytics and suggestions
- Highlighting and scoring

#### PostgreSQL Implementation

**Database Schema Updates**
```sql
-- Add full-text search columns
ALTER TABLE products ADD COLUMN search_vector tsvector;
ALTER TABLE pages ADD COLUMN search_vector tsvector;

-- Create indexes
CREATE INDEX products_search_idx ON products USING GIN(search_vector);
CREATE INDEX pages_search_idx ON pages USING GIN(search_vector);

-- Create update triggers
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.sku, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_search_vector_update
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();
```

**New Search Implementation**
```typescript
// Updated: app/lib/search.ts
export async function searchProducts(
  query: string,
  options: SearchOptions = {}
): Promise<{ products: Product[], total: number, facets: SearchFacets }> {
  const { limit = 20, offset = 0, filters = {} } = options
  
  // Build search query
  const searchQuery = query
    .split(' ')
    .map(term => `${term}:*`)
    .join(' & ')
  
  const whereConditions: Prisma.ProductWhereInput[] = []
  
  // Add full-text search
  if (query.trim()) {
    whereConditions.push({
      OR: [
        { search_vector: { search: searchQuery } },
        { name: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } }
      ]
    })
  }
  
  // Add filters
  if (filters.category?.length) {
    whereConditions.push({
      categories: { some: { category: { name: { in: filters.category } } } }
    })
  }
  
  // Execute search with ranking
  const products = await prisma.$queryRaw`
    SELECT p.*, 
           ts_rank(p.search_vector, to_tsquery('english', ${searchQuery})) as rank
    FROM products p
    WHERE ${whereConditions.length > 0 ? Prisma.sql`${whereConditions}` : Prisma.sql`TRUE`}
    ORDER BY rank DESC, p.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `
  
  // Get total count and facets
  const [total, facets] = await Promise.all([
    prisma.product.count({ where: { AND: whereConditions } }),
    calculateSearchFacets(whereConditions)
  ])
  
  return { products, total, facets }
}
```

#### Migration Steps
1. Add search_vector columns to relevant tables
2. Create update triggers for automatic indexing
3. Implement new search functions
4. Update search API endpoints
5. Remove minisearch dependency

#### Fallback Option
If PostgreSQL search proves insufficient:
- Keep minisearch but simplify implementation
- Remove analytics and complex features
- Use basic indexing only

## Authentication Simplification

### otplib + qrcode → Backup Codes Only

#### Current Implementation
- QR code generation for TOTP setup
- Backup codes system (already implemented)
- Only required for ADMIN users

#### Simplified Implementation

**Updated 2FA Setup**
```typescript
// Updated: app/lib/two-factor-auth.ts
export async function generateTwoFactorSetup(userId: string, email: string) {
  // Generate secret but don't create QR code
  const secret = authenticator.generateSecret();
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret },
  });
  
  // Generate backup codes
  const backupCodes = await regenerateBackupCodes(userId);
  
  // Return manual setup instructions
  const manualEntryKey = secret.match(/.{1,4}/g)?.join(' ') || secret;
  const issuer = 'Kin Workspace CMS';
  
  return { 
    secret, 
    manualEntryKey,
    issuer,
    accountName: email,
    backupCodes,
    setupInstructions: [
      '1. Open your authenticator app (Google Authenticator, Authy, etc.)',
      '2. Select "Add account" or "+"',
      '3. Choose "Enter a setup key" or "Manual entry"',
      `4. Enter account name: ${email}`,
      `5. Enter key: ${manualEntryKey}`,
      `6. Save the backup codes in a secure location`
    ]
  };
}
```

**Updated UI Component**
```typescript
// Updated: app/components/users/SecuritySettings.tsx
// Remove QR code display, show manual setup instructions instead
function TwoFactorSetup({ setupData }: { setupData: TwoFactorSetupData }) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900">Manual Setup Instructions</h4>
        <ol className="mt-2 text-sm text-blue-800 space-y-1">
          {setupData.setupInstructions.map((instruction, index) => (
            <li key={index}>{instruction}</li>
          ))}
        </ol>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900">Setup Key</h4>
        <code className="mt-1 block text-sm font-mono bg-white p-2 rounded border">
          {setupData.manualEntryKey}
        </code>
        <button 
          onClick={() => navigator.clipboard.writeText(setupData.secret)}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
        >
          Copy key to clipboard
        </button>
      </div>
      
      <BackupCodesDisplay codes={setupData.backupCodes} />
    </div>
  )
}
```

#### Migration Steps
1. Update 2FA setup function to remove QR code generation
2. Update UI to show manual setup instructions
3. Test 2FA functionality with manual setup
4. Remove otplib and qrcode dependencies

## Testing Infrastructure Simplification

### jest-mock-extended → Native Jest Mocking

#### Current Usage Analysis
- Used for deep mocking of Prisma client
- `mockDeep` and `mockReset` functions
- Used in ~10 test files

#### Native Jest Implementation

**Prisma Mock Factory**
```typescript
// New: __tests__/helpers/prisma-mock.ts
export function createPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    // ... other models
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  }
}

export function resetPrismaMock(mock: ReturnType<typeof createPrismaMock>) {
  Object.values(mock).forEach(model => {
    if (typeof model === 'object' && model !== null) {
      Object.values(model).forEach(method => {
        if (jest.isMockFunction(method)) {
          method.mockReset()
        }
      })
    } else if (jest.isMockFunction(model)) {
      model.mockReset()
    }
  })
}
```

**Updated Test Helper**
```typescript
// Updated: __tests__/helpers/test-helpers.ts
import { createPrismaMock, resetPrismaMock } from './prisma-mock'

export const prismaMock = createPrismaMock()

export function resetAllMocks() {
  resetPrismaMock(prismaMock)
  jest.clearAllMocks()
}

// Mock Prisma client
jest.mock('@/lib/db', () => ({
  prisma: prismaMock
}))
```

#### Migration Steps
1. Create native mock factories
2. Update test files to use new mocking approach
3. Remove jest-mock-extended imports
4. Remove jest-mock-extended dependency

## Caching Strategy Optimization

### Redis → Optional with In-Memory Fallback

#### Current Implementation
Already has fallback mechanism in place in `app/lib/permissions.ts`

#### Optimization Strategy

**Environment-Based Configuration**
```typescript
// Updated: app/lib/cache.ts
interface CacheConfig {
  provider: 'memory' | 'redis'
  redis?: {
    url: string
    maxRetries: number
    retryDelay: number
  }
  memory?: {
    maxSize: number
    ttl: number
  }
}

export class CacheService {
  private provider: 'memory' | 'redis'
  private memoryCache = new Map<string, { value: any; expires: number }>()
  private redisClient: any = null
  
  constructor(config: CacheConfig) {
    this.provider = config.provider
    
    if (config.provider === 'redis' && config.redis) {
      this.initializeRedis(config.redis)
    }
  }
  
  async get<T>(key: string): Promise<T | null> {
    if (this.provider === 'redis' && this.redisClient) {
      try {
        const value = await this.redisClient.get(key)
        return value ? JSON.parse(value) : null
      } catch (error) {
        console.warn('Redis get error, falling back to memory:', error)
        return this.getFromMemory(key)
      }
    }
    
    return this.getFromMemory(key)
  }
  
  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    if (this.provider === 'redis' && this.redisClient) {
      try {
        await this.redisClient.setEx(key, ttl, JSON.stringify(value))
        return
      } catch (error) {
        console.warn('Redis set error, falling back to memory:', error)
      }
    }
    
    this.setInMemory(key, value, ttl)
  }
  
  private getFromMemory<T>(key: string): T | null {
    const item = this.memoryCache.get(key)
    if (!item) return null
    
    if (Date.now() > item.expires) {
      this.memoryCache.delete(key)
      return null
    }
    
    return item.value
  }
  
  private setInMemory<T>(key: string, value: T, ttl: number): void {
    this.memoryCache.set(key, {
      value,
      expires: Date.now() + (ttl * 1000)
    })
  }
}

// Environment-based factory
export function createCacheService(): CacheService {
  const redisUrl = process.env.REDIS_URL
  
  if (redisUrl && process.env.NODE_ENV === 'production') {
    return new CacheService({
      provider: 'redis',
      redis: { url: redisUrl, maxRetries: 3, retryDelay: 1000 }
    })
  }
  
  return new CacheService({
    provider: 'memory',
    memory: { maxSize: 1000, ttl: 3600 }
  })
}
```

#### Configuration Updates
```bash
# .env.development (Redis optional)
# REDIS_URL=redis://localhost:6379  # Commented out by default

# .env.production (Redis recommended)
REDIS_URL=redis://localhost:6379
```

## Implementation Timeline

### Week 1: UI Dependencies
- **Day 1**: Create custom Dialog/Modal components
- **Day 2**: Create custom Menu/Dropdown components  
- **Day 3**: Create custom Switch/Form components
- **Day 4**: Create consolidated Icon component
- **Day 5**: Test and validate UI replacements

### Week 2: Core Features
- **Day 1-2**: Implement PostgreSQL full-text search
- **Day 3**: Update search API endpoints and remove minisearch
- **Day 4**: Simplify 2FA implementation (remove QR codes)
- **Day 5**: Test and validate feature changes

### Week 3: Testing & Infrastructure
- **Day 1-2**: Replace jest-mock-extended with native mocking
- **Day 3**: Optimize caching configuration
- **Day 4**: Update documentation and migration guides
- **Day 5**: Final testing and validation

## Success Criteria

### Technical Metrics
- [ ] Reduce production dependencies by 8-13 packages
- [ ] Reduce bundle size by 200KB+
- [ ] Maintain all existing functionality
- [ ] Pass all existing tests
- [ ] No performance regressions

### Quality Metrics
- [ ] All components render correctly
- [ ] Search functionality works as expected
- [ ] 2FA setup process is user-friendly
- [ ] Tests run successfully with new mocking approach
- [ ] Documentation is updated

## Risk Mitigation

### Rollback Plan
Each replacement can be rolled back independently:
1. Keep old dependencies in package.json until validation complete
2. Use feature flags for new implementations
3. Maintain parallel implementations during transition
4. Have automated tests to catch regressions

### Validation Process
1. Unit tests for each new component/function
2. Integration tests for search functionality
3. Manual testing of UI components
4. Performance testing for search operations
5. User acceptance testing for 2FA changes

This strategy provides a comprehensive approach to dependency simplification while maintaining system reliability and functionality.