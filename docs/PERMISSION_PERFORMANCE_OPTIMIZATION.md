# Permission System Performance Optimization

This document describes the performance optimization tools built for the RBAC permission system.

## Overview

The performance optimization system consists of three main components:

1. **Permission Cache Warmer** - Pre-populates permission cache for improved response times
2. **Query Optimizer** - Optimizes database queries and manages query caching
3. **Performance Profiler** - Monitors and analyzes system performance

## Components

### Permission Cache Warmer

The cache warmer pre-populates permission cache to reduce database queries during runtime.

#### Features
- Warm cache for all users or priority users only
- Automatic cache warming on user login and role changes
- Scheduled periodic cache warming
- Batch processing for efficient warming

#### Usage

```typescript
import { createCacheWarmer } from './app/lib/permission-cache-warmer'

const warmer = createCacheWarmer()

// Warm cache for all users
const stats = await warmer.warmAllUsers()

// Warm cache for priority users (admins + configured users)
const priorityStats = await warmer.warmPriorityUsers()

// Warm cache for specific user
await warmer.warmUserCache('user-id', UserRole.ADMIN)

// Schedule periodic warming (every 6 hours)
warmer.schedulePeriodicWarming(6)
```

### Query Optimizer

Optimizes database queries for permission checks and provides query caching.

#### Features
- In-memory query result caching
- Batch permission lookups
- Query performance tracking
- Automatic cache cleanup

#### Usage

```typescript
import { permissionQueryOptimizer } from './app/lib/permission-query-optimizer'

// Get user permissions (with caching)
const user = await permissionQueryOptimizer.getUserPermissions('user-id')

// Batch lookup for multiple users
const users = await permissionQueryOptimizer.batchUserPermissions(['user1', 'user2'])

// Get cached permission result
const cached = await permissionQueryOptimizer.getCachedPermission('user-id', 'products', 'read')

// Clean up expired cache entries
const cleaned = await permissionQueryOptimizer.cleanupExpiredCache()

// Get performance statistics
const stats = permissionQueryOptimizer.getQueryStats()
```

### Performance Profiler

Monitors and analyzes permission system performance in real-time.

#### Features
- Operation duration tracking
- Cache hit/miss rate monitoring
- Performance trend analysis
- Anomaly detection
- System metrics collection

#### Usage

```typescript
import { globalProfiler } from './app/lib/permission-performance-profiler'

// Profile an operation
const operationId = globalProfiler.startOperation('permission_check')
// ... perform operation
globalProfiler.endOperation(operationId, true)

// Record cache hit/miss
globalProfiler.recordCacheHit(true)

// Generate performance report
const report = globalProfiler.generateReport()

// Analyze performance trends
const trends = globalProfiler.analyzePerformanceTrends()

// Detect anomalies
const anomalies = globalProfiler.detectAnomalies()
```

## Integrated Performance Service

The `PermissionPerformanceService` integrates all optimization tools into a single service.

### Usage

```typescript
import { permissionPerformanceService } from './app/lib/permission-performance-service'

// Initialize the service
await permissionPerformanceService.initialize()

// Get performance status
const status = await permissionPerformanceService.getPerformanceStatus()

// Trigger optimization
const results = await permissionPerformanceService.optimizePerformance()

// Get metrics for dashboard
const metrics = permissionPerformanceService.getPerformanceMetrics()

// Optimize for user login
await permissionPerformanceService.optimizeForUserLogin('user-id', UserRole.ADMIN)
```

## CLI Tool

A command-line interface is provided for performance analysis and optimization.

### Installation

```bash
# Make the CLI executable
chmod +x scripts/permission-performance-cli.ts
```

### Commands

```bash
# Warm cache for all users
npx tsx scripts/permission-performance-cli.ts warm-cache --all

# Warm cache for priority users only
npx tsx scripts/permission-performance-cli.ts warm-cache --priority

# Warm cache for specific user
npx tsx scripts/permission-performance-cli.ts warm-cache --user user-id --role ADMIN

# Optimize queries
npx tsx scripts/permission-performance-cli.ts optimize-queries --cleanup --analyze

# Generate performance report
npx tsx scripts/permission-performance-cli.ts analyze --report --trends --anomalies

# Get system status
npx tsx scripts/permission-performance-cli.ts status

# Run comprehensive optimization
npx tsx scripts/permission-performance-cli.ts optimize

# Start real-time monitoring
npx tsx scripts/permission-performance-cli.ts monitor --interval 30

# Run performance benchmark
npx tsx scripts/permission-performance-cli.ts benchmark --operations 1000 --concurrency 10
```

## Admin Dashboard

A comprehensive dashboard is available in the admin interface for monitoring performance.

