#!/bin/bash

# Production Deployment Script for Kin Workspace CMS
# This script handles secure deployment to production environment

set -euo pipefail

# Configuration
DEPLOY_ENV="production"
BACKUP_DIR="/opt/backups"
LOG_FILE="/var/log/deploy.log"
HEALTH_CHECK_URL="https://your-domain.com/api/health"
MAX_DEPLOY_TIME=600  # 10 minutes

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Starting pre-deployment checks..."
    
    # Check if required environment variables are set
    if [[ ! -f ".env.production" ]]; then
        error "Production environment file not found"
    fi
    
    # Check Docker and Docker Compose
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
    fi
    
    # Check SSL certificates
    if [[ ! -f "nginx/ssl/cert.pem" ]] || [[ ! -f "nginx/ssl/private.key" ]]; then
        warn "SSL certificates not found. HTTPS will not work."
    fi
    
    # Check available disk space (minimum 5GB)
    available_space=$(df / | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 5242880 ]]; then
        error "Insufficient disk space. At least 5GB required."
    fi
    
    log "Pre-deployment checks completed successfully"
}

# Create backup
create_backup() {
    log "Creating backup before deployment..."
    
    mkdir -p "$BACKUP_DIR"
    backup_timestamp=$(date +%Y%m%d_%H%M%S)
    backup_file="$BACKUP_DIR/backup_$backup_timestamp.sql"
    
    # Database backup
    if docker-compose -f docker-compose.production.yml ps db | grep -q "Up"; then
        docker-compose -f docker-compose.production.yml exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$backup_file"
        log "Database backup created: $backup_file"
    else
        warn "Database container not running, skipping backup"
    fi
    
    # Application backup
    if [[ -d ".next" ]]; then
        tar -czf "$BACKUP_DIR/app_backup_$backup_timestamp.tar.gz" .next public
        log "Application backup created"
    fi
}

# Build and deploy
deploy_application() {
    log "Starting application deployment..."
    
    # Pull latest images
    docker-compose -f docker-compose.production.yml pull
    
    # Build application
    log "Building application..."
    docker-compose -f docker-compose.production.yml build --no-cache app
    
    # Run database migrations
    log "Running database migrations..."
    docker-compose -f docker-compose.production.yml run --rm app npx prisma migrate deploy
    
    # Start services with rolling update
    log "Starting services..."
    docker-compose -f docker-compose.production.yml up -d --remove-orphans
    
    log "Application deployment completed"
}

# Health check
health_check() {
    log "Performing health checks..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$HEALTH_CHECK_URL" > /dev/null; then
            log "Health check passed"
            return 0
        fi
        
        log "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    error "Health check failed after $max_attempts attempts"
}

# Security hardening
security_hardening() {
    log "Applying security hardening..."
    
    # Set proper file permissions
    chmod 600 .env.production
    chmod 600 nginx/ssl/private.key 2>/dev/null || true
    
    # Update system packages (if running on host)
    if command -v apt-get &> /dev/null; then
        apt-get update && apt-get upgrade -y
    fi
    
    # Configure firewall rules (example for ufw)
    if command -v ufw &> /dev/null; then
        ufw --force reset
        ufw default deny incoming
        ufw default allow outgoing
        ufw allow 22/tcp    # SSH
        ufw allow 80/tcp    # HTTP
        ufw allow 443/tcp   # HTTPS
        ufw --force enable
    fi
    
    log "Security hardening completed"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring and alerting..."
    
    # Start monitoring services
    docker-compose -f docker-compose.production.yml up -d monitoring grafana
    
    # Wait for services to be ready
    sleep 30
    
    # Import Grafana dashboards
    if [[ -d "monitoring/grafana/dashboards" ]]; then
        log "Grafana dashboards will be automatically provisioned"
    fi
    
    log "Monitoring setup completed"
}

# Cleanup old resources
cleanup() {
    log "Cleaning up old resources..."
    
    # Remove unused Docker images
    docker image prune -f
    
    # Remove old backups (keep last 7 days)
    find "$BACKUP_DIR" -name "backup_*.sql" -mtime +7 -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "app_backup_*.tar.gz" -mtime +7 -delete 2>/dev/null || true
    
    log "Cleanup completed"
}

# Rollback function
rollback() {
    error "Deployment failed. Starting rollback..."
    
    # Stop current deployment
    docker-compose -f docker-compose.production.yml down
    
    # Restore from backup if available
    latest_backup=$(ls -t "$BACKUP_DIR"/backup_*.sql 2>/dev/null | head -n1)
    if [[ -n "$latest_backup" ]]; then
        log "Restoring database from backup: $latest_backup"
        docker-compose -f docker-compose.production.yml up -d db
        sleep 10
        docker-compose -f docker-compose.production.yml exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$latest_backup"
    fi
    
    error "Rollback completed. Please check logs and try again."
}

# Main deployment function
main() {
    log "Starting production deployment for Kin Workspace CMS"
    
    # Set trap for cleanup on failure
    trap rollback ERR
    
    # Deployment steps
    pre_deployment_checks
    create_backup
    deploy_application
    health_check
    security_hardening
    setup_monitoring
    cleanup
    
    log "Production deployment completed successfully!"
    log "Application is available at: $HEALTH_CHECK_URL"
    log "Grafana monitoring: https://your-domain.com:3001"
    log "Prometheus metrics: https://your-domain.com:9090"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi