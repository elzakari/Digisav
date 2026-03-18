import { InvestmentAccountStatus, RiskTolerance, InvestmentTransactionType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { NotFoundError, BadRequestError } from '../../utils/errors';

export class InvestmentService {
  /**
   * Get or create an investment account for a user in a specific group
   */
  async getOrCreateAccount(userId: string, groupId?: string) {
    let account = await prisma.investmentAccount.findFirst({
      where: groupId ? { userId, groupId } : { userId },
    } as any);

    if (!account) {
      account = await prisma.investmentAccount.create({
        data: {
          userId,
          groupId,
          status: 'PENDING',
          riskTolerance: 'MODERATE',
          kycStatus: 'NOT_STARTED',
          cashBalance: 0,
          totalValue: 0,
        } as any,
      });
    }

    return account;
  }

  /**
   * Update account status (e.g., after KYC)
   */
  async updateAccountStatus(userId: string, status: InvestmentAccountStatus) {
    return prisma.investmentAccount.update({
      where: { userId },
      data: { status },
    });
  }

  /**
   * Update risk tolerance
   */
  async updateRiskProfile(userId: string, riskTolerance: RiskTolerance) {
    return prisma.investmentAccount.update({
      where: { userId },
      data: { riskTolerance },
    });
  }

  /**
   * Deposit cash into investment account
   */
  async depositCash(userId: string, amount: number, description?: string) {
    const account = await this.getOrCreateAccount(userId);

    if (account.status !== 'ACTIVE') {
      throw new BadRequestError('Investment account must be active to deposit funds');
    }

    // Use transaction to update balance and record ledger entry
    return prisma.$transaction(async (tx) => {
      const updatedAccount = await tx.investmentAccount.update({
        where: { id: account.id },
        data: {
          cashBalance: { increment: amount },
          totalValue: { increment: amount },
        },
      });

      await tx.investmentTransaction.create({
        data: {
          accountId: account.id,
          transactionType: 'DEPOSIT',
          amount,
          currencyCode: account.currencyCode,
          description: description || 'Cash Deposit',
        },
      });

      return updatedAccount;
    });
  }

  /**
   * Withdraw cash from investment account
   */
  async withdrawCash(userId: string, amount: number) {
    const account = await prisma.investmentAccount.findUnique({
      where: { userId },
    });

    if (!account || account.status !== 'ACTIVE') {
      throw new BadRequestError('Active investment account not found');
    }

    if (Number(account.cashBalance) < amount) {
      throw new BadRequestError('Insufficient cash balance');
    }

    return prisma.$transaction(async (tx) => {
      const updatedAccount = await tx.investmentAccount.update({
        where: { id: account.id },
        data: {
          cashBalance: { decrement: amount },
          totalValue: { decrement: amount },
        },
      });

      await tx.investmentTransaction.create({
        data: {
          accountId: account.id,
          transactionType: 'WITHDRAWAL',
          amount,
          currencyCode: account.currencyCode,
          description: 'Cash Withdrawal',
        },
      });

      return updatedAccount;
    });
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(userId: string, limit = 20) {
    const account = await prisma.investmentAccount.findUnique({
      where: { userId },
    });

    if (!account) return [];

    return prisma.investmentTransaction.findMany({
      where: { accountId: account.id },
      orderBy: { transactionDate: 'desc' },
      take: limit,
      include: {
        product: {
          select: {
            symbol: true,
            name: true,
          }
        }
      }
    });
  }

  /**
   * Reinvest funds from a completed savings goal into investment account
   */
  async reinvestFromSavings(userId: string, goalId: string) {
    const goal = await prisma.savingsGoal.findUnique({
      where: { id: goalId },
      include: { group: true } as any
    });

    if (!goal) {
      throw new NotFoundError('Savings goal not found');
    }

    if (goal.userId !== userId) {
      throw new BadRequestError('Goal does not belong to user');
    }

    if (goal.status === 'COMPLETED' && (goal as any).withdrawnAt) {
      throw new BadRequestError('Funds from this goal have already been processed (withdrawn/reinvested)');
    }

    const groupId = (goal as any).groupId;
    if (!groupId) {
      throw new BadRequestError('Savings goal is not linked to any group');
    }

    if ((goal as any).group && !(goal as any).group.allowMicroInvestments) {
      throw new BadRequestError('Micro-investments are disabled for this group by the Administrator');
    }

    const currentAmount = Number(goal.currentAmount);
    if (currentAmount <= 0) {
      throw new BadRequestError('No funds available for reinvestment');
    }

    // Apply admin fee (could be shared with MicroSavingsService)
    const ADMIN_FEE_PERCENTAGE = 0.02; 
    const adminFee = currentAmount * ADMIN_FEE_PERCENTAGE;
    const reinvestmentAmount = currentAmount - adminFee;

    const account = await this.getOrCreateAccount(userId, (goal as any).groupId);

    // Active account required for reinvestment? 
    // Usually yes, but we can auto-activate or require manual activation.
    // For now, let's allow if account exists, but maybe check status.
    if (account.status !== 'ACTIVE') {
      // In a real flow, we might auto-activate or throw error.
      // throw new BadRequestError('Investment account must be active to reinvest funds');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Update Savings Goal
      await tx.savingsGoal.update({
        where: { id: goalId },
        data: {
          status: 'COMPLETED',
          withdrawnAmount: reinvestmentAmount,
          adminFeeApplied: adminFee,
          withdrawnAt: new Date(),
        } as any,
      });

      // 2. Update Investment Account
      const updatedAccount = await tx.investmentAccount.update({
        where: { id: account.id },
        data: {
          cashBalance: { increment: reinvestmentAmount },
          totalValue: { increment: reinvestmentAmount },
        },
      });

      // 3. Create Investment Transaction linked to Savings Goal
      await tx.investmentTransaction.create({
        data: {
          accountId: account.id,
          transactionType: 'DEPOSIT',
          amount: reinvestmentAmount,
          currencyCode: account.currencyCode,
          description: `Reinvestment from goal: ${goal.name}`,
          savingsGoalId: goal.id,
        } as any,
      });

      return updatedAccount;
    });
  }
}
