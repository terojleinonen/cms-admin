#!/bin/bash

# Production Startup Script for Kin Workspace CMS
# This script handles the complete startup process for production deployment

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/var/log/kin-workspace-startup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
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

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if running as root (not recommended for production)
    if [[ $EUID -eq 0 ]]; then
        warn "Running as root is not recommended for production"
    fi
    
    # Check required commands
    local required_commands=("docker" "docker-compose" "curl" "openssl")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "$cmd is not installed or not in PATH"
        fi
    done
    
    # Check environment file
    if [[ ! -f "$PROJECT_ROOT/.env.production" ]]; then
        error "Production environment file not found at $PROJECT_ROOT/.env.production"
    fi
    
    # Check SSL certificates
    if [[ ! -f "$PROJECT_ROOT/nginx/ssl/cert.pem" ]] || [[ ! -f "$PROJECT_ROOT/nginx/ssl/private.key" ]]; then
        warn "SSL certificates not found. HTTPS will not work properly."
    fi
    
    log "Prerequisites check completed"
}

# Initialize logging
initialize_logging() {
    log "Initializing logging system..."
    
    # Create log directories
    sudo mkdir -p /var/log/kin-workspace
    sudo mkdir -p "$PROJECT_ROOT/logs"
    
    # Set proper permissions
    sudo chown -R $USER:$USER /var/log/kin-workspace 2>/dev/null || true
    sudo chown -R $USER:$USER "$PROJECT_ROOT/logs" 2>/dev/null || true
    
    log "Logging system initialized"
}

# Load environment variables
load_environment() {
    log "Loading production environment..."
    
    cd "$PROJECT_ROOT"
    
    # Source environment file
    if [[ -f ".env.production" ]]; then
        set -a
        source .env.production
        set +a
        log "Production environment loaded"
    else
        error "Production environment file not found"
    fi
}

