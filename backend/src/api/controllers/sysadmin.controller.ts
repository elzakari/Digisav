import { Request, Response } from 'express';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { AuthRequest } from '@/api/middleware/auth.middleware';
import bcrypt from 'bcrypt';

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

            const [contribByCurrency, payoutByCurrency, usersByRole, usersByStatus] = await Promise.all([
                prisma.transaction.groupBy({
                    by: ['currencyCode'],
                    where: { transactionType: 'CONTRIBUTION' },
                    _sum: { amount: true },
                }),
                prisma.transaction.groupBy({
                    by: ['currencyCode'],
                    where: { transactionType: 'PAYOUT' },
                    _sum: { amount: true },
                }),
                prisma.user.groupBy({
                    by: ['role'],
                    _count: { _all: true },
                }),
                prisma.user.groupBy({
                    by: ['status'],
                    _count: { _all: true },
                }),
            ]);

            const contributionsByCurrency = contribByCurrency
                .map((r) => ({ currencyCode: r.currencyCode, total: Number(r._sum.amount || 0) }))
                .sort((a, b) => b.total - a.total);

            const payoutsByCurrency = payoutByCurrency
                .map((r) => ({ currencyCode: r.currencyCode, total: Number(r._sum.amount || 0) }))
                .sort((a, b) => b.total - a.total);

            const totalContributionsVolume = contributionsByCurrency.reduce((acc, r) => acc + r.total, 0);
            const totalPayoutsVolume = payoutsByCurrency.reduce((acc, r) => acc + r.total, 0);

            const roles = usersByRole.reduce((acc: any, r) => {
                acc[r.role] = r._count._all;
                return acc;
            }, {});

            const userStatuses = usersByStatus.reduce((acc: any, r) => {
                acc[r.status] = r._count._all;
                return acc;
            }, {});

            return res.status(200).json({
                success: true,
                data: {
                    users: { total: totalUsers },
                    userBreakdown: {
                        roles,
                        statuses: userStatuses,
                    },
                    groups: {
                        total: totalGroups,
                        active: activeGroups,
                        closed: closedGroups,
                    },
                    transactions: {
                        totalCount: totalTransactions,
                        totalContributionsVolume,
                        totalPayoutsVolume,
                        contributionsByCurrency,
                        payoutsByCurrency,
                        multiCurrency: contributionsByCurrency.length > 1 || payoutsByCurrency.length > 1,
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

    deleteUser: async (req: AuthRequest, res: Response) => {
        try {
            const targetUserId = req.params.userId as string;
            const actorUserId = req.user?.id;

            if (!actorUserId) {
                return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
            }

            if (targetUserId === actorUserId) {
                return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'You cannot delete your own account' } });
            }

            const target = await prisma.user.findUnique({
                where: { id: targetUserId },
                select: {
                    id: true,
                    role: true,
                    status: true,
                    fullName: true,
                    email: true,
                    phoneNumber: true,
                    _count: { select: { adminGroups: true } },
                },
            });

            if (!target) {
                return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
            }

            if (target.role === 'SYS_ADMIN') {
                return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot delete a SYS_ADMIN user' } });
            }

            const phoneSuffix = targetUserId.replace(/-/g, '').slice(0, 16);
            const anonymizedEmail = `deleted+${targetUserId}@digisav.invalid`;
            const anonymizedPhone = `del_${phoneSuffix}`;
            const randomPasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);

            const result = await prisma.$transaction(async (tx) => {
                const reassignedGroups = await tx.group.updateMany({
                    where: { adminUserId: targetUserId },
                    data: { adminUserId: actorUserId },
                });

                await tx.member.updateMany({
                    where: { userId: targetUserId },
                    data: { status: 'INACTIVE' },
                });

                await tx.refreshToken.deleteMany({ where: { userId: targetUserId } });
                await tx.passwordResetToken.deleteMany({ where: { userId: targetUserId } });

                const updatedUser = await tx.user.update({
                    where: { id: targetUserId },
                    data: {
                        status: 'INACTIVE',
                        email: anonymizedEmail,
                        phoneNumber: anonymizedPhone,
                        fullName: 'Deleted User',
                        emailVerified: false,
                        phoneVerified: false,
                        passwordHash: randomPasswordHash,
                        lastLogin: null,
                    },
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        phoneNumber: true,
                        role: true,
                        status: true,
                    },
                });

                return { updatedUser, reassignedGroupsCount: reassignedGroups.count };
            });

            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('Error deleting user:', error);
            return res.status(500).json({ status: 'error', message: 'Failed to delete user' });
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
