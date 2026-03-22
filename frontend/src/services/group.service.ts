import api from './api';

export const groupService = {
  async createGroup(data: any) {
    const response = await api.post('/groups', data);
    return response.data.data;
  },

  async getMyGroups() {
    const response = await api.get('/groups');
    return response.data.data;
  },

  async getAdminStats() {
    const response = await api.get('/groups/admin/stats');
    return response.data.data;
  },

  async getMemberStats() {
    const response = await api.get('/groups/member/stats');
    return response.data.data;
  },

  async getGroupById(groupId: string) {
    const response = await api.get(`/groups/${groupId}`);
    return response.data.data;
  },

  async getGroupDashboard(groupId: string) {
    const response = await api.get(`/groups/${groupId}/dashboard`);
    return response.data.data;
  },

  async updateGroup(groupId: string, data: any) {
    const response = await api.patch(`/groups/${groupId}`, data);
    return response.data.data;
  },

  async activateGroup(groupId: string) {
    const response = await api.post(`/groups/${groupId}/activate`);
    return response.data.data;
  },

  async updateGroupFees(groupId: string, data: any) {
    const response = await api.patch(`/groups/${groupId}/fees`, data);
    return response.data.data;
  },

  async toggleMicroInvestments(groupId: string, allowMicroInvestments: boolean) {
    const response = await api.patch(`/groups/${groupId}/investments/toggle`, { allowMicroInvestments });
    return response.data.data;
  },

  async sendGroupNotification(groupId: string, data: any) {
    const response = await api.post(`/groups/${groupId}/notifications`, data);
    return response.data.data;
  },

  async deleteGroup(groupId: string) {
    const response = await api.delete(`/groups/${groupId}`);
    return response.data.data;
  },

  async suspendMember(memberId: string) {
    const response = await api.patch(`/members/${memberId}/suspend`);
    return response.data.data;
  },

  async approveMember(memberId: string) {
    const response = await api.patch(`/members/${memberId}/approve`);
    return response.data.data;
  },

  async rejectMember(memberId: string) {
    const response = await api.patch(`/members/${memberId}/reject`);
    return response.data.data;
  },

  async removeMember(memberId: string) {
    const response = await api.delete(`/members/${memberId}`);
    return response.data.data;
  },

  async updateMember(memberId: string, data: any) {
    const response = await api.patch(`/members/${memberId}`, data);
    return response.data.data;
  },

  async registerMember(groupId: string, data: any) {
    const response = await api.post(`/groups/${groupId}/members`, data);
    return response.data.data;
  },

  async validateInvitation(groupId: string, token: string) {
    const response = await api.get(`/groups/${groupId}/invitations/${token}/validate`);
    return response.data.data;
  },

  async getGroupByInvitation(token: string) {
    const response = await api.get(`/invitations/${token}`);
    return response.data.data;
  },

  async joinGroup(token: string) {
    const response = await api.post(`/invitations/${token}/join`);
    return response.data.data;
  },

  async createInvitation(groupId: string, data: any) {
    const response = await api.post(`/groups/${groupId}/invitations`, data);
    return response.data.data;
  },

  async sendPhoneInvitation(groupId: string, data: any) {
    const response = await api.post(`/groups/${groupId}/invitations/phone`, data);
    return response.data.data;
  },

  async getCalendarData(groupId: string) {
    const response = await api.get(`/groups/${groupId}/calendar`);
    return response.data.data;
  },

  async bulkUpdateMembers(groupId: string, memberIds: string[], data: any) {
    const response = await api.patch(`/groups/${groupId}/members/bulk`, { memberIds, data });
    return response.data.data;
  },

  async getGroupMembers(groupId: string, status?: string) {
    const url = status
      ? `/groups/${groupId}/members?status=${encodeURIComponent(status)}`
      : `/groups/${groupId}/members`;
    const response = await api.get(url);
    return response.data.data;
  }
};
