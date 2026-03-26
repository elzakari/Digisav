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

    // Check access
    const isMember = group.members.some((m) => m.userId === userId);
    const isAdmin = group.adminUserId === userId || userRole === 'ADMIN';

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

    if (group.adminUserId !== userId && userRole !== 'ADMIN') {
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

  private calculateCycleNumber(startDate: Date, targetDate: Date, frequency: PaymentFrequency): number {
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

  private calculateDueDate(startDate: Date, cycleNumber: number, frequency: PaymentFrequency): Date {
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

  async getGroupTransactions(groupId: string, userId: string, userRole: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) throw new NotFoundError('Group');

    const isMember = group.members.some((m) => m.userId === userId);
    const isAdmin = group.adminUserId === userId || userRole === 'ADMIN';

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

  async getGroupDashboard(groupId: string, userId: string, userRole: string) {
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

    const isAdmin = group.adminUserId === userId || userRole === 'ADMIN';
    if (!isAdmin) {
      throw new ForbiddenError('Only group admin or system admin can view this dashboard');
    }

    const today = new Date();
    const startDate = group.startDate ? new Date(group.startDate) : today;
    const currentCycle = this.calculateCycleNumber(startDate, today, group.paymentFrequency);
    const currentCycleDueDate = this.calculateDueDate(startDate, currentCycle, group.paymentFrequency);

    const activeMembers = group.members;

    const totalCollectedAgg = await prisma.contribution.aggregate({
      where: { groupId, status: 'COMPLETED' },
      _sum: { amount: true },
    });
    const totalCollected = Number(totalCollectedAgg._sum.amount || 0);
    const totalExpected = activeMembers.length * Number(group.contributionAmount) * currentCycle;

    const contributions = await prisma.contribution.findMany({
      where: {
        groupId,
        cycleNumber: currentCycle,
        memberId: { in: activeMembers.map((m) => m.id) },
      },
      include: { member: { include: { user: { select: { fullName: true } } } } },
    });

    const byMemberId = new Map<string, (typeof contributions)[number]>();
    for (const c of contributions) {
      byMemberId.set(c.memberId, c);
    }

    const items = activeMembers.map((m) => {
      const c = byMemberId.get(m.id);
      if (!c) {
        return {
          memberId: m.id,
          memberName: m.user?.fullName || 'Unknown',
          status: 'DUE' as const,
          dueDate: currentCycleDueDate,
          paymentDate: null as Date | null,
          amount: Number(group.contributionAmount),
          currencyCode: group.currencyCode,
        };
      }

      return {
        memberId: m.id,
        memberName: c.member?.user?.fullName || 'Unknown',
        status: c.status === 'COMPLETED' ? ('PAID' as const) : (c.status as any),
        dueDate: c.dueDate,
        paymentDate: c.paymentDate,
        amount: Number(c.amount),
        currencyCode: c.currencyCode,
      };
    });

    const counts = {
      DUE: 0,
      PAID: 0,
      OVERDUE: 0,
      DEFAULTED: 0,
      PENDING: 0,
    };

    const totals = {
      dueExpected: 0,
      paid: 0,
      pastDue: 0,
    };

    for (const it of items) {
      const st = it.status as keyof typeof counts;
      if (st in counts) counts[st] += 1;
      if (it.status === 'DUE') totals.dueExpected += Number(group.contributionAmount);
      if (it.status === 'PAID') totals.paid += it.amount;
      if (it.status === 'OVERDUE' || it.status === 'DEFAULTED') totals.pastDue += it.amount;
    }

    const recentActivity = await prisma.transaction.findMany({
      where: { groupId },
      include: {
        member: { include: { user: { select: { fullName: true } } } },
        recorder: { select: { fullName: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 8,
    });

    return {
      group: {
        id: group.id,
        groupName: group.groupName,
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
      stats: {
        totalExpected,
        totalCollected,
        outstanding: Math.max(0, totalExpected - totalCollected),
        complianceRate: totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0,
        currentCycle,
        currencyCode: group.currencyCode,
      },
      cycle: {
        cycleNumber: currentCycle,
        dueDate: currentCycleDueDate,
        counts,
        totals: {
          dueExpected: totals.dueExpected,
          paid: totals.paid,
          pastDue: totals.pastDue,
          currencyCode: group.currencyCode,
        },
        items,
      },
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

    if (group.adminUserId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenError('Only group admin or system admin can delete this group');
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
        OR: [
          { adminUserId: userId },
          {
            members: {
              some: {
                userId: userId,
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
