# RBAC System Troubleshooting and FAQ

## Table of Contents

1. [Common Issues](#common-issues)
2. [Troubleshooting Guide](#troubleshooting-guide)
3. [Frequently Asked Questions](#frequently-asked-questions)
4. [Error Messages](#error-messages)
5. [Performance Issues](#performance-issues)
6. [Security Concerns](#security-concerns)
7. [Emergency Procedures](#emergency-procedures)

## Common Issues

### Authentication Problems

**Issue: Users cannot log in**

*Symptoms:*
- Login form shows "Invalid credentials" error
- Users report password not working
- Multiple failed login attempts

*Common causes:*
- Incorrect username/password
- Account locked due to failed attempts
- Account deactivated by administrator
- Session timeout issues
- Database connectivity problems

*Quick fixes:*
1. Verify credentials are correct
2. Check account status in admin panel
3. Reset password if needed
4. Clear browser cache and cookies
5. Check system status dashboard

### Permission Access Issues

**Issue: Users see "Access Denied" errors**

*Symptoms:*
- 403 Forbidden errors on pages
- Missing navigation menu items
- Buttons or features not visible
- API requests returning permission errors

*Common causes:*
- Incorrect role assignment
- Recent role changes not applied
- Permission cache issues
- System configuration errors
- Database permission data corruption

*Quick fixes:*
1. Verify user's current role
2. Check permission matrix for role
3. Clear permission cache
4. Refresh browser page
5. Test with different user account

### Interface Display Problems

**Issue: UI elements missing or incorrect**

*Symptoms:*
- Navigation items not showing
- Buttons disabled unexpectedly
- Content areas empty
- Search results filtered incorrectly

*Common causes:*
- JavaScript errors in browser
- Permission hook failures
- Component rendering issues
- Cache inconsistencies
- Network connectivity problems

*Quick fixes:*
1. Check browser console for errors
2. Refresh page or clear cache
3. Try different browser
4. Check network connectivity
5. Verify user permissions

## Troubleshooting Guide

### Step-by-Step Diagnostic Process

#### Step 1: Identify the Problem Scope

**Questions to ask:**
- Is this affecting one user or multiple users?
- Is this a new problem or ongoing issue?
- What specific features or pages are affected?
- When did the problem first occur?
- Are there any error messages?

**Information to gather:**
- User ID and role
- Browser and version
- Operating system
- Time of occurrence
- Steps to reproduce
- Screenshots or error messages

#### Step 2: Check System Status

**System health checks:**
1. **Database connectivity:**
   ```bash
   # Check database connection
   npm run db:status
   ```

2. **Permission service status:**
   ```bash
   # Check permission service health
   curl http://localhost:3001/api/health/permissions
   ```

3. **Cache service status:**
   ```bash
   # Check Redis cache if using distributed cache
   redis-cli ping
   ```

4. **Application logs:**
   ```bash
   # Check application logs for errors
   tail -f logs/application.log
   ```

#### Step 3: User-Specific Diagnostics

**Check user account:**
1. Navigate to Admin > Users
2. Search for the affected user
3. Verify account status (active/inactive)
4. Check role assignment and permissions
5. Review recent activity logs

**Test user permissions:**
1. Use "Test as User" feature in admin panel
2. Navigate to problematic pages
3. Attempt the failing actions
4. Compare with expected behavior

#### Step 4: System-Wide Diagnostics

**Permission system checks:**
1. **Permission cache status:**
   - Check cache hit/miss ratios
   - Verify cache TTL settings
   - Clear cache if needed

2. **Database integrity:**
   - Run permission data validation
   - Check for orphaned records
   - Verify foreign key constraints

3. **Configuration validation:**
   - Review role definitions
   - Check permission matrix
   - Validate route mappings

### Advanced Troubleshooting

#### Database Issues

**Checking permission data integrity:**

```sql
-- Check for users without roles
SELECT u.id, u.email 
FROM users u 
LEFT JOIN user_roles ur ON u.id = ur.user_id 
WHERE ur.user_id IS NULL;

-- Check for orphaned permissions
SELECT p.* 
FROM permissions p 
LEFT JOIN roles r ON p.role_id = r.id 
WHERE r.id IS NULL;

-- Verify permission cache consistency
SELECT COUNT(*) as cached_permissions 
FROM permission_cache 
WHERE expires_at > NOW();
```

**Fixing common database issues:**

```sql
-- Clean up expired cache entries
DELETE FROM permission_cache WHERE expires_at < NOW();

-- Reset user permissions cache
DELETE FROM permission_cache WHERE user_id = 'USER_ID_HERE';

-- Rebuild permission cache for all users
CALL rebuild_permission_cache();
```

#### Cache Issues

**Redis cache diagnostics:**

```bash
# Check Redis memory usage
redis-cli info memory

# Check cache keys
redis-cli keys "permission:*"

# Clear specific user cache
redis-cli del "permission:user:USER_ID"

# Clear all permission cache
redis-cli flushdb
```

**In-memory cache diagnostics:**

```javascript
// Check cache statistics (in application)
console.log(permissionCache.getStats());

// Clear specific user cache
permissionCache.del(`user:${userId}`);

// Clear all cache
permissionCache.flushAll();
```

#### Network and Performance Issues

**API endpoint testing:**

```bash
# Test authentication endpoint
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test permission check endpoint
curl -X GET http://localhost:3001/api/permissions/check \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json"

# Test with specific permission
curl -X POST http://localhost:3001/api/permissions/validate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"resource":"products","action":"create"}'
```

**Performance monitoring:**

```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/api/permissions/check

# Monitor database query performance
EXPLAIN ANALYZE SELECT * FROM permissions WHERE user_id = 'USER_ID';
```

## Frequently Asked Questions

### General Questions

**Q: How often should I clear the permission cache?**
A: The cache automatically expires based on TTL settings (default 15 minutes). Manual clearing is only needed when:
- Making immediate permission changes
- Troubleshooting permission issues
- After system updates or configuration changes

**Q: Can users have multiple roles?**
A: Currently, the system supports one primary role per user. However, custom roles can be created with combined permissions from multiple standard roles.

**Q: How do I know if a permission change took effect?**
A: Permission changes take effect immediately. You can verify by:
- Checking the user's interface for new/removed features
- Testing API endpoints with the user's credentials
- Reviewing the audit logs for the change event

**Q: What happens when a user's role is changed?**
A: When a role is changed:
- New permissions take effect immediately
- User's permission cache is cleared automatically
- User receives a notification about the role change
- The change is logged in the audit trail
- User doesn't need to log out and back in

### Technical Questions

**Q: How does the permission cache work?**
A: The permission cache stores the results of permission checks to improve performance:
- Cache entries have a TTL (time-to-live) of 15 minutes by default
- Cache is automatically invalidated when roles or permissions change
- Uses both in-memory and Redis caching for scalability
- Cache keys are structured as `permission:user:{userId}:{resource}:{action}`

**Q: Can I customize the permission model?**
A: Yes, the system supports customization:
- Create custom roles with specific permission combinations
- Define new resources and actions in the configuration
- Modify scope definitions (own, team, all)
- Add custom permission validation logic

**Q: How are permissions checked in the API?**
A: API permission checking follows this flow:
1. Middleware validates authentication token
2. Permission service checks user's role and permissions
3. Cache is consulted first, then database if needed
4. Result is cached for future requests
5. Access is granted or denied based on the result

**Q: What's the difference between authentication and authorization?**
A: 
- **Authentication** verifies who the user is (login credentials)
- **Authorization** determines what the user can do (permissions and roles)
- Both are required for secure access to protected resources

### Security Questions

**Q: How secure is the permission system?**
A: The system implements multiple security layers:
- Server-side permission validation (never trust client-side)
- Encrypted authentication tokens
- Comprehensive audit logging
- Rate limiting on permission checks
- Input validation and sanitization
- Protection against common attacks (XSS, CSRF, SQL injection)

**Q: What should I do if I suspect a security breach?**
A: Follow the emergency procedures:
1. Immediately lock affected user accounts
2. Review audit logs for suspicious activity
3. Change system passwords and tokens
4. Enable additional monitoring
5. Contact security team or external support
6. Document all actions taken

**Q: How long are audit logs kept?**
A: Audit logs are retained according to the configured retention policy:
- Default: 2 years for compliance requirements
- Can be configured based on organizational needs
- Logs are automatically archived after retention period
- Critical security events may be kept longer

### Administrative Questions

**Q: How do I create a new role?**
A: To create a custom role:
1. Go to Admin > Roles > Create Custom Role
2. Define role name and description
3. Select permissions from the matrix
4. Test the role with a test user account
5. Document the role purpose and permissions
6. Deploy to production users

**Q: Can I bulk update user roles?**
A: Yes, bulk operations are supported:
1. Go to Admin > Users
2. Select multiple users using checkboxes
3. Choose "Bulk Actions" > "Change Role"
4. Select new role and provide reason
5. Confirm the operation
6. All changes are logged in audit trail

**Q: How do I monitor system performance?**
A: Use the built-in monitoring tools:
- Admin > Performance > Permission System
- Monitor cache hit/miss ratios
- Track permission check latency
- Review database query performance
- Set up alerts for performance thresholds

## Error Messages

### Common Error Messages and Solutions

**Error: "Permission denied for this resource"**
- **Cause:** User doesn't have required permission
- **Solution:** Check user's role and permission matrix
- **Prevention:** Verify role assignments match job requirements

**Error: "Authentication token expired"**
- **Cause:** User session has timed out
- **Solution:** User needs to log in again
- **Prevention:** Adjust session timeout settings if needed

**Error: "Invalid role configuration"**
- **Cause:** Role has conflicting or invalid permissions
- **Solution:** Review and fix role permission matrix
- **Prevention:** Test roles thoroughly before deployment

**Error: "Permission cache unavailable"**
- **Cause:** Cache service is down or unreachable
- **Solution:** Restart cache service or fall back to database
- **Prevention:** Monitor cache service health

**Error: "Database connection failed"**
- **Cause:** Database is unreachable or overloaded
- **Solution:** Check database status and connectivity
- **Prevention:** Monitor database health and performance

### API Error Responses

**401 Unauthorized**
```json
{
  "error": {
    "code": "NOT_AUTHENTICATED",
    "message": "Authentication required",
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "success": false
}
```

**403 Forbidden**
```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Insufficient permissions for this resource",
    "details": {
      "required": "products:create",
      "user_role": "viewer"
    },
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "success": false
}
```

**500 Internal Server Error**
```json
{
  "error": {
    "code": "PERMISSION_SERVICE_ERROR",
    "message": "Permission validation failed",
    "details": {
      "service": "permission_cache",
      "error": "Connection timeout"
    },
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "success": false
}
```

## Performance Issues

### Identifying Performance Problems

**Symptoms of performance issues:**
- Slow page loading times
- Delayed API responses
- High database CPU usage
- Memory consumption growth
- Cache miss rates increasing

**Monitoring tools:**
- Performance dashboard (Admin > Performance)
- Database query analyzer
- Cache statistics
- Application performance monitoring (APM)
- Server resource monitoring

### Performance Optimization

**Cache optimization:**
```javascript
// Increase cache TTL for stable permissions
const cacheConfig = {
  ttl: 30 * 60, // 30 minutes for stable roles
  maxSize: 10000, // Maximum cache entries
  checkPeriod: 60 // Check for expired entries every minute
};

// Warm cache for frequently accessed permissions
await warmPermissionCache(['products:read', 'orders:read']);
```

**Database optimization:**
```sql
-- Add indexes for common permission queries
CREATE INDEX idx_user_permissions ON user_roles(user_id, role_id);
CREATE INDEX idx_permission_cache ON permission_cache(user_id, resource, action);

-- Optimize permission lookup query
EXPLAIN ANALYZE 
SELECT p.* FROM permissions p
JOIN user_roles ur ON p.role_id = ur.role_id
WHERE ur.user_id = $1 AND p.resource = $2 AND p.action = $3;
```

**Application optimization:**
- Use permission hooks efficiently
- Batch permission checks when possible
- Implement lazy loading for permission-gated components
- Optimize re-rendering with React.memo and useMemo

## Security Concerns

### Security Best Practices

**Access control:**
- Always validate permissions server-side
- Never trust client-side permission checks
- Use principle of least privilege
- Regularly audit user permissions
- Implement defense in depth

**Monitoring and alerting:**
- Monitor failed authentication attempts
- Alert on unusual permission patterns
- Track privilege escalation attempts
- Log all administrative actions
- Set up automated security scanning

**Data protection:**
- Encrypt sensitive data at rest and in transit
- Implement proper session management
- Use secure password policies
- Enable two-factor authentication
- Regular security assessments

### Incident Response

**Security incident checklist:**

1. **Immediate response (0-1 hour):**
   - [ ] Identify and contain the incident
   - [ ] Lock affected user accounts
   - [ ] Preserve evidence and logs
   - [ ] Notify security team
   - [ ] Enable additional monitoring

2. **Investigation (1-24 hours):**
   - [ ] Analyze audit logs and evidence
   - [ ] Determine scope and impact
   - [ ] Identify root cause
   - [ ] Document findings
   - [ ] Coordinate with stakeholders

3. **Recovery (1-7 days):**
   - [ ] Implement fixes and patches
   - [ ] Restore affected systems
   - [ ] Reset compromised credentials
   - [ ] Update security policies
   - [ ] Conduct post-incident review

4. **Follow-up (ongoing):**
   - [ ] Monitor for ongoing threats
   - [ ] Update security procedures
   - [ ] Train staff on new procedures
   - [ ] Implement additional safeguards
   - [ ] Schedule regular security reviews

## Emergency Procedures

### System Outage Response

**When the permission system is completely down:**

1. **Immediate actions:**
   - Switch to emergency access mode (if configured)
   - Notify all users of the outage
   - Activate incident response team
   - Begin system diagnostics

2. **Diagnostic steps:**
   - Check database connectivity
   - Verify application server status
   - Test cache service availability
   - Review system logs for errors

3. **Recovery procedures:**
   - Restart failed services
   - Restore from backups if needed
   - Verify system integrity
   - Test critical functions

4. **Post-recovery:**
   - Conduct thorough system testing
   - Review and update procedures
   - Document lessons learned
   - Implement preventive measures

### Data Breach Response

**If permission data is compromised:**

1. **Containment:**
   - Immediately lock all user accounts
   - Disable external access
   - Preserve forensic evidence
   - Notify legal and compliance teams

2. **Assessment:**
   - Determine what data was accessed
   - Identify affected users
   - Assess potential impact
   - Document timeline of events

3. **Notification:**
   - Notify affected users
   - Report to regulatory authorities
   - Coordinate with legal team
   - Prepare public communications

4. **Recovery:**
   - Reset all user credentials
   - Implement additional security measures
   - Monitor for ongoing threats
   - Provide user support and guidance

### Contact Information

**Emergency contacts:**
- **System Administrator:** [Phone] / [Email]
- **Security Team:** [Phone] / [Email]
- **Database Administrator:** [Phone] / [Email]
- **Development Team Lead:** [Phone] / [Email]

**Escalation procedures:**
- Level 1: System Administrator (0-2 hours)
- Level 2: Security Team (2-4 hours)
- Level 3: Management Team (4-8 hours)
- Level 4: External Support (8+ hours)

**External support:**
- **Hosting Provider:** [Contact Info]
- **Security Consultant:** [Contact Info]
- **Legal Counsel:** [Contact Info]
- **Insurance Provider:** [Contact Info]

---

*This document should be reviewed and updated monthly. Last updated: [Date]*