import { ChallengeType } from '@prisma/client';
import prisma from '@/lib/prisma';

export class SavingsChallengeService {
  /**
   * Create a new community or personal challenge
   */
  async createChallenge(creatorId: string, data: {
    name: string;
    description: string;
    challengeType: ChallengeType;
    startDate: Date;
    endDate: Date;
    targetAmount?: number;
    currencyCode?: string;
    maxParticipants?: number;
    rules?: any;
  }) {
    const challenge = await prisma.savingsChallenge.create({
      data: {
        createdBy: creatorId,
        name: data.name,
        description: data.description,
        challengeType: data.challengeType,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        targetAmount: data.targetAmount,
        currencyCode: data.currencyCode || 'KES',
        maxParticipants: data.maxParticipants,
        rules: data.rules || {},
      },
    });

    return challenge;
  }

  /**
   * Join an existing challenge
   */
  async joinChallenge(userId: string, challengeId: string, savingsGoalId?: string) {
    const challenge = await prisma.savingsChallenge.findUnique({
      where: { id: challengeId },
      include: { _count: { select: { participants: true } } },
    });

    if (!challenge) throw new Error('Challenge not found');

    if (challenge.maxParticipants && challenge._count.participants >= challenge.maxParticipants) {
      throw new Error('Challenge is full');
    }

    if (new Date() > challenge.endDate) {
      throw new Error('Challenge has ended');
    }

    const participation = await prisma.challengeParticipation.create({
      data: {
        userId,
        challengeId,
        savingsGoalId,
        joinedDate: new Date(),
        currentAmount: 0,
        isCompleted: false,
      },
    });

    return participation;
  }

  /**
   * Get leaderboard for a specific challenge
   */
  async getLeaderboard(challengeId: string) {
    const participants = await prisma.challengeParticipation.findMany({
      where: { challengeId },
      include: {
        user: { select: { fullName: true, id: true } },
      },
      orderBy: { currentAmount: 'desc' },
      take: 50,
    });

    return participants.map((p, index) => ({
      rank: index + 1,
      userId: p.userId,
      userName: p.user.fullName,
      amount: p.currentAmount,
      isCompleted: p.isCompleted,
    }));
  }
}

export class SavingsAnalyticsService {
  /**
   * Calculate savings summary for a user over a period
   */
  async getUserSummary(userId: string, periodStart: Date, periodEnd: Date) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { defaultCurrency: true },
    });
    const preferredCurrency = user?.defaultCurrency || 'KES';

    const deposits = await prisma.savingsDeposit.findMany({
      where: {
        userId,
        depositDate: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      select: { amount: true, depositDate: true },
    });

    const totalsByCurrency = await prisma.savingsGoal.groupBy({
      by: ['currencyCode'],
      where: {
        userId,
        status: { in: ['ACTIVE', 'PAUSED', 'COMPLETED'] },
        group: {
          is: {
            groupType: 'MICRO_SAVINGS',
            status: 'ACTIVE',
          },
        },
      },
      _sum: { currentAmount: true },
    });

    const normalizedTotalsByCurrency = (totalsByCurrency || [])
      .map((t) => ({ currencyCode: t.currencyCode, total: Number(t._sum.currentAmount || 0) }))
      .filter((t) => t.total !== 0)
      .sort((a, b) => b.total - a.total);

    const currencyCode = normalizedTotalsByCurrency.some((t) => t.currencyCode === preferredCurrency)
      ? preferredCurrency
      : normalizedTotalsByCurrency.length === 1
        ? normalizedTotalsByCurrency[0].currencyCode
        : null;

    const totalSaved = currencyCode
      ? (normalizedTotalsByCurrency.find((t) => t.currencyCode === currencyCode)?.total || 0)
      : 0;

    const goalCount = await prisma.savingsGoal.count({
      where: {
        userId,
        status: 'ACTIVE',
        group: {
          is: {
            groupType: 'MICRO_SAVINGS',
            status: 'ACTIVE',
          },
        },
      },
    });

    const completedGoals = await prisma.savingsGoal.count({
      where: {
        userId,
        status: 'COMPLETED',
        updatedAt: { gte: periodStart, lte: periodEnd },
        group: {
          is: {
            groupType: 'MICRO_SAVINGS',
            status: 'ACTIVE',
          },
        },
      },
    });

    // Calculate streak (days with at least one deposit)
    const streak = await this.calculateStreak(userId);

    return {
      totalSaved,
      activeGoals: goalCount,
      completedInPeriod: completedGoals,
      depositCount: deposits.length,
      currentStreak: streak,
      currencyCode,
      totalsByCurrency: normalizedTotalsByCurrency,
      multiCurrency: normalizedTotalsByCurrency.length > 1,
    };
  }

  /**
   * Internal logic for calculating savings consistency streak
   */
  private async calculateStreak(userId: string): Promise<number> {
    const deposits = await prisma.savingsDeposit.findMany({
      where: { userId },
      orderBy: { depositDate: 'desc' },
      select: { depositDate: true },
    });

    if (deposits.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let lastDate = new Date(deposits[0].depositDate);
    lastDate.setHours(0, 0, 0, 0);

    // If last deposit was older than 1 day ago, streak is broken
    const diff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diff > 1) return 0;

    const seenDates = new Set();
    for (const d of deposits) {
      const dDate = new Date(d.depositDate);
      dDate.setHours(0, 0, 0, 0);
      const dateStr = dDate.toISOString();

      if (!seenDates.has(dateStr)) {
        seenDates.add(dateStr);
        // Check if this date is consecutive
        const expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() - streak);
        expectedDate.setHours(0, 0, 0, 0);

        if (dDate.getTime() === expectedDate.getTime()) {
          streak++;
        } else if (dDate.getTime() < expectedDate.getTime()) {
          break; // Streak ended
        }
      }
    }

    return streak;
  }
}
