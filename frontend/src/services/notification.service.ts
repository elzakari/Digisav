import api from './api';

export const notificationService = {
    getMyNotifications: async () => {
        const response = await api.get('/notifications');
        return response.data;
    },

    markAsRead: async (notificationId: string) => {
        const response = await api.patch(`/notifications/${notificationId}/read`);
        return response.data;
    },

    markAllAsRead: async () => {
        const response = await api.patch('/notifications/read-all');
        return response.data;
    }
};
