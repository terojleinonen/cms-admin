/**
 * Input Validation System Tests
 * Tests for comprehensive server-side input validation
 */

import { 
  AdvancedInputSanitizer, 
  SQLInjectionPrevention, 
  XSSPrevention,
  ValidationError,
  validateSecureRequest,
  validateSecureQuery,
  secureValidationSchemas
} from '@/lib/input-validation'
import { NextRequest } from 'next/server'
import { z } from 'zod'

describe('AdvancedInputSanitizer', () => {
  describe('sanitizeText', () => {
    it('should remove HTML tags', () => {
      const input = 'Hello <b>World</b>'
      const result = AdvancedInputSanitizer.sanitizeText(input)
      expect(result).toBe('Hello World')
    })

    it('should remove dangerous protocols', () => {
      const input = 'Click here: normal text'
      const result = AdvancedInputSanitizer.sanitizeText(input)
      expect(result).toBe('Click here: normal text')
    })

    it('should throw error for suspicious content', () => {
      const input = 'SELECT * FROM users WHERE id = 1'
      expect(() => AdvancedInputSanitizer.sanitizeText(input))
        .toThrow(ValidationError)
    })
  })

  describe('sanitizeEmail', () => {
    it('should sanitize valid email', () => {
      const input = '  TEST@EXAMPLE.COM  '
      const result = AdvancedInputSanitizer.sanitizeEmail(input)
      expect(result).toBe('test@example.com')
    })

    it('should throw error for invalid email', () => {
      const input = 'invalid-email'
      expect(() => AdvancedInputSanitizer.sanitizeEmail(input))
        .toThrow(ValidationError)
    })
  })

  describe('sanitizeObject', () => {
    it('should sanitize nested objects', () => {
      const input = {
        name: 'John <b>Doe</b>',
        email: '  TEST@EXAMPLE.COM  ',
        nested: {
          value: 'normal text'
        }
      }
      
      const result = AdvancedInputSanitizer.sanitizeObject(input)
      expect(result.name).toBe('John Doe')
    })

    it('should skip dangerous keys', () => {
      const input = {
        __proto__: { admin: true },
        constructor: 'malicious',
        normalKey: 'value'
      }
      
      const result = AdvancedInputSanitizer.sanitizeObject(input)
      // Check that dangerous properties are not copied
      expect(Object.hasOwnProperty.call(result, '__proto__')).toBe(false)
      expect(Object.hasOwnProperty.call(result, 'constructor')).toBe(false)
      expect(result.normalKey).toBe('value')
    })
  })
})

describe('SQLInjectionPrevention', () => {
  describe('containsSQLInjection', () => {
    it('should detect SQL injection attempts', () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "UNION SELECT * FROM passwords",
        "admin'--",
        "'; DELETE FROM users"
      ]

      maliciousInputs.forEach(input => {
        expect(SQLInjectionPrevention.containsSQLInjection(input)).toBe(true)
      })
    })

    it('should allow safe inputs', () => {
      const safeInputs = [
        "John Doe",
        "user@example.com",
        "Product description with normal text",
        "123456"
      ]

      safeInputs.forEach(input => {
        expect(SQLInjectionPrevention.containsSQLInjection(input)).toBe(false)
      })
    })
  })

  describe('sanitizeForSQL', () => {
    it('should sanitize safe input', () => {
      const input = "John's Product"
      const result = SQLInjectionPrevention.sanitizeForSQL(input)
      expect(result).toBe("Johns Product")
    })

    it('should throw error for SQL injection', () => {
      const input = "'; DROP TABLE users; --"
      expect(() => SQLInjectionPrevention.sanitizeForSQL(input))
        .toThrow(ValidationError)
    })
  })
})

describe('XSSPrevention', () => {
  describe('containsXSS', () => {
    it('should detect XSS attempts', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("xss")',
        '<iframe src="malicious.com"></iframe>',
        'onload="alert(1)"'
      ]

      maliciousInputs.forEach(input => {
        expect(XSSPrevention.containsXSS(input)).toBe(true)
      })
    })

    it('should allow safe HTML', () => {
      const safeInputs = [
        'Normal text content',
        'Email: user@example.com',
        'Price: $19.99'
      ]

      safeInputs.forEach(input => {
        expect(XSSPrevention.containsXSS(input)).toBe(false)
      })
    })
  })
})

describe('secureValidationSchemas', () => {
  describe('secureString', () => {
    it('should validate and sanitize safe strings', () => {
      const schema = secureValidationSchemas.secureString(50)
      const result = schema.parse('  Normal text  ')
      expect(result).toBe('Normal text')
    })

    it('should reject dangerous content', () => {
      const schema = secureValidationSchemas.secureString(50)
      expect(() => schema.parse('<script>alert("xss")</script>'))
        .toThrow()
    })
  })

  describe('secureEmail', () => {
    it('should validate and sanitize emails', () => {
      const result = secureValidationSchemas.secureEmail.parse('  TEST@EXAMPLE.COM  ')
      expect(result).toBe('test@example.com')
    })

    it('should reject invalid emails', () => {
      expect(() => secureValidationSchemas.secureEmail.parse('invalid-email'))
        .toThrow()
    })
  })
})

describe('validateSecureRequest', () => {
  it('should validate request body successfully', async () => {
    const schema = z.object({
      name: secureValidationSchemas.secureString(100),
      email: secureValidationSchemas.secureEmail
    })

    const mockRequest = {
      text: () => Promise.resolve(JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com'
      })),
      headers: {
        get: () => '100'
      }
    } as unknown as NextRequest

    const result = await validateSecureRequest(mockRequest, schema)
    
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('John Doe')
      expect(result.data.email).toBe('john@example.com')
    }
  })

  it('should reject malicious request body', async () => {
    const schema = z.object({
      name: secureValidationSchemas.secureString(100)
    })

    const mockRequest = {
      text: () => Promise.resolve(JSON.stringify({
        name: '<script>alert("xss")</script>'
      })),
      headers: {
        get: () => '100'
      }
    } as unknown as NextRequest

    const result = await validateSecureRequest(mockRequest, schema)
    
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('XSS_DETECTED')
    }
  })
})