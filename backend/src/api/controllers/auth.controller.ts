import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/services/auth/auth.service';
import { issueXsrfCookie } from '@/api/middleware/csrf.middleware';
import { UnauthorizedError } from '@/utils/errors';

const authService = new AuthService();

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/api/v1/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    issueXsrfCookie(res);

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = (req as any).cookies?.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedError('No refresh token');
    }
    const result = await authService.refreshAccessToken(refreshToken);
    issueXsrfCookie(res);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = (req as any).cookies?.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedError('No refresh token');
    }
    await authService.logout(refreshToken);
    res.clearCookie('refresh_token', {
      path: '/api/v1/auth',
    });
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};
