import { Router } from 'express';
import { ContributionController } from '@/api/controllers/contribution.controller';
import { authenticate, requireGroupAdmin, requireGroupMember } from '@/api/middleware/auth.middleware';
import { validateRequest } from '@/api/middleware/validation.middleware';
import { publishMicroSavingsSchema, updateContributionSchema } from '@/api/validators/contribution.validators';

const router = Router();
const controller = new ContributionController();

// All routes require authentication
// router.use(authenticate);

router.post('/groups/:groupId/contributions', authenticate, requireGroupAdmin, controller.recordContribution.bind(controller));
router.get(
  '/groups/:groupId/publish/pending',
  authenticate,
  requireGroupAdmin,
  controller.getUnpublishedMicroSavings.bind(controller)
);
router.post(
  '/groups/:groupId/publish',
  authenticate,
  requireGroupAdmin,
  validateRequest(publishMicroSavingsSchema),
  controller.publishMicroSavings.bind(controller)
);
router.post(
  '/groups/:groupId/micro-savings/recalculate',
  authenticate,
  requireGroupAdmin,
  controller.recalculateMicroSavingsBalances.bind(controller)
);
router.patch(
  '/groups/:groupId/contributions/:contributionId',
  authenticate,
  requireGroupAdmin,
  validateRequest(updateContributionSchema),
  controller.updateContribution.bind(controller)
);
router.get('/groups/:groupId/stats', authenticate, requireGroupMember, controller.getGroupStats.bind(controller));
router.get('/groups/:groupId/contributions', authenticate, requireGroupMember, controller.getContributionHistory.bind(controller));
router.get('/groups/:groupId/calendar', authenticate, requireGroupMember, controller.getCalendarData.bind(controller));
router.get('/groups/:groupId/ledger/verify', authenticate, requireGroupMember, controller.verifyLedger.bind(controller));

export default router;
