#!/usr/bin/env node

/**
 * Simple Import and Config Fix Script
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Starting import and config fixes...\n');

// Step 1: Fix TypeScript configuration
function fixTsConfig() {
  console.log('📝 Fixing TypeScript configuration...');
  
  const tsConfig = {
    compilerOptions: {
      target: "ES2017",
      lib: ["dom", "dom.iterable", "ES6"],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      forceConsistentCasingInFileNames: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "preserve",
      incremental: true,
      composite: true,
      plugins: [{ name: "next" }],
      baseUrl: ".",
      paths: {
        "@/*": ["./app/*"],
        "@/components/*": ["./app/components/*"],
        "@/lib/*": ["./app/lib/*"],
        "@/api/*": ["./app/api/*"]
      }
    },
    include: [
      "next-env.d.ts",
      "**/*.ts",
      "**/*.tsx",
      ".next/types/**/*.ts"
    ],
    exclude: [
      "node_modules",
      ".next",
      "coverage",
      "dist"
    ]
  };

  fs.writeFileSync('tsconfig.json', JSON.stringify(tsConfig, null, 2));
  console.log('✅ TypeScript configuration updated');
}

// Step 2: Fix Next.js configuration
function fixNextConfig() {
  console.log('📝 Fixing Next.js configuration...');
  
  const nextConfig = `/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Fix for module resolution issues
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './app'),
    };
    
    return config;
  },
}

module.exports = nextConfig;
`;

  fs.writeFileSync('next.config.js', nextConfig);
  console.log('✅ Next.js configuration updated');
}

// Step 3: Create type definitions
function createTypeDefinitions() {
  console.log('📝 Creating missing type definitions...');
  
  if (!fs.existsSync('types')) {
    fs.mkdirSync('types', { recursive: true });
  }
  
  const globalTypes = `// Global type definitions for the CMS Admin

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      NEXTAUTH_SECRET: string;
      NEXTAUTH_URL: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

// NextAuth module augmentation
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: import('@prisma/client').UserRole;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: import('@prisma/client').UserRole;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: import('@prisma/client').UserRole;
  }
}

export {};
`;

  fs.writeFileSync('types/global.d.ts', globalTypes);
  console.log('✅ Global type definitions created');
}

// Step 4: Fix Jest configuration
function fixJestConfig() {
  console.log('📝 Fixing Jest configuration...');
  
  const jestConfig = `const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/app/$1',
    '^@/components/(.*)$': '<rootDir>/app/components/$1',
    '^@/lib/(.*)$': '<rootDir>/app/lib/$1',
    '^@/api/(.*)$': '<rootDir>/app/api/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
  ],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/layout.tsx',
    '!app/**/loading.tsx',
    '!app/**/not-found.tsx',
  ],
};

module.exports = createJestConfig(customJestConfig);
`;

  fs.writeFileSync('jest.config.js', jestConfig);
  console.log('✅ Jest configuration updated');
}

// Step 5: Create import mapping guide
function createImportGuide() {
  console.log('📝 Creating import mapping guide...');
  
  const guide = `# Import Path Mapping Guide

## Correct Import Patterns

### Use absolute imports with @ prefix:
\`\`\`typescript
// ✅ Correct
import { prisma } from '@/lib/db'
import Button from '@/components/ui/Button'
import { UserRole } from '@prisma/client'

// ❌ Avoid relative imports
import { prisma } from '@/lib/db'
import Button from '@/components/ui/Button'
\`\`\`

### Path Mappings:
- \`@/*\` → \`./app/*\`
- \`@/lib/*\` → \`./app/lib/*\`
- \`@/components/*\` → \`./app/components/*\`
- \`@/api/*\` → \`./app/api/*\`

### Common Import Paths:
\`\`\`typescript
// Database
import { prisma } from '@/lib/db'
import { prisma } from '@/lib/prisma'

// Auth
import { authOptions } from '@/lib/auth-config'
import { hashPassword } from '@/lib/auth-utils'

// Components
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

// Types
import { UserRole } from '@prisma/client'
import type { User } from '@/lib/types'
\`\`\`

## Manual Fix Instructions

1. Replace relative imports with absolute imports
2. Use consistent path prefixes
3. Update test files to use new paths
4. Run \`npm run type-check\` to verify
`;

  fs.writeFileSync('IMPORT_GUIDE.md', guide);
  console.log('✅ Import mapping guide created');
}

// Main execution
async function main() {
  try {
    fixTsConfig();
    fixNextConfig();
    createTypeDefinitions();
    fixJestConfig();
    createImportGuide();
    
    console.log('\n🎉 Configuration fixes completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: npm install');
    console.log('2. Manually fix import paths using the guide in IMPORT_GUIDE.md');
    console.log('3. Run: npm run type-check');
    console.log('4. Run: npm run build');
    
  } catch (error) {
    console.error('❌ Error during fix process:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}