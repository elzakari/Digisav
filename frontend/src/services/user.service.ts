import api from './api';

export const userService = {
    async getProfile() {
        const response = await api.get('/users/me');
        return response.data.data;
    },

    async updateProfile(data: any) {
        const response = await api.patch('/users/me', data);
        return response.data.data;
    },

    async changePassword(data: any) {
        const response = await api.post('/users/change-password', data);
        return response.data;
    }
};
