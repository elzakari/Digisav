import { SavingsGoalStatus, TransactionType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { LedgerService } from '@/services/ledger/ledger.service';
import { NotificationService } from '@/services/notifications/notification.service';
import { NotFoundError, ValidationError } from '@/utils/errors';

export class SavingsGoalService {
  private ledgerService = new LedgerService();
  private notificationService = new NotificationService();

  /**
   * Create a new personal savings goal
   */
  async createGoal(userId: string, data: {
    name: string;
    description?: string;
    targetAmount: number;
    targetDate?: Date;
    category: any; // SavingsGoalCategory enum
    isPublic?: boolean;
    currencyCode?: string;
    groupId?: string;
  }) {
    // Validation
    if (data.targetAmount <= 0) {
      throw new ValidationError('Target amount must be greater than 0');
    }

    if (data.targetDate && new Date(data.targetDate) < new Date()) {
      throw new ValidationError('Target date cannot be in the past');
    }

    if (!data.groupId) {
      throw new ValidationError('A Micro‑Savings group is required to create a goal');
    }

    const group = await prisma.group.findUnique({
      where: { id: data.groupId },
      select: { id: true, groupType: true, status: true, currencyCode: true },
    });
    if (!group) throw new NotFoundError('Group');
    if (group.groupType !== 'MICRO_SAVINGS') {
      throw new ValidationError('Goals must be linked to a Micro‑Savings group');
    }
    if (group.status !== 'ACTIVE') {
      throw new ValidationError('Micro‑Savings group must be active to create goals');
    }

    const membership = await prisma.member.findFirst({
      where: {
        groupId: group.id,
        userId,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    if (!membership) {
      throw new ValidationError('You must be an active member of this Micro‑Savings group');
    }

    const currencyCode = group.currencyCode || 'KES';

    // Create goal
    const goal = await prisma.savingsGoal.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        targetAmount: data.targetAmount,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        category: data.category,
        isPublic: data.isPublic || false,
        currencyCode,
        status: 'ACTIVE',
        currentAmount: 0,
        groupId: data.groupId,
      },
    });

    return goal;
  }

  /**
   * Records a manual or automated deposit to a goal
   */
  async makeDeposit(goalId: string, userId: string, amount: number, source: string = 'manual') {
    const goal = await prisma.savingsGoal.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      throw new Error('Savings goal not found');
    }

    if (goal.userId !== userId) {
      throw new Error('Goal does not belong to user');
    }

    if (goal.status !== 'ACTIVE') {
      throw new Error('Goal is not active');
    }

    const group = goal.groupId
      ? await prisma.group.findUnique({ where: { id: goal.groupId } })
      : null;

    const isMicroSavingsGroup =
      goal.category === ('MICRO_SAVINGS' as any) &&
      !!goal.groupId &&
      group?.groupType === 'MICRO_SAVINGS' &&
      !!goal.targetDate;

    if (isMicroSavingsGroup) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const target = new Date(goal.targetDate!.getFullYear(), goal.targetDate!.getMonth(), goal.targetDate!.getDate());

      if (today >= target) {
        const deposit = await prisma.savingsDeposit.create({
          data: {
            savingsGoalId: goalId,
            userId,
            amount,
            currencyCode: goal.currencyCode,
            source: 'commission',
            depositDate: new Date(),
            notes: 'Admin commission (final day)',
          },
        });

        const member = await prisma.member.findUnique({
          where: {
            groupId_userId: {
              groupId: goal.groupId!,
              userId,
            },
          },
          select: { id: true },
        });

        await this.ledgerService.createTransaction({
          groupId: goal.groupId!,
          memberId: member?.id,
          transactionType: TransactionType.FEE,
          amount,
          currencyCode: goal.currencyCode,
          referenceId: deposit.id,
          recordedBy: userId,
          metadata: {
            type: 'MICRO_SAVINGS_COMMISSION',
            goalId,
            feeRecipientUserId: group?.adminUserId,
          },
        });

        try {
          if (group?.adminUserId) {
            await this.notificationService.createNotification({
              userId: group.adminUserId,
              groupId: goal.groupId!,
              type: 'GROUP_ANNOUNCEMENT',
              title: 'Micro-Savings Commission',
              body: `A commission payment was recorded for ${goal.name}.`,
            });
          }
        } catch {
        }

        return deposit;
      }
    }

    // Create deposit record
    const deposit = await prisma.savingsDeposit.create({
      data: {
        savingsGoalId: goalId,
        userId,
        amount,
        currencyCode: goal.currencyCode,
        source,
        depositDate: new Date(),
      },
    });

    // Update goal current amount
    const newAmount = Number(goal.currentAmount) + amount;
    await prisma.savingsGoal.update({
      where: { id: goalId },
      data: { currentAmount: newAmount },
    });

    // Check if goal completed
    if (newAmount >= Number(goal.targetAmount)) {
      await this.completeGoal(goalId);
    }

    // Check milestones
    await this.checkMilestones(goalId, goal.targetAmount, newAmount);

    return deposit;
  }

  /**
   * Mark goal as completed
   */
  private async completeGoal(goalId: string) {
    await prisma.savingsGoal.update({
      where: { id: goalId },
      data: { status: 'COMPLETED' },
    });
    
    // In a real system, trigger integration events or notifications here
  }

  /**
   * Internal logic for checking progress milestones
   */
  private async checkMilestones(goalId: string, target: any, current: number) {
    const targetNum = Number(target);
    const percentage = (current / targetNum) * 100;

    // Logic for triggering events at 25%, 50%, 75%
    // This could trigger notifications in the future
  }

  /**
   * Get detailed analytics for a goal
   */
  async getGoalAnalytics(goalId: string, userId: string) {
    const goal = await prisma.savingsGoal.findUnique({
      where: { id: goalId },
      include: {
        deposits: {
          orderBy: { depositDate: 'asc' },
        },
        group: true,
      } as any,
    });

    if (!goal || goal.userId !== userId) {
      throw new Error('Savings goal not found');
    }

    const totalDeposits = goal.deposits.length;
    const totalDeposited = (goal as any).deposits.reduce((sum: any, d: any) => sum + Number(d.amount), 0);
    const avgDeposit = totalDeposits > 0 ? totalDeposited / totalDeposits : 0;

    const daysActive = Math.floor(
      (new Date().getTime() - goal.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const progressPercentage = (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100;

    // Calculate estimated completion date based on average savings speed
    let estimatedCompletion = null;
    const dailyAverage = daysActive > 0 ? totalDeposited / daysActive : totalDeposited;
    
    if (dailyAverage > 0) {
      const remaining = Number(goal.targetAmount) - Number(goal.currentAmount);
      const daysNeeded = Math.ceil(remaining / dailyAverage);
      estimatedCompletion = new Date();
      estimatedCompletion.setDate(estimatedCompletion.getDate() + daysNeeded);
    }

    return {
      goal: {
        id: goal.id,
        name: goal.name,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        status: goal.status,
        targetDate: goal.targetDate,
      },
      stats: {
        totalDeposits,
        totalDeposited,
        avgDeposit,
        daysActive,
        progressPercentage: Number(progressPercentage.toFixed(2)),
        estimatedCompletion,
        onTrack: goal.targetDate && estimatedCompletion ? (estimatedCompletion <= new Date(goal.targetDate)) : null,
      },
    };
  }

  /**
   * Get all savings goals for a user
   */
  async getGoalsByUser(userId: string, status?: SavingsGoalStatus) {
    return prisma.savingsGoal.findMany({
      where: {
        userId,
        status: status || undefined,
      },
      include: {
        group: true,
      } as any,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async deleteOrphanGoal(goalId: string, userId: string) {
    const goal = await prisma.savingsGoal.findUnique({
      where: { id: goalId },
      include: { group: { select: { id: true, groupType: true, status: true } } },
    });
    if (!goal) throw new NotFoundError('Savings goal');
    if (goal.userId !== userId) throw new ValidationError('Not allowed');

    const groupOrphan =
      !goal.groupId ||
      !goal.group ||
      goal.group.groupType !== 'MICRO_SAVINGS' ||
      goal.group.status !== 'ACTIVE';

    let membershipOrphan = false;
    if (!groupOrphan && goal.groupId) {
      const membership = await prisma.member.findFirst({
        where: { groupId: goal.groupId, userId, status: 'ACTIVE' },
        select: { id: true },
      });
      membershipOrphan = !membership;
    }

    if (!groupOrphan && !membershipOrphan) {
      throw new ValidationError('Only orphan goals can be deleted');
    }

    await prisma.$transaction([
      prisma.withdrawalRequest.deleteMany({ where: { savingsGoalId: goalId } }),
      prisma.savingsDeposit.deleteMany({ where: { savingsGoalId: goalId } }),
      prisma.savingsAutomation.deleteMany({ where: { savingsGoalId: goalId } }),
      prisma.challengeParticipation.updateMany({
        where: { savingsGoalId: goalId },
        data: { savingsGoalId: null },
      }),
      prisma.investmentTransaction.updateMany({
        where: { savingsGoalId: goalId },
        data: { savingsGoalId: null },
      }),
      prisma.savingsGoal.delete({ where: { id: goalId } }),
    ]);

    return { success: true };
  }
}
