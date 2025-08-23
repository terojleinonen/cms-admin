# Kin Workspace CMS - Developer Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Development Setup](#development-setup)
3. [Database Schema](#database-schema)
4. [API Documentation](#api-documentation)
5. [Component Architecture](#component-architecture)
6. [Authentication & Authorization](#authentication--authorization)
7. [File Upload & Media Processing](#file-upload--media-processing)
8. [Testing Strategy](#testing-strategy)
9. [Performance Optimization](#performance-optimization)
10. [Deployment](#deployment)
11. [Contributing Guidelines](#contributing-guidelines)

## Architecture Overview

### Technology Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **File Processing**: Sharp.js for image optimization
- **Search**: MiniSearch for client-side search
- **Caching**: Redis (optional)

### Project Structure
```
app/
├── (auth)/              # Authentication routes
├── admin/               # Protected admin routes
├── api/                 # API endpoints
├── components/          # Reusable components
├── lib/                 # Utilities and configurations
└── types/               # TypeScript definitions

prisma/
├── schema.prisma        # Database schema
├── migrations/          # Database migrations
└── seed.ts             # Database seeding

docs/                    # Documentation
tests/                   # Test files
```

## Development Setup

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL >= 14.0
- npm >= 8.0.0

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd kin-workspace-cms

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up database
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/cms_db"

# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3001"

# File Upload
UPLOAD_DIR="./public/uploads"
MAX_FILE_SIZE=10485760  # 10MB

# Redis (optional)
REDIS_URL="redis://localhost:6379"

# Email (for notifications)
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="your-email@example.com"
SMTP_PASS="your-password"
```

## Database Schema

### Core Models

#### Users
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  passwordHash  String
  role          Role      @default(EDITOR)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Relations
  products      Product[]
  pages         Page[]
  media         Media[]
  revisions     ContentRevision[]
}

enum Role {
  ADMIN
  EDITOR
  VIEWER
}
```

#### Products
```prisma
model Product {
  id                String    @id @default(cuid())
  name              String
  slug              String    @unique
  description       String?
  shortDescription  String?
  price             Decimal
  comparePrice      Decimal?
  sku               String?   @unique
  inventoryQuantity Int       @default(0)
  weight            Decimal?
  status            ProductStatus @default(DRAFT)
  featured          Boolean   @default(false)
  seoTitle          String?
  seoDescription    String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  createdById       String
  
  // Relations
  createdBy         User      @relation(fields: [createdById], references: [id])
  categories        ProductCategory[]
  media             ProductMedia[]
  revisions         ContentRevision[]
}

enum ProductStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

### Database Operations

#### Prisma Client Usage
```typescript
import { prisma } from '@/lib/prisma'

// Create a product
const product = await prisma.product.create({
  data: {
    name: 'New Product',
    slug: 'new-product',
    price: 29.99,
    createdById: userId,
  },
  include: {
    categories: true,
    media: true,
  }
})

// Query with filters
const products = await prisma.product.findMany({
  where: {
    status: 'PUBLISHED',
    categories: {
      some: {
        categoryId: categoryId
      }
    }
  },
  include: {
    categories: {
      include: {
        category: true
      }
    },
    media: {
      include: {
        media: true
      }
    }
  },
  orderBy: {
    createdAt: 'desc'
  }
})
```

## API Documentation

### Authentication Endpoints

#### POST /api/auth/login
```typescript
interface LoginRequest {
  email: string
  password: string
}

interface LoginResponse {
  user: {
    id: string
    email: string
    name: string
    role: string
  }
  token: string
}
```

#### POST /api/auth/register
```typescript
interface RegisterRequest {
  name: string
  email: string
  password: string
  role?: 'ADMIN' | 'EDITOR' | 'VIEWER'
}
```

### Product Endpoints

#### GET /api/products
```typescript
interface ProductListParams {
  page?: number
  limit?: number
  search?: string
  category?: string
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  sortBy?: 'name' | 'price' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

interface ProductListResponse {
  products: Product[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

#### POST /api/products
```typescript
interface CreateProductRequest {
  name: string
  slug: string
  description?: string
  shortDescription?: string
  price: number
  comparePrice?: number
  sku?: string
  inventoryQuantity?: number
  categoryIds: string[]
  mediaIds: string[]
  status: 'DRAFT' | 'PUBLISHED'
}
```

### Error Handling
```typescript
interface ApiError {
  error: {
    code: string
    message: string
    details?: any
    timestamp: string
  }
}

// Common error codes
enum ErrorCodes {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  DATABASE_ERROR = 'DATABASE_ERROR'
}
```

## Component Architecture

### Layout Components
```typescript
// AdminLayout.tsx
interface AdminLayoutProps {
  children: React.ReactNode
  title?: string
  breadcrumbs?: BreadcrumbItem[]
}

export function AdminLayout({ children, title, breadcrumbs }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <Header title={title} breadcrumbs={breadcrumbs} />
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
```

### Form Components
```typescript
// ProductForm.tsx
interface ProductFormProps {
  product?: Product
  onSubmit: (data: ProductFormData) => Promise<void>
  onCancel: () => void
}

export function ProductForm({ product, onSubmit, onCancel }: ProductFormProps) {
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product || defaultProductValues
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Form fields */}
      </form>
    </Form>
  )
}
```

### Data Table Component
```typescript
// DataTable.tsx
interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  pagination?: PaginationState
  sorting?: SortingState
  filtering?: FilteringState
  onPaginationChange?: (pagination: PaginationState) => void
  onSortingChange?: (sorting: SortingState) => void
  onFilteringChange?: (filtering: FilteringState) => void
}

export function DataTable<T>({
  data,
  columns,
  pagination,
  sorting,
  filtering,
  onPaginationChange,
  onSortingChange,
  onFilteringChange
}: DataTableProps<T>) {
  // Table implementation using @tanstack/react-table
}
```

## Authentication & Authorization

### NextAuth Configuration
```typescript
// lib/auth.ts
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import { verifyPassword } from './password-utils'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.isActive) {
          return null
        }

        const isValid = await verifyPassword(credentials.password, user.passwordHash)
        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = user.role
      }
      return token
    },
    session: async ({ session, token }) => {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
      }
      return session
    }
  }
}
```

### Role-Based Access Control
```typescript
// lib/auth-utils.ts
export function requireAuth(requiredRole?: Role) {
  return async function middleware(req: NextRequest) {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }

    if (requiredRole && !hasRole(session.user.role, requiredRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    return NextResponse.next()
  }
}

export function hasRole(userRole: string, requiredRole: Role): boolean {
  const roleHierarchy = {
    VIEWER: 1,
    EDITOR: 2,
    ADMIN: 3
  }
  
  return roleHierarchy[userRole as Role] >= roleHierarchy[requiredRole]
}
```

## File Upload & Media Processing

### File Upload Handler
```typescript
// lib/media-utils.ts
import sharp from 'sharp'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function processImageUpload(file: File): Promise<MediaProcessingResult> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const filename = generateUniqueFilename(file.name)
  const uploadDir = process.env.UPLOAD_DIR || './public/uploads'
  
  // Ensure upload directory exists
  await mkdir(uploadDir, { recursive: true })
  
  // Process original image
  const originalPath = path.join(uploadDir, filename)
  await writeFile(originalPath, buffer)
  
  // Generate thumbnails
  const thumbnails = await generateThumbnails(buffer, filename, uploadDir)
  
  // Get image metadata
  const metadata = await sharp(buffer).metadata()
  
  return {
    filename,
    originalName: file.name,
    mimeType: file.type,
    fileSize: file.size,
    width: metadata.width,
    height: metadata.height,
    thumbnails
  }
}

async function generateThumbnails(
  buffer: Buffer,
  filename: string,
  uploadDir: string
): Promise<ThumbnailSet> {
  const thumbnailSizes = {
    small: { width: 150, height: 150 },
    medium: { width: 300, height: 300 },
    large: { width: 800, height: 600 }
  }
  
  const thumbnails: ThumbnailSet = {}
  
  for (const [size, dimensions] of Object.entries(thumbnailSizes)) {
    const thumbnailFilename = `${size}_${filename}`
    const thumbnailPath = path.join(uploadDir, 'thumbnails', thumbnailFilename)
    
    await sharp(buffer)
      .resize(dimensions.width, dimensions.height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toFile(thumbnailPath)
    
    thumbnails[size as keyof ThumbnailSet] = `/uploads/thumbnails/${thumbnailFilename}`
  }
  
  return thumbnails
}
```

## Testing Strategy

### Unit Tests
```typescript
// __tests__/lib/media-utils.test.ts
import { processImageUpload, generateThumbnails } from '@/lib/media-utils'

describe('Media Utils', () => {
  describe('processImageUpload', () => {
    it('should process image upload correctly', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      
      const result = await processImageUpload(mockFile)
      
      expect(result).toMatchObject({
        filename: expect.stringContaining('.jpg'),
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        thumbnails: expect.objectContaining({
          small: expect.stringContaining('small_'),
          medium: expect.stringContaining('medium_'),
          large: expect.stringContaining('large_')
        })
      })
    })
  })
})
```

### API Tests
```typescript
// __tests__/api/products.test.ts
import { createMocks } from 'node-mocks-http'
import handler from '@/app/api/products/route'

describe('/api/products', () => {
  it('should create a new product', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        name: 'Test Product',
        slug: 'test-product',
        price: 29.99
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(201)
    expect(JSON.parse(res._getData())).toMatchObject({
      name: 'Test Product',
      slug: 'test-product',
      price: 29.99
    })
  })
})
```

### Component Tests
```typescript
// __tests__/components/ProductForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProductForm } from '@/components/products/ProductForm'

describe('ProductForm', () => {
  it('should render form fields correctly', () => {
    render(<ProductForm onSubmit={jest.fn()} onCancel={jest.fn()} />)
    
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/price/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
  })

  it('should handle form submission', async () => {
    const mockSubmit = jest.fn()
    render(<ProductForm onSubmit={mockSubmit} onCancel={jest.fn()} />)
    
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'Test Product' }
    })
    fireEvent.change(screen.getByLabelText(/price/i), {
      target: { value: '29.99' }
    })
    
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Product',
          price: 29.99
        })
      )
    })
  })
})
```

## Performance Optimization

### Database Optimization
```typescript
// Efficient queries with proper indexing
const products = await prisma.product.findMany({
  where: {
    status: 'PUBLISHED',
    categories: {
      some: {
        categoryId: {
          in: categoryIds
        }
      }
    }
  },
  include: {
    categories: {
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    },
    media: {
      where: {
        isPrimary: true
      },
      include: {
        media: {
          select: {
            id: true,
            filename: true,
            altText: true
          }
        }
      }
    }
  },
  orderBy: [
    { featured: 'desc' },
    { createdAt: 'desc' }
  ],
  take: limit,
  skip: (page - 1) * limit
})
```

### Caching Strategy
```typescript
// lib/cache.ts
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  const cached = await redis.get(key)
  
  if (cached) {
    return JSON.parse(cached)
  }
  
  const data = await fetcher()
  await redis.setex(key, ttl, JSON.stringify(data))
  
  return data
}

export async function invalidateCache(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern)
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}
```

## Deployment

### Docker Configuration
See `docker-compose.yml` and `Dockerfile` for containerized deployment.

### Environment Setup
1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Build and start the application

### Production Considerations
- Use a process manager (PM2)
- Set up reverse proxy (Nginx)
- Configure SSL certificates
- Set up monitoring and logging
- Implement backup strategies

## Contributing Guidelines

### Code Style
- Use TypeScript strict mode
- Follow ESLint and Prettier configurations
- Write meaningful commit messages
- Include tests for new features

### Pull Request Process
1. Create feature branch from main
2. Implement changes with tests
3. Update documentation if needed
4. Submit pull request with description
5. Address review feedback

### Testing Requirements
- Unit tests for utilities and services
- Integration tests for API endpoints
- Component tests for React components
- E2E tests for critical workflows
- Maintain minimum 80% code coverage

---

For additional technical questions or clarifications, please refer to the inline code documentation or contact the development team.