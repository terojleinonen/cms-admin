# CMS Implementation Design Document

## Overview

The Kin Workspace CMS will be built as a modern, self-hosted content management system using Next.js 15, PostgreSQL, and a carefully selected stack of open-source technologies. The system will provide comprehensive content management capabilities while maintaining complete independence from commercial services.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[CMS Admin Interface<br/>Next.js 15 + React]
        B[E-commerce Site<br/>Next.js 15]
    end
    
    subgraph "API Layer"
        C[CMS API Routes<br/>Next.js API]
        D[Authentication<br/>NextAuth.js]
    end
    
    subgraph "Business Logic"
        E[Content Management<br/>Services]
        F[Media Processing<br/>Sharp.js]
        G[Search Engine<br/>MiniSearch]
    end
    
    subgraph "Data Layer"
        H[PostgreSQL<br/>Database]
        I[Local File System<br/>Media Storage]
        J[Redis<br/>Caching]
    end
    
    A --> C
    B --> C
    C --> D
    C --> E
    E --> F
    E --> G
    E --> H
    F --> I
    G --> H
    C --> J
```

### Technology Stack

#### Core Framework
- **Next.js 15**: Full-stack React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **React Hook Form**: Form management with validation

#### Database & Storage
- **PostgreSQL 16**: Primary database (via Docker or native install)
- **Prisma ORM**: Type-safe database access and migrations
- **Local File System**: Media storage with organized directory structure
- **Redis**: Session storage and caching (optional, fallback to memory)

#### Authentication & Security
- **NextAuth.js**: Authentication framework
- **bcryptjs**: Password hashing
- **JWT**: Token-based authentication
- **CSRF protection**: Built-in Next.js security

#### Media & Content Processing
- **Sharp.js**: Image processing and optimization
- **React Quill**: Rich text editor
- **MiniSearch**: Client-side full-text search
- **Zod**: Runtime type validation

#### Development & Deployment
- **Docker**: Containerized PostgreSQL
- **ESLint + Prettier**: Code quality
- **Jest + Testing Library**: Testing framework

## Components and Interfaces

### 1. Database Schema Design

```sql
-- Users and Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'editor',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Content Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    short_description TEXT,
    price DECIMAL(10,2) NOT NULL,
    compare_price DECIMAL(10,2),
    sku VARCHAR(100) UNIQUE,
    inventory_quantity INTEGER DEFAULT 0,
    weight DECIMAL(8,2),
    dimensions JSONB,
    status VARCHAR(20) DEFAULT 'draft',
    featured BOOLEAN DEFAULT false,
    seo_title VARCHAR(255),
    seo_description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Product Categories (Many-to-Many)
CREATE TABLE product_categories (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, category_id)
);

-- Media Files
CREATE TABLE media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    width INTEGER,
    height INTEGER,
    alt_text VARCHAR(255),
    folder VARCHAR(255) DEFAULT 'uploads',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Product Media (Many-to-Many)
