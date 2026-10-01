import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, role: user.role, ver: user.tokenVersion };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async requestPasswordReset(email: string) {
    const result = { message: 'If this account exists, a reset link has been sent.' };
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
    });
    if (!user) return result;

    const recent = await this.prisma.passwordResetToken.findFirst({
      where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 5 * 60_000) } },
    });
    if (recent) return result;

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const record = await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60_000) },
    });
    const resetUrl = new URL('/reset-password', process.env.DASHBOARD_URL ?? 'http://localhost:3000');
    resetUrl.searchParams.set('token', token);
    try {
      await this.emailService.sendPasswordResetEmail(user.email, resetUrl.toString());
    } catch (error) {
      await this.prisma.passwordResetToken.delete({ where: { id: record.id } });
      this.logger.error('Failed to send a password reset email', error);
    }
    return result;
  }

  async confirmPasswordReset(token: string, password: string) {
    if (!/^[a-f0-9]{64}$/.test(token)) throw new BadRequestException('Invalid or expired reset link');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const hash = await bcrypt.hash(password, 12);
    await this.prisma.$transaction(async (tx) => {
      const record = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
      if (!record || record.consumedAt || record.expiresAt <= new Date()) {
        throw new BadRequestException('Invalid or expired reset link');
      }
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: record.id, consumedAt: null, expiresAt: { gt: new Date() } },
        data: { consumedAt: new Date() },
      });
      if (claimed.count !== 1) throw new BadRequestException('Invalid or expired reset link');
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash: hash, tokenVersion: { increment: 1 } },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: record.userId, consumedAt: null },
        data: { consumedAt: new Date() },
      });
    });
    return { message: 'Password updated. Please sign in again.' };
  }
}
