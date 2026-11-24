import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ReservationEmailStatus } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReservationEmailService {
  private readonly logger = new Logger(ReservationEmailService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async tryDispatch() {
    try {
      await this.dispatchDue();
    } catch (error) {
      this.logger.error(
        'Reservation email dispatch failed; queued messages remain for retry',
        error,
      );
    }
  }

  @Cron('* * * * *')
  async dispatchDue() {
    if (process.env.DISABLE_BACKGROUND_JOBS === 'true') return;
    const now = new Date();
    const due = await this.prisma.reservationEmail.findMany({
      where: {
        status: ReservationEmailStatus.PENDING,
        nextAttemptAt: { lte: now },
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });
    for (const item of due) {
      const claim = await this.prisma.reservationEmail.updateMany({
        where: {
          id: item.id,
          status: ReservationEmailStatus.PENDING,
          nextAttemptAt: { lte: now },
        },
        data: {
          attempts: { increment: 1 },
          nextAttemptAt: new Date(now.getTime() + 5 * 60_000),
        },
      });
      if (claim.count !== 1) continue;
      try {
        await this.email.sendReservationEmail(
          item.recipient,
          item.subject,
          item.body,
        );
        await this.prisma.reservationEmail.update({
          where: { id: item.id },
          data: { status: ReservationEmailStatus.SENT, sentAt: new Date() },
        });
      } catch (error) {
        const attempts = item.attempts + 1;
        const delay = Math.min(60, 2 ** Math.min(attempts, 6)) * 60_000;
        await this.prisma.reservationEmail.update({
          where: { id: item.id },
          data: { nextAttemptAt: new Date(Date.now() + delay) },
        });
        this.logger.error(
          `Reservation email ${item.id} failed after ${attempts} attempts: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}
