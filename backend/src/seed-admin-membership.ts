import prisma from './lib/prisma';
import { generateAccountNumber } from './utils/generators';

async function main() {
    const group = await prisma.group.findFirst();
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    if (group && admin) {
        const existingMember = await prisma.member.findUnique({
            where: {
                groupId_userId: {
                    groupId: group.id,
                    userId: admin.id
                }
            }
        });

        if (!existingMember) {
            await prisma.member.create({
                data: {
                    groupId: group.id,
                    userId: admin.id,
                    status: 'ACTIVE',
                    joinDate: new Date(),
                    nationalId: 'ADMIN-' + group.id.substring(0, 8),
                    accountNumber: generateAccountNumber(group.groupPrefix),
                }
            });
            console.log('Admin added as member success');
        } else {
            console.log('Admin is already a member');
        }
    } else {
        console.log('Group or Admin not found');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
