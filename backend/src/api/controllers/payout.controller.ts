import { Response, NextFunction } from 'express';
import { PayoutService } from '@/services/payouts/payout.service';
import { AuthRequest } from '@/api/middleware/auth.middleware';

export class PayoutController {
    private payoutService: PayoutService;

    constructor() {
        this.payoutService = new PayoutService();
    }

    async recordPayout(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { groupId, memberId } = req.params;
            const { amount, currencyCode, paymentMethod, referenceNumber, notes } = req.body;
            const recordedBy = req.user!.id;

            const transaction = await this.payoutService.recordPayout({
                groupId: groupId as string,
                memberId: memberId as string,
                amount: Number(amount),
                currencyCode,
                paymentMethod,
                referenceNumber,
                notes,
                recordedBy,
            });

            res.status(201).json({
                success: true,
                data: transaction,
            });
        } catch (error) {
            next(error);
        }
    }

    async adjustPayout(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { groupId, transactionId } = req.params as any;
            const recordedBy = req.user!.id;
            const userRole = req.user!.role;
            const { amount, paymentMethod, referenceNumber, notes, paymentDate } = req.body;

            const transaction = await this.payoutService.adjustPayout({
                groupId,
                transactionId,
                recordedBy,
                userRole,
                ...(amount !== undefined ? { amount: Number(amount) } : {}),
                ...(paymentMethod !== undefined ? { paymentMethod } : {}),
                ...(referenceNumber !== undefined ? { referenceNumber } : {}),
                ...(notes !== undefined ? { notes } : {}),
                ...(paymentDate ? { paymentDate: new Date(paymentDate) } : {}),
            });

            res.status(200).json({ success: true, data: transaction });
        } catch (error) {
            next(error);
        }
    }
}
