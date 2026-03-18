import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkInvitations() {
    const invitations = await (prisma as any).invitation.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { token: true, createdAt: true, usedCount: true, maxUses: true, expiresAt: true }
    });
    console.log('Last 5 invitations:');
    console.log(JSON.stringify(invitations, null, 2));
}

checkInvitations().finally(() => prisma.$disconnect());
