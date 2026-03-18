import { Router } from 'express';
import { ReportController } from '@/api/controllers/report.controller';
import { authenticate } from '@/api/middleware/auth.middleware';

const router = Router();
const controller = new ReportController();

// router.use(authenticate);

router.post('/groups/:groupId/reports', authenticate, controller.generateReport.bind(controller));
router.post('/groups/:groupId/reports/share', authenticate, controller.generateShareLink.bind(controller));
router.get('/reports/public/:token', controller.getPublicReport.bind(controller));

export default router;
