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

    updateGroupStatus: async (groupId: string, status: string) => {
        const response = await api.patch(`/sysadmin/groups/${groupId}`, { status });
        return response.data.data;
    }
};
