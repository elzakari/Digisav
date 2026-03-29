import api from './api';

export const transactionService = {
    getGroupTransactions: async (groupId: string) => {
        const response = await api.get(`/groups/${groupId}/transactions`);
        return response.data.data;
    },

    recordPayout: async (
        groupId: string,
        memberId: string,
        data: {
            amount: number;
            currencyCode: string;
            paymentMethod: string;
            referenceNumber?: string;
            notes?: string;
        }
    ) => {
        const response = await api.post(`/groups/${groupId}/payouts/${memberId}`, data);
        return response.data.data;
    },

    adjustPayout: async (
        groupId: string,
        transactionId: string,
        data: {
            amount?: number;
            paymentMethod?: string;
            referenceNumber?: string | null;
            notes?: string | null;
            paymentDate?: string;
        }
    ) => {
        const response = await api.patch(`/groups/${groupId}/payouts/${transactionId}`, data);
        return response.data.data;
    },
};
