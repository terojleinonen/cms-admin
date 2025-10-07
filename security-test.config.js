/**
 * Security Testing Configuration
 * Configuration for automated security testing
 */

module.exports = {
  // Test execution settings
  testTimeout: 60000, // 60 seconds per test
  maxConcurrency: 4,
  retries: 2,
  
  // Security test patterns
  testMatch: [
    '__tests__/security/**/*.test.{js,ts}',
    '__tests__/lib/api-security.test.{js,ts}',
    '__tests__/lib/csrf-protection.test.{js,ts}',
    '__tests__/lib/input-validation.test.{js,ts}',
    '__tests__/middleware-security-*.test.{js,ts}',
    '__tests__/integration/authentication-*.test.{js,ts}',
    '__tests__/integration/permission-*.test.{js,ts}'
  ],

  // Security vulnerability scanning
  vulnerabilityScanning: {
    enabled: true,
    scanTypes: [
      'sql-injection',
      'xss',
      'csrf',
      'authentication-bypass',
      'privilege-escalation',
      'session-hijacking',
      'path-traversal',
      'rate-limit-bypass',
      'data-exposure',
      'idor'
    ],
    severity: {
      critical: ['sql-injection', 'authentication-bypass', 'remote-code-execution'],
      high: ['privilege-escalation', 'xss', 'csrf'],
      medium: ['session-hijacking', 'rate-limit-bypass', 'path-traversal'],
      low: ['information-disclosure', 'weak-encryption']
    }
  },

  // Permission boundary testing
  permissionTesting: {
    enabled: true,
    testTypes: [
      'horizontal-privilege-escalation',
      'vertical-privilege-escalation',
      'resource-boundary-violations',
      'api-endpoint-boundaries',
      'session-token-boundaries'
    ],
    roles: ['VIEWER', 'EDITOR', 'ADMIN'],
    resources: ['products', 'users', 'categories', 'orders', 'analytics', 'admin']
  },

  // Regression testing
  regressionTesting: {
    enabled: true,
    trackIssues: true,
    issueDatabase: 'security-issues.json',
    categories: [
      'authentication',
      'authorization',
      'input-validation',
      'rate-limiting',
      'session-management',
      'data-exposure'
    ]
  },

  // Reporting configuration
  reporting: {
    formats: ['json', 'html', 'markdown', 'junit'],
    outputDir: 'security-reports',
    includeStackTraces: true,
    includeCoverage: true,
    generateTrends: true
  },

  // CI/CD integration
  cicd: {
    failOnCritical: true,
    failOnHigh: true,
    failOnMedium: false,
    maxFailedTests: 0,
    notifications: {
      slack: {
        enabled: process.env.SLACK_SECURITY_WEBHOOK ? true : false,
        webhook: process.env.SLACK_SECURITY_WEBHOOK,
        channel: '#security-alerts'
      },
      email: {
        enabled: process.env.SECURITY_EMAIL_NOTIFICATIONS ? true : false,
        recipients: process.env.SECURITY_EMAIL_RECIPIENTS?.split(',') || []
      }
    }
  },

  // Performance testing for security features
  performanceTesting: {
    enabled: true,
    thresholds: {
      permissionCheckLatency: 100, // ms
      authenticationLatency: 500, // ms
      rateLimitResponseTime: 50 // ms
    },
    loadTesting: {
      concurrentUsers: 100,
      duration: 60000, // 1 minute
      rampUpTime: 10000 // 10 seconds
    }
  },

  // Mock and test data configuration
  testData: {
    users: {
      admin: {
        email: 'admin@test.com',
        role: 'ADMIN',
        permissions: ['*']
      },
      editor: {
        email: 'editor@test.com',
        role: 'EDITOR',
        permissions: ['products:*', 'categories:*', 'media:*']
      },
      viewer: {
        email: 'viewer@test.com',
        role: 'VIEWER',
        permissions: ['products:read', 'categories:read']
      }
    },
    maliciousPayloads: {
      sqlInjection: [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'/*",
        "1; DELETE FROM users WHERE 1=1; --",
        "' UNION SELECT * FROM users --"
      ],
      xss: [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("XSS")',
        '<svg onload="alert(1)">',
        '"><script>alert("XSS")</script>'
      ],
      pathTraversal: [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ]
    }
  },

  // Environment-specific settings
  environments: {
    development: {
      skipSlowTests: false,
      verboseLogging: true,
      mockExternalServices: true
    },
    ci: {
      skipSlowTests: true,
      verboseLogging: false,
      mockExternalServices: true,
      parallelExecution: true
    },
    staging: {
      skipSlowTests: false,
      verboseLogging: false,
      mockExternalServices: false,
      realDataTesting: true
    }
  }
}