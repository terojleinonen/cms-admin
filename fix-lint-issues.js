#!/usr/bin/env node

/**
 * Script to systematically fix common ESLint issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Common fixes
const fixes = [
  // Fix unused variables by prefixing with underscore
  {
    pattern: /(\s+)const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=.*?\/\/.*?never used/g,
    replacement: '$1const _$2 = '
  },
  
  // Fix explicit any types
  {
    pattern: /:\s*any\b/g,
    replacement: ': unknown'
  },
  
  // Fix require imports in TypeScript files
  {
    pattern: /const\s+{\s*([^}]+)\s*}\s*=\s*require\(['"]([^'"]+)['"]\)/g,
    replacement: 'import { $1 } from \'$2\''
  }
];

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    fixes.forEach(fix => {
      const newContent = content.replace(fix.pattern, fix.replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`Fixed: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
  }
}

function findTypeScriptFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

// Main execution
console.log('Starting lint fixes...');

const tsFiles = findTypeScriptFiles('./app');
const testFiles = findTypeScriptFiles('./__tests__');
const allFiles = [...tsFiles, ...testFiles];

console.log(`Found ${allFiles.length} TypeScript files`);

allFiles.forEach(fixFile);

console.log('Lint fixes completed!');