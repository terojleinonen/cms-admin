-- RBAC Rollback 001: Rollback Missing Tables and Columns
-- This script rolls back the changes made in rbac-migration-001-add-missing-tables.sql
-- WARNING: This will remove data. Make sure you have backups!

BEGIN;

-- Drop indexes first to avoid dependency issues
DROP INDEX IF EXISTS audit_logs_user_id_idx;
DROP INDEX IF EXISTS audit_logs_action_idx;
DROP INDEX IF EXISTS audit_logs_created_at_idx;
DROP INDEX IF EXISTS sessions_user_id_idx;
DROP INDEX IF EXISTS sessions_token_idx;
DROP INDEX IF EXISTS sessions_expires_at_idx;
DROP INDEX IF EXISTS backup_codes_user_id_idx;
DROP INDEX IF EXISTS backup_codes_code_idx;
DROP INDEX IF EXISTS password_reset_tokens_user_id_idx;
DROP INDEX IF EXISTS password_reset_tokens_token_hash_idx;
DROP INDEX IF EXISTS password_reset_tokens_expires_at_idx;
DROP INDEX IF EXISTS notifications_user_id_idx;
DROP INDEX IF EXISTS notifications_type_idx;
DROP INDEX IF EXISTS notifications_read_idx;
DROP INDEX IF EXISTS notifications_created_at_idx;
DROP INDEX IF EXISTS email_logs_user_id_idx;
DROP INDEX IF EXISTS email_logs_status_idx;
DROP INDEX IF EXISTS email_logs_type_idx;
DROP INDEX IF EXISTS email_logs_created_at_idx;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS email_logs CASCADE;
DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS backup_codes CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS search_events CASCADE;

-- Drop enums
DROP TYPE IF EXISTS "EmailStatus" CASCADE;
DROP TYPE IF EXISTS "NotificationType" CASCADE;
DROP TYPE IF EXISTS "Theme" CASCADE;

-- Remove added columns from users table
DO $$
BEGIN
    -- Remove profile_picture column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'profile_picture') THEN
        ALTER TABLE users DROP COLUMN profile_picture;
    END IF;
    
    -- Remove email_verified column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verified') THEN
        ALTER TABLE users DROP COLUMN email_verified;
    END IF;
    
    -- Remove two_factor_secret column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'two_factor_secret') THEN
        ALTER TABLE users DROP COLUMN two_factor_secret;
    END IF;
    
    -- Remove two_factor_enabled column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'two_factor_enabled') THEN
        ALTER TABLE users DROP COLUMN two_factor_enabled;
    END IF;
    
    -- Remove last_login_at column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login_at') THEN
        ALTER TABLE users DROP COLUMN last_login_at;
    END IF;
END $$;

-- Restore original foreign key constraints (make them NOT NULL again)
DO $$
BEGIN
    -- Restore products.created_by constraint
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'products_created_by_fkey') THEN
        ALTER TABLE products DROP CONSTRAINT products_created_by_fkey;
        -- First update NULL values to a valid user ID (first user)
        UPDATE products SET created_by = (SELECT id FROM users ORDER BY created_at LIMIT 1) WHERE created_by IS NULL;
        ALTER TABLE products ALTER COLUMN created_by SET NOT NULL;
        ALTER TABLE products ADD CONSTRAINT products_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;
    END IF;
    
    -- Restore pages.created_by constraint
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'pages_created_by_fkey') THEN
        ALTER TABLE pages DROP CONSTRAINT pages_created_by_fkey;
        UPDATE pages SET created_by = (SELECT id FROM users ORDER BY created_at LIMIT 1) WHERE created_by IS NULL;
        ALTER TABLE pages ALTER COLUMN created_by SET NOT NULL;
        ALTER TABLE pages ADD CONSTRAINT pages_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;
    END IF;
    
    -- Restore media.created_by constraint
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'media_created_by_fkey') THEN
        ALTER TABLE media DROP CONSTRAINT media_created_by_fkey;
        UPDATE media SET created_by = (SELECT id FROM users ORDER BY created_at LIMIT 1) WHERE created_by IS NULL;
        ALTER TABLE media ALTER COLUMN created_by SET NOT NULL;
        ALTER TABLE media ADD CONSTRAINT media_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;
    END IF;
    
    -- Restore content_revisions.created_by constraint
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'content_revisions_created_by_fkey') THEN
        ALTER TABLE content_revisions DROP CONSTRAINT content_revisions_created_by_fkey;
        UPDATE content_revisions SET created_by = (SELECT id FROM users ORDER BY created_at LIMIT 1) WHERE created_by IS NULL;
        ALTER TABLE content_revisions ALTER COLUMN created_by SET NOT NULL;
        ALTER TABLE content_revisions ADD CONSTRAINT content_revisions_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;
    END IF;
    
    -- Restore api_keys.created_by constraint
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'api_keys_created_by_fkey') THEN
        ALTER TABLE api_keys DROP CONSTRAINT api_keys_created_by_fkey;
        UPDATE api_keys SET created_by = (SELECT id FROM users ORDER BY created_at LIMIT 1) WHERE created_by IS NULL;
        ALTER TABLE api_keys ALTER COLUMN created_by SET NOT NULL;
        ALTER TABLE api_keys ADD CONSTRAINT api_keys_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;
    END IF;
    
    -- Restore backups.created_by constraint
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'backups_created_by_fkey') THEN
        ALTER TABLE backups DROP CONSTRAINT backups_created_by_fkey;
        UPDATE backups SET created_by = (SELECT id FROM users ORDER BY created_at LIMIT 1) WHERE created_by IS NULL;
        ALTER TABLE backups ALTER COLUMN created_by SET NOT NULL;
        ALTER TABLE backups ADD CONSTRAINT backups_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;
    END IF;
    
    -- Restore backup_restore_logs.restored_by constraint
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'backup_restore_logs_restored_by_fkey') THEN
        ALTER TABLE backup_restore_logs DROP CONSTRAINT backup_restore_logs_restored_by_fkey;
        UPDATE backup_restore_logs SET restored_by = (SELECT id FROM users ORDER BY created_at LIMIT 1) WHERE restored_by IS NULL;
        ALTER TABLE backup_restore_logs ALTER COLUMN restored_by SET NOT NULL;
        ALTER TABLE backup_restore_logs ADD CONSTRAINT backup_restore_logs_restored_by_fkey 
            FOREIGN KEY (restored_by) REFERENCES users(id) ON DELETE RESTRICT;
    END IF;
END $$;

COMMIT;

-- Display rollback summary
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    
    RAISE NOTICE '=== RBAC Rollback 001 Complete ===';
    RAISE NOTICE 'Remaining users: %', user_count;
    RAISE NOTICE 'RBAC tables and columns removed';
    RAISE NOTICE 'Original constraints restored';
    RAISE NOTICE '===================================';
END $$;