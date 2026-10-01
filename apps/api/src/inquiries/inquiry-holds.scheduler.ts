import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BookingStatus, InquiryStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InquiryHoldsScheduler {
  constructor(private readonly prisma: PrismaService) {}

  @Cron('*/5 * * * *')
  async expireHolds() {
    const now = new Date();
    const expired = await this.prisma.booking.findMany({
      where: { source: 'INQUIRY', status: BookingStatus.PENDING, holdExpiresAt: { lte: now } },
      select: { id: true },
    });
    for (const booking of expired) {
      await this.prisma.$transaction(async (tx) => {
        const changed = await tx.booking.updateMany({
          where: { id: booking.id, status: BookingStatus.PENDING, holdExpiresAt: { lte: now } },
          data: { status: BookingStatus.CANCELLED },
        });
        if (changed.count) {
          await tx.inquiry.updateMany({
            where: { bookingId: booking.id, status: InquiryStatus.CONVERTED },
            data: { status: InquiryStatus.EXPIRED },
          });
        }
      });
    }
  }
}
