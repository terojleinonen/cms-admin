/**
 * Backup Management API
 * Handles backup creation, listing, and management operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { BackupService } from '@/lib/backup';
import { z } from 'zod';

// Validation schemas
const createBackupSchema = z.object({
  type: z.enum(['database', 'media', 'full']),
  description: z.string().optional()
});

const listBackupsSchema = z.object({
  type: z.enum(['database', 'media', 'full']).optional(),
  limit: z.number().min(1).max(100).optional().default(50)
});

// Initialize backup service
const backupConfig = {
  databaseUrl: process.env.DATABASE_URL!,
  backupDir: process.env.BACKUP_DIR || 'backups',
  mediaDir: process.env.MEDIA_DIR || 'public/uploads',
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
  compressionEnabled: process.env.BACKUP_COMPRESSION === 'true',
  encryptionEnabled: process.env.BACKUP_ENCRYPTION === 'true',
  encryptionKey: process.env.BACKUP_ENCRYPTION_KEY
};

const backupService = new BackupService(backupConfig.backupDir);

// POST /api/admin/backup - Create new backup
export const POST = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    , { status: 401 });
    }

    const body = await request.json();
    const validatedData = createBackupSchema.parse(body);

    let backupId: string;

    switch (validatedData.type) {
      case 'database':
        await backupService.createDatabaseBackup();
        // For individual backups, we need to handle metadata separately
        backupId = 'db_' + Date.now();
        break;
        
      case 'media':
        await backupService.createMediaBackup();
        backupId = 'media_' + Date.now();
        break;
        
      case 'full':
        backupId = await backupService.createFullBackup(
          session.user.id,
          validatedData.description
        );
        break;
        
      default:
        throw new Error('Invalid backup type');
    }

    return createApiSuccessResponse(
      backupId,
      message: 'Backup created successfully'
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Backup creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 }
    );
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)

// GET /api/admin/backup - List backups
export const GET = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    , { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      type: searchParams.get('type') as 'database' | 'media' | 'full' | undefined,
      limit: parseInt(searchParams.get('limit') || '50')
    };

    const validatedQuery = listBackupsSchema.parse(queryParams);

    const backups = await backupService.listBackups(
      validatedQuery.type,
      validatedQuery.limit
    );

    return createApiSuccessResponse( backups );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error listing backups:', error);
    return NextResponse.json(
      { error: 'Failed to list backups' },
      { status: 500 }
    );
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)

// DELETE /api/admin/backup - Cleanup old backups
export const DELETE = withApiPermissions(
  async (request: NextRequest, { user }) => {
    
  try {
    , { status: 401 });
    }

    const result = await backupService.cleanupOldBackups();

    return createApiSuccessResponse(
      message: 'Backup cleanup completed',
      deletedCount: result.deletedCount,
      freedSpace: result.freedSpace
    );

  } catch (error) {
    console.error('Backup cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup backups' },
      { status: 500 }
    );
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)