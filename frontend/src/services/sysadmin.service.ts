import api from './api';

export const sysAdminService = {
    getPlatformStats: async () => {
        const response = await api.get('/sysadmin/stats');
        return response.data.data;
    },

    getAllUsers: async () => {
        const response = await api.get('/sysadmin/users');
        return response.data.data;
    },

    getAllGroups: async () => {
        const response = await api.get('/sysadmin/groups');
        return response.data.data;
    },

    updateUser: async (userId: string, data: { role?: string; status?: string }) => {
        const response = await api.patch(`/sysadmin/users/${userId}`, data);
        return response.data.data;
    },

    resetAdminPassword: async (userId: string) => {
        const response = await api.post(`/sysadmin/users/${userId}/reset-password`);
        return response.data.data;
    },

    deleteUser: async (userId: string) => {
        const response = await api.delete(`/sysadmin/users/${userId}`);
        return response.data.data;
    },

    updateGroupStatus: async (groupId: string, status: string) => {
        const response = await api.patch(`/sysadmin/groups/${groupId}`, { status });
        return response.data.data;
    },

    hardDeleteGroup: async (groupId: string) => {
        const response = await api.delete(`/sysadmin/groups/${groupId}`);
        return response.data.data;
    },
};
