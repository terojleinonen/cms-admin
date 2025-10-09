-- RBAC Migration 002: Data Migration for Existing Users
-- This migration ensures existing users have proper RBAC setup

BEGIN;

-- Create user preferences for existing users who don't have them
INSERT INTO user_preferences (user_id, theme, timezone, language, notifications, dashboard)
SELECT 
    u.id,
    'SYSTEM'::Theme,
    'UTC',
    'en',
    '{"email": true, "push": true, "security": true, "marketing": false}'::jsonb,
    '{"layout": "default", "widgets": [], "defaultView": "dashboard"}'::jsonb
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_preferences up WHERE up.user_id = u.id
);

-- Ensure all users have valid roles (default to EDITOR if somehow null)
UPDATE users 
SET role = 'EDITOR'::UserRole 
WHERE role IS NULL;

-- Create initial audit log entries for existing users
INSERT INTO audit_logs (user_id, action, resource, details, created_at)
SELECT 
    id,
    'USER_MIGRATED',
    'user',
    jsonb_build_object(
        'migration_version', '002',
        'original_role', role,
        'migration_date', CURRENT_TIMESTAMP
    ),
    created_at
FROM users
WHERE NOT EXISTS (
    SELECT 1 FROM audit_logs al 
    WHERE al.user_id = users.id AND al.action = 'USER_MIGRATED'
);

-- Create role change history for existing users (initial role assignment)
INSERT INTO role_change_history (user_id, old_role, new_role, reason, created_at)
SELECT 
    id,
    'VIEWER',  -- Assume they started as VIEWER
    role::text,
    'Initial role assignment during RBAC migration',
    created_at
FROM users
WHERE NOT EXISTS (
    SELECT 1 FROM role_change_history rch 
    WHERE rch.user_id = users.id
);

-- Ensure admin users exist - create default admin if none exists
DO $$
DECLARE
    admin_count INTEGER;
    default_admin_id UUID;
