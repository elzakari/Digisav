import { TransactionType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { LedgerService } from '@/services/ledger/ledger.service';
import { NotFoundError } from '@/utils/errors';
import { NotificationService } from '@/services/notifications/notification.service';

interface RecordPayoutData {
    groupId: string;
    memberId: string;
    amount: number;
    currencyCode: string;
    paymentMethod: string;
    referenceNumber?: string;
    notes?: string;
    recordedBy: string;
}

export class PayoutService {
    private ledgerService = new LedgerService();
    private notificationService = new NotificationService();

    async recordPayout(data: RecordPayoutData) {
        // 1. Verify group and member
        const member = await prisma.member.findUnique({
            where: { id: data.memberId },
            include: { user: true, group: true },
        });

        if (!member || member.groupId !== data.groupId) {
            throw new NotFoundError('Member not found in this group');
        }

        // 2. Record transaction in Ledger as PAYOUT
        const transaction = await this.ledgerService.createTransaction({
            groupId: data.groupId,
            memberId: data.memberId,
            transactionType: TransactionType.PAYOUT,
            amount: data.amount,
            currencyCode: data.currencyCode,
            recordedBy: data.recordedBy,
            metadata: {
                paymentMethod: data.paymentMethod,
                referenceNumber: data.referenceNumber,
                notes: data.notes,
            },
        });

        // 3. Send notification
        try {
            await this.notificationService.createNotification({
                userId: member.userId,
                groupId: data.groupId,
                type: 'PAYOUT_RECEIVED',
                title: 'Payout Disbursed',
                body: `You have received a payout of ${data.currencyCode} ${data.amount}.`,
            });
        } catch (err) {
            console.error('Failed to send payout notification', err);
        }

        return transaction;
    }
}
