import { PaymentFrequency, PayoutOrderType, ContributionStatus, GroupType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { NotFoundError, ForbiddenError, ValidationError } from '@/utils/errors';
import { generateGroupPrefix, generateAccountNumber } from '@/utils/generators';
import { logger } from '@/utils/logger';

export interface CreateGroupData {
  groupName: string;
  groupType?: GroupType;
  includeAdminAsMember?: boolean;
  contributionAmount?: number;
  currencyCode: string;
  paymentFrequency?: PaymentFrequency;
  customFrequencyDays?: number;
  maxMembers: number;
  payoutOrderType?: PayoutOrderType;
  startDate?: Date;
  gracePeriodDays?: number;
}

type DashboardPeriod =
  | { kind: 'current_cycle' }
  | { kind: 'range'; from: Date; to: Date };

export class GroupService {
  async createGroup(adminUserId: string, data: CreateGroupData) {
    // Generate unique group prefix
    const groupPrefix = await this.generateUniquePrefix(data.groupName);

    const groupType = data.groupType || 'TONTINE';
    const isMicroSavings = groupType === 'MICRO_SAVINGS';
    const includeAdminAsMember = data.includeAdminAsMember === true;

    const now = new Date();

    const normalizedData: any = {
      ...data,
      includeAdminAsMember: undefined,
      groupType,
      contributionAmount: isMicroSavings ? (data.contributionAmount ?? 0) : data.contributionAmount,
      paymentFrequency: isMicroSavings ? (data.paymentFrequency ?? 'DAILY') : data.paymentFrequency,
      payoutOrderType: isMicroSavings ? (data.payoutOrderType ?? 'MANUAL') : data.payoutOrderType,
      gracePeriodDays: isMicroSavings ? 0 : (data.gracePeriodDays ?? 0),
      startDate: isMicroSavings ? (data.startDate ?? now) : data.startDate,
    };

    return prisma.$transaction(async (tx) => {
      const group = await tx.group.create({
        data: {
          ...normalizedData,
          groupPrefix,
          adminUserId,
          status: isMicroSavings ? 'ACTIVE' : 'DRAFT',
        },
        include: {
          admin: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      if (includeAdminAsMember) {
        await tx.member.create({
          data: {
            groupId: group.id,
            userId: adminUserId,
            status: 'ACTIVE',
            joinDate: new Date(),
            nationalId: 'ADMIN-' + group.id.substring(0, 8),
            accountNumber: generateAccountNumber(group.groupPrefix),
            isSavingsGroupMember: !isMicroSavings,
            isMicroSavingsMember: isMicroSavings,
          },
        });
      }

      return group;
    });
  }

  async getGroupById(groupId: string, userId: string, userRole?: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        admin: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phoneNumber: true,
                savingsGoals: {
                  where: {
                    groupId: groupId,
                    category: 'MICRO_SAVINGS' as any
                  }
                }
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            contributions: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundError('Group');
    }

    if (group.status === 'DELETED' && userRole !== 'SYS_ADMIN') {
      throw new NotFoundError('Group');
    }

    // Check access
    const isMember = group.members.some((m) => m.userId === userId && m.status === 'ACTIVE');
    const isAdmin = group.adminUserId === userId || userRole === 'SYS_ADMIN';

    if (!isMember && !isAdmin) {
      throw new ForbiddenError('You do not have access to this group');
    }

    return group;
  }

  async updateGroup(groupId: string, userId: string, userRole: string, data: Partial<CreateGroupData>) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundError('Group');
    }

    if (group.adminUserId !== userId && userRole !== 'SYS_ADMIN') {
      throw new ForbiddenError('Only group admin or system admin can update group');
    }

    // Prevent changing certain fields after group is active
    if (group.status === 'ACTIVE') {
      const restrictedFields = ['paymentFrequency', 'contributionAmount'];
      const hasRestrictedUpdate = restrictedFields.some((field) => field in data);

      if (hasRestrictedUpdate) {
        throw new ValidationError(
          'Cannot change payment frequency or amount after group is active'
        );
      }
    }

    const updated = await prisma.group.update({
      where: { id: groupId },
      data,
    });

    return updated;
  }

  private calculateCycleNumber(startDate: Date, targetDate: Date, frequency: PaymentFrequency, customDays?: number): number {
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
      case 'CUSTOM': {
        const days = customDays && customDays > 0 ? customDays : 30;
        return Math.floor((target.getTime() - start.getTime()) / (days * 24 * 60 * 60 * 1000)) + 1;
      }
      default:
        return (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth()) + 1;
    }
  }

  private calculateDueDate(startDate: Date, cycleNumber: number, frequency: PaymentFrequency, customDays?: number): Date {
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
      case 'CUSTOM': {
        const days = customDays && customDays > 0 ? customDays : 30;
        dueDate.setDate(dueDate.getDate() + (cycleNumber - 1) * days);
        break;
      }
      default:
        dueDate.setMonth(dueDate.getMonth() + (cycleNumber - 1));
    }

    return dueDate;
  }

  private addGraceDays(date: Date, gracePeriodDays: number) {
    const d = new Date(date);
    if (gracePeriodDays > 0) d.setDate(d.getDate() + gracePeriodDays);
    return d;
  }

  private toIsoDateOnly(date: Date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  async getGroupTransactions(groupId: string, userId: string, userRole: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) throw new NotFoundError('Group');

    if (group.status === 'DELETED' && userRole !== 'SYS_ADMIN') {
      throw new NotFoundError('Group');
    }

    const isMember = group.members.some((m) => m.userId === userId && m.status === 'ACTIVE');
    const isAdmin = group.adminUserId === userId || userRole === 'SYS_ADMIN';

    if (!isMember && !isAdmin) {
      throw new ForbiddenError('You do not have access to this group');
    }

    return prisma.transaction.findMany({
      where: { groupId },
      include: {
        member: {
          include: { user: { select: { fullName: true } } }
        },
        recorder: { select: { fullName: true } }
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  async getGroupDashboard(groupId: string, userId: string, userRole: string, period?: DashboardPeriod) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { status: 'ACTIVE' },
          include: { user: { select: { fullName: true } } },
        },
      },
    });

    if (!group) throw new NotFoundError('Group');

    if (group.status === 'DELETED' && userRole !== 'SYS_ADMIN') {
      throw new NotFoundError('Group');
    }

    const isAdmin = group.adminUserId === userId || userRole === 'SYS_ADMIN';
    if (!isAdmin) {
      throw new ForbiddenError('Only group admin or system admin can view this dashboard');
    }

    const now = new Date();
    const customDays = group.customFrequencyDays ?? undefined;
    const startDate = group.startDate ? new Date(group.startDate) : new Date(group.createdAt);
    const resolvedPeriod: DashboardPeriod = period ?? { kind: 'current_cycle' };

    const activeMembers = group.members;
    const memberIds = activeMembers.map((m) => m.id);

    const currentCycle = this.calculateCycleNumber(startDate, now, group.paymentFrequency, customDays);
    const currentCycleDueDate = this.calculateDueDate(startDate, currentCycle, group.paymentFrequency, customDays);
    const nextCycleDueDate = this.calculateDueDate(startDate, currentCycle + 1, group.paymentFrequency, customDays);

    let cycleRange: { first: number; last: number; count: number };
    let rangeLabel: { kind: 'current_cycle' } | { kind: 'range'; from: string; to: string };

    if (resolvedPeriod.kind === 'current_cycle') {
      cycleRange = { first: currentCycle, last: currentCycle, count: 1 };
      rangeLabel = { kind: 'current_cycle' };
    } else {
      const from = new Date(resolvedPeriod.from);
      const to = new Date(resolvedPeriod.to);
      const first = this.calculateCycleNumber(startDate, from, group.paymentFrequency, customDays);
      const last = this.calculateCycleNumber(startDate, to, group.paymentFrequency, customDays);
      const count = Math.max(0, last - first + 1);
      cycleRange = { first, last, count };
      rangeLabel = { kind: 'range', from: this.toIsoDateOnly(from), to: this.toIsoDateOnly(to) };
    }

    const recentActivity = await prisma.transaction.findMany({
      where: { groupId },
      include: {
        member: { include: { user: { select: { fullName: true } } } },
        recorder: { select: { fullName: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    if (group.groupType === 'MICRO_SAVINGS') {
      const windowStart = resolvedPeriod.kind === 'current_cycle' ? currentCycleDueDate : new Date(resolvedPeriod.from);
      const windowEnd = resolvedPeriod.kind === 'current_cycle' ? nextCycleDueDate : new Date(resolvedPeriod.to);

      const savingsGoals = await prisma.savingsGoal.findMany({
        where: { groupId, category: 'MICRO_SAVINGS' as any },
        select: { id: true, userId: true, currentAmount: true },
      });

      const balanceByUserId = new Map<string, number>();
      for (const g of savingsGoals) {
        const v = Number(g.currentAmount || 0);
        balanceByUserId.set(g.userId, (balanceByUserId.get(g.userId) || 0) + v);
      }

      const deposits = await prisma.savingsDeposit.findMany({
        where: {
          depositDate: { gte: windowStart, lt: windowEnd },
          savingsGoal: { groupId, category: 'MICRO_SAVINGS' as any },
        },
        select: { amount: true, userId: true },
      });

      const withdrawals = await prisma.withdrawalRequest.findMany({
        where: {
          groupId,
          status: 'APPROVED' as any,
          OR: [
            { processedAt: { gte: windowStart, lt: windowEnd } },
            { processedAt: null, requestedAt: { gte: windowStart, lt: windowEnd } },
          ],
        },
        select: { amount: true, memberId: true },
      });

      const depositByUserId = new Map<string, number>();
      for (const d of deposits) {
        const v = Number(d.amount || 0);
        depositByUserId.set(d.userId, (depositByUserId.get(d.userId) || 0) + v);
      }

      const memberIdToUserId = new Map<string, string>();
      for (const m of activeMembers) memberIdToUserId.set(m.id, m.userId);

      const withdrawalByUserId = new Map<string, number>();
      for (const w of withdrawals) {
        const uid = memberIdToUserId.get(w.memberId);
        if (!uid) continue;
        const v = Number(w.amount || 0);
        withdrawalByUserId.set(uid, (withdrawalByUserId.get(uid) || 0) + v);
      }

      const netGroupBalance = Array.from(balanceByUserId.values()).reduce((a, b) => a + b, 0);
      const totalDeposits = Array.from(depositByUserId.values()).reduce((a, b) => a + b, 0);
      const totalWithdrawals = Array.from(withdrawalByUserId.values()).reduce((a, b) => a + b, 0);
      const averageMemberBalance = activeMembers.length > 0 ? netGroupBalance / activeMembers.length : 0;

      const memberStatusItems = activeMembers.map((m) => {
        const balance = balanceByUserId.get(m.userId) || 0;
        const dep = depositByUserId.get(m.userId) || 0;
        const wd = withdrawalByUserId.get(m.userId) || 0;
        return {
          memberId: m.id,
          memberName: m.user?.fullName || 'Unknown',
          balance,
          deposits: dep,
          withdrawals: wd,
          netChange: dep - wd,
          currencyCode: group.currencyCode,
        };
      });

      return {
        group: {
          id: group.id,
          groupName: group.groupName,
          groupType: group.groupType,
          status: group.status,
          currencyCode: group.currencyCode,
          contributionAmount: Number(group.contributionAmount),
          paymentFrequency: group.paymentFrequency,
          gracePeriodDays: group.gracePeriodDays,
          startDate: group.startDate,
          maxMembers: group.maxMembers,
          adminUserId: group.adminUserId,
          activeMembersCount: activeMembers.length,
        },
        period: rangeLabel,
        common: {
          activeMembersCount: activeMembers.length,
          totalCollected: { amount: totalDeposits, currencyCode: group.currencyCode },
          totalOutstanding: { amount: 0, currencyCode: group.currencyCode },
          pastDueMembersCount: 0,
          dataAsOf: now.toISOString(),
        },
        microSavings: {
          netGroupBalance: { amount: netGroupBalance, currencyCode: group.currencyCode },
          totalDeposits: { amount: totalDeposits, currencyCode: group.currencyCode },
          totalWithdrawals: { amount: totalWithdrawals, currencyCode: group.currencyCode },
          averageMemberBalance: { amount: averageMemberBalance, currencyCode: group.currencyCode },
        },
        memberStatus: {
          kind: 'micro_savings',
          items: memberStatusItems,
        },
        recentActivity,
      };
    }

    const contributionAmount = Number(group.contributionAmount);
    const contributions = await prisma.contribution.findMany({
      where: {
        groupId,
        cycleNumber: { gte: cycleRange.first, lte: cycleRange.last },
        memberId: { in: memberIds },
      },
      select: {
        id: true,
        memberId: true,
        amount: true,
        currencyCode: true,
        dueDate: true,
        paymentDate: true,
        status: true,
        cycleNumber: true,
      },
      orderBy: [{ cycleNumber: 'desc' }, { paymentDate: 'desc' }],
    });

    const contribsByMemberId = new Map<string, typeof contributions>();
    for (const c of contributions) {
      const list = contribsByMemberId.get(c.memberId) || [];
      list.push(c);
      contribsByMemberId.set(c.memberId, list);
    }

    const expectedPerMember = contributionAmount * cycleRange.count;
    let totalPaid = 0;
    let pastDueMembersCount = 0;

    const memberStatusItems = activeMembers.map((m) => {
      const list = contribsByMemberId.get(m.id) || [];
      const paid = list
        .filter((c) => c.status === 'COMPLETED')
        .reduce((sum, c) => sum + Number(c.amount || 0), 0);
      const outstanding = Math.max(0, expectedPerMember - paid);
      totalPaid += paid;

      const lastPaymentDate = list
        .filter((c) => c.status === 'COMPLETED')
        .reduce<Date | null>((acc, c) => {
          const d = c.paymentDate ? new Date(c.paymentDate) : null;
          if (!d) return acc;
          if (!acc) return d;
          return d > acc ? d : acc;
        }, null);

      let status: 'PAID' | 'DUE' | 'PAST_DUE' = 'DUE';
      if (outstanding <= 0) {
        status = 'PAID';
      } else {
        let isPastDue = false;
        for (let cycle = cycleRange.first; cycle <= cycleRange.last; cycle += 1) {
          const due = this.calculateDueDate(startDate, cycle, group.paymentFrequency, customDays);
          const graceDue = this.addGraceDays(due, group.gracePeriodDays);
          if (graceDue < now) {
            isPastDue = true;
            break;
          }
        }
        status = isPastDue ? 'PAST_DUE' : 'DUE';
      }

      if (status === 'PAST_DUE') pastDueMembersCount += 1;

      return {
        memberId: m.id,
        memberName: m.user?.fullName || 'Unknown',
        expected: expectedPerMember,
        paid,
        outstanding,
        status,
        lastPaymentDate,
        currencyCode: group.currencyCode,
      };
    });

    const totalExpected = expectedPerMember * activeMembers.length;
    const totalCollected = totalPaid;
    const totalOutstanding = Math.max(0, totalExpected - totalCollected);

    const cycleItems = resolvedPeriod.kind === 'current_cycle'
      ? activeMembers.map((m) => {
          const list = contribsByMemberId.get(m.id) || [];
          const c = list.find((x) => x.cycleNumber === currentCycle) || null;
          const graceDue = this.addGraceDays(currentCycleDueDate, group.gracePeriodDays);
          if (!c) {
            const status = graceDue < now ? 'DEFAULTED' : currentCycleDueDate < now ? 'OVERDUE' : 'DUE';
            return {
              memberId: m.id,
              memberName: m.user?.fullName || 'Unknown',
              status,
              dueDate: currentCycleDueDate,
              paymentDate: null,
              amount: contributionAmount,
              currencyCode: group.currencyCode,
            };
          }
          return {
            memberId: m.id,
            memberName: m.user?.fullName || 'Unknown',
            status: c.status === 'COMPLETED' ? 'PAID' : (c.status as any),
            dueDate: c.dueDate,
            paymentDate: c.paymentDate,
            amount: Number(c.amount || 0),
            currencyCode: c.currencyCode,
          };
        })
      : null;

    const cycleCounts = cycleItems
      ? cycleItems.reduce(
          (acc, it) => {
            acc[it.status] = (acc[it.status] || 0) + 1;
            return acc;
          },
          { DUE: 0, PAID: 0, OVERDUE: 0, DEFAULTED: 0, PENDING: 0 } as Record<string, number>
        )
      : null;

    const cycleTotals = cycleItems
      ? cycleItems.reduce(
          (acc, it) => {
            if (it.status === 'DUE' || it.status === 'PENDING') acc.dueExpected += contributionAmount;
            if (it.status === 'PAID') acc.paid += Number(it.amount || 0);
            if (it.status === 'OVERDUE' || it.status === 'DEFAULTED') acc.pastDue += Number(it.amount || 0);
            return acc;
          },
          { dueExpected: 0, paid: 0, pastDue: 0 }
        )
      : null;

    const payoutSorted = [...activeMembers].sort((a, b) => (a.payoutPosition ?? 999999) - (b.payoutPosition ?? 999999));
    const nextPayout = payoutSorted.length > 0 ? payoutSorted[0] : null;
    const nextPayoutDate = resolvedPeriod.kind === 'current_cycle' ? currentCycleDueDate : this.calculateDueDate(startDate, cycleRange.first, group.paymentFrequency, customDays);

    const byCycle = await prisma.contribution.groupBy({
      by: ['cycleNumber'],
      where: {
        groupId,
        status: 'COMPLETED',
        cycleNumber: { gte: Math.max(1, currentCycle - 5), lte: currentCycle },
      },
      _sum: { amount: true },
      orderBy: { cycleNumber: 'asc' },
    });

    const collectedByCycle = byCycle.map((row) => ({
      cycleNumber: row.cycleNumber,
      collected: Number(row._sum.amount || 0),
      currencyCode: group.currencyCode,
    }));

    return {
      group: {
        id: group.id,
        groupName: group.groupName,
        groupType: group.groupType,
        status: group.status,
        currencyCode: group.currencyCode,
        contributionAmount: contributionAmount,
        paymentFrequency: group.paymentFrequency,
        gracePeriodDays: group.gracePeriodDays,
        startDate: group.startDate,
        maxMembers: group.maxMembers,
        adminUserId: group.adminUserId,
        activeMembersCount: activeMembers.length,
      },
      period: rangeLabel,
      common: {
        activeMembersCount: activeMembers.length,
        totalCollected: { amount: totalCollected, currencyCode: group.currencyCode },
        totalOutstanding: { amount: totalOutstanding, currencyCode: group.currencyCode },
        pastDueMembersCount,
        dataAsOf: now.toISOString(),
      },
      tontine: {
        currentCycleNumber: currentCycle,
        expectedPot: { amount: contributionAmount * activeMembers.length, currencyCode: group.currencyCode },
        currentCyclePot: {
          amount:
            resolvedPeriod.kind === 'current_cycle'
              ? (cycleTotals?.paid || 0)
              : totalCollected,
          currencyCode: group.currencyCode,
        },
        nextPayoutMemberId: nextPayout ? nextPayout.id : null,
        nextPayoutDate: nextPayoutDate ? nextPayoutDate.toISOString() : null,
        payoutQueueProgress: {
          currentPosition: nextPayout?.payoutPosition ?? 1,
          totalPositions: activeMembers.length,
        },
      },
      insights: {
        collectedByCycle,
      },
      memberStatus: {
        kind: 'tontine',
        items: memberStatusItems,
      },
      cycle: cycleItems
        ? {
            cycleNumber: currentCycle,
            dueDate: currentCycleDueDate,
            counts: cycleCounts,
            totals: {
              dueExpected: cycleTotals?.dueExpected || 0,
              paid: cycleTotals?.paid || 0,
              pastDue: cycleTotals?.pastDue || 0,
              currencyCode: group.currencyCode,
            },
            items: cycleItems,
          }
        : null,
      recentActivity,
    };
  }

  async deleteGroup(groupId: string, userId: string, userRole: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) {
      throw new NotFoundError('Group');
    }

    if (group.adminUserId !== userId && userRole !== 'SYS_ADMIN') {
      throw new ForbiddenError('Only group admin or system admin can delete this group');
    }

    if (group.status === 'DELETED') {
      throw new ValidationError('Group is already deleted');
    }

    if (group.status === 'DRAFT') {
      // Hard delete for draft groups (no financial history exists)
      await prisma.$transaction(async (tx) => {
        await tx.withdrawalRequest.deleteMany({ where: { groupId } });
        await tx.transaction.deleteMany({ where: { groupId } });
        await tx.contribution.deleteMany({ where: { groupId } });
        await tx.message.deleteMany({ where: { groupId } });
        await tx.invitation.deleteMany({ where: { groupId } });
        await tx.notification.deleteMany({ where: { groupId } });
        await tx.savingsGoal.updateMany({ where: { groupId }, data: { groupId: null } });
        await tx.investmentAccount.updateMany({ where: { groupId }, data: { groupId: null } });
        await tx.member.deleteMany({ where: { groupId } });
        await tx.group.delete({ where: { id: groupId } });
      });
      return { deleted: true, archived: false };
    } else {
      // Soft delete (archive) for active/closed groups to preserve financial logs
      const archived = await prisma.group.update({
        where: { id: groupId },
        data: { status: 'CLOSED' },
      });
      return { deleted: false, archived: true, group: archived };
    }
  }

  async permanentlyDeleteGroup(
    groupId: string,
    userId: string,
    userRole: string,
    confirmationText: string
  ) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        groupName: true,
        status: true,
        adminUserId: true,
      },
    });

    if (!group) {
      throw new NotFoundError('Group');
    }

    if (group.adminUserId !== userId && userRole !== 'SYS_ADMIN') {
      throw new ForbiddenError('Only group admin or system admin can delete this group');
    }

    if (confirmationText !== group.groupName) {
      throw new ValidationError('Confirmation text does not match group name');
    }

    if (group.status === 'DELETED') {
      throw new ValidationError('Group is already deleted');
    }

    if (group.status === 'DRAFT') {
      return this.deleteGroup(groupId, userId, userRole);
    }

    if (group.status !== 'CLOSED') {
      throw new ValidationError('Close the group before permanent deletion');
    }

    const updated = await prisma.group.update({
      where: { id: groupId },
      data: { status: 'DELETED', deletedAt: new Date() },
    });

    return { deleted: true, group: updated };
  }

  async activateGroup(groupId: string, userId: string, userRole: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: true,
      },
    });

    if (!group) {
      throw new NotFoundError('Group');
    }

    if (group.adminUserId !== userId && userRole !== 'ADMIN' && userRole !== 'SYS_ADMIN') {
      throw new ForbiddenError('Only group admin or system admin can activate group');
    }

    if (group.groupType === 'MICRO_SAVINGS') {
      const updated = await prisma.group.update({
        where: { id: groupId },
        data: { status: 'ACTIVE' },
      });
      return updated;
    }

    // Validation before activation
    const activeMembers = group.members.filter((m) => m.status === 'ACTIVE');

    if (activeMembers.length < 3) {
      throw new ValidationError('Group must have at least 3 active members');
    }

    if (!group.startDate) {
      throw new ValidationError('Start date must be set before activation');
    }

    const updated = await prisma.group.update({
      where: { id: groupId },
      data: {
        status: 'ACTIVE',
      },
    });

    return updated;
  }

  async getUserGroups(userId: string) {
    return prisma.group.findMany({
      where: {
        status: { not: 'DELETED' },
        OR: [
          { adminUserId: userId },
          {
            members: {
              some: {
                userId: userId,
                status: 'ACTIVE',
              },
            },
          },
        ],
      },
      include: {
        _count: {
          select: {
            members: true,
            contributions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAdminAggregateStats(userId: string) {
    const adminGroups = await prisma.group.findMany({
      where: { adminUserId: userId, status: { in: ['ACTIVE', 'CLOSED'] } },
      select: { id: true, currencyCode: true },
    });

    const totalGroups = adminGroups.length;

    // Use a Set to count unique active members across all groups
    const uniqueMemberIds = new Set<string>();
    const allMembers = await prisma.member.findMany({
      where: {
        group: { adminUserId: userId, status: { in: ['ACTIVE', 'CLOSED'] } },
        status: 'ACTIVE'
      },
      select: { userId: true }
    });

    allMembers.forEach(m => uniqueMemberIds.add(m.userId));
    const totalMembers = uniqueMemberIds.size;

    const groupIds = adminGroups.map((g) => g.id);
    const totalsByCurrency = groupIds.length
      ? await prisma.contribution.groupBy({
          by: ['currencyCode'],
          where: {
            groupId: { in: groupIds },
            status: ContributionStatus.COMPLETED,
          },
          _sum: { amount: true },
        })
      : [];

    const normalizedTotalsByCurrency = totalsByCurrency
      .map((t) => ({
        currencyCode: t.currencyCode,
        total: Number(t._sum.amount || 0),
      }))
      .sort((a, b) => b.total - a.total);

    const totalFundsCollected = normalizedTotalsByCurrency.reduce((acc, t) => acc + t.total, 0);

    const uniqueCurrencies = new Set(adminGroups.map((g) => g.currencyCode).filter(Boolean));
    const currencyCode = uniqueCurrencies.size === 1 ? Array.from(uniqueCurrencies)[0] : null;

    return {
      totalGroups,
      totalMembers,
      totalFundsCollected,
      currencyCode,
      totalsByCurrency: normalizedTotalsByCurrency,
      multiCurrency: normalizedTotalsByCurrency.length > 1,
    };
  }

  async getMemberAggregateStats(userId: string) {
    const memberGroups = await prisma.group.findMany({
      where: {
        members: {
          some: { userId: userId, status: 'ACTIVE' }
        },
        status: { in: ['ACTIVE', 'CLOSED'] }
      },
      include: {
        contributions: {
          where: {
            member: { userId: userId },
            status: { in: [ContributionStatus.COMPLETED] }
          },
          select: { amount: true }
        }
      }
    });

    const totalActiveGroups = memberGroups.length;
    const totalAmountSaved = memberGroups.reduce((acc, group) => {
      const groupTotal = (group as any).contributions.reduce((sum: number, c: any) => sum + Number(c.amount), 0);
      return acc + groupTotal;
    }, 0);

    return { totalActiveGroups, totalAmountSaved };
  }

  private async generateUniquePrefix(groupName: string): Promise<string> {
    let isUnique = false;
    let prefix = '';
    let attempt = 0;

    while (!isUnique) {
      prefix = generateGroupPrefix(groupName);

      // If suffix needed for uniqueness
      if (attempt > 0) {
        prefix = (prefix.substring(0, 3) + attempt).substring(0, 5);
      }

      const existing = await prisma.group.findUnique({
        where: { groupPrefix: prefix },
      });
      isUnique = !existing;
      attempt++;

      if (attempt > 20) break; // Defensive
    }

    return prefix;
  }

  async updateGroupFees(groupId: string, data: { groupFeePercentage?: number, platformFeePercentage?: number }) {
    return prisma.group.update({
      where: { id: groupId },
      data: data as any,
    });
  }

  async toggleMicroInvestments(groupId: string, allowMicroInvestments: boolean) {
    return prisma.group.update({
      where: { id: groupId },
      data: { allowMicroInvestments } as any,
    });
  }

  async sendGroupNotification(groupId: string, adminId: string, data: { title?: string; message?: string; body?: string }) {
    const title = (data.title || '').trim();
    const message = (data.message ?? data.body ?? '').trim();

    if (!title || !message) {
      throw new ValidationError('title and message are required');
    }

    const members = await prisma.member.findMany({
      where: { groupId, status: { in: ['ACTIVE', 'PENDING'] } },
      select: { userId: true }
    });

    if (members.length === 0) {
      return { success: true, count: 0 };
    }
    
    const notifications = members.map(m => ({
      userId: m.userId,
      groupId: groupId,
      type: 'GROUP_ANNOUNCEMENT',
      title,
      body: message,
    }));
    
    await prisma.notification.createMany({
      data: notifications
    });
    
    return { success: true, count: notifications.length };
  }
}
