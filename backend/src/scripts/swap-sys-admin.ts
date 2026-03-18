import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';
const SALT_ROUNDS = 12;

async function swapSuperAdmin() {
    const newEmail = 'elzakari@outlook.com';
    const newPassword = 'Barbie@2026#1';
    const oldEmail = 'elzakari@live.com';

    try {
        console.log(`Starting account swap...`);

        // 1. Handle old Super Admin
        await prisma.user.updateMany({
            where: { email: oldEmail },
            data: { role: 'ADMIN' }
        });
        console.log(`- Reverted ${oldEmail} to ADMIN.`);

        // 2. Hash new password
        const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // 3. Upsert new Super Admin
        const user = await prisma.user.upsert({
            where: { email: newEmail },
            update: {
                role: 'SYS_ADMIN',
                passwordHash: passwordHash,
                fullName: 'Zakari SuperAdmin',
                status: 'ACTIVE'
            },
            create: {
                email: newEmail,
                passwordHash: passwordHash,
                fullName: 'Zakari SuperAdmin',
                phoneNumber: '0000000000',
                role: 'SYS_ADMIN',
                status: 'ACTIVE'
            }
        });

        console.log(`- Successfully set ${newEmail} as SYS_ADMIN.`);
        console.log(`Done.`);
    } catch (error) {
        console.error('Error during account swap:', error);
    } finally {
        await prisma.$disconnect();
    }
}

swapSuperAdmin();
