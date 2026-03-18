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
      const groups = await this.groupService.getUserGroups(userId);

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
