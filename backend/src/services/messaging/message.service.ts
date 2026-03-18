import Bull from 'bull';
import { MessageChannel } from '@prisma/client';
import prisma from '@/lib/prisma';
import axios from 'axios';
import { MESSAGE_TEMPLATES } from '@/constants/message-templates';

export class MessageService {
  private messageQueue: Bull.Queue;

  constructor() {
    this.messageQueue = new Bull('message-queue', {
      redis: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.processQueue();
  }

  async sendMessage(data: {
    groupId: string;
    memberId: string;
    messageType: string;
    channel: 'SMS' | 'WHATSAPP';
    templateId: keyof typeof MESSAGE_TEMPLATES;
    variables: Record<string, string>;
  }) {
    // 1. Get member phone number
    const member = await prisma.member.findUnique({
      where: { id: data.memberId },
      include: { user: true },
    });

    if (!member) throw new Error('Member not found');
    if (!(member as any).optInMessaging) {
      console.log(`Member ${data.memberId} has opted out of messaging.`);
      return null;
    }

    // 2. Get message template
    const template = (MESSAGE_TEMPLATES[data.templateId] as any)?.[data.channel] || '';
    if (!template) throw new Error('Template not found');

    // 3. Replace variables
    let messageBody = template;
    for (const [key, value] of Object.entries(data.variables)) {
      messageBody = messageBody.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    // 4. Create message record
    const message = await prisma.message.create({
      data: {
        groupId: data.groupId,
        memberId: data.memberId,
        messageType: data.messageType,
        channel: data.channel as MessageChannel,
        templateId: data.templateId,
        recipientPhone: member.user.phoneNumber,
        messageBody,
        deliveryStatus: 'PENDING',
      },
    });

    // 5. Add to queue
    await this.messageQueue.add({
      messageId: message.id,
      channel: data.channel,
      recipientPhone: member.user.phoneNumber,
      messageBody,
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000, // 1 minute
      },
    });

    return message;
  }

  private processQueue() {
    this.messageQueue.process(async (job) => {
      const { messageId, channel, recipientPhone, messageBody } = job.data;

      try {
        let result;
        if (channel === 'WHATSAPP') {
          result = await this.sendWhatsApp(recipientPhone, messageBody);
        } else {
          result = await this.sendSMS(recipientPhone, messageBody);
        }

        if (result && (result as any).sid) {
          await prisma.message.update({
            where: { id: messageId },
            data: {
              externalId: (result as any).sid,
              deliveryStatus: 'SENT',
              sentAt: new Date(),
            },
          });
        } else {
          await prisma.message.update({
            where: { id: messageId },
            data: {
              deliveryStatus: 'SENT',
              sentAt: new Date(),
            },
          });
        }

        return result;
      } catch (error: any) {
        await prisma.message.update({
          where: { id: messageId },
          data: {
            deliveryStatus: 'FAILED',
            errorMessage: error.message,
          },
        });
        throw error;
      }
    });
  }

  private async sendSMS(phone: string, message: string) {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log('Mock SMS sent:', { phone, message });
      return { sid: 'mock-sid' };
    }

    const client = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    return result;
  }

  private async sendWhatsApp(phone: string, message: string) {
    if (!process.env.WHATSAPP_ACCESS_TOKEN) {
      console.log('Mock WhatsApp sent:', { phone, message });
      return { id: 'mock-id' };
    }

    const response = await axios.post(
      `${process.env.WHATSAPP_API_URL}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }
}
