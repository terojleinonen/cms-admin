/**
 * Jest configuration for integration and e2e tests
 * Optimized for memory usage and focused testing
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  
  // Memory optimization
  maxWorkers: 1,
  workerIdleMemoryLimit: '512MB',
  
  // Test patterns for integration tests
  testMatch: [
    '<rootDir>/__tests__/integration/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/e2e/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/accessibility/**/*.test.{js,jsx,ts,tsx}',
  ],
  
  // Module name mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/app/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/components/(.*)$': '<rootDir>/app/components/$1',
    '^@/lib/(.*)$': '<rootDir>/app/lib/$1',
  },
  
  // Coverage settings
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/node_modules/**',
  ],
  
  // Timeout for long-running tests
  testTimeout: 30000,
  
  // Transform settings
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['next/jest', {
      presets: [['next/babel', { 'preset-react': { runtime: 'automatic' } }]],
    }],
  },
  
  // Setup files
  setupFiles: ['<rootDir>/__tests__/setup.ts'],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Verbose output
  verbose: false,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)