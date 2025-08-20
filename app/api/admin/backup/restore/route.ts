/**
 * Backup Restore API
 * Handles backup restoration operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { BackupService } from '@/app/lib/backup';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema
const restoreBackupSchema = z.object({
  backupId: z.string().min(1, 'Backup ID is required'),
  restoreDatabase: z.boolean().default(true),
  restoreMedia: z.boolean().default(true),
  overwriteExisting: z.boolean().default(false),
  confirmRestore: z.boolean().refine(val => val === true, {
    message: 'Restore confirmation is required'
  })
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

const backupService = new BackupService(prisma, backupConfig);

// POST /api/admin/backup/restore - Restore from backup
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = restoreBackupSchema.parse(body);

    // Perform restore operation
    await backupService.restoreFromBackup(
      {
        backupId: validatedData.backupId,
        restoreDatabase: validatedData.restoreDatabase,
        restoreMedia: validatedData.restoreMedia,
        overwriteExisting: validatedData.overwriteExisting
      },
      session.user.id
    );

    return NextResponse.json({
      message: 'Backup restored successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Backup restore error:', error);
    return NextResponse.json(
      { error: 'Failed to restore backup' },
      { status: 500 }
    );
  }
}