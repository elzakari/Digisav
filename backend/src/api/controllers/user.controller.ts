import { Request, Response, NextFunction } from 'express';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { NotFoundError, ValidationError } from '@/utils/errors';

const SALT_ROUNDS = 12;

export class UserController {
    async getProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    phoneNumber: true,
                    fullName: true,
                    role: true,
                    status: true,
                    createdAt: true,
                    language: true,
                    theme: true,
                    defaultCurrency: true,
                },
            });

            if (!user) throw new NotFoundError('User');

            res.json({
                success: true,
                data: user,
            });
        } catch (error) {
            next(error);
        }
    }

    async updateProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            const { fullName, phoneNumber, language, theme, defaultCurrency } = req.body;

            const updated = await prisma.user.update({
                where: { id: userId },
                data: { fullName, phoneNumber, language, theme, defaultCurrency },
                select: {
                    id: true,
                    email: true,
                    phoneNumber: true,
                    fullName: true,
                    role: true,
                    status: true,
                    language: true,
                    theme: true,
                    defaultCurrency: true,
                },
            });

            res.json({
                success: true,
                data: updated,
            });
        } catch (error) {
            next(error);
        }
    }

    async changePassword(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            const { currentPassword, newPassword } = req.body;

            const user = await prisma.user.findUnique({
                where: { id: userId },
            });

            if (!user) throw new NotFoundError('User');

            const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!isValid) {
                throw new ValidationError('Invalid current password');
            }

            const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
            await prisma.user.update({
                where: { id: userId },
                data: { passwordHash },
            });

            res.json({
                success: true,
                message: 'Password updated successfully',
            });
        } catch (error) {
            next(error);
        }
    }
}
