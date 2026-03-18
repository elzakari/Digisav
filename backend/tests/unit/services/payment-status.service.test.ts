import { PaymentStatusService } from '@/services/contributions/payment-status.service';
import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn(),
    ContributionStatus: {
        PENDING: 'PENDING',
        COMPLETED: 'COMPLETED',
        OVERDUE: 'OVERDUE',
        DEFAULTED: 'DEFAULTED'
    }
}));

describe('PaymentStatusService', () => {
    let service: PaymentStatusService;
    let mockPrisma: DeepMockProxy<PrismaClient>;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-03-25T10:00:00Z')); // Fixed "today"

        mockPrisma = mockDeep<PrismaClient>();
        (PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);
        service = new PaymentStatusService();
        (service as any).prisma = mockPrisma;
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('updateGroupPaymentStatuses', () => {
        it('should mark missing contributions as OVERDUE if after due date', async () => {
            const groupId = 'group-1';
            // Start date: March 1st. Today: March 25th. Cycle 1 is due March 1st.
            // 25 days past due > 5 days grace? No, wait.
            // If startDate is 2024-03-01 and frequency is MONTHLY:
            // Cycle 1 starts 2024-03-01. Due date is 2024-03-01.
            // Today is 2024-03-25. 24 days past due.

            const groupData = {
                id: groupId,
                startDate: new Date('2024-03-01T00:00:00Z'),
                paymentFrequency: 'MONTHLY',
                contributionAmount: 1000,
                currencyCode: 'KES',
                gracePeriodDays: 30, // Large grace period to stay OVERDUE
                adminUserId: 'admin-1',
                members: [{ id: 'member-1', status: 'ACTIVE' }]
            };

            mockPrisma.group.findUnique.mockResolvedValue(groupData as any);
            mockPrisma.contribution.findUnique.mockResolvedValue(null);

            await service.updateGroupPaymentStatuses(groupId);

            expect(mockPrisma.contribution.create).toHaveBeenCalled();
            const createCall = mockPrisma.contribution.create.mock.calls[0][0];
            expect(createCall.data.status).toBe('OVERDUE');
        });

        it('should mark missing contributions as DEFAULTED if grace period exceeded', async () => {
            const groupId = 'group-1';

            const groupData = {
                id: groupId,
                startDate: new Date('2024-03-01T00:00:00Z'),
                paymentFrequency: 'MONTHLY',
                contributionAmount: 1000,
                currencyCode: 'KES',
                gracePeriodDays: 5, // Small grace period to hit DEFAULTED
                adminUserId: 'admin-1',
                members: [{ id: 'member-1', status: 'ACTIVE' }]
            };

            mockPrisma.group.findUnique.mockResolvedValue(groupData as any);
            mockPrisma.contribution.findUnique.mockResolvedValue(null);

            await service.updateGroupPaymentStatuses(groupId);

            expect(mockPrisma.contribution.create).toHaveBeenCalled();
            const createCall = mockPrisma.contribution.create.mock.calls[0][0];
            expect(createCall.data.status).toBe('DEFAULTED');
        });

        it('should mark existing OVERDUE contributions as DEFAULTED if grace period exceeded', async () => {
            const groupId = 'group-1';
            // Today is March 25.
            // Due date was March 1.
            // Overdue record exists with due date March 1.

            mockPrisma.group.findUnique.mockResolvedValue({
                id: groupId,
                startDate: new Date('2024-03-01T00:00:00Z'),
                paymentFrequency: 'MONTHLY',
                contributionAmount: 1000,
                currencyCode: 'KES',
                gracePeriodDays: 5,
                adminUserId: 'admin-1',
                members: [{ id: 'member-1', status: 'ACTIVE' }]
            } as any);

            mockPrisma.contribution.findUnique.mockResolvedValue({
                id: 'contrib-1',
                status: 'OVERDUE',
                dueDate: new Date('2024-03-01T00:00:00Z'),
            } as any);

            await service.updateGroupPaymentStatuses(groupId);

            expect(mockPrisma.contribution.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'contrib-1' },
                    data: { status: 'DEFAULTED' }
                })
            );
        });
    });
});
