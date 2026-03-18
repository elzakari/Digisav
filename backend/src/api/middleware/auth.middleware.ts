import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError, BadRequestError } from '@/utils/errors';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('No token provided'));
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid token'));
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
};

import prisma from '@/lib/prisma';
import { NotFoundError } from '@/utils/errors';

export const requireGroupAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const groupId = (req.params.groupId || req.params.id) as string;
    if (!groupId) {
      throw new BadRequestError('Group ID is required');
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { adminUserId: true },
    });

    if (!group) {
      throw new NotFoundError('Group not found');
    }

    if (group.adminUserId !== req.user.id && req.user.role !== 'SYS_ADMIN') {
      throw new ForbiddenError('Only the Group Admin can perform this action');
    }

    next();
  } catch (error) {
    next(error);
  }
};