import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function listTokens() {
    const urlToken = '66315f4e66d96541783ee295ef9e70413bc96fcfc760e11e5af00d54e8ec5cafe';
    console.log('Searching for:', urlToken);

    const invitations = await (prisma as any).invitation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20
    });

    invitations.forEach((inv: any) => {
        console.log(`[${inv.createdAt.toISOString()}] ${inv.token}`);
        if (inv.token === urlToken) {
            console.log('  *** MATCH! ***');
        }
    });
}

listTokens().finally(() => prisma.$disconnect());
