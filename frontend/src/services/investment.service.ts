import api from './api';

export interface InvestmentAccount {
  id: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  totalValue: number;
  cashBalance: number;
  investedValue: number;
  currencyCode: string;
  riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  kycStatus: string;
}

export interface Holding {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  avgCostBasis: number;
  currentPrice: number;
  currentValue: number;
  gainLoss: number;
  gainLossPercentage: number;
  portfolioName: string;
}

export interface PortfolioSummary {
  cashBalance: number;
  investedValue: number;
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPercentage: number;
  holdings: Holding[];
  currencyCode: string;
}

export interface Allocation {
  name: string;
  value: number;
  percentage: number;
}

export interface Recommendation {
  id: string;
  riskTolerance: string;
  targetAllocation: any;
  recommendedProducts: any;
  reasoning: string;
  status: string;
}

export const investmentService = {
  getAccount: async () => {
    const response = await api.get<InvestmentAccount>('/investments/account');
    return response.data;
  },

  getPortfolio: async () => {
    const response = await api.get<PortfolioSummary>('/investments/portfolio');
    return response.data;
  },

  getAllocation: async () => {
    const response = await api.get<Allocation[]>('/investments/allocation');
    return response.data;
  },

  getTransactions: async () => {
    const response = await api.get('/investments/transactions');
    return response.data;
  },

  deposit: async (amount: number, description?: string) => {
    const response = await api.post('/investments/deposit', { amount, description });
    return response.data;
  },

  placeOrder: async (productId: string, quantity: number, type: 'BUY' | 'SELL') => {
    const response = await api.post('/investments/orders', { productId, quantity, type });
    return response.data;
  },

  getRecommendation: async () => {
    const response = await api.post<Recommendation>('/investments/recommendations');
    return response.data;
  },

  applyRecommendation: async (recommendationId: string) => {
    const response = await api.post(`/investments/recommendations/${recommendationId}/apply`);
    return response.data;
  },
};