BEGIN
    SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'ADMIN';
    
    IF admin_count = 0 THEN
        -- Generate a UUID for the default admin
        default_admin_id := gen_random_uuid();
        
        -- Create default admin user
        INSERT INTO users (
            id,
            email,
            password_hash,
            name,
            role,
            is_active,
            email_verified,
            created_at,
            updated_at
        ) VALUES (
            default_admin_id,
            'admin@kinworkspace.com',
            '$2b$12$LQv3c1yqBwEHxv03kpOOHu.Kx.Ks8J8J8J8J8J8J8J8J8J8J8J8J8', -- Default: 'admin123' - CHANGE THIS!
            'System Administrator',
            'ADMIN'::UserRole,
            true,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
        
        -- Create preferences for default admin
        INSERT INTO user_preferences (user_id, theme, timezone, language, notifications, dashboard)
        VALUES (
            default_admin_id,
            'SYSTEM'::Theme,
            'UTC',
            'en',
            '{"email": true, "push": true, "security": true, "marketing": false}'::jsonb,
            '{"layout": "default", "widgets": ["users", "security", "analytics"], "defaultView": "dashboard"}'::jsonb
        );
        
        -- Create audit log for admin creation
        INSERT INTO audit_logs (user_id, action, resource, details)
        VALUES (
            default_admin_id,
            'ADMIN_CREATED',
            'user',
            jsonb_build_object(
                'reason', 'Default admin created during RBAC migration',
                'migration_version', '002'
            )
        );
        
        -- Create role change history for admin
        INSERT INTO role_change_history (user_id, old_role, new_role, reason)
        VALUES (
            default_admin_id,
            'VIEWER',
            'ADMIN',
            'Default admin created during RBAC migration'
        );
        
        RAISE NOTICE 'Default admin user created with email: admin@kinworkspace.com';
        RAISE NOTICE 'IMPORTANT: Change the default password immediately!';
    END IF;
END $$;

-- Update existing content to have proper creator relationships
-- Set created_by to the first admin user for orphaned content
DO $$
DECLARE
    first_admin_id UUID;
BEGIN
    SELECT id INTO first_admin_id FROM users WHERE role = 'ADMIN' ORDER BY created_at LIMIT 1;
    
    IF first_admin_id IS NOT NULL THEN
        -- Update products without creator
        UPDATE products 
        SET created_by = first_admin_id 
        WHERE created_by IS NULL;
        
        -- Update pages without creator
        UPDATE pages 
        SET created_by = first_admin_id 
        WHERE created_by IS NULL;
        
        -- Update media without creator
        UPDATE media 
        SET created_by = first_admin_id 
        WHERE created_by IS NULL;
        
        -- Update content_revisions without creator
        UPDATE content_revisions 
        SET created_by = first_admin_id 
        WHERE created_by IS NULL;
        
        -- Update api_keys without creator
        UPDATE api_keys 
        SET created_by = first_admin_id 
        WHERE created_by IS NULL;
        
        -- Update backups without creator
        UPDATE backups 
        SET created_by = first_admin_id 
        WHERE created_by IS NULL;
        
        -- Update backup_restore_logs without restorer
        UPDATE backup_restore_logs 
        SET restored_by = first_admin_id 
        WHERE restored_by IS NULL;
    END IF;
END $$;

-- Create notification templates for the system
INSERT INTO notification_templates (type, language, subject, email_body, in_app_title, in_app_body, variables) VALUES
('SECURITY_ALERT', 'en', 'Security Alert', 'A security event has been detected on your account.', 'Security Alert', 'A security event has been detected on your account.', ARRAY['event_type', 'timestamp', 'ip_address']),
('PASSWORD_CHANGED', 'en', 'Password Changed', 'Your password has been successfully changed.', 'Password Changed', 'Your password has been successfully changed.', ARRAY['timestamp', 'ip_address']),
('EMAIL_CHANGED', 'en', 'Email Address Changed', 'Your email address has been changed.', 'Email Changed', 'Your email address has been changed.', ARRAY['old_email', 'new_email', 'timestamp']),
('TWO_FACTOR_ENABLED', 'en', '2FA Enabled', 'Two-factor authentication has been enabled on your account.', '2FA Enabled', 'Two-factor authentication has been enabled on your account.', ARRAY['timestamp']),
('TWO_FACTOR_DISABLED', 'en', '2FA Disabled', 'Two-factor authentication has been disabled on your account.', '2FA Disabled', 'Two-factor authentication has been disabled on your account.', ARRAY['timestamp']),
('ROLE_CHANGED', 'en', 'Role Changed', 'Your role has been changed.', 'Role Changed', 'Your role has been changed.', ARRAY['old_role', 'new_role', 'changed_by', 'timestamp']),
('LOGIN_FROM_NEW_DEVICE', 'en', 'New Device Login', 'A login from a new device was detected.', 'New Device Login', 'A login from a new device was detected.', ARRAY['device', 'location', 'timestamp'])
ON CONFLICT (type, language) DO NOTHING;

-- Clean up any invalid permission cache entries
DELETE FROM permission_cache WHERE expires_at < CURRENT_TIMESTAMP;

-- Clean up any resolved security events older than 90 days
DELETE FROM security_events 
WHERE resolved = true 
AND resolved_at < CURRENT_TIMESTAMP - INTERVAL '90 days';

-- Update statistics
ANALYZE users;
ANALYZE user_preferences;
ANALYZE audit_logs;
ANALYZE role_change_history;
ANALYZE permission_cache;
ANALYZE security_events;

COMMIT;

-- Display migration summary
DO $$
DECLARE
    user_count INTEGER;
    admin_count INTEGER;
    editor_count INTEGER;
    viewer_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'ADMIN';
    SELECT COUNT(*) INTO editor_count FROM users WHERE role = 'EDITOR';
    SELECT COUNT(*) INTO viewer_count FROM users WHERE role = 'VIEWER';
    
    RAISE NOTICE '=== RBAC Migration 002 Complete ===';
    RAISE NOTICE 'Total users: %', user_count;
    RAISE NOTICE 'Admin users: %', admin_count;
    RAISE NOTICE 'Editor users: %', editor_count;
    RAISE NOTICE 'Viewer users: %', viewer_count;
    RAISE NOTICE '=====================================';
END $$;