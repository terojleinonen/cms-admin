/**
 * Script to update remaining API routes with permission validation
 * This script updates all remaining API routes that still use the old auth pattern
 */

import { promises as fs } from 'fs';
import path from 'path';

// Routes that have already been updated
const UPDATED_ROUTES = [
  'app/api/products/route.ts',
  'app/api/users/route.ts', 
  'app/api/categories/route.ts',
  'app/api/media/route.ts'
];

// Permission mappings for different route patterns
const PERMISSION_MAPPINGS = {
  // Analytics routes
  'analytics': { resource: 'analytics', action: 'read', scope: 'all' },
  'analytics/dashboard': { resource: 'analytics', action: 'read', scope: 'all' },
  'analytics/export': { resource: 'analytics', action: 'read', scope: 'all' },
  
  // Media routes
  'media': { resource: 'media', action: 'read', scope: 'all' },
  'media/[id]': { resource: 'media', action: 'read', scope: 'all' },
  
  // Categories routes
  'categories/[id]': { resource: 'categories', action: 'read', scope: 'all' },
  'categories/reorder': { resource: 'categories', action: 'update', scope: 'all' },
  
  // Pages routes
  'pages': { resource: 'pages', action: 'read', scope: 'all' },
  'pages/[id]': { resource: 'pages', action: 'read', scope: 'all' },
  'pages/[id]/preview': { resource: 'pages', action: 'read', scope: 'all' },
  'pages/preview': { resource: 'pages', action: 'read', scope: 'all' },
  'pages/templates': { resource: 'pages', action: 'read', scope: 'all' },
  
  // User routes
  'users/[id]': { resource: 'users', action: 'read', scope: 'all' },
  'users/[id]/avatar': { resource: 'profile', action: 'update', scope: 'own' },
  'users/[id]/preferences': { resource: 'profile', action: 'update', scope: 'own' },
  'users/[id]/notification-preferences': { resource: 'profile', action: 'update', scope: 'own' },
  'users/[id]/security': { resource: 'profile', action: 'update', scope: 'own' },
  'users/[id]/sessions': { resource: 'profile', action: 'read', scope: 'own' },
  'users/[id]/two-factor': { resource: 'profile', action: 'update', scope: 'own' },
  'users/[id]/export': { resource: 'users', action: 'read', scope: 'all' },
  'users/[id]/deactivate': { resource: 'users', action: 'manage', scope: 'all' },
  
  // Notifications routes
  'notifications': { resource: 'notifications', action: 'read', scope: 'own' },
  'notifications/[id]': { resource: 'notifications', action: 'update', scope: 'own' },
  
  // Workflow routes
  'workflow': { resource: 'workflow', action: 'read', scope: 'all' },
  'workflow/revisions': { resource: 'workflow', action: 'read', scope: 'all' },
  
  // System routes
  'csrf-token': { resource: 'system', action: 'read', scope: 'all' }
};

/**
 * Get permission for a route path
 */
function getPermissionForRoute(routePath, method = 'GET') {
  // Extract the API path from the full path
  const apiPath = routePath.replace('app/api/', '').replace('/route.ts', '');
  
  // Check for exact match first
  if (PERMISSION_MAPPINGS[apiPath]) {
    let permission = { ...PERMISSION_MAPPINGS[apiPath] };
    
    // Adjust action based on HTTP method
    if (method === 'POST') {
      permission.action = 'create';
    } else if (method === 'PUT') {
      permission.action = 'update';
    } else if (method === 'DELETE') {
      permission.action = 'delete';
    }
    
    return permission;
  }
  
  // Default fallback
  return { resource: 'system', action: 'read', scope: 'all' };
}

/**
 * Update a single API route file
 */
