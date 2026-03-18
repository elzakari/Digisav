import { Request, Response, NextFunction } from 'express';
import { PasswordResetService } from '@/services/auth/password-reset.service';

const passwordResetService = new PasswordResetService();

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;
        await passwordResetService.requestReset(email);
        // Always return 200 regardless — prevents email enumeration
        res.status(200).json({
            success: true,
            message: 'If an account exists with that email, a password reset link has been sent.',
        });
    } catch (error) {
        next(error);
    }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token, newPassword } = req.body;
        await passwordResetService.resetPassword(token, newPassword);
        res.status(200).json({ success: true, message: 'Password reset successfully.' });
    } catch (error) {
        next(error);
    }
};
