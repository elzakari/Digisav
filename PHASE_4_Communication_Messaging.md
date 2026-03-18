# PHASE 4: COMMUNICATION & MESSAGING SYSTEM

## Overview
Implement automated messaging system with SMS/WhatsApp integration, message templates, delivery tracking, and notification scheduling for payment reminders and updates.

## Objectives
- Integrate SMS gateway (Twilio/Africa's Talking)
- Integrate WhatsApp Business API
- Build message template system
- Implement automated reminder scheduler
- Create message queue and retry logic
- Build delivery tracking system
- Implement opt-out mechanism

## Key Features

### 1. Message Service with Queue

```typescript
// backend/src/services/messaging/message.service.ts
import Bull from 'bull';

export class MessageService {
  private messageQueue: Bull.Queue;

  constructor() {
    this.messageQueue = new Bull('message-queue', {
      redis: process.env.REDIS_URL,
    });
    
    this.processQueue();
  }

  async sendMessage(data: {
    groupId: string;
    memberId: string;
    messageType: string;
    channel: 'SMS' | 'WHATSAPP';
    templateId: string;
    variables: Record<string, string>;
  }) {
    // 1. Get member phone number
    const member = await prisma.member.findUnique({
      where: { id: data.memberId },
      include: { user: true },
    });

    // 2. Get message template
    const template = MESSAGE_TEMPLATES[data.templateId][data.channel];
    
    // 3. Replace variables
    let messageBody = template;
    for (const [key, value] of Object.entries(data.variables)) {
      messageBody = messageBody.replace(`{{${key}}}`, value);
    }

    // 4. Create message record
    const message = await prisma.message.create({
      data: {
        ...data,
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

        await prisma.message.update({
          where: { id: messageId },
          data: {
            deliveryStatus: 'SENT',
            sentAt: new Date(),
          },
        });

        return result;
      } catch (error) {
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
    // Twilio or Africa's Talking implementation
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
    // WhatsApp Business API implementation
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
```

### 2. Message Templates

```typescript
// backend/src/constants/message-templates.ts
export const MESSAGE_TEMPLATES = {
  PAYMENT_REMINDER: {
    SMS: 'Hi {{member_name}}, your {{amount}} contribution is due {{due_date}}. Group: {{group_name}}',
    WHATSAPP: `Hi {{member_name}},\n\nReminder: Your contribution of {{amount}} is due on {{due_date}}.\n\nGroup: {{group_name}}\nAccount: {{account_number}}\n\nThank you!`,
  },
  
  PAYMENT_CONFIRMED: {
    SMS: 'Payment confirmed: {{amount}} received on {{payment_date}}. Thank you!',
    WHATSAPP: `Payment Confirmed! ✅\n\nHi {{member_name}},\n\nWe've received your {{amount}} contribution.\n\nDate: {{payment_date}}\nAccount: {{account_number}}\n\nThank you!`,
  },
  
  PAYMENT_OVERDUE: {
    SMS: 'URGENT: Your {{amount}} payment is {{days_overdue}} days overdue. Please pay ASAP. Group: {{group_name}}',
    WHATSAPP: `⚠️ Payment Overdue\n\nHi {{member_name}},\n\nYour {{amount}} contribution is {{days_overdue}} days overdue.\n\nPlease make payment as soon as possible to avoid penalties.\n\nGroup: {{group_name}}\nContact admin: {{admin_contact}}`,
  },
  
  PAYOUT_NOTIFICATION: {
    SMS: 'You\'ll receive {{payout_amount}} on {{payout_date}}. Group: {{group_name}}',
    WHATSAPP: `Payout Notice 💰\n\nHi {{member_name}},\n\nYou're scheduled to receive {{payout_amount}} on {{payout_date}}.\n\nGroup: {{group_name}}\n\nStay tuned!`,
  },
  
  MEMBER_APPROVED: {
    SMS: 'Welcome to {{group_name}}! Your account: {{account_number}}. First payment: {{amount}} due {{due_date}}',
    WHATSAPP: `Welcome! 🎉\n\nHi {{member_name}},\n\nYou've been approved to join {{group_name}}!\n\nAccount Number: {{account_number}}\nContribution Amount: {{amount}}\nPayment Frequency: {{frequency}}\nFirst Payment Due: {{due_date}}\n\nWelcome aboard!`,
  },
  
  MONTHLY_SUMMARY: {
    WHATSAPP: `Monthly Summary 📊\n\nHi {{member_name}},\n\nGroup: {{group_name}}\nTotal Contributed This Month: {{monthly_total}}\nTotal Contributed Overall: {{total_contributed}}\nNext Payment: {{next_payment_date}}\n\nGroup Health: {{group_compliance}}% compliance rate\n\nKeep up the great work!`,
  },
};
```

### 3. Automated Scheduler

```typescript
// backend/src/services/messaging/scheduler.service.ts
import cron from 'node-cron';

export class MessageScheduler {
  constructor(private messageService: MessageService) {
    this.initializeSchedules();
  }

