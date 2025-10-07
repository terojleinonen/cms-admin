# Security Monitoring - Circular Dependencies and Infinite Loop Fixes

## Issues Identified and Fixed

### 1. Infinite Loop in Security Event Analysis

**Problem**: The `logSecurityEvent()` method called `performRealTimeAnalysis()`, which in turn called `analyzeUserBehavior()`, `analyzeIPBehavior()`, and `checkCoordinatedAttacks()`. These analysis methods would call `logSecurityEvent()` again when they detected patterns, creating an infinite recursive loop.

**Call Chain**:
```
logSecurityEvent() 
  → performRealTimeAnalysis()
    → analyzeUserBehavior()
      → logSecurityEvent() // INFINITE LOOP!
```

**Fix**: Added a `skipAnalysis` parameter to `logSecurityEvent()` method. When analysis methods create derived security events, they pass `skipAnalysis: true` to prevent recursive analysis.

**Code Changes**:
- Modified `logSecurityEvent(eventData, skipAnalysis = false)` signature
- Added condition: `if (!skipAnalysis) { await this.performRealTimeAnalysis(eventData); }`
- Updated all analysis method calls to use `skipAnalysis: true`

### 2. Recursive Suspicious Activity Checks in Audit Service

**Problem**: The `AuditService.log()` method called `checkSuspiciousActivity()`, which could call `logSecurity()`, which would call `log()` again, creating another infinite loop.

**Call Chain**:
```
AuditService.log()
  → checkSuspiciousActivity()
    → logSecurity()
      → log() // INFINITE LOOP!
```

**Fix**: Added a `checkingSuspiciousActivity` Set to track ongoing checks and prevent recursive calls.

**Code Changes**:
- Added `private checkingSuspiciousActivity: Set<string> = new Set()`
- Wrapped `checkSuspiciousActivity()` calls with guard logic using unique keys
- Ensured cleanup in finally block to prevent memory leaks

### 3. Memory Leaks in Security Monitoring Service

**Problem**: The `blockedIPs` Set and `rateLimitCache` Map could grow indefinitely without cleanup, causing memory leaks.

**Fix**: Added periodic cleanup mechanism and proper resource management.

**Code Changes**:
- Added `cleanupInterval` timer for periodic cleanup
- Implemented `cleanupExpiredData()` method to remove expired entries
- Added `destroy()` method for proper resource cleanup
- Added cleanup of rate limit cache entries when they expire

### 4. Rate Limiting for Security Event Logging

**Problem**: Excessive security event logging could cause performance issues and potentially amplify infinite loop problems.

**Fix**: Implemented rate limiting to prevent excessive logging.

**Code Changes**:
- Added `isRateLimited()` method with configurable limits (10 events per minute per key)
- Integrated rate limiting check in `logSecurityEvent()` method
- Used composite keys based on event type and user/IP for granular control

## Dependency Analysis

### Safe Dependencies (No Circular Issues)
```
SecurityMonitoringService → SecurityEventDB ✓
SecurityMonitoringService → AuditService ✓
SecurityEventDB → PrismaClient ✓
AuditService → PrismaClient ✓
```

### Potential Issues Prevented
```
SecurityMonitoringService ↔ AuditService (prevented by skipAnalysis flag)
AuditService ↔ AuditService (prevented by checkingSuspiciousActivity guard)
```

## Testing

Added comprehensive tests to verify:
- Infinite loop prevention with `skipAnalysis` parameter
- Rate limiting functionality
- Memory cleanup mechanisms
- Error handling for circular dependency scenarios

## Best Practices Implemented

1. **Guard Flags**: Use boolean flags to prevent recursive calls
2. **Resource Cleanup**: Implement proper cleanup mechanisms for long-running services
3. **Rate Limiting**: Prevent excessive operations that could amplify problems
4. **Unique Keys**: Use composite keys for tracking to avoid false positives
5. **Error Boundaries**: Ensure cleanup happens even when errors occur (finally blocks)

## Monitoring and Alerting

The security monitoring system now safely handles:
- Brute force attack detection
- Multiple IP access patterns
- Coordinated attack detection
- Suspicious user behavior
- Rate limiting violations

All without risk of infinite loops or memory leaks.