# Client-Side Security Implementation

This document describes the comprehensive client-side security measures implemented in the CMS application.

## Overview

The client-side security system provides multiple layers of protection including:

- **Content Security Policy (CSP)** headers for XSS prevention
- **Input validation and sanitization** for all user inputs
- **CSRF protection** with token-based validation
- **Secure form handling** with comprehensive validation
- **File upload security** with type and content validation
- **Security monitoring** and violation detection
- **Bot detection** and suspicious activity monitoring

## Security Features

### 1. Content Security Policy (CSP)

Enhanced CSP headers are configured in `next.config.js`:

```javascript
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: https: blob:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://vercel.live wss://ws-us3.pusher.com",
  "media-src 'self' data: blob:",
  "object-src 'none'",
  "child-src 'none'",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "manifest-src 'self'",
  "upgrade-insecure-requests"
];
```

Additional security headers:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`

### 2. Input Validation and Sanitization

The `ClientInputSanitizer` class provides comprehensive input sanitization:

```typescript
import { ClientInputSanitizer } from '@/lib/client-security'

// Sanitize text input
const cleanText = ClientInputSanitizer.sanitizeText(userInput)

// Sanitize HTML content
const cleanHTML = ClientInputSanitizer.sanitizeHTML(htmlInput, ['p', 'strong', 'em'])

// Sanitize email addresses
const cleanEmail = ClientInputSanitizer.sanitizeEmail(emailInput)

// Sanitize URLs
const cleanURL = ClientInputSanitizer.sanitizeURL(urlInput)

// Deep sanitize objects
const cleanObject = ClientInputSanitizer.sanitizeObject(formData)
```

**Features:**
- XSS prevention through HTML tag removal and attribute sanitization
- SQL injection pattern detection
- Dangerous protocol removal (javascript:, data:, vbscript:)
- Path traversal prevention
- Prototype pollution protection
- Input length and complexity validation

### 3. CSRF Protection

CSRF protection is implemented with token-based validation:

```typescript
import { ClientCSRFManager } from '@/lib/client-security'

// Get CSRF token
const token = await ClientCSRFManager.getToken()

// Add token to request headers
const headers = await ClientCSRFManager.addTokenToHeaders()

// Add token to form data
const formData = await ClientCSRFManager.addTokenToFormData(new FormData())
```

**Features:**
- Automatic token generation and validation
- Double-submit cookie protection
- Token expiration and rotation
- Session-based token validation
- IP address and user agent validation (optional)

### 4. Secure Form Handling

The `SecureForm` component provides comprehensive form security:

```tsx
import { SecureForm, SecureField, SecureSubmitButton } from '@/components/forms/SecureForm'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
})

<SecureForm
  schema={schema}
  onSubmit={handleSubmit}
  config={{
    sanitizeInputs: true,
    validateOnBlur: true,
    csrfProtection: true,
    preventDoubleSubmit: true,
    maxSubmissionRate: 3,
    autoSave: false
  }}
>
  <SecureField name="name" type="text" required>
    Name
  </SecureField>
  
  <SecureField name="email" type="email" required>
    Email
  </SecureField>
  
  <SecureSubmitButton>
    Submit
  </SecureSubmitButton>
</SecureForm>
```

**Features:**
- Real-time input validation and sanitization
- CSRF token automatic inclusion
- Rate limiting and double-submit prevention
- Bot detection with honeypot fields
- Auto-save functionality with security checks
- Comprehensive error handling and reporting

### 5. File Upload Security

File upload validation with security checks:

```typescript
import { ClientFileValidator } from '@/lib/client-security'

const validation = ClientFileValidator.validateFile(file, {
  allowedTypes: ['image/jpeg', 'image/png'],
  maxSize: 5 * 1024 * 1024, // 5MB
  checkContent: true
})

if (validation.valid) {
  // File is safe to upload
} else {
  console.error(validation.error)
}
```

**Features:**
- File type validation (MIME type and extension)
- File size limits
- Dangerous file extension detection
- File name sanitization
- Content-based validation
- Multiple file validation

### 6. Security Monitoring

The security monitoring system tracks and reports violations:

```typescript
import { useClientSecurity } from '@/components/providers/ClientSecurityProvider'

const { 
  securityViolations,
  reportSecurityViolation,
  securityStatus,
  securityScore 
} = useClientSecurity()

// Report a security violation
reportSecurityViolation('suspicious_activity', { 
  activity: 'rapid_form_submission',
  count: 5 
})
```

**Monitored Events:**
- XSS attempts
- CSRF token violations
- Suspicious input patterns
- Rapid form submissions
- Bot-like behavior
- CSP violations
- JavaScript errors
- File upload violations

### 7. Secure API Requests

The `SecureFetch` class provides secure API communication:

```typescript
import { SecureFetch } from '@/lib/client-security'

// Secure POST request with automatic CSRF protection
const response = await SecureFetch.post('/api/users', userData)

