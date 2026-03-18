import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkInvitations() {
    const urlToken = '66315f4e66d96541783ee295ef9e70413bc96fcfc760e11e5af00d54e8ec5cafe';
    console.log('URL Token:', urlToken);
    console.log('URL Token Length:', urlToken.length);

    const invitations = await (prisma as any).invitation.findMany();

    for (const inv of invitations) {
        console.log('DB Token:', inv.token);
        console.log('DB Token Length:', inv.token.length);

        if (inv.token === urlToken) {
            console.log('MATCH FOUND!');
        } else {
            // Find where they differ
            let differAt = -1;
            const minLength = Math.min(urlToken.length, inv.token.length);
            for (let i = 0; i < minLength; i++) {
                if (urlToken[i] !== inv.token[i]) {
                    differAt = i;
                    break;
                }
            }
            if (differAt !== -1) {
                console.log(`Differ at index ${differAt}: URL='${urlToken[differAt]}' (${urlToken.charCodeAt(differAt)}), DB='${inv.token[differAt]}' (${inv.token.charCodeAt(differAt)})`);
            } else if (urlToken.length !== inv.token.length) {
                console.log('Lengths differ but prefix matches.');
            }
        }
    }
}

checkInvitations().finally(() => prisma.$disconnect());
