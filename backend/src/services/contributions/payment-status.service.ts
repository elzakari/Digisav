import { ContributionStatus } from '@prisma/client';
import prisma from '@/lib/prisma';

export class PaymentStatusService {
    private prisma = prisma;

    /**
     * Updates payment statuses for all active groups.
     * This should be run daily.
     */
    async updateAllGroupPaymentStatuses() {
        const activeGroups = await this.prisma.group.findMany({
            where: { status: 'ACTIVE' },
        });

        for (const group of activeGroups) {
            await this.updateGroupPaymentStatuses(group.id);
        }
    }

    /**
     * Updates payment statuses for a specific group.
     */
    async updateGroupPaymentStatuses(groupId: string) {
        const group = await this.prisma.group.findUnique({
            where: { id: groupId },
            include: { members: { where: { status: 'ACTIVE' } } },
        });

        if (!group || !group.startDate) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const currentCycle = this.calculateCurrentCycle(group.startDate, today, group.paymentFrequency);
        const currentCycleDueDate = this.calculateDueDate(group.startDate, currentCycle, group.paymentFrequency);

        for (const member of group.members) {
            const contribution = await this.prisma.contribution.findUnique({
                where: {
                    groupId_memberId_cycleNumber: {
                        groupId,
                        memberId: member.id,
                        cycleNumber: currentCycle,
                    },
                },
            });

            if (!contribution) {
                // Only create OVERDUE if the current cycle's due date has passed
                if (today > currentCycleDueDate) {
                    const daysPastDue = Math.floor(
                        (today.getTime() - currentCycleDueDate.getTime()) / (1000 * 60 * 60 * 24)
                    );

                    let newStatus: ContributionStatus = 'OVERDUE';
                    if (daysPastDue > group.gracePeriodDays) {
                        newStatus = 'DEFAULTED';
                    }

                    await this.prisma.contribution.create({
                        data: {
                            groupId,
                            memberId: member.id,
                            cycleNumber: currentCycle,
                            amount: group.contributionAmount,
                            currencyCode: group.currencyCode,
                            dueDate: currentCycleDueDate,
                            paymentDate: currentCycleDueDate,
                            paymentMethod: 'CASH',
                            recordedBy: group.adminUserId,
                            status: newStatus,
                            hash: 'SYSTEM_GENERATED_' + Math.random().toString(36).substring(7),
                        },
                    });
                }
            } else if (contribution.status === 'OVERDUE') {
                // Check if existing OVERDUE should move to DEFAULTED
                const daysPastDue = Math.floor(
                    (today.getTime() - contribution.dueDate.getTime()) / (1000 * 60 * 60 * 24)
                );
                if (daysPastDue > group.gracePeriodDays) {
                    await this.prisma.contribution.update({
                        where: { id: contribution.id },
                        data: { status: 'DEFAULTED' },
                    });
                }
            }
        }
    }

    private calculateCurrentCycle(startDate: Date, targetDate: Date, frequency: string): number {
        const start = new Date(startDate);
        const target = new Date(targetDate);

        if (target < start) return 1;

        switch (frequency) {
            case 'WEEKLY':
                return Math.floor((target.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
            case 'BIWEEKLY':
                return Math.floor((target.getTime() - start.getTime()) / (14 * 24 * 60 * 60 * 1000)) + 1;
            case 'MONTHLY':
                return (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth()) + 1;
            case 'DAILY':
                return Math.floor((target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
            default:
                return (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth()) + 1;
        }
    }

    private calculateDueDate(startDate: Date, cycleNumber: number, frequency: string): Date {
        const dueDate = new Date(startDate);

        switch (frequency) {
            case 'WEEKLY':
                dueDate.setDate(dueDate.getDate() + (cycleNumber - 1) * 7);
                break;
            case 'BIWEEKLY':
                dueDate.setDate(dueDate.getDate() + (cycleNumber - 1) * 14);
                break;
            case 'MONTHLY':
                dueDate.setMonth(dueDate.getMonth() + (cycleNumber - 1));
                break;
            case 'DAILY':
                dueDate.setDate(dueDate.getDate() + (cycleNumber - 1));
                break;
            default:
                dueDate.setMonth(dueDate.getMonth() + (cycleNumber - 1));
        }

        return dueDate;
    }
}
