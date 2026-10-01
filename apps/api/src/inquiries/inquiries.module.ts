import { Module } from '@nestjs/common';
import { InquiriesController } from './inquiries.controller';
import { InquiriesService } from './inquiries.service';
import { InquiryHoldsScheduler } from './inquiry-holds.scheduler';

@Module({
  controllers: [InquiriesController],
  providers: [InquiriesService, InquiryHoldsScheduler],
})
export class InquiriesModule {}
