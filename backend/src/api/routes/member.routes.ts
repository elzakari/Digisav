import { Router } from 'express';
import { MemberController } from '@/api/controllers/member.controller';
import { authenticate, requireGroupAdmin, requireGroupMember } from '@/api/middleware/auth.middleware';

const router = Router();
const controller = new MemberController();

// All routes require authentication
// Removed global authenticate to avoid overlapping on shared mount points

// Register a member to a group
router.post('/groups/:groupId/members', authenticate, controller.registerMember.bind(controller));

// Request to join a group by code (member -> admin approval)
router.post('/groups/join-requests', authenticate, controller.requestJoinByCode.bind(controller));

// Get all members of a group
router.get('/groups/:groupId/members', authenticate, requireGroupMember, controller.getGroupMembers.bind(controller));

// Approve a member (Admin only)
router.patch('/members/:memberId/approve', authenticate, controller.approveMember.bind(controller));

// Reject a member (Admin only)
router.patch('/members/:memberId/reject', authenticate, controller.rejectMember.bind(controller));

// Suspend a member (Admin only)
router.patch('/members/:memberId/suspend', authenticate, controller.suspendMember.bind(controller));

// Update member details (Admin only)
router.patch('/members/:memberId', authenticate, controller.updateMember.bind(controller));

// Bulk update members (Admin only)
router.patch('/groups/:groupId/members/bulk', authenticate, requireGroupAdmin, controller.bulkUpdate.bind(controller));

export default router;
