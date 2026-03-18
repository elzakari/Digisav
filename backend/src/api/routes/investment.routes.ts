import { Router } from 'express';
import { InvestmentController } from '../controllers/investments/investment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const controller = new InvestmentController();

// All investment routes require authentication
router.use(authenticate);

// Account & Balance
router.get('/account', controller.getAccount);
router.post('/deposit', controller.deposit);

// Portfolio & Performance
router.get('/portfolio', controller.getPortfolio);
router.get('/allocation', controller.getAllocation);
router.get('/transactions', controller.getTransactions);

// Trading
router.post('/orders', controller.placeOrder);

// Robo-Advisor
router.post('/recommendations', controller.getRecommendation);
router.post('/recommendations/:recommendationId/apply', controller.applyRecommendation);

export default router;
