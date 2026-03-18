import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '@/services/notifications/notification.service';
import { AuthRequest } from '@/api/middleware/auth.middleware';

export class NotificationController {
    private notificationService: NotificationService;

    constructor() {
        this.notificationService = new NotificationService();
    }

    async getMyNotifications(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const notifications = await this.notificationService.getUserNotifications(userId);

            res.status(200).json({
                success: true,
                data: notifications,
            });
        } catch (error) {
            next(error);
        }
    }

    async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const { notificationId } = req.params;

            await this.notificationService.markAsRead(notificationId as string, userId);

            res.status(200).json({
                success: true,
                message: 'Notification marked as read',
            });
        } catch (error) {
            next(error);
        }
    }

    async markAllAsRead(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;

            await this.notificationService.markAllAsRead(userId);

            res.status(200).json({
                success: true,
                message: 'All notifications marked as read',
            });
        } catch (error) {
            next(error);
        }
    }
}
