# Kin Workspace CMS API Documentation

## Overview

The Kin Workspace CMS provides a comprehensive REST API for managing content, users, and system operations. This documentation covers all available endpoints, authentication requirements, request/response formats, and usage examples.

## Base URL

```
Production: https://cms.kinworkspace.com/api
Development: http://localhost:3001/api
```

## Authentication

### API Key Authentication

All API requests require authentication using API keys. Include your API key in the request headers:

```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

### Session Authentication

For web interface requests, session-based authentication is used with CSRF protection:

```http
Cookie: next-auth.session-token=SESSION_TOKEN
X-CSRF-Token: CSRF_TOKEN
```

## Rate Limiting

API requests are rate-limited based on your API key configuration:
- Default: 1000 requests per hour
- Rate limit headers are included in all responses:
  - `X-RateLimit-Limit`: Maximum requests per hour
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Timestamp when rate limit resets

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Optional additional error details
    },
    "timestamp": "2024-02-09T10:30:00Z"
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "items": [
      // Array of items
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `AUTHENTICATION_ERROR` | 401 | Authentication required or failed |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate email) |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `DATABASE_ERROR` | 500 | Database operation failed |

## Endpoints

### Authentication

#### POST /api/auth/login
Authenticate user and create session.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "ADMIN"
    },
    "session": {
      "expires": "2024-02-10T10:30:00Z"
    }
  }
}
```

#### POST /api/auth/logout
Logout user and invalidate session.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Users

#### GET /api/users
List all users with pagination and filtering.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `search` (string): Search by name or email
- `role` (string): Filter by role (ADMIN, EDITOR, VIEWER)
- `isActive` (boolean): Filter by active status

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "user-uuid",
        "email": "user@example.com",
        "name": "John Doe",
        "role": "ADMIN",
        "isActive": true,
        "lastLoginAt": "2024-02-09T09:15:00Z",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

#### GET /api/users/[id]
Get user by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "ADMIN",
    "isActive": true,
    "profilePicture": "https://example.com/avatar.jpg",
    "emailVerified": "2024-01-15T10:30:00Z",
    "twoFactorEnabled": true,
    "lastLoginAt": "2024-02-09T09:15:00Z",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-02-09T09:15:00Z",
    "preferences": {
      "theme": "LIGHT",
      "timezone": "America/New_York",
      "language": "en",
      "notifications": {
        "email": true,
        "push": false,
        "security": true,
        "marketing": false
      }
    }
  }
}
```

#### POST /api/users
Create a new user.

**Request:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "securePassword123!",
  "role": "EDITOR"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new-user-uuid",
    "email": "jane@example.com",
    "name": "Jane Smith",
    "role": "EDITOR",
    "isActive": true,
    "createdAt": "2024-02-09T10:30:00Z"
  },
  "message": "User created successfully"
}
```

#### PUT /api/users/[id]
Update user information.

**Request:**
```json
{
  "name": "Jane Doe",
  "role": "ADMIN",
  "isActive": true
}
```

#### DELETE /api/users/[id]
Delete a user (soft delete).

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### Products

#### GET /api/products
List products with filtering and pagination.

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `search` (string): Search by name or description
- `category` (string): Filter by category ID
- `status` (string): Filter by status (DRAFT, ACTIVE, ARCHIVED)
- `featured` (boolean): Filter by featured status
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `sortBy` (string): Sort field (name, price, createdAt, updatedAt)
- `sortOrder` (string): Sort direction (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "product-uuid",
        "name": "Ergonomic Desk Chair",
        "slug": "ergonomic-desk-chair",
        "description": "Comfortable office chair designed for long work sessions",
        "price": 299.99,
        "comparePrice": 399.99,
        "sku": "CHAIR-001",
        "inventoryQuantity": 50,
        "status": "ACTIVE",
        "featured": true,
        "images": [
          {
            "url": "https://example.com/chair-1.jpg",
            "altText": "Front view of ergonomic chair",
            "isPrimary": true
          }
        ],
        "categories": [
          {
            "id": "category-uuid",
            "name": "Office Furniture",
            "slug": "office-furniture"
          }
        ],
        "createdAt": "2024-01-20T10:30:00Z",
        "updatedAt": "2024-02-05T14:20:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 125,
      "totalPages": 7
    }
  }
}
```

#### GET /api/products/[id]
Get product by ID with full details.

#### POST /api/products
Create a new product.

**Request:**
```json
{
  "name": "Standing Desk Converter",
  "slug": "standing-desk-converter",
  "description": "Adjustable standing desk converter for healthier work habits",
  "shortDescription": "Transform any desk into a standing desk",
  "price": 199.99,
  "comparePrice": 249.99,
  "sku": "DESK-CONV-001",
  "inventoryQuantity": 25,
  "weight": 15.5,
  "dimensions": {
    "length": 32,
    "width": 22,
    "height": 6
  },
  "status": "ACTIVE",
  "featured": false,
  "seoTitle": "Adjustable Standing Desk Converter - Kin Workspace",
  "seoDescription": "Improve your health with our adjustable standing desk converter",
  "categoryIds": ["category-uuid-1", "category-uuid-2"]
}
```

#### PUT /api/products/[id]
Update product information.

#### DELETE /api/products/[id]
Delete a product (soft delete).

#### POST /api/products/bulk
Bulk update products.

**Request:**
```json
{
  "productIds": ["product-1", "product-2", "product-3"],
  "updates": {
    "status": "ACTIVE",
    "categoryId": "new-category-uuid"
  }
}
```

### Categories

#### GET /api/categories
List categories with hierarchical structure.

**Query Parameters:**
- `includeProducts` (boolean): Include product count
- `parentId` (string): Filter by parent category
- `isActive` (boolean): Filter by active status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "category-uuid",
      "name": "Office Furniture",
      "slug": "office-furniture",
      "description": "Furniture designed for office environments",
      "parentId": null,
      "sortOrder": 1,
      "isActive": true,
      "productCount": 25,
      "children": [
        {
          "id": "subcategory-uuid",
          "name": "Chairs",
          "slug": "chairs",
          "parentId": "category-uuid",
          "sortOrder": 1,
          "isActive": true,
          "productCount": 12
        }
      ],
      "createdAt": "2024-01-10T10:30:00Z"
    }
  ]
}
```

