import api from './api';

export interface SavingsGoal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  currencyCode: string;
  targetDate?: string;
  category: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  isPublic: boolean;
  createdAt: string;
  group?: any;
}

export interface SavingsAnalytics {
  goal: Partial<SavingsGoal>;
  stats: {
    totalDeposits: number;
    totalDeposited: number;
    avgDeposit: number;
    daysActive: number;
    progressPercentage: number;
    estimatedCompletion: string | null;
    onTrack: boolean | null;
  };
}

export const savingsService = {
  // Goals
  getGoals: async () => {
    const response = await api.get('/savings/goals');
    return response.data;
  },

  createGoal: async (data: Partial<SavingsGoal>) => {
    const response = await api.post('/savings/goals', data);
    return response.data;
  },

  getGoalAnalytics: async (goalId: string) => {
    const response = await api.get(`/savings/goals/${goalId}/analytics`);
    return response.data;
  },

  makeDeposit: async (goalId: string, amount: number) => {
    const response = await api.post(`/savings/goals/${goalId}/deposits`, { amount });
    return response.data;
  },

  // Automations
  createRoundUp: async (goalId: string, roundUpTo: number) => {
    const response = await api.post('/savings/automations/round-up', { goalId, roundUpTo });
    return response.data;
  },

  // Analytics
  getSummary: async () => {
    const response = await api.get('/savings/analytics/summary');
    return response.data;
  },

  // Micro Savings Actions
  withdrawGoal: async (goalId: string) => {
    const response = await api.post(`/savings/goals/${goalId}/withdraw`);
    return response.data;
  },

  reinvestFromSavings: async (goalId: string) => {
    const response = await api.post(`/savings/goals/${goalId}/reinvest`);
    return response.data;
  },

  toggleGroupParticipation: async (optedOut: boolean) => {
    const response = await api.post('/savings/participation', { optedOut });
    return response.data;
  },

  // Admin Withdrawal Request Handling
  getGroupWithdrawalRequests: async (groupId: string) => {
    const response = await api.get(`/savings/groups/${groupId}/withdrawals`);
    return response.data.data;
  },

  approveWithdrawalRequest: async (groupId: string, requestId: string) => {
    const response = await api.post(`/savings/groups/${groupId}/withdrawals/${requestId}/approve`);
    return response.data.data;
  },

  denyWithdrawalRequest: async (groupId: string, requestId: string) => {
    const response = await api.post(`/savings/groups/${groupId}/withdrawals/${requestId}/deny`);
    return response.data.data;
  }
};
