/**
 * Client-Side Security Tests
 * Tests for client-side security utilities and components
 */

import { 
  ClientInputSanitizer, 
  ClientXSSPrevention, 
  ClientFileValidator,
  ClientValidationError,
  CLIENT_SECURITY_CONFIG 
} from '../../app/lib/client-security'

// Mock DOM environment for tests
const mockDocument = {
  createElement: jest.fn(() => ({
    innerHTML: '',
    textContent: '',
    querySelectorAll: jest.fn(() => []),
    setAttribute: jest.fn(),
    removeAttribute: jest.fn(),
    hasAttribute: jest.fn(() => false),
    getAttribute: jest.fn(() => null),
    remove: jest.fn(),
    parentNode: {
      replaceChild: jest.fn()
    }
  })),
  createTextNode: jest.fn(() => ({}))
}

// Mock global document
Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true
})

describe('ClientInputSanitizer', () => {
  describe('sanitizeText', () => {
    it('should sanitize basic text input', () => {
      const input = 'Hello <script>alert("xss")</script> World'
      const result = ClientInputSanitizer.sanitizeText(input)
      expect(result).toBe('Hello  World')
    })

    it('should remove dangerous protocols', () => {
      const input = 'Click javascript:alert("xss") here'
      const result = ClientInputSanitizer.sanitizeText(input)
      expect(result).toBe('Click  here')
    })

    it('should normalize whitespace', () => {
      const input = 'Hello    \n\n   World   '
      const result = ClientInputSanitizer.sanitizeText(input)
      expect(result).toBe('Hello World')
    })

    it('should throw error for suspicious content', () => {
      const input = 'SELECT * FROM users WHERE password = "admin"'
      expect(() => ClientInputSanitizer.sanitizeText(input)).toThrow(ClientValidationError)
    })

    it('should handle non-string input', () => {
      const result = ClientInputSanitizer.sanitizeText(123 as any)
      expect(result).toBe('123')
    })
  })

  describe('sanitizeEmail', () => {
    it('should sanitize valid email', () => {
      const email = '  TEST@EXAMPLE.COM  '
      const result = ClientInputSanitizer.sanitizeEmail(email)
      expect(result).toBe('test@example.com')
    })

    it('should throw error for invalid email', () => {
      const email = 'invalid-email'
      expect(() => ClientInputSanitizer.sanitizeEmail(email)).toThrow(ClientValidationError)
    })

    it('should throw error for email with suspicious patterns', () => {
      const email = 'test..test@example.com'
      expect(() => ClientInputSanitizer.sanitizeEmail(email)).toThrow(ClientValidationError)
    })
  })

  describe('sanitizeURL', () => {
    it('should sanitize valid URL', () => {
      const url = '  https://example.com/path  '
      const result = ClientInputSanitizer.sanitizeURL(url)
      expect(result).toBe('https://example.com/path')
    })

    it('should throw error for invalid URL', () => {
      const url = 'not-a-url'
      expect(() => ClientInputSanitizer.sanitizeURL(url)).toThrow(ClientValidationError)
    })

    it('should throw error for dangerous protocols', () => {
      const url = 'javascript:alert("xss")'
      expect(() => ClientInputSanitizer.sanitizeURL(url)).toThrow(ClientValidationError)
    })
  })

  describe('sanitizeFileName', () => {
    it('should sanitize file name', () => {
      const fileName = '../../etc/passwd'
      const result = ClientInputSanitizer.sanitizeFileName(fileName)
      expect(result).toBe('etcpasswd')
    })

    it('should remove dangerous characters', () => {
      const fileName = 'file<>:"|?*.txt'
      const result = ClientInputSanitizer.sanitizeFileName(fileName)
      expect(result).toBe('file.txt')
    })

    it('should limit length', () => {
      const fileName = 'a'.repeat(300) + '.txt'
      const result = ClientInputSanitizer.sanitizeFileName(fileName)
      expect(result.length).toBeLessThanOrEqual(255)
    })
  })

  describe('sanitizeObject', () => {
    it('should sanitize object properties', () => {
      const obj = {
        name: '<script>alert("xss")</script>John',
        email: '  TEST@EXAMPLE.COM  ',
        age: 25
      }
      const result = ClientInputSanitizer.sanitizeObject(obj)
      expect(result.name).toBe('John')
      expect(result.email).toBe('TEST@EXAMPLE.COM')
      expect(result.age).toBe(25)
    })

    it('should handle nested objects', () => {
      const obj = {
        user: {
          profile: {
            name: '<script>alert("xss")</script>John'
          }
        }
      }
      const result = ClientInputSanitizer.sanitizeObject(obj)
      expect(result.user.profile.name).toBe('John')
    })

    it('should throw error for objects that are too deep', () => {
      let deepObj: any = {}
      let current = deepObj
      for (let i = 0; i < 15; i++) {
        current.nested = {}
        current = current.nested
      }
      
      expect(() => ClientInputSanitizer.sanitizeObject(deepObj)).toThrow(ClientValidationError)
    })

    it('should skip dangerous keys', () => {
      const obj = {
        name: 'John',
        __proto__: { admin: true },
        constructor: { admin: true },
        prototype: { admin: true }
      }
      const result = ClientInputSanitizer.sanitizeObject(obj)
      expect(result.name).toBe('John')
      expect(result.__proto__).toBeUndefined()
      expect(result.constructor).toBeUndefined()
      expect(result.prototype).toBeUndefined()
    })

    it('should handle arrays', () => {
      const obj = {
        tags: ['<script>alert("xss")</script>tag1', 'tag2', 'tag3']
      }
      const result = ClientInputSanitizer.sanitizeObject(obj)
      expect(result.tags[0]).toBe('tag1')
      expect(result.tags[1]).toBe('tag2')
      expect(result.tags[2]).toBe('tag3')
    })

    it('should throw error for arrays that are too large', () => {
      const obj = {
        items: new Array(CLIENT_SECURITY_CONFIG.maxArrayLength + 1).fill('item')
      }
      expect(() => ClientInputSanitizer.sanitizeObject(obj)).toThrow(ClientValidationError)
    })
  })

  describe('containsSuspiciousContent', () => {
    it('should detect suspicious keywords', () => {
      const input = 'This contains javascript code'
      const result = ClientInputSanitizer.containsSuspiciousContent(input)
      expect(result).toBe(true)
    })

    it('should detect dangerous patterns', () => {
      const input = '<script>alert("xss")</script>'
      const result = ClientInputSanitizer.containsSuspiciousContent(input)
      expect(result).toBe(true)
    })

    it('should return false for safe content', () => {
      const input = 'This is safe content'
      const result = ClientInputSanitizer.containsSuspiciousContent(input)
      expect(result).toBe(false)
    })
  })
})

