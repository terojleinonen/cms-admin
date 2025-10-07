# Server-Side Input Validation Guide

This guide explains how to implement comprehensive server-side input validation, sanitization, and security measures for all API endpoints in the CMS.

## Overview

The input validation system provides:

- **Comprehensive Input Sanitization**: Removes dangerous content, XSS attempts, and SQL injection
- **Schema-Based Validation**: Type-safe validation using Zod schemas
- **Security Hardening**: Built-in protection against common attacks
- **Easy Integration**: Simple decorators and utilities for existing routes
- **Performance Optimized**: Efficient validation with minimal overhead

## Core Components

### 1. Input Validation (`app/lib/input-validation.ts`)

Provides advanced sanitization and security checks:

```typescript
import { 
  AdvancedInputSanitizer, 
  SQLInjectionPrevention, 
  XSSPrevention,
  secureValidationSchemas 
} from '@/lib/input-validation'

// Sanitize text input
const cleanText = AdvancedInputSanitizer.sanitizeText(userInput)

// Check for SQL injection
const hasSQLInjection = SQLInjectionPrevention.containsSQLInjection(input)

// Check for XSS
const hasXSS = XSSPrevention.containsXSS(input)
```

### 2. Validation Middleware (`app/lib/validation-middleware.ts`)

Provides middleware for comprehensive request validation:

```typescript
import { withInputValidation } from '@/lib/validation-middleware'

export const POST = withInputValidation(
  async (request, { body, query, params }) => {
    // All data is validated and sanitized
    return NextResponse.json({ success: true })
  },
  {
    bodySchema: myBodySchema,
    querySchema: myQuerySchema,
    paramsSchema: myParamsSchema,
    sanitizeInputs: true,
    checkSQLInjection: true,
    checkXSS: true,
  }
)
```

### 3. API Route Validator (`app/lib/api-route-validator.ts`)

Provides high-level route creation with built-in security:

```typescript
import { createSecureAPIRoute } from '@/lib/api-route-validator'

export const POST = createSecureAPIRoute(
  async (request, { body }) => {
    // Handler implementation
    return NextResponse.json({ data: body })
  },
  {
    bodySchema: validationSchema,
    permissions: { resource: 'users', action: 'create' },
    rateLimit: 'sensitive',
    requireCSRF: true
  }
)
```

## Secure Validation Schemas

Use the secure validation schemas for enhanced security:

```typescript
import { secureValidationSchemas } from '@/lib/input-validation'

const userSchema = z.object({
  name: secureValidationSchemas.secureString(100),
  email: secureValidationSchemas.secureEmail,
  bio: secureValidationSchemas.secureHTML(['p', 'br', 'strong']),
  website: secureValidationSchemas.secureURL,
  phone: secureValidationSchemas.securePhone,
  tags: secureValidationSchemas.secureArray(
    secureValidationSchemas.secureString(50), 
    10
  ),
  isActive: secureValidationSchemas.secureBoolean,
})
```

## Implementation Examples

### Basic API Route with Validation

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSecureAPIRoute } from '@/lib/api-route-validator'
import { secureValidationSchemas } from '@/lib/input-validation'

const createUserSchema = z.object({
  name: secureValidationSchemas.secureString(100),
  email: secureValidationSchemas.secureEmail,
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']),
})

export const POST = createSecureAPIRoute(
  async (request, { body }) => {
    const { name, email, role } = body
    
    // Create user logic here
    const user = await createUser({ name, email, role })
    
    return NextResponse.json({
      success: true,
      data: user
    })
  },
  {
    bodySchema: createUserSchema,
    requireBody: true,
    permissions: { resource: 'users', action: 'create' },
    rateLimit: 'sensitive'
  }
)
```

### File Upload with Validation

```typescript
// app/api/upload/route.ts
import { createSecureAPIRoute } from '@/lib/api-route-validator'
import { validateSecureFileUpload } from '@/lib/input-validation'

export const POST = createSecureAPIRoute(
  async (request, data) => {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    // Validate file
    const fileValidation = validateSecureFileUpload(file, {
      allowedTypes: ['image/jpeg', 'image/png'],
      maxSize: 5 * 1024 * 1024, // 5MB
    })
    
    if (!fileValidation.valid) {
      return NextResponse.json({
        error: fileValidation.error
      }, { status: 400 })
    }
    
    // Process file upload
    const url = await uploadFile(file)
    
    return NextResponse.json({
      success: true,
      data: { url }
    })
  },
  {
    allowedMethods: ['POST'],
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    permissions: { resource: 'media', action: 'create' }
  }
)
```

### Search Endpoint with Query Validation

```typescript
// app/api/search/route.ts
import { createSecureAPIRoute, schemaBuilders } from '@/lib/api-route-validator'

const searchQuerySchema = schemaBuilders.searchQuery({
  type: z.enum(['users', 'products', 'pages']).optional(),
  category: secureValidationSchemas.secureString(50).optional(),
})