# Validate configuration
validate_configuration() {
    log "Validating configuration..."
    
    # Check required environment variables
    local required_vars=(
        "DATABASE_URL"
        "NEXTAUTH_SECRET"
        "NEXTAUTH_URL"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    # Validate database URL format
    if [[ ! "$DATABASE_URL" =~ ^postgresql:// ]]; then
        error "DATABASE_URL must be a valid PostgreSQL connection string"
    fi
    
    # Validate NEXTAUTH_URL format
    if [[ ! "$NEXTAUTH_URL" =~ ^https?:// ]]; then
        error "NEXTAUTH_URL must be a valid URL"
    fi
    
    log "Configuration validation completed"
}

# Setup security
setup_security() {
    log "Setting up security measures..."
    
    # Set file permissions
    chmod 600 .env.production 2>/dev/null || true
    chmod 600 nginx/ssl/private.key 2>/dev/null || true
    chmod 644 nginx/ssl/cert.pem 2>/dev/null || true
    
    # Configure firewall if ufw is available
    if command -v ufw &> /dev/null; then
        info "Configuring firewall..."
        sudo ufw --force reset
        sudo ufw default deny incoming
        sudo ufw default allow outgoing
        sudo ufw allow 22/tcp    # SSH
        sudo ufw allow 80/tcp    # HTTP
        sudo ufw allow 443/tcp   # HTTPS
        sudo ufw --force enable
        log "Firewall configured"
    else
        warn "UFW not available, skipping firewall configuration"
    fi
    
    log "Security setup completed"
}

# Start database
start_database() {
    log "Starting database services..."
    
    # Start database and Redis
    docker-compose -f docker-compose.production.yml up -d db redis
    
    # Wait for database to be ready
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if docker-compose -f docker-compose.production.yml exec -T db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" &>/dev/null; then
            log "Database is ready"
            break
        fi
        
        info "Waiting for database... (attempt $attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        error "Database failed to start within expected time"
    fi
}

# Run migrations
run_migrations() {
    log "Running database migrations..."
    
    # Generate Prisma client
    docker-compose -f docker-compose.production.yml run --rm app npx prisma generate
    
    # Run migrations
    docker-compose -f docker-compose.production.yml run --rm app npx prisma migrate deploy
    
    # Seed initial data if needed
    if [[ "${SEED_INITIAL_DATA:-false}" == "true" ]]; then
        info "Seeding initial data..."
        docker-compose -f docker-compose.production.yml run --rm app npm run seed
    fi
    
    log "Database migrations completed"
}

# Start application services
start_application() {
    log "Starting application services..."
    
    # Build and start application
    docker-compose -f docker-compose.production.yml up -d --build app nginx
    
    # Wait for application to be ready
    local max_attempts=20
    local attempt=1
    local health_url="${NEXTAUTH_URL}/api/health"
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$health_url" &>/dev/null; then
            log "Application is ready and healthy"
            break
        fi
        
        info "Waiting for application... (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        error "Application failed to start within expected time"
    fi
}

# Start monitoring
start_monitoring() {
    log "Starting monitoring services..."
    
    # Start monitoring stack
    docker-compose -f docker-compose.production.yml up -d monitoring grafana
    docker-compose -f monitoring/docker-compose.monitoring.yml up -d
    
    # Wait for monitoring services
    sleep 30
    
    log "Monitoring services started"
    info "Grafana available at: ${NEXTAUTH_URL}:3001"
    info "Prometheus available at: ${NEXTAUTH_URL}:9090"
}

# Setup cron jobs
setup_cron_jobs() {
    log "Setting up cron jobs..."
    
    # Create cron jobs for maintenance tasks
    (crontab -l 2>/dev/null; echo "0 2 * * * $PROJECT_ROOT/scripts/audit-log-cleanup.sh") | crontab -
    (crontab -l 2>/dev/null; echo "0 3 * * * $PROJECT_ROOT/scripts/encrypted-backup.sh") | crontab -
    (crontab -l 2>/dev/null; echo "*/15 * * * * curl -f $NEXTAUTH_URL/api/health > /dev/null 2>&1") | crontab -
    
    log "Cron jobs configured"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Check all services are running
    local services=("app" "db" "redis" "nginx" "monitoring" "grafana")
    for service in "${services[@]}"; do
        if docker-compose -f docker-compose.production.yml ps "$service" | grep -q "Up"; then
            info "$service is running"
        else
            warn "$service is not running properly"
        fi
    done
    
    # Test application endpoints
    local endpoints=("/api/health" "/api/metrics")
    for endpoint in "${endpoints[@]}"; do
        if curl -f -s "${NEXTAUTH_URL}${endpoint}" &>/dev/null; then
            info "Endpoint $endpoint is responding"
        else
            warn "Endpoint $endpoint is not responding"
        fi
    done
    
    log "Deployment verification completed"
}

# Display startup summary
display_summary() {
    log "Production startup completed successfully!"
    
    echo ""
    echo "=== Kin Workspace CMS Production Deployment ==="
    echo "Application URL: $NEXTAUTH_URL"
    echo "Health Check: $NEXTAUTH_URL/api/health"
    echo "Metrics: $NEXTAUTH_URL/api/metrics"
    echo "Grafana: $NEXTAUTH_URL:3001"
    echo "Prometheus: $NEXTAUTH_URL:9090"
    echo ""
    echo "Log files:"
    echo "- Startup log: $LOG_FILE"
    echo "- Application logs: $PROJECT_ROOT/logs/"
    echo "- System logs: /var/log/kin-workspace/"
    echo ""
    echo "Next steps:"
    echo "1. Access the application and verify functionality"
    echo "2. Configure monitoring alerts"
    echo "3. Set up SSL certificate renewal"
    echo "4. Review security settings"
    echo "5. Configure backup storage"
    echo ""
}

# Cleanup function for graceful shutdown
cleanup() {
    log "Performing cleanup..."
    # Add any cleanup tasks here
}

# Set trap for cleanup
trap cleanup EXIT

# Main execution
main() {
    log "Starting Kin Workspace CMS production deployment..."
    
    check_prerequisites
    initialize_logging
    load_environment
    validate_configuration
    setup_security
    start_database
    run_migrations
    start_application
    start_monitoring
    setup_cron_jobs
    verify_deployment
    display_summary
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi