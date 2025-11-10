# Design Document

## Overview

This design addresses the schema drift between the Prisma schema definition and the actual database migrations. The solution involves creating a new migration that adds all missing columns and tables to bring the database in sync with the current schema, ensuring the CI pipeline can successfully seed the database.

## Architecture

### Migration Strategy

We'll use Prisma's migration system to generate a new migration that captures all schema changes since the initial migration. The approach:

1. **Generate Migration**: Use `prisma migrate dev` to create a new migration file
2. **Review SQL**: Ensure the generated SQL properly adds all missing fields and tables
3. **Test Locally**: Verify the migration works on a clean database
4. **Deploy to CI**: Let the CI pipeline apply the migration automatically

### Schema Changes Required

The migration needs to add the following to the `users` table:
- `profile_picture` (VARCHAR(500), nullable)
- `email_verified` (TIMESTAMP, nullable)
- `two_factor_secret` (VARCHAR(255), nullable)
- `two_factor_enabled` (BOOLEAN, default false)
- `last_login_at` (TIMESTAMP, nullable)

New tables to create:
- `user_preferences` - User customization settings
- `audit_logs` - Security and action tracking
- `sessions` - User session management
- `backup_codes` - Two-factor authentication backup codes
- `password_reset_tokens` - Secure password reset flow
- `notifications` - User notification system
- `email_logs` - Email delivery tracking

New enums to create:
- `Theme` (LIGHT, DARK, SYSTEM)
- `NotificationType` (various notification types)
- `EmailStatus` (PENDING, SENT, FAILED, BOUNCED)

## Components and Interfaces

### Migration File Structure

```sql
-- Add missing enums
CREATE TYPE "Theme" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');
CREATE TYPE "NotificationType" AS ENUM (...);
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BOUNCED');

-- Add missing columns to users table
ALTER TABLE "users" ADD COLUMN "profile_picture" VARCHAR(500);
ALTER TABLE "users" ADD COLUMN "email_verified" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "two_factor_secret" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "last_login_at" TIMESTAMP(3);

-- Create new tables
CREATE TABLE "user_preferences" (...);
CREATE TABLE "audit_logs" (...);
CREATE TABLE "sessions" (...);
CREATE TABLE "backup_codes" (...);
CREATE TABLE "password_reset_tokens" (...);
CREATE TABLE "notifications" (...);
CREATE TABLE "email_logs" (...);

-- Add foreign keys and indexes
ALTER TABLE "user_preferences" ADD CONSTRAINT ...;
CREATE INDEX ...;
```

### Seed Script Compatibility

The seed script currently creates users with minimal fields. After the migration:
- Existing seed logic will work without changes
- Optional fields (two_factor_enabled, etc.) will use default values
- No changes needed to seed.ts

## Data Models

### Updated User Model

```typescript
model User {
  id               String    @id @default(uuid())
  email            String    @unique
  passwordHash     String
  name             String
  role             UserRole  @default(EDITOR)
  isActive         Boolean   @default(true)
  profilePicture   String?   // NEW
  emailVerified    DateTime? // NEW
  twoFactorSecret  String?   // NEW
  twoFactorEnabled Boolean   @default(false) // NEW
  lastLoginAt      DateTime? // NEW
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  
  // Relations
  preferences      UserPreferences? // NEW
  sessions         Session[] // NEW
  auditLogs        AuditLog[] // NEW
  backupCodes      BackupCode[] // NEW
  passwordResetTokens PasswordResetToken[] // NEW
  notifications    Notification[] // NEW
  emailLogs        EmailLog[] // NEW
  // ... existing relations
}
```

### New Models

All new models follow the existing patterns:
- UUID primary keys
- Timestamps (createdAt, updatedAt where applicable)
- Foreign key relationships with cascade deletes where appropriate
- Indexes on frequently queried fields

## Error Handling

### Migration Failures

If the migration fails:
1. Prisma will automatically rollback the transaction
2. CI pipeline will fail with clear error message
3. Developer can review migration SQL and fix issues
4. Re-run migration after fixes

### Seed Script Failures

Current error handling in seed.ts:
```typescript
main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

This will continue to work after migration.

## Testing Strategy

### Local Testing

1. Reset local database: `npx prisma migrate reset`
2. Apply all migrations: `npx prisma migrate deploy`
3. Run seed script: `npm run db:seed`
4. Verify all tables and columns exist

### CI Testing

The GitHub Actions workflow already includes:
```yaml
- npx prisma generate
- npx prisma migrate deploy
- npm run db:seed
```

After the migration is committed, the CI pipeline should:
1. Generate Prisma Client with new schema
2. Apply all migrations including the new one
3. Successfully seed the database
4. Run tests against the seeded database

### Verification Steps

1. Check that users table has all new columns
2. Verify new tables exist with correct structure
3. Confirm foreign keys are properly set up
4. Ensure indexes are created
5. Validate that seed script completes successfully

## Implementation Notes

### Migration Generation

To generate the migration locally:
```bash
npx prisma migrate dev --name add_auth_and_user_features
```

This will:
- Compare schema.prisma with current database state
- Generate SQL to add missing elements
- Create a new migration file in prisma/migrations/
- Apply the migration to the local database

### Backward Compatibility

The migration is backward compatible:
- All new columns are nullable or have defaults
- Existing data is preserved
- No breaking changes to existing queries
- Seed script works with or without new fields populated

### Foreign Key Constraints

All new tables with foreign keys to users:
- Use `onDelete: Cascade` for dependent data (sessions, backup codes)
- Use `onDelete: SetNull` for audit trails (created_by references)
- Ensures data integrity while preserving audit history