  private initializeSchedules() {
    // Daily payment reminders (3 days before due date)
    cron.schedule('0 9 * * *', async () => {
      await this.sendPaymentReminders();
    });

    // Overdue payment notices (daily at 10 AM)
    cron.schedule('0 10 * * *', async () => {
      await this.sendOverdueNotices();
    });

    // Monthly summaries (1st of each month at 8 AM)
    cron.schedule('0 8 1 * *', async () => {
      await this.sendMonthlySummaries();
    });

    // Update payment statuses (daily at midnight)
    cron.schedule('0 0 * * *', async () => {
      await this.updatePaymentStatuses();
    });
  }

  private async sendPaymentReminders() {
    const groups = await prisma.group.findMany({
      where: { status: 'ACTIVE' },
      include: { members: true },
    });

    for (const group of groups) {
      const currentCycle = this.calculateCurrentCycle(group);
      const dueDate = this.calculateDueDate(group, currentCycle);
      const daysUntilDue = Math.ceil(
        (dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilDue === 3) {
        // Send reminder 3 days before
        for (const member of group.members.filter(m => m.status === 'ACTIVE')) {
          // Check if already paid
          const contribution = await prisma.contribution.findUnique({
            where: {
              groupId_memberId_cycleNumber: {
                groupId: group.id,
                memberId: member.id,
                cycleNumber: currentCycle,
              },
            },
          });

          if (!contribution) {
            await this.messageService.sendMessage({
              groupId: group.id,
              memberId: member.id,
              messageType: 'PAYMENT_REMINDER',
              channel: 'WHATSAPP',
              templateId: 'PAYMENT_REMINDER',
              variables: {
                member_name: member.user.fullName,
                amount: `${group.currencyCode} ${group.contributionAmount}`,
                due_date: formatDate(dueDate),
                group_name: group.groupName,
                account_number: member.accountNumber,
              },
            });
          }
        }
      }
    }
  }

  private async sendOverdueNotices() {
    const contributions = await prisma.contribution.findMany({
      where: {
        status: 'OVERDUE',
        // ... additional filters
      },
      include: {
        member: { include: { user: true } },
        group: true,
      },
    });

    for (const contribution of contributions) {
      const daysPastDue = Math.floor(
        (new Date().getTime() - contribution.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      await this.messageService.sendMessage({
        groupId: contribution.groupId,
        memberId: contribution.memberId,
        messageType: 'PAYMENT_OVERDUE',
        channel: 'WHATSAPP',
        templateId: 'PAYMENT_OVERDUE',
        variables: {
          member_name: contribution.member.user.fullName,
          amount: `${contribution.currencyCode} ${contribution.amount}`,
          days_overdue: daysPastDue.toString(),
          group_name: contribution.group.groupName,
          admin_contact: contribution.group.admin.phoneNumber,
        },
      });
    }
  }
}
```

### 4. Delivery Webhook Handler

```typescript
// backend/src/api/routes/webhooks.routes.ts
router.post('/webhooks/twilio/status', async (req, res) => {
  const { MessageSid, MessageStatus, ErrorCode } = req.body;

  // Find message by external ID
  const message = await prisma.message.findFirst({
    where: { externalId: MessageSid },
  });

  if (message) {
    let deliveryStatus: DeliveryStatus;
    
    switch (MessageStatus) {
      case 'delivered':
        deliveryStatus = 'DELIVERED';
        break;
      case 'failed':
      case 'undelivered':
        deliveryStatus = 'FAILED';
        break;
      default:
        deliveryStatus = 'SENT';
    }

    await prisma.message.update({
      where: { id: message.id },
      data: {
        deliveryStatus,
        deliveredAt: deliveryStatus === 'DELIVERED' ? new Date() : null,
        errorMessage: ErrorCode ? `Error code: ${ErrorCode}` : null,
      },
    });
  }

  res.sendStatus(200);
});
```

## API Endpoints

```
POST   /api/v1/groups/:groupId/messages
GET    /api/v1/groups/:groupId/messages
GET    /api/v1/messages/:messageId
POST   /api/v1/messages/:messageId/resend
POST   /api/v1/webhooks/twilio/status
POST   /api/v1/webhooks/whatsapp/status
```

## Testing Checklist

- [ ] Send SMS to test number
- [ ] Send WhatsApp to test number
- [ ] Verify message template variable replacement
- [ ] Test message queue processing
- [ ] Test retry logic on failure
- [ ] Verify delivery status updates via webhook
- [ ] Test payment reminder scheduler
- [ ] Test overdue notice scheduler
- [ ] Verify opt-out mechanism
- [ ] Test rate limiting

## Deliverables

✅ SMS gateway integration (Twilio)
✅ WhatsApp Business API integration
✅ Message template system
✅ Message queue with retry logic
✅ Automated reminder scheduler
✅ Delivery tracking and webhooks
✅ Admin message log dashboard

**Phase 4 Complete! Ready for Phase 5: Testing, Security Hardening & Deployment.**
