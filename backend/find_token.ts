import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findTokenByPrefix() {
    const prefix = '66315f4e66';
    console.log('Searching for prefix:', prefix);

    const invitations = await (prisma as any).invitation.findMany({
        where: {
            token: {
                startsWith: prefix
            }
        }
    });

    console.log('Results:', JSON.stringify(invitations, null, 2));
}

findTokenByPrefix().finally(() => prisma.$disconnect());
