import prisma from '@/lib/prisma';
import { generateInvitationToken, generateAccountNumber } from '@/utils/generators';
import { NotFoundError, ForbiddenError, ValidationError } from '@/utils/errors';

export class InvitationService {
  async createInvitation(groupId: string, adminUserId: string, expiryDays: number = 7, maxUses: number = 10) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundError('Group');
    }

    if (group.adminUserId !== adminUserId) {
      throw new ForbiddenError('Only group admin can create invitations');
    }

    const token = generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    // Persist invitation in DB
    const invitation = await (prisma as any).invitation.create({
      data: {
        groupId,
        token,
        maxUses,
        expiresAt,
      },
    });

    // Create invitation link
    const invitationLink = `${process.env.FRONTEND_URL}/join/${groupId}/${token}`;

    return {
      id: invitation.id,
      token,
      invitationLink,
      expiresAt,
      groupId,
      groupName: group.groupName,
    };
  }

  async sendPhoneInvitation(
    groupId: string,
    adminUserId: string,
    phoneNumber: string,
    recipientName?: string
  ) {
    const invitation = await this.createInvitation(groupId, adminUserId, 7, 1);

    // Save recipient phone for tracking
    await (prisma as any).invitation.update({
      where: { id: invitation.id },
      data: {
        recipientPhone: phoneNumber,
        // If there was a recipient name field in schema, we'd save it here. 
        // For now, we'll just use it in the message.
      },
    });

    const greeting = recipientName ? `Hi ${recipientName}, ` : `Hi, `;

    return {
      ...invitation,
      recipientPhone: phoneNumber,
      message: `${greeting}you've been invited to join ${invitation.groupName}. Click here: ${invitation.invitationLink}`,
    };
  }

  async getInvitationByToken(token: string) {
    const invitation = await (prisma as any).invitation.findUnique({
      where: { token },
      include: {
        group: {
          select: {
            id: true,
            groupName: true,
            groupPrefix: true,
            contributionAmount: true,
            currencyCode: true,
            paymentFrequency: true,
            maxMembers: true,
            _count: { select: { members: true } }
          }
        }
      }
    });

    if (!invitation) {
      throw new NotFoundError('Invitation');
    }

    if (new Date() > invitation.expiresAt) {
      throw new ForbiddenError('This invitation has expired');
    }

    if (invitation.usedCount >= invitation.maxUses) {
      throw new ForbiddenError('This invitation has reached its maximum usage limit');
    }

    return {
      id: invitation.id,
      token: invitation.token,
      group: invitation.group,
      expiresAt: invitation.expiresAt
    };
  }

  async joinGroupByToken(token: string, userId: string) {
    const invitation = await this.getInvitationByToken(token);

    // Check if group is full
    if (invitation.group._count.members >= invitation.group.maxMembers) {
      throw new ValidationError('Group has reached maximum capacity');
    }

    // Check if already a member
    const existingMember = await prisma.member.findFirst({
      where: {
        groupId: invitation.group.id,
        userId: userId
      }
    });

    if (existingMember) {
      throw new ValidationError('You are already a member of this group');
    }

    // Create member and increment count in transaction
    const result = await prisma.$transaction(async (tx) => {
      const member = await tx.member.create({
        data: {
          groupId: invitation.group.id,
          userId: userId,
          status: 'PENDING',
          joinDate: new Date(),
          accountNumber: generateAccountNumber(invitation.group.groupPrefix), // Need to import this or pass prefix
          nationalId: 'JOIN-' + token.substring(0, 8), // Temp national ID
        }
      });

      await (tx as any).invitation.update({
        where: { token },
        data: { usedCount: { increment: 1 } }
      });

      return member;
    });

    return result;
  }

  async validateInvitation(groupId: string, token: string) {
    const invitation = await (prisma as any).invitation.findUnique({
      where: { token },
      include: {
        group: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
      },
    });

    if (!invitation || invitation.groupId !== groupId) {
      throw new NotFoundError('Invitation');
    }

    if (new Date() > invitation.expiresAt) {
      throw new ForbiddenError('This invitation has expired');
    }

    if (invitation.usedCount >= invitation.maxUses) {
      throw new ForbiddenError('This invitation has reached its maximum usage limit');
    }

    if (invitation.group._count.members >= invitation.group.maxMembers) {
      throw new ValidationError('Group has reached maximum capacity');
    }

    return {
      valid: true,
      invitationId: invitation.id,
      group: {
        id: invitation.group.id,
        name: invitation.group.groupName,
        contributionAmount: invitation.group.contributionAmount,
        currencyCode: invitation.group.currencyCode,
        paymentFrequency: invitation.group.paymentFrequency,
      },
    };
  }

  async consumeInvitation(token: string) {
    return (prisma as any).invitation.update({
      where: { token },
      data: {
        usedCount: {
          increment: 1,
        },
      },
    });
  }
}