describe('ClientXSSPrevention', () => {
  describe('containsXSS', () => {
    it('should detect script tags', () => {
      const input = '<script>alert("xss")</script>'
      const result = ClientXSSPrevention.containsXSS(input)
      expect(result).toBe(true)
    })

    it('should detect javascript protocol', () => {
      const input = 'javascript:alert("xss")'
      const result = ClientXSSPrevention.containsXSS(input)
      expect(result).toBe(true)
    })

    it('should detect event handlers', () => {
      const input = '<img onload="alert(\'xss\')" src="x">'
      const result = ClientXSSPrevention.containsXSS(input)
      expect(result).toBe(true)
    })

    it('should return false for safe content', () => {
      const input = '<p>This is safe HTML</p>'
      const result = ClientXSSPrevention.containsXSS(input)
      expect(result).toBe(false)
    })
  })

  describe('sanitizeForXSS', () => {
    it('should throw error for XSS content', () => {
      const input = '<script>alert("xss")</script>'
      expect(() => ClientXSSPrevention.sanitizeForXSS(input)).toThrow(ClientValidationError)
    })

    it('should sanitize safe content', () => {
      const input = 'Safe text content'
      const result = ClientXSSPrevention.sanitizeForXSS(input)
      expect(result).toBe('Safe text content')
    })
  })
})

