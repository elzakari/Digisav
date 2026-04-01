import { TransactionType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { generateTransactionReference } from '@/utils/generators';
import { LedgerService } from '@/services/ledger/ledger.service';
import { NotFoundError, ValidationError, ForbiddenError } from '@/utils/errors';
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

interface AdjustPayoutData {
    groupId: string;
    transactionId: string;
    recordedBy: string;
    userRole: string;
    amount?: number;
    paymentMethod?: string;
    referenceNumber?: string | null;
    notes?: string | null;
    paymentDate?: Date;
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
        const finalReferenceNumber = data.referenceNumber || generateTransactionReference(data.paymentMethod, 'PAYOUT');

        const transaction = await this.ledgerService.createTransaction({
            groupId: data.groupId,
            memberId: data.memberId,
            transactionType: TransactionType.PAYOUT,
            amount: data.amount,
            currencyCode: data.currencyCode,
            recordedBy: data.recordedBy,
            metadata: {
                paymentMethod: data.paymentMethod,
                referenceNumber: finalReferenceNumber,
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

    async adjustPayout(data: AdjustPayoutData) {
        const tx = await prisma.transaction.findUnique({
            where: { id: data.transactionId },
        });

        if (!tx || tx.groupId !== data.groupId || tx.transactionType !== TransactionType.PAYOUT) {
            throw new NotFoundError('Payout transaction');
        }

        const group = await prisma.group.findUnique({ where: { id: data.groupId } });
        if (!group) throw new NotFoundError('Group');

        const canEdit = group.adminUserId === data.recordedBy || data.userRole === 'SYS_ADMIN' || data.userRole === 'ADMIN';
        if (!canEdit) throw new ForbiddenError('Only group admin or system admin can adjust payouts');

        const oldMeta = (tx.metadata || {}) as any;

        const nextAmount = data.amount !== undefined ? data.amount : Number(tx.amount);
        const nextPaymentMethod = data.paymentMethod !== undefined ? data.paymentMethod : oldMeta.paymentMethod;
        const nextReferenceNumber = data.referenceNumber !== undefined ? data.referenceNumber : oldMeta.referenceNumber;
        const nextNotes = data.notes !== undefined ? data.notes : oldMeta.notes;
        const nextPaymentDate = data.paymentDate ?? undefined;

        if (nextAmount <= 0) throw new ValidationError('Amount must be positive');

        const delta = Number(nextAmount) - Number(tx.amount);

        const transaction = await this.ledgerService.createTransaction({
            groupId: tx.groupId,
            memberId: tx.memberId || undefined,
            transactionType: TransactionType.ADJUSTMENT,
            amount: delta,
            currencyCode: tx.currencyCode,
            referenceId: tx.id,
            recordedBy: data.recordedBy,
            metadata: {
                type: 'PAYOUT_EDIT',
                adjustsTransactionId: tx.id,
                old: {
                    amount: Number(tx.amount),
                    paymentMethod: oldMeta.paymentMethod,
                    referenceNumber: oldMeta.referenceNumber,
                    notes: oldMeta.notes,
                    timestamp: tx.timestamp,
                },
                new: {
                    amount: Number(nextAmount),
                    paymentMethod: nextPaymentMethod,
                    referenceNumber: nextReferenceNumber,
                    notes: nextNotes,
                    ...(nextPaymentDate ? { paymentDate: nextPaymentDate } : {}),
                },
            },
        });

        return transaction;
    }
}
