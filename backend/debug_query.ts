import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const userId = '96c9fbac-c047-4d43-a43b-4f364f4941e5'; // elzakari1@gmail.com (The one with membership)

    const groups = await prisma.group.findMany({
        where: {
            OR: [
                { adminUserId: userId },
                {
                    members: {
                        some: {
                            userId: userId,
                        },
                    },
                },
            ],
        },
        include: {
            _count: {
                select: {
                    members: true,
                    contributions: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    console.log(`Groups for user ${userId}:`, JSON.stringify(groups, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
