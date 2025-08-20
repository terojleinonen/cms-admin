/**
 * Backup System Tests
 * Tests the backup and recovery functionality
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BackupService } from '@/lib/backup';
import { promises as fs } from 'fs';
import path from 'path';

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    stat: jest.fn(),
    unlink: jest.fn(),
    readdir: jest.fn(),
    access: jest.fn()
  }
}));

jest.mock('child_process', () => ({
  exec: jest.fn()
}));

// Mock Prisma Client
const mockPrisma = {
  backup: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn()
  },
  backupRestoreLog: {
    create: jest.fn()
  }
} as any;

const mockFs = fs as jest.Mocked<typeof fs>;

describe('BackupService', () => {
  let backupService: BackupService;
  let mockConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      databaseUrl: 'postgresql://user:pass@localhost:5432/testdb',
      backupDir: '/tmp/backups',
      mediaDir: '/tmp/media',
      retentionDays: 30,
      compressionEnabled: true,
      encryptionEnabled: false
    };

    backupService = new BackupService(mockPrisma, mockConfig);
  });

  describe('Backup Creation', () => {
    it('should create a full backup successfully', async () => {
      // Mock file system operations
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({ size: 1024000 } as any);
      
      // Mock successful backup creation
      const mockExec = require('child_process').exec;
      mockExec.mockImplementation((command: string, options: any, callback: Function) => {
        callback(null, { stdout: 'Backup completed', stderr: '' });
      });

      // Mock database operations
      mockPrisma.backup.create.mockResolvedValue({
        id: 'backup-123',
        type: 'full',
        filename: 'full-backup-test.tar.gz'
      });

      const backupId = await backupService.createFullBackup('user-123', 'Test backup');

      expect(backupId).toBeDefined();
      expect(mockPrisma.backup.create).toHaveBeenCalled();
    });

    it('should create database backup', async () => {
      mockFs.stat.mockResolvedValue({ size: 512000 } as any);
      
      const mockExec = require('child_process').exec;
      mockExec.mockImplementation((command: string, options: any, callback: Function) => {
        expect(command).toContain('pg_dump');
        callback(null, { stdout: 'Database backup completed', stderr: '' });
      });

      const backupPath = await backupService.createDatabaseBackup();
      expect(backupPath).toContain('.sql');
    });

    it('should create media backup', async () => {
      const mockExec = require('child_process').exec;
      mockExec.mockImplementation((command: string, options: any, callback: Function) => {
        expect(command).toContain('tar');
        expect(command).toContain('-czf');
        callback(null, { stdout: 'Media backup completed', stderr: '' });
      });

      const backupPath = await backupService.createMediaBackup();
      expect(backupPath).toContain('media-backup');
      expect(backupPath).toContain('.tar.gz');
    });

    it('should handle backup creation errors', async () => {
      const mockExec = require('child_process').exec;
      mockExec.mockImplementation((command: string, options: any, callback: Function) => {
        callback(new Error('Backup failed'), null);
      });

      await expect(backupService.createDatabaseBackup()).rejects.toThrow('Database backup failed');
    });
  });

  describe('Backup Listing', () => {
    it('should list all backups', async () => {
      const mockBackups = [
        {
          id: 'backup-1',
          type: 'full',
          filename: 'full-backup-1.tar.gz',
          size: 1024000,
          compressed: true,
          encrypted: false,
          createdAt: new Date(),
          createdBy: 'user-1',
          checksum: 'abc123',
          version: '1.0'
        },
        {
          id: 'backup-2',
          type: 'database',
          filename: 'db-backup-1.sql.gz',
          size: 512000,
          compressed: true,
          encrypted: false,
          createdAt: new Date(),
          createdBy: 'user-1',
          checksum: 'def456',
          version: '1.0'
        }
      ];

      mockPrisma.backup.findMany.mockResolvedValue(mockBackups);

      const backups = await backupService.listBackups();

      expect(backups).toHaveLength(2);
      expect(backups[0].type).toBe('full');
      expect(backups[1].type).toBe('database');
      expect(mockPrisma.backup.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        take: 50
      });
    });

    it('should filter backups by type', async () => {
      mockPrisma.backup.findMany.mockResolvedValue([]);

      await backupService.listBackups('database', 10);

      expect(mockPrisma.backup.findMany).toHaveBeenCalledWith({
        where: { type: 'database' },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
    });
  });

  describe('Backup Restoration', () => {
    it('should restore from full backup', async () => {
      const mockBackup = {
        id: 'backup-1',
        type: 'full',
        filename: 'full-backup-1.tar.gz',
        size: 1024000,
        checksum: 'abc123'
      };

      mockPrisma.backup.findUnique.mockResolvedValue(mockBackup);
      mockPrisma.backupRestoreLog.create.mockResolvedValue({});

      // Mock file operations
      mockFs.stat.mockResolvedValue({ size: 1024000 } as any);
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(['db-backup.sql.gz', 'media-backup.tar.gz']);

      const mockExec = require('child_process').exec;
      mockExec.mockImplementation((command: string, options: any, callback: Function) => {
        callback(null, { stdout: 'Restore completed', stderr: '' });
      });

      // Mock checksum calculation
      const originalCalculateChecksum = (backupService as any).calculateChecksum;
      (backupService as any).calculateChecksum = jest.fn().mockResolvedValue('abc123');

      const restoreOptions = {
        backupId: 'backup-1',
        restoreDatabase: true,
        restoreMedia: true,
        overwriteExisting: false
      };

      await backupService.restoreFromBackup(restoreOptions, 'user-123');

      expect(mockPrisma.backup.findUnique).toHaveBeenCalledWith({
        where: { id: 'backup-1' }
      });
      expect(mockPrisma.backupRestoreLog.create).toHaveBeenCalled();

      // Restore original method
      (backupService as any).calculateChecksum = originalCalculateChecksum;
    });

    it('should fail restore with invalid checksum', async () => {
      const mockBackup = {
        id: 'backup-1',
        type: 'database',
        filename: 'db-backup-1.sql.gz',
        checksum: 'abc123'
      };

      mockPrisma.backup.findUnique.mockResolvedValue(mockBackup);

      // Mock checksum mismatch
      const originalCalculateChecksum = (backupService as any).calculateChecksum;
      (backupService as any).calculateChecksum = jest.fn().mockResolvedValue('different-checksum');

      const restoreOptions = {
        backupId: 'backup-1',
        restoreDatabase: true,
        restoreMedia: false,
        overwriteExisting: false
      };

      await expect(
        backupService.restoreFromBackup(restoreOptions, 'user-123')
      ).rejects.toThrow();

      // Restore original method
      (backupService as any).calculateChecksum = originalCalculateChecksum;
    });

    it('should fail restore for non-existent backup', async () => {
      mockPrisma.backup.findUnique.mockResolvedValue(null);

      const restoreOptions = {
        backupId: 'non-existent',
        restoreDatabase: true,
        restoreMedia: false,
        overwriteExisting: false
      };

      await expect(
        backupService.restoreFromBackup(restoreOptions, 'user-123')
      ).rejects.toThrow('Backup not found');
    });
  });

  describe('Backup Cleanup', () => {
    it('should cleanup old backups', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35); // 35 days ago

      const mockOldBackups = [
        {
          id: 'old-backup-1',
          filename: 'old-backup-1.tar.gz',
          createdAt: oldDate
        },
        {
          id: 'old-backup-2',
          filename: 'old-backup-2.sql.gz',
          createdAt: oldDate
        }
      ];

      mockPrisma.backup.findMany.mockResolvedValue(mockOldBackups);
      mockPrisma.backup.delete.mockResolvedValue({});
      mockFs.stat.mockResolvedValue({ size: 1024000 } as any);
      mockFs.unlink.mockResolvedValue(undefined);

      const result = await backupService.cleanupOldBackups();

      expect(result.deletedCount).toBe(2);
      expect(result.freedSpace).toBe(2048000); // 2 * 1024000
      expect(mockPrisma.backup.delete).toHaveBeenCalledTimes(2);
      expect(mockFs.unlink).toHaveBeenCalledTimes(2);
    });

    it('should handle cleanup errors gracefully', async () => {
      const mockOldBackups = [
        {
          id: 'old-backup-1',
          filename: 'old-backup-1.tar.gz',
          createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)
        }
      ];

      mockPrisma.backup.findMany.mockResolvedValue(mockOldBackups);
      mockPrisma.backup.delete.mockRejectedValue(new Error('Delete failed'));
      mockFs.stat.mockResolvedValue({ size: 1024000 } as any);
      mockFs.unlink.mockResolvedValue(undefined);

      const result = await backupService.cleanupOldBackups();

      expect(result.deletedCount).toBe(0);
      expect(result.freedSpace).toBe(0);
    });
  });

  describe('Backup Status Tracking', () => {
    it('should track backup status', () => {
      const backupId = 'test-backup-123';
      
      // Initially no status
      expect(backupService.getBackupStatus(backupId)).toBeNull();

      // Status would be set internally during backup creation
      // This is tested indirectly through the createFullBackup test
    });
  });

  describe('Backup Integrity', () => {
    it('should verify backup integrity', async () => {
      const backupPath = '/tmp/test-backup.tar.gz';
      const expectedChecksum = 'abc123def456';

      // Mock checksum calculation
      const originalCalculateChecksum = (backupService as any).calculateChecksum;
      (backupService as any).calculateChecksum = jest.fn().mockResolvedValue(expectedChecksum);

      const isValid = await backupService.verifyBackupIntegrity(backupPath, expectedChecksum);

      expect(isValid).toBe(true);
      expect((backupService as any).calculateChecksum).toHaveBeenCalledWith(backupPath);

      // Restore original method
      (backupService as any).calculateChecksum = originalCalculateChecksum;
    });

    it('should detect corrupted backups', async () => {
      const backupPath = '/tmp/test-backup.tar.gz';
      const expectedChecksum = 'abc123def456';
      const actualChecksum = 'different-checksum';

      // Mock checksum calculation
      const originalCalculateChecksum = (backupService as any).calculateChecksum;
      (backupService as any).calculateChecksum = jest.fn().mockResolvedValue(actualChecksum);

      const isValid = await backupService.verifyBackupIntegrity(backupPath, expectedChecksum);

      expect(isValid).toBe(false);

      // Restore original method
      (backupService as any).calculateChecksum = originalCalculateChecksum;
    });
  });
});