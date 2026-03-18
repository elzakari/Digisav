import prisma from './src/lib/prisma';

async function listUsers() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                fullName: true,
                status: true,
                role: true
            }
        });
        console.log('--- USER LIST ---');
        console.log(JSON.stringify(users, null, 2));
        console.log('-----------------');
    } catch (error) {
        console.error('Error fetching users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

listUsers();
