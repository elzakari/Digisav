import prisma from '@/lib/prisma';
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from '@/utils/errors';
import { SavingsGoalCategory } from '@prisma/client';
import { generateAccountNumber } from '@/utils/generators';
import { checkDuplicate } from '@/utils/duplicate-detection';
import { NotificationService } from '@/services/notifications/notification.service';

interface RegisterMemberData {
  userId: string;
  groupId: string;
  nationalId: string;
  photoUrl?: string;
  dateOfBirth?: Date;
}

export class MemberService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  async registerMember(data: RegisterMemberData) {
    // Check if user already member of group
    const existing = await prisma.member.findUnique({
      where: {
        groupId_userId: {
          groupId: data.groupId,
          userId: data.userId,
        },
      },
    });

    if (existing) {
      throw new ConflictError('User is already a member of this group');
    }

    // Check for duplicate national ID in group
    const duplicateId = await prisma.member.findUnique({
      where: {
        groupId_nationalId: {
          groupId: data.groupId,
          nationalId: data.nationalId,
        },
      },
    });

    if (duplicateId) {
      throw new ConflictError('This national ID is already registered in the group');
    }

    // Get group to check capacity and get prefix
    const group = await prisma.group.findUnique({
      where: { id: data.groupId },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundError('Group');
    }

    if (group._count.members >= group.maxMembers) {
      throw new ValidationError('Group has reached maximum member capacity');
    }

    // Generate unique account number
    const accountNumber = await this.generateUniqueAccountNumber(group.groupPrefix);

    // Create member with PENDING status
    const member = await prisma.member.create({
      data: {
        ...data,
        accountNumber,
        status: 'PENDING',
        isSavingsGroupMember: group.groupType !== 'MICRO_SAVINGS',
        isMicroSavingsMember: group.groupType === 'MICRO_SAVINGS',
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
        group: {
          select: {
            id: true,
            groupName: true,
            contributionAmount: true,
            currencyCode: true,
            groupType: true,
          },
        },
      },
    });

    // Notify admin
    try {
      // Find the group to get the admin's ID since we only have groupId in data
      const g = await prisma.group.findUnique({ where: { id: data.groupId } });
      if (g && g.adminUserId !== data.userId) {
        await this.notificationService.createNotification({
          userId: g.adminUserId,
          groupId: data.groupId,
          type: 'MEMBER_JOINED',
          title: 'New Member Request',
          body: `A new member has requested to join ${g.groupName}.`,
        });
      }
    } catch (e) {
      console.error('Failed to notify admin of new member', e);
    }

    return member;
  }

