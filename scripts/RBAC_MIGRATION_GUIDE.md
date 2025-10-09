# RBAC Migration and Upgrade Procedures

This guide provides comprehensive procedures for migrating to and upgrading the Role-Based Access Control (RBAC) system in the Kin Workspace CMS.

## Overview

The RBAC migration process includes:
- Database schema migrations for permission system tables
- Data migration for existing users and content
- Backup and recovery procedures
- Rollback capabilities for safe deployment

## Prerequisites

Before starting the migration:

1. **Database Backup**: Ensure you have a recent backup of your database
2. **Environment Setup**: Verify all environment variables are configured
3. **Dependencies**: Install required dependencies (`pg_dump`, `tsx`)
4. **Permissions**: Ensure database user has necessary permissions

```bash
# Install dependencies
npm install tsx @prisma/client

# Verify pg_dump is available (for backups)
which pg_dump

# Verify database connection
npx prisma db pull
```

## Migration Scripts

### 1. Database Schema Migration (`rbac-migration-001-add-missing-tables.sql`)

Adds RBAC-related tables and columns:
- User preferences table
- Audit logs table
- Sessions table
- Backup codes table
- Password reset tokens table
- Notifications and templates tables
- Security events table
- Role change history table
- Permission cache table

### 2. Data Migration (`rbac-migration-002-data-migration.sql`)

Migrates existing user data:
- Creates user preferences for existing users
- Ensures all users have valid roles
- Creates initial audit log entries
- Sets up default admin user if none exists
- Creates notification templates
- Fixes orphaned content relationships

### 3. TypeScript Migration Utilities

#### `rbac-data-migration.ts`
Provides programmatic data migration with validation and error handling.

#### `rbac-recovery-procedures.ts`
Comprehensive backup, restore, and emergency recovery procedures.

#### `rbac-migration-runner.ts`
Orchestrates the complete migration process with rollback capabilities.

## Migration Process

### Option 1: Automated Migration (Recommended)

Use the migration runner for a complete, automated process:

```bash
# Run complete migration with backup and validation
tsx scripts/rbac-migration-runner.ts run --verbose

# Dry run to see what would be changed
tsx scripts/rbac-migration-runner.ts run --dry-run --verbose

# Force migration even with warnings
tsx scripts/rbac-migration-runner.ts run --force --verbose
```

### Option 2: Manual Step-by-Step Migration

#### Step 1: Create Backup

```bash
# Create RBAC data backup
tsx scripts/rbac-recovery-procedures.ts backup rbac-backup-$(date +%Y%m%d-%H%M%S).json

# Create full database backup
tsx scripts/rbac-recovery-procedures.ts db-backup database-backup-$(date +%Y%m%d-%H%M%S).sql
```

#### Step 2: Run Database Migrations

```bash
# Apply Prisma migrations
npx prisma migrate deploy

# Apply custom RBAC schema migration
psql $DATABASE_URL -f scripts/rbac-migration-001-add-missing-tables.sql
```

#### Step 3: Run Data Migration

```bash
# Run TypeScript data migration
tsx scripts/rbac-data-migration.ts migrate --verbose

# Apply SQL data migration
psql $DATABASE_URL -f scripts/rbac-migration-002-data-migration.sql
```

#### Step 4: Validate Migration

```bash
# Validate system integrity
tsx scripts/rbac-recovery-procedures.ts validate --verbose

# Run emergency recovery if issues found
tsx scripts/rbac-recovery-procedures.ts validate --emergency
```

## Rollback Procedures

### Automated Rollback

```bash
# Rollback complete migration
tsx scripts/rbac-migration-runner.ts rollback --verbose
```

### Manual Rollback

#### Step 1: Rollback Data Changes

```bash
# Rollback data migration
psql $DATABASE_URL -f scripts/rbac-rollback-002.sql
```

#### Step 2: Rollback Schema Changes

```bash
# Rollback schema migration
psql $DATABASE_URL -f scripts/rbac-rollback-001.sql
```

#### Step 3: Restore from Backup

```bash
# Restore RBAC data from backup
tsx scripts/rbac-recovery-procedures.ts restore backup-file.json

# Or restore full database
psql $DATABASE_URL < database-backup.sql
```

## Emergency Recovery

### Emergency Admin Creation

If you lose access to admin accounts:

```bash
# Create emergency admin user
tsx scripts/rbac-recovery-procedures.ts emergency --verbose
```

This creates an emergency admin with:
- Email: `emergency-admin@kinworkspace.com`
- Password: `emergency123`
- **CRITICAL**: Change this password immediately!

### System Validation and Auto-Fix

```bash
# Validate system and auto-fix issues
tsx scripts/rbac-recovery-procedures.ts validate --emergency --verbose
```

## Migration Options

### Command Line Options

#### Migration Runner Options
- `--skip-backup`: Skip creating backup before migration
- `--skip-validation`: Skip post-migration validation
- `--dry-run`: Run without making changes
- `--verbose`: Enable verbose logging
- `--force`: Force migration even with warnings
- `--no-rollback`: Don't rollback on failure

#### Data Migration Options
- `--dry-run`: Run without making changes
- `--verbose`: Enable verbose logging
- `--no-default-admin`: Skip creating default admin
- `--admin-email=EMAIL`: Set default admin email
- `--admin-password=PASS`: Set default admin password

