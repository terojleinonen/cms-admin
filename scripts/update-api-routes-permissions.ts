/**
 * Script to update all API routes with permission validation middleware
 * This script systematically updates existing API routes to use the new permission system
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { glob } from 'glob';

interface RouteUpdate {
  file: string;
  method: string;
  permissions: string;
  allowedMethods?: string[];
}

// Define permission mappings for different routes
const ROUTE_PERMISSIONS: Record<string, RouteUpdate[]> = {
  // Analytics routes
  'app/api/analytics/route.ts': [
    {
      file: 'app/api/analytics/route.ts',
      method: 'GET',
      permissions: '[{ resource: "analytics", action: "read", scope: "all" }]'
    }
  ],
  'app/api/analytics/dashboard/route.ts': [
    {
      file: 'app/api/analytics/dashboard/route.ts',
      method: 'GET',
      permissions: '[{ resource: "analytics", action: "read", scope: "all" }]'
    }
  ],
  'app/api/analytics/export/route.ts': [
    {
      file: 'app/api/analytics/export/route.ts',
      method: 'GET',
      permissions: '[{ resource: "analytics", action: "read", scope: "all" }]'
    }
  ],

  // Media routes
  'app/api/media/[id]/route.ts': [
    {
      file: 'app/api/media/[id]/route.ts',
      method: 'GET',
      permissions: '[{ resource: "media", action: "read", scope: "all" }]'
    },
    {
      file: 'app/api/media/[id]/route.ts',
      method: 'PUT',
      permissions: '[{ resource: "media", action: "update", scope: "all" }]',
      allowedMethods: ['PUT']
    },
    {
      file: 'app/api/media/[id]/route.ts',
      method: 'DELETE',
      permissions: '[{ resource: "media", action: "delete", scope: "all" }]',
      allowedMethods: ['DELETE']
    }
  ],

  // Categories routes
  'app/api/categories/[id]/route.ts': [
    {
      file: 'app/api/categories/[id]/route.ts',
      method: 'GET',
      permissions: '[{ resource: "categories", action: "read", scope: "all" }]'
    },
    {
      file: 'app/api/categories/[id]/route.ts',
      method: 'PUT',
      permissions: '[{ resource: "categories", action: "update", scope: "all" }]',
      allowedMethods: ['PUT']
    },
    {
      file: 'app/api/categories/[id]/route.ts',
      method: 'DELETE',
      permissions: '[{ resource: "categories", action: "delete", scope: "all" }]',
      allowedMethods: ['DELETE']
    }
  ],
  'app/api/categories/reorder/route.ts': [
    {
      file: 'app/api/categories/reorder/route.ts',
      method: 'POST',
      permissions: '[{ resource: "categories", action: "update", scope: "all" }]',
      allowedMethods: ['POST']
    }
  ],

  // Pages routes
  'app/api/pages/route.ts': [
    {
      file: 'app/api/pages/route.ts',
      method: 'GET',
      permissions: '[{ resource: "pages", action: "read", scope: "all" }]'
    },
    {
      file: 'app/api/pages/route.ts',
      method: 'POST',
      permissions: '[{ resource: "pages", action: "create", scope: "all" }]',
      allowedMethods: ['POST']
    }
  ],
  'app/api/pages/[id]/route.ts': [
    {
      file: 'app/api/pages/[id]/route.ts',
      method: 'GET',
      permissions: '[{ resource: "pages", action: "read", scope: "all" }]'
    },
    {
      file: 'app/api/pages/[id]/route.ts',
      method: 'PUT',
      permissions: '[{ resource: "pages", action: "update", scope: "all" }]',
      allowedMethods: ['PUT']
    },
    {
      file: 'app/api/pages/[id]/route.ts',
      method: 'DELETE',
      permissions: '[{ resource: "pages", action: "delete", scope: "all" }]',
      allowedMethods: ['DELETE']
    }
  ],
  'app/api/pages/templates/route.ts': [
    {
      file: 'app/api/pages/templates/route.ts',
      method: 'GET',
      permissions: '[{ resource: "pages", action: "read", scope: "all" }]'
    }
  ],

  // User routes
  'app/api/users/[id]/route.ts': [
    {
      file: 'app/api/users/[id]/route.ts',
      method: 'GET',
      permissions: '[{ resource: "users", action: "read", scope: "all" }]'
    },
    {
      file: 'app/api/users/[id]/route.ts',
      method: 'PUT',
      permissions: '[{ resource: "users", action: "update", scope: "all" }]',
      allowedMethods: ['PUT']
    },
    {
      file: 'app/api/users/[id]/route.ts',
      method: 'DELETE',
      permissions: '[{ resource: "users", action: "delete", scope: "all" }]',
      allowedMethods: ['DELETE']
    }
  ],

  // Notifications routes
  'app/api/notifications/route.ts': [
    {
      file: 'app/api/notifications/route.ts',
      method: 'GET',
      permissions: '[{ resource: "notifications", action: "read", scope: "own" }]'
    },
    {
      file: 'app/api/notifications/route.ts',
      method: 'PUT',
      permissions: '[{ resource: "notifications", action: "update", scope: "own" }]',
      allowedMethods: ['PUT']
    }
  ],
  'app/api/notifications/[id]/route.ts': [
    {
      file: 'app/api/notifications/[id]/route.ts',
      method: 'PUT',
      permissions: '[{ resource: "notifications", action: "update", scope: "own" }]',
      allowedMethods: ['PUT']
    },
    {
      file: 'app/api/notifications/[id]/route.ts',
      method: 'DELETE',
      permissions: '[{ resource: "notifications", action: "delete", scope: "own" }]',
      allowedMethods: ['DELETE']
    }
  ]
};

/**
 * Update a single API route file
 */
