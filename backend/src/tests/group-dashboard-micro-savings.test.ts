import { GroupService } from '@/services/groups/group.service';

jest.mock('@/lib/prisma', () => {
  const prisma = {
    group: {
      findUnique: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
    },
    savingsDeposit: {
      findMany: jest.fn(),
    },
  };
  return { __esModule: true, default: prisma };
});

import prisma from '@/lib/prisma';

describe('GroupService.getGroupDashboard (MICRO_SAVINGS)', () => {
  it('includes orphan DEPOSIT_EDIT adjustments when computing totals', async () => {
    (prisma.group.findUnique as any).mockResolvedValue({
      id: 'g1',
      groupName: 'GROUP TEST',
      groupType: 'MICRO_SAVINGS',
      status: 'ACTIVE',
      currencyCode: 'GHS',
      contributionAmount: 0,
      paymentFrequency: 'DAILY',
      gracePeriodDays: 0,
      startDate: null,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      maxMembers: 10,
      adminUserId: 'admin1',
      customFrequencyDays: null,
      members: [
        {
          id: 'm1',
          userId: 'u1',
          status: 'ACTIVE',
          user: { fullName: 'Barbara Abenya' },
        },
      ],
    });

    (prisma.savingsDeposit.findMany as any).mockResolvedValue([
      { id: 'dep2', userId: 'u1' },
    ]);

    (prisma.transaction.findMany as any).mockImplementation(async (args: any) => {
      if (args?.take === 10) return [];

      const isOrphanAdjustments =
        args?.select?.referenceId && args?.where?.transactionType === 'ADJUSTMENT' && args?.where?.memberId === null;
      if (isOrphanAdjustments) {
        return [{ referenceId: 'dep2', amount: -200 }];
      }

      const isSelectedMemberTx =
        args?.select?.memberId && args?.where?.memberId?.in && Array.isArray(args.where.memberId.in);
      if (isSelectedMemberTx) {
        return [
          { memberId: 'm1', transactionType: 'CONTRIBUTION', amount: 1200 },
          { memberId: 'm1', transactionType: 'CONTRIBUTION', amount: 1000 },
        ];
      }

      return [];
    });

    const service = new GroupService();
    const dashboard = await service.getGroupDashboard('g1', 'admin1', 'SYS_ADMIN', { kind: 'current_cycle' });
    const d: any = dashboard;

    expect(dashboard.group.groupType).toBe('MICRO_SAVINGS');
    expect(dashboard.common.totalCollected.amount).toBe(2000);
    expect(d.microSavings.totalDeposits.amount).toBe(2000);
    expect(dashboard.memberStatus.kind).toBe('micro_savings');
    expect(d.memberStatus.items[0].deposits).toBe(2000);
  });
});
