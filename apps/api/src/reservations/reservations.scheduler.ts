import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ReservationsService } from './reservations.service';

@Injectable()
export class ReservationsScheduler {
  private readonly logger = new Logger(ReservationsScheduler.name);
  constructor(private readonly reservations: ReservationsService) {}

  @Cron('*/5 * * * *')
  async maintain() {
    if (process.env.DISABLE_BACKGROUND_JOBS === 'true') return;
    try {
      await this.reservations.maintain();
    } catch (error) {
      this.logger.error('Reservation maintenance failed', error);
    }
  }
}
