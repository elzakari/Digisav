import { Request, Response, NextFunction } from 'express';
import { GroupService } from '@/services/groups/group.service';
import { AuthRequest } from '@/api/middleware/auth.middleware';

export class GroupController {
  private groupService: GroupService;

  constructor() {
    this.groupService = new GroupService();
  }

  async createGroup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const group = await this.groupService.createGroup(userId, req.body);

      res.status(201).json({
        success: true,
        data: group,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyGroups(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const groups = await this.groupService.getUserGroups(userId, req.user!.role);

      res.status(200).json({
        success: true,
        data: groups,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAdminAggregateStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const stats = await this.groupService.getAdminAggregateStats(userId);
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  async getMemberAggregateStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const stats = await this.groupService.getMemberAggregateStats(userId);
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  async getGroupById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;
      const group = await this.groupService.getGroupById(groupId as string, userId, req.user!.role);

      res.status(200).json({
        success: true,
        data: group,
      });
    } catch (error) {
      next(error);
    }
  }

  async getGroupTransactions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;
      const transactions = await this.groupService.getGroupTransactions(groupId as string, userId, req.user!.role);

      res.status(200).json({
        success: true,
        data: transactions,
      });
    } catch (error) {
      next(error);
    }
  }

  async getGroupDashboard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;
      const period = (req.query.period || 'current_cycle').toString();
      const from = req.query.from ? req.query.from.toString() : undefined;
      const to = req.query.to ? req.query.to.toString() : undefined;

      let periodArg: any = { kind: 'current_cycle' };
      if (period === 'range') {
        if (!from || !to) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'from and to are required for range period' },
          });
        }

        const fromDate = new Date(from);
        const toDate = new Date(to);

        if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'from and to must be valid dates (YYYY-MM-DD)' },
          });
        }

        if (fromDate > toDate) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'from must be before to' },
          });
        }

        const fromStart = new Date(fromDate);
        fromStart.setHours(0, 0, 0, 0);
        const toEnd = new Date(toDate);
        toEnd.setHours(23, 59, 59, 999);

        periodArg = { kind: 'range', from: fromStart, to: toEnd };
      }

      const data = await this.groupService.getGroupDashboard(groupId as string, userId, req.user!.role, periodArg);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateGroup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;
      const group = await this.groupService.updateGroup(groupId as string, userId, req.user!.role, req.body);

      res.status(200).json({
        success: true,
        data: group,
      });
    } catch (error) {
      next(error);
    }
  }

  async activateGroup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;
      const group = await this.groupService.activateGroup(groupId as string, userId, req.user!.role);

      res.status(200).json({
        success: true,
        data: group,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteGroup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;
      const result = await this.groupService.deleteGroup(groupId as string, userId, req.user!.role);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async permanentlyDeleteGroup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { groupId } = req.params;
      const { confirmationText } = req.body;
      const result = await this.groupService.permanentlyDeleteGroup(
        groupId as string,
        userId,
        req.user!.role,
        confirmationText
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateGroupFees(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { groupId } = req.params;
      const group = await this.groupService.updateGroupFees(groupId as string, req.body);
      res.status(200).json({ success: true, data: group });
    } catch (error) {
      next(error);
    }
  }

  async toggleMicroInvestments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { groupId } = req.params;
      const { allowMicroInvestments } = req.body;
      const group = await this.groupService.toggleMicroInvestments(groupId as string, allowMicroInvestments);
      res.status(200).json({ success: true, data: group });
    } catch (error) {
      next(error);
    }
  }

  async sendGroupNotification(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { groupId } = req.params;
      const adminId = req.user!.id;
      const result = await this.groupService.sendGroupNotification(groupId as string, adminId, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