#### POST /api/categories
Create a new category.

#### PUT /api/categories/[id]
Update category information.

#### DELETE /api/categories/[id]
Delete a category.

#### POST /api/categories/reorder
Reorder categories.

**Request:**
```json
{
  "categoryId": "category-uuid",
  "newParentId": "parent-uuid",
  "newSortOrder": 3
}
```

### Media

#### GET /api/media
List media files with filtering.

**Query Parameters:**
- `type` (string): Filter by media type (image, document, video, audio)
- `folder` (string): Filter by folder
- `search` (string): Search by filename or alt text

#### POST /api/media/upload
Upload media files.

**Request:** Multipart form data
- `file`: File to upload
- `title`: Optional title
- `altText`: Optional alt text
- `folder`: Optional folder path

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "media-uuid",
    "filename": "chair-image.jpg",
    "originalName": "ergonomic-chair.jpg",
    "mimeType": "image/jpeg",
    "fileSize": 245760,
    "width": 800,
    "height": 600,
    "url": "https://example.com/uploads/chair-image.jpg",
    "thumbnailUrl": "https://example.com/uploads/thumbs/chair-image.jpg",
    "altText": "Ergonomic office chair",
    "folder": "products",
    "createdAt": "2024-02-09T10:30:00Z"
  }
}
```

#### PUT /api/media/[id]
Update media metadata.

#### DELETE /api/media/[id]
Delete media file.

### API Keys

#### GET /api/admin/api-keys
List API keys (Admin only).

#### POST /api/admin/api-keys
Create new API key (Admin only).

**Request:**
```json
{
  "name": "Mobile App API Key",
  "description": "API key for mobile application",
  "permissions": ["read", "write"],
  "expiresAt": "2025-02-09T10:30:00Z",
  "rateLimitPerHour": 5000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "api-key-uuid",
    "name": "Mobile App API Key",
    "key": "ak_live_1234567890abcdef...",
    "permissions": ["read", "write"],
    "rateLimitPerHour": 5000,
    "expiresAt": "2025-02-09T10:30:00Z",
    "createdAt": "2024-02-09T10:30:00Z"
  },
  "message": "API key created successfully. Store the key securely as it won't be shown again."
}
```

#### PUT /api/admin/api-keys/[id]
Update API key settings.

#### DELETE /api/admin/api-keys/[id]
Delete API key.

## Webhooks

The CMS supports webhooks for real-time notifications of events:

### Supported Events
- `user.created`
- `user.updated`
- `user.deleted`
- `product.created`
- `product.updated`
- `product.deleted`
- `order.created`
- `order.updated`

### Webhook Payload
```json
{
  "event": "product.created",
  "timestamp": "2024-02-09T10:30:00Z",
  "data": {
    // Event-specific data
  },
  "signature": "sha256=..."
}
```

## SDKs and Libraries

### JavaScript/TypeScript SDK
```bash
npm install @kinworkspace/cms-sdk
```

```typescript
import { KinCMS } from '@kinworkspace/cms-sdk'

const cms = new KinCMS({
  apiKey: 'your-api-key',
  baseUrl: 'https://cms.kinworkspace.com/api'
})

// List products
const products = await cms.products.list({
  status: 'ACTIVE',
  limit: 10
})

// Create product
const newProduct = await cms.products.create({
  name: 'New Product',
  price: 99.99,
  // ... other fields
})
```

## Rate Limiting Best Practices

1. **Implement exponential backoff** when receiving 429 responses
2. **Cache responses** when appropriate to reduce API calls
3. **Use bulk operations** when updating multiple resources
4. **Monitor rate limit headers** to avoid hitting limits
5. **Request higher limits** for production applications

## Error Handling Best Practices

1. **Always check the `success` field** in responses
2. **Handle specific error codes** appropriately
3. **Display user-friendly messages** for validation errors
4. **Implement retry logic** for transient errors
5. **Log errors** for debugging and monitoring

## Security Considerations

1. **Store API keys securely** - never expose them in client-side code
2. **Use HTTPS** for all API requests
3. **Validate webhook signatures** to ensure authenticity
4. **Implement proper CORS** policies for web applications
5. **Rotate API keys** regularly

## Support

For API support and questions:
- Documentation: https://docs.kinworkspace.com/cms-api
- Support Email: api-support@kinworkspace.com
- Status Page: https://status.kinworkspace.com