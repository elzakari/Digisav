import { Request, Response } from 'express';
import prisma from '@/lib/prisma';

export const sysAdminController = {
    // Get platform-wide metrics
    getPlatformStats: async (req: Request, res: Response) => {
        try {
            const [totalUsers, totalGroups, totalTransactions] = await Promise.all([
                prisma.user.count(),
                prisma.group.count(),
                prisma.transaction.count(),
            ]);

            const activeGroups = await prisma.group.count({ where: { status: 'ACTIVE' } });
            const closedGroups = await prisma.group.count({ where: { status: 'CLOSED' } });

            const financialStats = await prisma.transaction.aggregate({
                _sum: {
                    amount: true,
                },
                where: {
                    transactionType: 'CONTRIBUTION',
                },
            });

            const payoutStats = await prisma.transaction.aggregate({
                _sum: {
                    amount: true,
                },
                where: {
                    transactionType: 'PAYOUT',
                },
            });

            return res.status(200).json({
                success: true,
                data: {
                    users: { total: totalUsers },
                    groups: {
                        total: totalGroups,
                        active: activeGroups,
                        closed: closedGroups,
                    },
                    transactions: {
                        totalCount: totalTransactions,
                        totalContributionsVolume: financialStats._sum.amount ? +financialStats._sum.amount : 0,
                        totalPayoutsVolume: payoutStats._sum.amount ? +payoutStats._sum.amount : 0,
                    },
                }
            });
        } catch (error) {
            console.error('Error fetching platform stats:', error);
            res.status(500).json({ status: 'error', message: 'Failed to fetch platform statistics' });
        }
    },

    // Get all users categorized
    getAllUsers: async (req: Request, res: Response) => {
        try {
            const users = await prisma.user.findMany({
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phoneNumber: true,
                    role: true,
                    status: true,
                    createdAt: true,
                    lastLogin: true,
                    _count: {
                        select: {
                            adminGroups: true,
                            memberships: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });

            return res.status(200).json({ success: true, data: users });
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({ status: 'error', message: 'Failed to fetch users' });
        }
    },

    // Get all groups
    getAllGroups: async (req: Request, res: Response) => {
        try {
            const groups = await prisma.group.findMany({
                include: {
                    admin: {
                        select: { id: true, fullName: true, email: true },
                    },
                    _count: {
                        select: { members: true, transactions: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });

            return res.status(200).json({ success: true, data: groups });
        } catch (error) {
            console.error('Error fetching groups:', error);
            res.status(500).json({ status: 'error', message: 'Failed to fetch groups' });
        }
    },

    // Update user details (Role, Status)
    updateUser: async (req: Request, res: Response) => {
        try {
            const userId = req.params.userId as string;
            const { role, status } = req.body;

            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                    ...(role && { role }),
                    ...(status && { status }),
                },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    role: true,
                    status: true,
                }
            });

            return res.status(200).json({ success: true, data: updatedUser });
        } catch (error) {
            console.error('Error updating user:', error);
            res.status(500).json({ status: 'error', message: 'Failed to update user' });
        }
    },

    // Global Group Moderation
    updateGroupStatus: async (req: Request, res: Response) => {
        try {
            const groupId = req.params.groupId as string;
            const { status } = req.body;

            const updatedGroup = await prisma.group.update({
                where: { id: groupId },
                data: { status },
            });

            return res.status(200).json({ success: true, data: updatedGroup });
        } catch (error) {
            console.error('Error updating group status:', error);
            res.status(500).json({ status: 'error', message: 'Failed to update group status' });
        }
    },
};
