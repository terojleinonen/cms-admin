#!/bin/bash

# Security Hardening Script for Production Deployment
# This script applies security best practices for the RBAC system

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Generate secure secrets
generate_secrets() {
    log "Generating secure secrets..."
    
    # Generate NEXTAUTH_SECRET (64 characters)
    NEXTAUTH_SECRET=$(openssl rand -base64 48)
    
    # Generate JWT_SECRET (32 characters)
    JWT_SECRET=$(openssl rand -base64 24)
    
    # Generate CSRF_SECRET (32 characters)
    CSRF_SECRET=$(openssl rand -base64 24)
    
    # Generate ENCRYPTION_KEY (32 characters)
    ENCRYPTION_KEY=$(openssl rand -base64 24)
    
    # Generate Redis password
    REDIS_PASSWORD=$(openssl rand -base64 24)
    
    # Generate database password
    DB_PASSWORD=$(openssl rand -base64 24)
    
    # Create secure environment file
    cat > .env.production.secure << EOF
# Auto-generated secure secrets - $(date)
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
JWT_SECRET=$JWT_SECRET
CSRF_SECRET=$CSRF_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
REDIS_PASSWORD=$REDIS_PASSWORD
POSTGRES_PASSWORD=$DB_PASSWORD
EOF
    
    chmod 600 .env.production.secure
    log "Secure secrets generated in .env.production.secure"
}

# Setup SSL certificates
setup_ssl() {
    log "Setting up SSL certificates..."
    
    mkdir -p nginx/ssl
    
    if [[ ! -f "nginx/ssl/cert.pem" ]]; then
        # Generate self-signed certificate for development/testing
        # In production, use proper certificates from Let's Encrypt or CA
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/private.key \
            -out nginx/ssl/cert.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        
        warn "Self-signed certificate generated. Replace with proper SSL certificate in production."
    fi
    
    # Set proper permissions
    chmod 600 nginx/ssl/private.key
    chmod 644 nginx/ssl/cert.pem
    
    log "SSL certificates configured"
}

# Configure security headers
configure_security_headers() {
    log "Configuring security headers..."
    
    # Create security configuration for Next.js
    cat > next.config.security.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';"
          }
        ]
      }
    ]
  },
  // Security-focused build configuration
  poweredByHeader: false,
  compress: true,
  generateEtags: false
}

module.exports = nextConfig
EOF
    
    log "Security headers configured"
}

