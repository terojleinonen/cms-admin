# Security Test Report

**Generated:** 2025-10-07T19:11:15.715Z

## Summary

- **Total Tests:** 11
- **Passed:** 0 ✅
- **Failed:** 11 ❌
- **Skipped:** 0 ⏭️
- **Duration:** 33758ms

## Security Issues Summary

- **Critical:** 0 🔴
- **High Risk:** 0 🟠
- **Medium Risk:** 0 🟡
- **Low Risk:** 0 🟢

## Test Suite Results

### Automated Security Scanner

- **Passed:** 0
- **Failed:** 1
- **Skipped:** 0
- **Duration:** 2866ms
- **Errors:**
  - Error running __tests__/security/automated-security-scanner.test.ts: SyntaxError: Unexpected token '>', "
> kin-work"... is not valid JSON

### Permission Boundary Penetration

- **Passed:** 0
- **Failed:** 1
- **Skipped:** 0
- **Duration:** 4274ms
- **Errors:**
  - Error running __tests__/security/permission-boundary-penetration.test.ts: Error: Command failed: npm test -- --testPathPatterns="__tests__/security/permission-boundary-penetration.test.ts" --verbose --json
FAIL unit __tests__/security/permission-boundary-penetration.test.ts
  Permission Boundary Penetration Testing
    Horizontal Privilege Escalation
      ✕ should prevent users from accessing other users data (16 ms)
      ✕ should prevent users from accessing other users profiles (1 ms)
      ✕ should prevent users from modifying other users data (2 ms)
    Vertical Privilege Escalation
      ✕ should prevent viewers from performing editor actions (8 ms)
      ✕ should prevent editors from performing admin actions
      ✕ should prevent role self-elevation
    Resource Boundary Violations
      ✕ should prevent access to resources outside user scope
      ✕ should prevent bulk operations without proper permissions (1 ms)
      ✕ should prevent access to audit logs without admin role (1 ms)
    API Endpoint Boundary Testing
      ✕ should test all API endpoints for proper permission enforcement (2 ms)
      ✕ should prevent parameter tampering in API requests (1 ms)
    Session and Token Boundary Testing
      ✕ should prevent session hijacking attempts (2 ms)
      ✕ should prevent token replay attacks (1 ms)
      ✕ should prevent cross-site request forgery (1 ms)

  ● Permission Boundary Penetration Testing › Horizontal Privilege Escalation › should prevent users from accessing other users data

    TypeError: Failed to parse URL from /api/products/test-product-id


    Cause:
    TypeError: Invalid URL

      36 |
      37 |       // User1 attempts to access user2's product
    > 38 |       const response = await fetch(`/api/products/${product.id}`, {
         |                              ^
      39 |         method: 'PUT',
      40 |         headers: {
      41 |           'Content-Type': 'application/json',

      at Object.<anonymous> (__tests__/security/permission-boundary-penetration.test.ts:38:30)

  ● Permission Boundary Penetration Testing › Horizontal Privilege Escalation › should prevent users from accessing other users profiles

    TypeError: Failed to parse URL from /api/users/test-user-id


    Cause:
    TypeError: Invalid URL

      65 |
      66 |       // User1 attempts to access user2's profile
    > 67 |       const response = await fetch(`/api/users/${user2.id}`, {
         |                              ^
      68 |         headers: {
      69 |           'Authorization': `Bearer ${session1.accessToken}`
      70 |         }

      at Object.<anonymous> (__tests__/security/permission-boundary-penetration.test.ts:67:30)

  ● Permission Boundary Penetration Testing › Horizontal Privilege Escalation › should prevent users from modifying other users data

    TypeError: Failed to parse URL from /api/users/test-user-id


    Cause:
    TypeError: Invalid URL

      80 |
      81 |       // User1 attempts to modify user2's profile
    > 82 |       const response = await fetch(`/api/users/${user2.id}`, {
         |                              ^
      83 |         method: 'PUT',
      84 |         headers: {
      85 |           'Content-Type': 'application/json',

      at Object.<anonymous> (__tests__/security/permission-boundary-penetration.test.ts:82:30)

  ● Permission Boundary Penetration Testing › Vertical Privilege Escalation › should prevent viewers from performing editor actions

    TypeError: Failed to parse URL from /api/products


    Cause:
    TypeError: Invalid URL

      109 |
      110 |       // Attempt to create product (editor action)
    > 111 |       const response = await fetch('/api/products', {
          |                              ^
      112 |         method: 'POST',
      113 |         headers: {
      114 |           'Content-Type': 'application/json',

      at Object.<anonymous> (__tests__/security/permission-boundary-penetration.test.ts:111:30)

  ● Permission Boundary Penetration Testing › Vertical Privilege Escalation › should prevent editors from performing admin actions

    TypeError: Failed to parse URL from /api/admin/users


    Cause:
    TypeError: Invalid URL

      137 |
      138 |       // Attempt to access admin user management
    > 139 |       const response = await fetch('/api/admin/users', {
          |                              ^
      140 |         headers: {
      141 |           'Authorization': `Bearer ${session.accessToken}`
      142 |         }

      at Object.<anonymous> (__tests__/security/permission-boundary-penetration.test.ts:139:30)

  ● Permission Boundary Penetration Testing › Vertical Privilege Escalation › should prevent role self-elevation

    TypeError: Failed to parse URL from /api/users/test-user-id


    Cause:
    TypeError: Invalid URL

      151 |
      152 |       // Attempt to elevate own role to admin
    > 153 |       const response = await fetch(`/api/users/${editor.id}`, {
          |                              ^
      154 |         method: 'PUT',
      155 |         headers: {
      156 |           'Content-Type': 'application/json',

      at Object.<anonymous> (__tests__/security/permission-boundary-penetration.test.ts:153:30)

  ● Permission Boundary Penetration Testing › Resource Boundary Violations › should prevent access to resources outside user scope

    TypeError: Failed to parse URL from /api/admin/database


    Cause:
    TypeError: Invalid URL

      186 |
      187 |       for (const endpoint of systemEndpoints) {
    > 188 |         const response = await fetch(endpoint, {
          |                                ^
      189 |           headers: {
      190 |             'Authorization': `Bearer ${session.accessToken}`
      191 |           }

      at Object.<anonymous> (__tests__/security/permission-boundary-penetration.test.ts:188:32)

  ● Permission Boundary Penetration Testing › Resource Boundary Violations › should prevent bulk operations without proper permissions

    TypeError: Failed to parse URL from /api/products/bulk-delete


    Cause:
    TypeError: Invalid URL

      201 |
      202 |       // Attempt bulk delete
    > 203 |       const response = await fetch('/api/products/bulk-delete', {
          |                              ^
      204 |         method: 'DELETE',
      205 |         headers: {
      206 |           'Content-Type': 'application/json',

      at Object.<anonymous> (__tests__/security/permission-boundary-penetration.test.ts:203:30)

  ● Permission Boundary Penetration Testing › Resource Boundary Violations › should prevent access to audit logs without admin role

    TypeError: Failed to parse URL from /api/audit-logs


    Cause:
    TypeError: Invalid URL

      226 |
      227 |       for (const endpoint of auditEndpoints) {
    > 228 |         const response = await fetch(endpoint, {
          |                                ^
      229 |           headers: {
      230 |             'Authorization': `Bearer ${session.accessToken}`
      231 |           }

      at Object.<anonymous> (__tests__/security/permission-boundary-penetration.test.ts:228:32)

  ● Permission Boundary Penetration Testing › API Endpoint Boundary Testing › should test all API endpoints for proper permission enforcement

    TypeError: Failed to parse URL from /api/products


    Cause:
    TypeError: Invalid URL

      255 |
      256 |         for (const endpoint of endpoints) {
    > 257 |           const response = await fetch(endpoint.path, {
          |                                  ^
      258 |             method: endpoint.method,
      259 |             headers: {
      260 |               'Authorization': `Bearer ${session.accessToken}`,

      at Object.<anonymous> (__tests__/security/permission-boundary-penetration.test.ts:257:34)

  ● Permission Boundary Penetration Testing › API Endpoint Boundary Testing › should prevent parameter tampering in API requests

    TypeError: Failed to parse URL from /api/user/preferences


    Cause:
    TypeError: Invalid URL

      290 |
      291 |       for (const attempt of tamperingAttempts) {
    > 292 |         const response = await fetch('/api/user/preferences', {
          |                                ^
      293 |           method: 'PUT',
      294 |           headers: {
      295 |             'Content-Type': 'application/json',

      at Object.<anonymous> (__tests__/security/permission-boundary-penetration.test.ts:292:32)

  ● Permission Boundary Penetration Testing › Session and Token Boundary Testing › should prevent session hijacking attempts

    TypeError: Failed to parse URL from /api/users/test-user-id


    Cause:
    TypeError: Invalid URL

      313 |
      314 |       // Attempt to use admin session with viewer user ID
    > 315 |       const response = await fetch(`/api/users/${user2.id}`, {
          |                              ^
      316 |         method: 'PUT',
      317 |         headers: {
      318 |           'Content-Type': 'application/json',

      at Object.<anonymous> (__tests__/security/permission-boundary-penetration.test.ts:315:30)

  ● Permission Boundary Penetration Testing › Session and Token Boundary Testing › should prevent token replay attacks

    TypeError: Failed to parse URL from /api/products


    Cause:
    TypeError: Invalid URL

      334 |
      335 |       // Make initial request
    > 336 |       const response1 = await fetch('/api/products', {
          |                               ^
      337 |         headers: {
      338 |           'Authorization': `Bearer ${session.accessToken}`
      339 |         }

      at Object.<anonymous> (__tests__/security/permission-boundary-penetration.test.ts:336:31)

  ● Permission Boundary Penetration Testing › Session and Token Boundary Testing › should prevent cross-site request forgery

    TypeError: Failed to parse URL from /api/products


    Cause:
    TypeError: Invalid URL

      361 |
      362 |       // Attempt CSRF attack without proper headers
    > 363 |       const response = await fetch('/api/products', {
          |                              ^
      364 |         method: 'POST',
      365 |         headers: {
      366 |           'Authorization': `Bearer ${session.accessToken}`,

      at Object.<anonymous> (__tests__/security/permission-boundary-penetration.test.ts:363:30)

Test Suites: 1 failed, 1 total
Tests:       14 failed, 14 total
Snapshots:   0 total
Time:        3.169 s
Ran all test suites matching __tests__/security/permission-boundary-penetration.test.ts.


### Security Regression Testing

- **Passed:** 0
- **Failed:** 1
- **Skipped:** 0
- **Duration:** 3068ms
- **Errors:**
  - Error running __tests__/security/security-regression-testing.test.ts: Error: Command failed: npm test -- --testPathPatterns="__tests__/security/security-regression-testing.test.ts" --verbose --json
FAIL unit __tests__/security/security-regression-testing.test.ts
  Security Regression Testing
    Authentication Regression Tests
      ✕ should prevent authentication bypass via header manipulation (Issue #001) (3 ms)
      ✕ should prevent session fixation attacks (Issue #002)
      ✕ should prevent password reset token reuse (Issue #003) (2 ms)
    Authorization Regression Tests
      ✕ should prevent role elevation via request manipulation (Issue #004) (2 ms)
      ✕ should prevent permission cache poisoning (Issue #005) (1 ms)
      ✕ should prevent IDOR via predictable resource IDs (Issue #006) (1 ms)
    Input Validation Regression Tests
      ✕ should prevent SQL injection in search parameters (Issue #007) (1 ms)
      ✕ should prevent XSS in user-generated content (Issue #008)
      ✕ should prevent path traversal in file operations (Issue #009) (1 ms)
    Rate Limiting Regression Tests
      ✕ should prevent rate limit bypass via header manipulation (Issue #010) (5 ms)
      ✕ should prevent distributed rate limit bypass (Issue #011) (14 ms)
    Session Management Regression Tests
      ✕ should prevent concurrent session abuse (Issue #012) (2 ms)
      ✕ should prevent session token prediction (Issue #013) (2 ms)
    Data Exposure Regression Tests
      ✕ should prevent sensitive data leakage in API responses (Issue #014) (1 ms)
      ✕ should prevent information disclosure in error messages (Issue #015)

  ● Security Regression Testing › Authentication Regression Tests › should prevent authentication bypass via header manipulation (Issue #001)

    TypeError: Failed to parse URL from /api/admin/users


    Cause:
    TypeError: Invalid URL

      30 |
      31 |       for (const headers of bypassHeaders) {
    > 32 |         const response = await fetch('/api/admin/users', { headers })
         |                                ^
      33 |         expect([401, 403]).toContain(response.status)
      34 |       }
      35 |     })

      at Object.<anonymous> (__tests__/security/security-regression-testing.test.ts:32:32)

  ● Security Regression Testing › Authentication Regression Tests › should prevent session fixation attacks (Issue #002)

    TypeError: Failed to parse URL from /api/auth/login


    Cause:
    TypeError: Invalid URL

      39 |       const fixedSessionId = 'fixed-session-123'
      40 |       
    > 41 |       const response = await fetch('/api/auth/login', {
         |                              ^
      42 |         method: 'POST',
      43 |         headers: {
      44 |           'Content-Type': 'application/json',

      at Object.<anonymous> (__tests__/security/security-regression-testing.test.ts:41:30)

  ● Security Regression Testing › Authentication Regression Tests › should prevent password reset token reuse (Issue #003)

    TypeError: Failed to parse URL from /api/auth/password-reset


    Cause:
    TypeError: Invalid URL

      63 |       
      64 |       // Request password reset
    > 65 |       const resetResponse = await fetch('/api/auth/password-reset', {
         |                                   ^
      66 |         method: 'POST',
      67 |         headers: { 'Content-Type': 'application/json' },
      68 |         body: JSON.stringify({ email: user.email })

      at Object.<anonymous> (__tests__/security/security-regression-testing.test.ts:65:35)

  ● Security Regression Testing › Authorization Regression Tests › should prevent role elevation via request manipulation (Issue #004)

    TypeError: Failed to parse URL from /api/users/test-user-id


    Cause:
    TypeError: Invalid URL

      111 |
      112 |       for (const attempt of elevationAttempts) {
    > 113 |         const response = await fetch(`/api/users/${editor.id}`, {
          |                                ^
      114 |           method: 'PUT',
      115 |           headers: {
      116 |             'Content-Type': 'application/json',

      at Object.<anonymous> (__tests__/security/security-regression-testing.test.ts:113:32)

  ● Security Regression Testing › Authorization Regression Tests › should prevent permission cache poisoning (Issue #005)

    TypeError: Failed to parse URL from /api/admin/users


    Cause:
    TypeError: Invalid URL

      139 |
      140 |       // Admin makes request to cache admin permissions
    > 141 |       const adminResponse = await fetch('/api/admin/users', {
          |                                   ^
      142 |         headers: { 'Authorization': `Bearer ${adminSession.accessToken}` }
      143 |       })
      144 |       expect(adminResponse.status).toBe(200)

      at Object.<anonymous> (__tests__/security/security-regression-testing.test.ts:141:35)

  ● Security Regression Testing › Authorization Regression Tests › should prevent IDOR via predictable resource IDs (Issue #006)

    TypeError: Failed to parse URL from /api/products/test-product-id


    Cause:
    TypeError: Invalid URL

      171 |
      172 |       // User1 attempts to access user2's resource by ID
    > 173 |       const response = await fetch(`/api/products/${product.id}`, {
          |                              ^
      174 |         method: 'DELETE',
      175 |         headers: { 'Authorization': `Bearer ${session1.accessToken}` }
      176 |       })

      at Object.<anonymous> (__tests__/security/security-regression-testing.test.ts:173:30)

  ● Security Regression Testing › Input Validation Regression Tests › should prevent SQL injection in search parameters (Issue #007)

    TypeError: Failed to parse URL from /api/products?search='%3B%20DROP%20TABLE%20users%3B%20--


    Cause:
    TypeError: Invalid URL

      199 |
      200 |       for (const injection of injectionAttempts) {
    > 201 |         const response = await fetch(`/api/products?search=${encodeURIComponent(injection)}`, {
          |                                ^
      202 |           headers: { 'Authorization': `Bearer ${session.accessToken}` }
      203 |         })
      204 |

      at Object.<anonymous> (__tests__/security/security-regression-testing.test.ts:201:32)

  ● Security Regression Testing › Input Validation Regression Tests › should prevent XSS in user-generated content (Issue #008)

    TypeError: Failed to parse URL from /api/products


    Cause:
    TypeError: Invalid URL

      225 |
      226 |       for (const payload of xssPayloads) {
    > 227 |         const response = await fetch('/api/products', {
          |                                ^
      228 |           method: 'POST',
      229 |           headers: {
      230 |             'Content-Type': 'application/json',

      at Object.<anonymous> (__tests__/security/security-regression-testing.test.ts:227:32)

  ● Security Regression Testing › Input Validation Regression Tests › should prevent path traversal in file operations (Issue #009)

    TypeError: Failed to parse URL from /api/media/upload


    Cause:
    TypeError: Invalid URL

      261 |
      262 |       for (const path of traversalAttempts) {
    > 263 |         const response = await fetch('/api/media/upload', {
          |                                ^
      264 |           method: 'POST',
      265 |           headers: {
      266 |             'Authorization': `Bearer ${session.accessToken}`,

      at Object.<anonymous> (__tests__/security/security-regression-testing.test.ts:263:32)

  ● Security Regression Testing › Rate Limiting Regression Tests › should prevent rate limit bypass via header manipulation (Issue #010)

    TypeError: Failed to parse URL from /api/auth/login


    Cause:
    TypeError: Invalid URL

      288 |       for (const headers of bypassHeaders) {
      289 |         const requests = Array.from({ length: 50 }, () =>
    > 290 |           fetch('/api/auth/login', {
          |           ^
      291 |             method: 'POST',
      292 |             headers: {
      293 |               'Content-Type': 'application/json',

      at __tests__/security/security-regression-testing.test.ts:290:11
          at Array.from (<anonymous>)
      at Object.<anonymous> (__tests__/security/security-regression-testing.test.ts:289:32)

  ● Security Regression Testing › Rate Limiting Regression Tests › should prevent distributed rate limit bypass (Issue #011)

    TypeError: Failed to parse URL from /api/auth/login


    Cause:
    TypeError: Invalid URL

      320 |       for (const userAgent of userAgents) {
      321 |         const requests = Array.from({ length: 30 }, () =>
    > 322 |           fetch('/api/auth/login', {
          |           ^
      323 |             method: 'POST',
      324 |             headers: {
      325 |               'Content-Type': 'application/json',

      at __tests__/security/security-regression-testing.test.ts:322:11
          at Array.from (<anonymous>)
      at Object.<anonymous> (__tests__/security/security-regression-testing.test.ts:321:32)

  ● Security Regression Testing › Session Management Regression Tests › should prevent concurrent session abuse (Issue #012)

    TypeError: Failed to parse URL from /api/products


    Cause:
    TypeError: Invalid URL

      350 |       // Attempt to use multiple sessions simultaneously
      351 |       const requests = sessions.map(session =>
    > 352 |         fetch('/api/products', {
          |         ^
      353 |           headers: { 'Authorization': `Bearer ${session.accessToken}` }
      354 |         })
      355 |       )

      at __tests__/security/security-regression-testing.test.ts:352:9
          at Array.map (<anonymous>)
      at Object.<anonymous> (__tests__/security/security-regression-testing.test.ts:351:33)

  ● Security Regression Testing › Session Management Regression Tests › should prevent session token prediction (Issue #013)

    expect(received).not.toBe(expected) // Object.is equality

    Expected: not undefined

      376 |       for (let i = 0; i < tokens.length - 1; i++) {
      377 |         for (let j = i + 1; j < tokens.length; j++) {
    > 378 |           expect(tokens[i]).not.toBe(tokens[j])
          |                                 ^
      379 |           
      380 |           // Check for sequential patterns
      381 |           const token1Numeric = tokens[i].replace(/\D/g, '')

      at Object.<anonymous> (__tests__/security/security-regression-testing.test.ts:378:33)

  ● Security Regression Testing › Data Exposure Regression Tests › should prevent sensitive data leakage in API responses (Issue #014)

    TypeError: Failed to parse URL from /api/users


    Cause:
    TypeError: Invalid URL

      397 |       const session = createMockSession(admin)
      398 |
    > 399 |       const response = await fetch('/api/users', {
          |                              ^
      400 |         headers: { 'Authorization': `Bearer ${session.accessToken}` }
      401 |       })
      402 |

      at Object.<anonymous> (__tests__/security/security-regression-testing.test.ts:399:30)

  ● Security Regression Testing › Data Exposure Regression Tests › should prevent information disclosure in error messages (Issue #015)

    TypeError: Failed to parse URL from /api/users/999999


    Cause:
    TypeError: Invalid URL

      415 |     it('should prevent information disclosure in error messages (Issue #015)', async () => {
      416 |       // Regression test for information disclosure vulnerability
    > 417 |       const response = await fetch('/api/users/999999')
          |                              ^
      418 |       const error = await response.json()
      419 |
      420 |       // Error messages should not reveal system internals

      at Object.<anonymous> (__tests__/security/security-regression-testing.test.ts:417:30)

Test Suites: 1 failed, 1 total
Tests:       15 failed, 15 total
Snapshots:   0 total
Time:        1.104 s
Ran all test suites matching __tests__/security/security-regression-testing.test.ts.


### API Security Tests

- **Passed:** 0
- **Failed:** 3
- **Skipped:** 0
- **Duration:** 9302ms
- **Errors:**
  - Error running __tests__/lib/api-security.test.ts: SyntaxError: Unexpected token '>', "
> kin-work"... is not valid JSON
  - Error running __tests__/lib/csrf-protection.test.ts: Error: Command failed: npm test -- --testPathPatterns="__tests__/lib/csrf-protection.test.ts" --verbose --json
FAIL unit __tests__/lib/csrf-protection.test.ts
  CSRFProtection
    generateToken
      ✓ should generate a valid token (4 ms)
      ✓ should generate unique tokens (1 ms)
      ✓ should store token data internally (1 ms)
    validateToken
      ✓ should validate a valid token (1 ms)
      ✓ should reject missing token (1 ms)
      ✓ should reject malformed token (1 ms)
      ✕ should reject token with invalid signature (4 ms)
      ✓ should reject token for wrong session (1 ms)
      ✓ should reject expired token (1 ms)
      ✓ should validate token with request context (1 ms)
    invalidateToken
      ✓ should invalidate a specific token (1 ms)
      ✓ should return false for invalid token
    invalidateSessionTokens
      ✓ should invalidate all tokens for a session (1 ms)
    getTokenFromRequest
      ✓ should get token from x-csrf-token header
      ✓ should get token from cookie as fallback (1 ms)
      ✓ should prefer header over cookie (1 ms)
      ✕ should return null if no token found (1 ms)
    middleware
      ✓ should allow GET requests by default (1 ms)
      ✓ should require CSRF token for POST requests (2 ms)
      ✓ should validate CSRF token for POST requests (1 ms)
      ✓ should reject invalid CSRF token (1 ms)
      ✓ should skip specified paths
      ✓ should validate double-submit cookie when required
      ✓ should reject mismatched double-submit cookie (1 ms)
    createTokenResponse
      ✕ should create a valid token response (1 ms)
      ✕ should set secure cookie
    getStats
      ✓ should return accurate statistics (1 ms)
      ✓ should count expired tokens (1 ms)
    convenience functions
      ✓ should export convenience functions
      ✓ should work as expected (1 ms)

  ● CSRFProtection › validateToken › should reject token with invalid signature

    expect(received).toBe(expected) // Object.is equality

    Expected: "Invalid signature"
    Received: "Validation error"

      150 |       const result = await CSRFProtection.validateToken(tamperedToken, sessionId)
      151 |       expect(result.valid).toBe(false)
    > 152 |       expect(result.reason).toBe('Invalid signature')
          |                             ^
      153 |     })
      154 |
      155 |     it('should reject token for wrong session', async () => {

      at Object.<anonymous> (__tests__/lib/csrf-protection.test.ts:152:29)

  ● CSRFProtection › getTokenFromRequest › should return null if no token found

    expect(received).toBeNull()

    Received: undefined

      270 |       
      271 |       const result = CSRFProtection.getTokenFromRequest(request)
    > 272 |       expect(result).toBeNull()
          |                      ^
      273 |     })
      274 |   })
      275 |

      at Object.<anonymous> (__tests__/lib/csrf-protection.test.ts:272:22)

  ● CSRFProtection › createTokenResponse › should create a valid token response

    TypeError: Cannot read properties of undefined (reading 'set')

      284 |
      285 |     // Set cookie for double-submit protection
    > 286 |     response.cookies.set('csrf-token', token, {
          |                      ^
      287 |       httpOnly: false, // Needs to be accessible to JavaScript
      288 |       secure: process.env.NODE_ENV === 'production',
      289 |       sameSite: 'strict',

      at CSRFProtection.createTokenResponse (app/lib/csrf-protection.ts:286:22)
      at Object.<anonymous> (__tests__/lib/csrf-protection.test.ts:395:39)

  ● CSRFProtection › createTokenResponse › should set secure cookie

    TypeError: Cannot read properties of undefined (reading 'set')

      284 |
      285 |     // Set cookie for double-submit protection
    > 286 |     response.cookies.set('csrf-token', token, {
          |                      ^
      287 |       httpOnly: false, // Needs to be accessible to JavaScript
      288 |       secure: process.env.NODE_ENV === 'production',
      289 |       sameSite: 'strict',

      at CSRFProtection.createTokenResponse (app/lib/csrf-protection.ts:286:22)
      at Object.<anonymous> (__tests__/lib/csrf-protection.test.ts:409:39)

Test Suites: 1 failed, 1 total
Tests:       4 failed, 26 passed, 30 total
Snapshots:   0 total
Time:        1.041 s
Ran all test suites matching __tests__/lib/csrf-protection.test.ts.

  - Error running __tests__/lib/input-validation.test.ts: SyntaxError: Unexpected token '>', "
> kin-work"... is not valid JSON

### Authentication Security

- **Passed:** 0
- **Failed:** 2
- **Skipped:** 0
- **Duration:** 5663ms
- **Errors:**
  - Error running __tests__/integration/authentication-flow-integration.test.ts: Error: Command failed: npm test -- --testPathPatterns="__tests__/integration/authentication-flow-integration.test.ts" --verbose --json
  console.error
    Failed to create audit log: ZodError: [
      {
        "origin": "string",
        "code": "invalid_format",
        "format": "uuid",
        "pattern": "/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/",
        "path": [
          "userId"
        ],
        "message": "Invalid UUID"
      }
    ]
        at AuditService.log (/Users/teroleinonen/software projects/cms-admin/app/lib/audit-service.ts:127:51)
        at AuditService.logAuth (/Users/teroleinonen/software projects/cms-admin/app/lib/audit-service.ts:188:17)
        at loginHandler (/Users/teroleinonen/software projects/cms-admin/__tests__/integration/authentication-flow-integration.test.ts:119:28)
        at Object.<anonymous> (/Users/teroleinonen/software projects/cms-admin/__tests__/integration/authentication-flow-integration.test.ts:149:24)

      171 |       return auditLog
      172 |     } catch (error) {
    > 173 |       console.error('Failed to create audit log:', error)
          |               ^
      174 |       throw new Error(`Failed to create audit log: ${error instanceof Error ? error.message : 'Unknown error'}`)
      175 |     }
      176 |   }

      at AuditService.log (app/lib/audit-service.ts:173:15)
      at AuditService.logAuth (app/lib/audit-service.ts:188:17)
      at loginHandler (__tests__/integration/authentication-flow-integration.test.ts:119:28)
      at Object.<anonymous> (__tests__/integration/authentication-flow-integration.test.ts:149:24)

  console.error
    Failed to create audit log: ZodError: [
      {
        "origin": "string",
        "code": "invalid_format",
        "format": "uuid",
        "pattern": "/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/",
        "path": [
          "userId"
        ],
        "message": "Invalid UUID"
      }
    ]
        at AuditService.log (/Users/teroleinonen/software projects/cms-admin/app/lib/audit-service.ts:127:51)
        at AuditService.logAuth (/Users/teroleinonen/software projects/cms-admin/app/lib/audit-service.ts:188:17)
        at loginHandler (/Users/teroleinonen/software projects/cms-admin/__tests__/integration/authentication-flow-integration.test.ts:204:30)
        at Object.<anonymous> (/Users/teroleinonen/software projects/cms-admin/__tests__/integration/authentication-flow-integration.test.ts:252:24)

      171 |       return auditLog
      172 |     } catch (error) {
    > 173 |       console.error('Failed to create audit log:', error)
          |               ^
      174 |       throw new Error(`Failed to create audit log: ${error instanceof Error ? error.message : 'Unknown error'}`)
      175 |     }
      176 |   }

      at AuditService.log (app/lib/audit-service.ts:173:15)
      at AuditService.logAuth (app/lib/audit-service.ts:188:17)
      at loginHandler (__tests__/integration/authentication-flow-integration.test.ts:204:30)
      at Object.<anonymous> (__tests__/integration/authentication-flow-integration.test.ts:252:24)

FAIL unit __tests__/integration/authentication-flow-integration.test.ts
  Authentication Flow Integration Tests
    Login Flow Integration
      ✕ should handle complete login flow with session creation and audit logging (100 ms)
      ✕ should handle failed login attempts with security monitoring (3 ms)
    Session Management Integration
      ✕ should handle session validation and renewal (1 ms)
      ✕ should handle logout with session cleanup

  ● Authentication Flow Integration Tests › Login Flow Integration › should handle complete login flow with session creation and audit logging

    Failed to create audit log: [
      {
        "origin": "string",
        "code": "invalid_format",
        "format": "uuid",
        "pattern": "/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/",
        "path": [
          "userId"
        ],
        "message": "Invalid UUID"
      }
    ]

      172 |     } catch (error) {
      173 |       console.error('Failed to create audit log:', error)
    > 174 |       throw new Error(`Failed to create audit log: ${error instanceof Error ? error.message : 'Unknown error'}`)
          |             ^
      175 |     }
      176 |   }
      177 |

      at AuditService.log (app/lib/audit-service.ts:174:13)
      at AuditService.logAuth (app/lib/audit-service.ts:188:17)
      at loginHandler (__tests__/integration/authentication-flow-integration.test.ts:119:28)
      at Object.<anonymous> (__tests__/integration/authentication-flow-integration.test.ts:149:24)

  ● Authentication Flow Integration Tests › Login Flow Integration › should handle failed login attempts with security monitoring

    Failed to create audit log: [
      {
        "origin": "string",
        "code": "invalid_format",
        "format": "uuid",
        "pattern": "/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/",
        "path": [
          "userId"
        ],
        "message": "Invalid UUID"
      }
    ]

      172 |     } catch (error) {
      173 |       console.error('Failed to create audit log:', error)
    > 174 |       throw new Error(`Failed to create audit log: ${error instanceof Error ? error.message : 'Unknown error'}`)
          |             ^
      175 |     }
      176 |   }
      177 |

      at AuditService.log (app/lib/audit-service.ts:174:13)
      at AuditService.logAuth (app/lib/audit-service.ts:188:17)
      at loginHandler (__tests__/integration/authentication-flow-integration.test.ts:204:30)
      at Object.<anonymous> (__tests__/integration/authentication-flow-integration.test.ts:252:24)

  ● Authentication Flow Integration Tests › Session Management Integration › should handle session validation and renewal

    TypeError: Cannot destructure property 'user' of 'undefined' as it is undefined.

      294 |
      295 |       const sessionHandler = withApiPermissions(
    > 296 |         async (request: NextRequest, { user: authenticatedUser }) => {
          |                                              ^
      297 |           const session = await prisma.session.findFirst({
      298 |             where: {
      299 |               userId: authenticatedUser!.id,

      at sessionHandler.permissions.resource (__tests__/integration/authentication-flow-integration.test.ts:296:46)
      at Object.<anonymous> (__tests__/integration/authentication-flow-integration.test.ts:344:30)

  ● Authentication Flow Integration Tests › Session Management Integration › should handle logout with session cleanup

    TypeError: Cannot destructure property 'user' of 'undefined' as it is undefined.

      365 |
      366 |       const logoutHandler = withApiPermissions(
    > 367 |         async (request: NextRequest, { user: authenticatedUser }) => {
          |                                              ^
      368 |           const body = await request.json();
      369 |           
      370 |           // Deactivate session

      at logoutHandler.skipPermissionCheck (__tests__/integration/authentication-flow-integration.test.ts:367:46)
      at Object.<anonymous> (__tests__/integration/authentication-flow-integration.test.ts:401:30)

Test Suites: 1 failed, 1 total
Tests:       4 failed, 4 total
Snapshots:   0 total
Time:        1.755 s
Ran all test suites matching __tests__/integration/authentication-flow-integration.test.ts.

  - Error running __tests__/middleware-security-comprehensive.test.ts: Error: Command failed: npm test -- --testPathPatterns="__tests__/middleware-security-comprehensive.test.ts" --verbose --json
FAIL unit __tests__/middleware-security-comprehensive.test.ts
  Comprehensive Middleware Security Tests
    Route Protection Logic
      Static File Handling
        ✕ should skip middleware for static file: /_next/static/chunk.js (5 ms)
        ✕ should skip middleware for static file: /_next/image/logo.png
        ✕ should skip middleware for static file: /favicon.ico (1 ms)
        ✕ should skip middleware for static file: /public/image.png (1 ms)
        ✕ should skip middleware for static file: /robots.txt (1 ms)
        ✕ should skip middleware for static file: /sitemap.xml
      Public Route Access
        ✕ should allow public access to home page: / (3 ms)
        ✕ should allow public access to login page: /auth/login (1 ms)
        ✕ should allow public access to registration page: /auth/register
        ✕ should allow public access to password reset page: /auth/password-reset
        ✕ should allow public access to health check: /api/health
        ✕ should allow public access to CSRF token: /api/csrf-token
        ✕ should allow public access to public products: /api/public/products
        ✕ should allow public access to NextAuth signin: /api/auth/signin (1 ms)
        ✕ should allow public access to NextAuth callback: /api/auth/callback/credentials (6 ms)
      Authentication Required Routes
        ✕ should require authentication for user profile: /profile (1 ms)
        ✕ should allow authenticated access to user profile: /profile (2 ms)
        ✕ should require authentication for user settings: /settings (1 ms)
        ✕ should allow authenticated access to user settings: /settings (1 ms)
        ✓ should require authentication for user preferences API: /api/user/preferences (1 ms)
        ✕ should allow authenticated access to user preferences API: /api/user/preferences (1 ms)
        ✓ should require authentication for notifications API: /api/notifications (1 ms)
        ✕ should allow authenticated access to notifications API: /api/notifications (1 ms)
      Permission-Based Route Protection
        ✕ should allow ADMIN access to /admin/users (1 ms)
        ✕ should deny EDITOR access to /admin/users
        ✕ should deny VIEWER access to /admin/users
        ✕ should allow ADMIN access to /admin/security (1 ms)
        ✕ should deny EDITOR access to /admin/security (1 ms)
        ✕ should deny VIEWER access to /admin/security (1 ms)
        ✕ should allow ADMIN access to /admin/products (1 ms)
        ✕ should allow EDITOR access to /admin/products
        ✕ should deny VIEWER access to /admin/products (1 ms)
        ✕ should allow ADMIN access to /api/admin/users
        ✕ should deny EDITOR access to /api/admin/users (2 ms)
        ✕ should deny VIEWER access to /api/admin/users
        ✕ should allow ADMIN access to /api/products (1 ms)
        ✕ should allow EDITOR access to /api/products (1 ms)
        ✕ should allow VIEWER access to /api/products
      Dynamic Route Matching
        ✕ should match dynamic route pattern /admin/products/[id] with /admin/products/123
        ✕ should match dynamic route pattern /admin/products/[id]/edit with /admin/products/abc-123/edit
        ✕ should match dynamic route pattern /admin/users/[id] with /admin/users/user-456 (1 ms)
        ✕ should match dynamic route pattern /api/products/[id] with /api/products/prod-789
        ✕ should match dynamic route pattern /api/admin/users/[id] with /api/admin/users/admin-user (1 ms)
    Security Scenarios
      Authentication Attacks
        ✕ should handle token manipulation attempts (1 ms)
        ✕ should handle malformed tokens (2 ms)
        ✕ should handle expired tokens (1 ms)
      Authorization Attacks
        ✕ should detect privilege escalation attempts (1 ms)
        ✕ should detect role manipulation attempts (1 ms)
        ✕ should handle concurrent session attacks (3 ms)
      IP-Based Security
        ✕ should track suspicious IP behavior
        ✕ should handle IP spoofing attempts
      Request Manipulation
        ✕ should handle path traversal attempts (1 ms)
        ✕ should handle method override attempts (2 ms)
      Rate Limiting Security
        ✕ should apply different rate limits based on route sensitivity (1 ms)
    Security Headers and Response Handling
      ✕ should add comprehensive security headers (1 ms)
      ✕ should add HSTS header in production (1 ms)
      ✕ should remove sensitive headers (1 ms)
      ✕ should add request tracking headers (1 ms)
    Error Response Formats
      ✕ should return standardized API error responses (1 ms)
      ✕ should return standardized forbidden responses
      ✕ should handle web route redirects properly
    Logging and Monitoring
      ✕ should log all security events with proper severity (1 ms)
      ✕ should include comprehensive request metadata in logs (1 ms)
    Performance and Edge Cases
      ✕ should handle high concurrent load (14 ms)
      ✕ should handle memory efficiently with many requests (1 ms)
      ✕ should handle malformed URLs gracefully (1 ms)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Static File Handling › should skip middleware for static file: /_next/static/chunk.js

    TypeError: Cannot read properties of undefined (reading 'headers')

      500 |       },
      501 |     })
    > 502 |     response.headers.set('x-request-id', requestId)
          |              ^
      503 |     return response
      504 |   }
      505 |

      at middleware (middleware.ts:502:14)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:105:44)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Static File Handling › should skip middleware for static file: /_next/image/logo.png

    TypeError: Cannot read properties of undefined (reading 'headers')

      500 |       },
      501 |     })
    > 502 |     response.headers.set('x-request-id', requestId)
          |              ^
      503 |     return response
      504 |   }
      505 |

      at middleware (middleware.ts:502:14)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:105:44)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Static File Handling › should skip middleware for static file: /favicon.ico

    TypeError: Cannot read properties of undefined (reading 'headers')

      500 |       },
      501 |     })
    > 502 |     response.headers.set('x-request-id', requestId)
          |              ^
      503 |     return response
      504 |   }
      505 |

      at middleware (middleware.ts:502:14)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:105:44)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Static File Handling › should skip middleware for static file: /public/image.png

    TypeError: Cannot read properties of undefined (reading 'headers')

      500 |       },
      501 |     })
    > 502 |     response.headers.set('x-request-id', requestId)
          |              ^
      503 |     return response
      504 |   }
      505 |

      at middleware (middleware.ts:502:14)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:105:44)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Static File Handling › should skip middleware for static file: /robots.txt

    TypeError: Cannot read properties of undefined (reading 'headers')

      500 |       },
      501 |     })
    > 502 |     response.headers.set('x-request-id', requestId)
          |              ^
      503 |     return response
      504 |   }
      505 |

      at middleware (middleware.ts:502:14)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:105:44)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Static File Handling › should skip middleware for static file: /sitemap.xml

    TypeError: Cannot read properties of undefined (reading 'headers')

      500 |       },
      501 |     })
    > 502 |     response.headers.set('x-request-id', requestId)
          |              ^
      503 |     return response
      504 |   }
      505 |

      at middleware (middleware.ts:502:14)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:105:44)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Public Route Access › should allow public access to home page: /

    TypeError: Cannot read properties of undefined (reading 'headers')

      813 |
      814 |   // Add comprehensive security headers
    > 815 |   response.headers.set('X-Content-Type-Options', 'nosniff')
          |            ^
      816 |   response.headers.set('X-Frame-Options', 'DENY')
      817 |   response.headers.set('X-XSS-Protection', '1; mode=block')
      818 |   response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

      at applySecurityAndPreferences (middleware.ts:815:12)
      at middleware (middleware.ts:565:16)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:130:28)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Public Route Access › should allow public access to login page: /auth/login

    TypeError: Cannot read properties of undefined (reading 'headers')

      813 |
      814 |   // Add comprehensive security headers
    > 815 |   response.headers.set('X-Content-Type-Options', 'nosniff')
          |            ^
      816 |   response.headers.set('X-Frame-Options', 'DENY')
      817 |   response.headers.set('X-XSS-Protection', '1; mode=block')
      818 |   response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

      at applySecurityAndPreferences (middleware.ts:815:12)
      at middleware (middleware.ts:565:16)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:130:28)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Public Route Access › should allow public access to registration page: /auth/register

    TypeError: Cannot read properties of undefined (reading 'headers')

      813 |
      814 |   // Add comprehensive security headers
    > 815 |   response.headers.set('X-Content-Type-Options', 'nosniff')
          |            ^
      816 |   response.headers.set('X-Frame-Options', 'DENY')
      817 |   response.headers.set('X-XSS-Protection', '1; mode=block')
      818 |   response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

      at applySecurityAndPreferences (middleware.ts:815:12)
      at middleware (middleware.ts:565:16)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:130:28)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Public Route Access › should allow public access to password reset page: /auth/password-reset

    TypeError: Cannot read properties of undefined (reading 'headers')

      813 |
      814 |   // Add comprehensive security headers
    > 815 |   response.headers.set('X-Content-Type-Options', 'nosniff')
          |            ^
      816 |   response.headers.set('X-Frame-Options', 'DENY')
      817 |   response.headers.set('X-XSS-Protection', '1; mode=block')
      818 |   response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

      at applySecurityAndPreferences (middleware.ts:815:12)
      at middleware (middleware.ts:565:16)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:130:28)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Public Route Access › should allow public access to health check: /api/health

    TypeError: Cannot read properties of undefined (reading 'headers')

      813 |
      814 |   // Add comprehensive security headers
    > 815 |   response.headers.set('X-Content-Type-Options', 'nosniff')
          |            ^
      816 |   response.headers.set('X-Frame-Options', 'DENY')
      817 |   response.headers.set('X-XSS-Protection', '1; mode=block')
      818 |   response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

      at applySecurityAndPreferences (middleware.ts:815:12)
      at middleware (middleware.ts:565:22)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:130:28)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Public Route Access › should allow public access to CSRF token: /api/csrf-token

    TypeError: Cannot read properties of undefined (reading 'headers')

      813 |
      814 |   // Add comprehensive security headers
    > 815 |   response.headers.set('X-Content-Type-Options', 'nosniff')
          |            ^
      816 |   response.headers.set('X-Frame-Options', 'DENY')
      817 |   response.headers.set('X-XSS-Protection', '1; mode=block')
      818 |   response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

      at applySecurityAndPreferences (middleware.ts:815:12)
      at middleware (middleware.ts:565:22)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:130:28)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Public Route Access › should allow public access to public products: /api/public/products

    TypeError: Cannot read properties of undefined (reading 'headers')

      813 |
      814 |   // Add comprehensive security headers
    > 815 |   response.headers.set('X-Content-Type-Options', 'nosniff')
          |            ^
      816 |   response.headers.set('X-Frame-Options', 'DENY')
      817 |   response.headers.set('X-XSS-Protection', '1; mode=block')
      818 |   response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

      at applySecurityAndPreferences (middleware.ts:815:12)
      at middleware (middleware.ts:565:22)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:130:28)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Public Route Access › should allow public access to NextAuth signin: /api/auth/signin

    TypeError: Cannot read properties of undefined (reading 'headers')

      813 |
      814 |   // Add comprehensive security headers
    > 815 |   response.headers.set('X-Content-Type-Options', 'nosniff')
          |            ^
      816 |   response.headers.set('X-Frame-Options', 'DENY')
      817 |   response.headers.set('X-XSS-Protection', '1; mode=block')
      818 |   response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

      at applySecurityAndPreferences (middleware.ts:815:12)
      at middleware (middleware.ts:565:22)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:130:28)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Public Route Access › should allow public access to NextAuth callback: /api/auth/callback/credentials

    TypeError: expect(received).toBeInstanceOf(expected)

    Matcher error: expected value must be a function

    Expected has type:  object
    Expected has value: {"json": [Function mockConstructor], "next": [Function mockConstructor], "redirect": [Function mockConstructor]}

      130 |           const response = await middleware(request)
      131 |           
    > 132 |           expect(response).toBeInstanceOf(NextResponse)
          |                            ^
      133 |           expect(response.status).not.toBe(401)
      134 |           expect(response.status).not.toBe(403)
      135 |           expect(mockGetToken).not.toHaveBeenCalled()

      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:132:28)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Authentication Required Routes › should require authentication for user profile: /profile

    TypeError: Cannot read properties of undefined (reading 'headers')

      752 |   
      753 |   const response = NextResponse.redirect(loginUrl)
    > 754 |   response.headers.set('x-request-id', requestId)
          |            ^
      755 |   
      756 |   return response
      757 | }

      at createUnauthorizedResponse (middleware.ts:754:12)
      at middleware (middleware.ts:593:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:159:28)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Authentication Required Routes › should allow authenticated access to user profile: /profile

    TypeError: Cannot read properties of undefined (reading 'headers')

      813 |
      814 |   // Add comprehensive security headers
    > 815 |   response.headers.set('X-Content-Type-Options', 'nosniff')
          |            ^
      816 |   response.headers.set('X-Frame-Options', 'DENY')
      817 |   response.headers.set('X-XSS-Protection', '1; mode=block')
      818 |   response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

      at applySecurityAndPreferences (middleware.ts:815:12)
      at middleware (middleware.ts:713:14)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:176:28)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Authentication Required Routes › should require authentication for user settings: /settings

    TypeError: Cannot read properties of undefined (reading 'headers')

      752 |   
      753 |   const response = NextResponse.redirect(loginUrl)
    > 754 |   response.headers.set('x-request-id', requestId)
          |            ^
      755 |   
      756 |   return response
      757 | }

      at createUnauthorizedResponse (middleware.ts:754:12)
      at middleware (middleware.ts:593:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:159:28)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Authentication Required Routes › should allow authenticated access to user settings: /settings

    TypeError: Cannot read properties of undefined (reading 'headers')

      813 |
      814 |   // Add comprehensive security headers
    > 815 |   response.headers.set('X-Content-Type-Options', 'nosniff')
          |            ^
      816 |   response.headers.set('X-Frame-Options', 'DENY')
      817 |   response.headers.set('X-XSS-Protection', '1; mode=block')
      818 |   response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

      at applySecurityAndPreferences (middleware.ts:815:12)
      at middleware (middleware.ts:713:14)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:176:28)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Authentication Required Routes › should allow authenticated access to user preferences API: /api/user/preferences

    TypeError: Cannot read properties of undefined (reading 'headers')

      813 |
      814 |   // Add comprehensive security headers
    > 815 |   response.headers.set('X-Content-Type-Options', 'nosniff')
          |            ^
      816 |   response.headers.set('X-Frame-Options', 'DENY')
      817 |   response.headers.set('X-XSS-Protection', '1; mode=block')
      818 |   response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

      at applySecurityAndPreferences (middleware.ts:815:12)
      at middleware (middleware.ts:713:20)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:176:28)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Authentication Required Routes › should allow authenticated access to notifications API: /api/notifications

    TypeError: Cannot read properties of undefined (reading 'headers')

      813 |
      814 |   // Add comprehensive security headers
    > 815 |   response.headers.set('X-Content-Type-Options', 'nosniff')
          |            ^
      816 |   response.headers.set('X-Frame-Options', 'DENY')
      817 |   response.headers.set('X-XSS-Protection', '1; mode=block')
      818 |   response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

      at applySecurityAndPreferences (middleware.ts:815:12)
      at middleware (middleware.ts:713:20)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:176:28)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Permission-Based Route Protection › should allow ADMIN access to /admin/users

    TypeError: Cannot read properties of undefined (reading 'headers')

      813 |
      814 |   // Add comprehensive security headers
    > 815 |   response.headers.set('X-Content-Type-Options', 'nosniff')
          |            ^
      816 |   response.headers.set('X-Frame-Options', 'DENY')
      817 |   response.headers.set('X-XSS-Protection', '1; mode=block')
      818 |   response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

      at applySecurityAndPreferences (middleware.ts:815:12)
      at middleware (middleware.ts:713:14)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:225:30)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Permission-Based Route Protection › should deny EDITOR access to /admin/users

    TypeError: Cannot read properties of undefined (reading 'headers')

      794 |   
      795 |   const response = NextResponse.redirect(errorUrl)
    > 796 |   response.headers.set('x-request-id', requestId)
          |            ^
      797 |   
      798 |   return response
      799 | }

      at createForbiddenResponse (middleware.ts:796:12)
      at middleware (middleware.ts:684:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:244:30)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Permission-Based Route Protection › should deny VIEWER access to /admin/users

    TypeError: Cannot read properties of undefined (reading 'headers')

      794 |   
      795 |   const response = NextResponse.redirect(errorUrl)
    > 796 |   response.headers.set('x-request-id', requestId)
          |            ^
      797 |   
      798 |   return response
      799 | }

      at createForbiddenResponse (middleware.ts:796:12)
      at middleware (middleware.ts:684:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:244:30)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Permission-Based Route Protection › should allow ADMIN access to /admin/security

    TypeError: Cannot read properties of undefined (reading 'headers')

      813 |
      814 |   // Add comprehensive security headers
    > 815 |   response.headers.set('X-Content-Type-Options', 'nosniff')
          |            ^
      816 |   response.headers.set('X-Frame-Options', 'DENY')
      817 |   response.headers.set('X-XSS-Protection', '1; mode=block')
      818 |   response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

      at applySecurityAndPreferences (middleware.ts:815:12)
      at middleware (middleware.ts:713:14)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:225:30)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Permission-Based Route Protection › should deny EDITOR access to /admin/security

    TypeError: Cannot read properties of undefined (reading 'headers')

      794 |   
      795 |   const response = NextResponse.redirect(errorUrl)
    > 796 |   response.headers.set('x-request-id', requestId)
          |            ^
      797 |   
      798 |   return response
      799 | }

      at createForbiddenResponse (middleware.ts:796:12)
      at middleware (middleware.ts:684:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:244:30)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Permission-Based Route Protection › should deny VIEWER access to /admin/security

    TypeError: Cannot read properties of undefined (reading 'headers')

      794 |   
      795 |   const response = NextResponse.redirect(errorUrl)
    > 796 |   response.headers.set('x-request-id', requestId)
          |            ^
      797 |   
      798 |   return response
      799 | }

      at createForbiddenResponse (middleware.ts:796:12)
      at middleware (middleware.ts:684:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:244:30)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Permission-Based Route Protection › should allow ADMIN access to /admin/products

    TypeError: Cannot read properties of undefined (reading 'headers')

      813 |
      814 |   // Add comprehensive security headers
    > 815 |   response.headers.set('X-Content-Type-Options', 'nosniff')
          |            ^
      816 |   response.headers.set('X-Frame-Options', 'DENY')
      817 |   response.headers.set('X-XSS-Protection', '1; mode=block')
      818 |   response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

      at applySecurityAndPreferences (middleware.ts:815:12)
      at middleware (middleware.ts:713:14)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:225:30)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Permission-Based Route Protection › should allow EDITOR access to /admin/products

    TypeError: Cannot read properties of undefined (reading 'headers')

      813 |
      814 |   // Add comprehensive security headers
    > 815 |   response.headers.set('X-Content-Type-Options', 'nosniff')
          |            ^
      816 |   response.headers.set('X-Frame-Options', 'DENY')
      817 |   response.headers.set('X-XSS-Protection', '1; mode=block')
      818 |   response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

      at applySecurityAndPreferences (middleware.ts:815:12)
      at middleware (middleware.ts:713:14)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:225:30)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Permission-Based Route Protection › should deny VIEWER access to /admin/products

    TypeError: Cannot read properties of undefined (reading 'headers')

      813 |
      814 |   // Add comprehensive security headers
    > 815 |   response.headers.set('X-Content-Type-Options', 'nosniff')
          |            ^
      816 |   response.headers.set('X-Frame-Options', 'DENY')
      817 |   response.headers.set('X-XSS-Protection', '1; mode=block')
      818 |   response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

      at applySecurityAndPreferences (middleware.ts:815:12)
      at middleware (middleware.ts:713:14)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:244:30)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Permission-Based Route Protection › should allow ADMIN access to /api/admin/users

    TypeError: Cannot read properties of undefined (reading 'headers')

      813 |
      814 |   // Add comprehensive security headers
    > 815 |   response.headers.set('X-Content-Type-Options', 'nosniff')
          |            ^
      816 |   response.headers.set('X-Frame-Options', 'DENY')
      817 |   response.headers.set('X-XSS-Protection', '1; mode=block')
      818 |   response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

      at applySecurityAndPreferences (middleware.ts:815:12)
      at middleware (middleware.ts:713:20)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:225:30)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Permission-Based Route Protection › should deny EDITOR access to /api/admin/users

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: StringContaining "[SECURITY_HIGH] FORBIDDEN:", StringContaining "Insufficient permissions"
    Received: "[SECURITY_MONITORING]", "{
      \"type\": \"PERMISSION_DENIED\",
      \"severity\": \"MEDIUM\",
      \"userId\": \"user-1\",
      \"resource\": \"admin\",
      \"action\": \"GET\",
      \"ipAddress\": \"192.168.1.1\",
      \"userAgent\": \"test-agent\",
      \"details\": {
        \"pathname\": \"/api/admin/users\",
        \"reason\": \"Insufficient permissions for /api/admin/users. Required: [{\\\"resource\\\":\\\"users\\\",\\\"action\\\":\\\"read\\\",\\\"scope\\\":\\\"all\\\"}], User role: EDITOR\",
        \"userRole\": \"EDITOR\",
        \"timestamp\": \"2025-10-07T19:11:06.924Z\",
        \"requestId\": \"req_1759864266924_jmauolsrj\"
      },
      \"metadata\": {
        \"requestId\": \"req_1759864266924_jmauolsrj\",
        \"timestamp\": \"2025-10-07T19:11:06.924Z\"
      }
    }"

    Number of calls: 1

      253 |             
      254 |             // Should log forbidden access
    > 255 |             expect(consoleLogSpy).toHaveBeenCalledWith(
          |                                   ^
      256 |               expect.stringContaining('[SECURITY_HIGH] FORBIDDEN:'),
      257 |               expect.stringContaining('Insufficient permissions')
      258 |             )

      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:255:35)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Permission-Based Route Protection › should deny VIEWER access to /api/admin/users

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:244:30)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Permission-Based Route Protection › should allow ADMIN access to /api/products

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:225:30)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Permission-Based Route Protection › should allow EDITOR access to /api/products

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:225:30)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Permission-Based Route Protection › should allow VIEWER access to /api/products

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:225:30)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Dynamic Route Matching › should match dynamic route pattern /admin/products/[id] with /admin/products/123

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:279:28)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Dynamic Route Matching › should match dynamic route pattern /admin/products/[id]/edit with /admin/products/abc-123/edit

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:279:28)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Dynamic Route Matching › should match dynamic route pattern /admin/users/[id] with /admin/users/user-456

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:279:28)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Dynamic Route Matching › should match dynamic route pattern /api/products/[id] with /api/products/prod-789

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:279:28)

  ● Comprehensive Middleware Security Tests › Route Protection Logic › Dynamic Route Matching › should match dynamic route pattern /api/admin/users/[id] with /api/admin/users/admin-user

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:279:28)

  ● Comprehensive Middleware Security Tests › Security Scenarios › Authentication Attacks › should handle token manipulation attempts

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:294:26)

  ● Comprehensive Middleware Security Tests › Security Scenarios › Authentication Attacks › should handle malformed tokens

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:316:26)

  ● Comprehensive Middleware Security Tests › Security Scenarios › Authentication Attacks › should handle expired tokens

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:325:26)

  ● Comprehensive Middleware Security Tests › Security Scenarios › Authorization Attacks › should detect privilege escalation attempts

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:338:26)

  ● Comprehensive Middleware Security Tests › Security Scenarios › Authorization Attacks › should detect role manipulation attempts

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:354:26)

  ● Comprehensive Middleware Security Tests › Security Scenarios › Authorization Attacks › should handle concurrent session attacks

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
          at async Promise.all (index 0)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:368:27)

  ● Comprehensive Middleware Security Tests › Security Scenarios › IP-Based Security › should track suspicious IP behavior

    TypeError: Cannot read properties of undefined (reading 'headers')

      752 |   
      753 |   const response = NextResponse.redirect(loginUrl)
    > 754 |   response.headers.set('x-request-id', requestId)
          |            ^
      755 |   
      756 |   return response
      757 | }

      at createUnauthorizedResponse (middleware.ts:754:12)
      at middleware (middleware.ts:593:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:391:11)

  ● Comprehensive Middleware Security Tests › Security Scenarios › IP-Based Security › should handle IP spoofing attempts

    TypeError: Cannot read properties of undefined (reading 'headers')

      752 |   
      753 |   const response = NextResponse.redirect(loginUrl)
    > 754 |   response.headers.set('x-request-id', requestId)
          |            ^
      755 |   
      756 |   return response
      757 | }

      at createUnauthorizedResponse (middleware.ts:754:12)
      at middleware (middleware.ts:593:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:408:9)

  ● Comprehensive Middleware Security Tests › Security Scenarios › Request Manipulation › should handle path traversal attempts

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:431:28)

  ● Comprehensive Middleware Security Tests › Security Scenarios › Request Manipulation › should handle method override attempts

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:446:26)

  ● Comprehensive Middleware Security Tests › Security Scenarios › Rate Limiting Security › should apply different rate limits based on route sensitivity

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:459:9)

  ● Comprehensive Middleware Security Tests › Security Headers and Response Handling › should add comprehensive security headers

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:481:24)

  ● Comprehensive Middleware Security Tests › Security Headers and Response Handling › should add HSTS header in production

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:504:24)

  ● Comprehensive Middleware Security Tests › Security Headers and Response Handling › should remove sensitive headers

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:515:24)

  ● Comprehensive Middleware Security Tests › Security Headers and Response Handling › should add request tracking headers

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:523:24)

  ● Comprehensive Middleware Security Tests › Error Response Formats › should return standardized API error responses

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:536:24)

  ● Comprehensive Middleware Security Tests › Error Response Formats › should return standardized forbidden responses

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:561:24)

  ● Comprehensive Middleware Security Tests › Error Response Formats › should handle web route redirects properly

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:575:24)

  ● Comprehensive Middleware Security Tests › Logging and Monitoring › should log all security events with proper severity

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:614:9)

  ● Comprehensive Middleware Security Tests › Logging and Monitoring › should include comprehensive request metadata in logs

    TypeError: Cannot read properties of undefined (reading 'headers')

      813 |
      814 |   // Add comprehensive security headers
    > 815 |   response.headers.set('X-Content-Type-Options', 'nosniff')
          |            ^
      816 |   response.headers.set('X-Frame-Options', 'DENY')
      817 |   response.headers.set('X-XSS-Protection', '1; mode=block')
      818 |   response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

      at applySecurityAndPreferences (middleware.ts:815:12)
      at middleware (middleware.ts:713:14)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:632:7)

  ● Comprehensive Middleware Security Tests › Performance and Edge Cases › should handle high concurrent load

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
          at async Promise.all (index 0)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:665:25)

  ● Comprehensive Middleware Security Tests › Performance and Edge Cases › should handle memory efficiently with many requests

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:687:9)

  ● Comprehensive Middleware Security Tests › Performance and Edge Cases › should handle malformed URLs gracefully

    TypeError: server_1.NextResponse is not a constructor

      507 |   if (isIPBlocked(ip)) {
      508 |     await logSecurityEvent(null, pathname, 'BLOCKED', 'ip_blocked', ip, userAgent, logMetadata)
    > 509 |     return new NextResponse('Access Denied', { status: 403 })
          |            ^
      510 |   }
      511 |
      512 |   // Apply rate limiting based on route sensitivity

      at middleware (middleware.ts:509:12)
      at Object.<anonymous> (__tests__/middleware-security-comprehensive.test.ts:706:26)

Test Suites: 1 failed, 1 total
Tests:       64 failed, 2 passed, 66 total
Snapshots:   0 total
Time:        1.643 s
Ran all test suites matching __tests__/middleware-security-comprehensive.test.ts.


### Permission System Security

- **Passed:** 0
- **Failed:** 3
- **Skipped:** 0
- **Duration:** 8581ms
- **Errors:**
  - Error running __tests__/lib/permissions.test.ts: SyntaxError: Unexpected token '>', "
> kin-work"... is not valid JSON
  - Error running __tests__/lib/enhanced-permissions.test.ts: SyntaxError: Unexpected token '>', "
> kin-work"... is not valid JSON
  - Error running __tests__/integration/permission-system.test.ts: SyntaxError: Unexpected token '>', "
> kin-work"... is not valid JSON

## Recommendations

- Fix failing security tests to ensure proper protection