export const GET = createSecureAPIRoute(
  async (request, { query }) => {
    const { q, type, category, filters } = query
    
    // Perform search
    const results = await searchContent({ q, type, category, filters })
    
    return NextResponse.json({
      success: true,
      data: results
    })
  },
  {
    querySchema: searchQuerySchema,
    customValidation: async (request, data) => {
      if (data.query?.q && data.query.q.length > 1000) {
        return 'Search query too long'
      }
      return true
    }
  }
)
```

## Security Features

### SQL Injection Prevention

The system automatically detects and prevents SQL injection attempts:

```typescript
// These inputs will be rejected:
"'; DROP TABLE users; --"
"' OR '1'='1"
"UNION SELECT * FROM passwords"
```

### XSS Prevention

Dangerous HTML and JavaScript is automatically sanitized:

```typescript
// These inputs will be cleaned:
"<script>alert('xss')</script>" // → ""
"<img src=x onerror=alert(1)>" // → ""
"javascript:alert('xss')" // → ""
```

### Input Sanitization

All inputs are automatically sanitized:

```typescript
// Text sanitization
"  Hello <b>World</b>  " // → "Hello World"

// Email sanitization
"  TEST@EXAMPLE.COM  " // → "test@example.com"

// Object sanitization (removes dangerous keys)
{
  __proto__: { admin: true },
  name: "John"
} // → { name: "John" }
```

## Migration Guide

### Updating Existing Routes

1. **Import the validation utilities:**

```typescript
import { createSecureAPIRoute } from '@/lib/api-route-validator'
import { secureValidationSchemas } from '@/lib/input-validation'
```

2. **Define validation schemas:**

```typescript
const bodySchema = z.object({
  name: secureValidationSchemas.secureString(100),
  email: secureValidationSchemas.secureEmail,
})
```

3. **Wrap your handler:**

```typescript
// Before
export async function POST(request: NextRequest) {
  const body = await request.json()
  // ... handler logic
}

// After
export const POST = createSecureAPIRoute(
  async (request, { body }) => {
    // ... handler logic (body is now validated)
  },
  {
    bodySchema,
    permissions: { resource: 'resource', action: 'create' }
  }
)
```

### Batch Migration

Use the route validation updater to migrate multiple routes:

```typescript
import { routeConfigurations, wrapExistingRoute } from '@/lib/route-validation-updater'

// Get configuration for a route
const config = routeConfigurations['/api/users']

// Wrap existing handler
const secureHandler = wrapExistingRoute(originalHandler, '/api/users', 'POST')
```

## Testing

Test your validation with the provided test utilities:

```typescript
import { 
  AdvancedInputSanitizer, 
  SQLInjectionPrevention, 
  XSSPrevention 
} from '@/lib/input-validation'

describe('Input Validation', () => {
  it('should sanitize dangerous input', () => {
    const input = '<script>alert("xss")</script>Hello'
    const result = AdvancedInputSanitizer.sanitizeText(input)
    expect(result).toBe('Hello')
  })

  it('should detect SQL injection', () => {
    const input = "'; DROP TABLE users; --"
    expect(SQLInjectionPrevention.containsSQLInjection(input)).toBe(true)
  })
})
```

## Performance Considerations

- **Caching**: Validation results are cached where appropriate
- **Lazy Loading**: Validation schemas are loaded on-demand
- **Efficient Patterns**: Regex patterns are optimized for performance
- **Memory Management**: Large objects are handled efficiently

## Security Best Practices

1. **Always validate on the server**: Never trust client-side validation alone
2. **Use secure schemas**: Prefer `secureValidationSchemas` over basic Zod schemas
3. **Enable all security checks**: Use SQL injection and XSS prevention
4. **Implement rate limiting**: Protect against abuse
5. **Log security events**: Monitor for attack attempts
6. **Regular updates**: Keep validation patterns up to date

## Configuration

Configure validation behavior in your environment:

```typescript
// app/lib/input-validation.ts
export const INPUT_VALIDATION_CONFIG = {
  maxStringLength: 10000,
  maxArrayLength: 1000,
  maxObjectDepth: 10,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  allowedDocumentTypes: ['application/pdf', 'text/plain', 'text/csv'],
}
```

## Troubleshooting

### Common Issues

1. **Validation failing for valid input**: Check if input contains suspicious patterns
2. **Performance issues**: Reduce validation complexity or implement caching
3. **False positives**: Adjust validation patterns for your use case

### Debug Mode

Enable debug logging to troubleshoot validation issues:

```typescript
const result = await validateSecureRequest(request, schema, {
  debug: true // Enable debug logging
})
```

## Support

For questions or issues with the validation system:

1. Check the test files for examples
2. Review the API documentation
3. Check security logs for validation failures
4. Consult the troubleshooting guide above