### Features
- Real-time performance metrics
- System health status
- Performance trends visualization
- Anomaly alerts
- One-click optimization

### Access

Navigate to `/admin/performance` in the admin interface to access the dashboard.

## Configuration

### Cache Warmer Configuration

```typescript
const config = {
  batchSize: 50,              // Users processed per batch
  maxConcurrency: 5,          // Maximum concurrent operations
  priorityUsers: ['user1'],   // Additional priority users
  commonResources: ['products', 'categories'], // Resources to warm
  commonActions: ['read', 'create', 'update']  // Actions to warm
}
```

### Query Optimizer Configuration

```typescript
const config = {
  enableQueryCache: true,     // Enable in-memory caching
  cacheTimeout: 300000,       // Cache timeout in milliseconds (5 minutes)
  batchSize: 100,            // Batch size for bulk operations
  enableIndexHints: true      // Enable database index hints
}
```

### Performance Service Configuration

```typescript
const config = {
  enableCacheWarming: true,
  enableQueryOptimization: true,
  enableProfiling: true,
  monitoringInterval: 60,     // Monitoring interval in seconds
  alertThresholds: {
    maxResponseTime: 200,     // Maximum acceptable response time (ms)
    minCacheHitRate: 80,      // Minimum acceptable cache hit rate (%)
    maxErrorRate: 5           // Maximum acceptable error rate (%)
  }
}
```

## Performance Metrics

### Key Metrics Tracked

- **Average Response Time** - Mean duration of permission checks
- **95th/99th Percentile** - Response time percentiles
- **Cache Hit Rate** - Percentage of cache hits vs misses
- **Operations per Second** - Throughput measurement
- **Error Rate** - Percentage of failed operations
- **Memory Usage** - System memory consumption
- **CPU Usage** - System CPU utilization

### Thresholds and Alerts

- Response time > 200ms triggers performance warning
- Cache hit rate < 80% triggers cache optimization
- Error rate > 5% triggers critical alert
- Memory usage > 500MB triggers memory warning

## Best Practices

### Cache Warming
- Warm cache during low-traffic periods
- Prioritize admin and frequent users
- Schedule regular cache warming (every 6 hours)
- Monitor cache hit rates and adjust warming frequency

### Query Optimization
- Clean up expired cache entries regularly
- Use batch operations for multiple users
- Monitor query performance and optimize slow queries
- Implement proper database indexes

### Performance Monitoring
- Enable continuous profiling in production
- Set up alerts for performance anomalies
- Review performance reports regularly
- Optimize based on usage patterns

### Production Deployment
- Initialize performance service on application startup
- Configure appropriate cache sizes for your user base
- Set up monitoring dashboards
- Implement automated optimization triggers

## Troubleshooting

### Common Issues

1. **Low Cache Hit Rate**
   - Increase cache warming frequency
   - Add more users to priority warming list
   - Check cache timeout settings

2. **High Response Times**
   - Enable query optimization
   - Add database indexes
   - Increase cache warming coverage

3. **Memory Issues**
   - Reduce cache timeout
   - Limit profiler history size
   - Monitor for memory leaks

4. **High Error Rates**
   - Check database connectivity
   - Review permission logic
   - Monitor system resources

### Debugging

Enable debug logging:

```typescript
// Set environment variable
process.env.PERMISSION_DEBUG = 'true'

// Or configure in code
const profiler = new PermissionPerformanceProfiler()
profiler.startContinuousMonitoring(30) // 30 second intervals
```

## API Endpoints

The following API endpoints are available for performance monitoring:

- `GET /api/admin/performance/metrics` - Get performance metrics
- `GET /api/admin/performance/status` - Get system status
- `POST /api/admin/performance/optimize` - Trigger optimization

## Testing

Run the performance optimization tests:

```bash
npm test -- __tests__/lib/permission-performance-tools.test.ts
```

The test suite covers:
- Cache warming functionality
- Query optimization
- Performance profiling
- Integration scenarios
- Error handling

## Monitoring and Alerting

### Metrics to Monitor

1. **Response Time Metrics**
   - Average response time
   - 95th and 99th percentiles
   - Slow operation count

2. **Cache Performance**
   - Hit rate percentage
   - Cache size and memory usage
   - Eviction rate

3. **System Health**
   - Error rates
   - Database query performance
   - Memory and CPU usage

### Alert Conditions

Set up alerts for:
- Response time > 200ms (95th percentile)
- Cache hit rate < 80%
- Error rate > 5%
- Memory usage > 500MB
- Anomaly detection triggers

This comprehensive performance optimization system ensures the RBAC permission system scales efficiently and maintains optimal performance under load.