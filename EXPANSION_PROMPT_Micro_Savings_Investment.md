# 🚀 EXPANSION PROMPT: Micro Savings & Micro Investment Services

## 📋 Executive Summary

**Objective:** Seamlessly integrate two new major service modules into the existing Digital Savings Group Management Platform without disrupting current functionality.

**New Services:**
1. **Micro Savings Services System** - Personal savings goals, automated savings, round-ups
2. **Micro Investment Services System** - Investment portfolios, fractional shares, automated investing

**Approach:** Non-breaking expansion using modular architecture, feature flags, and incremental rollout.

**Timeline:** 12 weeks (3 phases of 4 weeks each)

---

## 🎯 Core Principles for Expansion

### 1. **Non-Breaking Changes**
- ✅ All existing APIs remain unchanged
- ✅ Database migrations are additive only (no schema alterations)
- ✅ New features behind feature flags
- ✅ Backward compatibility guaranteed
- ✅ Existing user workflows unaffected

### 2. **Modular Architecture**
- ✅ New services in separate modules
- ✅ Shared infrastructure (auth, database, messaging)
- ✅ Independent deployment capability
- ✅ Clear service boundaries

### 3. **Incremental Rollout**
- ✅ Pilot testing with subset of users
- ✅ Gradual feature enablement
- ✅ A/B testing capability
- ✅ Easy rollback mechanism

---

## 🏗️ EXPANSION PHASE 1: Micro Savings Services System

### Overview
Enable individual members to create and manage personal savings goals alongside their group contributions. Automated savings features help users build financial discipline.

### Features to Implement

#### 1.1 Personal Savings Goals
**Functionality:**
- Users create multiple savings goals (e.g., "Emergency Fund", "New Phone", "School Fees")
- Each goal has: target amount, deadline, category, visibility settings
- Progress tracking with visual indicators
- Milestone celebrations (25%, 50%, 75%, 100%)

**User Stories:**
```
As a member, I want to create a personal savings goal for my daughter's school fees
So that I can track my progress separately from group contributions

As a member, I want to set a target amount and deadline
So that I know how much to save each month to reach my goal

As a member, I want to see my progress toward my goals
So that I stay motivated to save
```

#### 1.2 Automated Savings Rules
**Functionality:**
- **Round-up Savings:** Round up purchases to nearest $1, $5, or $10 and save difference
- **Percentage Savings:** Save X% of every income/deposit
- **Recurring Transfers:** Auto-transfer fixed amount daily/weekly/monthly
- **Windfall Savings:** Save X% of any deposit over a threshold

**User Stories:**
```
As a member, I want to automatically save the round-up from my purchases
So that I save without thinking about it

As a member, I want to save 10% of every deposit I receive
So that my savings grow automatically with my income

As a member, I want to schedule automatic transfers to my savings
So that I build the habit of saving regularly
```

#### 1.3 Savings Challenges
**Functionality:**
- Pre-defined challenges: 52-week challenge, $5 challenge, no-spend challenge
- Custom challenges with community participation
- Leaderboards and social sharing
- Achievement badges and rewards

**User Stories:**
```
As a member, I want to join the 52-week savings challenge
So that I can save progressively and stay motivated

As a member, I want to compete with friends on savings goals
So that saving becomes fun and social
```

#### 1.4 Savings Analytics
**Functionality:**
- Savings rate calculation (% of income saved)
- Spending vs. saving analysis
- Goal projection (estimated completion date)
- Savings streaks and consistency metrics
- Monthly/yearly reports

**User Stories:**
```
As a member, I want to see my savings rate over time
So that I understand my financial health

As a member, I want to know if I'm on track to meet my goal
So that I can adjust my savings behavior
```

---

### Technical Implementation - Micro Savings

#### Database Schema Additions

```prisma
// Add to existing schema.prisma

enum SavingsGoalStatus {
  ACTIVE
  PAUSED
  COMPLETED
  CANCELLED
}

enum SavingsGoalCategory {
  EMERGENCY_FUND
  EDUCATION
  HOUSING
  BUSINESS
  TRAVEL
  ELECTRONICS
  MEDICAL
  WEDDING
  OTHER
}

enum AutomationRuleType {
  ROUND_UP
  PERCENTAGE_SAVE
  RECURRING_TRANSFER
  WINDFALL_SAVE
}

enum ChallengeType {
  WEEK_52
  DOLLAR_5
  NO_SPEND
  CUSTOM
}

model SavingsGoal {
  id            String              @id @default(uuid()) @db.Uuid
  userId        String              @db.Uuid
  name          String              @db.VarChar(100)
  description   String?             @db.Text
  targetAmount  Decimal             @db.Decimal(12, 2)
  currentAmount Decimal             @default(0) @db.Decimal(12, 2)
  currencyCode  String              @db.VarChar(3)
  targetDate    DateTime?
  category      SavingsGoalCategory
  status        SavingsGoalStatus   @default(ACTIVE)
  isPublic      Boolean             @default(false)
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt
  
  user          User                @relation(fields: [userId], references: [id])
  deposits      SavingsDeposit[]
  automations   SavingsAutomation[]
  
  @@index([userId, status])
  @@index([status, targetDate])
  @@map("savings_goals")
}

model SavingsDeposit {
  id              String   @id @default(uuid()) @db.Uuid
  savingsGoalId   String   @db.Uuid
  userId          String   @db.Uuid
  amount          Decimal  @db.Decimal(12, 2)
  currencyCode    String   @db.VarChar(3)
  depositDate     DateTime @default(now())
  source          String   @db.VarChar(50) // "manual", "automation", "challenge"
  automationId    String?  @db.Uuid
  referenceNumber String?  @db.VarChar(100)
  notes           String?  @db.Text
  createdAt       DateTime @default(now())
  
  savingsGoal SavingsGoal        @relation(fields: [savingsGoalId], references: [id])
  user        User               @relation(fields: [userId], references: [id])
  automation  SavingsAutomation? @relation(fields: [automationId], references: [id])
  
  @@index([savingsGoalId, depositDate])
  @@index([userId, depositDate])
  @@map("savings_deposits")
}

model SavingsAutomation {
  id              String             @id @default(uuid()) @db.Uuid
  userId          String             @db.Uuid
  savingsGoalId   String?            @db.Uuid
  ruleType        AutomationRuleType
  isActive        Boolean            @default(true)
  configuration   Json               // Stores rule-specific config
  lastExecuted    DateTime?
  totalSaved      Decimal            @default(0) @db.Decimal(12, 2)
  currencyCode    String             @db.VarChar(3)
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
  
  user        User             @relation(fields: [userId], references: [id])
  savingsGoal SavingsGoal?     @relation(fields: [savingsGoalId], references: [id])
  deposits    SavingsDeposit[]
  
  @@index([userId, isActive])
  @@index([ruleType, isActive])
  @@map("savings_automations")
}

model SavingsChallenge {
  id              String        @id @default(uuid()) @db.Uuid
  name            String        @db.VarChar(100)
  description     String        @db.Text
  challengeType   ChallengeType
  startDate       DateTime
  endDate         DateTime
  targetAmount    Decimal?      @db.Decimal(12, 2)
  currencyCode    String        @db.VarChar(3)
  isPublic        Boolean       @default(true)
  createdBy       String        @db.Uuid
  maxParticipants Int?
  rules           Json          // Challenge-specific rules
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  creator       User                      @relation(fields: [createdBy], references: [id])
  participants  ChallengeParticipation[]
  
  @@index([challengeType, startDate])
  @@index([isPublic, startDate])
  @@map("savings_challenges")
}

model ChallengeParticipation {
  id              String          @id @default(uuid()) @db.Uuid
  challengeId     String          @db.Uuid
  userId          String          @db.Uuid
  savingsGoalId   String?         @db.Uuid
  joinedDate      DateTime        @default(now())
  currentAmount   Decimal         @default(0) @db.Decimal(12, 2)
  isCompleted     Boolean         @default(false)
  completedDate   DateTime?
  rank            Int?
  
  challenge   SavingsChallenge @relation(fields: [challengeId], references: [id])
  user        User             @relation(fields: [userId], references: [id])
  savingsGoal SavingsGoal?     @relation(fields: [savingsGoalId], references: [id])
  
  @@unique([challengeId, userId])
  @@index([challengeId, rank])
  @@index([userId, joinedDate])
  @@map("challenge_participations")
}

model SavingsAnalytics {
  id              String   @id @default(uuid()) @db.Uuid
  userId          String   @db.Uuid
  periodStart     DateTime
  periodEnd       DateTime
  totalSaved      Decimal  @db.Decimal(12, 2)
  totalWithdrawn  Decimal  @default(0) @db.Decimal(12, 2)
  savingsRate     Decimal  @db.Decimal(5, 2) // Percentage
  streakDays      Int      @default(0)
  goalsCompleted  Int      @default(0)
  currencyCode    String   @db.VarChar(3)
  createdAt       DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id])
  
  @@index([userId, periodStart])
  @@map("savings_analytics")
}

// Add relations to existing User model
model User {
  // ... existing fields ...
  
  savingsGoals          SavingsGoal[]
  savingsDeposits       SavingsDeposit[]
  savingsAutomations    SavingsAutomation[]
  createdChallenges     SavingsChallenge[]
  challengeParticipations ChallengeParticipation[]
  savingsAnalytics      SavingsAnalytics[]
  investmentAccounts    InvestmentAccount[]
  investmentTransactions InvestmentTransaction[]
  portfolio             Portfolio[]
}
```

