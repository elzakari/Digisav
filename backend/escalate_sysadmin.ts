import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function escalateUser() {
    const email = 'elzakari@live.com';

    try {
        const updatedUser = await prisma.user.update({
            where: { email },
            data: { role: 'SYS_ADMIN' }
        });
        console.log(`Successfully escalated user ${email} to SYS_ADMIN.`);
        console.dir(updatedUser, { depth: null });
    } catch (error) {
        console.error('Failed to escalate user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

escalateUser();
