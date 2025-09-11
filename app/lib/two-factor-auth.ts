import { UserRole, PrismaClient } from '@prisma/client';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import crypto from 'crypto';

const prisma = new PrismaClient();

export function isTwoFactorRequired(role: UserRole): boolean {
  return role === UserRole.ADMIN;
}

export async function generateTwoFactorSetup(userId: string, email: string) {
  const secret = authenticator.generateSecret();
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret },
  });
  const otpauth = authenticator.keyuri(email, 'Kin Workspace CMS', secret);
  const qrCodeDataUrl = await qrcode.toDataURL(otpauth);
  const backupCodes = await regenerateBackupCodes(userId);
  return { secret, qrCodeDataUrl, backupCodes };
}

export async function enableTwoFactorAuth(userId: string, token: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.twoFactorSecret) {
    return { success: false, message: '2FA not set up for this user.' };
  }
  const isValid = authenticator.verify({ token, secret: user.twoFactorSecret });
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
    return authenticator.verify({ token, secret: user.twoFactorSecret });
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
