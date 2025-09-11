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
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        'next-auth/next': '<rootDir>/__mocks__/next-auth/next.js',
      },
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
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
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
  }
}