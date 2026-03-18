import prisma from '@/lib/prisma';
import { NotFoundError } from '../../utils/errors';

export class PortfolioService {
  /**
   * Get all holdings for a user across all portfolios
   */
  async getUserHoldings(userId: string) {
    return prisma.holding.findMany({
      where: {
        portfolio: {
          userId,
        },
      },
      include: {
        product: {
          select: {
            symbol: true,
            name: true,
            productType: true,
            currentPrice: true,
          },
        },
        portfolio: {
          select: {
            name: true,
          }
        }
      },
    });
  }

  /**
   * Get portfolio summary with valuation
   */
  async getPortfolioSummary(userId: string) {
    const holdings = await this.getUserHoldings(userId);
    const account = await prisma.investmentAccount.findUnique({
      where: { userId },
    });

    if (!account) {
      throw new NotFoundError('Investment account');
    }

    let totalInvestedValue = 0;
    let totalCostBasis = 0;

    const formattedHoldings = holdings.map((holding) => {
      const currentPrice = Number(holding.product.currentPrice);
      const quantity = Number(holding.quantity);
      const avgCostBasis = Number(holding.avgCostBasis);
      
      const currentValue = quantity * currentPrice;
      const costBasis = quantity * avgCostBasis;
      const gainLoss = currentValue - costBasis;
      const gainLossPercentage = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

      totalInvestedValue += currentValue;
      totalCostBasis += costBasis;

      return {
        id: holding.id,
        symbol: holding.product.symbol,
        name: holding.product.name,
        quantity,
        avgCostBasis,
        currentPrice,
        currentValue,
        gainLoss,
        gainLossPercentage,
        portfolioName: holding.portfolio.name,
      };
    });

    const totalPortfolioValue = totalInvestedValue + Number(account.cashBalance);
    const totalGainLoss = totalInvestedValue - totalCostBasis;
    const totalGainLossPercentage = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

    return {
      cashBalance: Number(account.cashBalance),
      investedValue: totalInvestedValue,
      totalValue: totalPortfolioValue,
      totalGainLoss,
      totalGainLossPercentage,
      holdings: formattedHoldings,
      currencyCode: account.currencyCode,
    };
  }

  /**
   * Get diversification breakdown by asset class/type
   */
  async getAllocationBreakdown(userId: string) {
    const holdings = await this.getUserHoldings(userId);
    const account = await prisma.investmentAccount.findUnique({
      where: { userId },
    });

    const breakdown: Record<string, number> = {
      CASH: Number(account?.cashBalance || 0),
    };

    holdings.forEach((holding) => {
      const type = holding.product.productType;
      const value = Number(holding.quantity) * Number(holding.product.currentPrice);
      
      breakdown[type] = (breakdown[type] || 0) + value;
    });

    // Convert to percentages
    const totalValue = Object.values(breakdown).reduce((a, b) => a + b, 0);
    const percentages = Object.entries(breakdown).map(([name, value]) => ({
      name,
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }));

    return percentages;
  }
}