#### API Endpoints - Micro Savings

```typescript
// Savings Goals
POST   /api/v1/savings/goals
GET    /api/v1/savings/goals
GET    /api/v1/savings/goals/:goalId
PATCH  /api/v1/savings/goals/:goalId
DELETE /api/v1/savings/goals/:goalId
POST   /api/v1/savings/goals/:goalId/deposits
GET    /api/v1/savings/goals/:goalId/deposits
GET    /api/v1/savings/goals/:goalId/analytics

// Savings Automations
POST   /api/v1/savings/automations
GET    /api/v1/savings/automations
GET    /api/v1/savings/automations/:automationId
PATCH  /api/v1/savings/automations/:automationId
DELETE /api/v1/savings/automations/:automationId
POST   /api/v1/savings/automations/:automationId/activate
POST   /api/v1/savings/automations/:automationId/deactivate
POST   /api/v1/savings/automations/:automationId/execute

// Savings Challenges
POST   /api/v1/savings/challenges
GET    /api/v1/savings/challenges
GET    /api/v1/savings/challenges/:challengeId
POST   /api/v1/savings/challenges/:challengeId/join
POST   /api/v1/savings/challenges/:challengeId/leave
GET    /api/v1/savings/challenges/:challengeId/leaderboard

// Analytics
GET    /api/v1/savings/analytics/summary
GET    /api/v1/savings/analytics/trends
GET    /api/v1/savings/analytics/comparison
```

#### Service Implementation - Micro Savings

```typescript
// backend/src/services/savings/savings-goal.service.ts

import { PrismaClient, SavingsGoalStatus } from '@prisma/client';
import { NotFoundError, ValidationError } from '@/utils/errors';

const prisma = new PrismaClient();

export class SavingsGoalService {
  async createGoal(userId: string, data: {
    name: string;
    description?: string;
    targetAmount: number;
    targetDate?: Date;
    category: string;
    isPublic?: boolean;
  }) {
    // Validation
    if (data.targetAmount <= 0) {
      throw new ValidationError('Target amount must be greater than 0');
    }

    if (data.targetDate && data.targetDate < new Date()) {
      throw new ValidationError('Target date cannot be in the past');
    }

    // Create goal
    const goal = await prisma.savingsGoal.create({
      data: {
        userId,
        ...data,
        currencyCode: 'KES', // Get from user preferences
        status: 'ACTIVE',
        currentAmount: 0,
      },
    });

    // Send notification
    // await this.notificationService.sendGoalCreated(goal);

    return goal;
  }

  async makeDeposit(goalId: string, userId: string, amount: number, source: string = 'manual') {
    const goal = await prisma.savingsGoal.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      throw new NotFoundError('Savings goal');
    }

    if (goal.userId !== userId) {
      throw new ValidationError('Goal does not belong to user');
    }

    if (goal.status !== 'ACTIVE') {
      throw new ValidationError('Goal is not active');
    }

    // Create deposit
    const deposit = await prisma.savingsDeposit.create({
      data: {
        savingsGoalId: goalId,
        userId,
        amount,
        currencyCode: goal.currencyCode,
        source,
        depositDate: new Date(),
      },
    });

    // Update goal current amount
    const newAmount = Number(goal.currentAmount) + amount;
    await prisma.savingsGoal.update({
      where: { id: goalId },
      data: { currentAmount: newAmount },
    });

    // Check if goal completed
    if (newAmount >= Number(goal.targetAmount)) {
      await this.completeGoal(goalId);
    }

    // Check milestones (25%, 50%, 75%)
    await this.checkMilestones(goalId, goal.targetAmount, newAmount);

    return deposit;
  }

  private async completeGoal(goalId: string) {
    await prisma.savingsGoal.update({
      where: { id: goalId },
      data: { status: 'COMPLETED' },
    });

    // Send celebration notification
    // await this.notificationService.sendGoalCompleted(goalId);
  }

  private async checkMilestones(goalId: string, target: any, current: number) {
    const targetNum = Number(target);
    const percentage = (current / targetNum) * 100;

    const milestones = [25, 50, 75];
    for (const milestone of milestones) {
      if (percentage >= milestone && percentage < milestone + 5) {
        // Send milestone notification
        // await this.notificationService.sendMilestoneReached(goalId, milestone);
      }
    }
  }

  async getGoalAnalytics(goalId: string, userId: string) {
    const goal = await prisma.savingsGoal.findUnique({
      where: { id: goalId },
      include: {
        deposits: {
          orderBy: { depositDate: 'asc' },
        },
      },
    });

    if (!goal || goal.userId !== userId) {
      throw new NotFoundError('Savings goal');
    }

    const totalDeposits = goal.deposits.length;
    const avgDeposit = totalDeposits > 0
      ? goal.deposits.reduce((sum, d) => sum + Number(d.amount), 0) / totalDeposits
      : 0;

    const daysActive = Math.floor(
      (new Date().getTime() - goal.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const progressPercentage = (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100;

    // Calculate estimated completion date
    let estimatedCompletion = null;
    if (avgDeposit > 0 && goal.targetDate) {
      const remaining = Number(goal.targetAmount) - Number(goal.currentAmount);
      const daysNeeded = Math.ceil(remaining / (avgDeposit / (daysActive || 1)));
      estimatedCompletion = new Date();
      estimatedCompletion.setDate(estimatedCompletion.getDate() + daysNeeded);
    }

    return {
      goal,
      stats: {
        totalDeposits,
        avgDeposit,
        daysActive,
        progressPercentage,
        estimatedCompletion,
        onTrack: goal.targetDate ? estimatedCompletion <= goal.targetDate : null,
      },
    };
  }
}
```

```typescript
// backend/src/services/savings/savings-automation.service.ts

export class SavingsAutomationService {
  async createRoundUpRule(userId: string, goalId: string, roundUpTo: number) {
    const automation = await prisma.savingsAutomation.create({
      data: {
        userId,
        savingsGoalId: goalId,
        ruleType: 'ROUND_UP',
        isActive: true,
        configuration: {
          roundUpTo, // 1, 5, or 10
        },
        currencyCode: 'KES',
      },
    });

    return automation;
  }

  async executeRoundUpRule(automationId: string, transactionAmount: number) {
    const automation = await prisma.savingsAutomation.findUnique({
      where: { id: automationId },
    });

    if (!automation || !automation.isActive) {
      return null;
    }

    const config = automation.configuration as any;
    const roundUpTo = config.roundUpTo;

    // Calculate round-up amount
    const remainder = transactionAmount % roundUpTo;
    const roundUpAmount = remainder === 0 ? 0 : roundUpTo - remainder;

    if (roundUpAmount > 0 && automation.savingsGoalId) {
      // Create deposit
      const deposit = await prisma.savingsDeposit.create({
        data: {
          savingsGoalId: automation.savingsGoalId,
          userId: automation.userId,
          amount: roundUpAmount,
          currencyCode: automation.currencyCode,
          source: 'automation',
          automationId: automation.id,
        },
      });

      // Update automation stats
      await prisma.savingsAutomation.update({
        where: { id: automationId },
        data: {
          lastExecuted: new Date(),
          totalSaved: Number(automation.totalSaved) + roundUpAmount,
        },
      });

      // Update goal amount
      await prisma.savingsGoal.update({
        where: { id: automation.savingsGoalId },
        data: {
          currentAmount: {
            increment: roundUpAmount,
          },
        },
      });

      return deposit;
    }

    return null;
  }

  async executePercentageRule(automationId: string, incomeAmount: number) {
    const automation = await prisma.savingsAutomation.findUnique({
      where: { id: automationId },
    });

    if (!automation || !automation.isActive) {
      return null;
    }

    const config = automation.configuration as any;
    const percentage = config.percentage; // e.g., 10 for 10%

    const saveAmount = (incomeAmount * percentage) / 100;

    if (saveAmount > 0 && automation.savingsGoalId) {
      const deposit = await prisma.savingsDeposit.create({
        data: {
          savingsGoalId: automation.savingsGoalId,
          userId: automation.userId,
          amount: saveAmount,
          currencyCode: automation.currencyCode,
          source: 'automation',
          automationId: automation.id,
        },
      });

      await prisma.savingsAutomation.update({
        where: { id: automationId },
        data: {
          lastExecuted: new Date(),
          totalSaved: Number(automation.totalSaved) + saveAmount,
        },
      });

      await prisma.savingsGoal.update({
        where: { id: automation.savingsGoalId },
        data: {
          currentAmount: {
            increment: saveAmount,
          },
        },
      });

      return deposit;
    }

    return null;
  }
}
```

---

## 🏗️ EXPANSION PHASE 2: Micro Investment Services System

### Overview
Enable members to invest small amounts in diversified portfolios, stocks, bonds, and funds. Democratize investing with fractional shares and automated portfolio management.

### Features to Implement

#### 2.1 Investment Accounts
**Functionality:**
- Create investment accounts linked to user profile
- Account types: Individual, Joint, Retirement (future)
- KYC verification integration
- Account funding via mobile money/bank transfer
- Real-time account balance and holdings

**User Stories:**
```
As a member, I want to create an investment account
So that I can start investing with small amounts

As a member, I want to link my mobile money account
So that I can easily fund my investments

As a member, I want to see my total investment value
So that I can track my wealth growth
```

#### 2.2 Investment Products
**Functionality:**
- **Stocks:** Fractional shares of public companies
- **ETFs:** Exchange-traded funds for diversification
- **Bonds:** Government and corporate bonds
- **Money Market Funds:** Low-risk, liquid investments
- Product research: Price history, fundamentals, analyst ratings

**User Stories:**
```
As a member, I want to buy fractional shares of Apple stock
So that I can invest in companies with my small budget

As a member, I want to invest in a diversified ETF
So that I reduce my risk across many companies

As a member, I want to see historical performance
So that I can make informed investment decisions
```

#### 2.3 Automated Investing
**Functionality:**
- **Auto-Invest:** Schedule recurring investments (daily/weekly/monthly)
- **Robo-Advisor:** AI-powered portfolio recommendations based on risk tolerance
- **Rebalancing:** Automatic portfolio rebalancing to maintain target allocation
- **Dividend Reinvestment:** Automatically reinvest dividends
- **Dollar-Cost Averaging:** Invest fixed amounts at regular intervals

**User Stories:**
```
As a member, I want to automatically invest $10 every week
So that I build wealth consistently without manual effort

As a member, I want portfolio recommendations based on my risk tolerance
So that I invest appropriately for my situation

As a member, I want my portfolio automatically rebalanced
So that I maintain my desired asset allocation
```

