-- CreateEnum
DO $$ BEGIN
 CREATE TYPE "public"."Theme" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
 CREATE TYPE "public"."NotificationType" AS ENUM ('SECURITY_ALERT', 'PASSWORD_CHANGED', 'EMAIL_CHANGED', 'TWO_FACTOR_ENABLED', 'TWO_FACTOR_DISABLED', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'LOGIN_FROM_NEW_DEVICE', 'PROFILE_UPDATED', 'PREFERENCES_UPDATED', 'ACCOUNT_DEACTIVATED', 'ACCOUNT_REACTIVATED', 'ROLE_CHANGED', 'ADMIN_MESSAGE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
 CREATE TYPE "public"."EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BOUNCED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- AlterTable: Add missing columns to users table
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "profile_picture" VARCHAR(500);
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "email_verified" TIMESTAMP(3);
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "two_factor_secret" VARCHAR(255);
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMP(3);

-- CreateTable: user_preferences
CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "theme" "public"."Theme" NOT NULL DEFAULT 'SYSTEM',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
    "language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "notifications" JSONB NOT NULL DEFAULT '{"email": true, "push": true, "security": true, "marketing": false}',
    "dashboard" JSONB NOT NULL DEFAULT '{"layout": "default", "widgets": [], "defaultView": "dashboard"}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable: audit_logs
CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "resource" VARCHAR(100) NOT NULL,
    "details" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: sessions
CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: backup_codes
CREATE TABLE IF NOT EXISTS "public"."backup_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backup_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: password_reset_tokens
CREATE TABLE IF NOT EXISTS "public"."password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable: notifications
CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable: email_logs
CREATE TABLE IF NOT EXISTS "public"."email_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "to" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "type" "public"."NotificationType",
    "status" "public"."EmailStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'user_preferences_user_id_key') THEN
        CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "public"."user_preferences"("user_id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'audit_logs_user_id_idx') THEN
        CREATE INDEX "audit_logs_user_id_idx" ON "public"."audit_logs"("user_id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'audit_logs_action_idx') THEN
        CREATE INDEX "audit_logs_action_idx" ON "public"."audit_logs"("action");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'audit_logs_created_at_idx') THEN
        CREATE INDEX "audit_logs_created_at_idx" ON "public"."audit_logs"("created_at");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'sessions_user_id_idx') THEN
        CREATE INDEX "sessions_user_id_idx" ON "public"."sessions"("user_id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'sessions_token_key') THEN
        CREATE UNIQUE INDEX "sessions_token_key" ON "public"."sessions"("token");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'sessions_token_idx') THEN
        CREATE INDEX "sessions_token_idx" ON "public"."sessions"("token");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'sessions_expires_at_idx') THEN
        CREATE INDEX "sessions_expires_at_idx" ON "public"."sessions"("expires_at");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'backup_codes_user_id_idx') THEN
        CREATE INDEX "backup_codes_user_id_idx" ON "public"."backup_codes"("user_id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'backup_codes_code_idx') THEN
        CREATE INDEX "backup_codes_code_idx" ON "public"."backup_codes"("code");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'password_reset_tokens_user_id_idx') THEN
        CREATE INDEX "password_reset_tokens_user_id_idx" ON "public"."password_reset_tokens"("user_id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'password_reset_tokens_token_hash_idx') THEN
        CREATE INDEX "password_reset_tokens_token_hash_idx" ON "public"."password_reset_tokens"("token_hash");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'password_reset_tokens_expires_at_idx') THEN
        CREATE INDEX "password_reset_tokens_expires_at_idx" ON "public"."password_reset_tokens"("expires_at");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'notifications_user_id_idx') THEN
        CREATE INDEX "notifications_user_id_idx" ON "public"."notifications"("user_id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'notifications_type_idx') THEN
        CREATE INDEX "notifications_type_idx" ON "public"."notifications"("type");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'notifications_read_idx') THEN
        CREATE INDEX "notifications_read_idx" ON "public"."notifications"("read");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'notifications_created_at_idx') THEN
        CREATE INDEX "notifications_created_at_idx" ON "public"."notifications"("created_at");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'email_logs_user_id_idx') THEN
        CREATE INDEX "email_logs_user_id_idx" ON "public"."email_logs"("user_id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'email_logs_status_idx') THEN
        CREATE INDEX "email_logs_status_idx" ON "public"."email_logs"("status");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'email_logs_type_idx') THEN
        CREATE INDEX "email_logs_type_idx" ON "public"."email_logs"("type");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'email_logs_created_at_idx') THEN
        CREATE INDEX "email_logs_created_at_idx" ON "public"."email_logs"("created_at");
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_preferences_user_id_fkey'
    ) THEN
        ALTER TABLE "public"."user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'audit_logs_user_id_fkey'
    ) THEN
        ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sessions_user_id_fkey'
    ) THEN
        ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'backup_codes_user_id_fkey'
    ) THEN
        ALTER TABLE "public"."backup_codes" ADD CONSTRAINT "backup_codes_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'password_reset_tokens_user_id_fkey'
    ) THEN
        ALTER TABLE "public"."password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notifications_user_id_fkey'
    ) THEN
        ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'email_logs_user_id_fkey'
    ) THEN
        ALTER TABLE "public"."email_logs" ADD CONSTRAINT "email_logs_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Update foreign keys to make created_by nullable where needed
DO $$ BEGIN
    -- Drop and recreate foreign keys for created_by columns to allow NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'api_keys_created_by_fkey' 
        AND table_name = 'api_keys'
    ) THEN
        ALTER TABLE "public"."api_keys" DROP CONSTRAINT "api_keys_created_by_fkey";
    END IF;
    
    ALTER TABLE "public"."api_keys" ADD CONSTRAINT "api_keys_created_by_fkey" 
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
END $$;

DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'backups_created_by_fkey' 
        AND table_name = 'backups'
    ) THEN
        ALTER TABLE "public"."backups" DROP CONSTRAINT "backups_created_by_fkey";
    END IF;
    
    ALTER TABLE "public"."backups" ADD CONSTRAINT "backups_created_by_fkey" 
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
END $$;

DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'content_revisions_created_by_fkey' 
        AND table_name = 'content_revisions'
    ) THEN
        ALTER TABLE "public"."content_revisions" DROP CONSTRAINT "content_revisions_created_by_fkey";
    END IF;
    
    ALTER TABLE "public"."content_revisions" ADD CONSTRAINT "content_revisions_created_by_fkey" 
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
END $$;

DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'media_created_by_fkey' 
        AND table_name = 'media'
    ) THEN
        ALTER TABLE "public"."media" DROP CONSTRAINT "media_created_by_fkey";
    END IF;
    
    ALTER TABLE "public"."media" ADD CONSTRAINT "media_created_by_fkey" 
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
END $$;

DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pages_created_by_fkey' 
        AND table_name = 'pages'
    ) THEN
        ALTER TABLE "public"."pages" DROP CONSTRAINT "pages_created_by_fkey";
    END IF;
    
    ALTER TABLE "public"."pages" ADD CONSTRAINT "pages_created_by_fkey" 
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
END $$;

DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'products_created_by_fkey' 
        AND table_name = 'products'
    ) THEN
        ALTER TABLE "public"."products" DROP CONSTRAINT "products_created_by_fkey";
    END IF;
    
    ALTER TABLE "public"."products" ADD CONSTRAINT "products_created_by_fkey" 
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
END $$;
