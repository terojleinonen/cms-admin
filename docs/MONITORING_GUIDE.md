# CMS Monitoring and Logging Guide

## Overview

The Kin Workspace CMS includes comprehensive monitoring and logging capabilities to help administrators track system performance, security events, and troubleshoot issues.

## Monitoring Components

### 1. Application Logging

The CMS uses structured JSON logging with multiple log levels:

- **DEBUG**: Detailed information for debugging
- **INFO**: General information about system operations
- **WARN**: Warning messages for potential issues
- **ERROR**: Error messages for failures and exceptions

#### Log Configuration

Set the log level using the `LOG_LEVEL` environment variable:

```bash
LOG_LEVEL=INFO  # DEBUG, INFO, WARN, ERROR
```

#### Log Format

All logs are structured JSON with the following format:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "INFO",
  "message": "Request completed",
  "context": {
    "method": "GET",
    "url": "/api/products",
    "status": 200,
    "duration": 150
  },
  "userId": "user-123",
  "requestId": "req-456"
}
```

### 2. Performance Monitoring

The system tracks various performance metrics:

#### Request Metrics
- Request duration
- Response status codes
- Endpoint performance
- Error rates

#### Database Metrics
- Query execution time
- Connection pool status
- Slow query detection

#### System Metrics
- Memory usage
- CPU utilization
- Uptime statistics

### 3. Security Monitoring

Security events are tracked and analyzed:

#### Tracked Events
- Login attempts (success/failure)
- Unauthorized access attempts
- Suspicious activity patterns
- API abuse detection

#### Automatic Threat Detection
- Multiple failed login attempts
- Unusual access patterns
- Rate limit violations

### 4. Health Checks

The system provides comprehensive health monitoring:

#### Health Check Endpoint
```
GET /api/health
```

Response format:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "responseTime": 45,
  "checks": [
    {
      "name": "database",
      "status": "healthy",
      "responseTime": 12,
      "message": "Database connection successful"
    },
    {
      "name": "redis",
      "status": "healthy",
      "responseTime": 3,
      "message": "Redis connection successful"
    },
    {
      "name": "filesystem",
      "status": "healthy",
      "message": "File system accessible"
    }
  ],
  "version": "1.0.0",
  "environment": "production"
}
```

## Monitoring Dashboard

### Admin Monitoring Endpoint

Administrators can access detailed monitoring data:

```
GET /api/admin/monitoring?since=2024-01-15T00:00:00Z
```

#### Available Data

1. **Performance Metrics**
   - Average request duration
   - Database query performance
   - Health check response times

2. **Security Events**
   - Login statistics
   - Security event counts
   - Recent security events

3. **System Statistics**
   - System uptime
   - Memory usage
   - Node.js version and platform

### Example Response

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "period": {
    "since": "2024-01-15T00:00:00.000Z",
    "duration": 37800000
  },
  "performance": {
    "requestDuration": {
      "average": 245.5,
      "metrics": [...]
    },
    "databaseQueries": {
      "average": 45.2,
      "metrics": [...]
    }
  },
  "security": {
    "loginAttempts": 156,
    "loginSuccesses": 142,
    "loginFailures": 14,
    "unauthorizedAccess": 3,
    "suspiciousActivity": 1,
    "recentEvents": [...]
  },
  "system": {
    "uptime": 86400,
    "memoryUsage": {
      "rss": 52428800,
      "heapTotal": 29360128,
      "heapUsed": 18874368,
      "external": 1089024
    },
    "nodeVersion": "v18.17.0",
    "platform": "linux",
    "environment": "production"
  }
}
```

## Log Analysis

### Viewing Logs

#### Development
```bash
# View application logs
npm run dev

# View specific log level
LOG_LEVEL=DEBUG npm run dev
```

#### Production (Docker)
```bash
# View all logs
docker-compose logs -f cms-app

# View logs with timestamps
docker-compose logs -f -t cms-app

# View last 100 lines
docker-compose logs --tail=100 cms-app

# Filter by log level
docker-compose logs cms-app | grep ERROR
```

### Log Aggregation

For production deployments, consider integrating with log aggregation services:

#### ELK Stack (Elasticsearch, Logstash, Kibana)
```yaml
# docker-compose.yml addition
elasticsearch:
  image: elasticsearch:8.5.0
  environment:
    - discovery.type=single-node
  ports:
    - "9200:9200"

logstash:
  image: logstash:8.5.0
  volumes:
    - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf

kibana:
  image: kibana:8.5.0
  ports:
    - "5601:5601"
  depends_on:
    - elasticsearch
