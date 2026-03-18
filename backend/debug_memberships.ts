import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: { fullName: { contains: 'Daro' } }
    });
    console.log('Users found:', JSON.stringify(users, null, 2));

    for (const user of users) {
        const memberships = await prisma.member.findMany({
            where: { userId: user.id },
            include: { group: true }
        });
        console.log(`Memberships for ${user.fullName} (${user.id}):`, JSON.stringify(memberships, null, 2));

        const adminGroups = await prisma.group.findMany({
            where: { adminUserId: user.id }
        });
        console.log(`Admin groups for ${user.fullName}:`, JSON.stringify(adminGroups, null, 2));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
