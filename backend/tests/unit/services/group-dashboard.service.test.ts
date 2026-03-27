import { GroupService } from '@/services/groups/group.service';
import prisma from '@/lib/prisma';
import { DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

jest.mock('@/lib/prisma', () => {
  const { mockDeep } = require('jest-mock-extended');
  return { __esModule: true, default: mockDeep() };
});

describe('GroupService.getGroupDashboard', () => {
  const mockPrisma = prisma as unknown as DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-02-10T12:00:00Z'));

    mockPrisma.group.findUnique.mockReset();
    mockPrisma.contribution.findMany.mockReset();
    mockPrisma.contribution.groupBy.mockReset();
    mockPrisma.transaction.findMany.mockReset();
    mockPrisma.savingsGoal.findMany.mockReset();
    mockPrisma.savingsDeposit.findMany.mockReset();
    mockPrisma.withdrawalRequest.findMany.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('computes current-cycle totals for TONTINE without cumulative mismatch', async () => {
    const service = new GroupService();

    mockPrisma.group.findUnique.mockResolvedValue({
      id: 'g1',
      groupName: 'Test',
      groupType: 'TONTINE',
      status: 'ACTIVE',
      currencyCode: 'KES',
      contributionAmount: 1000,
      paymentFrequency: 'MONTHLY',
      gracePeriodDays: 5,
      startDate: new Date('2024-01-01T00:00:00Z'),
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      maxMembers: 10,
      adminUserId: 'admin1',
      members: [
        { id: 'm1', userId: 'u1', payoutPosition: 1, user: { fullName: 'Alice' } },
        { id: 'm2', userId: 'u2', payoutPosition: 2, user: { fullName: 'Bob' } },
      ],
    } as any);

    mockPrisma.contribution.findMany.mockResolvedValue([
      {
        id: 'c1',
        memberId: 'm1',
        amount: 1000,
        currencyCode: 'KES',
        dueDate: new Date('2024-02-01T00:00:00Z'),
        paymentDate: new Date('2024-02-02T00:00:00Z'),
        status: 'COMPLETED',
        cycleNumber: 2,
      },
    ] as any);

    mockPrisma.contribution.groupBy.mockResolvedValue([] as any);
    mockPrisma.transaction.findMany.mockResolvedValue([] as any);

    const result = await service.getGroupDashboard('g1', 'admin1', 'ADMIN', { kind: 'current_cycle' });

    expect(result.common.totalCollected.amount).toBe(1000);
    expect(result.common.totalOutstanding.amount).toBe(1000);
    expect(result.common.pastDueMembersCount).toBe(1);

    const bob: any = result.memberStatus.items.find((x: any) => x.memberId === 'm2');
    expect(bob).toBeTruthy();
    expect(bob.expected).toBe(1000);
    expect(bob.paid).toBe(0);
    expect(bob.outstanding).toBe(1000);
    expect(bob.status).toBe('PAST_DUE');
  });
});