#### 2.4 Portfolio Management
**Functionality:**
- Create multiple portfolios (aggressive, conservative, retirement)
- Asset allocation visualization (pie charts, sector breakdown)
- Performance tracking (returns, gains/losses)
- Benchmarking against market indices
- Tax-loss harvesting (future enhancement)

**User Stories:**
```
As a member, I want to create separate portfolios for different goals
So that I can manage risk differently for each goal

As a member, I want to see my portfolio performance
So that I know if my investments are growing

As a member, I want to compare my returns to the market
So that I can evaluate my investment strategy
```

#### 2.5 Investment Analytics
**Functionality:**
- Total returns (percentage and dollar amount)
- Time-weighted returns vs. money-weighted returns
- Risk metrics (volatility, Sharpe ratio, beta)
- Sector and geographic exposure
- Dividend income tracking
- Capital gains/losses reports

**User Stories:**
```
As a member, I want to see my total investment returns
So that I know how well my money is growing

As a member, I want to understand my portfolio risk
So that I can adjust if needed

As a member, I want a tax report at year-end
So that I can file my taxes correctly
```

---

### Technical Implementation - Micro Investment

#### Database Schema Additions

```prisma
// Add to existing schema.prisma

enum InvestmentAccountStatus {
  PENDING_KYC
  ACTIVE
  SUSPENDED
  CLOSED
}

enum InvestmentAccountType {
  INDIVIDUAL
  JOINT
  RETIREMENT
}

enum InvestmentProductType {
  STOCK
  ETF
  BOND
  MONEY_MARKET
  MUTUAL_FUND
}

enum TransactionType {
  BUY
  SELL
  DIVIDEND
  FEE
  DEPOSIT
  WITHDRAWAL
}

enum OrderStatus {
  PENDING
  PARTIALLY_FILLED
  FILLED
  CANCELLED
  REJECTED
}

enum RiskTolerance {
  CONSERVATIVE
  MODERATE
  AGGRESSIVE
}

model InvestmentAccount {
  id              String                   @id @default(uuid()) @db.Uuid
  userId          String                   @db.Uuid
  accountNumber   String                   @unique @db.VarChar(20)
  accountType     InvestmentAccountType
  status          InvestmentAccountStatus  @default(PENDING_KYC)
  cashBalance     Decimal                  @default(0) @db.Decimal(12, 2)
  totalValue      Decimal                  @default(0) @db.Decimal(12, 2)
  currencyCode    String                   @db.VarChar(3)
  kycVerified     Boolean                  @default(false)
  kycVerifiedDate DateTime?
  riskTolerance   RiskTolerance            @default(MODERATE)
  createdAt       DateTime                 @default(now())
  updatedAt       DateTime                 @updatedAt
  
  user         User                      @relation(fields: [userId], references: [id])
  portfolios   Portfolio[]
  transactions InvestmentTransaction[]
  orders       Order[]
  autoInvest   AutoInvestRule[]
  
  @@index([userId, status])
  @@map("investment_accounts")
}

model InvestmentProduct {
  id              String                @id @default(uuid()) @db.Uuid
  symbol          String                @unique @db.VarChar(20)
  name            String                @db.VarChar(200)
  productType     InvestmentProductType
  exchange        String                @db.VarChar(20)
  sector          String?               @db.VarChar(100)
  description     String?               @db.Text
  currentPrice    Decimal               @db.Decimal(12, 4)
  currencyCode    String                @db.VarChar(3)
  minInvestment   Decimal               @default(1) @db.Decimal(12, 2)
  isFractional    Boolean               @default(true)
  isActive        Boolean               @default(true)
  dividendYield   Decimal?              @db.Decimal(5, 2)
  expenseRatio    Decimal?              @db.Decimal(5, 4)
  lastUpdated     DateTime              @default(now())
  createdAt       DateTime              @default(now())
  
  holdings     Holding[]
  orders       Order[]
  priceHistory PriceHistory[]
  
  @@index([symbol])
  @@index([productType, isActive])
  @@map("investment_products")
}

model Portfolio {
  id              String   @id @default(uuid()) @db.Uuid
  accountId       String   @db.Uuid
  userId          String   @db.Uuid
  name            String   @db.VarChar(100)
  description     String?  @db.Text
  targetAllocation Json?   // { "stocks": 60, "bonds": 30, "cash": 10 }
  totalValue      Decimal  @default(0) @db.Decimal(12, 2)
  totalCost       Decimal  @default(0) @db.Decimal(12, 2)
  unrealizedGain  Decimal  @default(0) @db.Decimal(12, 2)
  realizedGain    Decimal  @default(0) @db.Decimal(12, 2)
  currencyCode    String   @db.VarChar(3)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  account  InvestmentAccount @relation(fields: [accountId], references: [id])
  user     User              @relation(fields: [userId], references: [id])
  holdings Holding[]
  
  @@index([accountId])
  @@index([userId])
  @@map("portfolios")
}

model Holding {
  id              String   @id @default(uuid()) @db.Uuid
  portfolioId     String   @db.Uuid
  productId       String   @db.Uuid
  quantity        Decimal  @db.Decimal(12, 6)
  avgCostBasis    Decimal  @db.Decimal(12, 4)
  currentValue    Decimal  @db.Decimal(12, 2)
  unrealizedGain  Decimal  @db.Decimal(12, 2)
  currencyCode    String   @db.VarChar(3)
  lastUpdated     DateTime @default(now())
  
  portfolio Portfolio          @relation(fields: [portfolioId], references: [id])
  product   InvestmentProduct  @relation(fields: [productId], references: [id])
  
  @@unique([portfolioId, productId])
  @@index([portfolioId])
  @@map("holdings")
}

model Order {
  id              String      @id @default(uuid()) @db.Uuid
  accountId       String      @db.Uuid
  productId       String      @db.Uuid
  orderType       String      @db.VarChar(20) // "market", "limit", "stop"
  transactionType TransactionType
  quantity        Decimal     @db.Decimal(12, 6)
  limitPrice      Decimal?    @db.Decimal(12, 4)
  filledQuantity  Decimal     @default(0) @db.Decimal(12, 6)
  avgFillPrice    Decimal?    @db.Decimal(12, 4)
  status          OrderStatus @default(PENDING)
  placedAt        DateTime    @default(now())
  filledAt        DateTime?
  cancelledAt     DateTime?
  expiresAt       DateTime?
  
  account InvestmentAccount @relation(fields: [accountId], references: [id])
  product InvestmentProduct @relation(fields: [productId], references: [id])
  
  @@index([accountId, status])
  @@index([status, placedAt])
  @@map("orders")
}

model InvestmentTransaction {
  id              String          @id @default(uuid()) @db.Uuid
  accountId       String          @db.Uuid
  productId       String?         @db.Uuid
  transactionType TransactionType
  quantity        Decimal?        @db.Decimal(12, 6)
  price           Decimal?        @db.Decimal(12, 4)
  amount          Decimal         @db.Decimal(12, 2)
  fee             Decimal         @default(0) @db.Decimal(12, 2)
  currencyCode    String          @db.VarChar(3)
  orderId         String?         @db.Uuid
  description     String?         @db.Text
  transactionDate DateTime        @default(now())
  
  account InvestmentAccount @relation(fields: [accountId], references: [id])
  
  @@index([accountId, transactionDate])
  @@index([transactionType, transactionDate])
  @@map("investment_transactions")
}

model AutoInvestRule {
  id              String   @id @default(uuid()) @db.Uuid
  accountId       String   @db.Uuid
  portfolioId     String?  @db.Uuid
  amount          Decimal  @db.Decimal(12, 2)
  frequency       String   @db.VarChar(20) // "daily", "weekly", "monthly"
  dayOfWeek       Int?     // 0-6 for weekly
  dayOfMonth      Int?     // 1-31 for monthly
  isActive        Boolean  @default(true)
  nextExecutionAt DateTime
  lastExecutedAt  DateTime?
  totalInvested   Decimal  @default(0) @db.Decimal(12, 2)
  currencyCode    String   @db.VarChar(3)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  account InvestmentAccount @relation(fields: [accountId], references: [id])
  
  @@index([accountId, isActive])
  @@index([isActive, nextExecutionAt])
  @@map("auto_invest_rules")
}

model PriceHistory {
  id        String   @id @default(uuid()) @db.Uuid
  productId String   @db.Uuid
  date      DateTime
  open      Decimal  @db.Decimal(12, 4)
  high      Decimal  @db.Decimal(12, 4)
  low       Decimal  @db.Decimal(12, 4)
  close     Decimal  @db.Decimal(12, 4)
  volume    BigInt
  
  product InvestmentProduct @relation(fields: [productId], references: [id])
  
  @@unique([productId, date])
  @@index([productId, date])
  @@map("price_history")
}

model RoboAdvisorRecommendation {
  id              String        @id @default(uuid()) @db.Uuid
  userId          String        @db.Uuid
  accountId       String        @db.Uuid
  riskTolerance   RiskTolerance
  targetAllocation Json         // Recommended asset allocation
  recommendedProducts Json      // List of recommended products
  reasoning       String        @db.Text
  createdAt       DateTime      @default(now())
  appliedAt       DateTime?
  
  @@index([userId, createdAt])
  @@map("robo_advisor_recommendations")
}
```

