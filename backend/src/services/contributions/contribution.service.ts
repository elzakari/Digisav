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
  publishToMemberDashboard?: boolean;
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
  publishToMemberDashboard?: boolean;
}

type PublishMicroSavingsArgs = {
  groupId: string;
  userId: string;
  userRole: string;
  publishAll: boolean;
  transactionIds?: string[];
};

export class ContributionService {
  private ledgerService: LedgerService;
  private prisma: PrismaClient;
  private notificationService: NotificationService;

  constructor(ledgerService?: LedgerService, prismaClient?: PrismaClient) {
    this.ledgerService = ledgerService || new LedgerService();
    this.prisma = prismaClient || prisma;
    this.notificationService = new NotificationService();
  }

  async getUnpublishedMicroSavings(groupId: string, userId: string, userRole: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundError('Group');

    const canEdit = group.adminUserId === userId || userRole === 'SYS_ADMIN' || userRole === 'ADMIN';
    if (!canEdit) throw new ValidationError('Insufficient permissions');

    const rows = await this.prisma.$queryRaw<Array<any>>(
      Prisma.sql`
        SELECT
          t."id",
          t."timestamp",
          t."transactionType",
          t."amount",
          t."currencyCode",
          t."referenceId",
          t."metadata",
          m."id" AS "memberId",
          u."fullName" AS "memberName"
        FROM "transactions" t
        LEFT JOIN "members" m ON m."id" = t."memberId"
        LEFT JOIN "users" u ON u."id" = m."userId"
        WHERE t."groupId"::text = ${groupId}
          AND t."isPublished" = false
          AND (
            (t."transactionType" = 'CONTRIBUTION' AND (t."metadata"->>'type') = 'PERSONAL_SAVINGS')
            OR (t."transactionType" = 'ADJUSTMENT' AND (t."metadata"->>'type') = 'DEPOSIT_EDIT')
            OR (t."transactionType" = 'FEE' AND (t."metadata"->>'type') = 'MICRO_SAVINGS_COMMISSION')
          )
        ORDER BY t."timestamp" DESC
      `
    );

    return rows.map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      transactionType: r.transactionType,
      amount: Number(r.amount || 0),
      currencyCode: r.currencyCode,
      referenceId: r.referenceId,
      metadata: r.metadata,
      member: { id: r.memberId, user: { fullName: r.memberName } },
    }));
  }

  async publishMicroSavings(args: PublishMicroSavingsArgs) {
    const group = await this.prisma.group.findUnique({ where: { id: args.groupId } });
    if (!group) throw new NotFoundError('Group');

    const canEdit = group.adminUserId === args.userId || args.userRole === 'SYS_ADMIN' || args.userRole === 'ADMIN';
    if (!canEdit) throw new ValidationError('Insufficient permissions');

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const scopeWhere = args.publishAll
        ? Prisma.sql`true`
        : Prisma.sql`"id"::text IN (${Prisma.join(args.transactionIds || [])})`;

      const unpublished = await tx.$queryRaw<Array<any>>(
        Prisma.sql`
          SELECT "id", "transactionType", "amount", "referenceId", "metadata"
          FROM "transactions"
          WHERE "groupId"::text = ${args.groupId}
            AND "isPublished" = false
            AND ${scopeWhere}
        `
      );

      if (!unpublished.length) {
        return { publishedCount: 0 };
      }

      const depositIds = Array.from(
        new Set(unpublished.map((t) => t.referenceId).filter(Boolean))
      ) as string[];

      const depositIdsBeingPublished = new Set<string>(
        unpublished
          .filter((t) => {
            const meta = (t.metadata || {}) as any;
            return t.transactionType === 'CONTRIBUTION' && meta.type === 'PERSONAL_SAVINGS' && t.referenceId;
          })
          .map((t) => t.referenceId as string)
      );

      const deposits = depositIds.length
        ? await tx.$queryRaw<Array<any>>(
            Prisma.sql`
              SELECT d."id", d."amount", d."savingsGoalId", d."isPublished", g."groupId"
              FROM "savings_deposits" d
              JOIN "savings_goals" g ON g."id" = d."savingsGoalId"
              WHERE d."id"::text IN (${Prisma.join(depositIds)})
            `
          )
        : [];

      const depositById = new Map<string, { amount: number; savingsGoalId: string; isPublished: boolean }>();
      for (const d of deposits) {
        if (d.groupId !== args.groupId) continue;
        depositById.set(d.id, { amount: Number(d.amount || 0), savingsGoalId: d.savingsGoalId, isPublished: d.isPublished === true });
      }

      for (const t of unpublished) {
        const meta = (t.metadata || {}) as any;
        const type = meta.type;
        const referenceId = t.referenceId as string | null;
        const txAmount = Number(t.amount || 0);

        if (type === 'PERSONAL_SAVINGS' && t.transactionType === 'CONTRIBUTION' && referenceId) {
          const dep = depositById.get(referenceId);
          if (dep) {
            await tx.savingsGoal.update({
              where: { id: dep.savingsGoalId },
              data: { currentAmount: { increment: dep.amount } } as any,
            });
            await tx.$executeRaw(
              Prisma.sql`
                UPDATE "savings_deposits"
                SET "isPublished" = true,
                    "publishedAt" = ${now}
                WHERE "id"::text = ${referenceId}
              `
            );
          }
        }

        if (type === 'DEPOSIT_EDIT' && t.transactionType === 'ADJUSTMENT' && referenceId) {
          const dep = depositById.get(referenceId);
          if (dep) {
            const shouldApplyDelta = dep.isPublished && !depositIdsBeingPublished.has(referenceId);
            if (shouldApplyDelta) {
              await tx.savingsGoal.update({
                where: { id: dep.savingsGoalId },
                data: { currentAmount: { increment: txAmount } } as any,
              });
            }
          }
        }

        await tx.$executeRaw(
          Prisma.sql`
            UPDATE "transactions"
            SET "isPublished" = true,
                "publishedAt" = ${now}
            WHERE "id"::text = ${t.id}
          `
        );
      }

      return { publishedCount: unpublished.length };
    });
  }

  async recalculateMicroSavingsBalances(groupId: string, userId: string, userRole: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundError('Group');

    const canEdit = group.adminUserId === userId || userRole === 'SYS_ADMIN' || userRole === 'ADMIN';
    if (!canEdit) throw new ValidationError('Insufficient permissions');

    const goals = await this.prisma.savingsGoal.findMany({
      where: {
        groupId,
        category: 'MICRO_SAVINGS' as any,
        status: 'ACTIVE' as any,
      } as any,
      select: { id: true, userId: true },
    });

    if (goals.length === 0) return { updatedGoals: 0 };

    const userIds = goals.map((g) => g.userId);

    const depositSums = await this.prisma.$queryRaw<Array<{ userId: string; total: any }>>(
      Prisma.sql`
        SELECT d."userId", COALESCE(SUM(d."amount"), 0) AS total
        FROM "savings_deposits" d
        JOIN "savings_goals" g ON g."id" = d."savingsGoalId"
        WHERE g."groupId"::text = ${groupId}
          AND g."category" = 'MICRO_SAVINGS'
          AND g."status" = 'ACTIVE'
          AND d."isPublished" = true
          AND d."userId"::text IN (${Prisma.join(userIds)})
        GROUP BY d."userId"
      `
    );

    const userIdToTotal = new Map<string, number>();
    for (const row of depositSums) {
      userIdToTotal.set(row.userId, Number(row.total || 0));
    }

    let updatedGoals = 0;
    for (const g of goals) {
      const total = userIdToTotal.get(g.userId) || 0;
      await this.prisma.savingsGoal.update({
        where: { id: g.id },
        data: { currentAmount: total } as any,
      });
      updatedGoals += 1;
    }

    return { updatedGoals };
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
      const shouldPublish = data.publishToMemberDashboard !== false;
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

            if (!shouldPublish) {
              await tx.$executeRaw(
                Prisma.sql`
                  UPDATE "savings_deposits"
                  SET "isPublished" = false,
                      "publishedAt" = NULL
                  WHERE "id"::text = ${deposit.id}
                `
              );
            }

            const ledgerService = new LedgerService(tx as any);
            const feeTx = await ledgerService.createTransaction({
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

            if (!shouldPublish) {
              await tx.$executeRaw(
                Prisma.sql`
                  UPDATE "transactions"
                  SET "isPublished" = false,
                      "publishedAt" = NULL
                  WHERE "id"::text = ${feeTx.id}
                `
              );
            }

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

        if (!shouldPublish) {
          await tx.$executeRaw(
            Prisma.sql`
              UPDATE "savings_deposits"
              SET "isPublished" = false,
                  "publishedAt" = NULL
              WHERE "id"::text = ${deposit.id}
            `
          );
        }

        if (shouldPublish) {
          const newAmount = Number(microSavingsGoal.currentAmount) + Number(data.amount);
          await tx.savingsGoal.update({
            where: { id: microSavingsGoal.id },
            data: { currentAmount: newAmount }
          });
        }

        // 3. Create transaction in ledger
        const ledgerService = new LedgerService(tx as any);
        const depositTx = await ledgerService.createTransaction({
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

        if (!shouldPublish) {
          await tx.$executeRaw(
            Prisma.sql`
              UPDATE "transactions"
              SET "isPublished" = false,
                  "publishedAt" = NULL
              WHERE "id"::text = ${depositTx.id}
            `
          );
        }

        return deposit;
      });

      if (shouldPublish) {
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
      const shouldPublish = data.publishToMemberDashboard !== false;
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
        const publishRow = await tx.$queryRaw<Array<{ isPublished: boolean | null }>>(
          Prisma.sql`
            SELECT "isPublished" FROM "savings_deposits" WHERE "id"::text = ${existingDeposit.id} LIMIT 1
          `
        );
        const depositIsPublished = publishRow?.[0]?.isPublished === true;

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
          if (depositIsPublished && shouldPublish) {
            const newAmount = Number(existingDeposit.savingsGoal.currentAmount) + delta;
            await tx.savingsGoal.update({
              where: { id: existingDeposit.savingsGoalId },
              data: { currentAmount: newAmount }
            });
          }

          const ledgerService = new LedgerService(tx as any);

          const member = await tx.member.findUnique({
            where: {
              groupId_userId: {
                groupId: data.groupId,
                userId: existingDeposit.userId,
              },
            },
            select: { id: true },
          });

          const adjTx = await ledgerService.createTransaction({
            groupId: data.groupId,
            memberId: member?.id,
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

          if (!shouldPublish || !depositIsPublished) {
            await tx.$executeRaw(
              Prisma.sql`
                UPDATE "transactions"
                SET "isPublished" = false,
                    "publishedAt" = NULL
                WHERE "id"::text = ${adjTx.id}
              `
            );
          }
        }

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

      if (delta !== 0) {
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
      }

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
