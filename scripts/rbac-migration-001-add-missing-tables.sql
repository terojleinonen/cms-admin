-- RBAC Migration 001: Add Missing Tables and Columns
-- This migration adds any missing RBAC-related tables and columns that may not be present

-- Add missing columns to users table if they don't exist
DO $$
BEGIN
    -- Add profile_picture column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'profile_picture') THEN
        ALTER TABLE users ADD COLUMN profile_picture VARCHAR(500);
    END IF;
    
    -- Add email_verified column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verified') THEN
        ALTER TABLE users ADD COLUMN email_verified TIMESTAMP(3);
    END IF;
    
    -- Add two_factor_secret column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'two_factor_secret') THEN
        ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255);
    END IF;
    
    -- Add two_factor_enabled column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'two_factor_enabled') THEN
        ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    -- Add last_login_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login_at') THEN
        ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP(3);
    END IF;
END $$;

-- Create NotificationType enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
        CREATE TYPE "NotificationType" AS ENUM (
            'SECURITY_ALERT',
            'PASSWORD_CHANGED',
            'EMAIL_CHANGED',
            'TWO_FACTOR_ENABLED',
            'TWO_FACTOR_DISABLED',
            'ACCOUNT_LOCKED',
            'ACCOUNT_UNLOCKED',
            'LOGIN_FROM_NEW_DEVICE',
            'PROFILE_UPDATED',
            'PREFERENCES_UPDATED',
            'ACCOUNT_DEACTIVATED',
            'ACCOUNT_REACTIVATED',
            'ROLE_CHANGED',
            'ADMIN_MESSAGE'
        );
    END IF;
END $$;

-- Create Theme enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Theme') THEN
        CREATE TYPE "Theme" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');
    END IF;
END $$;

-- Create EmailStatus enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmailStatus') THEN
        CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BOUNCED');
    END IF;
END $$;

-- Create user_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    theme "Theme" NOT NULL DEFAULT 'SYSTEM',
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    notifications JSONB NOT NULL DEFAULT '{"email": true, "push": true, "security": true, "marketing": false}',
    dashboard JSONB NOT NULL DEFAULT '{"layout": "default", "widgets": [], "defaultView": "dashboard"}',
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP(3) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create backup_codes table if it doesn't exist
CREATE TABLE IF NOT EXISTS backup_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    code VARCHAR(64) NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT backup_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create password_reset_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP(3) NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type "NotificationType" NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP(3),
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create notification_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type "NotificationType" NOT NULL,
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    subject VARCHAR(255) NOT NULL,
    email_body TEXT,
    in_app_title VARCHAR(255) NOT NULL,
    in_app_body TEXT NOT NULL,
    variables TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type, language)
);

-- Create email_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    to_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type "NotificationType",
    status "EmailStatus" NOT NULL DEFAULT 'PENDING',
    error TEXT,
    sent_at TIMESTAMP(3),
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT email_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create search_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS search_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query VARCHAR(255) NOT NULL,
    results_count INTEGER NOT NULL,
    user_id UUID,
    filters JSONB,
    user_agent TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit_logs if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'audit_logs_user_id_idx') THEN
        CREATE INDEX audit_logs_user_id_idx ON audit_logs(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'audit_logs_action_idx') THEN
        CREATE INDEX audit_logs_action_idx ON audit_logs(action);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'audit_logs_created_at_idx') THEN
        CREATE INDEX audit_logs_created_at_idx ON audit_logs(created_at);
    END IF;
END $$;

-- Create indexes for sessions if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'sessions_user_id_idx') THEN
        CREATE INDEX sessions_user_id_idx ON sessions(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'sessions_token_idx') THEN
        CREATE INDEX sessions_token_idx ON sessions(token);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'sessions_expires_at_idx') THEN
        CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);
    END IF;
END $$;

-- Create indexes for backup_codes if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'backup_codes_user_id_idx') THEN
        CREATE INDEX backup_codes_user_id_idx ON backup_codes(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'backup_codes_code_idx') THEN
        CREATE INDEX backup_codes_code_idx ON backup_codes(code);
    END IF;
END $$;

-- Create indexes for password_reset_tokens if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'password_reset_tokens_user_id_idx') THEN
        CREATE INDEX password_reset_tokens_user_id_idx ON password_reset_tokens(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'password_reset_tokens_token_hash_idx') THEN
        CREATE INDEX password_reset_tokens_token_hash_idx ON password_reset_tokens(token_hash);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'password_reset_tokens_expires_at_idx') THEN
        CREATE INDEX password_reset_tokens_expires_at_idx ON password_reset_tokens(expires_at);
    END IF;
END $$;

