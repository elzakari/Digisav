import { PaymentFrequency, PayoutOrderType, ContributionStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { NotFoundError, ForbiddenError, ValidationError } from '@/utils/errors';
import { generateGroupPrefix, generateAccountNumber } from '@/utils/generators';
import { logger } from '@/utils/logger';

export interface CreateGroupData {
  groupName: string;
  contributionAmount: number;
  currencyCode: string;
  paymentFrequency: PaymentFrequency;
  customFrequencyDays?: number;
  maxMembers: number;
  payoutOrderType: PayoutOrderType;
  startDate?: Date;
  gracePeriodDays?: number;
}

export class GroupService {
  async createGroup(adminUserId: string, data: CreateGroupData) {
    // Generate unique group prefix
    const groupPrefix = await this.generateUniquePrefix(data.groupName);

    return prisma.$transaction(async (tx) => {
      const group = await tx.group.create({
        data: {
          ...data,
          groupPrefix,
          adminUserId,
          status: 'DRAFT',
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

      // Add admin as the first member
      await tx.member.create({
        data: {
          groupId: group.id,
          userId: adminUserId,
          status: 'ACTIVE',
          joinDate: new Date(),
          nationalId: 'ADMIN-' + group.id.substring(0, 8),
          accountNumber: generateAccountNumber(group.groupPrefix),
        },
      });

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
      await prisma.$transaction([
        prisma.message.deleteMany({ where: { groupId } }),
        prisma.invitation.deleteMany({ where: { groupId } }),
        prisma.notification.deleteMany({ where: { groupId } }),
        prisma.member.deleteMany({ where: { groupId } }),
        prisma.group.delete({ where: { id: groupId } }),
      ]);
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

    if (group.adminUserId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenError('Only group admin or system admin can activate group');
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
      include: {
        _count: {
          select: { members: true }
        },
        contributions: {
          where: { status: { in: [ContributionStatus.COMPLETED] } },
          select: { amount: true }
        }
      }
    });

    const totalGroups = adminGroups.length;
    let totalMembers = 0;

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
    totalMembers = uniqueMemberIds.size;

    const totalFundsCollected = adminGroups.reduce((acc, group) => {
      const groupTotal = (group as any).contributions.reduce((sum: number, c: any) => sum + Number(c.amount), 0);
      return acc + groupTotal;
    }, 0);

    return { totalGroups, totalMembers, totalFundsCollected };
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

  async sendGroupNotification(groupId: string, adminId: string, data: { title: string, message: string }) {
    const members = await prisma.member.findMany({
      where: { groupId, status: 'ACTIVE' },
      select: { userId: true }
    });

    if (members.length === 0) {
      return { success: true, count: 0 };
    }
    
    const notifications = members.map(m => ({
      userId: m.userId,
      groupId: groupId,
      type: 'GROUP_ANNOUNCEMENT',
      title: data.title,
      body: data.message,
    }));
    
    await prisma.notification.createMany({
      data: notifications
    });
    
    return { success: true, count: notifications.length };
  }
}
