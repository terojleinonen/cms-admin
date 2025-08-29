const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
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
  
  // Performance optimizations
  maxWorkers: '50%',
  workerIdleMemoryLimit: '512MB',
  
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
  ],
  
  // Environment setup
  testEnvironmentOptions: {
    customExportConditions: [''],
    url: 'http://localhost:3001',
  },
  
  // Timeout settings
  testTimeout: 30000,
  
  // Remove custom transform - let Next.js handle it
  
  // Cache settings
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output control
  verbose: false,
  silent: false,
};

module.exports = createJestConfig(customJestConfig);
