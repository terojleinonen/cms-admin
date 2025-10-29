/**
 * API Security Hardening Tests
 * Tests for input validation, sanitization, CSRF protection, and security headers
 */

import { jest } from '@jest/globals'
import { 
  InputSanitizer, 
  withAPISecurity, 
  validateAndSanitizeBody,
  validateFileUpload,
  getSecurityHeaders
} from '@/lib/api-security'
import { CSRFProtection } from '@/lib/csrf-protection'
import { z } from 'zod'

// Mock the NextRequest since it's not available in test environment
class MockNextRequest {
  url: string
  method: string
  headers: Map<string, string>
  body?: string

  constructor(url: string, options: any = {}) {
    this.url = url
    this.method = options.method || 'GET'
    this.headers = new Map()
    
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        this.headers.set(key, value as string)
      })
    }
    
    if (options.body) {
      this.body = JSON.stringify(options.body)
    }
  }

  async json() {
    return this.body ? JSON.parse(this.body) : {}
  }
}

// Mock NextRequest for testing
function createMockRequest(options: {
  method?: string
  url?: string
  headers?: Record<string, string>
  body?: any
}): any {
  const { method = 'GET', url = 'http://localhost:3000/api/test', headers = {}, body } = options
  
  return new MockNextRequest(url, {
    method,
    headers,
    body,
  })
}

describe('InputSanitizer', () => {
  describe('sanitizeHTML', () => {
    it('should remove dangerous HTML tags', () => {
      const input = '<script>alert("xss")</script><p>Safe content</p>'
      const result = InputSanitizer.sanitizeHTML(input)
      expect(result).not.toContain('<script>')
      expect(result).toContain('<p>Safe content</p>')
    })

    it('should preserve allowed HTML tags', () => {
      const input = '<p>Paragraph</p><strong>Bold</strong><em>Italic</em>'
      const result = InputSanitizer.sanitizeHTML(input)
      expect(result).toContain('<p>Paragraph</p>')
      expect(result).toContain('<strong>Bold</strong>')
      expect(result).toContain('<em>Italic</em>')
    })

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(1)">Click me</a>'
      const result = InputSanitizer.sanitizeHTML(input)
      expect(result).not.toContain('javascript:')
    })
  })

  describe('sanitizeText', () => {
    it('should remove HTML tags from plain text', () => {
      const input = 'Hello <script>alert("xss")</script> World'
      const result = InputSanitizer.sanitizeText(input)
      expect(result).toBe('Hello alert("xss") World')
    })

    it('should remove dangerous URLs', () => {
      const input = 'Visit javascript:alert(1) or data:text/html,<script>alert(1)</script>'
      const result = InputSanitizer.sanitizeText(input)
      expect(result).not.toContain('javascript:')
      expect(result).not.toContain('data:')
    })

    it('should trim whitespace', () => {
      const input = '  Hello World  '
      const result = InputSanitizer.sanitizeText(input)
      expect(result).toBe('Hello World')
    })
  })

  describe('sanitizeFileName', () => {
    it('should remove dangerous characters', () => {
      const input = '../../../etc/passwd'
      const result = InputSanitizer.sanitizeFileName(input)
      expect(result).toBe('etcpasswd')
    })

    it('should preserve safe characters', () => {
      const input = 'my-file_name.txt'
      const result = InputSanitizer.sanitizeFileName(input)
      expect(result).toBe('my-file_name.txt')
    })

    it('should limit length', () => {
      const input = 'a'.repeat(300)
      const result = InputSanitizer.sanitizeFileName(input)
      expect(result.length).toBeLessThanOrEqual(255)
    })
  })

  describe('sanitizeObject', () => {
    it('should sanitize nested objects', () => {
      const input = {
        name: '<script>alert("xss")</script>John',
        details: {
          description: 'Safe content',
          url: 'javascript:alert(1)'
        },
        tags: ['<script>tag1</script>', 'tag2']
      }
      
      const result = InputSanitizer.sanitizeObject(input)
      expect(result.name).not.toContain('<script>')
      expect(result.details.url).not.toContain('javascript:')
      expect(result.tags[0]).not.toContain('<script>')
    })

    it('should throw error for objects that are too deep', () => {
      let deepObject: any = {}
      let current = deepObject
      
      // Create object deeper than limit
      for (let i = 0; i < 15; i++) {
        current.nested = {}
        current = current.nested
      }
      
      expect(() => InputSanitizer.sanitizeObject(deepObject)).toThrow('Object depth limit exceeded')
    })

    it('should throw error for arrays that are too long', () => {
      const longArray = new Array(2000).fill('item')
      expect(() => InputSanitizer.sanitizeObject(longArray)).toThrow('Array length limit exceeded')
    })
  })
})

