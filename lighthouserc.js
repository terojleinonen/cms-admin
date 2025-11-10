module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3001/auth/login',
        'http://localhost:3001/dashboard',
        'http://localhost:3001/products',
        'http://localhost:3001/analytics'
      ],
      startServerCommand: 'npm start',
      startServerReadyPattern: 'ready',
      startServerReadyTimeout: 60000,
      numberOfRuns: 1
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 3000 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    },
    server: {
      port: 9001,
      storage: {
        storageMethod: 'filesystem',
        storagePath: '.lighthouseci'
      }
    }
  }
};