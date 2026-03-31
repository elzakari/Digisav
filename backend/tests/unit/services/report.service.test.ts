import { ReportService } from '@/services/reporting/report.service';

jest.mock('@/lib/prisma', () => {
  return {
    __esModule: true,
    default: {
      group: {
        findUnique: jest.fn(),
      },
      member: {
        findMany: jest.fn(),
      },
      contribution: {
        findMany: jest.fn(),
      },
      transaction: {
        findMany: jest.fn(),
      },
    },
  };
});

import prisma from '@/lib/prisma';

describe('ReportService', () => {
  const service = new ReportService();

  describe('generateCSVReport (contributions)', () => {
    it('includes per-member payment summary section', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({ currencyCode: 'KES' });
      (prisma.member.findMany as jest.Mock).mockResolvedValue([
        { id: 'm1', user: { fullName: 'Alice' } },
        { id: 'm2', user: { fullName: 'Bob' } },
      ]);
      const base = [
        {
          memberId: 'm1',
          transactionType: 'CONTRIBUTION',
          amount: 1000,
          currencyCode: 'KES',
          timestamp: new Date('2026-01-02T00:00:00.000Z'),
          referenceId: 't1',
          metadata: { paymentMethod: 'CASH' },
          member: { user: { fullName: 'Alice' } },
          recorder: { fullName: 'Admin One' },
        },
        {
          memberId: 'm1',
          transactionType: 'CONTRIBUTION',
          amount: 1000,
          currencyCode: 'KES',
          timestamp: new Date('2026-02-02T00:00:00.000Z'),
          referenceId: 't2',
          metadata: { paymentMethod: 'MOBILE_MONEY' },
          member: { user: { fullName: 'Alice' } },
          recorder: { fullName: 'Admin One' },
        },
        {
          memberId: 'm2',
          transactionType: 'CONTRIBUTION',
          amount: 500,
          currencyCode: 'KES',
          timestamp: new Date('2026-02-05T00:00:00.000Z'),
          referenceId: 't3',
          metadata: { paymentMethod: 'CASH' },
          member: { user: { fullName: 'Bob' } },
          recorder: { fullName: 'Admin One' },
        },
      ];

      (prisma.transaction.findMany as jest.Mock).mockImplementation((args: any) => {
        if (args?.where?.transactionType === 'ADJUSTMENT') return Promise.resolve([]);
        return Promise.resolve(base);
      });

      const csv = await service.generateCSVReport(
        'g1',
        'contributions',
        new Date('2026-01-01T00:00:00.000Z'),
        new Date('2026-03-01T00:00:00.000Z')
      );

      expect(csv).toContain('Date,Member,Type,Amount,Currency,Method,Reference,Recorded By');
      expect(csv).toContain('Member Summary');
      expect(csv).toContain('"Alice",2,2000.00,KES,2026-02-02');
      expect(csv).toContain('"Bob",1,500.00,KES,2026-02-05');
    });

    it('supports memberId filtering', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({ currencyCode: 'KES' });
      (prisma.member.findMany as jest.Mock).mockResolvedValue([
        { id: 'm1', user: { fullName: 'Alice' } },
      ]);
      const base = [
        {
          memberId: 'm1',
          transactionType: 'CONTRIBUTION',
          amount: 1000,
          currencyCode: 'KES',
          timestamp: new Date('2026-01-02T00:00:00.000Z'),
          referenceId: 't1',
          metadata: { paymentMethod: 'CASH' },
          member: { user: { fullName: 'Alice' } },
          recorder: { fullName: 'Admin One' },
        },
      ];

      (prisma.transaction.findMany as jest.Mock).mockImplementation((args: any) => {
        if (args?.where?.transactionType === 'ADJUSTMENT') return Promise.resolve([]);
        return Promise.resolve(base);
      });

      const csv = await service.generateCSVReport(
        'g1',
        'contributions',
        new Date('2026-01-01T00:00:00.000Z'),
        new Date('2026-03-01T00:00:00.000Z'),
        'm1'
      );

      expect(prisma.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: 'm1' }) })
      );
      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ memberId: 'm1' }) })
      );
      expect(csv).toContain('"Alice",1,1000.00,KES,2026-01-02');
      expect(csv).not.toContain('"Bob"');
    });
  });
});