describe('CSRFProtection', () => {
  beforeEach(() => {
    // Clear any existing tokens
    CSRFProtection['tokens'].clear()
  })

  describe('generateToken', () => {
    it('should generate a valid token', () => {
      const sessionId = 'test-session'
      const token = CSRFProtection.generateToken(sessionId)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })

    it('should generate different tokens for different sessions', () => {
      const token1 = CSRFProtection.generateToken('session1')
      const token2 = CSRFProtection.generateToken('session2')
      
      expect(token1).not.toBe(token2)
    })
  })

  describe('validateToken', () => {
    it('should validate a valid token', async () => {
      const sessionId = 'test-session'
      const token = CSRFProtection.generateToken(sessionId)
      
      const result = await CSRFProtection.validateToken(token, sessionId)
      expect(result.valid).toBe(true)
    })

    it('should reject invalid token', async () => {
      const result = await CSRFProtection.validateToken('invalid-token', 'session')
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Invalid token format')
    })

    it('should reject token for wrong session', async () => {
      const sessionId = 'test-session'
      const token = CSRFProtection.generateToken(sessionId)
      
      const result = await CSRFProtection.validateToken(token, 'different-session')
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Session mismatch')
    })

    it('should reject expired token', async () => {
      const sessionId = 'test-session'
      const token = CSRFProtection.generateToken(sessionId)
      
      // Mock expired token by manipulating the internal store
      const tokenData = CSRFProtection['tokens'].values().next().value
      if (tokenData) {
        tokenData.expires = Date.now() - 1000 // Expired 1 second ago
      }
      
      const result = await CSRFProtection.validateToken(token, sessionId)
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Token expired')
    })
  })

  describe('invalidateToken', () => {
    it('should invalidate a specific token', () => {
      const sessionId = 'test-session'
      const token = CSRFProtection.generateToken(sessionId)
      
      const result = CSRFProtection.invalidateToken(token)
      expect(result).toBe(true)
      
      // Token should no longer be valid
      CSRFProtection.validateToken(token, sessionId).then(validation => {
        expect(validation.valid).toBe(false)
      })
    })
  })

  describe('invalidateSessionTokens', () => {
    it('should invalidate all tokens for a session', () => {
      const sessionId = 'test-session'
      CSRFProtection.generateToken(sessionId)
      CSRFProtection.generateToken(sessionId)
      CSRFProtection.generateToken('other-session')
      
      const count = CSRFProtection.invalidateSessionTokens(sessionId)
      expect(count).toBe(2)
    })
  })
})

describe('validateAndSanitizeBody', () => {
  const testSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    age: z.number().positive(),
  })

  it('should validate and sanitize valid data', async () => {
    const request = createMockRequest({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      }
    })

    const result = await validateAndSanitizeBody(request, testSchema)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('John Doe')
      expect(result.data.email).toBe('john@example.com')
      expect(result.data.age).toBe(25)
    }
  })

  it('should reject invalid data', async () => {
    const request = createMockRequest({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: {
        name: '',
        email: 'invalid-email',
        age: -5
      }
    })

    const result = await validateAndSanitizeBody(request, testSchema)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Validation failed')
      expect(result.details).toBeDefined()
    }
  })

  it('should sanitize dangerous content', async () => {
    const request = createMockRequest({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: {
        name: '<script>alert("xss")</script>John',
        email: 'john@example.com',
        age: 25
      }
    })

    const result = await validateAndSanitizeBody(request, testSchema)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).not.toContain('<script>')
    }
  })
})

