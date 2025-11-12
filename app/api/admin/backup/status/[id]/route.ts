/**
 * Backup Status API
 * Provides real-time status of backup operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiPermissions, createApiSuccessResponse } from '@/lib/api-permission-middleware'
import { BackupService } from '@/lib/backup';

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

// GET /api/admin/backup/status/[id] - Get backup status
export const GET = withApiPermissions(
  async (request: NextRequest, { user, params }) => {
    try {
      const { id: backupId } = await params || {};
    const status = backupService.getBackupStatus(backupId);

    if (!status) {
      return NextResponse.json(
        { error: 'Backup not found or completed' },
        { status: 404 }
      );
    }

    return createApiSuccessResponse( status );

  } catch (error) {
    console.error('Error getting backup status:', error);
    return NextResponse.json(
      { error: 'Failed to get backup status' },
      { status: 500 }
    );
  }

  },
  {
  permissions: [{ resource: 'system', action: 'read', scope: 'all' }]
}
)