CREATE TABLE product_media (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    media_id UUID REFERENCES media(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    PRIMARY KEY (product_id, media_id)
);

-- Content Pages
CREATE TABLE pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT,
    excerpt TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    template VARCHAR(100) DEFAULT 'default',
    seo_title VARCHAR(255),
    seo_description TEXT,
    published_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Content Revisions
CREATE TABLE content_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type VARCHAR(50) NOT NULL,
    content_id UUID NOT NULL,
    revision_data JSONB NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. API Interface Design

#### Authentication Endpoints
```typescript
// POST /api/auth/login
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: User;
  token: string;
  expiresAt: string;
}

// POST /api/auth/register
interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: string;
}
```

#### Product Management Endpoints
```typescript
// GET /api/products
interface ProductListResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// POST /api/products
interface CreateProductRequest {
  name: string;
  slug: string;
  description?: string;
  price: number;
  categoryIds: string[];
  mediaIds: string[];
  status: 'draft' | 'published' | 'archived';
}

// PUT /api/products/[id]
interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: string;
}
```

#### Media Management Endpoints
```typescript
// POST /api/media/upload
interface MediaUploadResponse {
  media: Media;
  thumbnails: {
    small: string;
    medium: string;
    large: string;
  };
}

// GET /api/media
interface MediaListResponse {
  media: Media[];
  folders: string[];
  pagination: PaginationInfo;
}
```

### 3. Component Architecture

#### Core CMS Components
```typescript
// Layout Components
- AdminLayout: Main CMS layout with navigation
- Sidebar: Navigation menu with role-based visibility
- Header: User menu, notifications, search
- Breadcrumbs: Navigation context

// Content Management
- ProductEditor: Rich product editing interface
- MediaLibrary: File browser and upload interface
- CategoryManager: Hierarchical category management
- PageEditor: Content page creation and editing

// Data Display
- DataTable: Sortable, filterable table component
- ProductGrid: Visual product overview
- MediaGrid: Image/file grid with preview
- Dashboard: Analytics and overview widgets

// Form Components
- FormBuilder: Dynamic form generation
- RichTextEditor: WYSIWYG content editing
- ImageUploader: Drag-and-drop file upload
- CategorySelector: Hierarchical category picker
```

## Data Models

### Core Entities

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  price: number;
  comparePrice?: number;
  sku?: string;
  inventoryQuantity: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  categories: Category[];
  media: ProductMedia[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  sortOrder: number;
  isActive: boolean;
  children?: Category[];
  createdAt: Date;
  updatedAt: Date;
}

interface Media {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  altText?: string;
  folder: string;
  url: string;
  thumbnails: {
    small: string;
    medium: string;
    large: string;
  };
  createdBy: string;
  createdAt: Date;
}
```

## Error Handling

### Error Response Format
```typescript
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

// Common Error Codes
enum ErrorCodes {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE = 'UNSUPPORTED_FILE_TYPE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}
```

### Error Handling Strategy
1. **Client-side validation** using Zod schemas
2. **Server-side validation** with comprehensive error messages
3. **Database constraint errors** mapped to user-friendly messages
4. **File upload errors** with specific guidance
5. **Authentication errors** with appropriate redirects

## Testing Strategy

### Testing Approach
1. **Unit Tests**: Individual functions and utilities
2. **Integration Tests**: API endpoints and database operations
3. **Component Tests**: React components with user interactions
4. **E2E Tests**: Critical user workflows

### Test Structure
```typescript
// API Route Tests
describe('/api/products', () => {
  it('should create a new product', async () => {
    // Test implementation
  });
  
  it('should validate required fields', async () => {
    // Test implementation
  });
});

// Component Tests
describe('ProductEditor', () => {
  it('should render form fields correctly', () => {
    // Test implementation
  });
  
  it('should handle form submission', async () => {
    // Test implementation
  });
});
```

## Performance Considerations

### Optimization Strategies
1. **Database Indexing**: Strategic indexes on frequently queried fields
2. **Image Optimization**: Automatic WebP conversion and responsive images
3. **Caching**: Redis for session storage and frequently accessed data
4. **Lazy Loading**: Component and data lazy loading
5. **Bundle Optimization**: Code splitting and tree shaking

### Monitoring
1. **Performance Metrics**: Response time tracking
2. **Database Monitoring**: Query performance analysis
3. **Error Tracking**: Comprehensive error logging
4. **User Analytics**: Usage patterns and bottlenecks

## Security Measures

### Authentication & Authorization
1. **Password Security**: bcrypt hashing with salt rounds
2. **Session Management**: Secure JWT tokens with expiration
3. **Role-based Access**: Granular permission system
4. **CSRF Protection**: Built-in Next.js protection

### Data Protection
1. **Input Validation**: Comprehensive server-side validation
2. **SQL Injection Prevention**: Prisma ORM parameterized queries
3. **File Upload Security**: MIME type validation and file scanning
4. **Rate Limiting**: API endpoint protection

## Deployment Architecture

### Local Development Setup
```bash
# Database Setup
docker run --name postgres-cms \
  -e POSTGRES_DB=kin_workspace_cms \
  -e POSTGRES_USER=cms_user \
  -e POSTGRES_PASSWORD=secure_password \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  -d postgres:16

# Redis Setup (Optional)
docker run --name redis-cms \
  -p 6379:6379 \
  -d redis:7-alpine

# Environment Configuration
DATABASE_URL="postgresql://cms_user:secure_password@localhost:5432/kin_workspace_cms"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3001"
UPLOAD_DIR="./uploads"
```

### Production Considerations
1. **Database Backup**: Automated PostgreSQL backups
2. **File Storage**: Organized directory structure with permissions
3. **SSL/TLS**: HTTPS configuration for production
4. **Environment Variables**: Secure configuration management
5. **Logging**: Comprehensive application and access logs