#!/usr/bin/env node

/**
 * Batch Import Path Fixer
 * Automatically fixes import paths in all TypeScript/JavaScript files
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Starting batch import path fixes...\n');

// Import path mappings
const IMPORT_MAPPINGS = [
  // Fix relative imports to absolute
  { from: /from\s+['"]\.\.\/\.\.\/\.\.\/app\/lib\//g, to: "from '@/lib/" },
  { from: /from\s+['"]\.\.\/\.\.\/app\/lib\//g, to: "from '@/lib/" },
  { from: /from\s+['"]\.\.\/app\/lib\//g, to: "from '@/lib/" },
  { from: /from\s+['"]\.\.\/\.\.\/\.\.\/app\/components\//g, to: "from '@/components/" },
  { from: /from\s+['"]\.\.\/\.\.\/app\/components\//g, to: "from '@/components/" },
  { from: /from\s+['"]\.\.\/app\/components\//g, to: "from '@/components/" },
  { from: /from\s+['"]\.\.\/\.\.\/\.\.\/app\/api\//g, to: "from '@/api/" },
  { from: /from\s+['"]\.\.\/\.\.\/app\/api\//g, to: "from '@/api/" },
  { from: /from\s+['"]\.\.\/app\/api\//g, to: "from '@/api/" },
  
  // Fix inconsistent absolute paths
  { from: /from\s+['"]@\/app\/lib\//g, to: "from '@/lib/" },
  { from: /from\s+['"]@\/app\/components\//g, to: "from '@/components/" },
  { from: /from\s+['"]@\/app\/api\//g, to: "from '@/api/" },
  
  // Fix require statements
  { from: /require\(['"]\.\.\/\.\.\/\.\.\/app\/lib\//g, to: "require('@/lib/" },
  { from: /require\(['"]\.\.\/\.\.\/app\/lib\//g, to: "require('@/lib/" },
  { from: /require\(['"]\.\.\/app\/lib\//g, to: "require('@/lib/" },
  { from: /require\(['"]@\/app\/lib\//g, to: "require('@/lib/" },
];

// Find all TypeScript/JavaScript files
function findFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx'], ignore = ['node_modules', '.next', 'coverage', 'dist']) {
  const files = [];
  
  function walk(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        
        try {
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            if (!ignore.some(pattern => fullPath.includes(pattern))) {
              walk(fullPath);
            }
          } else if (extensions.some(ext => item.endsWith(ext))) {
            files.push(fullPath);
          }
        } catch (err) {
          // Skip files we can't access
          continue;
        }
      }
    } catch (err) {
      // Skip directories we can't access
      return;
    }
  }
  
  walk(dir);
  return files;
}

// Fix imports in a single file
function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    // Apply all import mappings
    for (const mapping of IMPORT_MAPPINGS) {
      if (mapping.from.test(content)) {
        content = content.replace(mapping.from, mapping.to);
        changed = true;
      }
    }
    
    if (changed) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed imports in ${filePath}`);
      return true;
    }
    
    return false;
  } catch (err) {
    console.warn(`⚠️  Could not process ${filePath}: ${err.message}`);
    return false;
  }
}

// Main execution
function main() {
  console.log('🔍 Finding files to process...');
  const files = findFiles('.');
  
  console.log(`📁 Found ${files.length} files to check`);
  
  let fixedCount = 0;
  
  for (const file of files) {
    if (fixImportsInFile(file)) {
      fixedCount++;
    }
  }
  
  console.log(`\n🎉 Import fixing complete!`);
  console.log(`📊 Fixed imports in ${fixedCount} files`);
  
  if (fixedCount > 0) {
    console.log('\nNext steps:');
    console.log('1. Run: npm run type-check');
    console.log('2. Run: npm run build');
    console.log('3. Run: npm test (if needed)');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixImportsInFile, findFiles, IMPORT_MAPPINGS };