describe('ClientFileValidator', () => {
  // Mock File object
  const createMockFile = (name: string, type: string, size: number): File => {
    return {
      name,
      type,
      size,
      lastModified: Date.now(),
      webkitRelativePath: '',
      stream: jest.fn(),
      arrayBuffer: jest.fn(),
      slice: jest.fn(),
      text: jest.fn()
    } as any
  }

  describe('validateFile', () => {
    it('should validate valid image file', () => {
      const file = createMockFile('image.jpg', 'image/jpeg', 1024 * 1024) // 1MB
      const result = ClientFileValidator.validateFile(file)
      expect(result.valid).toBe(true)
    })

    it('should reject file that is too large', () => {
      const file = createMockFile('large.jpg', 'image/jpeg', 20 * 1024 * 1024) // 20MB
      const result = ClientFileValidator.validateFile(file)
      expect(result.valid).toBe(false)
      expect(result.code).toBe('FILE_TOO_LARGE')
    })

    it('should reject disallowed file type', () => {
      const file = createMockFile('script.js', 'application/javascript', 1024)
      const result = ClientFileValidator.validateFile(file)
      expect(result.valid).toBe(false)
      expect(result.code).toBe('FILE_TYPE_NOT_ALLOWED')
    })

    it('should reject dangerous file extensions', () => {
      const file = createMockFile('malware.exe', 'application/octet-stream', 1024)
      const result = ClientFileValidator.validateFile(file, {
        allowedTypes: ['application/octet-stream']
      })
      expect(result.valid).toBe(false)
      expect(result.code).toBe('DANGEROUS_FILE_TYPE')
    })

    it('should reject files with invalid characters in name', () => {
      const file = createMockFile('file<>:"|?*.jpg', 'image/jpeg', 1024)
      const result = ClientFileValidator.validateFile(file)
      expect(result.valid).toBe(false)
      expect(result.code).toBe('INVALID_FILE_NAME')
    })
  })

  describe('validateFiles', () => {
    it('should validate multiple valid files', () => {
      const files = [
        createMockFile('image1.jpg', 'image/jpeg', 1024),
        createMockFile('image2.png', 'image/png', 2048)
      ]
      const result = ClientFileValidator.validateFiles(files)
      expect(result.valid).toBe(true)
      expect(result.files).toHaveLength(2)
    })

    it('should reject too many files', () => {
      const files = Array.from({ length: 15 }, (_, i) => 
        createMockFile(`image${i}.jpg`, 'image/jpeg', 1024)
      )
      const result = ClientFileValidator.validateFiles(files)
      expect(result.valid).toBe(false)
      expect(result.code).toBe('TOO_MANY_FILES')
    })

    it('should reject if any file is invalid', () => {
      const files = [
        createMockFile('image1.jpg', 'image/jpeg', 1024),
        createMockFile('large.jpg', 'image/jpeg', 20 * 1024 * 1024) // Too large
      ]
      const result = ClientFileValidator.validateFiles(files)
      expect(result.valid).toBe(false)
      expect(result.code).toBe('FILE_TOO_LARGE')
    })
  })
})

describe('ClientValidationError', () => {
  it('should create error with message and code', () => {
    const error = new ClientValidationError('Test error', 'TEST_CODE')
    expect(error.message).toBe('Test error')
    expect(error.code).toBe('TEST_CODE')
    expect(error.name).toBe('ClientValidationError')
  })

  it('should create error with field and details', () => {
    const error = new ClientValidationError('Test error', 'TEST_CODE', 'testField', { extra: 'data' })
    expect(error.field).toBe('testField')
    expect(error.details).toEqual({ extra: 'data' })
  })
})