```

#### Fluentd Configuration
```yaml
# fluent.conf
<source>
  @type tail
  path /var/log/cms/*.log
  pos_file /var/log/fluentd/cms.log.pos
  tag cms.logs
  format json
</source>

<match cms.logs>
  @type elasticsearch
  host elasticsearch
  port 9200
  index_name cms-logs
</match>
```

## Alerting

### Setting Up Alerts

#### Prometheus + Grafana
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'cms-app'
    static_configs:
      - targets: ['cms-app:3001']
    metrics_path: '/api/metrics'
```

#### Alert Rules
```yaml
# alert-rules.yml
groups:
  - name: cms-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"

      - alert: DatabaseConnectionFailure
        expr: up{job="cms-database"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection failed"

      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / 1024 / 1024 > 512
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
```

### Email Notifications

Configure SMTP settings for email alerts:

```bash
# Environment variables
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=alerts@your-domain.com
SMTP_PASS=your-password
ALERT_EMAIL=admin@your-domain.com
```

## Performance Optimization

### Monitoring Performance Issues

#### Slow Query Detection
```typescript
// Automatic slow query logging
if (queryDuration > 1000) {
  logger.warn('Slow database query detected', {
    query: queryName,
    duration: queryDuration,
    threshold: 1000
  })
}
```

#### Memory Leak Detection
```typescript
// Monitor memory usage trends
setInterval(() => {
  const memUsage = process.memoryUsage()
  performanceMonitor.recordMetric('memory_heap_used', memUsage.heapUsed, 'bytes')
  
  if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
    logger.warn('High memory usage detected', { memUsage })
  }
}, 60000) // Check every minute
```

### Performance Metrics Dashboard

Create custom dashboards to visualize:

1. **Request Performance**
   - Average response time
   - Request rate
   - Error rate by endpoint

2. **Database Performance**
   - Query execution time
   - Connection pool utilization
   - Slow query frequency

3. **System Resources**
   - CPU usage
   - Memory consumption
   - Disk I/O

## Security Monitoring

### Threat Detection

#### Brute Force Protection
```typescript
// Automatic IP blocking for repeated failures
const failedAttempts = securityMonitor.getSecurityEvents('login_failure', lastHour)
  .filter(event => event.ip === clientIP)

if (failedAttempts.length >= 5) {
  // Block IP or require additional verification
  logger.warn('Potential brute force attack detected', {
    ip: clientIP,
    attempts: failedAttempts.length
  })
}
```

#### Suspicious Activity Detection
- Multiple failed login attempts
- Access from unusual locations
- Rapid API requests
- Unauthorized endpoint access

### Security Audit Logs

All security events are logged with:
- Timestamp
- Event type
- User ID (if applicable)
- IP address
- User agent
- Additional context

### Compliance Reporting

Generate security reports for compliance:

```bash
# Generate security report
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://your-cms.com/api/admin/security/report?from=2024-01-01&to=2024-01-31"
```

## Troubleshooting

### Common Monitoring Issues

#### High Memory Usage
1. Check for memory leaks in application code
2. Monitor database connection pools
3. Review file upload handling
4. Check for circular references

#### Slow Performance
1. Analyze slow query logs
2. Check database indexes
3. Review API endpoint performance
4. Monitor external service dependencies

#### Security Alerts
1. Investigate failed login patterns
2. Check for unusual access patterns
3. Review API rate limiting effectiveness
4. Analyze security event logs

### Debugging Tools

#### Log Analysis Commands
```bash
# Find errors in logs
docker-compose logs cms-app | grep ERROR

# Count log levels
docker-compose logs cms-app | grep -c "INFO\|WARN\|ERROR"

# Find slow requests
docker-compose logs cms-app | grep "duration.*[5-9][0-9][0-9][0-9]"

# Security events
docker-compose logs cms-app | grep "security"
```

#### Performance Analysis
```bash
# Monitor resource usage
docker stats cms-app

# Check database performance
docker-compose exec postgres psql -U cms_user -d kin_workspace_cms -c "
  SELECT query, mean_time, calls 
  FROM pg_stat_statements 
  ORDER BY mean_time DESC 
  LIMIT 10;
"
```

## Best Practices

### Monitoring Strategy
1. **Proactive Monitoring**: Set up alerts before issues occur
2. **Baseline Establishment**: Know your normal performance metrics
3. **Regular Reviews**: Analyze trends and patterns weekly
4. **Documentation**: Keep runbooks for common issues

### Log Management
1. **Structured Logging**: Use consistent JSON format
2. **Log Rotation**: Prevent disk space issues
3. **Retention Policies**: Balance storage costs with audit requirements
4. **Sensitive Data**: Never log passwords or personal information

### Security Monitoring
1. **Real-time Alerts**: Immediate notification of security events
2. **Pattern Analysis**: Look for trends in security data
3. **Regular Audits**: Review security logs monthly
4. **Incident Response**: Have procedures for security events

For additional monitoring setup and configuration, refer to the deployment guide and technical documentation.