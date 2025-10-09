-- RBAC Rollback 002: Rollback Data Migration
-- This script rolls back the data changes made in rbac-migration-002-data-migration.sql
-- WARNING: This will remove migrated data. Make sure you have backups!

BEGIN;

-- Remove migration-specific audit logs
DELETE FROM audit_logs 
WHERE action IN ('USER_MIGRATED', 'ADMIN_CREATED');

-- Remove migration-specific role change history
DELETE FROM role_change_history 
WHERE reason IN (
    'Initial role assignment during RBAC migration',
    'Default admin created during RBAC migration'
);

-- Remove default admin user created during migration
DELETE FROM users 
WHERE email = 'admin@kinworkspace.com' 
AND name = 'System Administrator'
AND role = 'ADMIN';

-- Remove notification templates created during migration
DELETE FROM notification_templates 
WHERE type IN (
    'SECURITY_ALERT',
    'PASSWORD_CHANGED',
    'EMAIL_CHANGED',
    'TWO_FACTOR_ENABLED',
    'TWO_FACTOR_DISABLED',
    'ROLE_CHANGED',
    'LOGIN_FROM_NEW_DEVICE'
);

-- Remove user preferences created during migration
-- Note: This is more aggressive and removes all preferences
-- In a real scenario, you might want to be more selective
DELETE FROM user_preferences 
WHERE created_at >= (
    SELECT MIN(created_at) 
    FROM audit_logs 
    WHERE action = 'USER_MIGRATED'
);

-- Clean up expired permission cache entries
DELETE FROM permission_cache WHERE expires_at < CURRENT_TIMESTAMP;

-- Clean up old security events
DELETE FROM security_events 
WHERE resolved = true 
AND resolved_at < CURRENT_TIMESTAMP - INTERVAL '30 days';

-- Reset user roles to a default state if needed
-- This is optional and depends on your rollback requirements
-- UPDATE users SET role = 'EDITOR' WHERE role = 'ADMIN' AND email != 'your-original-admin@example.com';

COMMIT;

-- Display rollback summary
DO $$
DECLARE
    user_count INTEGER;
    admin_count INTEGER;
    preferences_count INTEGER;
    audit_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'ADMIN';
    SELECT COUNT(*) INTO preferences_count FROM user_preferences;
    SELECT COUNT(*) INTO audit_count FROM audit_logs;
    
    RAISE NOTICE '=== RBAC Rollback 002 Complete ===';
    RAISE NOTICE 'Remaining users: %', user_count;
    RAISE NOTICE 'Admin users: %', admin_count;
    RAISE NOTICE 'User preferences: %', preferences_count;
    RAISE NOTICE 'Audit logs: %', audit_count;
    RAISE NOTICE 'Migration data removed';
    RAISE NOTICE '===================================';
END $$;