import { Router } from 'express';
import { PayoutController } from '@/api/controllers/payout.controller';
import { authenticate } from '@/api/middleware/auth.middleware';

const router = Router();
const controller = new PayoutController();

// Record a payout wrapper for a member in a group
router.post('/groups/:groupId/payouts/:memberId', authenticate, controller.recordPayout.bind(controller));

export default router;