# Setup database security
setup_database_security() {
    log "Configuring database security..."
    
    # Create database security configuration
    cat > init-scripts/02-security.sql << 'EOF'
-- Database security configuration
-- Revoke public schema permissions
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE kin_workspace_prod FROM PUBLIC;

-- Create application user with limited permissions
CREATE USER app_user WITH PASSWORD 'CHANGE_THIS_PASSWORD';
GRANT CONNECT ON DATABASE kin_workspace_prod TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Enable row level security on sensitive tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SecurityEvent" ENABLE ROW LEVEL SECURITY;

-- Create policies for row level security
CREATE POLICY user_isolation ON "User"
    FOR ALL TO app_user
    USING (id = current_setting('app.current_user_id')::text);

-- Enable audit logging
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to log all changes
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO "AuditLog" (id, "userId", action, resource, details, "createdAt")
        VALUES (uuid_generate_v4(), current_setting('app.current_user_id', true), 'CREATE', TG_TABLE_NAME, row_to_json(NEW), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO "AuditLog" (id, "userId", action, resource, details, "createdAt")
        VALUES (uuid_generate_v4(), current_setting('app.current_user_id', true), 'UPDATE', TG_TABLE_NAME, row_to_json(NEW), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO "AuditLog" (id, "userId", action, resource, details, "createdAt")
        VALUES (uuid_generate_v4(), current_setting('app.current_user_id', true), 'DELETE', TG_TABLE_NAME, row_to_json(OLD), NOW());
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
EOF
    
    log "Database security configured"
}

# Setup monitoring and alerting
setup_security_monitoring() {
    log "Setting up security monitoring..."
    
    # Create security monitoring configuration
    mkdir -p monitoring/security
    
    cat > monitoring/security/security-rules.yml << 'EOF'
groups:
  - name: security_monitoring
    rules:
      - alert: BruteForceAttack
        expr: rate(auth_login_attempts_total{status="failed"}[1m]) > 10
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Potential brute force attack detected"
          description: "More than 10 failed login attempts per minute from {{ $labels.instance }}"

      - alert: UnauthorizedAPIAccess
        expr: rate(http_requests_total{status="403"}[5m]) > 5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High number of unauthorized API access attempts"
          description: "More than 5 403 responses per second for 2 minutes"

      - alert: PermissionEscalation
        expr: rate(security_events_total{type="permission_escalation"}[5m]) > 0
        for: 0s
        labels:
          severity: critical
        annotations:
          summary: "Permission escalation attempt detected"
          description: "Potential permission escalation attempt detected"

      - alert: SuspiciousUserActivity
        expr: rate(audit_logs_total{action="DELETE"}[5m]) > 10
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Suspicious user activity detected"
          description: "High number of delete operations detected"
EOF
    
    log "Security monitoring configured"
}

# Setup log rotation and retention
setup_log_management() {
    log "Setting up log management..."
    
    # Create logrotate configuration
    cat > /etc/logrotate.d/kin-workspace << 'EOF'
/var/log/kin-workspace/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 www-data www-data
    postrotate
        docker-compose -f /opt/kin-workspace/docker-compose.production.yml restart nginx
    endscript
}
EOF
    
    # Create audit log retention script
    cat > scripts/audit-log-cleanup.sh << 'EOF'
#!/bin/bash
# Audit log cleanup script - run daily via cron

# Keep audit logs for 90 days
docker-compose -f docker-compose.production.yml exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
DELETE FROM \"AuditLog\" WHERE \"createdAt\" < NOW() - INTERVAL '90 days';
"

# Vacuum tables to reclaim space
docker-compose -f docker-compose.production.yml exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
VACUUM ANALYZE \"AuditLog\";
VACUUM ANALYZE \"SecurityEvent\";
"
EOF
    
    chmod +x scripts/audit-log-cleanup.sh
    
    log "Log management configured"
}

# Setup backup encryption
setup_backup_encryption() {
    log "Setting up backup encryption..."
    
    # Generate backup encryption key
    BACKUP_KEY=$(openssl rand -base64 32)
    echo "BACKUP_ENCRYPTION_KEY=$BACKUP_KEY" >> .env.production.secure
    
    # Create encrypted backup script
    cat > scripts/encrypted-backup.sh << 'EOF'
#!/bin/bash
# Encrypted backup script

source .env.production

BACKUP_DIR="/opt/backups/encrypted"
mkdir -p "$BACKUP_DIR"

# Create encrypted database backup
docker-compose -f docker-compose.production.yml exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | \
    openssl enc -aes-256-cbc -salt -k "$BACKUP_ENCRYPTION_KEY" > "$BACKUP_DIR/db_$(date +%Y%m%d_%H%M%S).sql.enc"

# Create encrypted application backup
tar -czf - .next public | \
    openssl enc -aes-256-cbc -salt -k "$BACKUP_ENCRYPTION_KEY" > "$BACKUP_DIR/app_$(date +%Y%m%d_%H%M%S).tar.gz.enc"

# Upload to secure storage (example with AWS S3)
if command -v aws &> /dev/null; then
    aws s3 sync "$BACKUP_DIR" s3://"$BACKUP_S3_BUCKET"/encrypted/ --delete
fi
EOF
    
    chmod +x scripts/encrypted-backup.sh
    
    log "Backup encryption configured"
}

# Main function
main() {
    log "Starting security hardening for production deployment..."
    
    generate_secrets
    setup_ssl
    configure_security_headers
    setup_database_security
    setup_security_monitoring
    setup_log_management
    setup_backup_encryption
    
    log "Security hardening completed successfully!"
    log "Please review and update the generated configuration files:"
    log "- .env.production.secure (contains generated secrets)"
    log "- nginx/ssl/ (SSL certificates)"
    log "- monitoring/security/ (security monitoring rules)"
    
    warn "Remember to:"
    warn "1. Replace self-signed certificates with proper SSL certificates"
    warn "2. Update database passwords in init-scripts/02-security.sql"
    warn "3. Configure proper backup storage credentials"
    warn "4. Set up cron jobs for log cleanup and backups"
    warn "5. Review and customize security policies for your environment"
}

# Execute main function
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi