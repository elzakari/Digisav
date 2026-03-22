import { Router } from 'express';
import { MessageController } from '@/api/controllers/message.controller';
import { authenticate, requireGroupAdmin } from '@/api/middleware/auth.middleware';

const router = Router();
const controller = new MessageController();

router.post('/groups/:groupId/messages', authenticate, requireGroupAdmin, controller.sendMessage.bind(controller));

export default router;
