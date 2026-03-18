import { SavingsGoalStatus, TransactionType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { LedgerService } from '../ledger/ledger.service';

export class MicroSavingsService {
  private ADMIN_FEE_PERCENTAGE = 0.02; // 2% fee
  private ledgerService = new LedgerService();

  /**
   * Request withdrawal from a micro savings goal
   */
  async requestWithdrawal(goalId: string, userId: string) {
    const goal = await prisma.savingsGoal.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      throw new NotFoundError('Savings goal not found');
    }

    if (goal.userId !== userId) {
      throw new BadRequestError('Goal does not belong to user');
    }

    if (goal.status === 'COMPLETED' && (goal as any).withdrawnAt) {
      throw new BadRequestError('Funds have already been withdrawn');
    }

    if (!(goal as any).groupId) {
      throw new BadRequestError('Savings goal is not linked to any group');
    }

    const currentAmount = Number(goal.currentAmount);
    if (currentAmount <= 0) {
      throw new BadRequestError('No funds available for withdrawal');
    }

    const member = await prisma.member.findFirst({
      where: { userId, groupId: (goal as any).groupId, status: 'ACTIVE' }
    });

    if (!member) {
      throw new BadRequestError('User is not an active member of this group');
    }

    const existingPending = await prisma.withdrawalRequest.findFirst({
      where: { savingsGoalId: goalId, status: 'PENDING' } as any
    });

    if (existingPending) {
      throw new BadRequestError('A withdrawal request is already pending for this goal');
    }

    const request = await prisma.withdrawalRequest.create({
      data: {
        savingsGoalId: goalId,
        memberId: member.id,
        groupId: (goal as any).groupId,
        amount: currentAmount,
        status: 'PENDING'
      } as any
    });

    return {
      message: 'Withdrawal request submitted successfully to the Group Admin',
      request
    };
  }

  /**
   * Get pending withdrawal requests for a group
   */
  async getGroupWithdrawalRequests(groupId: string) {
    return prisma.withdrawalRequest.findMany({
      where: { groupId } as any,
      include: {
        member: {
          include: { user: { select: { fullName: true, email: true } } }
        },
        savingsGoal: { select: { name: true, currentAmount: true } }
      } as any,
      orderBy: { requestedAt: 'desc' } as any
    });
  }

  /**
   * Approve a withdrawal request
   */
  async approveWithdrawalRequest(requestId: string, adminUserId: string) {
    const request = await prisma.withdrawalRequest.findUnique({
      where: { id: requestId } as any,
      include: { savingsGoal: true, group: true } as any
    });

    if (!request) {
      throw new NotFoundError('Withdrawal request not found');
    }

    if ((request as any).status !== 'PENDING') {
      throw new BadRequestError(`Cannot approve a request with status ${(request as any).status}`);
    }

    const goal = (request as any).savingsGoal;
    const currentAmount = Number(goal.currentAmount);
    const adminFee = currentAmount * this.ADMIN_FEE_PERCENTAGE;
    const finalAmount = currentAmount - adminFee;

    return prisma.$transaction(async (tx) => {
      // Complete the savings goal
      await tx.savingsGoal.update({
        where: { id: goal.id },
        data: {
          status: 'COMPLETED',
          withdrawnAmount: finalAmount,
          adminFeeApplied: adminFee,
          withdrawnAt: new Date(),
        } as any,
      });

      // Update the request status
      const updatedRequest = await tx.withdrawalRequest.update({
        where: { id: requestId } as any,
        data: {
          status: 'APPROVED',
          processedAt: new Date(),
          processedBy: adminUserId
        } as any
       });
 
       // 3. Record Payout in Ledger
       await tx.transaction.create({
         data: {
           groupId: request.groupId,
           memberId: request.memberId,
           transactionType: TransactionType.PAYOUT,
           amount: currentAmount,
           currencyCode: goal.currencyCode,
           referenceId: requestId,
           recordedBy: adminUserId,
           metadata: {
             requestId,
             goalId: goal.id,
             adminFee,
             netAmount: finalAmount,
             type: 'MICRO_SAVINGS_WITHDRAWAL'
           } as any,
           hash: 'PENDING', // Will be hashed appropriately by ledger service or trigger
         }
       });
 
       return updatedRequest;
    });
  }

  /**
   * Deny a withdrawal request
   */
  async denyWithdrawalRequest(requestId: string, adminUserId: string) {
    const request = await prisma.withdrawalRequest.findUnique({
      where: { id: requestId } as any
    });

    if (!request) {
      throw new NotFoundError('Withdrawal request not found');
    }

    if ((request as any).status !== 'PENDING') {
      throw new BadRequestError(`Cannot deny a request with status ${(request as any).status}`);
    }

    return prisma.withdrawalRequest.update({
      where: { id: requestId } as any,
      data: {
        status: 'DENIED',
        processedAt: new Date(),
        processedBy: adminUserId
      } as any
    });
  }

  /**
   * Toggle user participation in group savings
   */
  async toggleGroupParticipation(userId: string, optedOut: boolean) {
    return prisma.user.update({
      where: { id: userId },
      data: { optedOutOfGroupSavings: optedOut } as any,
    });
  }
}
