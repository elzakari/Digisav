import prisma from '@/lib/prisma';

export class NotificationService {
    /**
     * Create a new notification for a specific user.
     */
    async createNotification(data: {
        userId: string;
        groupId?: string;
        type: string;
        title: string;
        body: string;
    }) {
        return prisma.notification.create({
            data: {
                userId: data.userId,
                groupId: data.groupId,
                type: data.type,
                title: data.title,
                body: data.body,
            },
        });
    }

    /**
     * Get notifications for a user (unread first, then recent read max 50).
     */
    async getUserNotifications(userId: string) {
        return prisma.notification.findMany({
            where: { userId },
            orderBy: [
                { isRead: 'asc' },
                { createdAt: 'desc' },
            ],
            take: 50,
        });
    }

    /**
     * Mark a specific notification as read.
     */
    async markAsRead(notificationId: string, userId: string) {
        return prisma.notification.updateMany({
            where: {
                id: notificationId,
                userId: userId, // Ensure user owns the notification
            },
            data: { isRead: true },
        });
    }

    /**
     * Mark all notifications as read for a user.
     */
    async markAllAsRead(userId: string) {
        return prisma.notification.updateMany({
            where: {
                userId: userId,
                isRead: false,
            },
            data: { isRead: true },
        });
    }
}
