import { Router } from 'express';
import { sysAdminController } from '../controllers/sysadmin.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Protect ALL routes below with authentication and SYS_ADMIN role
router.use(authenticate);
router.use(authorize(['SYS_ADMIN']));

router.get('/stats', sysAdminController.getPlatformStats);
router.get('/users', sysAdminController.getAllUsers);
router.get('/groups', sysAdminController.getAllGroups);
router.patch('/users/:userId', sysAdminController.updateUser);
router.patch('/groups/:groupId', sysAdminController.updateGroupStatus);

export default router;
