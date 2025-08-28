#!/usr/bin/env node

/**
 * Comprehensive Import and Config Fix Script
 * 
 * This script fixes:
 * 1. Import path inconsistencies
 * 2. TypeScript configuration issues
 * 3. Path mapping problems
 * 4. NextAuth adapter conflicts
 * 5. Missing type definitions
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Starting comprehensive import and config fix...\n');

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
        "@/api/*": ["./app/api/*"],
        "@/types/*": ["./app/lib/types/*"],
        "@/utils/*": ["./app/lib/*"]
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

// Step 3: Create path mapping helper
function createPathMappingHelper() {
  console.log('📝 Creating path mapping helper...');
  
  const pathHelper = `/**
 * Path mapping helper for consistent imports
 * Use this to ensure all imports use the correct paths
 */

// Standard path mappings
export const PATHS = {
  // Components
  COMPONENTS: '@/components',
  UI: '@/components/ui',
  LAYOUT: '@/components/layout',
  
  // Library
  LIB: '@/lib',
  UTILS: '@/lib',
  TYPES: '@/lib/types',
  
  // API
  API: '@/api',
  
  // App directories
  APP: '@',
} as const;

// Helper function to resolve paths
export function resolvePath(basePath: string, ...segments: string[]): string {
  return [basePath, ...segments].join('/');
}

// Common import paths
export const IMPORT_PATHS = {
  // Database
  PRISMA: '@/lib/prisma',
  DB: '@/lib/db',
  
  // Auth
  AUTH_CONFIG: '@/lib/auth-config',
  AUTH_UTILS: '@/lib/auth-utils',
  
  // Types
  TYPES: '@/lib/types',
  
  // Components
  UI_BUTTON: '@/components/ui/Button',
  UI_INPUT: '@/components/ui/Input',
  UI_FORM_FIELD: '@/components/ui/FormField',
  
} as const;
`;

  if (!fs.existsSync('app/lib')) {
    fs.mkdirSync('app/lib', { recursive: true });
  }
  
  fs.writeFileSync('app/lib/path-mappings.ts', pathHelper);
  console.log('✅ Path mapping helper created');
}

// Step 4: Fix package.json dependencies
function fixPackageJson() {
  console.log('📝 Fixing package.json dependencies...');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Update NextAuth to compatible version
  packageJson.dependencies['next-auth'] = '^4.24.11';
  packageJson.dependencies['@auth/prisma-adapter'] = '^1.6.0';
  
  // Add missing dev dependencies
  packageJson.devDependencies = {
    ...packageJson.devDependencies,
    '@types/node': '^22.10.2',
    '@types/react': '^18.3.17',
    '@types/react-dom': '^18.3.5',
  };
  
  // Add type checking script
  packageJson.scripts['type-check'] = 'tsc --noEmit';
  packageJson.scripts['fix-imports'] = 'node fix-imports-and-config.js';
  
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  console.log('✅ Package.json updated');
}

// Step 5: Create import fixer utility
function createImportFixer() {
  console.log('📝 Creating import fixer utility...');
  
  const importFixer = `#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Fixes import paths in TypeScript/JavaScript files
 */

const IMPORT_MAPPINGS = {
  // Relative to absolute mappings
  '../../../app/lib/': '@/lib/',
  '../../../app/components/': '@/components/',
  '../../../app/api/': '@/api/',
  '../../app/lib/': '@/lib/',
  '../../app/components/': '@/components/',
  '../../app/api/': '@/api/',
  '../app/lib/': '@/lib/',
  '../app/components/': '@/components/',
  '../app/api/': '@/api/',
  
  // Fix inconsistent absolute paths
  '@/app/lib/': '@/lib/',
  '@/app/components/': '@/components/',
  '@/app/api/': '@/api/',
};

function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Fix import statements
  for (const [oldPath, newPath] of Object.entries(IMPORT_MAPPINGS)) {
    const escapedOldPath = oldPath.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
    const importRegex = new RegExp('import(.*?)from\\s*[\'"\`]' + escapedOldPath, 'g');
    if (importRegex.test(content)) {
      content = content.replace(importRegex, 'import$1from \\'' + newPath);
      changed = true;
    }
  }
  
  // Fix require statements  
  for (const [oldPath, newPath] of Object.entries(IMPORT_MAPPINGS)) {
    const escapedOldPath = oldPath.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
    const requireRegex = new RegExp('require\\([\'"\`]' + escapedOldPath, 'g');
    if (requireRegex.test(content)) {
      content = content.replace(requireRegex, 'require(\\'' + newPath);
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log('✅ Fixed imports in ' + filePath);
  }
}

// Simple file finder without glob dependency
function findFiles(dir, extensions, ignore = []) {
  const files = [];
  
  function walk(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!ignore.some(pattern => fullPath.includes(pattern))) {
          walk(fullPath);
        }
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

const files = findFiles('.', ['.ts', '.tsx', '.js', '.jsx'], ['node_modules', '.next', 'coverage']);

console.log('🔧 Fixing imports in ' + files.length + ' files...');

files.forEach(fixImportsInFile);

console.log('✅ Import fixing complete!');
`;

  fs.writeFileSync('scripts/fix-imports.js', importFixer);
  fs.chmodSync('scripts/fix-imports.js', '755');
  console.log('✅ Import fixer utility created');
}

// Step 6: Create type definitions
function createTypeDefinitions() {
  console.log('📝 Creating missing type definitions...');
  
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

// Step 7: Fix Jest configuration
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
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
`;

  fs.writeFileSync('jest.config.js', jestConfig);
  console.log('✅ Jest configuration updated');
}

// Main execution
async function main() {
  try {
    // Create necessary directories
    if (!fs.existsSync('scripts')) {
      fs.mkdirSync('scripts', { recursive: true });
    }
    if (!fs.existsSync('types')) {
      fs.mkdirSync('types', { recursive: true });
    }

    // Run all fixes
    fixTsConfig();
    fixNextConfig();
    fixPackageJson();
    createPathMappingHelper();
    createImportFixer();
    createTypeDefinitions();
    fixJestConfig();
    
    console.log('\n🎉 All fixes completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: npm install');
    console.log('2. Run: node scripts/fix-imports.js');
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

module.exports = {
  fixTsConfig,
  fixNextConfig,
  fixPackageJson,
  createPathMappingHelper,
  createImportFixer,
  createTypeDefinitions,
  fixJestConfig,
};