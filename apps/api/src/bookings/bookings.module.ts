import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { TelegramModule } from '../telegram/telegram.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
  imports: [AuditModule, TelegramModule, ReservationsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
