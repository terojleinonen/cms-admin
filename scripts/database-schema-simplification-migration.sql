-- Database Schema Simplification Migration
-- This script safely removes unused tables and consolidates functionality
-- Run this script after backing up your database

BEGIN;

-- Step 1: Preserve essential data before dropping tables

-- Migrate role change history to audit logs
INSERT INTO audit_logs (id, user_id, action, resource, details, ip_address, user_agent, created_at)
SELECT 
    gen_random_uuid(),
    user_id,
    'ROLE_CHANGED',
    'user',
    jsonb_build_object(
        'oldRole', old_role,
        'newRole', new_role,
        'changedBy', changed_by,
        'reason', reason
    ),
    NULL, -- ip_address not available in role_change_history
    NULL, -- user_agent not available in role_change_history
    created_at
FROM role_change_history
WHERE EXISTS (SELECT 1 FROM role_change_history);

-- Step 2: Drop foreign key constraints first (in dependency order)

-- Drop constraints from tables that reference the tables we're removing
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_restoredBackups_fkey;
ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS api_keys_usageLogs_fkey;
ALTER TABLE backups DROP CONSTRAINT IF EXISTS backups_restoreLogs_fkey;

-- Step 3: Drop unused tables

-- Drop PermissionCache table
DROP TABLE IF EXISTS permission_cache CASCADE;

-- Drop SecurityEvent table  
DROP TABLE IF EXISTS security_events CASCADE;

-- Drop RoleChangeHistory table (data already migrated to audit_logs)
DROP TABLE IF EXISTS role_change_history CASCADE;

-- Drop ApiUsageLog table
DROP TABLE IF EXISTS api_usage_logs CASCADE;

-- Drop BackupRestoreLog table
DROP TABLE IF EXISTS backup_restore_logs CASCADE;

-- Drop SearchEvent table (analytics not needed)
DROP TABLE IF EXISTS search_events CASCADE;

-- Drop NotificationTemplate table (now using hardcoded templates)
DROP TABLE IF EXISTS notification_templates CASCADE;

-- Step 4: Update remaining table structures

-- Remove foreign key columns from users table that referenced dropped tables
ALTER TABLE users DROP COLUMN IF EXISTS permission_cache_id;
ALTER TABLE users DROP COLUMN IF EXISTS security_events_id;
ALTER TABLE users DROP COLUMN IF EXISTS role_changes_id;

-- Remove foreign key columns from api_keys table
ALTER TABLE api_keys DROP COLUMN IF EXISTS usage_logs_id;

-- Remove foreign key columns from backups table
ALTER TABLE backups DROP COLUMN IF EXISTS restore_logs_id;

-- Step 5: Add comment to audit_logs table to document role change tracking
COMMENT ON COLUMN audit_logs.details IS 'JSON details including role changes: {oldRole, newRole, changedBy, reason}';

-- Step 6: Create indexes for better performance on simplified schema
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_resource ON audit_logs(action, resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_details_role_changes ON audit_logs USING GIN (details) WHERE action = 'ROLE_CHANGED';

COMMIT;

-- Verification queries (run these after the migration)
-- SELECT COUNT(*) FROM audit_logs WHERE action = 'ROLE_CHANGED';
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;