import { Request, Response, NextFunction } from 'express';
import { MessageService } from '@/services/messaging/message.service';
import { AuthRequest } from '@/api/middleware/auth.middleware';
import { MessageChannel } from '@prisma/client';
import { MESSAGE_TEMPLATES } from '@/constants/message-templates';

export class MessageController {
  private messageService: MessageService;

  constructor() {
    this.messageService = new MessageService();
  }

  async sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { groupId } = req.params as any;
      const { memberId, messageType, channel, templateId, variables } = req.body;

      const message = await this.messageService.sendMessage({
        groupId,
        memberId,
        messageType,
        channel: channel as 'SMS' | 'WHATSAPP',
        templateId: templateId as keyof typeof MESSAGE_TEMPLATES,
        variables,
      });

      res.status(201).json({
        success: true,
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }

  async handleTwilioWebhook(req: Request, res: Response) {
    // This is a simplified webhook handler
    // In a real app, you would verify the Twilio signature and update message status
    console.log('Twilio Webhook:', req.body);
    res.sendStatus(200);
  }

  async handleWhatsAppWebhook(req: Request, res: Response) {
    // This is a simplified webhook handler
    console.log('WhatsApp Webhook:', req.body);
    res.sendStatus(200);
  }
}