  async approveMember(memberId: string, adminUserId: string, userRole: string = 'MEMBER') {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { group: true },
    });

    if (!member) {
      throw new NotFoundError('Member');
    }

    if (member.group.adminUserId !== adminUserId && userRole !== 'ADMIN' && userRole !== 'SYS_ADMIN') {
      throw new ForbiddenError('Only group admin or system admin can approve members');
    }

    if (member.status !== 'PENDING') {
      throw new ValidationError('Member is not in pending status');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextMember = await tx.member.update({
        where: { id: memberId },
        data: { status: 'ACTIVE' },
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
              phoneNumber: true,
            },
          },
        },
      });

      if (member.group.groupType === 'MICRO_SAVINGS') {
        const existingGoal = await tx.savingsGoal.findFirst({
          where: {
            userId: member.userId,
            groupId: member.groupId,
            category: (SavingsGoalCategory as any).MICRO_SAVINGS,
          },
        });

        if (!existingGoal) {
          await tx.savingsGoal.create({
            data: {
              userId: member.userId,
              groupId: member.groupId,
              name: `Micro-Savings: ${member.group.groupName}`,
              category: (SavingsGoalCategory as any).MICRO_SAVINGS,
              targetAmount: 1000000,
              currencyCode: member.group.currencyCode,
              status: 'ACTIVE',
              currentAmount: 0,
            },
          });
        }
      }

      return nextMember;
    });

    // Notify member
    try {
      await this.notificationService.createNotification({
        userId: member.userId,
        groupId: member.groupId,
        type: 'MEMBER_JOINED',
        title: 'Membership Approved',
        body: `Your request to join ${member.group.groupName} has been approved.`,
      });
    } catch (e) {
      console.error('Failed to notify member of approval', e);
    }

    return updated;
  }

  async rejectMember(memberId: string, adminUserId: string, userRole: string = 'MEMBER') {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { group: true },
    });

    if (!member) {
      throw new NotFoundError('Member');
    }

    if (member.group.adminUserId !== adminUserId && userRole !== 'ADMIN' && userRole !== 'SYS_ADMIN') {
      throw new ForbiddenError('Only group admin or system admin can reject members');
    }

    // Soft delete by setting status to INACTIVE
    const updated = await prisma.member.update({
      where: { id: memberId },
      data: { status: 'INACTIVE' },
    });

    return updated;
  }

  async suspendMember(memberId: string, adminUserId: string, userRole: string = 'MEMBER') {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { group: true },
    });

    if (!member) {
      throw new NotFoundError('Member');
    }

    if (member.group.adminUserId !== adminUserId && userRole !== 'ADMIN' && userRole !== 'SYS_ADMIN') {
      throw new ForbiddenError('Only group admin or system admin can suspend members');
    }

    const updated = await prisma.member.update({
      where: { id: memberId },
      data: { status: 'SUSPENDED' },
    });

    return updated;
  }

  async removeMember(memberId: string, adminUserId: string, userRole: string = 'MEMBER') {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { group: true },
    });

    if (!member) {
      throw new NotFoundError('Member');
    }

    if (member.group.adminUserId !== adminUserId && userRole !== 'ADMIN' && userRole !== 'SYS_ADMIN') {
      throw new ForbiddenError('Only group admin or system admin can remove members');
    }

    // Prevent admin from removing themselves
    if (member.userId === adminUserId) {
      throw new ValidationError('Admin cannot remove themselves from the group');
    }

    // Check if the member has any financial history
    const contributionCount = await prisma.contribution.count({ where: { memberId } });
    const transactionCount = await prisma.transaction.count({ where: { memberId } });
    const withdrawalCount = await prisma.withdrawalRequest.count({ where: { memberId } });

    if (contributionCount === 0 && transactionCount === 0 && withdrawalCount === 0) {
      // Hard delete if no financial history exists
      await prisma.member.delete({ where: { id: memberId } });
      return { ...member, status: 'INACTIVE' };
    }

    // Soft-delete: mark as INACTIVE to preserve financial history
    const updated = await prisma.member.update({
      where: { id: memberId },
      data: { status: 'INACTIVE' },
    });

    return updated;
  }

  async updateMember(memberId: string, adminUserId: string, userRole: string, data: any) {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { group: true },
    });

    if (!member) {
      throw new NotFoundError('Member');
    }

    if (member.group.adminUserId !== adminUserId && userRole !== 'ADMIN' && userRole !== 'SYS_ADMIN') {
      throw new ForbiddenError('Only group admin or system admin can update member details');
    }

    // Filter allowed fields
    const { 
      payoutPosition, nationalId, photoUrl, dateOfBirth, status, accountNumber,
      isSavingsGroupMember, isMicroSavingsMember, isMicroInvestmentMember, isCurrentInAll 
    } = data;
    
    const updateData: any = {};
    if (payoutPosition !== undefined && payoutPosition !== null && payoutPosition !== '') {
      updateData.payoutPosition = parseInt(payoutPosition as string, 10);
    } else if (payoutPosition === null || payoutPosition === '') {
      updateData.payoutPosition = null;
    }
    if (nationalId !== undefined) updateData.nationalId = nationalId;
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = new Date(dateOfBirth);
    if (status !== undefined) updateData.status = status;
    if (accountNumber !== undefined) updateData.accountNumber = accountNumber;
    
    if (isSavingsGroupMember !== undefined) updateData.isSavingsGroupMember = isSavingsGroupMember;
    if (isMicroSavingsMember !== undefined) updateData.isMicroSavingsMember = isMicroSavingsMember;
    if (isMicroInvestmentMember !== undefined) updateData.isMicroInvestmentMember = isMicroInvestmentMember;
    if (isCurrentInAll !== undefined) updateData.isCurrentInAll = isCurrentInAll;
    
    return prisma.$transaction(async (tx) => {
      const updatedMember = await tx.member.update({
        where: { id: memberId },
        data: updateData,
        include: {
          user: { select: { fullName: true, email: true } }
        }
      });

      // Handle Micro-Savings Goal creation
      if (isMicroSavingsMember === true) {
        const existingGoal = await tx.savingsGoal.findFirst({
          where: {
            userId: member.userId,
            groupId: member.groupId,
            category: (SavingsGoalCategory as any).MICRO_SAVINGS
          }
        });

        if (!existingGoal) {
          await tx.savingsGoal.create({
            data: {
              userId: member.userId,
              groupId: member.groupId,
              name: `Micro-Savings: ${member.group.groupName}`,
              category: (SavingsGoalCategory as any).MICRO_SAVINGS,
              targetAmount: 1000000, // Default high target
              currencyCode: member.group.currencyCode,
              status: 'ACTIVE',
              currentAmount: 0
            }
          });
        }
      }

      return updatedMember;
    });
  }

  async getGroupMembers(groupId: string, userId: string, status?: any) {
    // Verify user has access to group
    const member = await prisma.member.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!member && group?.adminUserId !== userId) {
      throw new ForbiddenError('You do not have access to this group');
    }

    const whereClause: any = { groupId };
    if (status) {
      whereClause.status = status;
    } else {
      // By default, do not return INACTIVE members to keep the list clean
      whereClause.status = { not: 'INACTIVE' };
    }

    return prisma.member.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async generateUniqueAccountNumber(groupPrefix: string): Promise<string> {
    const prefix = groupPrefix || 'DSV'; // Fallback to avoid 'undefined'
    let isUnique = false;
    let accountNumber = '';

    while (!isUnique) {
      accountNumber = generateAccountNumber(prefix);
      const existing = await prisma.member.findUnique({
        where: { accountNumber },
      });
      isUnique = !existing;
    }

    return accountNumber;
  }

  async bulkUpdateMembers(groupId: string, memberIds: string[], data: any, adminUserId: string, userRole: string) {
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundError('Group');
    if (group.adminUserId !== adminUserId && userRole !== 'ADMIN' && userRole !== 'SYS_ADMIN') {
      throw new ForbiddenError('Only group admin or system admin can perform bulk updates');
    }

    // Filter allowed fields for bulk update
    const { isSavingsGroupMember, isMicroSavingsMember, isMicroInvestmentMember, isCurrentInAll, status } = data;
    const updateData: any = {};
    if (isSavingsGroupMember !== undefined) updateData.isSavingsGroupMember = isSavingsGroupMember;
    if (isMicroSavingsMember !== undefined) updateData.isMicroSavingsMember = isMicroSavingsMember;
    if (isMicroInvestmentMember !== undefined) updateData.isMicroInvestmentMember = isMicroInvestmentMember;
    if (isCurrentInAll !== undefined) updateData.isCurrentInAll = isCurrentInAll;
    if (status !== undefined) updateData.status = status;

    const result = await (prisma.member as any).updateMany({
      where: {
        id: { in: memberIds },
        groupId: groupId,
      },
      data: updateData,
    });

    // Handle Micro-Savings Goal creation for bulk update
    if (isMicroSavingsMember === true) {
      const members = await prisma.member.findMany({
        where: { id: { in: memberIds } },
        include: { group: true }
      });

      for (const m of members) {
        const existingGoal = await prisma.savingsGoal.findFirst({
          where: {
            userId: m.userId,
            groupId: m.groupId,
            category: (SavingsGoalCategory as any).MICRO_SAVINGS
          }
        });

        if (!existingGoal) {
          await prisma.savingsGoal.create({
            data: {
              userId: m.userId,
              groupId: m.groupId,
              name: `Micro-Savings: ${m.group.groupName}`,
              category: (SavingsGoalCategory as any).MICRO_SAVINGS,
              targetAmount: 1000000,
              currencyCode: m.group.currencyCode,
              status: 'ACTIVE',
              currentAmount: 0
            }
          });
        }
      }
    }

    return result;
  }
}
