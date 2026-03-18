import cron from 'node-cron';
import prisma from '@/lib/prisma';
import { MessageService } from './message.service';
import { PaymentStatusService } from '../contributions/payment-status.service';
import { MESSAGE_TEMPLATES } from '@/constants/message-templates';

export class MessageScheduler {
  private paymentStatusService: PaymentStatusService;

  constructor(private messageService: MessageService) {
    this.paymentStatusService = new PaymentStatusService();
    this.initializeSchedules();
  }

  private initializeSchedules() {
    // 1. Update all payment statuses (Run daily at 8 AM)
    cron.schedule('0 8 * * *', async () => {
      console.log('Updating payment statuses...');
      await this.paymentStatusService.updateAllGroupPaymentStatuses();
    });

    // 2. Daily payment reminders (3 days before due date) - Run at 9 AM
    cron.schedule('0 9 * * *', async () => {
      console.log('Running daily payment reminders...');
      await this.sendPaymentReminders();
    });

    // 3. Overdue payment notices (daily at 10 AM)
    cron.schedule('0 10 * * *', async () => {
      console.log('Running overdue payment notices...');
      await this.sendOverdueNotices();
    });
  }

  private async sendPaymentReminders() {
    const groups = await prisma.group.findMany({
      where: { status: 'ACTIVE' },
      include: { members: { include: { user: true } } },
    });

    for (const group of groups) {
      if (!group.startDate) continue;

      const currentCycle = this.calculateCurrentCycle(group.startDate);
      const dueDate = this.calculateDueDate(group.startDate, currentCycle);

      const today = new Date();
      const diffTime = dueDate.getTime() - today.getTime();
      const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysUntilDue === 3) {
        for (const member of group.members.filter(m => m.status === 'ACTIVE')) {
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
              channel: 'WHATSAPP', // Default preference
              templateId: 'PAYMENT_REMINDER',
              variables: {
                member_name: member.user.fullName,
                amount: `${group.currencyCode} ${group.contributionAmount}`,
                due_date: dueDate.toISOString().split('T')[0],
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
      },
      include: {
        member: { include: { user: true } },
        group: { include: { admin: true } },
      },
    });

    for (const contribution of contributions) {
      const daysPastDue = Math.floor(
        (new Date().getTime() - contribution.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Send notice every 3 days for overdue items
      if (daysPastDue > 0 && daysPastDue % 3 === 0) {
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

  private calculateCurrentCycle(startDate: Date): number {
    const start = new Date(startDate);
    const today = new Date();
    return (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth()) + 1;
  }

  private calculateDueDate(startDate: Date, cycleNumber: number): Date {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + (cycleNumber - 1));
    return dueDate;
  }
}
