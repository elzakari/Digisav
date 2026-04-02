import api from './api';

export const contributionService = {
  async recordContribution(groupId: string, data: any) {
    const response = await api.post(`/groups/${groupId}/contributions`, data);
    return response.data.data;
  },

  async getGroupStats(groupId: string) {
    const response = await api.get(`/groups/${groupId}/stats`);
    return response.data.data;
  },

  async getContributionHistory(groupId: string, memberId?: string) {
    const url = memberId
      ? `/groups/${groupId}/contributions?memberId=${memberId}`
      : `/groups/${groupId}/contributions`;
    const response = await api.get(url);
    return response.data.data;
  },

  async updateContribution(
    groupId: string,
    contributionId: string,
    data: {
      amount?: number;
      paymentDate?: string;
      paymentMethod?: string;
      referenceNumber?: string | null;
      notes?: string | null;
      publishToMemberDashboard?: boolean;
    }
  ) {
    const response = await api.patch(`/groups/${groupId}/contributions/${contributionId}`, data);
    return response.data.data;
  },

  async getPendingPublishes(groupId: string) {
    const response = await api.get(`/groups/${groupId}/publish/pending`);
    return response.data.data;
  },

  async publishMicroSavings(groupId: string, args: { publishAll?: boolean; transactionIds?: string[] }) {
    const response = await api.post(`/groups/${groupId}/publish`, args);
    return response.data.data;
  },

  async recalculateMicroSavingsBalances(groupId: string) {
    const response = await api.post(`/groups/${groupId}/micro-savings/recalculate`, {});
    return response.data.data;
  },

  async downloadReport(
    groupId: string,
    startDate: string,
    endDate: string,
    type: string = 'contributions',
    format: string = 'pdf',
    memberId?: string
  ) {
    const response = await api.post(
      `/groups/${groupId}/reports`,
      { startDate, endDate, type, format, memberId },
      { responseType: 'blob' }
    );
    return response.data;
  },

  async getShareLink(groupId: string, params: { startDate: string; endDate: string; type: string; format: string; memberId?: string }) {
    const response = await api.post<{ success: boolean; shareLink: string }>(
      `/groups/${groupId}/reports/share`,
      params
    );
    return response.data.shareLink;
  },
};