async function updateApiRoute(filePath: string, updates: RouteUpdate[]): Promise<void> {
  try {
    console.log(`Updating ${filePath}...`);
    
    let content = await readFile(filePath, 'utf-8');
    
    // Add import statement if not present
    if (!content.includes('withApiPermissions')) {
      const importMatch = content.match(/import.*from.*['"]next\/server['"];?\n/);
      if (importMatch) {
        const importIndex = content.indexOf(importMatch[0]) + importMatch[0].length;
        const newImport = `import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'\n`;
        content = content.slice(0, importIndex) + newImport + content.slice(importIndex);
      }
    }

    // Remove auth import if present
    content = content.replace(/import.*auth.*from.*['"]@\/auth['"];?\n/g, '');

    // Update each method
    for (const update of updates) {
      const methodPattern = new RegExp(
        `export async function ${update.method}\\s*\\([^)]*\\)\\s*{[\\s\\S]*?^}`,
        'gm'
      );

      const match = content.match(methodPattern);
      if (match) {
        const originalFunction = match[0];
        
        // Extract function body (remove auth checks)
        let functionBody = originalFunction
          .replace(/const session = await auth\(\)[;\n\s]*/g, '')
          .replace(/if \(!session[^}]*}\s*/g, '')
          .replace(/if \(session\.user\.role[^}]*}\s*/g, '');

        // Convert to withApiPermissions format
        const permissionsConfig = update.allowedMethods 
          ? `{\n  permissions: ${update.permissions},\n  allowedMethods: ${JSON.stringify(update.allowedMethods)}\n}`
          : `{\n  permissions: ${update.permissions}\n}`;

        const newFunction = `export const ${update.method} = withApiPermissions(\n  async (request: NextRequest, { user }) => {\n    ${functionBody.replace(/^export async function \w+\s*\([^)]*\)\s*{/, '').replace(/}$/, '')}\n  },\n  ${permissionsConfig}\n)`;

        content = content.replace(originalFunction, newFunction);
      }
    }

    // Update response formats
    content = content.replace(
      /return NextResponse\.json\(\s*{([^}]*)},\s*{\s*status:\s*(\d+)\s*}\s*\)/g,
      'return createApiSuccessResponse($1, $2)'
    );

    // Update error responses
    content = content.replace(
      /return NextResponse\.json\(\s*{\s*error:\s*([^}]*)\s*},\s*{\s*status:\s*(\d+)\s*}\s*\)/g,
      (match, errorContent, status) => {
        if (errorContent.includes('code:')) {
          return `return NextResponse.json(\n      { \n        error: {\n          ${errorContent.trim()},\n          timestamp: new Date().toISOString()\n        },\n        success: false\n      },\n      { status: ${status} }\n    )`;
        } else {
          return `return NextResponse.json(\n      { \n        error: {\n          code: 'INTERNAL_ERROR',\n          message: ${errorContent.trim()},\n          timestamp: new Date().toISOString()\n        },\n        success: false\n      },\n      { status: ${status} }\n    )`;
        }
      }
    );

    await writeFile(filePath, content, 'utf-8');
    console.log(`✅ Updated ${filePath}`);
    
  } catch (error) {
    console.error(`❌ Failed to update ${filePath}:`, error);
  }
}

/**
 * Main function to update all API routes
 */
async function updateAllApiRoutes(): Promise<void> {
  console.log('🚀 Starting API routes permission update...\n');

  for (const [filePath, updates] of Object.entries(ROUTE_PERMISSIONS)) {
    await updateApiRoute(filePath, updates);
  }

  console.log('\n✅ All API routes have been updated with permission validation!');
  console.log('\n📝 Next steps:');
  console.log('1. Run tests to verify the updates work correctly');
  console.log('2. Check for any remaining manual auth checks in API routes');
  console.log('3. Update any custom validation logic as needed');
}

// Run the script
if (require.main === module) {
  updateAllApiRoutes().catch(console.error);
}

export { updateAllApiRoutes, updateApiRoute, ROUTE_PERMISSIONS };