#### API Endpoints - Micro Investment

```typescript
// Investment Accounts
POST   /api/v1/investments/accounts
GET    /api/v1/investments/accounts
GET    /api/v1/investments/accounts/:accountId
PATCH  /api/v1/investments/accounts/:accountId
POST   /api/v1/investments/accounts/:accountId/deposit
POST   /api/v1/investments/accounts/:accountId/withdraw

// Investment Products
GET    /api/v1/investments/products
GET    /api/v1/investments/products/:productId
GET    /api/v1/investments/products/:productId/price-history
GET    /api/v1/investments/products/search

// Portfolios
POST   /api/v1/investments/portfolios
GET    /api/v1/investments/portfolios
GET    /api/v1/investments/portfolios/:portfolioId
PATCH  /api/v1/investments/portfolios/:portfolioId
DELETE /api/v1/investments/portfolios/:portfolioId
GET    /api/v1/investments/portfolios/:portfolioId/performance
POST   /api/v1/investments/portfolios/:portfolioId/rebalance

// Orders
POST   /api/v1/investments/orders
GET    /api/v1/investments/orders
GET    /api/v1/investments/orders/:orderId
PATCH  /api/v1/investments/orders/:orderId/cancel

// Auto-Invest
POST   /api/v1/investments/auto-invest
GET    /api/v1/investments/auto-invest
PATCH  /api/v1/investments/auto-invest/:ruleId
DELETE /api/v1/investments/auto-invest/:ruleId
POST   /api/v1/investments/auto-invest/:ruleId/execute

// Robo-Advisor
POST   /api/v1/investments/robo-advisor/assess
GET    /api/v1/investments/robo-advisor/recommendations
POST   /api/v1/investments/robo-advisor/apply

// Analytics
GET    /api/v1/investments/analytics/performance
GET    /api/v1/investments/analytics/allocation
GET    /api/v1/investments/analytics/returns
GET    /api/v1/investments/analytics/risk
```

#### Service Implementation - Micro Investment

```typescript
// backend/src/services/investments/investment-account.service.ts

export class InvestmentAccountService {
  async createAccount(userId: string, data: {
    accountType: InvestmentAccountType;
    riskTolerance?: RiskTolerance;
  }) {
    // Generate unique account number
    const accountNumber = await this.generateAccountNumber();

    const account = await prisma.investmentAccount.create({
      data: {
        userId,
        accountNumber,
        accountType: data.accountType,
        riskTolerance: data.riskTolerance || 'MODERATE',
        status: 'PENDING_KYC',
        cashBalance: 0,
        totalValue: 0,
        currencyCode: 'KES',
      },
    });

    // Trigger KYC verification process
    // await this.kycService.initiateVerification(userId, account.id);

    return account;
  }

  async deposit(accountId: string, amount: number, paymentMethod: string) {
    const account = await prisma.investmentAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundError('Investment account');
    }

    if (account.status !== 'ACTIVE') {
      throw new ValidationError('Account is not active');
    }

    // Process payment via mobile money/bank
    // const paymentResult = await this.paymentService.processDeposit(amount, paymentMethod);

    // Update account balance
    const newBalance = Number(account.cashBalance) + amount;
    await prisma.investmentAccount.update({
      where: { id: accountId },
      data: {
        cashBalance: newBalance,
        totalValue: Number(account.totalValue) + amount,
      },
    });

    // Record transaction
    await prisma.investmentTransaction.create({
      data: {
        accountId,
        transactionType: 'DEPOSIT',
        amount,
        currencyCode: account.currencyCode,
        description: `Deposit via ${paymentMethod}`,
        transactionDate: new Date(),
      },
    });

    return { newBalance };
  }

  private async generateAccountNumber(): Promise<string> {
    const prefix = 'INV';
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const accountNumber = `${prefix}-${random}`;
    
    // Check uniqueness
    const existing = await prisma.investmentAccount.findUnique({
      where: { accountNumber },
    });
    
    if (existing) {
      return this.generateAccountNumber(); // Retry
    }
    
    return accountNumber;
  }
}
```

