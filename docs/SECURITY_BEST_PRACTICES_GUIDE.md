# Security Best Practices Guide

## Overview

This guide provides comprehensive security best practices for developers, administrators, and users of the Kin Workspace CMS RBAC system. Following these practices ensures maximum security posture and compliance with industry standards.

## Development Security Best Practices

### Secure Coding Guidelines

#### Input Validation and Sanitization

##### Server-Side Validation (Required)
```typescript
// ✅ GOOD: Comprehensive server-side validation
import { z } from 'zod';

const userSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long')
    .toLowerCase(),
  name: z.string()
    .min(1, 'Name required')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters in name'),
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER'])
});

export async function validateUserInput(input: unknown) {
  try {
    return userSchema.parse(input);
  } catch (error) {
    throw new ValidationError('Invalid input', error.errors);
  }
}
```

##### Input Sanitization
```typescript
// ✅ GOOD: Proper input sanitization
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtmlInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
}

export function sanitizeTextInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}
```

##### Avoid Common Pitfalls
```typescript
// ❌ BAD: Direct database query with user input
const user = await db.query(`SELECT * FROM users WHERE id = ${userId}`);

// ✅ GOOD: Parameterized query
const user = await db.user.findUnique({ where: { id: userId } });

// ❌ BAD: Trusting client-side validation only
if (req.body.isAdmin) { // Never trust client data
  // Grant admin privileges
}

// ✅ GOOD: Server-side authorization check
const hasAdminPermission = await permissionService.hasPermission(
  user, 
  { resource: 'admin', action: 'access' }
);
```

#### Authentication and Session Management

##### Secure Password Handling
```typescript
import bcrypt from 'bcryptjs';

// ✅ GOOD: Proper password hashing
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12; // Minimum recommended
  return await bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(
  password: string, 
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// ✅ GOOD: Password strength validation
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/[0-9]/, 'Password must contain number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain special character');
```

##### Session Security
```typescript
// ✅ GOOD: Secure session configuration
export const sessionConfig = {
  secret: process.env.NEXTAUTH_SECRET, // Strong, random secret
  maxAge: 30 * 60, // 30 minutes
  updateAge: 24 * 60 * 60, // 24 hours
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  httpOnly: true, // Prevent XSS access
  sameSite: 'strict' as const // CSRF protection
};

// ✅ GOOD: Session validation
export async function validateSession(sessionToken: string): Promise<Session | null> {
  const session = await getSession(sessionToken);
  
  if (!session) return null;
  
  // Check session expiry
  if (Date.now() > session.expires.getTime()) {
    await invalidateSession(sessionToken);
    return null;
  }
  
  // Check for suspicious activity
  if (await detectSuspiciousActivity(session.userId)) {
    await invalidateSession(sessionToken);
    return null;
  }
  
  return session;
}
```

#### Permission and Authorization

##### Principle of Least Privilege
```typescript
// ✅ GOOD: Granular permission checking
export async function checkResourceAccess(
  user: User,
  resource: string,
  action: string,
  resourceId?: string
): Promise<boolean> {
  // Check basic permission
  const hasBasicPermission = await permissionService.hasPermission(
    user,
    { resource, action }
  );
  
  if (!hasBasicPermission) return false;
  
  // Check resource-specific permissions
  if (resourceId) {
    return await checkResourceOwnership(user, resource, resourceId);
  }
  
  return true;
}

// ✅ GOOD: Resource ownership validation
async function checkResourceOwnership(
  user: User,
  resource: string,
  resourceId: string
): Promise<boolean> {
  switch (resource) {
    case 'products':
      const product = await db.product.findUnique({
        where: { id: resourceId },
        select: { createdBy: true }
      });
      return product?.createdBy === user.id || user.role === 'ADMIN';
    
    case 'orders':
      const order = await db.order.findUnique({
        where: { id: resourceId },
        select: { userId: true }
      });
      return order?.userId === user.id || user.role === 'ADMIN';
    
    default:
      return false;
  }
}
```

