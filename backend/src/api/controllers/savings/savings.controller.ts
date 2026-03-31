import { Request, Response, NextFunction } from 'express';
import { SavingsGoalService } from '@/services/savings/savings-goal.service';
import { SavingsAutomationService } from '@/services/savings/savings-automation.service';
import { SavingsChallengeService, SavingsAnalyticsService } from '@/services/savings/challenge-analytics.service';
import { MicroSavingsService } from '@/services/savings/micro-savings.service';
import { InvestmentService } from '@/services/investments/investment.service';
import { featureFlagService } from '@/services/feature-flag.service';

export class SavingsController {
  private goalService = new SavingsGoalService();
  private automationService = new SavingsAutomationService();
  private challengeService = new SavingsChallengeService();
  private analyticsService = new SavingsAnalyticsService();
  private microSavingsService = new MicroSavingsService();
  private investmentService = new InvestmentService();

  private checkFeature(req: Request, res: Response): boolean {
    if (!featureFlagService.isEnabled('micro_savings_enabled')) {
      res.status(403).json({
        success: false,
        message: 'Micro Savings feature is currently disabled'
      });
      return false;
    }
    return true;
  }

  // --- Savings Goals ---
  
  async createGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const goal = await this.goalService.createGoal(userId, req.body);
      res.status(201).json({ success: true, data: goal });
    } catch (error) {
      next(error);
    }
  }

  async getMyGoals(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const goals = await this.goalService.getGoalsByUser(userId);
      res.status(200).json({ success: true, data: goals }); 
    } catch (error) {
      next(error);
    }
  }

  async deleteGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const goalId = req.params.goalId as string;
      const result = await this.goalService.deleteOrphanGoal(goalId, userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async makeDeposit(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const goalId = req.params.goalId as string;
      const { amount } = req.body;
      const deposit = await this.goalService.makeDeposit(goalId, userId, amount);
      res.status(200).json({ success: true, data: deposit });
    } catch (error) {
      next(error);
    }
  }

  async getGoalAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const goalId = req.params.goalId as string;
      const analytics = await this.goalService.getGoalAnalytics(goalId, userId);
      res.status(200).json({ success: true, data: analytics });
    } catch (error) {
      next(error);
    }
  }

  // --- Automations ---

  async createRoundUp(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { goalId, roundUpTo } = req.body;
      const automation = await this.automationService.createRoundUpRule(userId, goalId, roundUpTo);
      res.status(201).json({ success: true, data: automation });
    } catch (error) {
      next(error);
    }
  }

  // --- Challenges ---

  async joinChallenge(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const challengeId = req.params.challengeId as string;
      const { savingsGoalId } = req.body;
      const participation = await this.challengeService.joinChallenge(userId, challengeId, savingsGoalId);
      res.status(201).json({ success: true, data: participation });
    } catch (error) {
      next(error);
    }
  }

  // --- Shared Analytics ---

  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const summary = await this.analyticsService.getUserSummary(userId, new Date(Date.now() - 30*24*60*60*1000), new Date());
      res.status(200).json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }

  // --- Micro Savings Specifics ---

  async requestWithdrawal(req: Request, res: Response, next: NextFunction) {
    try {
      if (!this.checkFeature(req, res)) return;
      const userId = (req as any).user.id;
      const goalId = req.params.goalId as string;
      const result = await this.microSavingsService.requestWithdrawal(goalId, userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // --- Admin Withdrawal Control ---
  
  async getGroupWithdrawalRequests(req: Request, res: Response, next: NextFunction) {
    try {
      if (!this.checkFeature(req, res)) return;
      const groupId = req.params.groupId as string;
      const result = await this.microSavingsService.getGroupWithdrawalRequests(groupId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async approveWithdrawalRequest(req: Request, res: Response, next: NextFunction) {
    try {
      if (!this.checkFeature(req, res)) return;
      const requestId = req.params.requestId as string;
      const adminId = (req as any).user.id;
      const result = await this.microSavingsService.approveWithdrawalRequest(requestId, adminId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async denyWithdrawalRequest(req: Request, res: Response, next: NextFunction) {
    try {
      if (!this.checkFeature(req, res)) return;
      const requestId = req.params.requestId as string;
      const adminId = (req as any).user.id;
      const result = await this.microSavingsService.denyWithdrawalRequest(requestId, adminId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async reinvestSavings(req: Request, res: Response, next: NextFunction) {
    try {
      if (!this.checkFeature(req, res)) return;
      const userId = (req as any).user.id;
      const goalId = req.params.goalId as string;
      const result = await this.investmentService.reinvestFromSavings(userId, goalId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async toggleParticipation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { optedOut } = req.body;
      const user = await this.microSavingsService.toggleGroupParticipation(userId, optedOut);
      res.status(200).json({ 
        success: true, 
        message: optedOut ? 'Opted out of group savings' : 'Opted into group savings',
        data: { optedOutOfGroupSavings: (user as any).optedOutOfGroupSavings }
      });
    } catch (error) {
      next(error);
    }
  }
}
