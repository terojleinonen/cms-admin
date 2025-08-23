# CMS Deployment Checklist

## Pre-Deployment Checklist

### Environment Setup
- [ ] Node.js >= 18.0.0 installed
- [ ] Docker and Docker Compose installed
- [ ] PostgreSQL accessible (local or containerized)
- [ ] SSL certificates obtained (Let's Encrypt or custom)
- [ ] Domain name configured and DNS pointing to server

### Configuration Files
- [ ] `.env.production` created from `.env.production.example`
- [ ] Database credentials configured securely
- [ ] `NEXTAUTH_SECRET` generated (minimum 32 characters)
- [ ] `NEXTAUTH_URL` set to production domain
- [ ] SMTP settings configured for email notifications
- [ ] SSL certificate paths configured in nginx

### Security Configuration
- [ ] Strong database passwords set
- [ ] Firewall configured (ports 80, 443, 22 only)
- [ ] SSH key-based authentication enabled
- [ ] Regular security updates scheduled
- [ ] Backup encryption keys generated

## Deployment Steps

### 1. Server Preparation
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create application directory
sudo mkdir -p /opt/kin-workspace-cms
sudo chown $USER:$USER /opt/kin-workspace-cms
```

### 2. Application Deployment
```bash
# Clone repository
cd /opt/kin-workspace-cms
git clone <repository-url> .

# Set up environment
cp .env.production.example .env.production
# Edit .env.production with your settings

# Make deployment script executable
chmod +x scripts/deploy.sh

# Deploy application
./scripts/deploy.sh deploy
```

### 3. SSL Certificate Setup
```bash
# Option 1: Let's Encrypt (Recommended)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

# Option 2: Custom certificates
mkdir -p nginx/ssl
cp your-cert.pem nginx/ssl/cert.pem
cp your-key.pem nginx/ssl/key.pem
chmod 600 nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem
```

### 4. Database Setup
```bash
# Database will be automatically created by Docker
# Run initial migrations and seeding
docker-compose -f docker-compose.production.yml exec cms-app npx prisma migrate deploy
docker-compose -f docker-compose.production.yml exec cms-app npx prisma db seed
```

## Post-Deployment Verification

### Health Checks
- [ ] Application health check: `curl https://your-domain.com/api/health`
- [ ] Database connectivity verified
- [ ] File upload functionality tested
- [ ] SSL certificate valid and properly configured
- [ ] All services running: `./scripts/deploy.sh status`

### Functional Testing
- [ ] Admin login working
- [ ] Product creation and editing
- [ ] Media upload and processing
- [ ] Category management
- [ ] User management (admin only)
- [ ] Search functionality
- [ ] API endpoints responding correctly

### Performance Testing
- [ ] Page load times under 3 seconds
- [ ] Database queries optimized
- [ ] Image optimization working
- [ ] Caching functioning (if Redis enabled)
- [ ] Memory usage within acceptable limits

### Security Testing
- [ ] HTTPS redirect working
- [ ] Security headers present
- [ ] File upload restrictions enforced
- [ ] Authentication required for admin areas
- [ ] Rate limiting active on API endpoints
- [ ] No sensitive data in logs

## Monitoring Setup

### Log Monitoring
- [ ] Application logs accessible: `./scripts/deploy.sh logs`
- [ ] Error logs being captured
- [ ] Performance metrics being recorded
- [ ] Security events being logged

### Alerting Configuration
- [ ] Email notifications configured
- [ ] Health check monitoring set up
- [ ] Disk space monitoring enabled
- [ ] Database performance monitoring active

### Backup Verification
- [ ] Automated backups running: `./scripts/deploy.sh backup`
- [ ] Backup restoration tested
- [ ] Backup retention policy configured
- [ ] Off-site backup storage configured (recommended)

## Maintenance Tasks

### Daily
- [ ] Check application health: `curl https://your-domain.com/api/health`
- [ ] Review error logs for issues
- [ ] Monitor disk space usage
- [ ] Verify backup completion

### Weekly
- [ ] Review security logs for suspicious activity
- [ ] Check performance metrics and trends
- [ ] Update system packages: `sudo apt update && sudo apt upgrade`
- [ ] Test backup restoration process

### Monthly
- [ ] Review and rotate log files
- [ ] Update SSL certificates if needed
- [ ] Performance optimization review
- [ ] Security audit and vulnerability scan
- [ ] Database maintenance and optimization

## Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check container status
docker-compose -f docker-compose.production.yml ps

# Check logs
docker-compose -f docker-compose.production.yml logs cms-app

# Restart services
./scripts/deploy.sh restart
```

#### Database Connection Issues
```bash
# Check database container
docker-compose -f docker-compose.production.yml logs postgres

# Test database connection
docker-compose -f docker-compose.production.yml exec postgres psql -U cms_user -d kin_workspace_cms -c "SELECT 1;"
```

#### SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Test SSL configuration
openssl s_client -connect your-domain.com:443

# Renew Let's Encrypt certificate
sudo certbot renew --dry-run
```

#### Performance Issues
```bash
# Check resource usage
docker stats

# Monitor database performance
docker-compose -f docker-compose.production.yml exec postgres psql -U cms_user -d kin_workspace_cms -c "
  SELECT query, mean_time, calls 
  FROM pg_stat_statements 
  ORDER BY mean_time DESC 
  LIMIT 10;
"
```

### Emergency Procedures

#### Service Recovery
```bash
# Stop all services
./scripts/deploy.sh stop

# Start services
./scripts/deploy.sh deploy

# If deployment fails, rollback
git checkout previous-stable-tag
./scripts/deploy.sh deploy
```

#### Database Recovery
```bash
# Restore from backup
docker-compose -f docker-compose.production.yml exec postgres psql -U cms_user -d kin_workspace_cms < backup_file.sql

# If corruption detected, restore from clean backup
./scripts/deploy.sh stop
docker volume rm kin-workspace-cms_postgres_data
./scripts/deploy.sh deploy
# Restore from backup
```

## Support Contacts

### Technical Support
- **Documentation**: `/docs` directory
- **Health Check**: `https://your-domain.com/api/health`
- **Monitoring**: `https://your-domain.com/api/admin/monitoring` (admin only)

### Emergency Contacts
- System Administrator: [contact-info]
- Database Administrator: [contact-info]
- Security Team: [contact-info]

## Compliance and Auditing

### Security Compliance
- [ ] Regular security updates applied
- [ ] Access logs maintained
- [ ] User activity audited
- [ ] Data encryption verified
- [ ] Backup security confirmed

### Performance Auditing
- [ ] Response time metrics tracked
- [ ] Database performance monitored
- [ ] Resource utilization logged
- [ ] Capacity planning updated

### Data Protection
- [ ] Personal data handling compliant
- [ ] Data retention policies enforced
- [ ] Backup encryption verified
- [ ] Access controls audited

---

**Deployment Date**: ___________  
**Deployed By**: ___________  
**Version**: ___________  
**Next Review Date**: ___________