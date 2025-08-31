const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const memoryOptimizedConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  
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
  
  // Aggressive memory optimization
  maxWorkers: 1, // Single worker to minimize memory usage
  workerIdleMemoryLimit: '128MB', // Very low memory limit
  maxConcurrency: 1, // Run tests one at a time
  
  // Force serial execution (handled by maxWorkers: 1)
  
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/test-artifacts/',
  ],
  
  // Only run essential tests
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '!**/__tests__/**/comprehensive.*',
    '!**/__tests__/**/performance.*',
    '!**/__tests__/**/e2e.*',
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
  ],
  
  // Environment setup
  testEnvironmentOptions: {
    customExportConditions: [''],
    url: 'http://localhost:3001',
  },
  
  // Aggressive timeout settings
  testTimeout: 15000,
  
  // Cache settings for memory optimization
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // Memory management - disable leak detection for now
  detectLeaks: false,
  logHeapUsage: true,
  
  // Bail early on failures
  bail: 1,
  
  // Verbose output control
  verbose: false,
  silent: true, // Reduce console output to save memory
  
  // Force exit to prevent hanging
  forceExit: true,
  detectOpenHandles: true,
};

module.exports = createJestConfig(memoryOptimizedConfig);