describe('validateFileUpload', () => {
  // Mock File constructor for Node.js environment
  class MockFile {
    name: string
    type: string
    size: number

    constructor(content: string[], name: string, options: { type: string }) {
      this.name = name
      this.type = options.type
      this.size = 1024 // Default size
    }
  }

  // Replace global File with mock in Node.js environment
  const OriginalFile = global.File
  beforeAll(() => {
    global.File = MockFile as any
  })

  afterAll(() => {
    global.File = OriginalFile
  })

  it('should accept valid file', () => {
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' }) as any
    file.size = 1024 * 1024 // 1MB
    
    const result = validateFileUpload(file)
    expect(result.valid).toBe(true)
  })

  it('should reject file that is too large', () => {
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' }) as any
    file.size = 10 * 1024 * 1024 // 10MB
    
    const result = validateFileUpload(file)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('File size exceeds limit')
  })

  it('should reject disallowed file type', () => {
    const file = new File(['content'], 'test.exe', { type: 'application/x-executable' }) as any
    file.size = 1024
    
    const result = validateFileUpload(file)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('File type')
  })

  it('should reject dangerous file extensions', () => {
    const file = new File(['content'], 'malware.exe', { type: 'image/jpeg' }) as any
    file.size = 1024
    
    const result = validateFileUpload(file)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('File type not allowed for security reasons')
  })

  it('should reject files with invalid characters in name', () => {
    const file = new File(['content'], '../../../etc/passwd', { type: 'image/jpeg' }) as any
    file.size = 1024
    
    const result = validateFileUpload(file)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Invalid characters in file name')
  })
})

describe('getSecurityHeaders', () => {
  it('should return comprehensive security headers', () => {
    const headers = getSecurityHeaders()
    
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['X-XSS-Protection']).toBe('1; mode=block')
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['Content-Security-Policy']).toContain("default-src 'self'")
    expect(headers['X-Security-Monitored']).toBe('true')
  })

  it('should include HSTS in production', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    
    const headers = getSecurityHeaders()
    expect(headers['Strict-Transport-Security']).toBeDefined()
    
    process.env.NODE_ENV = originalEnv
  })
})

describe('withAPISecurity middleware', () => {
  const mockHandler = jest.fn().mockResolvedValue(new Response('OK'))

  beforeEach(() => {
    mockHandler.mockClear()
  })

  it('should allow valid requests', async () => {
    const securedHandler = withAPISecurity(mockHandler, {
      allowedMethods: ['GET', 'POST']
    })

    const request = createMockRequest({
      method: 'GET',
      headers: { 'content-type': 'application/json' }
    })

    await securedHandler(request)
    expect(mockHandler).toHaveBeenCalled()
  })

  it('should reject disallowed methods', async () => {
    const securedHandler = withAPISecurity(mockHandler, {
      allowedMethods: ['GET']
    })

    const request = createMockRequest({
      method: 'DELETE'
    })

    const response = await securedHandler(request)
    expect(response.status).toBe(405)
    expect(mockHandler).not.toHaveBeenCalled()
  })

  it('should add security headers to response', async () => {
    const securedHandler = withAPISecurity(mockHandler)

    const request = createMockRequest({
      method: 'GET'
    })

    const response = await securedHandler(request)
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
  })

  it('should validate content type for POST requests', async () => {
    const securedHandler = withAPISecurity(mockHandler)

    const request = createMockRequest({
      method: 'POST',
      headers: { 'content-type': 'text/plain' }
    })

    const response = await securedHandler(request)
    expect(response.status).toBe(400)
    expect(mockHandler).not.toHaveBeenCalled()
  })
})