#### Recovery Options
- `--validate-only`: Only validate, don't restore
- `--verbose`: Enable verbose logging
- `--emergency`: Auto-fix issues during validation
- `--backup=PATH`: Specify backup file path

## Post-Migration Tasks

### 1. Verify Migration Results

```bash
# Check user counts and roles
psql $DATABASE_URL -c "
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role 
ORDER BY role;
"

# Check for users without preferences
psql $DATABASE_URL -c "
SELECT COUNT(*) as users_without_preferences
FROM users u 
LEFT JOIN user_preferences up ON u.id = up.user_id 
WHERE up.id IS NULL;
"
```

### 2. Test RBAC Functionality

1. **Login as different user roles** (Admin, Editor, Viewer)
2. **Verify permission-based UI filtering** works correctly
3. **Test API endpoint protection** with different roles
4. **Check audit logging** is working
5. **Verify permission caching** is functioning

### 3. Update Application Code

After migration, update any custom code that:
- Directly queries user roles
- Implements custom permission checking
- Depends on old schema structure

### 4. Monitor System Performance

- Monitor permission check latency
- Check cache hit/miss ratios
- Watch for security events
- Review audit logs regularly

## Troubleshooting

### Common Issues

#### 1. Migration Fails with Foreign Key Errors

```bash
# Check for orphaned records
psql $DATABASE_URL -c "
SELECT 'products' as table_name, COUNT(*) as orphaned_count
FROM products p 
LEFT JOIN users u ON p.created_by = u.id 
WHERE p.created_by IS NOT NULL AND u.id IS NULL
UNION ALL
SELECT 'pages', COUNT(*)
FROM pages p 
LEFT JOIN users u ON p.created_by = u.id 
WHERE p.created_by IS NOT NULL AND u.id IS NULL;
"

# Fix orphaned records before migration
UPDATE products SET created_by = NULL WHERE created_by NOT IN (SELECT id FROM users);
UPDATE pages SET created_by = NULL WHERE created_by NOT IN (SELECT id FROM users);
```

#### 2. No Admin Users After Migration

```bash
# Run emergency recovery
tsx scripts/rbac-recovery-procedures.ts emergency
```

#### 3. Permission Cache Issues

```bash
# Clear permission cache
psql $DATABASE_URL -c "DELETE FROM permission_cache WHERE expires_at < NOW();"

# Or clear all cache
psql $DATABASE_URL -c "TRUNCATE permission_cache;"
```

#### 4. Performance Issues

```bash
# Update database statistics
psql $DATABASE_URL -c "ANALYZE;"

# Check for missing indexes
psql $DATABASE_URL -c "
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE tablename IN ('users', 'permission_cache', 'audit_logs')
ORDER BY tablename, attname;
"
```

### Recovery from Failed Migration

1. **Stop the application** to prevent data corruption
2. **Run rollback procedures** to restore previous state
3. **Restore from backup** if rollback fails
4. **Investigate the failure** cause before retrying
5. **Fix the issue** and retry migration

## Best Practices

### Before Migration
- [ ] Create full database backup
- [ ] Test migration on staging environment
- [ ] Plan maintenance window
- [ ] Notify users of potential downtime
- [ ] Prepare rollback plan

### During Migration
- [ ] Monitor migration progress
- [ ] Watch for errors or warnings
- [ ] Keep logs for troubleshooting
- [ ] Have rollback ready if needed

### After Migration
- [ ] Validate all functionality
- [ ] Test with different user roles
- [ ] Monitor system performance
- [ ] Update documentation
- [ ] Train users on new features

## Security Considerations

### Default Passwords
The migration creates default admin accounts with known passwords:
- **IMMEDIATELY** change all default passwords
- **FORCE** password reset for all users
- **ENABLE** two-factor authentication for admins

### Audit Logging
- Review audit logs regularly
- Set up alerts for suspicious activities
- Monitor failed permission checks
- Track role changes and admin actions

### Permission Cache
- Monitor cache performance
- Set appropriate TTL values
- Implement cache invalidation properly
- Watch for cache poisoning attempts

## Support and Maintenance

### Regular Maintenance Tasks

```bash
# Weekly: Clean up expired cache entries
psql $DATABASE_URL -c "DELETE FROM permission_cache WHERE expires_at < NOW() - INTERVAL '1 day';"

# Monthly: Archive old audit logs
psql $DATABASE_URL -c "DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';"

# Quarterly: Update database statistics
psql $DATABASE_URL -c "ANALYZE;"
```

### Monitoring Queries

```sql
-- Check system health
SELECT 
  'users' as table_name,
  COUNT(*) as total_count,
  COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) as admin_count,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
FROM users
UNION ALL
SELECT 
  'permission_cache',
  COUNT(*),
  COUNT(CASE WHEN expires_at > NOW() THEN 1 END),
  COUNT(CASE WHEN result = true THEN 1 END)
FROM permission_cache;

-- Check recent security events
SELECT type, severity, COUNT(*) as count
FROM security_events 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY type, severity
ORDER BY severity DESC, count DESC;
```

For additional support or questions about the RBAC migration, refer to the system documentation or contact the development team.