```typescript
// backend/src/services/investments/order.service.ts

export class OrderService {
  async placeBuyOrder(accountId: string, data: {
    productId: string;
    quantity: number;
    orderType: 'market' | 'limit';
    limitPrice?: number;
  }) {
    const account = await prisma.investmentAccount.findUnique({
      where: { id: accountId },
    });

    const product = await prisma.investmentProduct.findUnique({
      where: { id: data.productId },
    });

    if (!account || !product) {
      throw new NotFoundError('Account or product');
    }

    // Calculate estimated cost
    const estimatedPrice = data.orderType === 'limit' 
      ? data.limitPrice! 
      : Number(product.currentPrice);
    const estimatedCost = data.quantity * estimatedPrice;
    const fee = this.calculateFee(estimatedCost);
    const totalCost = estimatedCost + fee;

    // Check if sufficient balance
    if (Number(account.cashBalance) < totalCost) {
      throw new ValidationError('Insufficient funds');
    }

    // Create order
    const order = await prisma.order.create({
      data: {
        accountId,
        productId: data.productId,
        orderType: data.orderType,
        transactionType: 'BUY',
        quantity: data.quantity,
        limitPrice: data.limitPrice,
        status: 'PENDING',
        placedAt: new Date(),
      },
    });

    // If market order, execute immediately
    if (data.orderType === 'market') {
      await this.executeOrder(order.id);
    }

    return order;
  }

  private async executeOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        product: true,
        account: true,
      },
    });

    if (!order || order.status !== 'PENDING') {
      return;
    }

    // Get current market price
    const fillPrice = Number(order.product.currentPrice);
    const totalCost = order.quantity * fillPrice;
    const fee = this.calculateFee(totalCost);

    // Update order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'FILLED',
        filledQuantity: order.quantity,
        avgFillPrice: fillPrice,
        filledAt: new Date(),
      },
    });

    // Deduct from cash balance
    await prisma.investmentAccount.update({
      where: { id: order.accountId },
      data: {
        cashBalance: Number(order.account.cashBalance) - (totalCost + fee),
      },
    });

    // Record transaction
    await prisma.investmentTransaction.create({
      data: {
        accountId: order.accountId,
        productId: order.productId,
        transactionType: 'BUY',
        quantity: order.quantity,
        price: fillPrice,
        amount: totalCost,
        fee,
        currencyCode: order.account.currencyCode,
        orderId,
        transactionDate: new Date(),
      },
    });

    // Update or create holding
    await this.updateHolding(order.accountId, order.productId, order.quantity, fillPrice);
  }

  private async updateHolding(
    accountId: string,
    productId: string,
    quantity: number,
    price: number
  ) {
    // Find or create portfolio (use default portfolio for now)
    let portfolio = await prisma.portfolio.findFirst({
      where: { accountId },
    });

    if (!portfolio) {
      portfolio = await prisma.portfolio.create({
        data: {
          accountId,
          userId: (await prisma.investmentAccount.findUnique({ where: { id: accountId } }))!.userId,
          name: 'Default Portfolio',
          currencyCode: 'KES',
        },
      });
    }

    // Find existing holding
    const existingHolding = await prisma.holding.findUnique({
      where: {
        portfolioId_productId: {
          portfolioId: portfolio.id,
          productId,
        },
      },
    });

    if (existingHolding) {
      // Update existing holding
      const newQuantity = Number(existingHolding.quantity) + quantity;
      const totalCost = (Number(existingHolding.avgCostBasis) * Number(existingHolding.quantity)) + (price * quantity);
      const newAvgCost = totalCost / newQuantity;

      await prisma.holding.update({
        where: { id: existingHolding.id },
        data: {
          quantity: newQuantity,
          avgCostBasis: newAvgCost,
          lastUpdated: new Date(),
        },
      });
    } else {
      // Create new holding
      await prisma.holding.create({
        data: {
          portfolioId: portfolio.id,
          productId,
          quantity,
          avgCostBasis: price,
          currentValue: quantity * price,
          unrealizedGain: 0,
          currencyCode: 'KES',
        },
      });
    }
  }

  private calculateFee(amount: number): number {
    // Example: 0.5% fee with $1 minimum
    const feePercentage = 0.005;
    const calculatedFee = amount * feePercentage;
    return Math.max(calculatedFee, 1);
  }
}
```

```typescript
// backend/src/services/investments/robo-advisor.service.ts

export class RoboAdvisorService {
  async generateRecommendation(userId: string, accountId: string) {
    const account = await prisma.investmentAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundError('Investment account');
    }

    const riskTolerance = account.riskTolerance;

    // Define allocation based on risk tolerance
    const allocations = {
      CONSERVATIVE: { stocks: 30, bonds: 50, cash: 20 },
      MODERATE: { stocks: 60, bonds: 30, cash: 10 },
      AGGRESSIVE: { stocks: 80, bonds: 15, cash: 5 },
    };

    const targetAllocation = allocations[riskTolerance];

    // Recommend specific products
    const recommendedProducts = await this.selectProducts(riskTolerance, targetAllocation);

    // Generate reasoning
    const reasoning = this.generateReasoning(riskTolerance, targetAllocation, recommendedProducts);

    // Save recommendation
    const recommendation = await prisma.roboAdvisorRecommendation.create({
      data: {
        userId,
        accountId,
        riskTolerance,
        targetAllocation,
        recommendedProducts,
        reasoning,
      },
    });

    return recommendation;
  }

  private async selectProducts(riskTolerance: string, allocation: any) {
    // Get top-performing products for each category
    const stocks = await prisma.investmentProduct.findMany({
      where: { productType: 'ETF', isActive: true },
      take: 3,
      orderBy: { currentPrice: 'desc' }, // Placeholder - should use performance metrics
    });

    const bonds = await prisma.investmentProduct.findMany({
      where: { productType: 'BOND', isActive: true },
      take: 2,
    });

    const moneyMarket = await prisma.investmentProduct.findMany({
      where: { productType: 'MONEY_MARKET', isActive: true },
      take: 1,
    });

    return {
      stocks: stocks.map(s => ({ symbol: s.symbol, allocation: allocation.stocks / stocks.length })),
      bonds: bonds.map(b => ({ symbol: b.symbol, allocation: allocation.bonds / bonds.length })),
      cash: moneyMarket.map(m => ({ symbol: m.symbol, allocation: allocation.cash })),
    };
  }

  private generateReasoning(riskTolerance: string, allocation: any, products: any): string {
    return `Based on your ${riskTolerance.toLowerCase()} risk tolerance, we recommend an allocation of ${allocation.stocks}% stocks, ${allocation.bonds}% bonds, and ${allocation.cash}% cash. This provides a balanced approach to growth while managing risk appropriate to your profile.`;
  }

  async applyRecommendation(recommendationId: string) {
    const recommendation = await prisma.roboAdvisorRecommendation.findUnique({
      where: { id: recommendationId },
    });

    if (!recommendation) {
      throw new NotFoundError('Recommendation');
    }

    const account = await prisma.investmentAccount.findUnique({
      where: { id: recommendation.accountId },
    });

    if (!account) {
      throw new NotFoundError('Account');
    }

    const availableCash = Number(account.cashBalance);
    const products = recommendation.recommendedProducts as any;

    // Place orders for each recommended product
    for (const category in products) {
      for (const product of products[category]) {
        const allocationAmount = (availableCash * product.allocation) / 100;
        
        // Get product details
        const investmentProduct = await prisma.investmentProduct.findFirst({
          where: { symbol: product.symbol },
        });

        if (investmentProduct) {
          const quantity = allocationAmount / Number(investmentProduct.currentPrice);
          
          // Place market order
          await prisma.order.create({
            data: {
              accountId: account.id,
              productId: investmentProduct.id,
              orderType: 'market',
              transactionType: 'BUY',
              quantity,
              status: 'PENDING',
            },
          });
        }
      }
    }

    // Mark recommendation as applied
    await prisma.roboAdvisorRecommendation.update({
      where: { id: recommendationId },
      data: { appliedAt: new Date() },
    });

    return { message: 'Recommendation applied successfully' };
  }
}
```

