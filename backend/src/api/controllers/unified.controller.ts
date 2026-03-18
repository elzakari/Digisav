import { Request, Response, NextFunction } from 'express';
import { unifiedService } from '../../services/unified.service';
import { integrationService } from '../../services/integration.service';

export class UnifiedController {
  /**
   * GET /api/v1/unified/summary
   * Get total net worth and individual module breakdowns
   */
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const summary = await unifiedService.getFinancialSummary(userId);
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/unified/invest-goal
   * Transfer completed savings goal to investment account
   */
  async investGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { goalId } = req.body;
      
      const result = await integrationService.investCompletedGoal(goalId, userId);
      
      res.json({
        success: true,
        data: result,
        message: 'Goal funds successfully transferred to investment account'
      });
    } catch (error) {
      next(error);
    }
  }
}

export const unifiedController = new UnifiedController();
