import { Router } from 'express';
import { PayoutController } from '@/api/controllers/payout.controller';
import { authenticate, requireGroupAdmin } from '@/api/middleware/auth.middleware';
import { validateRequest } from '@/api/middleware/validation.middleware';
import { adjustPayoutSchema } from '@/api/validators/payout.validators';

const router = Router();
const controller = new PayoutController();

// Record a payout wrapper for a member in a group
router.post('/groups/:groupId/payouts/:memberId', authenticate, controller.recordPayout.bind(controller));

// Adjust a previously recorded payout (appends an ADJUSTMENT ledger entry)
router.patch(
  '/groups/:groupId/payouts/:transactionId',
  authenticate,
  requireGroupAdmin,
  validateRequest(adjustPayoutSchema),
  controller.adjustPayout.bind(controller)
);

export default router;