---

## 🏗️ EXPANSION PHASE 3: Integration & Polish

### Overview
Integrate the two new services with existing platform, add cross-service features, and prepare for production launch.

### 3.1 Cross-Service Integration

#### Link Savings Goals to Investments
```typescript
// Feature: Automatically invest savings goal funds when goal completed

export class SavingsInvestmentIntegrationService {
  async onGoalCompleted(goalId: string) {
    const goal = await prisma.savingsGoal.findUnique({
      where: { id: goalId },
      include: { user: true },
    });

    if (!goal) return;

    // Check if user has investment account
    const investmentAccount = await prisma.investmentAccount.findFirst({
      where: { userId: goal.userId, status: 'ACTIVE' },
    });

    if (investmentAccount) {
      // Transfer funds to investment account
      await this.transferToInvestment(goal.id, investmentAccount.id);
    } else {
      // Suggest creating investment account
      await this.notificationService.suggestInvestmentAccount(goal.userId);
    }
  }

  private async transferToInvestment(goalId: string, accountId: string) {
    const goal = await prisma.savingsGoal.findUnique({ where: { id: goalId } });
    
    if (!goal) return;

    const amount = Number(goal.currentAmount);

    // Deposit to investment account
    await prisma.investmentAccount.update({
      where: { id: accountId },
      data: {
        cashBalance: { increment: amount },
        totalValue: { increment: amount },
      },
    });

    // Record transaction
    await prisma.investmentTransaction.create({
      data: {
        accountId,
        transactionType: 'DEPOSIT',
        amount,
        currencyCode: goal.currencyCode,
        description: `Transfer from savings goal: ${goal.name}`,
        transactionDate: new Date(),
      },
    });

    // Clear savings goal
    await prisma.savingsGoal.update({
      where: { id: goalId },
      data: { currentAmount: 0 },
    });
  }
}
```

#### Unified Dashboard
```typescript
// Show combined net worth across all services

export class UnifiedDashboardService {
  async getUserNetWorth(userId: string) {
    // Group contributions
    const groupContributions = await prisma.contribution.aggregate({
      where: { member: { userId } },
      _sum: { amount: true },
    });

    // Savings goals
    const savingsGoals = await prisma.savingsGoal.aggregate({
      where: { userId },
      _sum: { currentAmount: true },
    });

    // Investment accounts
    const investments = await prisma.investmentAccount.aggregate({
      where: { userId },
      _sum: { totalValue: true },
    });

    const totalNetWorth = 
      Number(groupContributions._sum.amount || 0) +
      Number(savingsGoals._sum.currentAmount || 0) +
      Number(investments._sum.totalValue || 0);

    return {
      totalNetWorth,
      breakdown: {
        groupContributions: groupContributions._sum.amount || 0,
        personalSavings: savingsGoals._sum.currentAmount || 0,
        investments: investments._sum.totalValue || 0,
      },
    };
  }

  async getFinancialSummary(userId: string) {
    const netWorth = await this.getUserNetWorth(userId);

    // Get monthly trends
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthData = await this.getMonthlyNetWorth(userId, monthStart, monthEnd);
      last6Months.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        netWorth: monthData,
      });
    }

    return {
      current: netWorth,
      trends: last6Months,
    };
  }
}
```

### 3.2 Feature Flags Implementation

```typescript
// backend/src/services/feature-flags/feature-flag.service.ts

export class FeatureFlagService {
  private flags = new Map<string, boolean>();

  constructor() {
    // Initialize flags from environment or database
    this.flags.set('micro_savings_enabled', process.env.ENABLE_MICRO_SAVINGS === 'true');
    this.flags.set('micro_investments_enabled', process.env.ENABLE_MICRO_INVESTMENTS === 'true');
    this.flags.set('robo_advisor_enabled', process.env.ENABLE_ROBO_ADVISOR === 'true');
    this.flags.set('auto_invest_enabled', process.env.ENABLE_AUTO_INVEST === 'true');
  }

  isEnabled(flagName: string, userId?: string): boolean {
    // Check global flag
    const globalFlag = this.flags.get(flagName) || false;
    
    if (!globalFlag) return false;

    // Check user-specific override (for beta testing)
    if (userId) {
      return this.isEnabledForUser(flagName, userId);
    }

    return globalFlag;
  }

  private async isEnabledForUser(flagName: string, userId: string): Promise<boolean> {
    // Check if user is in beta program
    const betaUser = await prisma.betaProgram.findFirst({
      where: {
        userId,
        feature: flagName,
        isActive: true,
      },
    });

    return !!betaUser;
  }
}

// Use in routes
router.post('/savings/goals', authenticate, async (req, res, next) => {
  if (!featureFlagService.isEnabled('micro_savings_enabled', req.user.id)) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FEATURE_DISABLED',
        message: 'Micro savings feature is not available',
      },
    });
  }

  // Continue with normal flow
  next();
});
```

### 3.3 Migration Strategy

```sql
-- Create migration for new tables
-- migrations/add_savings_and_investment_tables.sql

-- Savings tables
CREATE TABLE savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  -- ... rest of schema
);

-- Investment tables
CREATE TABLE investment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  account_number VARCHAR(20) UNIQUE NOT NULL,
  -- ... rest of schema
);

-- Create indexes
CREATE INDEX idx_savings_goals_user_status ON savings_goals(user_id, status);
CREATE INDEX idx_investment_accounts_user_status ON investment_accounts(user_id, status);

-- Add feature flags table
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name VARCHAR(100) UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO feature_flags (flag_name, is_enabled, description) VALUES
('micro_savings_enabled', false, 'Enable micro savings features'),
('micro_investments_enabled', false, 'Enable micro investment features');
```

### 3.4 Testing Strategy

