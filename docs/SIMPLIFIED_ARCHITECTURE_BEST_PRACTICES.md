# Simplified Architecture Best Practices

This document outlines best practices for working with the simplified CMS architecture.

## Core Principles

### 1. Simplicity Over Complexity
- Choose simple, direct solutions over complex abstractions
- Prefer native implementations over external dependencies
- Keep components focused and single-purpose
- Avoid over-engineering for hypothetical future needs

### 2. Maintainability First
- Write code that is easy to understand and modify
- Use clear, descriptive naming conventions
- Keep functions and components small and focused
- Document complex business logic

### 3. Performance Through Simplicity
- Leverage native browser and database features
- Minimize bundle size through careful dependency management
- Use efficient data structures and algorithms
- Cache strategically, not universally

## Component Development

### Custom UI Components
Use the simplified UI component system:

```typescript
// ✅ Good - Use custom components
import { Modal, Button, Icon } from '@/components/ui'

export function ProductModal({ product, isOpen, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Product">
      <ProductForm product={product} />
      <div className="flex justify-end space-x-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit">
          <Icon name="check" className="mr-2" />
          Save
        </Button>
      </div>
    </Modal>
  )
}

// ❌ Avoid - Don't add unnecessary complexity
export function OverEngineeredModal({ 
  product, 
  isOpen, 
  onClose, 
  theme, 
  animation, 
  backdrop, 
  position,
  // ... 20 more props
}) {
  // Complex configuration logic
  // Multiple abstraction layers
  // Unnecessary flexibility
}
```

### Icon Usage
Use the consolidated icon system:

```typescript
// ✅ Good - Use consolidated icons
import Icon from '@/components/ui/Icon'

<Icon name="magnifying-glass" size="md" />
<Icon name="plus" className="text-blue-500" />

// ✅ Good - Backward compatibility for common icons
import { MagnifyingGlassIcon, PlusIcon } from '@/components/ui/Icon'

// ❌ Avoid - Don't import individual icon libraries
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
```

## Permission Management

### Simple Role-Based Access
Use straightforward role checks:

```typescript
// ✅ Good - Simple role-based permissions
export function hasPermission(userRole: UserRole, permission: string): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || []
  return rolePermissions.includes('*') || rolePermissions.includes(permission)
}

// Usage in components
export function ProductActions({ user, product }) {
  const canEdit = hasPermission(user.role, 'products:write')
  const canDelete = user.role === 'ADMIN'
  
  return (
    <div>
      {canEdit && <EditButton product={product} />}
      {canDelete && <DeleteButton product={product} />}
    </div>
  )
}

// ❌ Avoid - Complex permission hierarchies
export function hasComplexPermission(
  user: User, 
  resource: string, 
  action: string, 
  scope?: string,
  context?: PermissionContext,
  metadata?: PermissionMetadata
): Promise<boolean> {
  // Complex permission resolution logic
  // Multiple database queries
  // Caching layers
  // Performance monitoring
}
```

## Database Patterns

### Direct Database Access
Leverage PostgreSQL features directly:

```typescript
// ✅ Good - Use PostgreSQL full-text search
export async function searchProducts(query: string) {
  return await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        // Use PostgreSQL text search for complex queries
        { searchVector: { search: query } }
      ]
    },
    orderBy: { createdAt: 'desc' }
  })
}

// ❌ Avoid - Complex search abstractions
export class SearchService {
  private indexer: SearchIndexer
  private analyzer: SearchAnalyzer
  private cache: SearchCache
  
  async search(query: SearchQuery): Promise<SearchResult> {
    // Complex search pipeline
    // Multiple abstraction layers
    // Heavy caching logic
  }
}
```

### Simplified Audit Logging
Keep audit logs focused on essential security events:

```typescript
// ✅ Good - Simple audit logging
export async function logSecurityEvent(
  userId: string,
  action: string,
  details: string
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      details,
      timestamp: new Date(),
      ipAddress: getClientIP(),
    }
  })
}

// ❌ Avoid - Over-engineered audit systems
export class ComprehensiveAuditService {
  async logEvent(event: AuditEvent) {
    // Complex event categorization
    // Multiple storage backends
    // Real-time alerting
    // Performance metrics
    // Compliance reporting
  }
}
```

## Testing Strategy

### Focused Test Coverage
Write tests that matter:

```typescript
// ✅ Good - Test core business logic
describe('ProductService', () => {
  const mockPrisma = {
    product: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  }
  
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  it('should create product with valid data', async () => {
    const productData = { name: 'Test Product', price: 100 }
    mockPrisma.product.create.mockResolvedValue({ id: 1, ...productData })
    
    const result = await createProduct(productData)
    
    expect(result).toEqual({ id: 1, ...productData })
    expect(mockPrisma.product.create).toHaveBeenCalledWith({
      data: productData
    })
  })
  
  it('should validate required fields', async () => {
    await expect(createProduct({})).rejects.toThrow('Name is required')
  })
})

// ❌ Avoid - Over-testing edge cases
describe('ProductService - Exhaustive Edge Cases', () => {
  // 50+ test cases for every possible scenario
  // Complex mock setups
  // Testing implementation details
  // Redundant test coverage
})
```

### Integration Testing
Focus on API endpoints and critical workflows:

