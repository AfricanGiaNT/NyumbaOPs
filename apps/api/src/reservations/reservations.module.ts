import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { ReservationsController } from './reservations.controller';
import { ReservationEmailService } from './reservations-email.service';
import { ReservationsScheduler } from './reservations.scheduler';
import { ReservationsService } from './reservations.service';

@Module({
  imports: [EmailModule],
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    ReservationEmailService,
    ReservationsScheduler,
  ],
  exports: [ReservationsService],
})
export class ReservationsModule {}