```typescript
// backend/tests/integration/savings-investment-integration.test.ts

describe('Savings to Investment Integration', () => {
  it('should transfer completed savings goal to investment account', async () => {
    // Create user with both savings and investment accounts
    const user = await createTestUser();
    const savingsGoal = await createSavingsGoal(user.id, {
      targetAmount: 1000,
      currentAmount: 1000,
      status: 'COMPLETED',
    });
    const investmentAccount = await createInvestmentAccount(user.id);

    // Trigger integration
    await savingsInvestmentIntegration.onGoalCompleted(savingsGoal.id);

    // Verify transfer
    const updatedAccount = await prisma.investmentAccount.findUnique({
      where: { id: investmentAccount.id },
    });

    expect(updatedAccount.cashBalance).toBe(1000);
    expect(updatedAccount.totalValue).toBe(1000);

    // Verify transaction recorded
    const transaction = await prisma.investmentTransaction.findFirst({
      where: { accountId: investmentAccount.id },
    });

    expect(transaction).toBeDefined();
    expect(transaction.transactionType).toBe('DEPOSIT');
    expect(transaction.amount).toBe(1000);
  });
});
```

---

## 📋 Implementation Checklist

### Phase 1: Micro Savings (Weeks 1-4)
- [ ] Database schema migration
- [ ] Savings goal CRUD APIs
- [ ] Deposit tracking system
- [ ] Automation rules (round-up, percentage)
- [ ] Challenges system
- [ ] Analytics dashboard
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests
- [ ] API documentation
- [ ] Feature flag implementation

### Phase 2: Micro Investment (Weeks 5-8)
- [ ] Database schema migration
- [ ] Investment account creation
- [ ] Product catalog setup
- [ ] Order placement system
- [ ] Portfolio management
- [ ] Auto-invest rules
- [ ] Robo-advisor algorithm
- [ ] Price history tracking
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests
- [ ] API documentation
- [ ] Feature flag implementation

### Phase 3: Integration & Launch (Weeks 9-12)
- [ ] Cross-service integration
- [ ] Unified dashboard
- [ ] Performance optimization
- [ ] Security audit
- [ ] Load testing
- [ ] Beta program setup
- [ ] User documentation
- [ ] Admin training materials
- [ ] Gradual rollout plan
- [ ] Monitoring and alerting
- [ ] Production deployment
- [ ] Post-launch monitoring

---

## 🚀 Deployment Strategy

### Week 1-2: Alpha Testing (Internal)
- Deploy to staging environment
- Enable features for internal users only
- Test all workflows end-to-end
- Fix critical bugs

### Week 3-4: Beta Testing (Selected Users)
- Enable for 50-100 beta users
- Monitor usage and performance
- Gather feedback
- Iterate on UX

### Week 5-6: Limited Release (10% of users)
- Gradually enable for 10% of user base
- Monitor system performance
- Track engagement metrics
- Address any issues

### Week 7-8: Full Rollout (50% of users)
- Enable for 50% of users
- Continue monitoring
- Marketing campaign begins
- Support team trained

### Week 9-12: Complete Launch (100%)
- Enable for all users
- Full marketing push
- Monitor KPIs closely
- Prepare Phase 2 features

---

## 📊 Success Metrics

### Micro Savings KPIs (3 months post-launch)
- **Adoption Rate:** 40% of existing users create ≥1 savings goal
- **Engagement:** 60% of users make ≥1 deposit per month
- **Automation:** 25% of users enable ≥1 automation rule
- **Goal Completion:** 20% of goals reach 100% within 6 months
- **Challenge Participation:** 15% of users join challenges

### Micro Investment KPIs (3 months post-launch)
- **Adoption Rate:** 20% of existing users create investment account
- **Funding:** 70% of accounts funded within 1 week
- **Trading Activity:** 50% of accounts place ≥1 trade per month
- **Auto-Invest:** 30% of accounts enable auto-invest
- **AUM (Assets Under Management):** $500K within 6 months

### Platform KPIs (Overall)
- **Cross-Product Usage:** 30% of users use 2+ services
- **Revenue Growth:** 40% increase from new services
- **Retention:** 90% retention rate (up from 85%)
- **NPS:** 60+ (up from 50)

---

## 🎯 PROMPT FOR TRAE.AI VIDE

```
CONTEXT:
You are expanding the existing Digital Savings Group Management Platform (already in production) to add two major new services: Micro Savings and Micro Investment. The existing platform is stable and serving users actively.

CRITICAL REQUIREMENTS:
1. DO NOT modify existing code - only add new modules
2. Use feature flags for all new features
3. All database changes must be additive (new tables only, no ALTER TABLE)
4. Maintain backward compatibility with all existing APIs
5. Follow the exact architecture and patterns from RULES.md

REFERENCE DOCUMENTS:
- RULES.md - Technical standards (follow strictly)
- PHASE_1_Foundation.md - Existing database schema and architecture
- This expansion prompt - New features specification

PHASE 1 TASK: Implement Micro Savings Services

Step 1: Create database schema
- Add new tables: savings_goals, savings_deposits, savings_automations, savings_challenges, challenge_participations, savings_analytics
- Follow schema from section "Database Schema Additions - Micro Savings"
- Run migration: npx prisma migrate dev --name add_micro_savings
- Generate Prisma client: npx prisma generate

Step 2: Implement services
- Create backend/src/services/savings/savings-goal.service.ts
- Create backend/src/services/savings/savings-automation.service.ts
- Create backend/src/services/savings/challenge.service.ts
- Create backend/src/services/savings/analytics.service.ts
- Follow implementation examples from this document

Step 3: Create API routes
- Create backend/src/api/routes/savings.routes.ts
- All routes under /api/v1/savings/*
- Add authentication middleware
- Add feature flag checks

Step 4: Create frontend components
- Create frontend/src/pages/savings/SavingsGoals.tsx
- Create frontend/src/pages/savings/CreateGoal.tsx
- Create frontend/src/components/savings/GoalCard.tsx
- Create frontend/src/services/savings.service.ts

Step 5: Add feature flags
- Add ENABLE_MICRO_SAVINGS to .env
- Implement FeatureFlagService
- Protect all new routes with feature flag checks

Step 6: Testing
- Create unit tests for all services
- Create integration tests for APIs
- Test with feature flag ON and OFF
- Verify existing features still work

EXPECTED OUTPUT:
- All new files created in proper directories
- No modifications to existing files
- Migration file created
- Tests passing
- Feature flag working
- Documentation updated

PHASE 2 TASK: Implement Micro Investment Services
[Similar detailed breakdown for investment features]

PHASE 3 TASK: Integration & Launch
[Integration code and deployment steps]

TEST BEFORE PROCEEDING:
1. Run all existing tests - must pass
2. Start application - should work without new features
3. Enable feature flag - new features should appear
4. Disable feature flag - should revert to original state

READY TO BEGIN?
