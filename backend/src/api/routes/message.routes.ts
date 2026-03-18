import { Router } from 'express';
import { MessageController } from '@/api/controllers/message.controller';
import { authenticate } from '@/api/middleware/auth.middleware';

const router = Router();
const controller = new MessageController();

// Protected routes
router.post('/groups/:groupId/messages', authenticate, controller.sendMessage.bind(controller));

// Webhooks (Public)
router.post('/webhooks/twilio/status', controller.handleTwilioWebhook.bind(controller));
router.post('/webhooks/whatsapp/status', controller.handleWhatsAppWebhook.bind(controller));

export default router;
