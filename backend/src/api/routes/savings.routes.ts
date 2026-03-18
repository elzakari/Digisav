import { Router } from 'express';
import { SavingsController } from '@/api/controllers/savings/savings.controller';
import { authenticate, requireGroupAdmin } from '@/api/middleware/auth.middleware';

const router = Router();
const controller = new SavingsController();

// --- Savings Goals ---
router.post('/goals', authenticate, controller.createGoal.bind(controller));
router.get('/goals', authenticate, controller.getMyGoals.bind(controller));
router.post('/goals/:goalId/deposits', authenticate, controller.makeDeposit.bind(controller));
router.get('/goals/:goalId/analytics', authenticate, controller.getGoalAnalytics.bind(controller));

// --- Automations ---
router.post('/automations/round-up', authenticate, controller.createRoundUp.bind(controller));

// --- Challenges ---
router.post('/challenges/:challengeId/join', authenticate, controller.joinChallenge.bind(controller));

// --- Analytics ---
router.get('/analytics/summary', authenticate, controller.getSummary.bind(controller));

// --- Micro Savings Specifics ---
router.post('/goals/:goalId/withdraw', authenticate, controller.requestWithdrawal.bind(controller));
router.post('/goals/:goalId/reinvest', authenticate, controller.reinvestSavings.bind(controller));
router.post('/participation', authenticate, controller.toggleParticipation.bind(controller));

// --- Micro Savings Admin Control ---
router.get('/groups/:groupId/withdrawals', authenticate, requireGroupAdmin, controller.getGroupWithdrawalRequests.bind(controller));
router.post('/groups/:groupId/withdrawals/:requestId/approve', authenticate, requireGroupAdmin, controller.approveWithdrawalRequest.bind(controller));
router.post('/groups/:groupId/withdrawals/:requestId/deny', authenticate, requireGroupAdmin, controller.denyWithdrawalRequest.bind(controller));

export default router;
