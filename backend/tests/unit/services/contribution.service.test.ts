import { ContributionService } from '@/services/contributions/contribution.service';
import { PrismaClient, PaymentMethod } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

import { LedgerService } from '@/services/ledger/ledger.service';

// Mock the entire prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(),
  PaymentMethod: {
    CASH: 'CASH',
    MOBILE_MONEY: 'MOBILE_MONEY',
    BANK_TRANSFER: 'BANK_TRANSFER'
  },
  TransactionType: {
    CONTRIBUTION: 'CONTRIBUTION',
    PAYOUT: 'PAYOUT'
  }
}));

// Mock the ledger service
jest.mock('@/services/ledger/ledger.service');

describe('ContributionService', () => {
  let service: ContributionService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    (PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);

    // Setup LedgerService mock
    (LedgerService as jest.Mock).mockImplementation(() => ({
      createTransaction: jest.fn().mockResolvedValue({}),
      verifyChain: jest.fn().mockResolvedValue(true)
    }));

    // We need to reinstantiate service to pick up the mocked prisma
    service = new ContributionService();
    // Inject the mocked prisma client directly (hacky but needed since it's instantiated inside)
    (service as any).prisma = mockPrisma;
  });

  describe('recordContribution', () => {
    it('should record contribution successfully', async () => {
      const mockData = {
        memberId: 'member-123',
        groupId: 'group-123',
        amount: 1000,
        currencyCode: 'KES',
        paymentDate: new Date(),
        paymentMethod: 'CASH' as PaymentMethod,
        recordedBy: 'admin-123',
      };

      // Mock member check
      mockPrisma.member.findUnique.mockResolvedValue({
        id: 'member-123',
        groupId: 'group-123',
        group: {
          startDate: new Date('2024-01-01'),
          paymentFrequency: 'MONTHLY'
        }
      } as any);

      // Mock duplicate check (completed exists)
      mockPrisma.contribution.findUnique.mockResolvedValue(null);

      // Mock transaction
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrisma);
      });

      mockPrisma.contribution.upsert.mockResolvedValue({
        id: 'contrib-123',
        ...mockData,
        status: 'COMPLETED',
        cycleNumber: 1,
        hash: 'hash-123',
      } as any);

      const result = await service.recordContribution(mockData);

      expect(result.status).toBe('COMPLETED');
      expect(mockPrisma.contribution.upsert).toHaveBeenCalled();
    });
  });

  describe('verifyLedgerIntegrity', () => {
    it('should call ledgerService.verifyChain', async () => {
      const groupId = 'group-123';
      await service.verifyLedgerIntegrity(groupId);
      expect((service as any).ledgerService.verifyChain).toHaveBeenCalledWith(groupId);
    });
  });
});
