import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Admin Member Management Verification ---');

  // 1. Find a test group and its admin
  const group = await prisma.group.findFirst({
    include: { admin: true, members: true },
  });

  if (!group || group.members.length < 2) {
    console.log('Not enough data to run verification. Need a group with at least 2 members.');
    return;
  }

  const adminId = group.adminUserId;
  const memberIds = group.members.map(m => m.id);
  const targetMemberId = memberIds[1];

  console.log(`Using Group: ${group.groupName} (${group.id})`);
  console.log(`Admin: ${group.admin.fullName} (${adminId})`);
  console.log(`Target Member: ${targetMemberId}`);

  // 2. Test Single Member Update (Classification)
  console.log('\nTesting Single Member Classification Update...');
  const updatedMember = await prisma.member.update({
    where: { id: targetMemberId },
    data: {
      isSavingsGroupMember: true,
      isMicroSavingsMember: true,
      isMicroInvestmentMember: false,
    } as any,
  });

  console.log('Update Successful:');
  console.log(`- Savings Group Member: ${(updatedMember as any).isSavingsGroupMember}`);
  console.log(`- Micro Savings Member: ${(updatedMember as any).isMicroSavingsMember}`);
  console.log(`- Micro Investment Member: ${(updatedMember as any).isMicroInvestmentMember}`);

  // 3. Test Bulk Update
  console.log('\nTesting Bulk Update (Marking all as Current)...');
  const bulkResult = await (prisma.member as any).updateMany({
    where: {
      id: { in: memberIds },
      groupId: group.id,
    },
    data: {
      isCurrentInAll: true,
    } as any,
  });

  console.log(`Bulk Update Successful! Rows affected: ${bulkResult.count}`);

  // 4. Verify Bulk Update
  const verifiedMembers = await prisma.member.findMany({
    where: { id: { in: memberIds } },
  });

  const allCurrent = verifiedMembers.every(m => (m as any).isCurrentInAll === true);
  console.log(`Bulk Verification: ${allCurrent ? 'PASS' : 'FAIL'} (All current: ${allCurrent})`);

  console.log('\n--- Verification Complete ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
