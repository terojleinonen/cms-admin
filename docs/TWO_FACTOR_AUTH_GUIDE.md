# Two-Factor Authentication (2FA) System

This document describes the implementation and usage of the Two-Factor Authentication system in the Kin Workspace CMS.

## Overview

The 2FA system provides an additional layer of security using Time-based One-Time Passwords (TOTP) and backup codes. It is required for admin users and optional for other roles.

## Features

- **TOTP Support**: Compatible with Google Authenticator, Authy, and other TOTP apps
- **QR Code Setup**: Easy setup with QR code scanning
- **Backup Codes**: 10 single-use backup codes for account recovery
- **Role-based Enforcement**: Automatic requirement for admin users
- **Audit Logging**: All 2FA events are logged for security monitoring

## API Endpoints

### Setup 2FA

#### GET `/api/users/[id]/two-factor/setup`
Generates 2FA setup data including QR code and backup codes.

**Response:**
```json
{
  "qrCodeUrl": "data:image/png;base64,...",
  "backupCodes": ["CODE1", "CODE2", ...],
  "secret": "SECRET_FOR_VERIFICATION",
  "isRequired": true
}
```

#### POST `/api/users/[id]/two-factor/setup`
Completes 2FA setup by verifying the first token.

**Request:**
```json
{
  "token": "123456",
  "secret": "SECRET_FROM_SETUP",
  "backupCodes": ["CODE1", "CODE2", ...]
}
```

### Verify 2FA

#### POST `/api/users/[id]/two-factor/verify`
Verifies 2FA token during login.

**Request:**
```json
{
  "token": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "isBackupCode": false,
  "message": "Login successful"
}
```

### Manage 2FA

#### GET `/api/users/[id]/two-factor/status`
Gets current 2FA status and requirements.

#### POST `/api/users/[id]/two-factor/disable`
Disables 2FA (requires password and current 2FA token).

#### GET `/api/users/[id]/two-factor/backup-codes`
Gets remaining backup codes count.

#### POST `/api/users/[id]/two-factor/backup-codes`
Regenerates backup codes (requires 2FA token).

### Admin Enforcement

#### GET `/api/admin/two-factor/enforce`
Lists users who should have 2FA but don't.

#### POST `/api/admin/two-factor/enforce`
Sends notifications or forces logout for non-compliant users.

## Database Schema

### BackupCode Model
```sql
CREATE TABLE backup_codes (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  code VARCHAR(64), -- Hashed backup code
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### User Model Updates
- `two_factor_secret`: Encrypted TOTP secret
- `two_factor_enabled`: Boolean flag for 2FA status

## Security Features

### Encryption
- TOTP secrets are stored securely
- Backup codes are hashed using SHA-256
- All sensitive operations are logged

### Rate Limiting
- Failed verification attempts are monitored
- Suspicious activity triggers security alerts
- Account lockout after multiple failures

### Audit Trail
- All 2FA setup/disable events logged
- Token verification attempts tracked
- Backup code usage monitored

## Usage Examples

### Setting up 2FA

1. **Generate Setup Data**
   ```javascript
   const response = await fetch('/api/users/123/two-factor/setup')
   const { qrCodeUrl, backupCodes, secret } = await response.json()
   ```

2. **Complete Setup**
   ```javascript
   const token = '123456' // From authenticator app
   await fetch('/api/users/123/two-factor/setup', {
     method: 'POST',
     body: JSON.stringify({ token, secret, backupCodes })
   })
   ```

### Verifying During Login

```javascript
const response = await fetch('/api/users/123/two-factor/verify', {
  method: 'POST',
  body: JSON.stringify({ token: '123456' })
})
```

### Admin Enforcement

```javascript
// Get non-compliant users
const response = await fetch('/api/admin/two-factor/enforce')
const { usersRequiring2FA } = await response.json()

// Force logout non-compliant users
await fetch('/api/admin/two-factor/enforce', {
  method: 'POST',
  body: JSON.stringify({
    userIds: ['user1', 'user2'],
    action: 'force_logout'
  })
})
```

## Configuration

### Role Requirements
- **ADMIN**: 2FA required (cannot be disabled by user)
- **EDITOR**: 2FA optional
- **VIEWER**: 2FA optional

### Backup Codes
- 10 codes generated per user
- Single-use only
- Automatically regenerated when requested

### Token Settings
- 30-second time window
- 6-digit codes
- SHA-1 algorithm (standard)

## Error Handling

### Common Errors
- `INVALID_TOKEN`: Token verification failed
- `2FA_NOT_ENABLED`: User hasn't set up 2FA
- `BACKUP_CODE_USED`: Backup code already consumed
- `2FA_REQUIRED`: Admin user must have 2FA enabled

### Security Events
- Multiple failed attempts trigger alerts
- Backup code usage is logged
- Account lockout after 5 failed attempts

## Testing

The 2FA system includes comprehensive tests:

- Unit tests for TOTP generation/verification
- Integration tests for API endpoints
- Security tests for edge cases
- Performance tests for bulk operations

## Troubleshooting

### Common Issues

1. **Time Sync Issues**
   - Ensure server and client clocks are synchronized
   - TOTP tokens are time-sensitive (30-second window)

2. **QR Code Not Scanning**
   - Check QR code generation
   - Verify otpauth URL format

3. **Backup Codes Not Working**
   - Ensure codes haven't been used
   - Check case sensitivity

### Debug Mode

Enable debug logging by setting `DEBUG_2FA=true` in environment variables.

## Security Considerations

- Never log TOTP secrets or backup codes in plain text
- Implement proper session management after 2FA verification
- Monitor for suspicious patterns in verification attempts
- Regularly audit 2FA compliance for admin users
- Provide clear user education on 2FA security

## Future Enhancements

- SMS backup option
- Hardware token support (WebAuthn)
- Risk-based authentication
- Mobile app integration
- Biometric verification