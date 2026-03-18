import { PrismaClient } from '@prisma/client';
import { GroupService } from './src/services/groups/group.service';

const prisma = new PrismaClient();
const groupService = new GroupService();

async function testDelete() {
    try {
        // 1. Create a draft group
        const admin = await prisma.user.findFirst();
        if (!admin) {
            console.log('No user found');
            return;
        }

        console.log('Using admin:', admin.email);

        const group = await groupService.createGroup(admin.id, {
            groupName: 'Test Delete Group',
            contributionAmount: 100,
            currencyCode: 'USD',
            paymentFrequency: 'WEEKLY',
            maxMembers: 10,
            payoutOrderType: 'ROTATION',
        });

        console.log('Created group:', group.id, 'Status:', group.status);

        // 2. Add an invitation
        await prisma.invitation.create({
            data: {
                groupId: group.id,
                token: 'test-token-' + group.id.substring(0, 8),
                expiresAt: new Date(Date.now() + 86400000),
            }
        });
        console.log('Added invitation to group');

        // NEW: Add a message
        await prisma.message.create({
            data: {
                groupId: group.id,
                messageType: 'TEST',
                channel: 'SMS',
                recipientPhone: '+1234567890',
                messageBody: 'Test Message',
            }
        });
        console.log('Added message to group');

        // 3. Try to delete it (DRAFT)
        const result = await groupService.deleteGroup(group.id, admin.id);
        console.log('Delete result (DRAFT with invitation and message):', result);

        // 4. Test ACTIVE group
        const activeGroup = await groupService.createGroup(admin.id, {
            groupName: 'Test Active Group',
            contributionAmount: 100,
            currencyCode: 'USD',
            paymentFrequency: 'WEEKLY',
            maxMembers: 10,
            payoutOrderType: 'ROTATION',
            startDate: new Date(),
        });

        // Force active in DB for testing
        await prisma.group.update({
            where: { id: activeGroup.id },
            data: { status: 'ACTIVE' }
        });
        console.log('Created and forced ACTIVE group:', activeGroup.id);

        const resultActive = await groupService.deleteGroup(activeGroup.id, admin.id);
        console.log('Delete result (ACTIVE):', resultActive);

        // 5. Test 403 case (Unauthorized user)
        console.log('Testing 403 Unauthorized case...');
        try {
            await groupService.deleteGroup(activeGroup.id, '00000000-0000-0000-0000-000000000000');
        } catch (e: any) {
            console.log('Expected 403 Failure:', e.message);
        }

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testDelete();
