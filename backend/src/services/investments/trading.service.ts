import { OrderStatus, InvestmentTransactionType, OrderType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { NotFoundError, BadRequestError } from '../../utils/errors';

export class TradingService {
  /**
   * Place a market order
   */
  async placeOrder(userId: string, productId: string, quantity: number, type: 'BUY' | 'SELL') {
    const account = await prisma.investmentAccount.findFirst({
      where: { userId },
    });

    if (!account || account.status !== 'ACTIVE') {
      throw new BadRequestError('Active investment account not found');
    }

    const product = await prisma.investmentProduct.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isActive) {
      throw new NotFoundError('Investment product');
    }

    const currentPrice = Number(product.currentPrice);
    const estimatedCost = quantity * currentPrice;

    // Validation for BUYS
    if (type === 'BUY') {
      const totalCostWithFee = estimatedCost + this.calculateFee(estimatedCost);
      if (Number(account.cashBalance) < totalCostWithFee) {
        throw new BadRequestError('Insufficient cash balance for this trade');
      }
    }

    // Validation for SELLS
    if (type === 'SELL') {
      // Find default portfolio for user
      const portfolio = await prisma.portfolio.findFirst({
        where: { userId, accountId: account.id },
      });

      if (!portfolio) throw new BadRequestError('Portfolio not found');

      const holding = await prisma.holding.findUnique({
        where: {
          portfolioId_productId: {
            portfolioId: portfolio.id,
            productId,
          },
        },
      });

      if (!holding || Number(holding.quantity) < quantity) {
        throw new BadRequestError('Insufficient quantity of asset to sell');
      }
    }

    // Create the order
    const order = await prisma.order.create({
      data: {
        accountId: account.id,
        productId,
        orderType: 'MARKET',
        transactionType: type === 'BUY' ? 'BUY' : 'SELL',
        quantity,
        status: 'PENDING',
      },
    });

    // In this simulation phase, we fill the order immediately
    return this.executeOrder(order.id);
  }

  /**
   * Execute/Fill an order (Simulated)
   */
  async executeOrder(orderId: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          product: true,
          account: true,
        },
      });

      if (!order || order.status !== 'PENDING') {
        throw new BadRequestError('Order not found or already processed');
      }

      const fillPrice = Number(order.product.currentPrice);
      const amount = Number(order.quantity) * fillPrice;
      const fee = this.calculateFee(amount);

      // Update Order Status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'FILLED',
          filledQuantity: order.quantity,
          avgFillPrice: fillPrice,
          filledAt: new Date(),
        },
      });

      // Update Cash Balance
      const cashAdjustment = order.transactionType === 'BUY' ? -(amount + fee) : (amount - fee);
      await tx.investmentAccount.update({
        where: { id: order.accountId },
        data: {
          cashBalance: { increment: cashAdjustment },
        },
      });

      // Record Transaction
      await tx.investmentTransaction.create({
        data: {
          accountId: order.accountId,
          productId: order.productId,
          orderId: order.id,
          transactionType: order.transactionType,
          amount,
          quantity: order.quantity,
          price: fillPrice,
          fee,
          currencyCode: order.account.currencyCode,
          transactionDate: new Date(),
        },
      });

      // Update Holdings
      await this.updateHoldingsInternal(tx, order.account.userId, order.accountId, order.productId, Number(order.quantity), fillPrice, order.transactionType);

      return updatedOrder;
    });
  }

  private async updateHoldingsInternal(tx: any, userId: string, accountId: string, productId: string, quantity: number, price: number, type: string) {
    // Get default portfolio
    let portfolio = await tx.portfolio.findFirst({
      where: { userId, accountId },
    });

    if (!portfolio) {
      portfolio = await tx.portfolio.create({
        data: {
          userId,
          accountId,
          name: 'Main Portfolio',
          isDefault: true,
        },
      });
    }

    const existingHolding = await tx.holding.findUnique({
      where: {
        portfolioId_productId: {
          portfolioId: portfolio.id,
          productId,
        },
      },
    });

    if (type === 'BUY') {
      if (existingHolding) {
        const currentQty = Number(existingHolding.quantity);
        const currentAvgCost = Number(existingHolding.avgCostBasis);
        const totalNewQty = currentQty + quantity;
        const newAvgCost = ((currentQty * currentAvgCost) + (quantity * price)) / totalNewQty;

        await tx.holding.update({
          where: { id: existingHolding.id },
          data: {
            quantity: totalNewQty,
            avgCostBasis: newAvgCost,
            currentValue: totalNewQty * price,
          },
        });
      } else {
        await tx.holding.create({
          data: {
            portfolioId: portfolio.id,
            productId,
            quantity,
            avgCostBasis: price,
            currentValue: quantity * price,
          },
        });
      }
    } else if (type === 'SELL') {
      if (!existingHolding || Number(existingHolding.quantity) < quantity) {
        throw new Error('Critical: Holding consistency error on sell execution');
      }

      const newQty = Number(existingHolding.quantity) - quantity;
      
      if (newQty === 0) {
        await tx.holding.delete({
          where: { id: existingHolding.id },
        });
      } else {
        await tx.holding.update({
          where: { id: existingHolding.id },
          data: {
            quantity: newQty,
            currentValue: newQty * price,
          },
        });
      }
    }
  }

  private calculateFee(amount: number): number {
    // 0.2% fee with 1.00 KES minimum
    const fee = amount * 0.002;
    return Math.max(fee, 1.0);
  }
}
