import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function listRecentTokens() {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    console.log('Listing tokens created since:', tenMinutesAgo.toISOString());

    const invitations = await (prisma as any).invitation.findMany({
        where: {
            createdAt: {
                gte: tenMinutesAgo
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${invitations.length} recent invitations:`);
    invitations.forEach((inv: any) => {
        console.log(`[${inv.createdAt.toISOString()}] ${inv.token}`);
    });
}

listRecentTokens().finally(() => prisma.$disconnect());
