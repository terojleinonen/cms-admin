#!/usr/bin/env node

/**
 * Automated Type Fixes
 * Fixes common TypeScript issues in test files
 */

const fs = require('fs');
const glob = require('glob');

const fixes = [
  // Fix Prisma mock types
  {
    pattern: /mockPrisma\.user\.(\w+)\.mockResolvedValue/g,
    replacement: '(mockPrisma.user.$1 as jest.MockedFunction<any>).mockResolvedValue'
  },
  {
    pattern: /mockPrisma\.product\.(\w+)\.mockResolvedValue/g,
    replacement: '(mockPrisma.product.$1 as jest.MockedFunction<any>).mockResolvedValue'
  },
  {
    pattern: /mockPrisma\.category\.(\w+)\.mockResolvedValue/g,
    replacement: '(mockPrisma.category.$1 as jest.MockedFunction<any>).mockResolvedValue'
  },
  
  // Fix bcrypt mock types
  {
    pattern: /mockBcrypt\.hash\.mockResolvedValue/g,
    replacement: '(mockBcrypt.hash as jest.MockedFunction<any>).mockResolvedValue'
  },
  {
    pattern: /mockBcrypt\.compare\.mockResolvedValue/g,
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
    console.log(`✅ Applied type fixes to ${filePath}`);
  }
}

// Find and fix test files
const testFiles = glob.sync('**/*.test.{ts,tsx}', { 
  ignore: ['node_modules/**', '.next/**', 'coverage/**'] 
});

console.log(`🔧 Applying type fixes to ${testFiles.length} test files...`);

testFiles.forEach(applyFixes);

console.log('✅ Type fixes complete!');
