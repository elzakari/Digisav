import { Router } from 'express';
import { NotificationController } from '@/api/controllers/notification.controller';
import { authenticate } from '@/api/middleware/auth.middleware';

const router = Router();
const controller = new NotificationController();

// Get current user's notifications
router.get('/', authenticate, controller.getMyNotifications.bind(controller));

// Mark all as read
router.patch('/read-all', authenticate, controller.markAllAsRead.bind(controller));

// Mark specific notification as read
router.patch('/:notificationId/read', authenticate, controller.markAsRead.bind(controller));

export default router;
