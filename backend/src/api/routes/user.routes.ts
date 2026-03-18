import { Router } from 'express';
import { UserController } from '@/api/controllers/user.controller';
import { authenticate } from '@/api/middleware/auth.middleware';
import { validateRequest } from '@/api/middleware/validation.middleware';
import { z } from 'zod';

const router = Router();
const controller = new UserController();

const updateProfileSchema = z.object({
    body: z.object({
        fullName: z.string().min(2).optional(),
        phoneNumber: z.string().min(10).optional(),
        language: z.string().optional(),
        theme: z.string().optional(),
        defaultCurrency: z.string().optional(),
    }),
});

const changePasswordSchema = z.object({
    body: z.object({
        currentPassword: z.string().min(6),
        newPassword: z.string().min(6),
    }),
});

router.use(authenticate);

router.get('/me', controller.getProfile.bind(controller));
router.patch('/me', validateRequest(updateProfileSchema), controller.updateProfile.bind(controller));
router.post('/change-password', validateRequest(changePasswordSchema), controller.changePassword.bind(controller));

export default router;
