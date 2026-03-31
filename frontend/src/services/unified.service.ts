import api from './api';

export interface NetWorthSummary {
  totalNetWorth: number;
  breakdown: {
    groupContributions: number;
    personalSavings: number;
    investments: number;
  };
  currencyCode: string | null;
  totalsByCurrency: Array<{ currencyCode: string; total: number }>;
  multiCurrency: boolean;
}

export interface FinancialTrend {
  month: string;
  netWorth: number;
}

export interface FinancialSummary {
  current: NetWorthSummary;
  trends: FinancialTrend[];
}

export const unifiedService = {
  getSummary: async () => {
    const response = await api.get<{ success: boolean; data: FinancialSummary }>('/unified/summary');
    return response.data.data;
  },

  investGoal: async (goalId: string) => {
    const response = await api.post<{ success: boolean; data: any }>('/unified/invest-goal', { goalId });
    return response.data;
  },
};
