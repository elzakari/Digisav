import { PrismaClient, PaymentMethod, TransactionType, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { generateHash } from '@/utils/crypto';
import { NotFoundError, ValidationError, ConflictError } from '@/utils/errors';
import { LedgerService } from '@/services/ledger/ledger.service';
import { NotificationService } from '@/services/notifications/notification.service';

interface RecordContributionData {
  memberId: string;
  groupId: string;
  amount: number;
  currencyCode: string;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  recordedBy: string;
  notes?: string;
  isPersonalSavings?: boolean;
}

export class ContributionService {
  private ledgerService: LedgerService;
  private prisma: PrismaClient;
  private notificationService: NotificationService;

  constructor(ledgerService?: LedgerService, prismaClient?: PrismaClient) {
    this.ledgerService = ledgerService || new LedgerService();
    this.prisma = prismaClient || prisma;
    this.notificationService = new NotificationService();
  }

  async recordContribution(data: RecordContributionData) {
    // 1. Validate member and group
    const member = await this.prisma.member.findUnique({
      where: { id: data.memberId },
      include: { group: true, user: true },
    });

    if (!member || member.groupId !== data.groupId) {
      throw new NotFoundError('Member not found in group');
    }

    const startDate = member.group.startDate ? new Date(member.group.startDate) : new Date();

    if (data.isPersonalSavings) {
      // Handle Personal Savings (Micro-Savings)
      const microSavingsGoal = await this.prisma.savingsGoal.findFirst({
        where: {
          userId: member.userId,
          groupId: data.groupId,
          category: 'MICRO_SAVINGS' as any,
          status: 'ACTIVE'
        }
      });

      if (!microSavingsGoal) {
        throw new NotFoundError('No active micro-savings goal found for this member');
      }

      const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // 1. Create Savings Deposit
        const deposit = await tx.savingsDeposit.create({
          data: {
            savingsGoalId: microSavingsGoal.id,
            userId: member.userId,
            amount: data.amount,
            currencyCode: data.currencyCode,
            source: 'ADMIN_RECORDED',
            referenceNumber: data.referenceNumber,
            notes: data.notes,
            depositDate: data.paymentDate,
          }
        });

        // 2. Update Goal Current Amount
        const newAmount = Number(microSavingsGoal.currentAmount) + Number(data.amount);
        await tx.savingsGoal.update({
          where: { id: microSavingsGoal.id },
          data: { currentAmount: newAmount }
        });

        // 3. Create transaction in ledger
        await this.ledgerService.createTransaction({
          groupId: data.groupId,
          memberId: data.memberId,
          transactionType: TransactionType.CONTRIBUTION, // Reusing CONTRIBUTION for now
          amount: data.amount,
          currencyCode: data.currencyCode,
          referenceId: deposit.id,
          recordedBy: data.recordedBy,
          metadata: {
            depositId: deposit.id,
            goalId: microSavingsGoal.id,
            type: 'PERSONAL_SAVINGS',
            paymentMethod: data.paymentMethod,
          },
        });

        return deposit;
      });

      // Notify Member
      try {
        await this.notificationService.createNotification({
          userId: member.userId,
          groupId: data.groupId,
          type: 'PAYMENT_RECEIVED',
          title: 'Personal Savings Recorded',
          body: `A personal savings deposit of ${data.currencyCode} ${data.amount} has been added to your account.`,
        });
      } catch (err) {
        console.error('Failed to notify member', err);
      }

      return result;
    }

    // --- Original Group Savings Logic ---
    // 2. Auto-detect cycle number (oldest unpaid, or next cycle)
    const unpaidContribution = await this.prisma.contribution.findFirst({
      where: {
        groupId: data.groupId,
        memberId: data.memberId,
        status: { in: ['PENDING', 'OVERDUE', 'DEFAULTED'] },
      },
      orderBy: { cycleNumber: 'asc' },
    });

    let cycleNumber: number;
    if (unpaidContribution) {
      cycleNumber = unpaidContribution.cycleNumber;
    } else {
      const latestContribution = await this.prisma.contribution.findFirst({
        where: {
          groupId: data.groupId,
          memberId: data.memberId,
        },
        orderBy: { cycleNumber: 'desc' },
      });
      cycleNumber = latestContribution ? latestContribution.cycleNumber + 1 : 1;
    }

    // 3. Sanity check for duplicate
    const existing = await this.prisma.contribution.findUnique({
      where: {
        groupId_memberId_cycleNumber: {
          groupId: data.groupId,
          memberId: data.memberId,
          cycleNumber,
        },
      },
    });

    if (existing && existing.status === 'COMPLETED') {
      throw new ConflictError('A completed contribution already exists for this cycle');
    }

    // 4. Generate contribution hash (SHA-256)
    const dueDate = this.calculateDueDate(startDate, cycleNumber, member.group.paymentFrequency);
    const hash = generateHash({ ...data, cycleNumber, dueDate });

    // 5. Create/Update contribution record
    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const contribution = await tx.contribution.upsert({
        where: {
          groupId_memberId_cycleNumber: {
            groupId: data.groupId,
            memberId: data.memberId,
            cycleNumber,
          },
        },
        update: {
          ...data,
          dueDate,
          hash,
          status: 'COMPLETED',
        },
        create: {
          ...data,
          cycleNumber,
          dueDate,
          hash,
          status: 'COMPLETED',
        },
      });

      // 6. Create transaction in ledger
      await this.ledgerService.createTransaction({
        groupId: data.groupId,
        memberId: data.memberId,
        transactionType: TransactionType.CONTRIBUTION,
        amount: data.amount,
        currencyCode: data.currencyCode,
        referenceId: contribution.id,
        recordedBy: data.recordedBy,
        metadata: {
          contributionId: contribution.id,
          cycleNumber,
          paymentMethod: data.paymentMethod,
        },
      });

      return contribution;
    });

    // 7. Send In-App Notifications
    try {
      // Member notification
      await this.notificationService.createNotification({
        userId: member.userId,
        groupId: data.groupId,
        type: 'PAYMENT_RECEIVED',
        title: 'Payment Recorded',
        body: `Your payment of ${data.currencyCode} ${data.amount} for Cycle ${cycleNumber} has been received.`,
      });

      // Admin notification (if the member is not the admin)
      if (member.userId !== member.group.adminUserId) {
        await this.notificationService.createNotification({
          userId: member.group.adminUserId,
          groupId: data.groupId,
          type: 'PAYMENT_RECEIVED',
          title: 'Member Payment Received',
          body: `${member.user?.fullName || 'A member'} has paid ${data.currencyCode} ${data.amount} for Cycle ${cycleNumber}.`,
        });
      }
    } catch (err) {
      console.error('Failed to create notification', err);
    }

    return result;
  }

  async verifyLedgerIntegrity(groupId: string) {
    return this.ledgerService.verifyChain(groupId);
  }

  async getGroupStats(groupId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { _count: { select: { members: true } } },
    });

    if (!group) throw new NotFoundError('Group');

    const totalCollected = await prisma.contribution.aggregate({
      where: { groupId, status: 'COMPLETED' },
      _sum: { amount: true },
    });

    const activeMembersCount = await prisma.member.count({
      where: { groupId, status: 'ACTIVE' },
    });

    const currentCycle = this.calculateCycleNumber(
      group.startDate || new Date(),
      new Date(),
      group.paymentFrequency
    );
    const totalExpected = activeMembersCount * Number(group.contributionAmount) * currentCycle;

    return {
      totalExpected,
      totalCollected: Number(totalCollected._sum.amount || 0),
      outstanding: Math.max(0, totalExpected - Number(totalCollected._sum.amount || 0)),
      complianceRate: totalExpected > 0 ? (Number(totalCollected._sum.amount || 0) / totalExpected) * 100 : 0,
      currentCycle,
      activeMembers: activeMembersCount,
      currencyCode: group.currencyCode,
    };
  }

  async getContributionHistory(groupId: string, memberId?: string) {
    const whereClause: any = { groupId };
    if (memberId) {
      whereClause.memberId = memberId;
    }

    return prisma.contribution.findMany({
      where: whereClause,
      include: {
        member: {
          include: { user: { select: { fullName: true } } }
        },
        recorder: { select: { fullName: true } }
      },
      orderBy: [{ cycleNumber: 'desc' }, { paymentDate: 'desc' }],
    });
  }

  private calculateCycleNumber(startDate: Date, targetDate: Date, frequency: string): number {
    const start = new Date(startDate);
    const target = new Date(targetDate);

    if (target < start) return 1;

    switch (frequency) {
      case 'WEEKLY':
        return Math.floor((target.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
      case 'BIWEEKLY':
        return Math.floor((target.getTime() - start.getTime()) / (14 * 24 * 60 * 60 * 1000)) + 1;
      case 'MONTHLY':
        return (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth()) + 1;
      case 'DAILY':
        return Math.floor((target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      default:
        return (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth()) + 1;
    }
  }

  private calculateDueDate(startDate: Date, cycleNumber: number, frequency: string): Date {
    const dueDate = new Date(startDate);

    switch (frequency) {
      case 'WEEKLY':
        dueDate.setDate(dueDate.getDate() + (cycleNumber - 1) * 7);
        break;
      case 'BIWEEKLY':
        dueDate.setDate(dueDate.getDate() + (cycleNumber - 1) * 14);
        break;
      case 'MONTHLY':
        dueDate.setMonth(dueDate.getMonth() + (cycleNumber - 1));
        break;
      case 'DAILY':
        dueDate.setDate(dueDate.getDate() + (cycleNumber - 1));
        break;
      default:
        dueDate.setMonth(dueDate.getMonth() + (cycleNumber - 1));
    }

    return dueDate;
  }

  async getCalendarData(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { members: { include: { user: true } } },
    });

    if (!group) throw new NotFoundError('Group');

    const contributions = await this.prisma.contribution.findMany({
      where: { groupId },
      include: { member: { include: { user: true } } },
      orderBy: { paymentDate: 'desc' },
    });

    return { group, contributions };
  }
}
