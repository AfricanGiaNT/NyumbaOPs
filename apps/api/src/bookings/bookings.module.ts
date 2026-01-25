import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { TelegramModule } from '../telegram/telegram.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [AuditModule, TelegramModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
