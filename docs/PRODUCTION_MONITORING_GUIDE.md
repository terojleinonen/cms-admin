# Production Monitoring and Maintenance Guide

## Overview

The production monitoring and maintenance system provides comprehensive monitoring, automated backups, and maintenance procedures for the RBAC system in production environments.

## Components

### 1. Production Health Monitor (`app/lib/production-health-monitor.ts`)

Monitors system health metrics including:
- Database connectivity and response time
- Permission cache performance
- Memory usage
- Active user sessions
- Security events

**Key Features:**
- Real-time health checks
- Configurable thresholds
- Automatic alerting for critical issues
- Continuous monitoring with configurable intervals

### 2. Backup and Recovery System (`app/lib/backup-recovery-system.ts`)

Provides automated backup and recovery capabilities:
- Full system backups
- RBAC-only backups (users, permissions, audit logs)
- Incremental backups
- Backup verification and integrity checking
- Automated backup scheduling

**Key Features:**
- Multiple backup types
- Automated scheduling (daily full, 6-hourly RBAC)
- Backup verification with checksums
- Recovery procedures with rollback support

### 3. Maintenance Procedures (`app/lib/maintenance-procedures.ts`)

Handles system maintenance and updates:
- Permission cache cleanup
- Audit log archival
- Security event cleanup
- Database statistics updates
- Permission cache warming
- System health checks

**Key Features:**
- Scheduled maintenance tasks
- Maintenance mode management
- System update procedures
- Performance optimization

## API Endpoints

### Health Monitoring
- `GET /api/admin/production/health` - Get current system health
- `POST /api/admin/production/health` - Start monitoring or log metrics

### Backup Management
- `GET /api/admin/production/backup` - List backups
- `POST /api/admin/production/backup` - Create, verify, or restore backups

### Maintenance
- `GET /api/admin/production/maintenance` - Get maintenance status
- `POST /api/admin/production/maintenance` - Run maintenance tasks

## Web Interface

Access the production monitoring dashboard at `/admin/production` (requires admin permissions).

**Dashboard Features:**
- Real-time system health display
- Health metrics visualization
- Maintenance task controls
- Backup management interface
- System status overview

## Setup and Initialization

### 1. Initialize Production Monitoring

```bash
# Run the initialization script
npx tsx scripts/production-monitoring-init.ts
```

This will:
- Initialize backup and recovery system
- Start automated backup scheduling
- Begin continuous health monitoring
- Schedule maintenance tasks
- Create initial system backup
- Run initial health check

### 2. Manual Operations

#### Create Backups
```typescript
import { backupRecoverySystem } from '@/app/lib/backup-recovery-system'

// Create full backup
const fullBackup = await backupRecoverySystem.createFullBackup()

// Create RBAC-only backup
const rbacBackup = await backupRecoverySystem.createRBACOnlyBackup()

// Create incremental backup
const lastBackupTime = new Date(Date.now() - 24 * 60 * 60 * 1000)
const incrementalBackup = await backupRecoverySystem.createIncrementalBackup(lastBackupTime)
```

#### Run Maintenance Tasks
```typescript
import { maintenanceProcedures } from '@/app/lib/maintenance-procedures'

// Run specific maintenance task
await maintenanceProcedures.runMaintenanceTask('permission_cache_cleanup')

// Run daily maintenance
await maintenanceProcedures.runDailyMaintenance()

// Run weekly maintenance
await maintenanceProcedures.runWeeklyMaintenance()
```

#### Check System Health
```typescript
import { productionHealthMonitor } from '@/app/lib/production-health-monitor'

// Get current system health
const health = await productionHealthMonitor.getSystemHealth()
console.log(`System status: ${health.overall}`)

// Start continuous monitoring
await productionHealthMonitor.startContinuousMonitoring(60000) // Every minute
```

## Monitoring Schedules

### Automated Schedules
- **Health Monitoring**: Every 60 seconds
- **Full Backups**: Daily at 2:00 AM
- **RBAC Backups**: Every 6 hours
- **Daily Maintenance**: Daily at 3:00 AM
- **Weekly Maintenance**: Sundays at 4:00 AM

