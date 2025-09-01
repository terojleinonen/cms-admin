#!/bin/bash

# Kin Workspace CMS Database Restore Script
# Restores database from backup files with safety checks

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
FORCE_RESTORE="${FORCE_RESTORE:-false}"

# Parse command line arguments
BACKUP_FILE="$1"
TARGET_DB="${2:-}"

if [ -z "$BACKUP_FILE" ]; then
    echo "❌ Usage: $0 <backup_file> [target_database]"
    echo ""
    echo "Examples:"
    echo "   $0 backups/mydb_full_20240109_143022.sql.gz"
    echo "   $0 backups/mydb_full_20240109_143022.sql.custom target_db"
    echo ""
    exit 1
fi

echo "🔄 Starting database restore..."
echo "   Backup file: $BACKUP_FILE"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    exit 1
fi

# Parse database URL
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*\/\/[^:]*:\([^@]*\)@.*/\1/p')

# Use target database if specified
if [ -n "$TARGET_DB" ]; then
    DB_NAME="$TARGET_DB"
fi

echo "📋 Target Database:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"

# Test database connection
echo "🔍 Testing database connection..."
if ! PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Database connection failed!"
    echo "   Please check your DATABASE_URL and database credentials"
    exit 1
fi

echo "✅ Database connection successful!"

# Check if target database exists
DB_EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';" | xargs)

if [ "$DB_EXISTS" = "1" ]; then
    echo "⚠️  Target database '$DB_NAME' already exists!"
    
    if [ "$FORCE_RESTORE" != "true" ]; then
        echo "❌ Restore cancelled to prevent data loss."
        echo "   Use FORCE_RESTORE=true to override this safety check."
        echo "   WARNING: This will completely replace the existing database!"
        exit 1
    fi
    
    echo "🗑️  Force restore enabled - existing database will be replaced!"
    
    # Terminate active connections
    echo "🔌 Terminating active connections..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
    " > /dev/null 2>&1 || true
    
    # Drop existing database
    echo "🗑️  Dropping existing database..."
    PGPASSWORD=$DB_PASSWORD dropdb -h $DB_HOST -p $DB_PORT -U $DB_USER "$DB_NAME"
fi

# Create target database
echo "🏗️  Creating target database..."
PGPASSWORD=$DB_PASSWORD createdb -h $DB_HOST -p $DB_PORT -U $DB_USER "$DB_NAME"

# Load backup metadata if available
METADATA_FILE="$BACKUP_FILE.meta"
if [ -f "$METADATA_FILE" ]; then
    echo "📋 Loading backup metadata..."
    BACKUP_TYPE=$(grep '"backup_type"' "$METADATA_FILE" | cut -d'"' -f4)
    CREATED_AT=$(grep '"created_at"' "$METADATA_FILE" | cut -d'"' -f4)
    ORIGINAL_SIZE=$(grep '"file_size"' "$METADATA_FILE" | cut -d'"' -f4)
    
    echo "   Backup type: $BACKUP_TYPE"
    echo "   Created: $CREATED_AT"
    echo "   Original size: $ORIGINAL_SIZE"
fi

# Determine backup format and restore accordingly
echo "🔄 Restoring database..."

if [[ "$BACKUP_FILE" == *.custom ]]; then
    # Custom format backup (pg_dump -Fc)
    echo "📦 Restoring from custom format backup..."
    PGPASSWORD=$DB_PASSWORD pg_restore \
        -h $DB_HOST \
        -p $DB_PORT \
        -U $DB_USER \
        -d "$DB_NAME" \
        --verbose \
        --no-password \
        --clean \
        --if-exists \
        "$BACKUP_FILE"

elif [[ "$BACKUP_FILE" == *.gz ]]; then
    # Compressed SQL backup
    echo "🗜️  Restoring from compressed SQL backup..."
    gunzip -c "$BACKUP_FILE" | PGPASSWORD=$DB_PASSWORD psql \
        -h $DB_HOST \
        -p $DB_PORT \
        -U $DB_USER \
        -d "$DB_NAME" \
        --quiet

elif [[ "$BACKUP_FILE" == *.sql ]]; then
    # Plain SQL backup
    echo "📄 Restoring from SQL backup..."
    PGPASSWORD=$DB_PASSWORD psql \
        -h $DB_HOST \
        -p $DB_PORT \
        -U $DB_USER \
        -d "$DB_NAME" \
        --quiet \
        -f "$BACKUP_FILE"

else
    echo "❌ Unsupported backup format: $BACKUP_FILE"
    echo "   Supported formats: .sql, .sql.gz, .custom"
    exit 1
fi

# Verify restore
echo "🔍 Verifying database restore..."

# Check if tables exist
TABLE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d "$DB_NAME" -t -c "
    SELECT count(*) 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
" | xargs)

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo "✅ Database restore verified - $TABLE_COUNT tables found"
else
    echo "❌ Database restore verification failed - no tables found"
    exit 1
fi

# Run database migrations to ensure schema is up to date
echo "🔄 Running database migrations..."
if command -v npx > /dev/null 2>&1; then
    DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" npx prisma migrate deploy
    echo "✅ Database migrations completed"
else
    echo "⚠️  npx not found - skipping migrations"
    echo "   Run 'npx prisma migrate deploy' manually after restore"
fi

# Generate restore report
RESTORE_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
FINAL_SIZE=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d "$DB_NAME" -t -c "
    SELECT pg_size_pretty(pg_database_size('$DB_NAME'));
" | xargs)

echo ""
echo "🎉 Database restore completed successfully!"
echo ""
echo "📋 Restore Summary:"
echo "   Source file: $BACKUP_FILE"
echo "   Target database: $DB_NAME"
echo "   Tables restored: $TABLE_COUNT"
echo "   Final database size: $FINAL_SIZE"
echo "   Restore completed: $RESTORE_TIME"
echo ""
echo "🔧 Next Steps:"
echo "   1. Test application connectivity"
echo "   2. Verify data integrity"
echo "   3. Update application configuration if needed"
echo "   4. Monitor database performance"
echo ""