##### Defense in Depth
```typescript
// ✅ GOOD: Multiple layers of security
export async function secureApiEndpoint(
  req: NextRequest,
  resource: string,
  action: string
) {
  // Layer 1: Authentication
  const session = await getServerSession(req);
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Layer 2: Rate limiting
  const rateLimitResult = await rateLimit(req);
  if (!rateLimitResult.success) {
    return new Response('Too Many Requests', { status: 429 });
  }
  
  // Layer 3: Permission validation
  const hasPermission = await permissionService.hasPermission(
    session.user,
    { resource, action }
  );
  if (!hasPermission) {
    await auditLogger.logUnauthorizedAccess(session.user, resource, action);
    return new Response('Forbidden', { status: 403 });
  }
  
  // Layer 4: Input validation
  const validationResult = await validateRequestInput(req);
  if (!validationResult.success) {
    return new Response('Bad Request', { status: 400 });
  }
  
  return null; // Continue processing
}
```

### API Security Best Practices

#### Secure API Design

##### RESTful Security Patterns
```typescript
// ✅ GOOD: Secure API route structure
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate and sanitize parameters
    const productId = z.string().uuid().parse(params.id);
    
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check permissions
    const canRead = await permissionService.hasPermission(
      session.user,
      { resource: 'products', action: 'read' }
    );
    
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Fetch and filter data based on permissions
    const product = await getProductWithPermissions(productId, session.user);
    
    if (!product) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
    
    // Log successful access
    await auditLogger.logDataAccess(session.user, 'products', productId);
    
    return NextResponse.json(product);
    
  } catch (error) {
    // Log error without exposing sensitive information
    await errorLogger.logError(error, request);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

##### Error Handling Security
```typescript
// ✅ GOOD: Secure error handling
export class SecureErrorHandler {
  static handleApiError(error: unknown, request: NextRequest): NextResponse {
    // Log detailed error internally
    logger.error('API Error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString()
    });
    
    // Return generic error to client
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: 'Invalid input provided' },
        { status: 400 }
      );
    }
    
    if (error instanceof PermissionError) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Never expose internal errors
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
```

#### Rate Limiting and Abuse Prevention

##### Intelligent Rate Limiting
```typescript
export class RateLimitService {
  async checkRateLimit(
    identifier: string,
    endpoint: string,
    userRole?: string
  ): Promise<RateLimitResult> {
    const limits = this.getRateLimits(endpoint, userRole);
    const key = `rate_limit:${identifier}:${endpoint}`;
    
    const current = await redis.get(key);
    const requests = current ? parseInt(current) : 0;
    
    if (requests >= limits.maxRequests) {
      // Log potential abuse
      await this.logRateLimitViolation(identifier, endpoint, requests);
      
      return {
        success: false,
        remaining: 0,
        resetTime: await this.getResetTime(key)
      };
    }
    
    // Increment counter
    await redis.multi()
      .incr(key)
      .expire(key, limits.windowSeconds)
      .exec();
    
    return {
      success: true,
      remaining: limits.maxRequests - requests - 1,
      resetTime: await this.getResetTime(key)
    };
  }
  
  private getRateLimits(endpoint: string, userRole?: string) {
    const baseLimits = {
      '/api/auth/login': { maxRequests: 5, windowSeconds: 900 }, // 5 per 15 min
      '/api/products': { maxRequests: 100, windowSeconds: 60 }, // 100 per minute
      '/api/admin/*': { maxRequests: 50, windowSeconds: 60 } // 50 per minute
    };
    
    // Higher limits for privileged users
    if (userRole === 'ADMIN') {
      return {
        ...baseLimits[endpoint],
        maxRequests: baseLimits[endpoint].maxRequests * 2
      };
    }
    
    return baseLimits[endpoint] || { maxRequests: 60, windowSeconds: 60 };
  }
}
```

### Frontend Security Best Practices

#### Component Security

##### Secure Component Design
```typescript
// ✅ GOOD: Permission-aware component
interface SecureComponentProps {
  requiredPermissions: Permission[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showError?: boolean;
}

export function SecureComponent({
  requiredPermissions,
  children,
  fallback = null,
  showError = false
}: SecureComponentProps) {
  const { hasPermissions, loading, error } = usePermissions();
  
  // Show loading state
  if (loading) {
    return <LoadingSpinner />;
  }
  
  // Handle permission check
  const hasAccess = requiredPermissions.every(permission =>
    hasPermissions(permission.resource, permission.action)
  );
  
  if (!hasAccess) {
    if (showError) {
      return <UnauthorizedMessage permissions={requiredPermissions} />;
    }
    return fallback;
  }
  
  return <>{children}</>;
}

// ✅ GOOD: Usage example
function ProductManagement() {
  return (
    <SecureComponent
      requiredPermissions={[
        { resource: 'products', action: 'manage' }
      ]}
      fallback={<div>You don't have access to product management.</div>}
    >
      <ProductList />
      <ProductForm />
    </SecureComponent>
  );
}
```

##### XSS Prevention
```typescript
// ✅ GOOD: Safe content rendering
import DOMPurify from 'dompurify';

interface SafeHtmlProps {
  content: string;
  allowedTags?: string[];
}

export function SafeHtml({ content, allowedTags = ['b', 'i', 'em', 'strong'] }: SafeHtmlProps) {
  const sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: []
  });
  
