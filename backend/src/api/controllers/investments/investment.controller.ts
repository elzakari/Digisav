import { Request, Response, NextFunction } from 'express';
import { InvestmentService } from '../../../services/investments/investment.service';
import { PortfolioService } from '../../../services/investments/portfolio.service';
import { TradingService } from '../../../services/investments/trading.service';
import { RoboAdvisorService } from '../../../services/investments/robo-advisor.service';
import { FeatureFlagService } from '../../../services/feature-flag.service';
import { ForbiddenError } from '../../../utils/errors';

const investmentService = new InvestmentService();
const portfolioService = new PortfolioService();
const tradingService = new TradingService();
const roboAdvisorService = new RoboAdvisorService();
const featureFlagService = new FeatureFlagService();

export class InvestmentController {
  private async checkFeatureFlag() {
    if (!featureFlagService.isEnabled('micro_investments_enabled')) {
      throw new ForbiddenError('Micro-Investments feature is currently disabled');
    }
  }

  getAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.checkFeatureFlag();
      const userId = (req as any).user.id;
      const account = await investmentService.getOrCreateAccount(userId);
      res.json(account);
    } catch (error) {
      next(error);
    }
  };

  getPortfolio = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.checkFeatureFlag();
      const userId = (req as any).user.id;
      const summary = await portfolioService.getPortfolioSummary(userId);
      res.json(summary);
    } catch (error) {
      next(error);
    }
  };

  getAllocation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.checkFeatureFlag();
      const userId = (req as any).user.id;
      const allocation = await portfolioService.getAllocationBreakdown(userId);
      res.json(allocation);
    } catch (error) {
      next(error);
    }
  };

  deposit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.checkFeatureFlag();
      const userId = (req as any).user.id;
      const { amount, description } = req.body;
      const account = await investmentService.depositCash(userId, Number(amount), description);
      res.json(account);
    } catch (error) {
      next(error);
    }
  };

  placeOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.checkFeatureFlag();
      const userId = (req as any).user.id;
      const { productId, quantity, type } = req.body;
      const order = await tradingService.placeOrder(userId, productId, Number(quantity), type);
      res.json(order);
    } catch (error) {
      next(error);
    }
  };

  getRecommendation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.checkFeatureFlag();
      const userId = (req as any).user.id;
      const recommendation = await roboAdvisorService.generateRecommendation(userId);
      res.json(recommendation);
    } catch (error) {
      next(error);
    }
  };

  applyRecommendation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.checkFeatureFlag();
      const userId = (req as any).user.id;
      const { recommendationId } = req.params;
      const result = await roboAdvisorService.applyRecommendation(userId, recommendationId as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.checkFeatureFlag();
      const userId = (req as any).user.id;
      const history = await investmentService.getTransactionHistory(userId);
      res.json(history);
    } catch (error) {
      next(error);
    }
  };
}
