import { prisma } from './db';
import crypto from 'crypto';
import { sendPasswordResetEmail } from './emails'; // This file does not exist, I will create it later

export async function initiatePasswordReset({
  email,
  ipAddress,
  userAgent,
}: {
  email: string;
  ipAddress: string | null;
  userAgent: string | null;
}) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal that the user doesn't exist
      return { success: true, message: 'If an account with this email exists, a password reset link has been sent.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    // In a real app, you would send an email with the reset link
    // The link would be something like: https://your-app.com/auth/password-reset/verify?token=...
    await sendPasswordResetEmail(user.email, token);

    return { success: true, message: 'If an account with this email exists, a password reset link has been sent.', token };
  } catch (error) {
    console.error('Error initiating password reset:', error);
    return { success: false, message: 'An unexpected error occurred.' };
  }
}

export async function completePasswordReset(token: string, newPassword: string) {
    const verification = await verifyPasswordResetToken(token);
    if (!verification.success) {
        return verification;
    }

    const { user } = verification;
    if (!user) {
        return { success: false, message: 'Invalid user.' };
    }
    const passwordHash = await crypto.createHash('sha256').update(newPassword).digest('hex');

    await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
    });

    await prisma.passwordResetToken.updateMany({
        where: { userId: user.id },
        data: { used: true },
    });

    return { success: true, message: 'Password has been reset successfully.' };
}

export async function getPasswordResetStatistics() {
    const totalResets = await prisma.passwordResetToken.count();
    const successfulResets = await prisma.passwordResetToken.count({ where: { used: true } });
    const expiredResets = await prisma.passwordResetToken.count({ where: { expiresAt: { lt: new Date() }, used: false } });

    return { totalResets, successfulResets, expiredResets };
}

export async function verifyPasswordResetToken(token: string) {
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
        used: false,
      },
      include: {
        user: true,
      },
    });

    if (!resetToken) {
      return { success: false, message: 'Invalid or expired password reset token.' };
    }

    return { success: true, user: resetToken.user };
  } catch (error) {
    console.error('Error verifying password reset token:', error);
    return { success: false, message: 'An unexpected error occurred.' };
  }
}
