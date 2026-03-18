import { Request, Response, NextFunction } from 'express';
import { InvitationService } from '@/services/invitations/invitation.service';
import { AuthRequest } from '@/api/middleware/auth.middleware';

export class InvitationController {
  private invitationService: InvitationService;

  constructor() {
    this.invitationService = new InvitationService();
  }

  async createInvitation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const adminUserId = req.user!.id;
      const { groupId } = req.params;
      const { expiryDays, maxUses } = req.body;
      const invitation = await this.invitationService.createInvitation(groupId as string, adminUserId, expiryDays, maxUses);

      res.status(201).json({
        success: true,
        data: invitation,
      });
    } catch (error) {
      next(error);
    }
  }

  async sendPhoneInvitation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const adminUserId = req.user!.id;
      const { groupId } = req.params;
      const { phoneNumber, recipientName } = req.body;
      const invitation = await this.invitationService.sendPhoneInvitation(groupId as string, adminUserId, phoneNumber, recipientName);

      res.status(200).json({
        success: true,
        data: invitation,
      });
    } catch (error) {
      next(error);
    }
  }

  async validateInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const { groupId, token } = req.params;
      const result = await this.invitationService.validateInvitation(groupId as string, token as string);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getInvitationByToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;
      const result = await this.invitationService.getInvitationByToken(token as string);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async joinGroupByToken(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { token } = req.params;
      const result = await this.invitationService.joinGroupByToken(token as string, userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
