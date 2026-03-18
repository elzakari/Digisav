import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkToken() {
    const targetToken = '66315f4e66d96541783ee295ef9e70413bc96fcfc760e11e5af00d54e8ec5cafe';
    console.log('Checking token:', targetToken);

    const invitation = await (prisma as any).invitation.findFirst({
        where: {
            token: {
                contains: targetToken.substring(0, 10)
            }
        }
    });

    if (invitation) {
        console.log('FOUND MATCHING TOKEN:');
        console.log(JSON.stringify(invitation, null, 2));
        if (invitation.token === targetToken) {
            console.log('EXACT MATCH!');
        } else {
            console.log('PARTIAL MATCH (Prefix matched).');
            console.log('DB Token:', invitation.token);
        }
    } else {
        console.log('NO MATCH EVEN FOR PREFIX.');
    }
}

checkToken().finally(() => prisma.$disconnect());
