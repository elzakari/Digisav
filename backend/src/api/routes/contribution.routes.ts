import { Router } from 'express';
import { ContributionController } from '@/api/controllers/contribution.controller';
import { authenticate } from '@/api/middleware/auth.middleware';

const router = Router();
const controller = new ContributionController();

// All routes require authentication
// router.use(authenticate);

router.post('/groups/:groupId/contributions', authenticate, controller.recordContribution.bind(controller));
router.get('/groups/:groupId/stats', authenticate, controller.getGroupStats.bind(controller));
router.get('/groups/:groupId/contributions', authenticate, controller.getContributionHistory.bind(controller));
router.get('/groups/:groupId/calendar', authenticate, controller.getCalendarData.bind(controller));

export default router;
