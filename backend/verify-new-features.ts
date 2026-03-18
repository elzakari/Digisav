import prisma from './src/lib/prisma';
import { MicroSavingsService } from './src/services/savings/micro-savings.service';
import { InvestmentService } from './src/services/investments/investment.service';
import { SavingsGoalService } from './src/services/savings/savings-goal.service';

async function verify() {
  const microSavingsService = new MicroSavingsService();
  const investmentService = new InvestmentService();
  const goalService = new SavingsGoalService();

  const user = await prisma.user.findUnique({
    where: { email: 'elzakari@outlook.com' },
  });

  if (!user) throw new Error('User not found');
  const userId = user.id;

  console.log('--- Phase 1: Toggle Participation ---');
  const userUpdated = await microSavingsService.toggleGroupParticipation(userId, true);
  console.log('Opted out of group savings:', userUpdated.optedOutOfGroupSavings);

  console.log('\n--- Phase 2: Create and Fund Goal for Withdrawal ---');
  const goal1 = await goalService.createGoal(userId, {
    name: 'Test Withdrawal Goal',
    targetAmount: 1000,
    category: 'EMERGENCY_FUND',
  });
  console.log('Goal created:', goal1.id);

  await goalService.makeDeposit(goal1.id, userId, 1000);
  console.log('Goal funded');

  const withdrawal = await microSavingsService.withdrawGoal(goal1.id, userId);
  console.log('Withdrawal result:', withdrawal.withdrawalDetails);

  console.log('\n--- Phase 3: Create and Fund Goal for Reinvestment ---');
  const goal2 = await goalService.createGoal(userId, {
    name: 'Test Reinvestment Goal',
    targetAmount: 5000,
    category: 'BUSINESS',
  });
  
  await goalService.makeDeposit(goal2.id, userId, 5000);
  
  const reinvestment = await investmentService.reinvestFromSavings(userId, goal2.id);
  console.log('Reinvested into account:', reinvestment.id);
  console.log('New account balance:', reinvestment.cashBalance);

  const tx = await prisma.investmentTransaction.findFirst({
    where: { savingsGoalId: goal2.id } as any,
  });
  console.log('Linked transaction found:', tx?.id);

  console.log('\n--- Verification Complete ---');
}

verify().catch(console.error).finally(() => prisma.$disconnect());
