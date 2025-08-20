/**
 * Backup Status API
 * Provides real-time status of backup operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { BackupService } from '@/app/lib/backup';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

const backupService = new BackupService(prisma, backupConfig);

// GET /api/admin/backup/status/[id] - Get backup status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const backupId = params.id;
    const status = backupService.getBackupStatus(backupId);

    if (!status) {
      return NextResponse.json(
        { error: 'Backup not found or completed' },
        { status: 404 }
      );
    }

    return NextResponse.json({ status });

  } catch (error) {
    console.error('Error getting backup status:', error);
    return NextResponse.json(
      { error: 'Failed to get backup status' },
      { status: 500 }
    );
  }
}