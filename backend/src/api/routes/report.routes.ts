import { Router } from 'express';
import { ReportController } from '@/api/controllers/report.controller';
import { authenticate, requireGroupAdmin } from '@/api/middleware/auth.middleware';

const router = Router();
const controller = new ReportController();

// router.use(authenticate);

router.post('/groups/:groupId/reports', authenticate, requireGroupAdmin, controller.generateReport.bind(controller));
router.post('/groups/:groupId/reports/share', authenticate, requireGroupAdmin, controller.generateShareLink.bind(controller));
router.get('/reports/public/:token', controller.getPublicReport.bind(controller));

export default router;
