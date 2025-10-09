# Production Deployment Guide

This guide provides comprehensive instructions for deploying the Kin Workspace CMS with production-ready RBAC system to a production environment.

## Prerequisites

### System Requirements
- Linux server (Ubuntu 20.04+ recommended)
- Docker 20.10+
- Docker Compose 2.0+
- Minimum 4GB RAM, 2 CPU cores
- 20GB+ available disk space
- SSL certificate for HTTPS

### Network Requirements
- Ports 80, 443 open for web traffic
- Port 22 for SSH access
- Internal network for database and cache communication

## Pre-Deployment Setup

### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install additional tools
sudo apt install -y curl wget openssl ufw fail2ban
```

### 2. Security Hardening

Run the security hardening script:

```bash
./scripts/security-hardening.sh
```

This script will:
- Generate secure secrets and passwords
- Configure SSL certificates
- Set up security headers
- Configure database security
- Set up security monitoring
- Configure log management
- Set up backup encryption

### 3. Environment Configuration

1. Copy the production environment template:
```bash
cp .env.production.example .env.production
```

2. Update the configuration with your actual values:
```bash
# Edit the production environment file
nano .env.production
```

3. Merge the generated secure secrets:
```bash
cat .env.production.secure >> .env.production
```

### 4. SSL Certificate Setup

For production, replace the self-signed certificates with proper SSL certificates:

```bash
# Using Let's Encrypt (recommended)
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates to nginx directory
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/private.key
sudo chown $USER:$USER nginx/ssl/*
```

## Deployment Process

### 1. Initial Deployment

Run the production deployment script:

```bash
./scripts/production-deploy.sh
```

This script will:
- Perform pre-deployment checks
- Create database backup
- Build and deploy the application
- Run health checks
- Apply security hardening
- Set up monitoring
- Clean up old resources

### 2. Database Migration

The deployment script automatically runs database migrations, but you can run them manually if needed:

```bash
docker-compose -f docker-compose.production.yml run --rm app npx prisma migrate deploy
```

### 3. Initial Data Setup

Create the initial admin user:

```bash
docker-compose -f docker-compose.production.yml run --rm app npm run seed:admin
```

## Post-Deployment Configuration

### 1. Firewall Configuration

Configure UFW firewall:

```bash
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw --force enable
```

### 2. Monitoring Setup

Access monitoring dashboards:
- Grafana: https://your-domain.com:3001
- Prometheus: https://your-domain.com:9090

Default Grafana credentials:
- Username: admin
- Password: (set in GRAFANA_PASSWORD environment variable)

### 3. Log Management

Set up log rotation:

```bash
sudo cp /etc/logrotate.d/kin-workspace /etc/logrotate.d/
sudo logrotate -d /etc/logrotate.d/kin-workspace
```

Set up automated log cleanup:

```bash
# Add to crontab
echo "0 2 * * * /opt/kin-workspace/scripts/audit-log-cleanup.sh" | sudo crontab -
```

### 4. Backup Configuration

Set up automated backups:

```bash
# Add encrypted backup to crontab
echo "0 3 * * * /opt/kin-workspace/scripts/encrypted-backup.sh" | crontab -
```

Configure AWS S3 for backup storage (optional):

```bash
# Install AWS CLI
sudo apt install awscli
aws configure
```

## Security Checklist

### Application Security
- [ ] All secrets are properly generated and secured
- [ ] SSL certificates are properly configured
- [ ] Security headers are enabled
- [ ] CSRF protection is active
- [ ] Input validation is implemented
- [ ] Rate limiting is configured

### Database Security
- [ ] Database passwords are strong and unique
- [ ] Row-level security is enabled
- [ ] Audit logging is configured
- [ ] Database backups are encrypted
- [ ] Connection limits are set

### Infrastructure Security
- [ ] Firewall is properly configured
- [ ] SSH access is secured (key-based authentication)
- [ ] Fail2ban is configured for intrusion prevention
- [ ] System packages are up to date
- [ ] Docker daemon is secured

### Monitoring and Alerting
- [ ] Prometheus is collecting metrics
- [ ] Grafana dashboards are configured
- [ ] Alert rules are set up
- [ ] Log aggregation is working
- [ ] Security monitoring is active

## Maintenance Procedures

### Regular Updates

1. **Application Updates:**
```bash
# Pull latest code
git pull origin main

# Run deployment script
./scripts/production-deploy.sh
```

2. **System Updates:**
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d
```

### Backup and Recovery

1. **Manual Backup:**
```bash
./scripts/encrypted-backup.sh
```

2. **Restore from Backup:**
```bash
# Stop services
docker-compose -f docker-compose.production.yml down

# Restore database
openssl enc -aes-256-cbc -d -k "$BACKUP_ENCRYPTION_KEY" -in backup.sql.enc | \
docker-compose -f docker-compose.production.yml exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

# Restart services
docker-compose -f docker-compose.production.yml up -d
```

### Performance Monitoring

Monitor key metrics:
- Response times < 2 seconds (95th percentile)
- Permission check latency < 100ms
- Cache hit rate > 80%
- Error rate < 1%
- CPU usage < 80%
- Memory usage < 90%

### Security Monitoring

Monitor security events:
- Failed login attempts
- Permission denials
- Unauthorized access attempts
- Suspicious user activity
- System intrusion attempts

## Troubleshooting

### Common Issues

1. **Application Won't Start:**
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs app

# Check environment variables
docker-compose -f docker-compose.production.yml config
```

2. **Database Connection Issues:**
```bash
# Check database status
docker-compose -f docker-compose.production.yml ps db

# Test database connection
docker-compose -f docker-compose.production.yml exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;"
```

3. **SSL Certificate Issues:**
```bash
# Check certificate validity
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Test SSL configuration
curl -I https://your-domain.com
```

4. **Performance Issues:**
```bash
# Check resource usage
docker stats

# Check database performance
docker-compose -f docker-compose.production.yml exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT * FROM pg_stat_activity;"
```

### Emergency Procedures

1. **Rollback Deployment:**
```bash
# The deployment script automatically handles rollback on failure
# Manual rollback:
docker-compose -f docker-compose.production.yml down
# Restore from backup (see backup section)
```

2. **Security Incident Response:**
```bash
# Block suspicious IP
sudo ufw deny from <suspicious-ip>

# Check security logs
docker-compose -f docker-compose.production.yml logs app | grep -i "security\|unauthorized\|failed"

# Review audit logs in database
docker-compose -f docker-compose.production.yml exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT * FROM \"AuditLog\" WHERE \"timestamp\" > NOW() - INTERVAL '1 hour';"
```

## Support and Documentation

- Application logs: `/var/log/kin-workspace/`
- Database logs: Available via Docker logs
- Security documentation: `docs/SECURITY_ARCHITECTURE.md`
- API documentation: `docs/API_DOCUMENTATION.md`
- Monitoring guide: `docs/MONITORING_GUIDE.md`

For additional support, refer to the troubleshooting guides in the `docs/` directory.