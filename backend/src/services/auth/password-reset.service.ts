import crypto from 'crypto';
import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';
import { NotFoundError, ValidationError } from '@/utils/errors';
const SALT_ROUNDS = 12;
const TOKEN_EXPIRY_MINUTES = 60;

export class PasswordResetService {
    async requestReset(email: string): Promise<void> {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Return silently — don't leak whether the email exists
            return;
        }

        // Invalidate any existing tokens for this user
        await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

        // Generate a secure random token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

        await prisma.passwordResetToken.create({
            data: { token, userId: user.id, expiresAt },
        });

        // In production, send this via email. For dev, log to console.
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
        console.log('\n========================================');
        console.log('🔑 PASSWORD RESET LINK (dev only):');
        console.log(resetUrl);
        console.log('========================================\n');
    }

    async resetPassword(token: string, newPassword: string): Promise<void> {
        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { token },
            include: { user: true },
        });

        if (!resetToken || resetToken.used) {
            throw new ValidationError('Invalid or already used reset token');
        }

        if (resetToken.expiresAt < new Date()) {
            await prisma.passwordResetToken.delete({ where: { token } });
            throw new ValidationError('Reset token has expired. Please request a new one.');
        }

        const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // Update password and mark token as used in a transaction
        await prisma.$transaction([
            prisma.user.update({
                where: { id: resetToken.userId },
                data: { passwordHash },
            }),
            prisma.passwordResetToken.update({
                where: { token },
                data: { used: true },
            }),
            // Invalidate all existing sessions
            prisma.refreshToken.deleteMany({ where: { userId: resetToken.userId } }),
        ]);
    }

    async createResetForUserId(userId: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new NotFoundError('User');
        }

        await prisma.passwordResetToken.deleteMany({ where: { userId } });

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

        await prisma.$transaction([
            prisma.passwordResetToken.create({
                data: { token, userId, expiresAt },
            }),
            prisma.refreshToken.deleteMany({ where: { userId } }),
        ]);

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
        return { resetUrl, expiresAt };
    }
}
