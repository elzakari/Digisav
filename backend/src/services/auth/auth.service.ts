import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';
import { UnauthorizedError, ValidationError } from '@/utils/errors';
import { getDefaultsForCountry, normalizeCountry } from '@/utils/countryDefaults';
const SALT_ROUNDS = 12;

interface TokenPayload {
  sub: string;
  email: string;
  role: string;
}

export class AuthService {
  async register(data: {
    email: string;
    phoneNumber: string;
    password: string;
    fullName: string;
    countryCode?: string;
  }) {
    // Check if user exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { phoneNumber: data.phoneNumber }],
      },
    });

    if (existing) {
      throw new ValidationError('User already exists with this email or phone');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const normalizedCountry = normalizeCountry(data.countryCode);
    if (!normalizedCountry) {
      throw new ValidationError('countryCode is required');
    }
    const defaults = getDefaultsForCountry(normalizedCountry);
    if (!defaults) {
      throw new ValidationError('Unsupported countryCode');
    }

    // Destructure to exclude raw `password` – Prisma only knows `passwordHash`
    const { password: _rawPassword, countryCode: _rawCountry, ...rest } = data;

    // Create user
    const user = await prisma.user.create({
      data: {
        ...rest,
        passwordHash,
        countryCode: defaults.countryCode,
        defaultCurrency: defaults.currencyCode,
        language: defaults.language,
      },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        fullName: true,
        role: true,
        status: true,
        createdAt: true,
        countryCode: true,
        defaultCurrency: true,
        language: true,
      },
    });

    return user;
  }

  async login(email: string, password: string) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        passwordHash: true,
        defaultCurrency: true,
        language: true,
        countryCode: true,
        theme: true,
      }
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check user status
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Account is not active');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        defaultCurrency: user.defaultCurrency,
        language: user.language,
        countryCode: user.countryCode,
        theme: user.theme,
      },
      accessToken,
      refreshToken,
    };
  }

  private generateAccessToken(user: any): string {
    if (!process.env.JWT_SECRET) {
      throw new ValidationError('JWT_SECRET is not configured');
    }

    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return (jwt.sign as any)(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRY || '24h',
    });
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    if (!process.env.JWT_SECRET) {
      throw new ValidationError('JWT_SECRET is not configured');
    }

    const token = (jwt.sign as any)({ sub: userId }, process.env.JWT_SECRET!, {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '30d',
    });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });

    return token;
  }

  async refreshAccessToken(refreshToken: string) {
    // Verify refresh token
    let payload: any;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_SECRET!);
    } catch (error) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check if token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check if expired
    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new UnauthorizedError('Refresh token expired');
    }

    // Generate new access token
    const accessToken = this.generateAccessToken(storedToken.user);

    return { accessToken };
  }

  async logout(refreshToken: string) {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }
}
