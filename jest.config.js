const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
  
  // Fix module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/api/(.*)$': '<rootDir>/app/api/$1',
    '^@/utils/(.*)$': '<rootDir>/utils/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
  },
  
  // Performance optimizations - more conservative for memory
  maxWorkers: 2, // Fixed number instead of percentage
  workerIdleMemoryLimit: '256MB', // Reduced memory limit
  maxConcurrency: 2, // Limit concurrent tests
  
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/test-artifacts/',
  ],
  
  // Ignore helper files that don't contain tests
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)',
    '!**/__tests__/**/helpers/**',
    '!**/helpers/**',
  ],
  
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'utils/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/layout.tsx',
    '!**/loading.tsx',
    '!**/not-found.tsx',
    '!**/page.tsx',
    '!**/__mocks__/**',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/test-artifacts/**',
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './app/lib/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './utils/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  
  // Coverage reporting
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'json-summary',
  ],
  
  coverageDirectory: 'coverage',
  
  // Environment setup
  testEnvironmentOptions: {
    customExportConditions: [''],
    url: 'http://localhost:3001',
  },
  
  // Timeout settings
  testTimeout: 20000, // Reduced timeout
  
  // Memory management
  detectLeaks: false, // Temporarily disabled to check for other errors
  logHeapUsage: true,
  
  // Force garbage collection
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Bail on failures to save memory
  bail: 3,
  
  // Remove custom transform - let Next.js handle it
  
  // Cache settings
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output control
  verbose: false,
  silent: false,
};

module.exports = createJestConfig(customJestConfig);
