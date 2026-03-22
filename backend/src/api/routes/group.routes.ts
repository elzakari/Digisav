import { Router } from 'express';
import { GroupController } from '@/api/controllers/group.controller';
import { authenticate, requireGroupAdmin } from '@/api/middleware/auth.middleware';
import { validateRequest } from '@/api/middleware/validation.middleware';
import { createGroupSchema, updateGroupSchema } from '@/api/validators/group.validators';

const router = Router();
const controller = new GroupController();

// Create group
router.post(
  '/',
  authenticate,
  validateRequest(createGroupSchema),
  controller.createGroup.bind(controller)
);

// Get my groups
router.get('/', authenticate, controller.getMyGroups.bind(controller));

// Get admin and member aggregated stats
router.get('/admin/stats', authenticate, controller.getAdminAggregateStats.bind(controller));
router.get('/member/stats', authenticate, controller.getMemberAggregateStats.bind(controller));

// Get group by ID
router.get('/:groupId', authenticate, controller.getGroupById.bind(controller));

router.get('/:groupId/dashboard', authenticate, requireGroupAdmin, controller.getGroupDashboard.bind(controller));
router.get('/:groupId/transactions', authenticate, controller.getGroupTransactions.bind(controller));

// Update group
router.patch(
  '/:groupId',
  authenticate,
  requireGroupAdmin,
  validateRequest(updateGroupSchema),
  controller.updateGroup.bind(controller)
);

// Activate group
router.post('/:groupId/activate', authenticate, requireGroupAdmin, controller.activateGroup.bind(controller));

// Delete group (DRAFT = hard delete, ACTIVE = soft archive)
router.delete('/:groupId', authenticate, requireGroupAdmin, controller.deleteGroup.bind(controller));

// Group Admin specific settings
router.patch('/:groupId/fees', authenticate, requireGroupAdmin, controller.updateGroupFees.bind(controller));
router.patch('/:groupId/micro-investments', authenticate, requireGroupAdmin, controller.toggleMicroInvestments.bind(controller));
router.post('/:groupId/notifications', authenticate, requireGroupAdmin, controller.sendGroupNotification.bind(controller));
router.post('/:groupId/notify', authenticate, requireGroupAdmin, controller.sendGroupNotification.bind(controller));

export default router;
