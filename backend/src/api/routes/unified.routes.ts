import { Router } from 'express';
import { unifiedController } from '../controllers/unified.controller';
import { authenticate } from '../middleware/auth.middleware';
import { checkFeatureFlag } from '../middleware/feature-flag.middleware';

const router = Router();

// Net Worth Summary & Trends
router.get(
  '/summary',
  authenticate,
  unifiedController.getSummary
);

// Cross-service actions
router.post(
  '/invest-goal',
  authenticate,
  unifiedController.investGoal
);

export default router;
