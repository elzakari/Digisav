import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkInvitations() {
    const targetToken = '66315f4e66d96541783ee295ef9e70413bc96fcfc760e11e5af00d54e8ec5cafe';
    console.log('Target length:', targetToken.length);

    const invitations = await (prisma as any).invitation.findMany({
        select: { token: true }
    });

    console.log('Tokens in DB:');
    invitations.forEach((inv: any) => {
        console.log(`- ${inv.token} (length: ${inv.token.length})`);
        if (inv.token === targetToken) {
            console.log('  EXACT MATCH!');
        }
    });
}

checkInvitations().finally(() => prisma.$disconnect());
