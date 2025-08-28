#!/usr/bin/env node

/**
 * Fix Critical TypeScript Issues
 * Addresses the most common and blocking TypeScript errors
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing critical TypeScript issues...\n');

// Fix 1: Update Next.js API route params for Next.js 15
function fixNextJSApiRoutes() {
  console.log('📝 Fixing Next.js 15 API route params...');
  
  const apiRouteFiles = [
    'app/api/products/[id]/route.ts',
    'app/api/users/[id]/route.ts',
    'app/api/media/[id]/route.ts',
    'app/api/categories/[id]/route.ts'
  ];
  
  for (const filePath of apiRouteFiles) {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Fix params type for Next.js 15
      content = content.replace(
        /{ params }: { params: Promise<{ id: string }> }/g,
        '{ params }: { params: { id: string } }'
      );
      
      // Also fix any await params usage
      content = content.replace(
        /const { id } = await params/g,
        'const { id } = params'
      );
      
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed ${filePath}`);
    }
  }
}

// Fix 2: Create proper mock types for tests
function createMockTypes() {
  console.log('📝 Creating proper mock types...');
  
  const mockTypesContent = `// Mock types for testing

import { PrismaClient } from '@prisma/client';
import { DeepMockProxy } from 'jest-mock-extended';

export type MockPrisma = DeepMockProxy<PrismaClient>;

// Mock bcrypt types
export interface MockBcrypt {
  hash: jest.MockedFunction<typeof import('bcryptjs').hash>;
  compare: jest.MockedFunction<typeof import('bcryptjs').compare>;
}

// Test data types
export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: import('@prisma/client').UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  price: number;
  comparePrice?: number;
  sku?: string;
  inventoryQuantity: number;
  weight?: number;
  dimensions?: any;
  status: import('@prisma/client').ProductStatus;
  featured: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  categories: any[];
}

export interface TestCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: import('@prisma/client').PageStatus;
  template: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
`;

  if (!fs.existsSync('types')) {
    fs.mkdirSync('types', { recursive: true });
  }
  
  fs.writeFileSync('types/test-types.d.ts', mockTypesContent);
  console.log('✅ Mock types created');
}

// Fix 3: Update Jest setup for proper mocking
function fixJestSetup() {
  console.log('📝 Fixing Jest setup...');
  
  const jestSetupContent = `import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Mock Next.js modules
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    has: jest.fn(),
    getAll: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    entries: jest.fn(),
    forEach: jest.fn(),
    toString: jest.fn(),
  }),
  usePathname: () => '/test-path',
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN',
      },
    },
    status: 'authenticated',
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    media: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

// Global test environment setup
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3001';

// Suppress console warnings in tests
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  if (args[0]?.includes?.('Warning:')) {
    return;
  }
  originalWarn(...args);
};
`;

  fs.writeFileSync('jest.setup.js', jestSetupContent);
  console.log('✅ Jest setup updated');
}

// Fix 4: Create proper environment types
function fixEnvironmentTypes() {
  console.log('📝 Fixing environment types...');
  
  const envTypesContent = `// Environment variable types

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly NODE_ENV: 'development' | 'production' | 'test';
      readonly DATABASE_URL: string;
      readonly NEXTAUTH_SECRET: string;
      readonly NEXTAUTH_URL: string;
      readonly POSTGRES_USER?: string;
      readonly POSTGRES_PASSWORD?: string;
      readonly POSTGRES_DB?: string;
    }
  }
}

export {};
`;

  fs.writeFileSync('types/env.d.ts', envTypesContent);
  console.log('✅ Environment types updated');
}

// Fix 5: Update package.json with correct dependencies
function fixPackageDependencies() {
  console.log('📝 Fixing package dependencies...');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Fix NextAuth version compatibility
  packageJson.dependencies['next-auth'] = '^4.24.11';
  packageJson.dependencies['@auth/prisma-adapter'] = '^1.6.0';
  
  // Add missing dev dependencies
  packageJson.devDependencies = {
    ...packageJson.devDependencies,
    'jest-mock-extended': '^3.0.5',
    '@types/bcryptjs': '^2.4.6',
    '@types/jsonwebtoken': '^9.0.10',
  };
  
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  console.log('✅ Package dependencies updated');
}

// Fix 6: Create a comprehensive type fix script
function createTypeFixScript() {
  console.log('📝 Creating type fix script...');
  
  const typeFixScript = `#!/usr/bin/env node

/**
 * Automated Type Fixes
 * Fixes common TypeScript issues in test files
 */

const fs = require('fs');
const glob = require('glob');

const fixes = [
  // Fix Prisma mock types
  {
    pattern: /mockPrisma\\.user\\.(\\w+)\\.mockResolvedValue/g,
    replacement: '(mockPrisma.user.$1 as jest.MockedFunction<any>).mockResolvedValue'
  },
  {
    pattern: /mockPrisma\\.product\\.(\\w+)\\.mockResolvedValue/g,
    replacement: '(mockPrisma.product.$1 as jest.MockedFunction<any>).mockResolvedValue'
  },
  {
    pattern: /mockPrisma\\.category\\.(\\w+)\\.mockResolvedValue/g,
    replacement: '(mockPrisma.category.$1 as jest.MockedFunction<any>).mockResolvedValue'
  },
  
  // Fix bcrypt mock types
  {
    pattern: /mockBcrypt\\.hash\\.mockResolvedValue/g,
    replacement: '(mockBcrypt.hash as jest.MockedFunction<any>).mockResolvedValue'
  },
  {
    pattern: /mockBcrypt\\.compare\\.mockResolvedValue/g,
    replacement: '(mockBcrypt.compare as jest.MockedFunction<any>).mockResolvedValue'
  },
  
  // Fix API route params
  {
    pattern: /{ params: { id: ['"]([^'"]+)['"] } }/g,
    replacement: '{ params: Promise.resolve({ id: "$1" }) }'
  },
  
  // Fix null assignments for JSON fields
  {
    pattern: /dimensions: null,/g,
    replacement: 'dimensions: null as any,'
  },
  {
    pattern: /parentId: null,/g,
    replacement: 'parentId: null as any,'
  },
  {
    pattern: /description: null,/g,
    replacement: 'description: null as any,'
  }
];

function applyFixes(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  for (const fix of fixes) {
    if (fix.pattern.test(content)) {
      content = content.replace(fix.pattern, fix.replacement);
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(\`✅ Applied type fixes to \${filePath}\`);
  }
}

// Find and fix test files
const testFiles = glob.sync('**/*.test.{ts,tsx}', { 
  ignore: ['node_modules/**', '.next/**', 'coverage/**'] 
});

console.log(\`🔧 Applying type fixes to \${testFiles.length} test files...\`);

testFiles.forEach(applyFixes);

console.log('✅ Type fixes complete!');
`;

  fs.writeFileSync('scripts/fix-types.js', typeFixScript);
  fs.chmodSync('scripts/fix-types.js', '755');
  console.log('✅ Type fix script created');
}

// Main execution
async function main() {
  try {
    if (!fs.existsSync('scripts')) {
      fs.mkdirSync('scripts', { recursive: true });
    }
    
    fixNextJSApiRoutes();
    createMockTypes();
    fixJestSetup();
    fixEnvironmentTypes();
    fixPackageDependencies();
    createTypeFixScript();
    
    console.log('\n🎉 Critical type fixes completed!');
    console.log('\nNext steps:');
    console.log('1. Run: npm install');
    console.log('2. Run: node scripts/fix-types.js');
    console.log('3. Run: npm run type-check');
    
  } catch (error) {
    console.error('❌ Error during fix process:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}