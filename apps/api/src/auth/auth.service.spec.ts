import { createHash } from 'crypto';
import { AuthService } from './auth.service';

describe('password recovery', () => {
  it('returns the same response for an unknown email', async () => {
    const prisma = { user: { findFirst: jest.fn().mockResolvedValue(null) } };
    const email = { sendPasswordResetEmail: jest.fn() };
    const service = new AuthService(prisma as any, {} as any, email as any);
    await expect(service.requestPasswordReset('missing@example.com')).resolves.toEqual({
      message: 'If this account exists, a reset link has been sent.',
    });
    expect(email.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('accepts a reset token once and invalidates older sessions', async () => {
    const token = 'a'.repeat(64);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    let consumedAt: Date | null = null;
    const tx = {
      passwordResetToken: {
        findUnique: jest.fn().mockImplementation(async () => ({ id: 'reset-1', userId: 'user-1', tokenHash, consumedAt, expiresAt: new Date(Date.now() + 60000) })),
        updateMany: jest.fn().mockImplementation(async ({ where }: any) => {
          if (where.id) {
            if (consumedAt) return { count: 0 };
            consumedAt = new Date();
            return { count: 1 };
          }
          return { count: 0 };
        }),
      },
      user: { update: jest.fn().mockResolvedValue({ id: 'user-1' }) },
    };
    const prisma = { $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) };
    const service = new AuthService(prisma as any, {} as any, {} as any);
    await expect(service.confirmPasswordReset(token, 'new-password-12345')).resolves.toEqual({
      message: 'Password updated. Please sign in again.',
    });
    expect(tx.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tokenVersion: { increment: 1 } }),
    }));
    await expect(service.confirmPasswordReset(token, 'new-password-12345')).rejects.toThrow('Invalid or expired reset link');
  });
});
