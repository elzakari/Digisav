import { Router } from 'express';
import { DeliveryStatus } from '@prisma/client';
import prisma from '@/lib/prisma';

const router = Router();

router.post('/twilio/status', async (req, res) => {
    const { MessageSid, MessageStatus, ErrorCode } = req.body;

    try {
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
                case 'read':
                    deliveryStatus = 'READ';
                    break;
                default:
                    deliveryStatus = 'SENT';
            }

            await prisma.message.update({
                where: { id: message.id },
                data: {
                    deliveryStatus,
                    deliveredAt: deliveryStatus === 'DELIVERED' ? new Date() : undefined,
                    readAt: deliveryStatus === 'READ' ? new Date() : undefined,
                    errorMessage: ErrorCode ? `Error code: ${ErrorCode}` : null,
                },
            });
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Webhook Error:', error);
        res.sendStatus(500);
    }
});

export default router;
