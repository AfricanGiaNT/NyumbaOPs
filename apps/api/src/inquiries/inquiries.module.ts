import { Module } from '@nestjs/common';
import { InquiriesController } from './inquiries.controller';
import { InquiriesService } from './inquiries.service';
import { InquiryHoldsScheduler } from './inquiry-holds.scheduler';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
  imports: [ReservationsModule],
  controllers: [InquiriesController],
  providers: [InquiriesService, InquiryHoldsScheduler],
})
export class InquiriesModule {}
