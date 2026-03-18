import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { generateInvitationToken } from './src/utils/generators';

async function testCreation() {
    const token = generateInvitationToken();
    console.log('Generated token:', token);

    // Need a real group ID
    const group = await (prisma as any).group.findFirst();
    if (!group) {
        console.log('No group found to test with.');
        return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    console.log('Creating invitation in DB...');
    const invitation = await (prisma as any).invitation.create({
        data: {
            groupId: group.id,
            token,
            maxUses: 10,
            expiresAt,
        }
    });

    console.log('Returned from create:', invitation.token);

    const found = await (prisma as any).invitation.findUnique({
        where: { token }
    });

    if (found) {
        console.log('Found in DB after creation:', found.token);
        if (found.token === token) {
            console.log('SUCCESS: Tokens match.');
        } else {
            console.log('FAILURE: Tokens DIFFER!');
        }
    } else {
        console.log('FAILURE: Created token not found in DB!');
    }
}

testCreation().finally(() => prisma.$disconnect());
