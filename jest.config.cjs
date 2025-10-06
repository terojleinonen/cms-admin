module.exports = {
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/__tests__/helpers/test-helpers.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/app/$1',
        '^@/lib/(.*)$': '<rootDir>/app/lib/$1',
        '^@/components/(.*)$': '<rootDir>/app/components/$1',
        '^@/__tests__/(.*)$': '<rootDir>/__tests__/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        'next-auth/react': '<rootDir>/__mocks__/next-auth/react.js',
        'next-auth/next': '<rootDir>/__mocks__/next-auth/next.js',
      },
      testTimeout: 10000,
    },
    {
      displayName: 'components',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/__tests__/components/**/*.test.tsx'],
      setupFilesAfterEnv: ['<rootDir>/__tests__/helpers/test-helpers.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/app/$1',
        '^@/lib/(.*)$': '<rootDir>/app/lib/$1',
        '^@/components/(.*)$': '<rootDir>/app/components/$1',
        '^@/__tests__/(.*)$': '<rootDir>/__tests__/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        'next-auth/react': '<rootDir>/__mocks__/next-auth/react.js',
        'next-auth/next': '<rootDir>/__mocks__/next-auth/next.js',
      },
      testTimeout: 10000,
    },
    {
      displayName: 'e2e',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/__tests__/e2e/**/*.test.{ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/__tests__/helpers/test-helpers.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/app/$1',
        '^@/lib/(.*)$': '<rootDir>/app/lib/$1',
        '^@/components/(.*)$': '<rootDir>/app/components/$1',
        '^@/__tests__/(.*)$': '<rootDir>/__tests__/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        'next-auth/react': '<rootDir>/__mocks__/next-auth/react.js',
        'next-auth/next': '<rootDir>/__mocks__/next-auth/next.js',
      },
      testTimeout: 30000,
    },
    {
      displayName: 'performance',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/__tests__/performance/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/__tests__/helpers/test-helpers.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/app/$1',
        '^@/lib/(.*)$': '<rootDir>/app/lib/$1',
        '^@/components/(.*)$': '<rootDir>/app/components/$1',
        '^@/__tests__/(.*)$': '<rootDir>/__tests__/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        'next-auth/react': '<rootDir>/__mocks__/next-auth/react.js',
        'next-auth/next': '<rootDir>/__mocks__/next-auth/next.js',
      },
      testTimeout: 120000,
      maxWorkers: 1,
    }
  ],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/layout.tsx',
    '!app/**/page.tsx'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  maxWorkers: 1,
  testTimeout: 10000
}