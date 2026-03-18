import { Router } from 'express';
import * as authController from '@/api/controllers/auth.controller';
import * as passwordResetController from '@/api/controllers/password-reset.controller';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', passwordResetController.forgotPassword);
router.post('/reset-password', passwordResetController.resetPassword);

export default router;