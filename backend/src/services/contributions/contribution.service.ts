import { PrismaClient, PaymentMethod, TransactionType, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { generateHash } from '@/utils/crypto';
import { generateTransactionReference } from '@/utils/generators';
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

interface UpdateContributionData {
  groupId: string;
  contributionId: string;
  userId: string;
  userRole: string;
  amount?: number;
  paymentDate?: Date;
  paymentMethod?: PaymentMethod;
  referenceNumber?: string | null;
  notes?: string | null;
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
        const depositRef = data.referenceNumber || generateTransactionReference(data.paymentMethod, 'CONTRIBUTION', data.paymentDate);
        
        if (member.group.groupType === 'MICRO_SAVINGS' && microSavingsGoal.targetDate) {
          const pd = new Date(data.paymentDate);
          const paymentDay = new Date(pd.getFullYear(), pd.getMonth(), pd.getDate());
          const td = new Date(microSavingsGoal.targetDate);
          const targetDay = new Date(td.getFullYear(), td.getMonth(), td.getDate());

          if (paymentDay >= targetDay) {
            const feeRef = data.referenceNumber || generateTransactionReference(data.paymentMethod, 'FEE', data.paymentDate);
            const deposit = await tx.savingsDeposit.create({
              data: {
                savingsGoalId: microSavingsGoal.id,
                userId: member.userId,
                amount: data.amount,
                currencyCode: data.currencyCode,
                source: 'ADMIN_RECORDED_COMMISSION',
                referenceNumber: feeRef,
                notes: data.notes || 'Admin commission (final day)',
                depositDate: data.paymentDate,
              },
            });

            const ledgerService = new LedgerService(tx as any);
            await ledgerService.createTransaction({
              groupId: data.groupId,
              memberId: data.memberId,
              transactionType: TransactionType.FEE,
              amount: data.amount,
              currencyCode: data.currencyCode,
              referenceId: deposit.id,
              recordedBy: data.recordedBy,
              metadata: {
                depositId: deposit.id,
                goalId: microSavingsGoal.id,
                type: 'MICRO_SAVINGS_COMMISSION',
                paymentMethod: data.paymentMethod,
              },
            });

            return deposit;
          }
        }

        // 1. Create Savings Deposit
        const deposit = await tx.savingsDeposit.create({
          data: {
            savingsGoalId: microSavingsGoal.id,
            userId: member.userId,
            amount: data.amount,
            currencyCode: data.currencyCode,
            source: 'ADMIN_RECORDED',
            referenceNumber: depositRef,
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
        const ledgerService = new LedgerService(tx as any);
        await ledgerService.createTransaction({
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

    const finalReferenceNumber = data.referenceNumber || generateTransactionReference(data.paymentMethod, 'CONTRIBUTION', data.paymentDate);

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
          referenceNumber: finalReferenceNumber,
          dueDate,
          hash,
          status: 'COMPLETED',
        },
        create: {
          ...data,
          referenceNumber: finalReferenceNumber,
          cycleNumber,
          dueDate,
          hash,
          status: 'COMPLETED',
        },
      });

      // 6. Create transaction in ledger
      const ledgerService = new LedgerService(tx as any);
      await ledgerService.createTransaction({
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

      if (member.group.groupType === 'TONTINE' && Number(member.group.groupFeePercentage || 0) > 0) {
        const [activeMembersCount, completedCount] = await Promise.all([
          tx.member.count({ where: { groupId: data.groupId, status: 'ACTIVE' } }),
          tx.contribution.count({
            where: {
              groupId: data.groupId,
              cycleNumber,
              status: 'COMPLETED',
            },
          }),
        ]);

        if (activeMembersCount > 0 && completedCount >= activeMembersCount) {
          const existingFee = await tx.transaction.findFirst({
            where: {
              groupId: data.groupId,
              transactionType: TransactionType.FEE,
              AND: [
                {
                  metadata: {
                    path: ['type'],
                    equals: 'TONTINE_COMMISSION',
                  },
                },
                {
                  metadata: {
                    path: ['cycleNumber'],
                    equals: cycleNumber,
                  },
                },
              ],
            } as any,
          });

          if (!existingFee) {
            const total = activeMembersCount * Number(member.group.contributionAmount);
            const commissionPct = Number(member.group.groupFeePercentage);
            const commission = Number(((total * commissionPct) / 100).toFixed(2));

            const adminMember = await tx.member.findUnique({
              where: {
                groupId_userId: {
                  groupId: data.groupId,
                  userId: member.group.adminUserId,
                },
              },
              select: { id: true },
            });

            if (commission > 0) {
              await ledgerService.createTransaction({
                groupId: data.groupId,
                memberId: adminMember?.id,
                transactionType: TransactionType.FEE,
                amount: commission,
                currencyCode: data.currencyCode,
                recordedBy: member.group.adminUserId,
                metadata: {
                  type: 'TONTINE_COMMISSION',
                  cycleNumber,
                  feePercentage: commissionPct,
                  baseAmount: total,
                },
              });
            }
          }
        }
      }

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

  async updateContribution(data: UpdateContributionData) {
    const group = await this.prisma.group.findUnique({ where: { id: data.groupId } });
    if (!group) throw new NotFoundError('Group');

    const canEdit = group.adminUserId === data.userId || data.userRole === 'SYS_ADMIN' || data.userRole === 'ADMIN';
    if (!canEdit) throw new ValidationError('Insufficient permissions to update record');

    if (group.groupType === 'MICRO_SAVINGS') {
      const existingDeposit = await this.prisma.savingsDeposit.findUnique({
        where: { id: data.contributionId },
        include: { savingsGoal: true },
      });

      if (!existingDeposit || existingDeposit.savingsGoal.groupId !== data.groupId) {
        throw new NotFoundError('Savings Deposit');
      }

      const nextAmount = data.amount !== undefined ? data.amount : Number(existingDeposit.amount);
      const nextPaymentDate = data.paymentDate ?? existingDeposit.depositDate;
      const nextReferenceNumber = data.referenceNumber !== undefined ? data.referenceNumber : existingDeposit.referenceNumber;
      const nextNotes = data.notes !== undefined ? data.notes : existingDeposit.notes;

      return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const deposit = await tx.savingsDeposit.update({
          where: { id: existingDeposit.id },
          data: {
            amount: nextAmount,
            depositDate: nextPaymentDate,
            referenceNumber: nextReferenceNumber as any,
            notes: nextNotes as any,
          },
        });

        const delta = Number(nextAmount) - Number(existingDeposit.amount);

        if (delta !== 0) {
          const newAmount = Number(existingDeposit.savingsGoal.currentAmount) + delta;
          await tx.savingsGoal.update({
            where: { id: existingDeposit.savingsGoalId },
            data: { currentAmount: newAmount }
          });
        }

        const ledgerService = new LedgerService(tx as any);
        await ledgerService.createTransaction({
          groupId: data.groupId,
          memberId: existingDeposit.savingsGoal.memberId,
          transactionType: TransactionType.ADJUSTMENT,
          amount: delta,
          currencyCode: existingDeposit.currencyCode,
          referenceId: existingDeposit.id,
          recordedBy: data.userId,
          metadata: {
            type: 'DEPOSIT_EDIT',
            depositId: existingDeposit.id,
            old: {
              amount: Number(existingDeposit.amount),
              paymentDate: existingDeposit.depositDate,
              referenceNumber: existingDeposit.referenceNumber,
              notes: existingDeposit.notes,
            },
            new: {
              amount: Number(nextAmount),
              paymentDate: nextPaymentDate,
              referenceNumber: nextReferenceNumber,
              notes: nextNotes,
            },
          },
        });

        return deposit;
      });
    }

    const existing = await this.prisma.contribution.findUnique({
      where: { id: data.contributionId },
      include: { member: { include: { group: true } }, group: true },
    });

    if (!existing || existing.groupId !== data.groupId) {
      throw new NotFoundError('Contribution');
    }

    const nextAmount = data.amount !== undefined ? data.amount : Number(existing.amount);
    const nextPaymentDate = data.paymentDate ?? existing.paymentDate;
    const nextPaymentMethod = data.paymentMethod ?? existing.paymentMethod;
    const nextReferenceNumber = data.referenceNumber !== undefined ? data.referenceNumber : existing.referenceNumber;
    const nextNotes = data.notes !== undefined ? data.notes : existing.notes;

    const startDate = group.startDate ? new Date(group.startDate) : new Date(group.createdAt);
    const dueDate = this.calculateDueDate(startDate, existing.cycleNumber, group.paymentFrequency);

    const hash = generateHash({
      memberId: existing.memberId,
      groupId: existing.groupId,
      amount: nextAmount,
      currencyCode: existing.currencyCode,
      paymentDate: nextPaymentDate,
      paymentMethod: nextPaymentMethod,
      referenceNumber: nextReferenceNumber ?? undefined,
      notes: nextNotes ?? undefined,
      recordedBy: existing.recordedBy,
      cycleNumber: existing.cycleNumber,
      dueDate,
    } as any);

    const updated = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const contribution = await tx.contribution.update({
        where: { id: existing.id },
        data: {
          amount: nextAmount,
          paymentDate: nextPaymentDate,
          paymentMethod: nextPaymentMethod,
          referenceNumber: nextReferenceNumber as any,
          notes: nextNotes as any,
          dueDate,
          hash,
        },
      });

      const delta = Number(nextAmount) - Number(existing.amount);

      const ledgerService = new LedgerService(tx as any);
      await ledgerService.createTransaction({
        groupId: existing.groupId,
        memberId: existing.memberId,
        transactionType: TransactionType.ADJUSTMENT,
        amount: delta,
        currencyCode: existing.currencyCode,
        referenceId: existing.id,
        recordedBy: data.userId,
        metadata: {
          type: 'CONTRIBUTION_EDIT',
          contributionId: existing.id,
          old: {
            amount: Number(existing.amount),
            paymentDate: existing.paymentDate,
            paymentMethod: existing.paymentMethod,
            referenceNumber: existing.referenceNumber,
            notes: existing.notes,
          },
          new: {
            amount: Number(nextAmount),
            paymentDate: nextPaymentDate,
            paymentMethod: nextPaymentMethod,
            referenceNumber: nextReferenceNumber,
            notes: nextNotes,
          },
        },
      });

      return contribution;
    });

    return updated;
  }

  async verifyLedgerIntegrity(groupId: string) {
    return this.ledgerService.verifyChain(groupId);
  }

  async getGroupStats(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { _count: { select: { members: true } } },
    });

    if (!group) throw new NotFoundError('Group');
    if (group.status === 'DELETED') throw new NotFoundError('Group');

    const totalCollected = await this.prisma.contribution.aggregate({
      where: { groupId, status: 'COMPLETED' },
      _sum: { amount: true },
    });

    const activeMembersCount = await this.prisma.member.count({
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

    return this.prisma.contribution.findMany({
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
    if (group.status === 'DELETED') throw new NotFoundError('Group');

    const contributions = await this.prisma.contribution.findMany({
      where: { groupId },
      include: { member: { include: { user: true } } },
      orderBy: { paymentDate: 'desc' },
    });

    return { group, contributions };
  }
}
