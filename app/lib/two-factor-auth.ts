import { UserRole, PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export function isTwoFactorRequired(role: UserRole): boolean {
  return role === UserRole.ADMIN;
}

// Simple TOTP implementation without external dependencies
function generateSecret(): string {
  return crypto.randomBytes(20).toString('base64');
}

function generateTOTP(secret: string, timeStep?: number): string {
  const time = timeStep || Math.floor(Date.now() / 30000);
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeUInt32BE(0, 0);
  timeBuffer.writeUInt32BE(time, 4);
  
  const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base64'));
  hmac.update(timeBuffer);
  const hash = hmac.digest();
  
  const offset = hash[hash.length - 1] & 0xf;
  const code = ((hash[offset] & 0x7f) << 24) |
               ((hash[offset + 1] & 0xff) << 16) |
               ((hash[offset + 2] & 0xff) << 8) |
               (hash[offset + 3] & 0xff);
  
  return (code % 1000000).toString().padStart(6, '0');
}

function verifyTOTP(secret: string, token: string): boolean {
  const currentTime = Math.floor(Date.now() / 30000);
  
  // Check current time window and ±1 window for clock drift
  for (let i = -1; i <= 1; i++) {
    const expectedToken = generateTOTP(secret, currentTime + i);
    if (expectedToken === token) {
      return true;
    }
  }
  
  return false;
}

function createOTPAuthURL(email: string, secret: string, issuer: string = 'Kin Workspace CMS'): string {
  const encodedEmail = encodeURIComponent(email);
  const encodedIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}`;
}

export async function generateTwoFactorSetup(userId: string, email: string) {
  const secret = generateSecret();
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret },
  });
  const otpauth = createOTPAuthURL(email, secret);
  const backupCodes = await regenerateBackupCodes(userId);
  return { 
    secret, 
    otpauth,
    backupCodes,
    setupInstructions: [
      '1. Open your authenticator app (Google Authenticator, Authy, etc.)',
      '2. Select "Add account" or "+"',
      '3. Choose "Enter a setup key" or "Manual entry"',
      '4. Enter the following details:',
      `   - Account: ${email}`,
      `   - Key: ${secret}`,
      '   - Type: Time-based',
      '5. Save the account in your authenticator app'
    ]
  };
}

export async function enableTwoFactorAuth(userId: string, token: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.twoFactorSecret) {
    return { success: false, message: '2FA not set up for this user.' };
  }
  const isValid = verifyTOTP(user.twoFactorSecret, token);
  if (!isValid) {
    return { success: false, message: 'Invalid 2FA token.' };
  }
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true },
  });
  return { success: true };
}

export async function disableTwoFactorAuth(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });
  return { success: true };
}

export async function verifyTwoFactorToken(userId: string, token: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
        return false;
    }
    return verifyTOTP(user.twoFactorSecret, token);
}

export async function getRemainingBackupCodes(userId: string) {
    return prisma.backupCode.count({ where: { userId, used: false } });
}

export async function regenerateBackupCodes(userId: string) {
    await prisma.backupCode.deleteMany({ where: { userId } });
    const codes = Array.from({ length: 10 }, () => crypto.randomBytes(4).toString('hex').toUpperCase());
    const hashedCodes = await Promise.all(codes.map(code => crypto.createHash('sha256').update(code).digest('hex')));
    await prisma.backupCode.createMany({
        data: hashedCodes.map(hashedCode => ({ userId, code: hashedCode })),
    });
    return codes;
}

export async function validateTwoFactorForLogin(userId: string, token: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        return { success: true, isBackupCode: false }; // 2FA not enabled, so we don't need to validate
    }

    const isValidToken = await verifyTwoFactorToken(userId, token);
    if (isValidToken) {
        return { success: true, isBackupCode: false };
    }

    // Check backup codes
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const backupCode = await prisma.backupCode.findFirst({ where: { userId, code: hashedToken, used: false } });
    if (backupCode) {
        await prisma.backupCode.update({ where: { id: backupCode.id }, data: { used: true } });
        return { success: true, isBackupCode: true };
    }

    return { success: false, message: 'Invalid 2FA token or backup code.', isBackupCode: false };
}
