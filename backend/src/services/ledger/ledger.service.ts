import { PrismaClient, TransactionType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { generateHash } from '@/utils/crypto';

interface CreateTransactionData {
  groupId: string;
  memberId?: string;
  transactionType: TransactionType;
  amount: number;
  currencyCode: string;
  referenceId?: string;
  recordedBy: string;
  metadata?: any;
}

export class LedgerService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || prisma;
  }

  async createTransaction(data: CreateTransactionData) {
    // 1. Get previous transaction hash
    const previousTransaction = await this.getLastTransaction(data.groupId);

    // 2. Prepare hashing payload
    const timestamp = new Date();
    const payload = {
      ...data,
      previousHash: previousTransaction?.hash || null,
      timestamp,
    };

    // 3. Generate current hash
    const hash = generateHash(payload);

    // 4. Create transaction
    return this.prisma.transaction.create({
      data: {
        ...data,
        hash,
        previousHash: previousTransaction?.hash || null,
        timestamp,
      },
    });
  }

  private async getLastTransaction(groupId: string) {
    return this.prisma.transaction.findFirst({
      where: { groupId },
      orderBy: { timestamp: 'desc' },
    });
  }

  async verifyChain(groupId: string): Promise<boolean> {
    const transactions = await this.prisma.transaction.findMany({
      where: { groupId },
      orderBy: { timestamp: 'asc' },
    });

    if (transactions.length === 0) return true;

    for (let i = 0; i < transactions.length; i++) {
      const current = transactions[i];
      const previous = i > 0 ? transactions[i - 1] : null;

      // 1. Verify previous hash link
      if (previous && current.previousHash !== previous.hash) {
        return false;
      }

      // 2. Re-calculate and verify current hash
      const payload = {
        groupId: current.groupId,
        memberId: current.memberId,
        transactionType: current.transactionType,
        amount: Number(current.amount),
        currencyCode: current.currencyCode,
        referenceId: current.referenceId,
        recordedBy: current.recordedBy,
        metadata: current.metadata,
        previousHash: current.previousHash,
        timestamp: current.timestamp,
      };

      const calculatedHash = generateHash(payload);
      if (calculatedHash !== current.hash) {
        return false;
      }
    }

    return true;
  }
}