### Health Check Thresholds
- **Database Response**: < 100ms (healthy), < 500ms (warning), >= 500ms (critical)
- **Permission Cache**: < 50ms (healthy), < 200ms (warning), >= 200ms (critical)
- **Memory Usage**: < 70% (healthy), < 85% (warning), >= 85% (critical)
- **Active Sessions**: < 1000 (healthy), < 5000 (warning), >= 5000 (critical)
- **Security Events**: 0 (healthy), < 5/hour (warning), >= 5/hour (critical)

## Maintenance Tasks

### Daily Tasks
1. **Permission Cache Cleanup** - Remove expired cache entries
2. **Security Event Cleanup** - Remove resolved security events older than 30 days
3. **System Health Check** - Comprehensive health verification

### Weekly Tasks
1. **Audit Log Archival** - Archive logs older than 90 days
2. **Database Statistics Update** - Update PostgreSQL query planner statistics
3. **Permission Cache Warming** - Pre-warm cache for active users

## Alerting and Notifications

### Critical Alerts
- System health status becomes critical
- Database connectivity issues
- High memory usage (>85%)
- Multiple security events detected

### Alert Actions
- Automatic security event creation
- Audit log entries
- Console error logging
- Dashboard status updates

## Backup Strategy

### Backup Types
1. **Full Backup** - Complete database dump of RBAC tables
2. **RBAC-Only Backup** - JSON export of users, permissions, audit logs, security events
3. **Incremental Backup** - Changes since last backup timestamp

### Retention Policy
- Keep last 30 backups by default (configurable)
- Automatic cleanup of old backups
- Backup verification before cleanup

### Recovery Procedures
1. Verify backup integrity
2. Enable maintenance mode (if required)
3. Restore from backup
4. Run post-restore verification
5. Disable maintenance mode

## Maintenance Mode

### Enable Maintenance Mode
```typescript
await maintenanceProcedures.enableMaintenanceMode('System update in progress')
```

### Disable Maintenance Mode
```typescript
await maintenanceProcedures.disableMaintenanceMode()
```

### Effects of Maintenance Mode
- Creates security event for tracking
- Can be used to block user access (implement in middleware)
- Logged in audit system

## System Updates

### Update Procedure
```typescript
const update = {
  version: '2.1.0',
  description: 'Security patches and performance improvements',
  type: 'security',
  requiresDowntime: true,
  rollbackPlan: 'Restore from pre-update backup',
  preUpdateChecks: ['Verify system health', 'Create backup'],
  postUpdateChecks: ['Run health check', 'Verify functionality']
}

await maintenanceProcedures.performSystemUpdate(update)
```

## Troubleshooting

### Common Issues

#### Health Check Failures
1. Check database connectivity
2. Verify permission cache table exists
3. Check memory usage and system resources
4. Review recent security events

#### Backup Failures
1. Verify backup directory permissions
2. Check database connection
3. Ensure sufficient disk space
4. Review backup logs in audit system

#### Maintenance Task Failures
1. Check database connectivity
2. Verify required tables exist
3. Review task-specific error messages
4. Check system resources

### Logs and Debugging
- All operations logged to audit system
- Security events for critical issues
- Console logging for real-time monitoring
- Dashboard provides visual status

## Performance Considerations

### Resource Usage
- Health monitoring: Minimal CPU/memory impact
- Backup operations: I/O intensive, schedule during low usage
- Maintenance tasks: Database intensive, run during maintenance windows

### Optimization
- Cache warming reduces permission check latency
- Database statistics updates improve query performance
- Regular cleanup prevents table bloat

## Security Considerations

### Access Control
- All endpoints require admin permissions
- System operations logged in audit trail
- Security events for suspicious activities

### Data Protection
- Backups include sensitive user data
- Secure backup storage recommended
- Backup verification prevents corruption

### Monitoring
- Real-time security event detection
- Automated alerting for critical issues
- Comprehensive audit logging

## Integration with Existing Systems

### RBAC System Integration
- Uses existing permission checking
- Leverages audit logging system
- Integrates with security monitoring

### Database Integration
- Works with existing Prisma schema
- Uses existing database connections
- Respects existing data relationships

### Frontend Integration
- Admin dashboard component
- API endpoints for programmatic access
- Real-time status updates