// Secure request with custom options
const response = await SecureFetch.fetch('/api/data', {
  method: 'GET',
  sanitizeBody: true,
  validateResponse: true
})
```

**Features:**
- Automatic CSRF token inclusion
- Request body sanitization
- Response validation
- Error handling and reporting
- Security header injection

## Security Hooks

### useCSRFToken

Manages CSRF token lifecycle:

```typescript
const { token, loading, error, refreshToken, clearToken } = useCSRFToken()
```

### useSecureForm

Provides secure form handling:

```typescript
const { validateField, validateForm, submitForm } = useSecureForm(schema, config)
```

### useInputSanitizer

Provides input sanitization utilities:

```typescript
const { sanitizeText, sanitizeHTML, sanitizeEmail } = useInputSanitizer()
```

### useSecureAPI

Provides secure API request utilities:

```typescript
const { get, post, put, delete: del, loading, error } = useSecureAPI()
```

### useSecurityMonitor

Provides security monitoring capabilities:

```typescript
const { violations, reportViolation, getViolationCount } = useSecurityMonitor()
```

## Configuration

### Security Configuration

Client-side security can be configured through the `CLIENT_SECURITY_CONFIG`:

```typescript
export const CLIENT_SECURITY_CONFIG = {
  maxStringLength: 10000,
  maxArrayLength: 1000,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  allowedDocumentTypes: ['application/pdf', 'text/plain', 'text/csv'],
  dangerousPatterns: [/* XSS and injection patterns */],
  suspiciousKeywords: [/* Suspicious keywords */]
}
```

### Form Security Configuration

Forms can be configured with various security options:

```typescript
interface SecureFormConfig {
  sanitizeInputs?: boolean          // Enable input sanitization
  validateOnChange?: boolean        // Validate on input change
  validateOnBlur?: boolean          // Validate on input blur
  csrfProtection?: boolean          // Enable CSRF protection
  maxSubmissionRate?: number        // Max submissions per minute
  preventDoubleSubmit?: boolean     // Prevent double submission
  autoSave?: boolean               // Enable auto-save
  autoSaveInterval?: number        // Auto-save interval in ms
}
```

## Security Best Practices

### 1. Input Validation

- Always validate and sanitize user inputs
- Use schema-based validation (Zod)
- Implement both client-side and server-side validation
- Check for suspicious patterns and keywords

### 2. CSRF Protection

- Include CSRF tokens in all state-changing requests
- Validate tokens on the server side
- Use double-submit cookie pattern for additional security
- Rotate tokens regularly

### 3. XSS Prevention

- Sanitize all user-generated content
- Use Content Security Policy headers
- Avoid innerHTML and use textContent when possible
- Validate and sanitize HTML attributes

### 4. File Upload Security

- Validate file types and extensions
- Check file size limits
- Scan file content for malicious patterns
- Store uploaded files outside web root
- Use virus scanning for uploaded files

### 5. Security Monitoring

- Monitor for suspicious activities
- Log security violations
- Implement rate limiting
- Use bot detection mechanisms
- Monitor CSP violations

## Error Handling

Security errors are handled through the `ClientValidationError` class:

```typescript
try {
  const cleanInput = ClientInputSanitizer.sanitizeText(userInput)
} catch (error) {
  if (error instanceof ClientValidationError) {
    console.error('Validation error:', error.code, error.message)
    // Handle specific error types
    switch (error.code) {
      case 'XSS_DETECTED':
        // Handle XSS attempt
        break
      case 'DANGEROUS_CONTENT':
        // Handle dangerous content
        break
    }
  }
}
```

## Testing

Comprehensive tests are provided for all security utilities:

```bash
npm test -- __tests__/lib/client-security.test.ts
```

Test coverage includes:
- Input sanitization functions
- XSS prevention utilities
- File validation logic
- CSRF token management
- Form security features
- Error handling scenarios

## Security Monitoring Dashboard

In development mode, a security status indicator is displayed showing:
- Current security status (secure/warning/danger)
- Security score (0-100)
- Number of violations
- CSP violations count

## Integration

The client-side security system is integrated into the application through:

1. **Root Layout**: `ClientSecurityProvider` wraps the entire application
2. **Forms**: Use `SecureForm` components for all user input
3. **API Calls**: Use `SecureFetch` for all API communications
4. **File Uploads**: Use `ClientFileValidator` for file validation
5. **Monitoring**: Security violations are automatically tracked and reported

## Compliance

This implementation helps meet various security compliance requirements:

- **OWASP Top 10**: Protection against common web vulnerabilities
- **GDPR**: Secure handling of personal data
- **SOC 2**: Security controls and monitoring
- **PCI DSS**: Secure data transmission and storage
- **NIST**: Security framework compliance

## Future Enhancements

Planned security enhancements:

1. **Advanced Bot Detection**: Machine learning-based bot detection
2. **Behavioral Analysis**: User behavior pattern analysis
3. **Real-time Threat Intelligence**: Integration with threat intelligence feeds
4. **Advanced File Scanning**: Deep content analysis for uploaded files
5. **Security Analytics**: Advanced security metrics and reporting
6. **Zero Trust Architecture**: Implementation of zero trust principles

## Support

For security-related issues or questions:

1. Check the security monitoring dashboard
2. Review security violation logs
3. Consult this documentation
4. Contact the security team for critical issues

## Security Incident Response

In case of a security incident:

1. **Immediate Response**: Security violations are automatically logged
2. **Investigation**: Use security monitoring data for analysis
3. **Mitigation**: Implement additional security measures as needed
4. **Recovery**: Clear security violations and reset security status
5. **Prevention**: Update security rules and patterns based on findings