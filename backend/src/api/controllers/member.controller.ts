import { Request, Response, NextFunction } from 'express';
import { MemberService } from '@/services/members/member.service';
import { AuthRequest } from '@/api/middleware/auth.middleware';
import { InvitationService } from '@/services/invitations/invitation.service';
import { ValidationError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export class MemberController {
  private memberService: MemberService;
  private invitationService: InvitationService;

  constructor() {
    this.memberService = new MemberService();
    this.invitationService = new InvitationService();
  }

  async registerMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params as any;

      const { invitationToken, ...rest } = req.body;
      if (!invitationToken || typeof invitationToken !== 'string') {
        throw new ValidationError('Invitation token is required');
      }

      await this.invitationService.validateInvitation(groupId, invitationToken);

      const member = await this.memberService.registerMember({
        userId,
        groupId,
        ...rest,
      });

      await this.invitationService.consumeInvitation(invitationToken);

      res.status(201).json({
        success: true,
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  async requestJoinByCode(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { groupCode, nationalId, dateOfBirth, photoUrl } = req.body as any;

      if (!groupCode || typeof groupCode !== 'string') {
        throw new ValidationError('Group code is required');
      }
      if (!nationalId || typeof nationalId !== 'string') {
        throw new ValidationError('National ID is required');
      }

      const group = await prisma.group.findUnique({ where: { groupPrefix: groupCode.trim().toUpperCase() } });
      if (!group) throw new ValidationError('Invalid group code');

      const member = await this.memberService.registerMember({
        userId,
        groupId: group.id,
        nationalId: nationalId.trim(),
        ...(photoUrl ? { photoUrl: String(photoUrl) } : {}),
        ...(dateOfBirth ? { dateOfBirth: new Date(dateOfBirth) } : {}),
      });

      res.status(201).json({ success: true, data: member });
    } catch (error) {
      next(error);
    }
  }

  async approveMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const adminUserId = req.user!.id;
      const userRole = req.user!.role;
      const { memberId } = req.params as any;
      const member = await this.memberService.approveMember(memberId, adminUserId, userRole);

      res.status(200).json({
        success: true,
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  async rejectMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const adminUserId = req.user!.id;
      const userRole = req.user!.role;
      const { memberId } = req.params as any;
      const member = await this.memberService.rejectMember(memberId, adminUserId, userRole);

      res.status(200).json({
        success: true,
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  async suspendMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const adminUserId = req.user!.id;
      const userRole = req.user!.role;
      const { memberId } = req.params as any;
      const member = await this.memberService.suspendMember(memberId, adminUserId, userRole);

      res.status(200).json({
        success: true,
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const adminUserId = req.user!.id;
      const userRole = req.user!.role;
      const { memberId } = req.params as any;
      const member = await this.memberService.removeMember(memberId, adminUserId, userRole);

      res.status(200).json({
        success: true,
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  async getGroupMembers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params as any;
      const { status } = req.query as any;
      const members = await this.memberService.getGroupMembers(groupId, userId, status as string);

      res.status(200).json({
        success: true,
        data: members,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const adminUserId = req.user!.id;
      const userRole = req.user!.role;
      const { memberId } = req.params as any;
      const member = await this.memberService.updateMember(memberId, adminUserId, userRole, req.body);

      res.status(200).json({
        success: true,
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkUpdate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const adminUserId = req.user!.id;
      const userRole = req.user!.role;
      const { groupId } = req.params as any;
      const { memberIds, data } = req.body;
      
      const result = await this.memberService.bulkUpdateMembers(groupId, memberIds, data, adminUserId, userRole);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
