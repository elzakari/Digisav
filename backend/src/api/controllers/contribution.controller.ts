import { Request, Response, NextFunction } from 'express';
import { ContributionService } from '@/services/contributions/contribution.service';
import { AuthRequest } from '@/api/middleware/auth.middleware';
import { PaymentMethod } from '@prisma/client';

export class ContributionController {
  private contributionService: ContributionService;

  constructor() {
    this.contributionService = new ContributionService();
  }

  async recordContribution(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params as any;
      const { memberId, amount, currencyCode, paymentDate, paymentMethod, referenceNumber, notes, isPersonalSavings } = req.body;

      const contribution = await this.contributionService.recordContribution({
        memberId,
        groupId,
        amount,
        currencyCode,
        paymentDate: new Date(paymentDate),
        paymentMethod: paymentMethod as PaymentMethod,
        referenceNumber,
        notes,
        recordedBy: userId,
        isPersonalSavings,
      });

      res.status(201).json({
        success: true,
        data: contribution,
      });
    } catch (error) {
      next(error);
    }
  }

  async getGroupStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { groupId } = req.params as any;
      const stats = await this.contributionService.getGroupStats(groupId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  async getContributionHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { groupId } = req.params as any;
      const { memberId } = req.query as any;
      const contributions = await this.contributionService.getContributionHistory(groupId, memberId as string);

      res.status(200).json({
        success: true,
        data: contributions,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCalendarData(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { groupId } = req.params as any;
      const data = await (this.contributionService as any).getCalendarData(groupId);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyLedger(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { groupId } = req.params as any;
      const ok = await this.contributionService.verifyLedgerIntegrity(groupId);
      res.status(200).json({
        success: true,
        data: { ok },
      });
    } catch (error) {
      next(error);
    }
  }
}
