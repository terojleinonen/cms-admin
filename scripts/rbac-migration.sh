#!/bin/bash

# RBAC Migration Helper Script
# Provides easy access to all RBAC migration and recovery commands

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if tsx is available
    if ! command -v tsx &> /dev/null; then
        log_error "tsx is not installed. Run: npm install -g tsx"
        exit 1
    fi
    
    # Check if DATABASE_URL is set
    if [ -z "$DATABASE_URL" ]; then
        log_error "DATABASE_URL environment variable is not set"
        exit 1
    fi
    
    # Check if pg_dump is available (optional)
    if ! command -v pg_dump &> /dev/null; then
        log_warning "pg_dump is not available. Database backups will be skipped."
    fi
    
    log_success "Prerequisites check completed"
}

# Show usage information
show_usage() {
    echo "RBAC Migration Helper Script"
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  migrate              Run complete RBAC migration"
    echo "  migrate-dry          Run migration in dry-run mode"
    echo "  rollback             Rollback RBAC migration"
    echo "  backup               Create system backup"
    echo "  restore <file>       Restore from backup file"
    echo "  validate             Validate system integrity"
    echo "  emergency            Run emergency recovery"
    echo "  status               Show migration status"
    echo "  help                 Show this help message"
    echo ""
    echo "Options:"
    echo "  --verbose            Enable verbose logging"
    echo "  --force              Force operation even with warnings"
    echo "  --skip-backup        Skip creating backup"
    echo "  --skip-validation    Skip validation steps"
    echo ""
    echo "Examples:"
    echo "  $0 migrate --verbose"
    echo "  $0 migrate-dry"
    echo "  $0 backup"
    echo "  $0 restore rbac-backup-20240101-120000.json"
    echo "  $0 emergency"
}

# Parse command line arguments
parse_args() {
    VERBOSE=""
    FORCE=""
    SKIP_BACKUP=""
    SKIP_VALIDATION=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --verbose)
                VERBOSE="--verbose"
                shift
                ;;
            --force)
                FORCE="--force"
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP="--skip-backup"
                shift
                ;;
            --skip-validation)
                SKIP_VALIDATION="--skip-validation"
                shift
                ;;
            *)
                break
                ;;
        esac
    done
}

# Run complete migration
run_migration() {
    log_info "Starting RBAC migration..."
    
    if ! tsx "$SCRIPT_DIR/rbac-migration-runner.ts" run $VERBOSE $FORCE $SKIP_BACKUP $SKIP_VALIDATION; then
        log_error "Migration failed!"
        exit 1
    fi
    
    log_success "Migration completed successfully!"
}

# Run dry migration
run_dry_migration() {
    log_info "Running RBAC migration in dry-run mode..."
    
    tsx "$SCRIPT_DIR/rbac-migration-runner.ts" run --dry-run $VERBOSE
    
    log_success "Dry-run completed!"
}

# Rollback migration
rollback_migration() {
    log_warning "Rolling back RBAC migration..."
    
    read -p "Are you sure you want to rollback the migration? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Rollback cancelled"
        exit 0
    fi
    
    if ! tsx "$SCRIPT_DIR/rbac-migration-runner.ts" rollback $VERBOSE; then
        log_error "Rollback failed!"
        exit 1
    fi
    
    log_success "Rollback completed!"
}

# Create backup
create_backup() {
    log_info "Creating system backup..."
    
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    BACKUP_FILE="rbac-backup-$TIMESTAMP.json"
    
    if ! tsx "$SCRIPT_DIR/rbac-recovery-procedures.ts" backup "$BACKUP_FILE" $VERBOSE; then
        log_error "Backup creation failed!"
        exit 1
    fi
    
    log_success "Backup created: $BACKUP_FILE"
}

# Restore from backup
restore_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        log_error "Backup file path is required"
        echo "Usage: $0 restore <backup-file>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log_warning "Restoring from backup: $backup_file"
    
    read -p "Are you sure you want to restore from backup? This will overwrite current data. (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Restore cancelled"
        exit 0
    fi
    
    if ! tsx "$SCRIPT_DIR/rbac-recovery-procedures.ts" restore "$backup_file" $VERBOSE; then
        log_error "Restore failed!"
        exit 1
    fi
    
    log_success "Restore completed!"
}

# Validate system
validate_system() {
    log_info "Validating RBAC system..."
    
    if ! tsx "$SCRIPT_DIR/rbac-recovery-procedures.ts" validate $VERBOSE; then
        log_error "Validation failed!"
        exit 1
    fi
    
    log_success "System validation completed!"
}

# Emergency recovery
emergency_recovery() {
    log_warning "Running emergency recovery..."
    
    if ! tsx "$SCRIPT_DIR/rbac-recovery-procedures.ts" emergency $VERBOSE; then
        log_error "Emergency recovery failed!"
        exit 1
    fi
    
    log_success "Emergency recovery completed!"
    log_warning "If an emergency admin was created, change the password immediately!"
}

# Show migration status
show_status() {
    log_info "Checking RBAC migration status..."
    
    # Check if RBAC tables exist
    RBAC_TABLES=("permission_cache" "security_events" "role_change_history" "user_preferences" "audit_logs")
    
    echo "Database Tables Status:"
    for table in "${RBAC_TABLES[@]}"; do
        if psql "$DATABASE_URL" -c "SELECT 1 FROM $table LIMIT 1;" &> /dev/null; then
            echo -e "  ${GREEN}✅ $table${NC}"
        else
            echo -e "  ${RED}❌ $table${NC}"
        fi
    done
    
    # Check user counts
    echo ""
    echo "User Statistics:"
    psql "$DATABASE_URL" -c "
        SELECT 
            role,
            COUNT(*) as count,
            COUNT(CASE WHEN is_active THEN 1 END) as active_count
        FROM users 
        GROUP BY role 
        ORDER BY role;
    " 2>/dev/null || log_error "Could not retrieve user statistics"
    
    # Check recent audit logs
    echo ""
    echo "Recent Migration Activity:"
    psql "$DATABASE_URL" -c "
        SELECT action, COUNT(*) as count
        FROM audit_logs 
        WHERE action LIKE '%MIGRAT%' OR action LIKE '%ADMIN%'
        GROUP BY action
        ORDER BY count DESC;
    " 2>/dev/null || log_warning "Could not retrieve audit log information"
}

# Main script logic
main() {
    local command="$1"
    shift || true
    
    # Parse remaining arguments
    parse_args "$@"
    
    case "$command" in
        migrate)
            check_prerequisites
            run_migration
            ;;
        migrate-dry)
            check_prerequisites
            run_dry_migration
            ;;
        rollback)
            check_prerequisites
            rollback_migration
            ;;
        backup)
            check_prerequisites
            create_backup
            ;;
        restore)
            check_prerequisites
            restore_backup "$1"
            ;;
        validate)
            check_prerequisites
            validate_system
            ;;
        emergency)
            check_prerequisites
            emergency_recovery
            ;;
        status)
            show_status
            ;;
        help|--help|-h)
            show_usage
            ;;
        "")
            log_error "No command specified"
            show_usage
            exit 1
            ;;
        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"