#!/bin/bash

# Kin Workspace CMS Database Backup Script
# Creates automated backups with compression and retention management

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
COMPRESS_BACKUPS="${COMPRESS_BACKUPS:-true}"

# Parse command line arguments
BACKUP_TYPE="${1:-full}"  # full, schema, data
BACKUP_NAME="${2:-$(date +%Y%m%d_%H%M%S)}"

echo "🗄️  Starting database backup..."
echo "   Type: $BACKUP_TYPE"
echo "   Name: $BACKUP_NAME"

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

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${BACKUP_TYPE}_${BACKUP_NAME}.sql"

echo "📁 Backup location: $BACKUP_FILE"

# Perform backup based on type
case $BACKUP_TYPE in
    "full")
        echo "📦 Creating full database backup..."
        PGPASSWORD=$DB_PASSWORD pg_dump \
            -h $DB_HOST \
            -p $DB_PORT \
            -U $DB_USER \
            -d $DB_NAME \
            --verbose \
            --no-password \
            --format=custom \
            --compress=9 \
            --file="$BACKUP_FILE.custom"
        
        # Also create SQL format for easier inspection
        PGPASSWORD=$DB_PASSWORD pg_dump \
            -h $DB_HOST \
            -p $DB_PORT \
            -U $DB_USER \
            -d $DB_NAME \
            --verbose \
            --no-password \
            --format=plain \
            --file="$BACKUP_FILE"
        ;;
    
    "schema")
        echo "🏗️  Creating schema-only backup..."
        PGPASSWORD=$DB_PASSWORD pg_dump \
            -h $DB_HOST \
            -p $DB_PORT \
            -U $DB_USER \
            -d $DB_NAME \
            --verbose \
            --no-password \
            --schema-only \
            --file="$BACKUP_FILE"
        ;;
    
    "data")
        echo "📊 Creating data-only backup..."
        PGPASSWORD=$DB_PASSWORD pg_dump \
            -h $DB_HOST \
            -p $DB_PORT \
            -U $DB_USER \
            -d $DB_NAME \
            --verbose \
            --no-password \
            --data-only \
            --file="$BACKUP_FILE"
        ;;
    
    *)
        echo "❌ Invalid backup type: $BACKUP_TYPE"
        echo "   Valid types: full, schema, data"
        exit 1
        ;;
esac

# Compress backup if enabled
if [ "$COMPRESS_BACKUPS" = "true" ] && [ -f "$BACKUP_FILE" ]; then
    echo "🗜️  Compressing backup..."
    gzip "$BACKUP_FILE"
    BACKUP_FILE="$BACKUP_FILE.gz"
fi

# Get backup file size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ Backup created successfully!"
echo "   File: $BACKUP_FILE"
echo "   Size: $BACKUP_SIZE"

# Generate backup metadata
METADATA_FILE="$BACKUP_FILE.meta"
cat > "$METADATA_FILE" << EOF
{
  "backup_type": "$BACKUP_TYPE",
  "backup_name": "$BACKUP_NAME",
  "database_name": "$DB_NAME",
  "database_host": "$DB_HOST",
  "database_port": "$DB_PORT",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "file_size": "$BACKUP_SIZE",
  "compressed": $([ "$COMPRESS_BACKUPS" = "true" ] && echo "true" || echo "false"),
  "format": "$([ "$BACKUP_TYPE" = "full" ] && echo "custom" || echo "plain")",
  "version": "$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c 'SELECT version();' | head -1 | xargs)"
}
EOF

echo "📋 Backup metadata saved to: $METADATA_FILE"

# Clean up old backups based on retention policy
if [ "$RETENTION_DAYS" -gt 0 ]; then
    echo "🧹 Cleaning up old backups (retention: $RETENTION_DAYS days)..."
    find "$BACKUP_DIR" -name "*.sql*" -type f -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.meta" -type f -mtime +$RETENTION_DAYS -delete
    echo "✅ Old backups cleaned up"
fi

# Verify backup integrity
echo "🔍 Verifying backup integrity..."
if [ -f "$BACKUP_FILE.custom" ]; then
    # Verify custom format backup
    if pg_restore --list "$BACKUP_FILE.custom" > /dev/null 2>&1; then
        echo "✅ Custom format backup verified"
    else
        echo "❌ Custom format backup verification failed"
        exit 1
    fi
fi

if [ -f "$BACKUP_FILE" ] || [ -f "$BACKUP_FILE.gz" ]; then
    # Basic verification for SQL format
    ACTUAL_FILE="$BACKUP_FILE"
    if [ -f "$BACKUP_FILE.gz" ]; then
        ACTUAL_FILE="$BACKUP_FILE.gz"
    fi
    
    if [ -s "$ACTUAL_FILE" ]; then
        echo "✅ SQL backup file verified (non-empty)"
    else
        echo "❌ SQL backup file is empty"
        exit 1
    fi
fi

echo ""
echo "🎉 Database backup completed successfully!"
echo ""
echo "📋 Backup Summary:"
echo "   Type: $BACKUP_TYPE"
echo "   File: $BACKUP_FILE"
echo "   Size: $BACKUP_SIZE"
echo "   Metadata: $METADATA_FILE"
echo ""
echo "🔧 Restore Commands:"
if [ -f "$BACKUP_FILE.custom" ]; then
    echo "   Custom format: pg_restore -d database_name $BACKUP_FILE.custom"
fi
if [ -f "$BACKUP_FILE" ]; then
    echo "   SQL format: psql -d database_name -f $BACKUP_FILE"
elif [ -f "$BACKUP_FILE.gz" ]; then
    echo "   Compressed SQL: gunzip -c $BACKUP_FILE.gz | psql -d database_name"
fi
echo ""