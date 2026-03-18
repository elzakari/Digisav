import prisma from '@/lib/prisma';
import { BadRequestError } from '@/utils/errors';

export class IntegrationService {
  /**
   * Automatically invest funds from a completed savings goal.
   * This is a cross-service workflow that moves money from a
   * SavingsGoal into an InvestmentAccount.
   */
  async investCompletedGoal(goalId: string, userId: string) {
    return await prisma.$transaction(async (tx: any) => {
      // 1. Fetch and validate the goal
      const goal = await tx.savingsGoal.findUnique({
        where: { id: goalId, userId },
      });

      if (!goal) {
        throw new BadRequestError('Savings goal not found');
      }

      const amount = Number(goal.currentAmount);
      if (amount <= 0) {
        throw new BadRequestError('No funds available in this goal to invest');
      }

      // 2. Fetch or create an active investment account for the user
      let investmentAccount = await tx.investmentAccount.findFirst({
        where: { userId, status: 'ACTIVE' },
      });

      if (!investmentAccount) {
        investmentAccount = await tx.investmentAccount.create({
          data: {
            userId,
            status: 'ACTIVE',
            cashBalance: 0,
            totalValue: 0,
            investedValue: 0,
            currencyCode: goal.currencyCode,
            riskTolerance: 'MODERATE',
            kycStatus: 'PENDING',
          },
        });
      }

      // 3. Credit the investment account's cash balance
      await tx.investmentAccount.update({
        where: { id: investmentAccount.id },
        data: {
          cashBalance: { increment: amount },
          totalValue: { increment: amount },
        },
      });

      // 4. Record the investment transaction for the transfer
      await tx.investmentTransaction.create({
        data: {
          accountId: investmentAccount.id,
          transactionType: 'DEPOSIT',
          amount,
          currencyCode: goal.currencyCode,
          description: `Transfer from savings goal: ${goal.name}`,
        },
      });

      // 5. Mark the savings goal as COMPLETED and zero out its balance
      await tx.savingsGoal.update({
        where: { id: goalId },
        data: {
          currentAmount: 0,
          status: 'COMPLETED',
        },
      });

      // 6. Record a savings deposit (outflow) for auditability
      await tx.savingsDeposit.create({
        data: {
          savingsGoalId: goal.id,
          userId: goal.userId,
          amount: -amount,
          currencyCode: goal.currencyCode,
          source: 'investment_transfer',
        },
      });

      return {
        success: true,
        amountTransferred: amount,
        targetAccountId: investmentAccount.id,
      };
    });
  }
}

export const integrationService = new IntegrationService();
