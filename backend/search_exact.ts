import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findExactToken() {
    const urlToken = '66315f4e66d96541783ee295ef9e70413bc96fcfc760e11e5af00d54e8ec5cafe';
    console.log('Searching for exact URL token:', urlToken);

    const invitation = await (prisma as any).invitation.findUnique({
        where: { token: urlToken }
    });

    if (invitation) {
        console.log('FOUND EXACT MATCH!');
        console.log(JSON.stringify(invitation, null, 2));
    } else {
        console.log('NOT FOUND.');
        // Try case-insensitive?
        const all = await (prisma as any).invitation.findMany({
            where: {
                token: {
                    contains: urlToken,
                    mode: 'insensitive'
                }
            }
        });
        console.log('Case-insensitive/Contains results:', all.length);
    }
}

findExactToken().finally(() => prisma.$disconnect());
