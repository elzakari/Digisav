import { PasswordResetService } from '@/services/auth/password-reset.service';
import prisma from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  user: { findUnique: jest.fn() },
  passwordResetToken: { deleteMany: jest.fn(), create: jest.fn() },
  refreshToken: { deleteMany: jest.fn() },
  $transaction: jest.fn(),
}));

describe('PasswordResetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createResetForUserId', () => {
    it('creates reset token and invalidates sessions', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', email: 'a@b.com' });

      (prisma.$transaction as any).mockResolvedValue(undefined);

      const service = new PasswordResetService();
      const result = await service.createResetForUserId('u1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' } });
      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.resetUrl).toContain('/reset-password?token=');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });
  });
});

