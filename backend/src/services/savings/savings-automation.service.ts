import { AutomationRuleType } from '@prisma/client';
import prisma from '@/lib/prisma';

export class SavingsAutomationService {
  /**
   * Create a new round-up rule
   */
  async createRoundUpRule(userId: string, goalId: string, roundUpTo: number = 1) {
    const automation = await prisma.savingsAutomation.create({
      data: {
        userId,
        savingsGoalId: goalId,
        ruleType: 'ROUND_UP',
        isActive: true,
        configuration: {
          roundUpTo, // e.g. 1, 5, or 10
        },
        currencyCode: 'KES',
      },
    });

    return automation;
  }

  /**
   * Executes round-up logic based on a transaction amount
   */
  async executeRoundUp(automationId: string, transactionAmount: number) {
    const automation = await prisma.savingsAutomation.findUnique({
      where: { id: automationId },
    });

    if (!automation || !automation.isActive) return null;
    if (!automation.savingsGoalId) return null;

    const config = automation.configuration as any;
    const roundUpTo = config.roundUpTo || 1;

    // Calculate round-up (e.g., if transaction is 18.50 and roundUpTo is 1, remainder is 0.50, roundUp is 0.50)
    const remainder = transactionAmount % roundUpTo;
    const roundUpAmount = remainder === 0 ? 0 : roundUpTo - remainder;

    if (roundUpAmount > 0) {
      // Record the automation deposit
      const deposit = await prisma.savingsDeposit.create({
        data: {
          savingsGoalId: automation.savingsGoalId,
          userId: automation.userId,
          amount: roundUpAmount,
          currencyCode: automation.currencyCode,
          source: 'automation',
          automationId: automation.id,
        },
      });

      // Update total saved for this automation
      await prisma.savingsAutomation.update({
        where: { id: automationId },
        data: {
          lastExecuted: new Date(),
          totalSaved: { increment: roundUpAmount },
        },
      });

      // Update the goal's current amount
      await prisma.savingsGoal.update({
        where: { id: automation.savingsGoalId },
        data: {
          currentAmount: { increment: roundUpAmount },
        },
      });

      return deposit;
    }

    return null;
  }

  /**
   * Create a percentage-based savings rule
   */
  async createPercentageRule(userId: string, goalId: string, percentage: number) {
    if (percentage <= 0 || percentage > 100) {
      throw new Error('Percentage must be between 1 and 100');
    }

    const automation = await prisma.savingsAutomation.create({
      data: {
        userId,
        savingsGoalId: goalId,
        ruleType: 'PERCENTAGE_SAVE',
        isActive: true,
        configuration: {
          percentage,
        },
        currencyCode: 'KES',
      },
    });

    return automation;
  }

  /**
   * Execute percentage savings rule when income is detected
   */
  async executePercentageSave(automationId: string, incomeAmount: number) {
    const automation = await prisma.savingsAutomation.findUnique({
      where: { id: automationId },
    });

    if (!automation || !automation.isActive || !automation.savingsGoalId) return null;

    const config = automation.configuration as any;
    const percentage = config.percentage || 0;

    const saveAmount = (incomeAmount * percentage) / 100;

    if (saveAmount > 0) {
      const deposit = await prisma.savingsDeposit.create({
        data: {
          savingsGoalId: automation.savingsGoalId,
          userId: automation.userId,
          amount: saveAmount,
          currencyCode: automation.currencyCode,
          source: 'automation',
          automationId: automation.id,
        },
      });

      await prisma.savingsAutomation.update({
        where: { id: automationId },
        data: {
          lastExecuted: new Date(),
          totalSaved: { increment: saveAmount },
        },
      });

      await prisma.savingsGoal.update({
        where: { id: automation.savingsGoalId },
        data: {
          currentAmount: { increment: saveAmount },
        },
      });

      return deposit;
    }

    return null;
  }
}