-- Create indexes for notifications if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'notifications_user_id_idx') THEN
        CREATE INDEX notifications_user_id_idx ON notifications(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'notifications_type_idx') THEN
        CREATE INDEX notifications_type_idx ON notifications(type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'notifications_read_idx') THEN
        CREATE INDEX notifications_read_idx ON notifications(read);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'notifications_created_at_idx') THEN
        CREATE INDEX notifications_created_at_idx ON notifications(created_at);
    END IF;
END $$;

-- Create indexes for email_logs if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'email_logs_user_id_idx') THEN
        CREATE INDEX email_logs_user_id_idx ON email_logs(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'email_logs_status_idx') THEN
        CREATE INDEX email_logs_status_idx ON email_logs(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'email_logs_type_idx') THEN
        CREATE INDEX email_logs_type_idx ON email_logs(type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'email_logs_created_at_idx') THEN
        CREATE INDEX email_logs_created_at_idx ON email_logs(created_at);
    END IF;
END $$;

-- Update foreign key constraints to allow nullable references where appropriate
DO $$
BEGIN
    -- Update products.created_by to allow NULL
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'products_created_by_fkey') THEN
        ALTER TABLE products DROP CONSTRAINT products_created_by_fkey;
        ALTER TABLE products ADD CONSTRAINT products_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    -- Update pages.created_by to allow NULL
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'pages_created_by_fkey') THEN
        ALTER TABLE pages DROP CONSTRAINT pages_created_by_fkey;
        ALTER TABLE pages ADD CONSTRAINT pages_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    -- Update media.created_by to allow NULL
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'media_created_by_fkey') THEN
        ALTER TABLE media DROP CONSTRAINT media_created_by_fkey;
        ALTER TABLE media ADD CONSTRAINT media_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    -- Update content_revisions.created_by to allow NULL
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'content_revisions_created_by_fkey') THEN
        ALTER TABLE content_revisions DROP CONSTRAINT content_revisions_created_by_fkey;
        ALTER TABLE content_revisions ADD CONSTRAINT content_revisions_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    -- Update api_keys.created_by to allow NULL
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'api_keys_created_by_fkey') THEN
        ALTER TABLE api_keys DROP CONSTRAINT api_keys_created_by_fkey;
        ALTER TABLE api_keys ADD CONSTRAINT api_keys_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    -- Update backups.created_by to allow NULL
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'backups_created_by_fkey') THEN
        ALTER TABLE backups DROP CONSTRAINT backups_created_by_fkey;
        ALTER TABLE backups ADD CONSTRAINT backups_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    -- Update backup_restore_logs.restored_by to allow NULL
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'backup_restore_logs_restored_by_fkey') THEN
        ALTER TABLE backup_restore_logs DROP CONSTRAINT backup_restore_logs_restored_by_fkey;
        ALTER TABLE backup_restore_logs ADD CONSTRAINT backup_restore_logs_restored_by_fkey 
            FOREIGN KEY (restored_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Make created_by columns nullable where appropriate
DO $$
BEGIN
    -- Make products.created_by nullable
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'created_by' AND is_nullable = 'NO') THEN
        ALTER TABLE products ALTER COLUMN created_by DROP NOT NULL;
    END IF;
    
    -- Make pages.created_by nullable
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pages' AND column_name = 'created_by' AND is_nullable = 'NO') THEN
        ALTER TABLE pages ALTER COLUMN created_by DROP NOT NULL;
    END IF;
    
    -- Make media.created_by nullable
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media' AND column_name = 'created_by' AND is_nullable = 'NO') THEN
        ALTER TABLE media ALTER COLUMN created_by DROP NOT NULL;
    END IF;
    
    -- Make content_revisions.created_by nullable
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_revisions' AND column_name = 'created_by' AND is_nullable = 'NO') THEN
        ALTER TABLE content_revisions ALTER COLUMN created_by DROP NOT NULL;
    END IF;
    
    -- Make api_keys.created_by nullable
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'created_by' AND is_nullable = 'NO') THEN
        ALTER TABLE api_keys ALTER COLUMN created_by DROP NOT NULL;
    END IF;
    
    -- Make backups.created_by nullable
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'backups' AND column_name = 'created_by' AND is_nullable = 'NO') THEN
        ALTER TABLE backups ALTER COLUMN created_by DROP NOT NULL;
    END IF;
    
    -- Make backup_restore_logs.restored_by nullable
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'backup_restore_logs' AND column_name = 'restored_by' AND is_nullable = 'NO') THEN
        ALTER TABLE backup_restore_logs ALTER COLUMN restored_by DROP NOT NULL;
    END IF;
END $$;

COMMIT;