```typescript
// ✅ Good - Test API endpoints
describe('POST /api/products', () => {
  it('should create product with admin role', async () => {
    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Product', price: 100 })
      
    expect(response.status).toBe(201)
    expect(response.body.name).toBe('Test Product')
  })
  
  it('should reject unauthorized requests', async () => {
    const response = await request(app)
      .post('/api/products')
      .send({ name: 'Test Product', price: 100 })
      
    expect(response.status).toBe(401)
  })
})
```

## Performance Guidelines

### Bundle Size Optimization
Keep the bundle lean:

```typescript
// ✅ Good - Import only what you need
import { formatDate } from '@/lib/utils'
import Icon from '@/components/ui/Icon'

// ✅ Good - Use dynamic imports for large components
const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <div>Loading chart...</div>
})

// ❌ Avoid - Importing entire libraries
import * as utils from 'lodash'
import * as icons from '@heroicons/react/24/outline'
```

### Caching Strategy
Use caching judiciously:

```typescript
// ✅ Good - Simple in-memory caching for development
const cache = new Map<string, { value: any; expires: number }>()

export function getCachedData<T>(key: string): T | null {
  const item = cache.get(key)
  if (!item || Date.now() > item.expires) {
    cache.delete(key)
    return null
  }
  return item.value
}

// ✅ Good - Optional Redis for production
export function createCacheService() {
  if (process.env.REDIS_URL && process.env.NODE_ENV === 'production') {
    return new RedisCacheService()
  }
  return new MemoryCacheService()
}

// ❌ Avoid - Complex caching hierarchies
export class MultiLayerCacheService {
  private l1Cache: MemoryCache
  private l2Cache: RedisCache
  private l3Cache: DatabaseCache
  
  async get(key: string) {
    // Complex cache hierarchy logic
    // Cache warming strategies
    // Performance monitoring
  }
}
```

## Error Handling

### Simple Error Management
Keep error handling straightforward:

```typescript
// ✅ Good - Simple error classes
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
  }
}

// Usage
export async function createProduct(data: ProductData) {
  try {
    validateProductData(data)
    return await prisma.product.create({ data })
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new AppError(error.message, 400, 'VALIDATION_ERROR')
    }
    throw new AppError('Failed to create product', 500, 'CREATE_ERROR')
  }
}

// ❌ Avoid - Complex error hierarchies
export class DetailedErrorSystem {
  private errorCategories: ErrorCategory[]
  private errorHandlers: ErrorHandler[]
  private errorReporters: ErrorReporter[]
  
  async handleError(error: ComplexError) {
    // Complex error categorization
    // Multiple error handlers
    // Detailed error reporting
  }
}
```

## Code Organization

### File Structure
Keep files focused and well-organized:

```
app/
├── components/
│   ├── ui/              # Reusable UI components
│   ├── forms/           # Form-specific components
│   └── layout/          # Layout components
├── lib/
│   ├── utils.ts         # General utilities
│   ├── validation.ts    # Input validation
│   └── permissions.ts   # Permission utilities
└── types/
    └── index.ts         # Type definitions
```

### Import Organization
Structure imports clearly:

```typescript
// ✅ Good - Organized imports
// React and Next.js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// External libraries
import { z } from 'zod'

// Internal utilities
import { formatDate, validateInput } from '@/lib/utils'
import { hasPermission } from '@/lib/permissions'

// Components
import { Modal, Button, Icon } from '@/components/ui'
import ProductForm from '@/components/forms/ProductForm'

// Types
import type { Product, User } from '@/types'
```

## Documentation

### Code Documentation
Document complex business logic:

```typescript
// ✅ Good - Document business rules
/**
 * Calculates product pricing with applicable discounts
 * 
 * Business rules:
 * - Volume discounts apply for quantities > 10
 * - Member discounts are 10% for premium members
 * - Discounts are not cumulative
 */
export function calculatePrice(
  basePrice: number,
  quantity: number,
  memberType: MemberType
): number {
  let finalPrice = basePrice * quantity
  
  // Apply volume discount
  if (quantity > 10) {
    finalPrice *= 0.9 // 10% volume discount
  }
  
  // Apply member discount (not cumulative)
  if (memberType === 'PREMIUM' && quantity <= 10) {
    finalPrice *= 0.9 // 10% member discount
  }
  
  return finalPrice
}

// ❌ Avoid - Over-documenting obvious code
/**
 * Sets the user name
 * @param user - The user object
 * @param name - The name to set
 * @returns void
 */
export function setUserName(user: User, name: string): void {
  user.name = name
}
```

## Migration from Complex Systems

### Gradual Simplification
When migrating from complex systems:

1. **Identify Core Functionality**: Focus on what users actually need
2. **Remove Abstractions**: Replace complex abstractions with direct implementations
3. **Consolidate Similar Code**: Merge duplicate or similar functionality
4. **Simplify Data Models**: Remove unnecessary relationships and fields
5. **Update Tests**: Focus on essential test coverage

### Common Patterns to Avoid
- Over-abstracted service layers
- Complex permission hierarchies
- Excessive caching strategies
- Heavy dependency on external libraries
- Over-engineered error handling systems

## Conclusion

The simplified architecture prioritizes:
- **Developer Experience**: Easy to understand and modify
- **Maintainability**: Fewer dependencies and simpler code
- **Performance**: Lean bundle size and efficient operations
- **Reliability**: Direct implementations with fewer failure points

Remember: Simple doesn't mean basic. It means focused, efficient, and maintainable.