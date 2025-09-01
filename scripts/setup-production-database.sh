#!/bin/bash

# Kin Workspace CMS Production Database Setup Script
# This script sets up and optimizes PostgreSQL for production use

set -e

echo "🚀 Setting up Kin Workspace CMS Production Database..."

# Check if required environment variables are set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    echo "   Please set DATABASE_URL before running this script"
    exit 1
fi

if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "❌ POSTGRES_PASSWORD environment variable is not set"
    echo "   Please set POSTGRES_PASSWORD before running this script"
    exit 1
fi

# Parse database URL
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')

echo "📋 Database Configuration:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"

# Test database connection
echo "🔍 Testing database connection..."
if ! PGPASSWORD=$POSTGRES_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Database connection failed!"
    echo "   Please check your DATABASE_URL and POSTGRES_PASSWORD"
    exit 1
fi

echo "✅ Database connection successful!"

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

# Optimize PostgreSQL configuration for production
echo "⚡ Optimizing PostgreSQL configuration..."

# Calculate optimal settings based on available memory
TOTAL_MEM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}' 2>/dev/null || echo "4194304")
TOTAL_MEM_MB=$((TOTAL_MEM_KB / 1024))

# Calculate optimal shared_buffers (25% of total memory, max 8GB)
SHARED_BUFFERS_MB=$((TOTAL_MEM_MB / 4))
if [ $SHARED_BUFFERS_MB -gt 8192 ]; then
    SHARED_BUFFERS_MB=8192
fi

# Calculate effective_cache_size (75% of total memory)
EFFECTIVE_CACHE_SIZE_MB=$((TOTAL_MEM_MB * 3 / 4))

# Calculate work_mem (Total memory / max_connections / 4)
MAX_CONNECTIONS=100
WORK_MEM_MB=$((TOTAL_MEM_MB / MAX_CONNECTIONS / 4))
if [ $WORK_MEM_MB -lt 4 ]; then
    WORK_MEM_MB=4
fi

echo "📊 Calculated optimal settings:"
echo "   Total Memory: ${TOTAL_MEM_MB}MB"
echo "   Shared Buffers: ${SHARED_BUFFERS_MB}MB"
echo "   Effective Cache Size: ${EFFECTIVE_CACHE_SIZE_MB}MB"
echo "   Work Memory: ${WORK_MEM_MB}MB"

# Apply PostgreSQL optimizations
PGPASSWORD=$POSTGRES_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
-- Connection and authentication settings
ALTER SYSTEM SET max_connections = '$MAX_CONNECTIONS';
ALTER SYSTEM SET shared_buffers = '${SHARED_BUFFERS_MB}MB';

-- Memory settings
ALTER SYSTEM SET effective_cache_size = '${EFFECTIVE_CACHE_SIZE_MB}MB';
ALTER SYSTEM SET work_mem = '${WORK_MEM_MB}MB';
ALTER SYSTEM SET maintenance_work_mem = '256MB';

-- WAL settings for better performance
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET checkpoint_timeout = '10min';

-- Query planner settings
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET default_statistics_target = 100;

-- Logging settings for monitoring
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_lock_waits = on;

-- Enable query statistics (requires restart)
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.track = 'all';

SELECT pg_reload_conf();
EOF

echo "✅ PostgreSQL configuration optimized!"

# Create database indexes for better performance
echo "🔍 Creating performance indexes..."
PGPASSWORD=$POSTGRES_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
-- Indexes for audit logs (frequently queried)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action);

-- Indexes for API usage logs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_usage_logs_timestamp ON api_usage_logs(timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_usage_logs_api_key_timestamp ON api_usage_logs(api_key_id, timestamp);

-- Indexes for sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_active ON sessions(user_id, is_active);

-- Indexes for products
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_status_featured ON products(status, featured);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_created_at ON products(created_at);

-- Indexes for notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_type_created ON notifications(type, created_at);
EOF

echo "✅ Performance indexes created!"

# Analyze tables for better query planning
echo "📈 Analyzing tables for query optimization..."
PGPASSWORD=$POSTGRES_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "ANALYZE;"

echo "✅ Table analysis complete!"

# Test final database performance
echo "🔍 Testing database performance..."
PGPASSWORD=$POSTGRES_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
-- Test query performance
EXPLAIN ANALYZE SELECT count(*) FROM users WHERE is_active = true;
EXPLAIN ANALYZE SELECT count(*) FROM products WHERE status = 'PUBLISHED';
EOF

echo ""
echo "🎉 Production database setup complete!"
echo ""
echo "📋 Next Steps:"
echo "   1. Restart PostgreSQL server to apply all configuration changes"
echo "   2. Monitor database performance using the admin dashboard"
echo "   3. Set up automated backups"
echo "   4. Configure monitoring and alerting"
echo ""
echo "🔧 Useful Commands:"
echo "   View database status: npx prisma studio"
echo "   Check configuration: psql -c 'SHOW all;'"
echo "   Monitor performance: psql -c 'SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;'"
echo ""