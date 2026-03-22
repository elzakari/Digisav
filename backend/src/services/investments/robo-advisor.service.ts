import { RiskTolerance } from '@prisma/client';
import prisma from '@/lib/prisma';
import { NotFoundError } from '../../utils/errors';
import { TradingService } from './trading.service';

const tradingService = new TradingService();

export class RoboAdvisorService {
  /**
   * Generate a recommendation based on risk tolerance
   */
  async generateRecommendation(userId: string) {
    const account = await prisma.investmentAccount.findFirst({
      where: { userId },
    });

    if (!account) {
      throw new NotFoundError('Investment account');
    }

    const riskTolerance = account.riskTolerance;

    // Define allocation based on risk tolerance (Example model)
    const allocations: Record<RiskTolerance, { STOCKS: number; BONDS: number; MONEY_MARKET: number; CASH: number }> = {
      CONSERVATIVE: { STOCKS: 20, BONDS: 50, MONEY_MARKET: 20, CASH: 10 },
      MODERATE: { STOCKS: 60, BONDS: 30, MONEY_MARKET: 5, CASH: 5 },
      AGGRESSIVE: { STOCKS: 80, BONDS: 15, MONEY_MARKET: 0, CASH: 5 },
    };

    const targetAllocation = allocations[riskTolerance];

    // Select products for each asset class
    const recommendedProducts = await this.selectIndividualProducts(targetAllocation);

    const reasoning = this.generateReasoning(riskTolerance, targetAllocation);

    return prisma.roboAdvisorRecommendation.create({
      data: {
        userId,
        accountId: account.id,
        riskTolerance,
        targetAllocation: targetAllocation as any,
        recommendedProducts: recommendedProducts as any,
        reasoning,
        status: 'PROPOSED',
      },
    });
  }

  /**
   * Apply a recommendation (Place the orders)
   */
  async applyRecommendation(userId: string, recommendationId: string) {
    const recommendation = await prisma.roboAdvisorRecommendation.findUnique({
      where: { id: recommendationId, userId },
    });

    if (!recommendation || recommendation.status !== 'PROPOSED') {
      throw new NotFoundError('Valid recommendation not found');
    }

    const account = await prisma.investmentAccount.findUnique({
      where: { id: recommendation.accountId },
    });

    if (!account) throw new NotFoundError('Account');

    const availableCash = Number(account.cashBalance);
    if (availableCash <= 0) {
      throw new Error('Insufficient cash balance to apply recommendation');
    }

    const products = recommendation.recommendedProducts as any;

    // Place orders for each recommended product
    for (const item of products) {
      const allocationAmount = (availableCash * item.percentage) / 100;
      
      const product = await prisma.investmentProduct.findUnique({
        where: { symbol: item.symbol },
      });

      if (product && product.isActive) {
        const quantity = allocationAmount / Number(product.currentPrice);
        if (quantity > 0) {
          await tradingService.placeOrder(userId, product.id, quantity, 'BUY');
        }
      }
    }

    return prisma.roboAdvisorRecommendation.update({
      where: { id: recommendationId },
      data: {
        status: 'APPLIED',
        appliedAt: new Date(),
      },
    });
  }

  private async selectIndividualProducts(allocation: any) {
    const products: { symbol: string; percentage: number }[] = [];

    // Simple logic: pick top active products by type
    for (const [type, pct] of Object.entries(allocation)) {
      if (pct === 0 || type === 'CASH') continue;

      const items = await prisma.investmentProduct.findMany({
        where: { productType: type as any, isActive: true },
        take: 2,
      });

      if (items.length > 0) {
        items.forEach(item => {
          products.push({
            symbol: item.symbol,
            percentage: Number(pct) / items.length,
          });
        });
      }
    }

    return products;
  }

  private generateReasoning(riskTolerance: RiskTolerance, allocation: any): string {
    const strategy = riskTolerance.toLowerCase();
    return `Based on your ${strategy} risk profile, we've designed a diversified portfolio aimed at ${
      riskTolerance === 'AGGRESSIVE' ? 'maximum long-term growth' : 
      riskTolerance === 'MODERATE' ? 'balancing growth with capital preservation' : 
      'stable income and capital protection'
    }. This allocation includes ${allocation.STOCKS}% in equities for growth and ${allocation.BONDS}% in fixed income for stability.`;
  }
}
