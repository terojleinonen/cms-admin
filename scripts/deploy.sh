#!/bin/bash

# Kin Workspace CMS Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"
BACKUP_DIR="./backups"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking deployment requirements..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if environment file exists
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file $ENV_FILE not found. Please create it from .env.example"
        exit 1
    fi
    
    log_info "Requirements check passed."
}

backup_database() {
    log_info "Creating database backup..."
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Generate backup filename with timestamp
    BACKUP_FILE="$BACKUP_DIR/cms_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    # Create database backup
    if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U cms_user kin_workspace_cms > "$BACKUP_FILE"; then
        log_info "Database backup created: $BACKUP_FILE"
    else
        log_warn "Failed to create database backup. Continuing with deployment..."
    fi
}

build_and_deploy() {
    log_info "Building and deploying CMS..."
    
    # Load environment variables
    export $(cat "$ENV_FILE" | xargs)
    
    # Pull latest images
    log_info "Pulling latest images..."
    docker-compose -f "$COMPOSE_FILE" pull
    
    # Build the application
    log_info "Building CMS application..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache cms-app
    
    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose -f "$COMPOSE_FILE" down
    
    # Start services
    log_info "Starting services..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be ready..."
    sleep 30
    
    # Run database migrations
    log_info "Running database migrations..."
    docker-compose -f "$COMPOSE_FILE" exec cms-app npx prisma migrate deploy
    
    # Check service health
    check_health
}

check_health() {
    log_info "Checking service health..."
    
    # Check if all services are running
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Exit"; then
        log_error "Some services failed to start. Check logs with: docker-compose -f $COMPOSE_FILE logs"
        exit 1
    fi
    
    # Check application health endpoint
    sleep 10
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        log_info "CMS application is healthy."
    else
        log_error "CMS application health check failed."
        exit 1
    fi
    
    log_info "All services are running and healthy."
}

cleanup() {
    log_info "Cleaning up unused Docker resources..."
    docker system prune -f
    docker volume prune -f
}

show_status() {
    log_info "Deployment Status:"
    docker-compose -f "$COMPOSE_FILE" ps
    
    log_info "Service URLs:"
    echo "  CMS Admin: https://localhost (or your domain)"
    echo "  Database: localhost:5432"
    echo "  Redis: localhost:6379"
    
    log_info "Useful commands:"
    echo "  View logs: docker-compose -f $COMPOSE_FILE logs -f"
    echo "  Stop services: docker-compose -f $COMPOSE_FILE down"
    echo "  Restart services: docker-compose -f $COMPOSE_FILE restart"
}

# Main deployment process
main() {
    log_info "Starting CMS deployment..."
    
    check_requirements
    
    # Create backup if database is running
    if docker-compose -f "$COMPOSE_FILE" ps postgres | grep -q "Up"; then
        backup_database
    fi
    
    build_and_deploy
    cleanup
    show_status
    
    log_info "Deployment completed successfully!"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "backup")
        backup_database
        ;;
    "health")
        check_health
        ;;
    "status")
        show_status
        ;;
    "logs")
        docker-compose -f "$COMPOSE_FILE" logs -f "${2:-}"
        ;;
    "stop")
        log_info "Stopping all services..."
        docker-compose -f "$COMPOSE_FILE" down
        ;;
    "restart")
        log_info "Restarting services..."
        docker-compose -f "$COMPOSE_FILE" restart
        ;;
    *)
        echo "Usage: $0 {deploy|backup|health|status|logs|stop|restart}"
        echo ""
        echo "Commands:"
        echo "  deploy  - Full deployment (default)"
        echo "  backup  - Create database backup"
        echo "  health  - Check service health"
        echo "  status  - Show service status"
        echo "  logs    - Show service logs"
        echo "  stop    - Stop all services"
        echo "  restart - Restart all services"
        exit 1
        ;;
esac