  return (
    <div 
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      className="safe-content"
    />
  );
}

// ❌ BAD: Direct HTML injection
function UnsafeComponent({ userContent }: { userContent: string }) {
  return <div dangerouslySetInnerHTML={{ __html: userContent }} />;
}
```

#### Form Security

##### Secure Form Handling
```typescript
// ✅ GOOD: Secure form with validation and CSRF protection
export function SecureProductForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(productSchema)
  });
  
  const { csrfToken } = useCSRFToken();
  const { canCreate } = usePermissions();
  
  if (!canCreate('products')) {
    return <UnauthorizedMessage />;
  }
  
  const onSubmit = async (data: ProductFormData) => {
    try {
      // Include CSRF token
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create product');
      }
      
      // Handle success
      toast.success('Product created successfully');
      
    } catch (error) {
      // Handle error securely
      toast.error('Failed to create product. Please try again.');
      logger.error('Product creation failed', error);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      
      <div>
        <label htmlFor="name">Product Name</label>
        <input
          {...register('name')}
          type="text"
          id="name"
          maxLength={100}
          autoComplete="off"
        />
        {errors.name && (
          <span className="error">{errors.name.message}</span>
        )}
      </div>
      
      <button type="submit">Create Product</button>
    </form>
  );
}
```

### Database Security Best Practices

#### Secure Database Operations

##### Query Security
```typescript
// ✅ GOOD: Secure database queries with Prisma
export class SecureProductService {
  async getProducts(userId: string, filters: ProductFilters) {
    // Get user permissions
    const user = await this.getUserWithPermissions(userId);
    
    // Build secure query based on permissions
    const whereClause = this.buildSecureWhereClause(user, filters);
    
    return await db.product.findMany({
      where: whereClause,
      select: this.getSelectFields(user),
      orderBy: { createdAt: 'desc' },
      take: Math.min(filters.limit || 20, 100) // Prevent large queries
    });
  }
  
  private buildSecureWhereClause(user: User, filters: ProductFilters) {
    const baseWhere: any = {};
    
    // Apply permission-based filtering
    if (user.role === 'VIEWER') {
      baseWhere.published = true;
    } else if (user.role === 'EDITOR') {
      baseWhere.OR = [
        { published: true },
        { createdBy: user.id }
      ];
    }
    // ADMIN can see all products
    
    // Apply user filters securely
    if (filters.category) {
      baseWhere.categoryId = filters.category;
    }
    
    if (filters.search) {
      const sanitizedSearch = filters.search.replace(/[%_]/g, '\\$&');
      baseWhere.OR = [
        { name: { contains: sanitizedSearch, mode: 'insensitive' } },
        { description: { contains: sanitizedSearch, mode: 'insensitive' } }
      ];
    }
    
    return baseWhere;
  }
}
```

##### Data Encryption
```typescript
// ✅ GOOD: Field-level encryption for sensitive data
import crypto from 'crypto';

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  
  encrypt(text: string, key: Buffer): EncryptedData {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, key);
    cipher.setAAD(Buffer.from('additional-data'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  decrypt(encryptedData: EncryptedData, key: Buffer): string {
    const decipher = crypto.createDecipher(this.algorithm, key);
    decipher.setAAD(Buffer.from('additional-data'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// Usage in model
export async function createUser(userData: CreateUserData) {
  const encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  
  return await db.user.create({
    data: {
      ...userData,
      // Encrypt sensitive fields
      ssn: userData.ssn ? encryptionService.encrypt(userData.ssn, encryptionKey) : null,
      phoneNumber: encryptionService.encrypt(userData.phoneNumber, encryptionKey)
    }
  });
}
```

### Infrastructure Security Best Practices

#### Environment Configuration

##### Secure Environment Setup
```bash
# ✅ GOOD: Secure environment variables
# .env.production
DATABASE_URL="postgresql://user:password@localhost:5432/cms_prod?sslmode=require"
NEXTAUTH_SECRET="your-super-secure-random-secret-here"
NEXTAUTH_URL="https://your-domain.com"
ENCRYPTION_KEY="your-32-byte-hex-encryption-key"
REDIS_URL="rediss://user:password@redis-host:6380"

# Security headers
SECURITY_HEADERS_ENABLED=true
CSP_ENABLED=true
HSTS_ENABLED=true

# Rate limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REDIS_URL="rediss://user:password@redis-host:6380"

# Monitoring
SENTRY_DSN="your-sentry-dsn"
LOG_LEVEL="warn"
```

##### Security Headers Configuration
```typescript
// ✅ GOOD: Comprehensive security headers
export const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-XSS-Protection': '1; mode=block'
};
```

#### Deployment Security

##### Docker Security
```dockerfile
# ✅ GOOD: Secure Dockerfile
FROM node:18-alpine AS base

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY --chown=nextjs:nodejs . .

# Build application
RUN npm run build

# Remove development dependencies
RUN npm prune --production

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["npm", "start"]
```

### Monitoring and Incident Response

#### Security Monitoring

##### Real-time Security Monitoring
```typescript
export class SecurityMonitoringService {
  async monitorSecurityEvents(): Promise<void> {
    const monitors = [
      this.monitorFailedLogins(),
      this.monitorPermissionViolations(),
      this.monitorSuspiciousActivity(),
      this.monitorDataAccess()
    ];
    
    await Promise.all(monitors);
  }
  
  private async monitorFailedLogins(): Promise<void> {
    const recentFailures = await db.auditLog.findMany({
      where: {
        action: 'LOGIN_FAILED',
        timestamp: { gte: new Date(Date.now() - 15 * 60 * 1000) } // Last 15 minutes
      },
      select: { ipAddress: true, userId: true }
    });
    
    // Detect brute force attempts
    const ipCounts = this.countByIp(recentFailures);
    const userCounts = this.countByUser(recentFailures);
    
    for (const [ip, count] of Object.entries(ipCounts)) {
      if (count >= 10) { // 10 failures in 15 minutes
        await this.handleBruteForceAttempt(ip, count);
      }
    }
    
    for (const [userId, count] of Object.entries(userCounts)) {
      if (count >= 5) { // 5 failures for same user
        await this.handleAccountAttack(userId, count);
      }
    }
  }
  
  private async handleBruteForceAttempt(ip: string, attempts: number): Promise<void> {
    // Block IP temporarily
    await this.blockIpAddress(ip, 60 * 60); // 1 hour
    
    // Create security alert
    await this.createSecurityAlert({
      type: 'BRUTE_FORCE_ATTACK',
      severity: 'HIGH',
      details: { ipAddress: ip, attempts },
      timestamp: new Date()
    });
    
    // Notify security team
    await this.notifySecurityTeam('Brute force attack detected', {
      ipAddress: ip,
      attempts,
      action: 'IP blocked for 1 hour'
    });
  }
}
```

#### Incident Response Procedures

##### Automated Incident Response
```typescript
export class IncidentResponseService {
  async handleSecurityIncident(incident: SecurityIncident): Promise<void> {
    // Log incident
    await this.logIncident(incident);
    
    // Classify incident severity
    const severity = this.classifyIncident(incident);
    
    // Execute response based on severity
    switch (severity) {
      case 'CRITICAL':
        await this.handleCriticalIncident(incident);
        break;
      case 'HIGH':
        await this.handleHighSeverityIncident(incident);
        break;
      case 'MEDIUM':
        await this.handleMediumSeverityIncident(incident);
        break;
      case 'LOW':
        await this.handleLowSeverityIncident(incident);
        break;
    }
  }
  
  private async handleCriticalIncident(incident: SecurityIncident): Promise<void> {
    // Immediate containment
    if (incident.type === 'DATA_BREACH') {
      await this.isolateAffectedSystems();
      await this.revokeAllSessions();
    }
    
    // Notify stakeholders immediately
    await this.notifyExecutiveTeam(incident);
    await this.notifyLegalTeam(incident);
    await this.notifyCustomers(incident);
    
    // Start incident response team
    await this.activateIncidentResponseTeam(incident);
    
    // Begin forensic analysis
    await this.startForensicAnalysis(incident);
  }
}
```

This comprehensive security best practices guide provides actionable guidance for maintaining the highest security standards across all aspects of the RBAC system.