async function updateApiRoute(filePath) {
  try {
    console.log(`Updating ${filePath}...`);
    
    let content = await fs.readFile(filePath, 'utf-8');
    
    // Skip if already updated
    if (content.includes('withApiPermissions')) {
      console.log(`✅ ${filePath} already updated`);
      return;
    }
    
    // Add import statement
    if (!content.includes('withApiPermissions')) {
      const importMatch = content.match(/import.*from.*['"]next\/server['"];?\n/);
      if (importMatch) {
        const importIndex = content.indexOf(importMatch[0]) + importMatch[0].length;
        const newImport = `import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'\n`;
        content = content.slice(0, importIndex) + newImport + content.slice(importIndex);
      }
    }

    // Remove auth import
    content = content.replace(/import.*auth.*from.*['"]@\/auth['"];?\n/g, '');
    
    // Update HTTP method handlers
    const methods = ['GET', 'POST', 'PUT', 'DELETE'];
    
    for (const method of methods) {
      const methodPattern = new RegExp(
        `export async function ${method}\\s*\\([^)]*\\)\\s*{[\\s\\S]*?^}`,
        'gm'
      );

      const matches = content.match(methodPattern);
      if (matches) {
        for (const match of matches) {
          // Get permission for this route and method
          const permission = getPermissionForRoute(filePath, method);
          
          // Extract function body and clean up auth checks
          let functionBody = match
            .replace(/const session = await auth\(\)[;\n\s]*/g, '')
            .replace(/if \(!session[^}]*}\s*/g, '')
            .replace(/if \(session\.user\.role[^}]*}\s*/g, '')
            .replace(/if \(!hasPermission[^}]*}\s*/g, '');

          // Convert to withApiPermissions format
          const permissionsConfig = `{
  permissions: [{ resource: '${permission.resource}', action: '${permission.action}', scope: '${permission.scope}' }]
}`;

          const newFunction = `export const ${method} = withApiPermissions(
  async (request: NextRequest, { user }) => {
    ${functionBody.replace(/^export async function \w+\s*\([^)]*\)\s*{/, '').replace(/}$/, '')}
  },
  ${permissionsConfig}
)`;

          content = content.replace(match, newFunction);
        }
      }
    }

    // Update response formats
    content = content.replace(
      /return NextResponse\.json\(\s*{([^}]*)},\s*{\s*status:\s*(\d+)\s*}\s*\)/g,
      (match, data, status) => {
        if (data.includes('error')) {
          return match; // Keep error responses as is for now
        }
        return `return createApiSuccessResponse(${data}, ${status})`;
      }
    );

    // Update simple success responses
    content = content.replace(
      /return NextResponse\.json\(\s*{([^}]*)}\s*\)/g,
      (match, data) => {
        if (data.includes('error')) {
          return match; // Keep error responses as is
        }
        return `return createApiSuccessResponse(${data})`;
      }
    );

    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`✅ Updated ${filePath}`);
    
  } catch (error) {
    console.error(`❌ Failed to update ${filePath}:`, error.message);
  }
}

/**
 * Find all API route files
 */
async function findApiRoutes(dir = 'app/api') {
  const routes = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subRoutes = await findApiRoutes(fullPath);
        routes.push(...subRoutes);
      } else if (entry.name === 'route.ts') {
        routes.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  
  return routes;
}

/**
 * Main function to update all API routes
 */
async function updateAllApiRoutes() {
  console.log('🚀 Starting API routes permission update...\n');

  const allRoutes = await findApiRoutes();
  const routesToUpdate = allRoutes.filter(route => !UPDATED_ROUTES.includes(route));
  
  console.log(`Found ${allRoutes.length} total API routes`);
  console.log(`${UPDATED_ROUTES.length} already updated`);
  console.log(`${routesToUpdate.length} need updating\n`);

  for (const route of routesToUpdate) {
    await updateApiRoute(route);
  }

  console.log('\n✅ All API routes have been updated with permission validation!');
  console.log('\n📝 Next steps:');
  console.log('1. Run tests to verify the updates work correctly');
  console.log('2. Check for any compilation errors');
  console.log('3. Test the API endpoints manually');
}

// Run the script
updateAllApiRoutes().catch(console.error);

export { updateAllApiRoutes, updateApiRoute };