/** @type {import('jest').Config} */
const config = {
  projects: [
    {
      displayName: 'node',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/tests/api/**/*.test.ts',
        '<rootDir>/tests/utils/**/*.test.ts',
        '<rootDir>/tests/integration/**/*.test.ts',
        '<rootDir>/tests/database/**/*.test.ts',
        '<rootDir>/__tests__/api/**/*.test.ts',
        '<rootDir>/__tests__/lib/**/*.test.ts'
      ],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: {
            target: 'es2020',
            module: 'commonjs',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            moduleResolution: 'node',
            resolveJsonModule: true,
            isolatedModules: true,
          },
          useESM: false,
        }],
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup-node.ts'],
      globalSetup: '<rootDir>/tests/global-setup.js',
      globalTeardown: '<rootDir>/tests/global-teardown.js',
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/app/$1',
        '^@/app/(.*)$': '<rootDir>/app/$1',
        '^@/lib/(.*)$': '<rootDir>/app/lib/$1',
        '^@/api/(.*)$': '<rootDir>/app/api/$1',
        '^@/components/(.*)$': '<rootDir>/app/components/$1',
        '^@/lib/db$': '<rootDir>/__mocks__/@/lib/db.ts',
        '^@/lib/prisma$': '<rootDir>/__mocks__/@/lib/prisma-mock.ts',
        '^@/app/lib/auth-config$': '<rootDir>/__mocks__/@/lib/auth-config.ts',
        '^\\.\\./lib/db$': '<rootDir>/__mocks__/@/lib/db.ts',
        '^\\.\\./\\.\\./lib/db$': '<rootDir>/__mocks__/@/lib/db.ts',
        '\\./db$': '<rootDir>/__mocks__/@/lib/db.ts',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '@auth/prisma-adapter': '<rootDir>/__mocks__/@auth/prisma-adapter.js',
        'next-auth$': '<rootDir>/__mocks__/next-auth.js',
        'next-auth/next$': '<rootDir>/__mocks__/next-auth/next.js',
        'next-auth/providers/credentials$': '<rootDir>/__mocks__/next-auth/providers/credentials.js',
      },
      extensionsToTreatAsEsm: []
    },
    {
      displayName: 'jsdom',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/tests/components/**/*.test.tsx',
        '<rootDir>/tests/e2e/**/*.test.ts',
        '<rootDir>/__tests__/components/**/*.test.tsx'
      ],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: {
            target: 'es2020',
            module: 'commonjs',
            jsx: 'react-jsx',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            moduleResolution: 'node',
            resolveJsonModule: true,
            isolatedModules: true,
          },
          useESM: false,
        }],
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/app/$1',
        '^@/app/(.*)$': '<rootDir>/app/$1',
        '^@/lib/(.*)$': '<rootDir>/app/lib/$1',
        '^@/api/(.*)$': '<rootDir>/app/api/$1',
        '^@/components/(.*)$': '<rootDir>/app/components/$1',
        '^@/lib/db$': '<rootDir>/__mocks__/@/lib/db.ts',
        '^@/lib/prisma$': '<rootDir>/__mocks__/@/lib/prisma-mock.ts',
        '^@/app/lib/auth-config$': '<rootDir>/__mocks__/@/lib/auth-config.ts',
        '^\\.\\./lib/db$': '<rootDir>/__mocks__/@/lib/db.ts',
        '^\\.\\./\\.\\./lib/db$': '<rootDir>/__mocks__/@/lib/db.ts',
        '\\./db$': '<rootDir>/__mocks__/@/lib/db.ts',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '@auth/prisma-adapter': '<rootDir>/__mocks__/@auth/prisma-adapter.js',
        'next-auth$': '<rootDir>/__mocks__/next-auth.js',
        'next-auth/next$': '<rootDir>/__mocks__/next-auth/next.js',
        'next-auth/providers/credentials$': '<rootDir>/__mocks__/next-auth/providers/credentials.js',
      },
      extensionsToTreatAsEsm: []
    }
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(@auth/prisma-adapter|@testing-library|next-auth|@auth|uuid|minisearch|jose|openid-client|oauth|oidc-token-hash|@panva|preact)/)',
  ],
  setupFiles: ['<rootDir>/tests/jest-setup.ts'],
  collectCoverageFrom: [
    'app/lib/**/*.{ts,tsx}',
    'app/api/**/*.{ts,tsx}',
    'app/components/**/*.{ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/types.ts',
    '!app/**/layout.tsx',
    '!app/**/page.tsx',
    '!app/**/loading.tsx',
    '!app/**/error.tsx',
    '!app/**/not-found.tsx',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testTimeout: 30000,
  maxWorkers: '75%',
  verbose: false,
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  detectOpenHandles: false,
  forceExit: false,
  // Performance optimizations
  workerIdleMemoryLimit: '512MB',
  maxConcurrency: 5,
}

module.exports = config