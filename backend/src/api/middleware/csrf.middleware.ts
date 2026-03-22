import { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';

export const XSRF_COOKIE_NAME = 'XSRF-TOKEN';
export const XSRF_HEADER_NAME = 'x-xsrf-token';

export function issueXsrfCookie(res: Response) {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(XSRF_COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

export function requireXsrf(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next();
  }

  const cookieToken = (req as any).cookies?.[XSRF_COOKIE_NAME];
  const headerToken = req.headers[XSRF_HEADER_NAME] as string | undefined;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_INVALID',
        message: 'Invalid CSRF token',
      },
    });
  }

  next();
}

