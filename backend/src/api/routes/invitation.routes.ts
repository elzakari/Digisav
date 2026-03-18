import { Router } from 'express';
import { InvitationController } from '@/api/controllers/invitation.controller';
import { authenticate } from '@/api/middleware/auth.middleware';

const router = Router();
const controller = new InvitationController();

// Create invitation (Admin only)
router.post('/groups/:groupId/invitations', authenticate, controller.createInvitation.bind(controller));

// Send phone invitation (Admin only)
router.post('/groups/:groupId/invitations/phone', authenticate, controller.sendPhoneInvitation.bind(controller));

// Validate invitation (Public - Legacy)
router.get('/groups/:groupId/invitations/:token/validate', controller.validateInvitation.bind(controller));

// Unified Invitation Routes (By Token)
router.get('/invitations/:token', controller.getInvitationByToken.bind(controller));
router.post('/invitations/:token/join', authenticate, controller.joinGroupByToken.bind(controller));

export default router;
