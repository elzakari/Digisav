import prisma from '@/lib/prisma';

async function main() {
    console.log('--- Diagnostic Report ---');
    try {
        const userCount = await prisma.user.count();
        console.log('Total Users:', userCount);

        const users = await prisma.user.findMany({
            select: { id: true, fullName: true, email: true, role: true }
        });
        console.log('Users:', JSON.stringify(users, null, 2));

        const groups = await prisma.group.findMany({
            select: { id: true, groupName: true, adminUserId: true }
        });
        console.log('Groups:', JSON.stringify(groups, null, 2));

        const members = await prisma.member.findMany({
            include: { group: true, user: true }
        });
        console.log('Memberships:', members.length);
        members.forEach(m => {
            console.log(`- ${m.user.fullName} in ${m.group.groupName} (${m.status})`);
        });

    } catch (error) {
        console.error('Diagnostic Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
